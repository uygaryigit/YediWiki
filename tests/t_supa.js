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

async function tab(be, { hash = '#/', path: urlPath = '/', html = HTML, session = null, name = 'sekme' } = {}) {
  const cl = makeClient(be);
  if (session) cl.st.session = session;
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('error', (...a) => errors.push([name, 'console.error', ...a.map(x => (x && x.stack) || (x && x.message) || JSON.stringify(x))]));
  vc.on('jsdomError', e => errors.push([name, 'jsdomError', (e && e.detail && e.detail.stack) || (e && e.stack) || String(e)]));
  const dom = new JSDOM(html, {
    url: 'https://yediwiki.test' + urlPath + hash, runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
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
const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, 'site/config.json'), 'utf8'));
/* Google Identity + Picker + Drive API taklidi: istekleri log'a yazar */
function googleMock(w, log) {
  Object.assign(log, { prompts: [], fetch: [], picker: null });
  const P = {
    ViewId: { DOCS: 'all' }, Response: { ACTION: 'action', DOCUMENTS: 'docs' }, Action: { PICKED: 'picked', CANCEL: 'cancel' },
    Document: { ID: 'id', NAME: 'name', URL: 'url', MIME_TYPE: 'mimeType' }, Feature: { SUPPORT_DRIVES: 'sdr' },
    DocsView: class { setIncludeFolders() { return this; } setSelectFolderEnabled(v) { log.folders = v; return this; } },
    DocsUploadView: class { setIncludeFolders() { return this; } },
    PickerBuilder: class {
      constructor() { this.o = { views: 0 }; }
      setAppId(v) { this.o.appId = v; return this; } setOAuthToken(v) { this.o.token = v; return this; } setDeveloperKey(v) { this.o.key = v; return this; }
      addView() { this.o.views++; return this; } setLocale(v) { this.o.locale = v; return this; } setTitle(v) { this.o.title = v; return this; } setOrigin(v) { this.o.origin = v; return this; }
      enableFeature(f) { this.o.feature = f; return this; } setCallback(cb) { this.o.cb = cb; return this; }
      build() { const o = this.o; return { setVisible: () => { log.picker = o; setTimeout(() => o.cb(log.pick || { action: 'cancel' }), 5); } }; }
    }
  };
  w.google = { picker: P, accounts: { oauth2: { initTokenClient: c => { log.client = c.client_id; log.scope = c.scope;
    return { requestAccessToken: o => { log.prompts.push(o && o.prompt); setTimeout(() => (log.deny ? c.error_callback({ type: 'popup_closed' }) : c.callback({ access_token: 'tok-1', expires_in: 3600 })), 5); } }; } } } };
  w.fetch = async (url, opt = {}) => { log.fetch.push({ url: String(url), method: opt.method || 'GET', body: opt.body || '', auth: opt.headers && opt.headers.Authorization });
    return { ok: !(log.shareFail && opt.method === 'POST'), json: async () => ({ permissions: log.alreadyPublic ? [{ type: 'anyone', role: 'reader' }] : [] }), text: async () => '' }; };
}
const doc = async (be, col, id) => { const r = await q1(be, 'select data from public.docs where col = $1 and id = $2', [col, id]); return r ? r.data : null; };
const lastCode = (be, email) => { const m = [...be.mails].reverse().find(x => x.email === email); return m ? m.code : null; };

