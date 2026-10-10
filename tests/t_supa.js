// Site sürümü (Supabase) testleri: node tests/t_supa.js [dist/index.html]
// Sayfa jsdom'da açılır; supabase-js yerine yerel PostgreSQL'e bağlanan sahte istemci kullanılır (gerçek şema, kurallar, RLS, tetikleyiciler).
// Birden çok "sekme" aynı veritabanını paylaşır: canlı güncelleme ve kullanıcılar arası etkileşim denenir.
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { TextEncoder } = require('util');
const { setupDb, makeBackend, makeClient, dashboardUser } = require('./supa_fake.js');

const ROOT = path.join(__dirname, '..');
const HTML0 = fs.readFileSync(process.argv[2] || path.join(ROOT, 'dist/index.html'), 'utf8');
const DB = 'yw_site';
let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) pass++; else { fail++; console.log('  ✗ ' + msg); } };
const eq = (a, b, msg) => ok(a === b, `${msg}: beklenen ${JSON.stringify(b)}, gelen ${JSON.stringify(a)}`);
const noErr = (t, msg) => { ok(t.errors.length === 0, `${msg}: hata var -> ${t.errors.slice(0, 3).map(e => e.join(' ').slice(0, 500)).join(' || ')}`); t.errors.length = 0; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function prep(html) {
  // gömülü supabase-js yerine sahte istemci; içeriye bakmak için kanca (yalnızca test)
  const lib = /<script id="yw-sb">[\s\S]*?<\/script>/;
  if (!lib.test(html)) throw new Error('supabase-js betiği bulunamadı');
  html = html.replace(lib, '<script id="yw-sb"></script>');
  const tail = /\}\)\(\);\s*<\/script>\s*<\/body>/;
  if (!tail.test(html)) throw new Error('betik sonu bulunamadı');
  return html.replace(tail, 'window.__t = c => eval(c);\n})();\n</script>\n</body>');
}
const HTML = prep(HTML0);

async function tab(be, { hash = '#/', session = null, name = 'sekme' } = {}) {
  const cl = makeClient(be);
  if (session) cl.st.session = session;
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('error', (...a) => errors.push([name, 'console.error', ...a.map(x => (x && x.stack) || (x && x.message) || JSON.stringify(x))]));
  vc.on('jsdomError', e => errors.push([name, 'jsdomError', (e && e.detail && e.detail.stack) || (e && e.stack) || String(e)]));
  const dom = new JSDOM(HTML, {
    url: 'https://yediwiki.test/' + hash, runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.supabase = { createClient: () => cl.client };
      w.scrollTo = () => {};
      w.TextEncoder = TextEncoder;
      w.Element.prototype.scrollIntoView = function () {};
    }
  });
  const w = dom.window;
  const t = {
    dom, w, cl, errors, name,
    ev: code => w.__t(code),
    $: s => w.document.querySelector(s), $$: s => [...w.document.querySelectorAll(s)],
    text: s => { const e = w.document.querySelector(s); return e ? e.textContent : null; },
    wait: sleep,
    async go(h) { w.location.hash = h; await sleep(80); },
    async until(fn, msg, ms = 4000) {
      const t0 = Date.now();
      for (;;) {
        let v = false; try { v = fn(); } catch (e) { v = false; }
        if (v) return true;
        if (Date.now() - t0 > ms) { ok(false, `${name}: zaman aşımı: ${msg}`); return false; }
        await sleep(25);
      }
    },
    async submit(sel = '.modal form', ms = 150) { t.$(sel).dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true })); await sleep(ms); },
    typeIn(el, v) { el.value = v; el.dispatchEvent(new w.Event('input', { bubbles: true })); },
    close() { w.close(); }
  };
  await t.until(() => t.ev('S.supa && S.loaded.users && S.loaded.notes && !S.authPending'), 'açılış');
  return t;
}
const q1 = async (be, sql, args = []) => (await be.pool.query(sql, args)).rows[0];
const doc = async (be, col, id) => { const r = await q1(be, 'select data from public.docs where col = $1 and id = $2', [col, id]); return r ? r.data : null; };
const lastCode = (be, email) => { const m = [...be.mails].reverse().find(x => x.email === email); return m ? m.code : null; };

async function signup(t, be, local, prof) {
  t.ev('openAuth()'); await sleep(60);
  t.$('#au-mail').value = local;
  await t.submit('.modal form', 200);
  const email = local + '@std.yeditepe.edu.tr';
  await t.until(() => t.$('#au-code'), 'kod adımı ' + local);
  t.$('#au-code').value = lastCode(be, email);
  await t.submit('.modal form', 250);
  await t.until(() => t.$('#au-user'), 'profil adımı ' + local);
  t.$('#au-user').value = prof.username; t.$('#au-first').value = prof.first; t.$('#au-last').value = prof.last;
  if (prof.showName) t.$('.modal [data-vis=showName]').click();
  await t.submit('.modal form', 300);
  await t.until(() => !t.$('.modal') && t.ev('!!myAcc()'), 'hesap açıldı ' + local);
}

(async () => {
  await setupDb(DB, {
    shim: path.join(ROOT, 'supabase/tests/shim.sql'),
    migrations: fs.readdirSync(path.join(ROOT, 'supabase/migrations')).filter(f => f.endsWith('.sql')).sort().map(f => path.join(ROOT, 'supabase/migrations', f))
  });
  const be = makeBackend(DB);
  try {
    console.log('1) girişsiz ziyaretçi');
    const v = await tab(be, { name: 'ziyaretçi' });
    ok(v.ev('S.supa === true') && v.ev("typeof S.db.collection === 'function'"), 'site kipi açıldı');
    ok(!v.$('[data-r=acc]').hidden && /Giriş yap/.test(v.text('[data-r=acc]')), 'giriş düğmesi görünür');
    eq(v.ev('S.me.startsWith("l")'), true, 'girişsizken yerel kimlik');
    await v.go('#/dersler');
    await v.until(() => v.$('.modal') && v.$('#au-mail'), 'herkese açık olmayan sayfa giriş ister');
    ok(/6 haneli bir giriş kodu/.test(v.text('.modal')), 'kodla giriş anlatılıyor');
    ok(!v.$('.demo-code'), 'kod ekranda gösterilmiyor');
    v.$('#au-mail').value = 'biri@gmail.com';
    await v.submit('.modal form', 80);
    ok(/Yalnızca @std\.yeditepe\.edu\.tr/.test(v.text('.modal .err')), 'okul dışı adres reddedilir');
    eq(be.mails.length, 0, 'okul dışı adrese kod gitmedi');
    { const r = await v.cl.client.auth.signInWithOtp({ email: 'biri@gmail.com', options: { shouldCreateUser: true } });
      ok(r.error && r.error.code === 'unexpected_failure', 'sunucu da okul dışı kaydı reddeder'); }
    { const r = await v.cl.client.rpc('doc_set', { p_col: 'notes', p_id: 'x1', p_data: { cid: 'CSE211', title: 'xx', drive: 'https://drive.google.com/x' } });
      ok(r.error, 'girişsiz yazılamaz (RPC kapalı): ' + (r.error && r.error.code)); }
    noErr(v, 'ziyaretçi');

    console.log('2) kodla hesap açma');
    const A = await tab(be, { name: 'A' });
    await signup(A, be, 'ali.veli', { username: 'aliveli', first: 'Ali', last: 'Veli' });
    const aid = A.ev('S.me');
    ok(/^[0-9a-f-]{36}$/.test(aid), 'kimlik Supabase kullanıcısı: ' + aid);
    ok(A.ev('S.sec.length') === 64, 'kişisel gizli alındı');
    { const u = await doc(be, 'users', aid), p = await doc(be, 'private', aid);
      ok(u && u.username === 'aliveli' && u.first === '' && u.last === '' && u.bonus === 50 && u.kb && u.kb.all === 50, 'açık profil (ad gizli): ' + JSON.stringify(u && { f: u.first, kb: u.kb }));
      ok(p && p.first === 'Ali' && p.last === 'Veli' && p.kb && p.kb.all === 50, 'ad ve tam kubbe özel kayıtta'); }
    await A.until(() => A.text('[data-r=acc] .acc-name') === 'aliveli', 'üst çubukta kullanıcı adı');
    await A.until(() => A.text('[data-r=kubbechip] b') === '50', 'kubbe 50');
    await A.go('#/profil');
    await A.until(() => /Ali Veli/.test(A.text('#main')) && /ali\.veli@std\.yeditepe\.edu\.tr/.test(A.text('#main')), 'profilde gizli ad (yalnızca sana) ve e-posta');
    ok(!!A.$('#main [data-g=logout]'), 'çıkış düğmesi');
    A.ev('openProfileEdit()'); await sleep(60);
    eq(A.$('#pe-first').value, 'Ali', 'düzenlemede gizli ad dolu gelir');
    A.$('#pe-no').value = '05551112233';
    await A.submit('.modal form', 300);
    { const p = await doc(be, 'private', aid);
      ok(p.phone === '05551112233' && p.first === 'Ali' && p.kb && p.kb.all === 50, 'telefon yazıldı, özel kayıttaki ad ve kubbe korundu'); }
    noErr(A, 'hesap açma');

    console.log('3) not paylaşma: adıyla ve anonim');
    async function share(t, { code, title, anon }) {
      await t.go('#/paylas?ders=' + code); await sleep(80);
      t.$('#sh-title').value = title; t.$('#sh-drive').value = 'https://drive.google.com/file/d/' + title.replace(/\W/g, '') + '/view'; t.$('[data-r=rules]').checked = true;
      if (anon) t.$('[data-anon="1"]').click();
      await t.submit('[data-r=form]', 400);
      await t.until(() => /^#\/not\//.test(t.w.location.hash), 'not sayfasına geçti: ' + title);
      return t.w.location.hash.slice(6);
    }
    const n1 = await share(A, { code: 'CSE211', title: 'Bagli liste ozeti', anon: false });
    { const d = await doc(be, 'notes', n1); ok(d && d.by === aid && !d.byk, 'adıyla not: yazar kimliği'); }
    await A.until(() => A.text('[data-r=kubbechip] b') === '75', 'kubbe 75');
    const usersCtid = async uid => (await q1(be, "select ctid::text as c from public.docs where col = 'users' and id = $1", [uid])).c;
    const ct0 = await usersCtid(aid);
    A.$('[data-anon]') ;
    const n2 = await share(A, { code: 'MATH131', title: 'Kalkulus anonim', anon: true });
    { const d = await doc(be, 'notes', n2);
      ok(d && d.by === '' && d.anon === true && d.byk === A.ev(`pk('notes', ${JSON.stringify(n2)})`), 'anonim not: yazar boş, anahtar tarayıcıdakiyle aynı'); }
    eq(await usersCtid(aid), ct0, 'anonim not açık profilde değişiklik yapmadı');
    await A.until(() => A.text('[data-r=kubbechip] b') === '100', 'bakiye 100 (anonim not dahil)');
    ok(/\(sen\)/.test(A.text('[data-r=meta]')), 'anonim notunda "(sen)" yalnızca sana');
    ok(!!A.$('[data-g=del-note]') && !A.$('[data-g=report-note]'), 'kendi anonim notunu silebilir, bildiremez');
    await A.go('#/katkilarim');
    await A.until(() => /Notlarım \(2\)/.test(A.text('#main')), 'Katkılarım iki notu gösterir (anonim dahil)');
    noErr(A, 'not paylaşma');

    console.log('4) ikinci öğrenci: beğeni, bildirim, yorum (canlı)');
    const B = await tab(be, { name: 'B' });
    await signup(B, be, 'bora.kaya', { username: 'borakaya', first: 'Bora', last: 'Kaya', showName: true });
    const bid = B.ev('S.me');
    { const u = await doc(be, 'users', bid); ok(u.first === 'Bora', 'adını gösteren öğrencinin adı açık profilde'); }
    await B.go('#/not/' + n2); await sleep(150);
    ok(/Anonim/.test(B.text('[data-r=meta]')) && !/\(sen\)/.test(B.text('[data-r=meta]')), 'B için not anonim');
    ok(!B.$('[data-g=del-note]'), 'B anonim notu silemez');
    B.$('[data-g=like-note]').click(); await sleep(300);
    { const d = await doc(be, 'notes', n2), k = B.ev(`pk('notes', ${JSON.stringify(n2)})`);
      ok(d.likes && d.likes[k] === true && !d.likes[bid], 'beğeni B\'nin bu nottaki takma adıyla'); }
    eq(await usersCtid(aid), ct0, 'anonim nota beğeni de açık profili değiştirmedi');
    await A.until(() => A.text('[data-r=kubbechip] b') === '102', 'A\'nın bakiyesi canlı güncellendi (102)');
    await B.until(() => /Beğendin/.test(B.text('[data-g=like-note]')), 'B beğendiğini görüyor');
    await B.go('#/not/' + n1); await sleep(150);
    B.$('[data-g=like-note]').click(); await sleep(300);
    await A.until(() => A.text('[data-r=kubbechip] b') === '104', 'adıyla nota beğeni (104)');
    { const u = await doc(be, 'users', aid); eq(u.kb.all, 77, 'açık kubbe: hesap + adıyla not + beğenisi'); }
    // yorum: anonim
    await B.go('#/not/' + n1 + '?tab=yorumlar'); await sleep(150);
    { const ta = B.$('#main textarea'); ok(!!ta, 'yorum kutusu');
      ta.value = 'Çok işime yaradı'; B.$('#main [data-r=anon]').click();
      await B.submit('#main [data-r=form]', 400);
      const c = (await be.pool.query("select id, data from public.docs where col = 'comments' and data->>'tid' = $1", [n1])).rows[0];
      ok(c && c.data.by === '' && c.data.byk === B.ev(`pk('comments', ${JSON.stringify(c.id)})`), 'anonim yorum takma adla'); }
    await A.go('#/');
    await A.until(() => A.ev('notifState().newCm') >= 1, 'A\'ya yorum bildirimi');
    noErr(A, 'A canlı'); noErr(B, 'B etkileşim');

    console.log('5) HocaÖlçer ve DersÖlçer');
    const hid = 'esin-onbasioglu';
    await B.go('#/hoca/' + hid); await sleep(120);
    B.$('[data-g=rate]').click(); await sleep(80);
    B.$$('.modal .star-input').forEach(el => el.dispatchEvent(new B.w.MouseEvent('click', { bubbles: true, clientX: 10 })));
    B.$('#r-course').value = 'CSE 211';
    await B.submit('.modal form', 400);
    await B.until(() => !B.$('.modal'), 'puan kaydedildi');
    { const h = await doc(be, 'hocas', hid), k = B.ev(`pk('hocas', ${JSON.stringify(hid)})`);
      ok(h && h.ratings && h.ratings[k] && h.ratings[k].c === 'CSE211' && !h.ratings[bid], 'puan bu hocaya özel takma adla');
      const own = await q1(be, "select count(*)::int as n from yw_private.doc_owner where col = 'hocas'"); eq(own.n, 0, 'hoca kaydının sahibi tutulmuyor'); }
    { const u = await doc(be, 'users', bid), p = await doc(be, 'private', bid); eq(u.kb.ratings, 0, 'açık profilde puan sayısı yok'); eq(p.kb.ratings, 1, 'özel kayıtta puan sayıldı'); }
    await B.until(() => /Puanını güncelle/.test(B.text('[data-r=rate]')), 'B kendi puanını tanıyor');
    await A.go('#/hoca/' + hid);
    await A.until(() => A.ev(`hocaStats(S.hocas.get(${JSON.stringify(hid)})).cnt`) === 1, 'A puanı canlı görüyor');
    ok(/Değerlendir/.test(A.text('[data-r=rate]')) && !/güncelle/.test(A.text('[data-r=rate]')), 'A için puan B\'nin');
    A.ev(`openUserCard(${JSON.stringify(bid)})`); await sleep(60);
    ok(!/hoca puanı/.test(A.text('.modal')), 'başkasının kartında puan sayısı görünmez');
    A.$('.modal [data-close]') && A.$('.modal [data-close]').click(); await sleep(40);
    // DersÖlçer
    await B.go('#/ders/CSE211'); await sleep(150);
    B.$('[data-g=zor]').click(); await sleep(60);
    B.$('.modal input[name=z][value="4"]').checked = true; B.$('.modal input[name=y][value="2"]').checked = true;
    await B.submit('.modal form', 400);
    { const z = await doc(be, 'zor', 'CSE211'), k = B.ev("pk('zor', 'CSE211')");
      ok(z && z.v && z.v[k] && z.v[k].z === 4, 'DersÖlçer oyu ders belgesinde takma adla');
      const u = await doc(be, 'users', bid); ok(!u.zor, 'kullanıcı kaydında oy yok'); }
    await B.until(() => /1 öğrenci oyladı/.test(B.text('.zor-card')) && /Oyunu değiştir/.test(B.text('[data-g=zor]')), 'kart güncellendi');
    await A.go('#/ders/CSE211');
    await A.until(() => /1 öğrenci oyladı/.test(A.text('.zor-card')) && /Oy ver/.test(A.text('[data-g=zor]')), 'A oyu görüyor, kendisininki değil');
    noErr(A, 'A HocaÖlçer'); noErr(B, 'B HocaÖlçer');

    console.log('6) not isteği: anonim notla karşılanır');
    await A.go('#/ders/MATH131'); await sleep(120);
    A.$('[data-g=req-new]').click(); await sleep(60);
    await A.submit('.modal form', 400);
    const rq = (await be.pool.query("select id from public.docs where col = 'requests'")).rows[0];
    ok(!!rq, 'istek kaydedildi');
    await B.go('#/istekler'); await sleep(200);
    await B.until(() => /MATH 131/.test(B.text('#main')), 'B istekleri görüyor');
    await B.go(`#/paylas?ders=MATH131&istek=${rq.id}`); await sleep(120);
    B.$('#sh-title').value = 'Turev notlari'; B.$('#sh-drive').value = 'https://drive.google.com/file/d/turev/view'; B.$('[data-r=rules]').checked = true;
    B.$('[data-anon="1"]').click();
    await B.submit('[data-r=form]', 600);
    { const r = await doc(be, 'requests', rq.id); ok(r.done === true && r.doneBy === '' && !!r.nid, 'karşılandı, karşılayan boş: ' + JSON.stringify({ d: r.done, b: r.doneBy })); }
    { const p = await doc(be, 'private', bid), u = await doc(be, 'users', bid); eq(p.kb.fills, 1, 'karşılama kubbesi özel kayıtta'); eq(u.kb.fills, 0, 'açık profilde değil'); }
    await A.until(() => A.ev('notifItems().some(x => x.r && !x.r.doneBy)'), 'A\'ya karşılandı bildirimi');
    A.ev('openNotifs()'); await sleep(60);
    ok(/Anonim biri/.test(A.text('.modal')), 'bildirimde karşılayan anonim');
    A.$('.modal [data-close]') && A.$('.modal [data-close]').click(); await sleep(40);
    noErr(A, 'istek A'); noErr(B, 'istek B');

    console.log('7) yönetici: şifreyle giriş, düzeltme, moderasyon');
    await dashboardUser(be, 'yonetici@yediwiki.com', 'Test-Yonetici-1');
    const C = await tab(be, { name: 'yönetici' });
    C.ev('openAuth()'); await sleep(60);
    C.$('.modal [data-r=to-login]').click(); await sleep(40);
    C.$('#au-lmail').value = 'yonetici@yediwiki.com'; C.$('#au-lpw').value = 'yanlis';
    await C.submit('.modal form', 200);
    ok(/şifre hatalı/i.test(C.text('.modal .err')), 'yanlış şifre');
    C.$('#au-lpw').value = 'Test-Yonetici-1';
    await C.submit('.modal form', 300);
    await C.until(() => C.ev('S.owner') === true && !C.$('.modal'), 'yönetici yetkisi');
    await C.until(() => C.$$('[data-owner]').every(e => !e.hidden), 'yönetim bağlantıları görünür');
    eq(C.ev('myAcc().username'), 'yonetici', 'yönetici profili kendiliğinden kuruldu');
    // B, A'nın adıyla notunu bildirir; yönetici temizler
    await B.go('#/not/' + n1); await sleep(150);
    B.ev(`reportItem('notes', ${JSON.stringify(n1)})`); await sleep(60);
    B.$('.modal [data-ok]').click(); await sleep(300);
    await C.go('#/moderasyon');
    await C.until(() => /1 bildirim/.test(C.text('#main')), 'bildirim moderasyonda');
    C.$('#main [data-g=mod-ok]').click(); await sleep(400);
    await C.until(() => /Bildirilen içerik yok/.test(C.text('#main')), 'bildirim temizlendi');
    noErr(C, 'yönetici');

    console.log('8) ortak deneme hesabı ve market');
    await dashboardUser(be, 'deneme123@std.yeditepe.edu.tr', 'deneme123');
    const Dn = await tab(be, { name: 'deneme' });
    Dn.ev('openAuth({ login: true })'); await sleep(60);
    Dn.$('#au-lmail').value = 'deneme123'; Dn.$('#au-lpw').value = 'deneme123';
    await Dn.submit('.modal form', 300);
    await Dn.until(() => Dn.ev('!!myAcc()') && !Dn.$('.modal'), 'deneme hesabına girildi');
    await Dn.until(() => Dn.text('[data-r=kubbechip] b') === '10050', 'hediye kubbe (10050)');
    await Dn.go('#/kubbe'); await sleep(150);
    Dn.ev("buyItem('kartal-kanatlari')"); await sleep(80);
    Dn.$('.modal [data-ok]').click(); await sleep(400);
    { const u = await doc(be, 'users', Dn.ev('S.me')); ok(u.items && u.items['kartal-kanatlari'] && u.spent === 1500, 'ürün sunucuda alındı'); }
    await Dn.until(() => Dn.text('[data-r=kubbechip] b') === '8550', 'bakiye düştü');
    { const r = await Dn.cl.client.rpc('doc_update', { p_col: 'users', p_id: Dn.ev('S.me'), p_patch: { spent: 0 } }); ok(r.error && /değiştirilemez/.test(r.error.message), 'harcama sıfırlanamaz'); }
    ok(A.ev('ranking("all").every(x => x.u.role !== "admin")'), 'yönetici sıralamada yok');
    noErr(Dn, 'deneme');

    console.log('9) çıkış ve oturumun geri gelmesi');
    const sesB = B.cl.st.session;
    await B.go('#/profil'); await sleep(120);
    B.$('#main [data-g=logout]').click(); await sleep(300);
    await B.until(() => !B.ev('myAcc()') && B.ev('S.me.startsWith("l")'), 'çıkış yapıldı');
    ok(B.ev('S.sec') === '' && B.ev('S.priv') === null, 'gizli ve özel kayıt temizlendi');
    const B2 = await tab(be, { name: 'B yeniden', session: sesB, hash: '#/katkilarim' });
    await B2.until(() => B2.ev('myAcc() && myAcc().username') === 'borakaya', 'oturum geri geldi');
    await B2.until(() => /Notlarım \(1\)/.test(B2.text('#main')) && /HocaÖlçer puanlarım \(1\)/.test(B2.text('#main')), 'Katkılarım: anonim not ve puan tanındı');
    noErr(B2, 'oturum');

    for (const t of [v, A, B, C, Dn, B2]) t.close();
  } catch (e) {
    fail++; console.log('  ✗ beklenmeyen hata: ' + (e && e.stack || e));
  } finally {
    await be.end();
  }
  console.log(`\n${pass} geçti, ${fail} kaldı`);
  process.exit(fail ? 1 : 0);
})();