const pwOf = local => 'Sifre-' + local;
async function signup(t, be, local, prof) {
  t.ev('openAuth()'); await sleep(60);
  t.$('.modal [data-r=to-signup]').click(); await sleep(40);
  t.$('#au-mail').value = local;
  t.$('#au-pw').value = pwOf(local);
  await t.submit('.modal form', 200);
  const email = local + '@std.yeditepe.edu.tr';
  await t.until(() => t.$('#au-code'), 'kod adımı ' + local);
  t.$('#au-code').value = lastCode(be, email);
  await t.submit('.modal form', 250);
  await t.until(() => t.$('#au-user'), 'profil adımı ' + local);
  eq(t.$('#au-user').value, local.replace(/[^a-z0-9._]+/g, '.'), 'kullanıcı adı e-postadan geldi: ' + local);
  t.$('#au-user').value = prof.username; t.$('#au-first').value = prof.first; t.$('#au-last').value = prof.last;
  if (prof.showName) t.$('.modal [data-vis=showName]').click();
  t.$(`.modal [data-gv="${prof.govde || 'e'}"]`).click();
  await t.submit('.modal form', 200);
  await t.until(() => t.$('.modal [data-bpick]'), 'bölüm adımı ' + local);
  if (prof.bolum) { t.$(`.modal .bp-opt[data-bid="${prof.bolum}"]`).click(); await t.submit('.modal form', 300); }
  else { t.$('.modal [data-r=skip]').click(); await sleep(300); }
  await t.until(() => !t.$('.modal') && t.ev('!!myAcc()'), 'hesap açıldı ' + local);
  eq(be.passwords.get(email), pwOf(local), 'kayıtta belirlenen şifre kaydedildi: ' + local);
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
    await v.until(() => v.$('.modal') && v.$('#au-lmail'), 'herkese açık olmayan sayfa giriş ister');
    ok(v.text('.modal-head h2') === 'Giriş yap' && !!v.$('.modal #au-lpw') && !!v.$('.modal .btn-go[type=submit]') && !!v.$('.modal .btn-new[data-r=to-signup]'), 'önce giriş ekranı: e-posta, şifre, yeşil Giriş yap, kırmızı Kayıt ol');
    { const kids = v.$$('.modal form > *'); ok(kids.indexOf(v.$('.modal .btn-go')) < kids.indexOf(v.$('.modal .btn-new')), 'Kayıt ol, Giriş yap’ın altında'); }
    ok(/Notları, HocaÖlçer’i/.test(v.text('.modal .auth-why') || ''), 'neden giriş istendiği yazıyor');
    ok(!!v.$('.modal [data-r=forgot]'), 'Şifremi unuttum bağlantısı');
    v.$('.modal [data-r=to-signup]').click(); await sleep(40);
    ok(v.text('.modal-head h2') === 'Kayıt ol' && !!v.$('#au-mail') && !!v.$('#au-pw'), 'Kayıt ol: okul e-postası ve şifre');
    ok(/6 haneli doğrulama kodu/.test(v.text('.modal')), 'kodla doğrulama anlatılıyor');
    ok(!v.$('.demo-code'), 'kod ekranda gösterilmiyor');
    v.$('[data-r=pw-eye]').click(); await sleep(10);
    ok(v.$('#au-pw').type === 'text' && v.$('[data-r=pw-eye]').getAttribute('aria-pressed') === 'true', 'şifre göz düğmesiyle görünür');
    v.$('#au-mail').value = 'biri@gmail.com'; v.$('#au-pw').value = 'Sifre-1234';
    await v.submit('.modal form', 80);
    ok(/Yalnızca @std\.yeditepe\.edu\.tr/.test(v.text('.modal .err')), 'okul dışı adres reddedilir');
    v.$('#au-mail').value = 'kisa.sifre'; v.$('#au-pw').value = '1234567';
    await v.submit('.modal form', 80);
    ok(/en az 8 karakter/.test(v.text('.modal .err')), 'kısa şifre reddedilir: ' + v.text('.modal .err'));
    eq(be.mails.length, 0, 'okul dışı adrese ve kısa şifreyle kod gitmedi');
    v.$('.modal [data-r=to-login]').click(); await sleep(30);
    ok(!!v.$('.modal #au-lmail') && v.text('.modal-head h2') === 'Giriş yap', 'Kayıt ol’dan girişe dönülür');
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
      ok(p && p.first === 'Ali' && p.last === 'Veli' && p.kb && p.kb.all === 50, 'ad ve tam kubbe özel kayıtta');
      eq(u && u.govde, 'e', 'karakter vücudu sunucuda'); }
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
    await A.until(() => A.text('#main .km-sec:nth-child(1) .km-count') === '2', 'Katkılarım iki notu gösterir (anonim dahil)');
    noErr(A, 'not paylaşma');

    console.log('4) ikinci öğrenci: beğeni, bildirim, yorum (canlı)');
    const B = await tab(be, { name: 'B' });
    await signup(B, be, 'bora.kaya', { username: 'borakaya', first: 'Bora', last: 'Kaya', showName: true, bolum: 'bilgisayar-muhendisligi' });
    const bid = B.ev('S.me');
    { const u = await doc(be, 'users', bid); ok(u.first === 'Bora', 'adını gösteren öğrencinin adı açık profilde'); eq(u.bolum, 'bilgisayar-muhendisligi', 'hesap açarken seçilen bölüm kaydedildi'); }
    ok(B.ev('S.bolumler.size') >= 70 && B.ev('S.dbBolumler.size') === 0, 'sitede bölümler katalogdan (veritabanında bölüm kaydı yok)');
    await B.go('#/not/' + n2); await sleep(150);
    ok(/Anonim/.test(B.text('[data-r=meta]')) && !/\(sen\)/.test(B.text('[data-r=meta]')), 'B için not anonim');
    ok(!B.$('[data-g=del-note]'), 'B anonim notu silemez');
    // Drive önizlemesi: dosya sayfanın içinde açılır, tam ekran olur, Esc ile küçülür
    { const fr = B.$('#main .dview iframe');
      ok(fr && fr.getAttribute('src') === 'https://drive.google.com/file/d/Kalkulusanonim/preview', 'not sayfasında Drive önizlemesi: ' + (fr && fr.getAttribute('src')));
      ok(fr && /allow-scripts/.test(fr.getAttribute('sandbox') || '') && fr.getAttribute('loading') === 'lazy', 'önizleme çerçevesi kısıtlı ve gecikmeli yüklenir');
      ok(!!B.$('#main .dview a[href$="/Kalkulusanonim/view"][target=_blank]'), 'Drive’da aç bağlantısı');
      B.$('#main [data-g=dview-max]').click(); await sleep(30);
      ok(B.$('#main .dview').classList.contains('max') && B.w.document.body.classList.contains('no-scroll'), 'tam ekran açıldı');
      B.w.document.dispatchEvent(new B.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(30);
      ok(!B.$('#main .dview').classList.contains('max') && !B.w.document.body.classList.contains('no-scroll'), 'Esc ile küçüldü'); }
    await B.go('#/ders/MATH131'); await sleep(150);
    ok(!!B.$('[data-r=panel] img.dthumb[src="https://drive.google.com/thumbnail?id=Kalkulusanonim&sz=w640"]'), 'not listesinde Drive küçük resmi');
    ok(B.$$('[data-r=panel] [data-type]').map(x => x.dataset.type).join() === 'all,not,sinav', 'tür süzgeci: Tümü, Ders notu, Çıkmış sınav');
    await B.go('#/paylas?ders=CSE211'); await sleep(80);
    ok(B.$$('#main .typepick input[name=type]').map(x => x.value).join() === 'not,sinav', 'paylaşırken iki tür: ders notu ve çıkmış sınav');
    { const f = B.$('[data-r=form]'), all = [...f.querySelectorAll('*')], pos = sel => all.indexOf(f.querySelector(sel));
      ok(B.$$('[data-r=form] h2').length === 0 && pos('#sh-title') < pos('.sh-flabel') && pos('.sh-flabel') < pos('[data-r=gbtn]') && B.text('.sh-flabel') === 'Dosya', 'sitede başlığın hemen altında Dosya etiketi ve Drive’dan seç, bölüm başlığı yok'); }
    B.typeIn(B.$('#sh-drive'), 'https://docs.google.com/document/d/1AbCdEfGhIjK/edit?usp=sharing'); await sleep(550);
    { const fr = B.$('[data-r=dmini] .dview.mini iframe');
      ok(fr && fr.getAttribute('src') === 'https://docs.google.com/document/d/1AbCdEfGhIjK/preview', 'paylaşırken link yapıştırılınca önizleme: ' + (fr && fr.getAttribute('src'))); }
    B.typeIn(B.$('#sh-drive'), 'https://example.com/not'); await sleep(80);
    ok(!B.$('[data-r=dmini] iframe'), 'Drive linki değilse önizleme kalkar');
    B.typeIn(B.$('#sh-drive'), ''); await sleep(30);
    // Drive'dan seç: Google ile giriş (drive.file), Picker, dosyayı bağlantıya sahip olan herkese açma
    { const f = B.$('[data-r=form]'), all = [...f.querySelectorAll('*')], pos = sel => all.indexOf(f.querySelector(sel));
      ok(pos('#sh-title') < pos('[data-r=gbtn]') && pos('[data-r=gbtn]') < pos('#sh-drive') && pos('#sh-drive') < pos('#sh-desc'), 'form sırası: başlık, Drive’dan seç, link, açıklama');
      ok(!B.$('[data-r=gpick]').hidden && /Drive’dan seç/.test(B.text('[data-r=gbtn]')), 'sitede Drive’dan seç düğmesi');
      eq(B.text('label[for=sh-drive]'), 'Ya da Drive linkini yapıştır', 'link kutusu yedek');
      const log = {}; googleMock(B.w, log);
      const F1 = 'https://drive.google.com/file/d/F1abcdefghij/view?usp=drive_web';
      log.pick = { action: 'picked', docs: [{ id: 'F1abcdefghij', name: 'Vize_1 çözümleri.pdf', url: F1, mimeType: 'application/pdf' }] };
      B.$('#sh-title').value = '';
      B.$('[data-r=gbtn]').click();
      await B.until(() => B.$('#sh-drive').value === F1, 'seçilen dosyanın linki kutuya yazıldı');
      eq(log.client, CFG.google.clientId, 'OAuth istemci kimliği'); eq(log.scope, 'https://www.googleapis.com/auth/drive.file', 'yalnızca drive.file izni');
      eq(log.prompts.join(), 'select_account', 'ilk seferde Google hesabı seçtirilir');
      ok(log.picker && log.picker.appId === CFG.google.appId && log.picker.key === CFG.google.apiKey && log.picker.token === 'tok-1' && log.picker.locale === 'tr' && log.picker.origin === 'https://yediwiki.test' && log.picker.views === 2, 'Picker ayarı: ' + JSON.stringify(log.picker && { a: log.picker.appId, l: log.picker.locale, o: log.picker.origin, v: log.picker.views }));
      eq(log.folders, false, 'klasör seçilmez (yalnızca dosya)');
      eq(log.fetch.length, 1, 'tek Drive isteği');
      ok(log.fetch[0].url === 'https://www.googleapis.com/drive/v3/files/F1abcdefghij/permissions?supportsAllDrives=true' && log.fetch[0].method === 'POST' && log.fetch[0].auth === 'Bearer tok-1', 'paylaşım isteği: ' + JSON.stringify(log.fetch[0]));
      eq(log.fetch[0].body, JSON.stringify({ role: 'reader', type: 'anyone', allowFileDiscovery: false }), 'bağlantıya sahip olan herkes görüntüleyebilir');
      eq(B.$('#sh-title').value, 'Vize 1 çözümleri', 'boş başlık dosya adından doldu');
      ok(B.$('[data-r=gmsg]').classList.contains('ok') && /“Vize_1 çözümleri\.pdf” seçildi/.test(B.text('[data-r=gmsg]')), 'seçildi iletisi: ' + B.text('[data-r=gmsg]'));
      await sleep(550);
      { const fr = B.$('[data-r=dmini] .dview.mini iframe'); ok(fr && fr.getAttribute('src') === 'https://drive.google.com/file/d/F1abcdefghij/preview', 'seçilen dosyanın önizlemesi'); }
      ok(B.$('[data-r=dbox]').classList.length > 0 && /Dosya|PDF|tanındı/.test(B.text('[data-r=dbox]')), 'link kutusu dosyayı tanıdı');
      // ikinci seçim: belirteç yeniden sorulmaz, dolu başlık değişmez
      log.pick = { action: 'picked', docs: [{ id: 'D2abcdefghij', name: 'Final notları', url: 'https://docs.google.com/document/d/D2abcdefghij/edit?usp=drive_web', mimeType: 'application/vnd.google-apps.document' }] };
      B.$('[data-r=gbtn]').click();
      await B.until(() => /D2abcdefghij/.test(B.$('#sh-drive').value), 'ikinci dosya seçildi');
      eq(log.prompts.length, 1, 'belirteç bir saat geçerli, yeniden giriş istenmez');
      eq(B.$('#sh-title').value, 'Vize 1 çözümleri', 'dolu başlığa dokunulmaz');
      // paylaşım ayarı değiştirilemezse uyarı; dosya zaten açıksa sorun yok
      log.shareFail = true; log.pick = { action: 'picked', docs: [{ id: 'X3abcdefghij', name: 'Başkasının dosyası', url: 'https://drive.google.com/file/d/X3abcdefghij/view' }] };
      B.$('[data-r=gbtn]').click();
      await B.until(() => B.$('[data-r=gmsg]').classList.contains('warn'), 'paylaşılamayan dosyada uyarı');
      ok(/Bağlantıya sahip olan herkes/.test(B.text('[data-r=gmsg]')) && log.fetch.slice(-2).map(x => x.method).join() === 'POST,GET', 'uyarı ve izin denetimi: ' + B.text('[data-r=gmsg]'));
      log.alreadyPublic = true; B.$('[data-r=gbtn]').click();
      await B.until(() => B.$('[data-r=gmsg]').classList.contains('ok'), 'zaten herkese açık dosya kabul edilir');
      log.shareFail = false; log.alreadyPublic = false;
      // vazgeçince bir şey değişmez
      const before = B.$('#sh-drive').value; log.pick = { action: 'cancel' };
      B.$('[data-r=gbtn]').click(); await sleep(80);
      eq(B.$('#sh-drive').value, before, 'vazgeçince link aynı');
      // Google penceresi kapanırsa açıklama
      B.ev("GD.token = ''"); log.deny = true;
      B.$('[data-r=gbtn]').click();
      await B.until(() => B.$('[data-r=gmsg]').classList.contains('err'), 'giriş penceresi kapandı iletisi');
      ok(/Google penceresi kapandı/.test(B.text('[data-r=gmsg]')), 'ileti: ' + B.text('[data-r=gmsg]'));
      eq(log.prompts.slice(-1)[0], '', 'sonraki girişte hesap seçimi zorlanmaz');
      log.deny = false;
      B.typeIn(B.$('#sh-drive'), ''); B.$('#sh-title').value = ''; await sleep(30);
      // yeni sürüm: ver.txt farklıysa bir sonraki geçişte sayfa yenilenir (aynı sürüm için bir kez)
      const ver = fs.readFileSync(path.join(ROOT, 'dist/ver.txt'), 'utf8').trim();
      eq(B.ev('VER.cur'), ver, 'sayfanın sürümü ver.txt ile aynı');
      B.w.fetch = async u => ({ ok: true, text: async () => (/\/ver\.txt\?t=\d+$/.test(String(u)) ? 'aaaaaaaaaaaa\n' : '') });
      B.ev('VER.at = 0'); await B.ev('checkVer()');
      eq(B.ev('VER.next'), 'aaaaaaaaaaaa', 'yeni sürüm fark edildi');
      B.w.sessionStorage.setItem('yw:verReload', 'aaaaaaaaaaaa');
      eq(B.ev('verReload()'), false, 'aynı sürüm için ikinci kez yenilenmez');
      B.ev("VER.next = ''"); delete B.w.fetch; }
    await B.go('#/not/' + n2); await sleep(150);
    ok(!B.$('[data-g=like-note]') && !!B.$('#main .vote.big'), 'notta beğeni yerine ▲ ▼ oy');
    B.$('#main [data-g=vote-up]').click(); await sleep(300);
    const k2 = B.ev(`pk('notes', ${JSON.stringify(n2)})`);
    { const d = await doc(be, 'notes', n2); ok(d.likes && d.likes[k2] === true && !d.likes[bid] && !(d.downs && d.downs[k2]), '▲ B\'nin bu nottaki takma adıyla'); }
    eq(await usersCtid(aid), ct0, 'anonim nota ▲ de açık profili değiştirmedi');
    await A.until(() => A.text('[data-r=kubbechip] b') === '101', 'A\'nın bakiyesi canlı güncellendi (101: ▲ 1 kubbe)');
    await B.until(() => B.$('#main .vote.is-up') && B.text('#main .vote .vnum') === '1', 'B ▲ verdiğini görüyor');
    B.$('#main [data-g=vote-down]').click(); await sleep(300);
    { const d = await doc(be, 'notes', n2); ok(d.downs && d.downs[k2] === true && d.likes[k2] === null, '▼ verince sunucuda ▲ kalktı'); }
    await A.until(() => A.text('[data-r=kubbechip] b') === '100', '▼ kubbe vermez, ▲ kubbesi geri gitti (100)');
    await B.until(() => B.$('#main .vote.is-down') && B.text('#main .vote .vnum') === '-1', 'B ▼ verdiğini görüyor');
    B.$('#main [data-g=vote-up]').click(); await sleep(300);
    await A.until(() => A.text('[data-r=kubbechip] b') === '101', 'yeniden ▲ (101)');
    await B.go('#/not/' + n1); await sleep(150);
    B.$('#main [data-g=vote-up]').click(); await sleep(300);
    await A.until(() => A.text('[data-r=kubbechip] b') === '102', 'adıyla nota ▲ (102)');
    { const u = await doc(be, 'users', aid); eq(u.kb.all, 76, 'açık kubbe: hesap + adıyla not + ▲'); eq(u.kb.ups, 1, 'açık profilde ▲ sayısı'); eq(u.kb.likes, 0, 'yorum beğenisi yok'); }
    await A.go('#/not/' + n1); await sleep(150);
    A.$('#main [data-g=vote-down]').click(); await sleep(200);
    await A.until(() => /Kendi notuna oy veremezsin/.test(A.text('#toasts')), 'kendi notuna ▼ verilemez');
    // yorum: anonim
    await B.go('#/not/' + n1 + '?tab=yorumlar'); await sleep(150);
    { const ta = B.$('#main textarea'); ok(!!ta, 'yorum kutusu');
      ta.value = 'Çok işime yaradı'; B.$('#main [data-r=anon]').click();
      await B.submit('#main [data-r=form]', 400);
      const c = (await be.pool.query("select id, data from public.docs where col = 'comments' and data->>'tid' = $1", [n1])).rows[0];
      ok(c && c.data.by === '' && c.data.byk === B.ev(`pk('comments', ${JSON.stringify(c.id)})`), 'anonim yorum takma adla'); }
    await A.go('#/');
    await A.until(() => A.ev('notifState().newCm') >= 1, 'A\'ya yorum bildirimi');
    await A.until(() => A.text('[data-r=cms] .cm-by') === 'Anonim', 'son yorumlarda anonim yorum');
    ok(!A.$('[data-r=cms] .cm-by .spy-name, [data-r=cms] .cm-by svg') && !!A.$('[data-r=cms] li .avatar'), 'son yorumlarda profil resmi var, adın yanında casus simgesi yok');
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
      ok(z && z.v && z.v[k] && z.v[k].z === 2 && z.v[k].y === 4, 'DersÖlçer oyu ders belgesinde takma adla, derece olarak (puan 4 → derece 2): ' + JSON.stringify(z && z.v && z.v[k]));
      const u = await doc(be, 'users', bid); ok(!u.zor, 'kullanıcı kaydında oy yok'); }
    await B.until(() => /1 öğrenci oyladı/.test(B.text('.zor-card')) && /Oyunu değiştir/.test(B.text('[data-g=zor]')), 'kart güncellendi');
    eq(B.text('.zor-card .dol-z .dol-num') + ' ' + B.text('.zor-card .dol-z .dol-word'), '4,0/5 Kolay', 'zorluk puanı: 1 en zor, 4 kolay');
    await A.go('#/ders/CSE211');
    await A.until(() => /1 öğrenci oyladı/.test(A.text('.zor-card')) && /Oy ver/.test(A.text('[data-g=zor]')), 'A oyu görüyor, kendisininki değil');
    // yorum sınırı: bir kişi bir derse en çok 3 yorum (anonim de sayılır)
    await B.go('#/ders/CSE211?tab=yorumlar'); await sleep(150);
    for (let i = 0; i < 3; i++) {
      B.$('#main [data-r=form] textarea').value = 'Ders yorumu ' + (i + 1);
      if (i === 1) B.$('#main [data-r=anon]').click();
      await B.submit('#main [data-r=form]', 350);
    }
    await B.until(() => B.$('#main [data-r=form]').hidden && !B.$('#main [data-r=full]').hidden, 'üç yorumdan sonra yorum kutusu kapanır');
    ok(/en çok 3 yorum/.test(B.text('#main [data-r=full]')), 'sınır açıklaması: ' + B.text('#main [data-r=full]'));
    eq((await q1(be, "select count(*)::int as n from public.docs where col = 'comments' and data->>'tid' = 'CSE211'")).n, 3, 'derste B\'nin üç yorumu');
    { const r = await B.cl.client.rpc('doc_set', { p_col: 'comments', p_id: 'fazla1', p_data: { tt: 'course', tid: 'CSE211', text: 'dördüncü', anon: true } });
      ok(r.error && /en çok 3 yorum/.test(r.error.message), 'sunucu dördüncü yorumu reddeder: ' + (r.error && r.error.message)); }
    await A.go('#/ders/CSE211?tab=yorumlar'); await sleep(150);
    ok(!A.$('#main [data-r=form]').hidden && A.$('#main [data-r=full]').hidden, 'sınır kişi başı: A yazabilir');
    noErr(A, 'A HocaÖlçer'); noErr(B, 'B HocaÖlçer');

    console.log('6) not isteği: anonim notla karşılanır');
    await A.go('#/ders/MATH131'); await sleep(120);
    A.$('[data-g=req-new]').click(); await sleep(60);
    A.$('#rq-why').value = 'Vizeye çalışıyorum';
    await A.submit('.modal form', 400);
    const rq = (await be.pool.query("select id, data from public.docs where col = 'requests'")).rows[0];
    ok(!!rq, 'istek kaydedildi');
    ok(rq && rq.data.text === '' && rq.data.kind === 'genel', 'türsüz istek: sunucu eski tür alanını genel yazar');
    ok(rq && rq.data.why === 'Vizeye çalışıyorum', 'isteğin nedeni sunucuda kaldı');
    await B.go('#/istekler'); await sleep(200);
    await B.until(() => /MATH 131/.test(B.text('#main')), 'B istekleri görüyor');
    await B.go(`#/paylas?ders=MATH131&istek=${rq.id}`); await sleep(120);
    B.$('#sh-title').value = 'Turev notlari'; B.$('#sh-drive').value = 'https://drive.google.com/file/d/turev/view'; B.$('[data-r=rules]').checked = true;
    B.$('[data-anon="1"]').click();
    await B.submit('[data-r=form]', 600);
    { const r = await doc(be, 'requests', rq.id); ok(r.done === true && r.doneBy === '' && !!r.nid, 'karşılandı, karşılayan boş: ' + JSON.stringify({ d: r.done, b: r.doneBy })); }
    { const p = await doc(be, 'private', bid), u = await doc(be, 'users', bid); eq(p.kb.fills, 1, 'karşılama kubbesi özel kayıtta'); eq(u.kb.fills, 0, 'açık profilde değil'); }
    await A.until(() => A.ev('notifItems().some(x => x.r && !x.r.doneBy)'), 'A\'ya karşılandı bildirimi');
    A.$('[data-g=bell]').click(); await sleep(60);
    ok(/Anonim biri/.test(A.text('#nf-pop')), 'bildirimde karşılayan anonim');
    ok(A.ev("document.querySelector('#nf-pop').previousElementSibling === document.querySelector('[data-r=bell]')") && !A.$('.modal-back'), 'bildirimler ortada değil, zilin altında açılır');
    eq(A.$('[data-r=bell]').getAttribute('aria-expanded'), 'true', 'zil açık olduğunu söyler');
    A.ev("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))"); await sleep(20);
    ok(!A.$('#nf-pop') && A.ev("document.activeElement === document.querySelector('[data-r=bell]')"), 'Esc kapatır, odak zile döner');
    A.$('[data-g=bell]').click(); await sleep(40);
    A.$('[data-g=bell]').click(); await sleep(40);
    ok(!A.$('#nf-pop'), 'zile yeniden basınca kapanır');
    A.$('[data-g=bell]').click(); await sleep(40);
    A.ev("document.querySelector('#main').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))"); await sleep(20);
    ok(!A.$('#nf-pop'), 'dışarı basınca kapanır');
    noErr(A, 'istek A'); noErr(B, 'istek B');

    console.log('7) yönetici: şifreyle giriş, düzeltme, moderasyon');
    await dashboardUser(be, 'yonetici@yediwiki.com', 'Test-Yonetici-1');
    const C = await tab(be, { name: 'yönetici' });
    C.ev('openAuth()'); await sleep(60);
    ok(!C.$('.modal .mail-dom').hidden, 'okul uzantısı başta görünür');
    C.typeIn(C.$('#au-lmail'), 'yonetici@yediwiki.com');
    eq(C.$('#au-lmail').value, 'yonetici@yediwiki.com', 'başka uzantılı tam adres kutuda kalır');
    ok(C.$('.modal .mail-dom').hidden, 'tam adres yazılınca okul uzantısı gizlenir');
    C.$('#au-lpw').value = 'yanlis';
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
    Dn.ev('openAuth()'); await sleep(60);
    const m0 = be.mails.length;
    Dn.$('.modal [data-r=to-signup]').click(); await sleep(40);
    Dn.$('#au-mail').value = 'deneme123'; Dn.$('#au-pw').value = 'herhangi-bir';
    await Dn.submit('.modal form', 150);
    ok(!!Dn.$('#au-lpw') && Dn.$('#au-lmail').value === 'deneme123', 'Kayıt ol’da deneme123 yazınca giriş ekranına döner');
    eq(be.mails.length, m0, 'deneme hesabına kod gönderilmedi');
    ok(/şifreyle girer/.test(Dn.text('.modal')), 'giriş ekranında açıklama');
    Dn.$('#au-lpw').value = 'deneme123';
    await Dn.submit('.modal form', 300);
    await Dn.until(() => Dn.ev('!!myAcc()') && !Dn.$('.modal'), 'deneme hesabına girildi');
    await Dn.until(() => Dn.text('[data-r=kubbechip] b') === '10050', 'hediye kubbe (10050)');
    await Dn.go('#/kubbe'); await sleep(150);
    Dn.ev("buyItem('kartal-kanatlari')"); await sleep(80);
    Dn.$('.modal [data-ok]').click(); await sleep(400);
    { let u = await doc(be, 'users', Dn.ev('S.me'));
      for (let i = 0; i < 20 && !(u.giy && u.giy.taki); i++) { await sleep(150); u = await doc(be, 'users', Dn.ev('S.me')); }   // giyme, alımdan sonra ayrı yazılır
      ok(u.items && u.items['kartal-kanatlari'] && u.spent === 1500, 'ürün sunucuda alındı'); ok(u.giy && u.giy.taki === 'kartal-kanatlari', 'alınan kanat sunucuda karaktere takıldı'); }
    { const me = Dn.ev('S.me'), r = await Dn.cl.client.rpc('doc_update', { p_col: 'users', p_id: me, p_patch: { sac: 'topuz', sacr: 'ysari', giy: { ust: 'parlak-mont', el: 'kartal-kanatlari' } } });
      ok(!r.error, 'karakter güncellemesi geçti'); const u = await doc(be, 'users', me);
      ok(u.sac === 'topuz' && !u.sacr && u.giy && !u.giy.ust && !u.giy.el && u.giy.taki === 'kartal-kanatlari', 'sunucu: alınmamış ürün ve saç boyası düşer, türü tutmayan düşer, takı yerinde'); }
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
    await B2.until(() => B2.text('#main .km-sec:nth-child(1) .km-count') === '1' && B2.text('#main .km-sec:nth-child(2) .km-count') === '1', 'Katkılarım: anonim not ve puan tanındı');
    noErr(B2, 'oturum');

    console.log('10) öğrenci şifreyle girer; şifremi unuttum');
    B.ev('openAuth()'); await sleep(60);
    { const m1 = be.mails.length;
      B.$('#au-lmail').value = 'bora.kaya'; B.$('#au-lpw').value = 'yanlis-sifre';
      await B.submit('.modal form', 200);
      ok(/şifre hatalı/i.test(B.text('.modal .err')) && /Şifremi unuttum/.test(B.text('.modal .err')), 'yanlış şifrede Şifremi unuttum önerilir: ' + B.text('.modal .err'));
      B.$('#au-lpw').value = pwOf('bora.kaya');
      await B.submit('.modal form', 300);
      await B.until(() => !B.$('.modal') && B.ev('myAcc() && myAcc().username') === 'borakaya', 'öğrenci şifreyle girdi');
      eq(be.mails.length, m1, 'şifreyle girişte kod gönderilmez'); }
    be.noRateLimit = true;
    const F = await tab(be, { name: 'şifre yenileme' });
    F.ev('openAuth()'); await sleep(60);
    F.typeIn(F.$('#au-lmail'), 'olmayan.biri');
    F.$('.modal [data-r=forgot]').click(); await sleep(40);
    ok(F.text('.modal-head h2') === 'Şifreni yenile' && F.$('#au-fmail').value === 'olmayan.biri' && !!F.$('#au-fpw'), 'Şifremi unuttum: yazılan e-posta taşındı');
    F.$('#au-fpw').value = 'Yeni-Sifre-1';
    await F.submit('.modal form', 200);
    ok(/hesap yok/.test(F.text('.modal .err')), 'hesabı olmayana kod gitmez: ' + F.text('.modal .err'));
    eq((await q1(be, "select count(*)::int as n from auth.users where email = 'olmayan.biri@std.yeditepe.edu.tr'")).n, 0, 'şifre yenilemede hesap açılmaz');
    be.minPw = 12;   // sunucu daha uzun şifre isterse: kod doğrulanır, şifre yeniden sorulur
    F.$('#au-fmail').value = 'ali.veli'; F.$('#au-fpw').value = 'Yeni-Sifre';
    await F.submit('.modal form', 200);
    await F.until(() => F.$('#au-code'), 'şifre yenileme kodu adımı');
    F.$('#au-code').value = lastCode(be, 'ali.veli@std.yeditepe.edu.tr');
    await F.submit('.modal form', 300);
    await F.until(() => F.$('#au-npw') && /zayıf/.test(F.text('.modal .err')), 'sunucu şifreyi zayıf bulunca yeni şifre istenir');
    F.$('#au-npw').value = 'Yeni-Sifre-123';
    await F.submit('.modal form', 300);
    await F.until(() => !F.$('.modal') && F.ev('myAcc() && myAcc().username') === 'aliveli', 'şifre yenilendi, giriş yapıldı');
    eq(be.passwords.get('ali.veli@std.yeditepe.edu.tr'), 'Yeni-Sifre-123', 'yeni şifre kaydedildi');
    ok(/Şifren yenilendi/.test(F.text('#toasts')), 'şifre yenilendi iletisi');
    be.minPw = 0; be.noRateLimit = false;
    noErr(B, 'şifreyle giriş'); noErr(F, 'şifre yenileme');

    console.log('11) ders önizlemesi: girişsiz ziyaretçi ve arama motoru (/ders/<kod>)');
    const seo = await import(path.join(ROOT, 'worker/seo.js'));
    const SD = JSON.parse(fs.readFileSync(path.join(ROOT, 'build/seo-data.json'), 'utf8'));
    const G = await tab(be, { name: 'önizleme', path: '/ders/cse211', hash: '' });
    await G.until(() => G.$('#main .peek-cta') && G.text('#main .course-head h1'), 'yol adresinden ders önizlemesi açıldı');
    eq(G.w.location.pathname + G.w.location.hash, '/ders/cse211', 'adres yol olarak kaldı');
    ok(!G.$('.modal'), 'önizlemede giriş penceresi kendiliğinden açılmaz');
    await G.until(() => /Bagli liste ozeti/.test(G.text('#main [data-r=list]') || ''), 'not başlığı önizlemede görünür');
    ok(!/aliveli|Ali Veli/.test(G.text('#main')), 'önizlemede paylaşanın adı yazmaz');
    ok(G.$('#main [data-g=myc]').hidden && G.$('#main [data-g=edit-course]').hidden, 'Derslerime ekle ve Düzenle önizlemede yok');
    { const n = G.ev("notesWhere(n => n.cid === 'CSE211' && !isHidden(n)).length");
      const mt = seo.courseMeta(SD, 'CSE211', n);
      eq(G.w.document.title, mt.title, 'sekme başlığı sunucunun yazdığıyla aynı');
      eq(G.$('meta[name=description]').getAttribute('content'), mt.desc, 'açıklama sunucunun yazdığıyla aynı');
      eq(G.$('link[rel=canonical]').getAttribute('href'), 'https://yediwiki.com/ders/cse211', 'canonical ders adresi'); }
    eq(G.$('#main [data-g=share]').dataset.path, '/ders/cse211', 'Paylaş ders adresini verir');
    G.$('#main .tab[data-tab=yorumlar]').click(); await sleep(60);
    ok(/giriş yapınca görünür/.test(G.text('#main [data-r=panel]')) && !G.$('#main [data-r=panel] textarea'), 'yorumlar girişle açılır');
    G.$('#main .tab[data-tab=hocalar]').click(); await sleep(60);
    ok(/giriş yapınca görünür/.test(G.text('#main [data-r=panel]')), 'hocalar girişle açılır');
    G.$('#main .tab[data-tab=notlar]').click(); await sleep(60);
    await G.until(() => G.$('#main .note-title'), 'notlar sekmesine dönüldü');
    { const href = G.$('#main .note-title').getAttribute('href'), url0 = G.w.location.pathname + G.w.location.hash;
      await G.go(href); await sleep(80);
      await G.until(() => G.$('.modal #au-lmail'), 'nota basınca giriş istenir');
      eq(G.w.location.pathname + G.w.location.hash, url0, 'giriş istenirken ders sayfasında kalınır');
      ok(!!G.$('#main .peek-cta'), 'önizleme arkada duruyor');
      eq(G.ev('S.pendingHash'), href, 'girişten sonra nota gidilecek');
      G.ev('closeAllModals()'); await sleep(40); }
    G.$('#main .peek-cta [data-g=peek-signup]').click(); await sleep(60);
    ok(G.text('.modal-head h2') === 'Kayıt ol' && /KVKK Aydınlatma Metni/.test(G.text('.modal .auth-legal')) && G.$('.modal .auth-legal a[href="/kvkk"]') && G.$('.modal .auth-legal a[href="/kosullar"]'), 'Kayıt ol: koşullar ve KVKK bağlantısı');
    G.ev('closeAllModals()'); await sleep(40);
    ok(!!G.$('footer a[href="/kvkk"]') && !!G.$('footer a[href="/kosullar"]'), 'alt menüde KVKK ve kullanım koşulları');
    { const url0 = G.w.location.pathname + G.w.location.hash;
      await G.go('#/dersler'); await sleep(80);
      await G.until(() => G.$('.modal #au-lmail'), 'Dersler yine giriş ister');
      eq(G.w.location.pathname + G.w.location.hash, url0, 'giriş istenince adres ders sayfasında kalır'); }
    noErr(G, 'önizleme');
    const H = await tab(be, { name: 'önizleme #', hash: '#/ders/MATH131' });
    await H.until(() => H.$('#main .peek-cta') && /Kalkulus anonim/.test(H.text('#main [data-r=list]') || ''), '#/ders/ adresiyle de önizleme');
    ok(!/Anonim/.test(H.text('#main [data-r=list]')), 'önizlemede anonim etiketi de yazmaz');
    noErr(H, 'önizleme #');
    { // sunucunun yazdığı önizleme (data-ssr) uygulama açılınca yerini gerçek sayfaya bırakır
      const html = HTML.replace('<main id="main" tabindex="-1"></main>', () => '<main id="main" tabindex="-1">' + seo.courseBody(SD, 'CSE211', []) + '</main>');
      const S2 = await tab(be, { name: 'sunucu önizlemesi', path: '/ders/cse211', hash: '', html });
      await S2.until(() => S2.$('#main .peek-cta') && !S2.$('#main [data-ssr]'), 'sunucu önizlemesinin yerini uygulama aldı');
      noErr(S2, 'sunucu önizlemesi'); S2.close(); }
    const A2 = await tab(be, { name: 'A yol adresi', path: '/ders/math131', hash: '', session: A.cl.st.session });
    await A2.until(() => A2.$('#main .course-head') && !A2.$('#main .peek-cta') && A2.$('#main [data-g=myc]') && !A2.$('#main [data-g=myc]').hidden, 'giriş yapmış öğrenci yol adresinde tam sayfayı görür');
    await A2.go('#/dersler'); await sleep(80);
    eq(A2.w.location.pathname + A2.w.location.hash, '/#/dersler', 'başka sayfaya geçince adres köke taşınır');
    await A2.until(() => A2.ev("curKey") === 'dersler' && !A2.$('.modal'), 'Dersler açıldı');
    eq(A2.w.document.title, 'YediWiki', 'ders dışı sayfada başlık YediWiki');
    eq(A2.$('link[rel=canonical]').getAttribute('href'), 'https://yediwiki.com/', 'ders dışı sayfada canonical ana sayfa');
    await A2.go('#/'); await sleep(120);
    eq(A2.w.document.title, 'YediWiki: Yeditepe Ders Notları, Çıkmış Sınavlar ve Hoca Yorumları', 'ana sayfada arama motoru başlığı');
    await A2.until(() => A2.$('#main a[href^="/ders/"]'), 'ana sayfadaki ders bağlantıları /ders/<kod> adresi');
    ok(!A2.$('#main a[href^="#/ders/"]'), 'ana sayfada #/ders/ bağlantısı kalmadı');
    { const a = A2.$('#main a[href^="/ders/"]'), href = a.getAttribute('href');
      a.click(); await sleep(150);
      await A2.until(() => A2.ev('curKey') === 'ders' && A2.text('#main .course-head .code-xl'), 'ders bağlantısına basınca sayfa yenilenmeden ders açıldı');
      eq(A2.w.location.hash.toLowerCase(), '#' + href.toLowerCase(), 'ders #/ders/ ile açıldı: ' + href); }
    noErr(A2, 'yol adresi');

    for (const t of [v, A, B, C, Dn, B2, F, G, H, A2]) t.close();
  } catch (e) {
    fail++; console.log('  ✗ beklenmeyen hata: ' + (e && e.stack || e));
  } finally {
    await be.end();
  }
  console.log(`\n${pass} geçti, ${fail} kaldı`);
  process.exit(fail ? 1 : 0);
})();
