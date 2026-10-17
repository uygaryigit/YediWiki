// Katalog turu testleri: node t_katalog.js [html yolu]
const fs = require('fs'), path = require('path');
const { boot, loadBackup, clone } = require('./fake.js');
const HTML = fs.readFileSync(process.argv[2] || path.join(__dirname, '../build/artifact.html'), 'utf8');
const SEED = loadBackup(process.env.YW_SEED || path.join(__dirname, 'seed'));
const CATJ = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/catalog.json'), 'utf8'));
// Her yayında elle güncellenen beklenen sayılar: katalog yeniden kurulunca kazara değişimi yakalar
const N_KATALOG = 2823;
const BEK = { havuzluBolum: 71, havuzluFak: 'Bilgisayar ve Bilişim Bilimleri Fakültesi | Diş Hekimliği Fakültesi | Eczacılık Fakültesi | Eğitim Fakültesi | Hukuk Fakültesi | Meslek Yüksekokulu | Mimarlık Fakültesi | Mühendislik ve Doğa Bilimleri Fakültesi | Sanat ve Tasarım Fakültesi | Sağlık Bilimleri Fakültesi | Tıp Fakültesi | İletişim Fakültesi | İnsan ve Toplum Bilimleri Fakültesi | İşletme Fakültesi', havuz: 219, havuzluHak: 620, eslenen: 921, kredisiz: 'AFYA102,COMM300,TEXT466' };
let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) pass++; else { fail++; console.log('  ✗ ' + msg); } };
const eq = (a, b, msg) => ok(a === b, `${msg}: beklenen ${JSON.stringify(b)}, gelen ${JSON.stringify(a)}`);
const noErr = (t, msg) => { ok(t.errors.length === 0, `${msg}: hata var -> ${t.errors.slice(0, 3).map(e => e.join(' ').slice(0, 400)).join(' || ')}`); t.errors.length = 0; };
const student = (bolum = 'bilgisayar-muhendisligi') => ({ username: 'testci', first: 'Test', last: 'Öğrenci', showName: false, yil: 2023, showYil: false, bolum, emoji: '🙂', color: '#FFE14D', pic: '', bonus: 50, spent: 0, items: {}, at: Date.now() - 1e6, verifiedAt: Date.now() - 1e6 });
async function asStudent(extraSeed = {}, bolum) {
  const t = await boot({ html: HTML, seed: Object.assign(clone(SEED), extraSeed) });
  const me = t.ev('S.me');
  t.store.put('users/' + me, student(bolum));
  await t.wait(120);
  t.me = me; return t;
}

// Seçmeli satırları (planda): .el-row; havuzlu .has-pool, fakülte listesine bağlı .has-link. Satıra basınca .el-panel açılır.
const elRows = (t, sel = '') => t.$$('[data-r=list] .el-row' + sel);
async function elOpen(t, r) { const k = r.dataset.k; r.querySelector('[data-g=el-open]').click(); await t.wait(80); return t.$(`[data-r=list] .el-row[data-k="${k}"] .el-panel`); }
async function elClose(t, p) { p.closest('.el-row').querySelector('[data-g=el-open]').click(); await t.wait(60); }
// Ders sayfasında bölüm rozeti yok; dersin geçtiği planlar ve seçmeli listeleri veriden denetlenir (kendi bölümün başta)
const planList = (t, cid) => JSON.parse(t.ev(`JSON.stringify((() => { const b = bolumlerOf('${cid}'), mine = (userOf(S.me) || {}).bolum; if (mine && b.includes(mine)) { b.splice(b.indexOf(mine), 1); b.unshift(mine); } return b.map(id => { const P = planOf(id); let sem = ''; for (const [k, a] of Object.entries(P.plan)) if (Array.isArray(a) && a.includes('${cid}')) sem = k; return ((S.bolumler.get(id) || {}).ad || id) + (sem ? sem + '. ' + (P.yillik ? 'sınıf' : 'dönem') : ''); }); })())`));
const elsList = (t, cid) => JSON.parse(t.ev(`JSON.stringify((() => { const b = bolumlerOf('${cid}'), mine = (userOf(S.me) || {}).bolum; const e = secmeliOf('${cid}').filter(id => S.bolumler.has(id) && !b.includes(id)); if (mine && e.includes(mine)) { e.splice(e.indexOf(mine), 1); e.unshift(mine); } return e.map(id => (S.bolumler.get(id) || {}).ad || id); })())`));
const noPlanChips = t => !t.$('[data-r=plans]') && !t.$('[data-r=els]') && !t.$('.plan-chip') && !t.$('[data-g=plans-all]');

(async () => {
  console.log('1) katalog ve birleştirme');
  {
    const t = await asStudent();
    eq(t.ev('CAT.courses.size'), N_KATALOG, 'katalog ders sayısı');
    eq(t.ev('CAT.plans.size'), 72, 'katalog plan sayısı');
    eq(t.ev('S.dbCourses.size'), 170, 'veritabanı ders kaydı');
    eq(t.ev('S.courses.size'), N_KATALOG + 1, 'birleşik ders sayısı (katalog + veritabanında kalan 1)');
    const c = t.ev('JSON.stringify(S.courses.get("CSE211"))'); const cj = JSON.parse(c);
    eq(cj.name, 'Veri Yapıları', 'CSE211 adı'); eq(cj.ects, 6, 'CSE211 AKTS'); eq(cj.kr, 4, 'CSE211 kredi'); eq(cj.code, 'CSE 211', 'CSE211 kod');
    ok(Array.isArray(cj.hocas), 'veritabanı alanı (hocas) korunuyor');
    eq(t.ev('S.courses.get("PHYS104").name'), 'Fizik III', 'yalnız veritabanında olan ders duruyor');
    eq(t.ev('S.courses.get("DENT115").name'), 'Diş Morfolojisi, Manipülasyon ve Protetik Diş Tedavisi 1', 'yalnız katalogda olan ders');
    eq(t.ev('gateState()'), 'open', 'öğrenci girişi açık');
    noErr(t, 'açılış');

    console.log('2) Tüm dersler listesi');
    await t.go('#/dersler?b=');
    t.w.document.querySelector('[data-r=bol]').value = ''; t.w.document.querySelector('[data-r=bol]').dispatchEvent(new t.w.Event('change')); await t.wait(60);
    ok(new RegExp(String(N_KATALOG + 1)).test(t.text('.list-info') || ''), 'liste bilgisi toplamı söylüyor: ' + t.text('.list-info'));
    eq(t.$$('[data-r=list] .row-link').length, 80, 'ilk 80 satır');
    ok(!!t.$('[data-g=more-courses]'), 'daha fazla düğmesi var');
    t.$('[data-g=more-courses]').click(); await t.wait(80);
    eq(t.$$('[data-r=list] .row-link').length, 320, 'daha fazla: 320 satır');
    const f = t.$('[data-r=f]'); f.value = 'farmakoloji'; f.dispatchEvent(new t.w.Event('input')); await t.wait(60);
    const rows = t.$$('[data-r=list] .row-link');
    ok(rows.length >= 3 && rows.length < 80, 'süzgeç daraltıyor: ' + rows.length);
    ok(rows.every(r => /farmakoloji/i.test(r.textContent)), 'süzülen satırların hepsi eşleşiyor');
    ok(!t.$('[data-g=more-courses]'), 'kısa listede düğme yok');
    f.value = 'zzzqqq'; f.dispatchEvent(new t.w.Event('input')); await t.wait(40);
    ok(/Eşleşen ders yok/.test(t.text('[data-r=list]')), 'eşleşme yoksa boş durum');
    noErr(t, 'tüm dersler');

    console.log('3) 75 bölümün plan sayfası');
    const slugs = JSON.parse(t.ev('JSON.stringify([...S.bolumler.keys()])'));
    eq(slugs.length, 75, 'bölüm sayısı');
    let withPlan = 0, rowsTot = 0;
    for (const slug of slugs) {
      await t.go('#/dersler?b=' + slug);
      const list = t.$('[data-r=list]'), P = CATJ.planlar[slug];
      if (!P) { ok(/ders planı yok/.test(list.textContent), slug + ': plan yok mesajı'); continue; }
      withPlan++;
      const secs = [...list.querySelectorAll('section.grp')];
      const sems = Object.keys(P.donemler), dolu = sems.filter(k => P.donemler[k].dersler.length || P.donemler[k].secmeli.length);
      eq(secs.length, dolu.length, slug + ': dönem bölümü sayısı');
      const fk = v => String(Math.round(v * 10) / 10).replace('.', ',');
      const tot = [...list.querySelectorAll('.sem-ects')].reduce((s, e) => s + parseFloat(e.textContent.replace(',', '.')), 0);
      const wantKr = dolu.filter(k => P.donemler[k].kredi_tam).reduce((s, k) => s + P.donemler[k].kredi, 0);
      ok(Math.abs(tot - wantKr) < 1e-6, slug + ': dönem kredi toplamı ' + tot + ' / ' + wantKr);
      ok(!/AKTS/.test(list.querySelector('section.grp').textContent), slug + ': planda AKTS yazmıyor');
      const codes = [...list.querySelectorAll('.row-link .code')].filter(e => !e.closest('.el-row')).map(e => e.textContent.replace(' ', ''));
      const want = sems.flatMap(k => P.donemler[k].dersler);
      eq(codes.join(','), want.join(','), slug + ': ders sırası');
      rowsTot += codes.length;
      ok(![...list.querySelectorAll('.row-title')].some(e => /yükleniyor|girilmemiş/.test(e.textContent)), slug + ': adsız ders yok');
      eq(list.querySelectorAll('.el-row').length, sems.reduce((s, k) => s + P.donemler[k].secmeli.length, 0), slug + ': seçmeli satırı sayısı');
      const h0 = secs[0].querySelector('.sem-h').textContent;
      const k0 = +dolu[0], lbl = P.yillik ? `${k0}${k0}. sınıf` : `${k0}${Math.ceil(k0 / 2)}. sınıf ${k0 % 2 ? 'Güz' : 'Bahar'}`;
      { const d0 = P.donemler[dolu[0]]; ok(h0.startsWith(lbl + (d0.kredi_tam && d0.kredi ? fk(d0.kredi) + ' kredi' : '')), slug + ': dönem başlığı -> ' + h0 + ' / ' + lbl); }
      eq(/planın toplamı/.test(list.querySelector(':scope > p.fine').textContent), !!P.kredi_tam, slug + ': alt bilgide toplam yalnız kredi tamsa');
      if (P.kredi_tam) ok(list.querySelector(':scope > p.fine').textContent.includes('planın toplamı ' + fk(P.kredi) + ' kredi'), slug + ': alt bilgi toplamı');
    }
    eq(withPlan, 72, 'planı olan bölüm'); eq(rowsTot, 2309, 'plan satırı toplamı');
    await t.go('#/dersler?b=dis-hekimligi');
    ok(t.$$('.sem-h').some(h => /5\. sınıf Bahar/.test(h.textContent)), '10 dönemlik program: 5. sınıf Bahar');
    await t.go('#/dersler?b=tip');
    ok(t.$$('.sem-h').length === 6 && !t.$$('.sem-h').some(h => /Güz|Bahar/.test(h.textContent)), 'Tıp: 6 yıl, Güz/Bahar yok');
    ok(!t.$('.sem-ects') && /40 kredi/.test(t.text('[data-r=list]')), 'Tıp: seçmeli kredisi bilinmediği için dönem toplamı yok, ders kredisi var');
    await t.go('#/dersler?b=bilgisayar-muhendisligi');
    ok(/^SeçmeliKısıtlı seçmeli 13 ders arasından seç3 kredi$/.test(t.text('[data-r=list] .el-row .el-tog')), 'seçmeli satırında numara, ders sayısı, kredi: ' + t.text('[data-r=list] .el-row .el-tog'));
    ok(/4 kredi/.test(t.$('[data-r=list] .row-link .ects').textContent), 'ders satırında kredi');
    await t.go('#/ders/CSE400');
    ok(/0 kredi, 5 AKTS/.test(t.text('[data-r=dept]')), 'kredisiz ders: ' + t.text('[data-r=dept]'));
    await t.go('#/ders/PHYS104');
    eq(t.text('[data-r=dept]'), 'Mühendislik ve Doğa Bilimleri Fakültesi, 8 AKTS', 'kredisi bilinmeyen eski kayıt AKTS ile');
    await t.go('#/dersler?b=otomotiv-teknolojisi');
    ok(/ön lisans/.test(t.text('.bol-head')), 'ön lisans etiketi');
    noErr(t, 'bölüm planları');

    console.log('4) bu dönemki dersler, mezuniyet yolu ve seçmeli satırları');
    await t.go('#/dersler?b=bilgisayar-muhendisligi');
    { const now = new Date(), M = now.getMonth(), guz = M >= 7 || M === 0, ay = M >= 7 ? now.getFullYear() : now.getFullYear() - 1;
      const P = CATJ.planlar['bilgisayar-muhendisligi'], sems = Object.keys(P.donemler).map(Number).sort((a, b) => a - b);
      const sn = Math.min(sems[sems.length - 1], Math.max(sems[0], (ay - 2023) * 2 + (guz ? 1 : 2)));
      const box = t.$('[data-r=now] .now-sem');
      ok(box && /Bu dönemki dersler/.test(box.textContent) && t.text('[data-r=now] .now-term') === `${ay}-${ay + 1} ${guz ? 'Güz' : 'Bahar'}`, 'kendi bölümünde Bu dönemki dersler: ' + (box && t.text('[data-r=now] .now-term')));
      ok(new RegExp(`^${sn}\\. dönem · ${Math.ceil(sn / 2)}\\. sınıf ${sn % 2 ? 'Güz' : 'Bahar'}$`).test(t.text('[data-r=now] .now-lbl')), 'dönem giriş yılından (2023): ' + t.text('[data-r=now] .now-lbl'));
      eq(t.$$('[data-r=now] .row-link .code').map(e => e.textContent.replace(' ', '')).join(), P.donemler[sn].dersler.join(), 'bu dönemin dersleri plandaki gibi');
      ok(!t.$('[data-r=list] .now-sem') && !t.$('[data-r=now] [data-g=done]') && !t.$('[data-r=now] .el-row'), 'plan listesi aynı kaldı; kutuda ✓ ve seçmeli satırı yok');
      const prev = t.$('[data-r=now] [data-g=sem-step][data-d="-1"]');
      prev.click(); await t.wait(120);
      ok(new RegExp(`^${sn - 1}\\. dönem`).test(t.text('[data-r=now] .now-lbl')), 'okla bir önceki döneme: ' + t.text('[data-r=now] .now-lbl'));
      const sv = JSON.parse(t.ev("JSON.stringify(privGet('donem')['bilgisayar-muhendisligi'])"));
      ok(sv && sv.s === sn - 1 && sv.t > 0, 'seçim hesabın özel kaydında: ' + JSON.stringify(sv));
      eq(t.ev(`nowSem('bilgisayar-muhendisligi', planOf('bilgisayar-muhendisligi')).sn`), sn - 1, 'seçim korunur');
      { const nx = t.ev(`(() => { const t = acadNow(); return termIdx(t); })()`), v2 = JSON.parse(t.ev("JSON.stringify(privGet('donem')['bilgisayar-muhendisligi'])"));
        eq(v2.t, nx, 'seçimin dönemi bu dönem'); }
      t.ev(`privPut('donem', 'bilgisayar-muhendisligi', { s: ${sn - 1}, t: termIdx(acadNow()) - 1 })`); await t.wait(80);
      eq(t.ev(`nowSem('bilgisayar-muhendisligi', planOf('bilgisayar-muhendisligi')).sn`), Math.min(sems[sems.length - 1], sn), 'yeni döneme geçince seçim bir ilerler');
      t.ev(`privPut('donem', 'bilgisayar-muhendisligi', null)`); await t.wait(80);
      const f = t.$('[data-r=f]'); f.value = 'cse'; f.dispatchEvent(new t.w.Event('input')); await t.wait(60);
      ok(!t.$('[data-r=now] .now-sem'), 'ararken bu dönem kutusu yok');
      f.value = ''; f.dispatchEvent(new t.w.Event('input')); await t.wait(60);
      await t.go('#/dersler?b=matematik');
      ok(!t.$('[data-r=now] .now-sem'), 'başka bölümün planında bu dönem kutusu yok');
      await t.go('#/dersler?b=tip');
      ok(!t.$('[data-r=now] .now-sem'), 'Tıp planında da yok (kendi bölümü değil)');
      t.store.put('users/' + t.me, Object.assign(student(), { yil: ay - 2 })); await t.wait(120);
      eq(t.ev(`nowSem('tip', planOf('tip')).sn`), 3, 'yıllık planda dönem sınıf: iki yıl önce giren 3. sınıf');
      t.store.put('users/' + t.me, student()); await t.wait(120);
      await t.go('#/dersler?b=bilgisayar-muhendisligi'); }
    ok(/0\/32 zorunlu ders, 0\/13 seçmeli, 0\/143 kredi/.test(t.text('.grad')), 'başlangıç: ' + t.text('.grad-top'));
    eq(CATJ.planlar['bilgisayar-muhendisligi'].kredi, 143, 'planın kredisi mezuniyet yolundakiyle aynı');
    t.$('[data-g=done][data-id=CSE101]').click(); await t.wait(80);
    ok(/1\/32 zorunlu ders, 0\/13 seçmeli, 4\/143 kredi/.test(t.text('.grad')), 'işaretleyince: ' + t.text('.grad-top'));
    ok(/1\/5/.test(t.$('.sem-prog').textContent), 'dönem ilerlemesi 1/5 (4 ders, 1 seçmeli)');
    let er = t.$('[data-r=list] .el-row');
    const k1 = er.dataset.k;
    ok(er.classList.contains('has-pool') && !er.classList.contains('open') && !t.$('[data-r=list] .el-panel'), 'seçmeli satırı kapalı başlar');
    let pn = await elOpen(t, er);
    ok(pn, 'satıra basınca liste açıldı');
    eq(t.$(`[data-r=list] .el-row[data-k="${k1}"] [data-g=el-open]`).getAttribute('aria-expanded'), 'true', 'aria-expanded');
    eq([...pn.querySelectorAll('.el-opts .code')].map(e => e.textContent).join(','), 'AFE 131,AFEA 111,ES 176', 'listedeki dersler');
    const w0 = t.store.log.length;
    pn.querySelector('[data-c=ES176]').click(); await t.wait(150);
    er = t.$(`[data-r=list] .el-row[data-k="${k1}"]`);
    ok(er.classList.contains('picked') && !er.classList.contains('open'), 'seçince liste kapandı');
    eq(er.querySelector('.el-code').textContent, 'ES 176', 'satırda seçilen dersin kodu');
    eq(er.querySelector('.row-title').textContent, 'Araştırma ve Teknik Yazım', 'satırın adı seçilen ders');
    eq(er.querySelector('.row-sub').textContent, 'Kısıtlı seçmeli 1', 'altında seçmelinin adı');
    const pw = t.store.log.slice(w0).find(x => /private$/.test(x.path));
    ok(pw && JSON.stringify(pw.data).includes('"' + k1 + '":"ES176"'), 'seçim hesabın özel kaydında: ' + JSON.stringify(pw && pw.data));
    ok(/ES 176 seçildi/.test(t.text('#toasts')), 'seçim bildirimi');
    er.querySelector('[data-g=el-done]').click(); await t.wait(120);
    ok(/1\/32 zorunlu ders, 1\/13 seçmeli, 7\/143 kredi/.test(t.text('.grad')), 'seçmeliyi işaretleyince: ' + t.text('.grad-top'));
    ok(/2\/5/.test(t.$('.sem-prog').textContent), 'dönem ilerlemesi 2/5');
    ok(t.$(`[data-r=list] .el-row[data-k="${k1}"]`).classList.contains('done'), 'seçmeli satırı işaretli');
    const er2 = elRows(t).find(r => /Kısıtlı seçmeli 2/.test(r.textContent));
    pn = await elOpen(t, er2);
    const tk = pn.querySelector('[data-c=ES176]');
    ok(tk && tk.disabled && /Kısıtlı seçmeli 1 için seçtin/.test(tk.textContent), 'başka seçmelide seçilen ders kapalı: ' + (tk && tk.textContent));
    await elClose(t, pn);
    pn = await elOpen(t, t.$(`[data-r=list] .el-row[data-k="${k1}"]`));
    pn.querySelector('.el-src [data-g=el-pick][data-c=""]').click(); await t.wait(120);
    eq(t.$(`[data-r=list] .el-row[data-k="${k1}"] .row-title`).textContent, 'Kısıtlı seçmeli 1', 'seçim kaldırılınca adı geri geldi');
    const sr = elRows(t, '.has-link').find(r => /Serbest seçmeli 1/.test(r.textContent));
    pn = await elOpen(t, sr);
    const sq = pn.querySelector('[data-r=el-q][data-all]');
    ok(sq, 'serbest seçmelide tüm derslerde arama kutusu');
    ok(/^https:\/\/mdbf\.yeditepe\.edu\.tr\/tr\/secmeli-dersler\?secmeliID=\d+$/.test(pn.querySelector('.el-src a').getAttribute('href')), 'serbest: fakülte sayfası bağlantısı');
    sq.value = 'psikoloji'; sq.dispatchEvent(new t.w.Event('input', { bubbles: true })); await t.wait(30);
    const sres = [...pn.querySelectorAll('.el-opts .code')].map(e => e.textContent);
    ok(sres.length >= 5 && sres.length <= 12, 'arama sonuçları: ' + sres.join(','));
    pn.querySelector('.el-opts [data-g=el-pick]').click(); await t.wait(120);
    eq(elRows(t, '.has-link.picked').length, 1, 'serbest seçmelide ders seçildi');
    noErr(t, 'mezuniyet yolu ve seçmeli satırları');

    console.log('4b) ÇAP / yandal');
    t.$('[data-g=cap-open]').click(); await t.wait(60);
    let cm = t.$('.modal');
    ok(cm && /ÇAP ya da yandal ekle/.test(cm.querySelector('h2').textContent), 'ÇAP penceresi');
    ok(![...cm.querySelectorAll('#cap-b option')].some(o => o.value === 'bilgisayar-muhendisligi'), 'kendi bölümü seçeneklerde yok');
    cm.querySelector('form').dispatchEvent(new t.w.Event('submit', { cancelable: true, bubbles: true })); await t.wait(60);
    ok(/İkinci bölümü seç/.test(cm.querySelector('.err').textContent), 'bölüm seçmeden eklenmez');
    cm.querySelector('#cap-b').value = 'matematik';
    cm.querySelector('form').dispatchEvent(new t.w.Event('submit', { cancelable: true, bubbles: true })); await t.wait(200);
    ok(!t.$('.modal'), 'pencere kapandı');
    eq(t.text('.cap-pill'), 'ÇAPMatematik', 'ÇAP rozeti');
    ok(t.$$('.cap-blk').length >= 6, 'dönemlerde ÇAP blokları: ' + t.$$('.cap-blk').length);
    const mainCodes = new Set(t.$$('[data-r=list] section.grp > .list .code').map(e => e.textContent));
    const capCodes = t.$$('.cap-blk .list .code').map(e => e.textContent).filter(c => c !== 'Seçmeli');
    ok(capCodes.length > 10 && !capCodes.some(c => mainCodes.has(c)), 'ÇAP bloklarında ana programdaki dersler tekrar yok');
    ok(/ana programında da var/.test(t.text('.cap-blk')), 'ortak ders notu');
    ok(/0\/23 zorunlu ders, 0\/10 seçmeli, 0\/110 kredi/.test(t.text('.grad-2')), 'ÇAP ilerlemesi: ' + t.text('.grad-2'));
    const xb = t.$('.cap-blk [data-g=cap-hide]'), xk = xb.dataset.k;
    xb.click(); await t.wait(120);
    ok(!t.$$('.cap-blk .code').some(e => e.textContent.replace(' ', '') === xk), 'çıkarılan ders listede yok');
    ok(/1 ders çıkarıldı/.test(t.text('.cap-blk')), 'çıkarıldı notu');
    ok(/0\/22 zorunlu ders/.test(t.text('.grad-2')), 'çıkarılan ders ilerlemeden düştü: ' + t.text('.grad-2'));
    t.$('[data-g=cap-unhide]').click(); await t.wait(120);
    ok(t.$$('.cap-blk .code').some(e => e.textContent.replace(' ', '') === xk), 'geri getirildi');
    t.$('.cap-blk [data-g=done]').click(); await t.wait(120);
    ok(/1\/23 zorunlu ders/.test(t.text('.grad-2')), 'ÇAP dersi işaretlenince: ' + t.text('.grad-2'));
    t.$('[data-g=cap-open]').click(); await t.wait(60);
    cm = t.$('.modal'); cm.querySelector('input[value=yandal]').checked = true;
    cm.querySelector('form').dispatchEvent(new t.w.Event('submit', { cancelable: true, bubbles: true })); await t.wait(200);
    eq(t.text('.cap-pill'), 'YandalMatematik', 'yandala çevrildi');
    ok(/1\/23 zorunlu ders/.test(t.text('.grad-2')), 'aynı bölümde işaretler korunur');
    t.$('[data-g=cap-clear]').click(); await t.wait(60);
    t.$('.modal [data-ok]').click(); await t.wait(200);
    ok(!t.$('.cap-blk') && /ÇAP \/ Yandal ekle/.test(t.text('.cap-bar')), 'ÇAP kaldırıldı');
    noErr(t, 'ÇAP / yandal');

    console.log('5) ders sayfası (yalnız katalogda olan ders)');
    await t.go('#/ders/DENT115');
    eq(t.text('[data-r=name]'), 'Diş Morfolojisi, Manipülasyon ve Protetik Diş Tedavisi 1', 'ad');
    ok(/Diş Hekimliği Fakültesi, [\d,]+ kredi, \d+ AKTS/.test(t.text('[data-r=dept]')), 'fakülte, kredi, AKTS: ' + t.text('[data-r=dept]'));
    ok(noPlanChips(t), 'ders sayfasında bölüm rozeti yok');
    ok(planList(t, 'DENT115').includes('Diş Hekimliği1. dönem'), 'katalogda planı: ' + planList(t, 'DENT115'));
    ok(/İlk oyu sen ver/.test(t.text('.zor-card')), 'oy kartı boş');
    ok(t.$('[data-r=edit]').hidden, 'öğrenciye Düzenle kapalı');
    await t.go('#/ders/HTR301');
    eq(planList(t, 'HTR301').length, 72, 'ortak ders 72 bölümün planında');
    ok(/^Bilgisayar Mühendisliği/.test(planList(t, 'HTR301')[0]), 'kendi bölümü başta');
    eq(t.text('[data-r=dept]'), 'Ortak ders, 2 kredi, 2 AKTS', 'ortak ders satırı');
    ok(noPlanChips(t), 'ortak derste de rozet yok');
    await t.go('#/ders/MED103');
    ok(planList(t, 'MED103').includes('Tıp1. sınıf'), 'yıllık programda "sınıf": ' + planList(t, 'MED103'));
    await t.go('#/ders/PHYS104');
    eq(t.text('[data-r=name]'), 'Fizik III', 'veritabanı dersi açılıyor'); eq(planList(t, 'PHYS104').length, 0, 'artık hiçbir planda değil');
    await t.go('#/ders/XYZ999');
    ok(/Bu ders listede yok/.test(t.text('#main')), 'olmayan ders');
    noErr(t, 'ders sayfaları');

    console.log('6) DersÖlçer oyu (kayıt açmadan)');
    await t.go('#/ders/DENT115');
    const n0 = t.store.log.length;
    t.$('[data-g=zor]').click(); await t.wait(60);
    ok(!!t.$('.modal'), 'oy penceresi açıldı');
    t.$('.modal input[name=z][value="4"]').checked = true; t.$('.modal input[name=y][value="2"]').checked = true;
    t.$('.modal form').dispatchEvent(new t.w.Event('submit', { cancelable: true, bubbles: true })); await t.wait(120);
    const wr = t.store.log.slice(n0);
    eq(wr.length, 1, 'tek yazma'); eq(wr[0].path, 'users/' + t.me, 'oy hesap kaydına yazıldı'); eq(wr[0].op, 'update', 'güncelleme');
    eq(JSON.stringify(Object.keys(wr[0].data.zor)), '["DENT115"]', 'oy anahtarı');
    eq(JSON.stringify([wr[0].data.zor.DENT115.z, wr[0].data.zor.DENT115.y]), '[2,4]', 'kayıtta derece tutulur: puan 4 (kolay) → derece 2, puan 2 (ağır) → derece 4');
    ok(!t.store.docs.has('courses/DENT115'), 'ders kaydı açılmadı');
    ok(/1 öğrenci oyladı/.test(t.text('.zor-card')) && /4,0/.test(t.text('.zor-card .dol-z')) && /2,0/.test(t.text('.zor-card .dol-y')), 'kart güncellendi: ' + t.text('.zor-card'));
    eq(t.text('.zor-card .dol-z .dol-word') + '|' + t.text('.zor-card .dol-y .dol-word'), 'Kolay|Ağır', 'puan 4 kolay, puan 2 ağır');
    eq(t.text('[data-g=zor]'), 'Oyunu değiştir', 'düğme metni');
    await t.go('#/dersler?b=dis-hekimligi');
    { const zc = t.$('[data-r=list] .zchip'); ok(zc && t.text('[data-r=list] .zchip') === '4,0' && !!zc.querySelector('svg.chili') && !/🌶/.test(t.text('[data-r=list]')), 'planda zorluk rozeti: çizim biber ve puan, emoji yok'); }
    await t.go('#/ders/DENT115');
    t.$('[data-g=zor]').click(); await t.wait(60);
    ok(t.$('.modal input[name=z][value="4"]').checked, 'eski oy seçili geliyor');
    t.$('.modal [data-r=zdel]').click(); await t.wait(120);
    ok(/İlk oyu sen ver/.test(t.text('.zor-card')), 'oy kaldırıldı');
    noErr(t, 'DersÖlçer');

    console.log('7) not paylaşma (katalog dersine)');
    await t.go('#/paylas?ders=DENT115');
    ok(/Diş Morfolojisi/.test(t.text('[data-r=code-help]')), 'ders kodu tanındı: ' + t.text('[data-r=code-help]'));
    ok(!t.$('#main input[type=file]') && !t.$('[data-r=drop]') && !t.$('[data-r=thumbs]') && !/Fotoğraf/.test(t.text('[data-r=form]')), 'paylaş formunda fotoğraf yükleme yok');
    ok(/yalnızca Drive linki saklanır/.test(t.text('.page-intro')), 'tanıtım: yalnızca Drive linki');
    ok(/hocanın sayfasında da görünür/.test(t.text('[data-r=form]')), 'hoca seçimi açıklaması');
    ok(/El yazısı notlar için/.test(t.text('.aside')), 'yan kutu: el yazısı notları taramak');
    eq(t.$$('#main .typepick input[name=type]').map(x => x.value).join(), 'not,sinav', 'not türü iki: ders notu ve çıkmış sınav');
    ok(t.ev("noteType({ type: 'ozet' }).name === 'Ders notu' && noteType({ type: 'lab' }).k === 'not' && noteType({ type: 'sinav' }).name === 'Çıkmış sınav'"), 'eski türler ders notu sayılır');
    { const f = t.$('[data-r=form]'), all = [...f.querySelectorAll('*')], pos = sel => all.indexOf(f.querySelector(sel));
      ok(pos('#sh-title') > 0 && pos('#sh-title') < pos('#sh-drive') && pos('#sh-drive') < pos('#sh-desc') && pos('#sh-desc') < pos('[data-r=rules]'), 'form sırası: başlık, dosya, açıklama, onay');
      ok(t.$('[data-r=gpick]').hidden && !/Drive’dan seç/.test(t.text('.aside')), 'claude.ai sürümünde Drive seçici gizli');
      eq(t.text('label[for=sh-drive]'), 'Google Drive linki', 'link kutusunun etiketi'); }
    t.$('#sh-title').value = 'Vize özeti'; t.$('[data-r=rules]').checked = true;
    const nLinksiz = t.store.count('notes');
    t.$('[data-r=form]').dispatchEvent(new t.w.Event('submit', { cancelable: true, bubbles: true })); await t.wait(80);
    eq(t.text('[data-r=err]'), 'Notun Google Drive linkini ekle.', 'Drive linki zorunlu'); eq(t.store.count('notes'), nLinksiz, 'linksiz not kaydedilmedi');
    t.$('#sh-drive').value = 'https://drive.google.com/file/d/abc123/view';
    const n1 = t.store.count('notes');
    t.$('[data-r=form]').dispatchEvent(new t.w.Event('submit', { cancelable: true, bubbles: true })); await t.wait(250);
    eq(t.store.count('notes'), n1 + 1, 'not kaydedildi');
    { const nn = [...t.store.docs.entries()].filter(([p, d]) => p.startsWith('notes/') && d.title === 'Vize özeti').map(([, d]) => d)[0];
      ok(nn && nn.drive === 'https://drive.google.com/file/d/abc123/view' && Array.isArray(nn.photos) && !nn.photos.length, 'not yalnızca Drive linkiyle kaydedildi');
      ok(nn && JSON.stringify(nn.likes) === '{}' && JSON.stringify(nn.downs) === '{}', 'yeni notta oylar boş'); }
    ok(!t.store.docs.has('courses/DENT115'), 'not için ders kaydı gerekmedi');
    await t.go('#/ders/DENT115');
    ok(/Vize özeti/.test(t.text('[data-r=panel]')), 'not ders sayfasında');
    ok(/1 not/.test(t.text('[data-r=facts]')), 'sayaç: ' + t.text('[data-r=facts]'));
    eq(t.$$('[data-r=panel] [data-type]').map(x => x.dataset.type).join(), 'all,not,sinav', 'tür süzgeci: Tümü, Ders notu, Çıkmış sınav');
    { const nid = [...t.store.docs.keys()].find(p => p.startsWith('notes/') && t.store.get(p).title === 'Vize özeti').slice(6);
      await t.go('#/not/' + nid);
      ok(!!t.$('#main .dcard') && !t.$('#main iframe') && !t.$('#main img.dthumb'), 'claude.ai sürümünde önizleme yok, Drive kartı var');
      // kendi notuna oy verilmez
      t.$('#main [data-g=vote-up]').click(); await t.wait(80);
      ok(/Kendi notuna oy veremezsin/.test(t.text('#toasts')), 'kendi notuna ▲ verilemez: ' + t.text('#toasts'));
      eq(JSON.stringify(t.store.get('notes/' + nid).likes), '{}', 'kendi notunda oy yazılmadı');
      eq(t.text('#main .vote-hint'), 'Notunun puanı', 'kendi notunda ipucu'); }
    noErr(t, 'not paylaşma');

    console.log('7e) not oyları: yeşil ▲, kırmızı ▼, kubbe ve sıralama');
    { const me = t.ev('S.me'), au = t.store.get('notes/seed-n1').by, ups0 = t.store.get('notes/seed-n1').likes ? Object.values(t.store.get('notes/seed-n1').likes).filter(v => v === true).length : 0;
      const kb0 = JSON.parse(t.ev(`JSON.stringify(kubbeOf(${JSON.stringify(au)}))`));
      await t.go('#/not/seed-n1');
      ok(!!t.$('#main .vote.big .vup') && !!t.$('#main .vote.big .vdown') && !t.$('#main [data-g=like-note]'), 'not sayfasında ▲ ▼ oylama, beğeni düğmesi yok');
      eq(t.text('#main .vote .vnum'), String(ups0), 'başlangıç puanı: ' + ups0);
      eq(t.text('#main .vote-hint'), 'İşine yaradı mı?', 'oy ipucu');
      t.$('#main [data-g=vote-up]').click(); await t.wait(120);
      { const d = t.store.get('notes/seed-n1'); ok(d.likes[me] === true && !(d.downs && d.downs[me]), '▲ yazıldı'); }
      eq(t.text('#main .vote .vnum'), String(ups0 + 1), 'puan 1 arttı');
      ok(t.$('#main .vote').classList.contains('is-up') && t.$('#main .vup').getAttribute('aria-pressed') === 'true', '▲ basılı görünüyor');
      { const kb = JSON.parse(t.ev(`JSON.stringify(kubbeOf(${JSON.stringify(au)}))`)); eq(kb.all - kb0.all, 1, 'yazar ▲ başına 1 kubbe'); eq(kb.ups - kb0.ups, 1, 'yazarın ▲ sayısı'); }
      t.$('#main [data-g=vote-down]').click(); await t.wait(120);
      { const d = t.store.get('notes/seed-n1'); ok(d.downs[me] === true && d.likes[me] !== true, '▼ verince ▲ kalktı'); }
      eq(t.text('#main .vote .vnum'), String(ups0 - 1), 'puan ▼ ile düştü');
      ok(t.$('#main .vote').classList.contains('is-down'), '▼ basılı görünüyor');
      { const kb = JSON.parse(t.ev(`JSON.stringify(kubbeOf(${JSON.stringify(au)}))`)); eq(kb.all, kb0.all, '▼ kubbe düşürmez, ▲ kubbesi geri gitti'); }
      t.$('#main [data-g=vote-down]').click(); await t.wait(120);
      { const d = t.store.get('notes/seed-n1'); ok(d.downs[me] !== true && d.likes[me] !== true, 'aynı oya yeniden basınca geri alındı'); }
      await t.go('#/ders/CSE211');
      eq(t.$$('[data-r=panel] [data-r=sort] option').map(o => o.value).join(), 'hot,new,top', 'sıralama: öne çıkan, en yeni, en çok oy');
      eq(t.$('[data-r=panel] [data-r=sort]').value, 'hot', 'ders sayfasında öne çıkanlar önce');
      ok(!!t.$('[data-r=panel] .note-row .vote .vup') && !t.$('[data-r=panel] [data-g=like-note]'), 'not listesinde oylama');
      t.$('[data-r=panel] .note-row [data-g=vote-up]').click(); await t.wait(120);
      ok(t.$$('[data-r=panel] .note-row .vote.is-up').length === 1, 'listeden ▲ verildi'); }
    eq(t.ev("[{ id: 'a', at: Date.now(), likes: {}, downs: { x: true, y: true } }, { id: 'b', at: Date.now() - 864e5, likes: {}, downs: {} }].sort(byHot).map(n => n.id).join()"), 'b,a', '▼ alan yeni not, eski nötr notun altına iner');
    eq(t.ev("[{ id: 'd', at: Date.now(), likes: {}, downs: {} }, { id: 'c', at: Date.now() - 3 * 864e5, likes: { a: true, b: true, c: true, d: true }, downs: {} }].sort(byHot).map(n => n.id).join()"), 'c,d', '▲ alan not yeni nota karşı öne çıkar');
    eq(t.ev("[{ id: 'e', at: Date.now() - 400 * 864e5, likes: { a: true, b: true }, downs: {} }, { id: 'f', at: Date.now() - 864e5, likes: { a: true }, downs: {} }].sort(byHot).map(n => n.id).join()"), 'f,e', 'eski not zamanla söner');
    await t.go('#/');
    eq(t.$$('[data-ns]').map(b => b.dataset.ns + ':' + b.getAttribute('aria-pressed')).join(), 'hot:true,new:false', 'ana sayfada Revaçta seçili');
    ok(t.$$('[data-r=notes] .ncard').length > 0, 'Revaçta notları listelendi');
    t.$('[data-ns=new]').click(); await t.wait(60);
    eq(t.$$('[data-ns]').map(b => b.getAttribute('aria-pressed')).join(), 'false,true', 'Yeni seçildi');
    { const titles = t.$$('[data-r=notes] .ncard-title').map(x => x.textContent); ok(titles.includes('Vize özeti'), 'Yeni: son paylaşılan not listede: ' + titles.join(' | ')); }
    t.$('[data-ns=hot]').click(); await t.wait(60);
    noErr(t, 'not oyları');

    console.log('7b) yorum, not isteği ve hoca puanı (katalog dersinde)');
    await t.go('#/ders/DENT115?tab=yorumlar');
    { const ta = t.$('[data-r=panel] textarea'); ok(!!ta && !t.$('[data-r=panel] [data-r=form]').hidden, 'yorum formu açık');
      ta.value = 'Laboratuvarı yoğun ama keyifli.'; const c0 = t.store.count('comments');
      t.$('[data-r=panel] [data-r=form]').dispatchEvent(new t.w.Event('submit', { cancelable: true, bubbles: true })); await t.wait(200);
      eq(t.store.count('comments'), c0 + 1, 'yorum kaydedildi'); ok(/Laboratuvarı yoğun/.test(t.text('[data-r=panel] [data-r=list]')), 'yorum listede'); }
    await t.go('#/ders/DENT115');
    { const b = t.$('[data-g=req-new]'); ok(!!b, 'Not iste düğmesi var'); b.click(); await t.wait(60);
      const r0 = t.store.count('requests');
      t.$('.modal form').dispatchEvent(new t.w.Event('submit', { cancelable: true, bubbles: true })); await t.wait(200);
      eq(t.store.count('requests'), r0 + 1, 'not isteği kaydedildi'); }
    ok(!t.store.docs.has('courses/DENT115'), 'yorum ve istek için de ders kaydı gerekmedi');
    await t.go('#/istekler');
    ok(/DENT 115/.test(t.text('#main')), 'istekler sayfasında ders kodu');
    noErr(t, 'yorum ve istek');

    console.log('7c) HocaÖlçer formunda ders kodu');
    { const hid = JSON.parse(t.ev('JSON.stringify([...S.hocas.keys()])'))[0];
      await t.go('#/hoca/' + hid);
      t.$('[data-g=rate]').click(); await t.wait(60);
      t.$$('.modal .star-input').forEach(el => el.dispatchEvent(new t.w.MouseEvent('click', { bubbles: true, clientX: 10 })));
      const c0 = t.store.count('courses');
      t.$('#r-course').value = 'ZZZ 999';
      t.$('.modal form').dispatchEvent(new t.w.Event('submit', { cancelable: true, bubbles: true })); await t.wait(150);
      ok(/listede yok/.test(t.text('.modal .err')), 'olmayan ders kodu reddedildi: ' + t.text('.modal .err'));
      eq(t.store.count('courses'), c0, 'ders kaydı açılmadı');
      t.$('#r-course').value = 'DENT 115';
      t.$('.modal form').dispatchEvent(new t.w.Event('submit', { cancelable: true, bubbles: true })); await t.wait(200);
      ok(!t.$('.modal'), 'katalog dersiyle puan kaydedildi');
      eq(t.store.count('courses'), c0, 'katalog dersi için de kayıt açılmadı');
      eq(t.store.get('hocas/' + hid).ratings[t.me].c, 'DENT115', 'puan ders koduyla kaydedildi');
      await t.go('#/ders/DENT115?tab=hocalar');
      ok(t.$$('[data-r=panel] .row-link').some(a => a.getAttribute('href') === '#/hoca/' + hid), 'hoca ders sayfasında görünüyor');
      await t.go('#/paylas?ders=CSE211');
      ok(t.$$('#sh-hoca option').length >= 5, 'hoca seçenekleri doluyor'); }
    noErr(t, 'HocaÖlçer formu');

    console.log('7d) not paylaşırken hoca seçilince not hocanın sayfasına da düşer');
    { const hs = JSON.parse(t.ev('JSON.stringify([...S.hocas.keys()].filter(id => !hocasOfCourse("MATH131").has(id)))')), hid = hs[hs.length - 1];
      await t.go('#/paylas?ders=MATH131'); await t.wait(60);
      const hq = t.$('#sh-hoca-q'), hn = t.ev(`S.hocas.get(${JSON.stringify(hid)}).name`);
      hq.value = hn; hq.dispatchEvent(new t.w.Event('input', { bubbles: true })); await t.wait(40);
      const it = [...hq.closest('.cb-wrap').querySelectorAll('.cb-item')].find(li => li.textContent.includes(hn));
      ok(!!it, 'hoca adıyla aranınca çıkıyor: ' + hn);
      if (it) { it.dispatchEvent(new t.w.MouseEvent('mousedown', { bubbles: true })); it.dispatchEvent(new t.w.MouseEvent('click', { bubbles: true })); }
      await t.wait(40);
      eq(t.$('#sh-hoca').value, hid, 'aranan hoca seçildi');
      t.$('#sh-title').value = 'Türev özeti'; t.$('#sh-drive').value = 'https://drive.google.com/file/d/xyz789/view'; t.$('[data-r=rules]').checked = true;
      t.$('[data-r=form]').dispatchEvent(new t.w.Event('submit', { cancelable: true, bubbles: true })); await t.wait(250);
      const nid = (t.w.location.hash.match(/#\/not\/(.+)$/) || [])[1];
      ok(nid && t.store.get('notes/' + nid) && t.store.get('notes/' + nid).h === hid, 'not hocayla kaydedildi');
      await t.go('#/hoca/' + hid + '?tab=notlar');
      ok(/Türev özeti/.test(t.text('[data-r=panel]')), 'not hocanın Notlar sekmesinde');
      await t.go('#/hoca/' + hid + '?tab=dersler');
      ok(/MATH 131/.test(t.text('[data-r=panel]')), 'ders hocanın Verdiği dersler sekmesinde');
      await t.go('#/ders/MATH131?tab=hocalar');
      ok(t.$$('[data-r=panel] .row-link').some(a => a.getAttribute('href') === '#/hoca/' + hid), 'hoca dersin Hocalar sekmesinde');
      await t.go('#/ders/MATH131');
      ok(/Türev özeti/.test(t.text('[data-r=panel]')), 'not ders sayfasında'); }
    noErr(t, 'not ve hoca bağlantısı');

    console.log('8) arama');
    const r1 = JSON.parse(t.ev('JSON.stringify(searchAll("dent 115").slice(0,2))'));
    eq(r1[0].id, 'DENT115', 'kodla tam eşleşme'); eq(r1[0].score, 100, 'puan 100');
    const r2 = JSON.parse(t.ev('JSON.stringify(searchAll("anayasa hukuku").map(x => x.id))'));
    ok(r2.includes('LAW112'), 'adla arama: ' + r2.slice(0, 5));
    await t.go('#/ara?q=kalk%C3%BCl%C3%BCs');
    ok(t.$$('[data-r=res] .row-link').length >= 3, 'arama sayfası sonuç veriyor');
    const t0 = Date.now(); for (let i = 0; i < 20; i++) t.ev('searchAll("muhendislik ' + i + '")'); const dt = (Date.now() - t0) / 20;
    ok(dt < 25, 'arama hızı: ' + dt.toFixed(1) + ' ms');
    noErr(t, 'arama');

    console.log('9) diğer sayfalar');
    for (const h of ['#/', '#/hocaolcer', '#/kubbe', '#/profil', '#/katkilarim', '#/istekler', '#/hakkinda', '#/dersler?b=__mine', '#/not/yok', '#/moderasyon']) { await t.go(h); ok((t.text('#main') || '').length > 40, h + ' boş değil'); }
    await t.go('#/');
    ok(new RegExp((N_KATALOG + 1) + '</b> ders').test(t.$('[data-r=stats]').innerHTML), 'ana sayfa sayacı: ' + t.text('[data-r=stats]'));
    ok(!t.$('[data-g=whatsnew]') && !/Yenilikler/.test(t.text('footer.foot')), 'Yenilikler bölümü kaldırıldı');
    eq(t.$('footer.foot a[href="/gizlilik"]') && t.$('footer.foot a[href="/gizlilik"]').textContent, 'Gizlilik', 'alt menüde Gizlilik sayfası');
    noErr(t, 'diğer sayfalar');
  }

  console.log('10) eski ders kaydındaki oylar');
  {
    const seed = {}; seed['courses/CSE211'] = Object.assign(clone(SEED['courses/CSE211']), { zorluk: { baskasi: { z: 5, y: 5, at: 1 }, bozuk: null } });
    const t = await asStudent(seed);
    eq(t.ev('zorStats("CSE211").n'), 1, 'eski oy sayılıyor');
    t.store.put('users/' + t.me, Object.assign(student(), { zor: { CSE211: { z: 3, y: 1, at: 2 } } })); await t.wait(80);
    eq(t.ev('zorStats("CSE211").n'), 2, 'yeni oy eklendi'); eq(t.ev('zorStats("CSE211").zor'), 2, 'ortalama puan: derece 5 ve 3 → 6 − 4 = 2');
    t.store.put('users/baskasi', Object.assign(student(), { username: 'baskasi', zor: { CSE211: null } })); await t.wait(80);
    eq(t.ev('zorStats("CSE211").n'), 1, 'hesap kaydındaki boş oy eskisini siliyor');
    noErr(t, 'eski oylar');
  }

  console.log('11) yönetici');
  {
    const t = await boot({ html: HTML, seed: clone(SEED), owner: true, userId: 'owner-x' });
    await t.wait(200);
    ok(t.ev('S.owner') === true && t.ev('gateState()') === 'open', 'yönetici hesabı hazır');
    await t.go('#/ders/DENT115');
    ok(!t.$('[data-r=edit]').hidden, 'yöneticiye Düzenle açık');
    t.$('[data-g=edit-course]').click(); await t.wait(60);
    t.$('#ec-name').value = 'Diş Morfolojisi (düzeltildi)';
    t.$('.modal form').dispatchEvent(new t.w.Event('submit', { cancelable: true, bubbles: true })); await t.wait(150);
    const d = t.store.get('courses/DENT115');
    ok(d && d.edAt && d.code === 'DENT 115' && d.ects === CATJ.dersler.DENT115.akts, 'ders kaydı oluşturuldu: ' + JSON.stringify(d));
    eq(t.text('[data-r=name]'), 'Diş Morfolojisi (düzeltildi)', 'düzeltilen ad görünüyor');
    t.$('[data-g=edit-course]').click(); await t.wait(60);
    t.$('#ec-name').value = 'İkinci düzeltme';
    const n0 = t.store.log.length;
    t.$('.modal form').dispatchEvent(new t.w.Event('submit', { cancelable: true, bubbles: true })); await t.wait(150);
    eq(t.store.log[n0].op, 'update', 'ikinci düzenleme güncelleme'); eq(t.text('[data-r=name]'), 'İkinci düzeltme', 'ikinci ad');
    await t.go('#/ders/CSE211');
    t.$('[data-g=edit-course]').click(); await t.wait(60);
    t.$('#ec-name').value = 'Veri Yapıları ve Algoritmalar';
    t.$('.modal form').dispatchEvent(new t.w.Event('submit', { cancelable: true, bubbles: true })); await t.wait(150);
    eq(t.text('[data-r=name]'), 'Veri Yapıları ve Algoritmalar', 'var olan kayıtta düzenleme');
    await t.go('#/moderasyon');
    ok(/171 ders kaydı/.test(t.text('#main')) && new RegExp(N_KATALOG + ' ders, 72 bölüm planı').test(t.text('#main')), 'kullanım satırı: ' + (t.text('.help.mb') || ''));
    ok(!t.$('[data-r=tests]'), 'moderasyonda test listesi yok');
    await t.go('#/dersler');
    ok(!t.$('[data-g=add-course]').closest('[data-owner]').hidden, 'Ders ekle yöneticide açık');
    t.$('[data-g=add-course]').click(); await t.wait(60);
    t.$('#ac-code').value = 'DENT 115'; t.$('#ac-name').value = 'x y';
    t.$('.modal form').dispatchEvent(new t.w.Event('submit', { cancelable: true, bubbles: true })); await t.wait(120);
    ok(/zaten kayıtlı/.test(t.text('#toasts')), 'katalogdaki ders yeniden eklenemiyor');
    noErr(t, 'yönetici');
  }

  console.log('12) hesapsız ziyaretçi ve veritabanısız açılış');
  {
    const t = await boot({ html: HTML, seed: clone(SEED) });
    await t.go('#/dersler');
    eq(t.ev('gateState()'), 'gate', 'hesapsız: kapı');
    ok(!t.$('[data-g=add-course]') || t.$('[data-g=add-course]').closest('[data-owner]').hidden, 'Ders ekle öğrenciye kapalı');
    noErr(t, 'hesapsız');
    const t2 = await boot({ html: HTML, noDb: true });
    await t2.go('#/dersler'); await t2.go('#/ders/CSE211');
    ok(/Veri bağlantısı/.test(t2.text('#banner')), 'veritabanısız uyarı');
    noErr(t2, 'veritabanısız');
  }

  console.log('13) seçmeli havuzları');
  {
    const t = await asStudent();
    // fakülte sitesinden seçmeli havuzu işlenen bölümler (catalog.json: havuz_onek dolu)
    const HAVUZLU = Object.keys(CATJ.planlar).filter(s => CATJ.planlar[s].havuz_onek);
    eq(HAVUZLU.length, BEK.havuzluBolum, 'seçmeli havuzu işlenen bölüm sayısı');
    eq([...new Set(HAVUZLU.map(s => CATJ.planlar[s].fakulte))].sort().join(' | '), BEK.havuzluFak, 'seçmeli havuzu işlenen fakülteler');
    eq(t.ev('CAT.pools.length'), BEK.havuz, 'havuz sayısı');
    eq(t.ev('CAT.pools.every(p => p.length && p.every(id => CAT.courses.has(id)))'), true, 'havuzdaki her ders katalogda');
    eq(t.ev('[...CAT.courses.entries()].filter(([, c]) => c.kr == null).map(([k]) => k).sort().join()'), BEK.kredisiz, 'kredisi bilinmeyen dersler');
    let withPool = 0, mapped = 0;
    for (const slug of Object.keys(CATJ.planlar)) {
      const P = CATJ.planlar[slug], haklar = Object.values(P.donemler).flatMap(d => d.secmeli);
      const wantPool = haklar.filter(e => e.length > 3 && e[3] != null).length;
      await t.go('#/dersler?b=' + slug);
      eq(elRows(t, '.has-pool').length, wantPool, slug + ': havuzlu seçmeli sayısı');
      eq(HAVUZLU.includes(slug), wantPool > 0, slug + ': yalnız fakülte sitesi işlenen bölümlerde havuz var');
      const foot = t.text('[data-r=list] > p.fine');
      ok(wantPool ? /ders listeleri fakülte sitesinden/.test(foot) : !/fakülte sitesinden/.test(foot), slug + ': dipnot');
      withPool += wantPool; mapped += haklar.filter(e => e.length > 3 && e[5]).length;
    }
    eq(withPool, BEK.havuzluHak, 'havuzlu hak toplamı'); eq(mapped, BEK.eslenen, 'fakülte sitesiyle eşlenen hak');
    noErr(t, 'havuzlu planlar');

    await t.go('#/dersler?b=bilgisayar-muhendisligi');
    const serbest = elRows(t).filter(c => /Serbest/.test(c.textContent));
    eq(serbest.length > 0 && serbest.every(c => c.classList.contains('has-link') && !c.classList.contains('has-pool')), true, 'Serbest seçmeli: havuz yok, fakülte listesine bağlı');
    let m = await elOpen(t, serbest[0]);
    ok(m && /Serbest seçmeliyi başka bölümlerin derslerinden de seçebilirsin/.test(m.textContent), 'serbest paneli: ' + (m && m.textContent.slice(0, 90)));
    ok(m.querySelector('[data-r=el-q][data-all]'), 'serbest panelinde tüm derslerde arama');
    ok(/^https:\/\/mdbf\.yeditepe\.edu\.tr\/tr\/secmeli-dersler\?secmeliID=\d+$/.test(m.querySelector('.el-src a').getAttribute('href')) && m.querySelector('.el-src a').getAttribute('target') === '_blank', 'serbest: fakülte sayfası bağlantısı');
    await elClose(t, m);
    ok(!t.$('[data-r=list] .el-row.open'), 'serbest paneli kapandı');
    m = await elOpen(t, elRows(t)[0]);
    ok(m, 'seçmeli listesi açıldı');
    ok(/^SeçmeliKısıtlı seçmeli 1/.test(m.closest('.el-row').querySelector('.el-tog').textContent), 'ilk seçmeli: Kısıtlı seçmeli 1');
    ok(/1\. sınıf Güz/.test(m.closest('section.grp').querySelector('.sem-h').textContent), 'dönem başlığı 1. sınıf Güz');
    eq([...m.querySelectorAll('.el-opts .code')].map(e => e.textContent).join(','), 'AFE 131,AFEA 111,ES 176', 'listedeki dersler kod sırasıyla');
    eq([...m.querySelectorAll('.el-opts .ects')].map(e => e.textContent).join('|'), '3 kredi|3 kredi|3 kredi', 'listede kredi');
    eq(m.querySelector('.el-src a').getAttribute('href'), 'https://mdbf.yeditepe.edu.tr/tr/secmeli-dersler?secmeliID=63270', 'fakülte sayfası bağlantısı');
    eq(m.querySelector('.el-src a').getAttribute('target'), '_blank', 'yeni sekmede');
    ok(/^3 ders\./.test(m.querySelector('.el-src').textContent), 'ders sayısı: ' + m.querySelector('.el-src').textContent);
    ok(!m.querySelector('[data-r=el-q]'), 'kısa listede arama kutusu yok');
    await elClose(t, m);
    ok(!t.$('[data-r=list] .el-row.open'), 'liste kapandı');

    const k3 = elRows(t, '.has-pool').find(c => /Kısıtlı seçmeli 3/.test(c.textContent));
    ok(/25 ders/.test(k3.textContent), 'Kısıtlı 3: 25 ders');
    m = await elOpen(t, k3);
    eq(m.querySelectorAll('.el-opts > li').length, 25, '25 satır');
    ok(/4\. sınıf Güz/.test(m.closest('section.grp').querySelector('.sem-h').textContent), '7. dönem = 4. sınıf Güz');
    let inp = m.querySelector('[data-r=el-q]');
    ok(inp, 'uzun listede arama kutusu');
    ok(t.w.document.activeElement !== inp, 'açılışta klavye açılmasın: odak arama kutusunda değil');
    const type = async v => { inp.value = v; inp.dispatchEvent(new t.w.Event('input', { bubbles: true })); await t.wait(20); };
    const vis = () => [...m.querySelectorAll('.el-opts > li')].filter(li => !li.hidden).map(li => li.querySelector('.code').textContent);
    await type('yapay'); eq(vis().join(','), 'CSE 462,MTH 424', 'ada göre arama');
    await type('cse 44'); eq(vis().join(','), 'CSE 445,CSE 447', 'koda göre arama (boşluklu)');
    await type('GÖRÜ'); eq(vis().join(','), 'CSE 424,CSE 487,EE 470,MTH 423', 'büyük harf ve Türkçe karakter');
    await type('zzz'); eq(vis().length, 0, 'eşleşme yok'); eq(m.querySelector('.el-none').hidden, false, 'eşleşme yok yazısı');
    await type(''); eq(vis().length, 25, 'temizleyince hepsi');
    await type('yapay'); t.ev('S.version++, changed()'); await t.wait(80);
    m = t.$(`[data-r=list] .el-row[data-k="${k3.dataset.k}"] .el-panel`); inp = m.querySelector('[data-r=el-q]');
    eq(inp.value, 'yapay', 'sayfa yeniden çizilince arama korunur');
    eq(vis().join(','), 'CSE 462,MTH 424', 'yeniden çizimde süzme korunur');
    ok([...m.querySelectorAll('.el-opts a.el-go')].some(a => a.getAttribute('href') === '#/ders/CSE462'), 'CSE462 ders sayfası bağlantısı');
    await type(''); await elClose(t, m);
    await t.go('#/ders/CSE462');
    eq(t.text('[data-r=name]'), 'Yapay Zekaya Giriş', 'seçmeli dersin sayfası');
    eq(t.text('[data-r=dept]'), 'Mühendislik ve Doğa Bilimleri Fakültesi, 3 kredi, 5 AKTS', 'seçmeli dersin kredisi');
    eq(planList(t, 'CSE462').length, 0, 'hiçbir planda zorunlu değil');
    { const e = elsList(t, 'CSE462'); eq(e.length, 7, '7 bölümün seçmeli listesinde: ' + e); eq(e[0], 'Bilgisayar Mühendisliği', 'kendi bölümüm başta'); }
    ok(noPlanChips(t), 'seçmeli dersin sayfasında da rozet yok');
    await t.go('#/ders/CSE471');
    ok(planList(t, 'CSE471').includes('Bilgisayar Mühendisliği7. dönem'), 'zorunlu olduğu bölüm: ' + planList(t, 'CSE471'));
    eq(elsList(t, 'CSE471').join(','), 'Elektrik-Elektronik Mühendisliği', 'başka bölümde seçmeli');
    await t.go('#/ders/CSE211');
    eq(elsList(t, 'CSE211').length, 0, 'seçmeli olmayan ders');
    await t.go('#/ders/HRM112');
    eq(t.text('[data-r=dept]'), '3 kredi, 9 AKTS', 'fakültesi bilinmeyen seçmeli: ' + t.text('[data-r=dept]'));
    await t.go('#/ders/ES176');
    eq(t.text('[data-r=name]'), 'Araştırma ve Teknik Yazım', 'eski veritabanı kaydı katalog adıyla');
    ok(/3 kredi, 5 AKTS/.test(t.text('[data-r=dept]')), 'eski kayıt artık kredili: ' + t.text('[data-r=dept]'));
    noErr(t, 'havuz penceresi ve ders sayfası');

    await t.go('#/dersler?b=makine-muhendisligi');
    const f = t.$('[data-r=f]');
    f.value = 'robot'; f.dispatchEvent(new t.w.Event('input', { bubbles: true })); await t.wait(60);
    const secs = t.$$('[data-r=list] section.grp');
    const last = secs[secs.length - 1];
    ok(/^SSeçmeli dersler2 ders/.test(last.querySelector('.sem-h').textContent), 'aramada seçmeli bölümü: ' + last.querySelector('.sem-h').textContent);
    eq([...last.querySelectorAll('.code')].map(e => e.textContent).join(','), 'ME 453,ME 459', 'seçmelilerde eşleşenler');
    eq(last.querySelector('.row-sub').textContent, 'Kısıtlı seçmeli 6, 7, 8, 9, 10', 'hangi haklardan seçildiği');
    ok(!t.$('[data-r=list] .el-row'), 'ararken seçmeli satırları gizli');
    f.value = 'qqqq'; f.dispatchEvent(new t.w.Event('input', { bubbles: true })); await t.wait(60);
    ok(/Eşleşen ders yok/.test(t.text('[data-r=list]')), 'hiçbir şey eşleşmezse boş durum');
    await t.go('#/dersler?b=hukuk');
    const fh = t.$('[data-r=f]'); fh.value = 'hukuk'; fh.dispatchEvent(new t.w.Event('input', { bubbles: true })); await t.wait(60);
    ok(t.$$('[data-r=list] .sem-h').some(h => /Seçmeli dersler/.test(h.textContent)), 'Hukuk: aramada seçmeli bölümü (havuz eklendi)');
    await t.go('#/dersler?b=uluslararasi-ulastirma-sistemleri');
    const fu = t.$('[data-r=f]'); fu.value = 'lojistik'; fu.dispatchEvent(new t.w.Event('input', { bubbles: true })); await t.wait(60);
    ok(!t.$$('[data-r=list] .sem-h').some(h => /Seçmeli dersler/.test(h.textContent)), 'havuzu olmayan bölümde seçmeli bölümü çıkmaz');

    await t.go('#/dersler?b=elektrik-elektronik-muhendisligi');
    const s2 = t.$$('[data-r=list] section.grp')[1];
    ok([...s2.querySelectorAll('.el-row .el-tog')].some(e => /Zorunlu seçmeli 21 ders arasından seç2 kredi/.test(e.textContent)), 'Elektrik-Elektronik 2. dönem: fakülte sayfasından eklenen seçmeli -> ' + [...s2.querySelectorAll('.el-row .el-tog')].map(e => e.textContent).join(' / '));
    eq(CATJ.planlar['elektrik-elektronik-muhendisligi'].akts, 240, 'Elektrik-Elektronik toplam 240 AKTS');
    await t.go('#/dersler?b=fizik');
    eq(t.$$('[data-r=list] section.grp')[1].querySelectorAll('.el-row').length, 4, 'Fizik 2. dönem: boş "Zorunlu" satırı seçmeli sayılmadı');

    await t.go('#/dersler');
    t.$('[data-r=bol]').value = ''; t.$('[data-r=bol]').dispatchEvent(new t.w.Event('change')); await t.wait(60);
    const fa = t.$('[data-r=f]'); fa.value = 'cse445'; fa.dispatchEvent(new t.w.Event('input', { bubbles: true })); await t.wait(60);
    eq(t.$$('[data-r=list] .row-link').length, 1, 'Tüm derslerde seçmeli ders bulunur');
    ok(/Yazılım Testi/.test(t.text('[data-r=list] .row-title')) && /3 kredi/.test(t.text('[data-r=list] .ects')), 'adı ve kredisi');
    eq(t.ev('searchAll("yapay zekaya").some(x => x.kind === "course" && x.id === "CSE462")'), true, 'genel arama seçmeli dersi bulur');
    noErr(t, 'aramalar');

    await t.go('#/hoca/' + [...t.store.docs.keys()].find(k => k.startsWith('hocas/')).slice(6));
    const rb = t.$('[data-g=rate]');
    if (rb) {
      rb.click(); await t.wait(80);
      const rm = t.$('.modal'), ci = rm && rm.querySelector('input[id*=code], input[list], input[placeholder*="CSE"]');
      ok(rm, 'puan penceresi');
      if (rm) rm.querySelector('[data-close]').click();
    }
    eq(t.ev('hocaOptions("CSE462").length >= 0'), true, 'seçmeli derste hoca önerileri çalışıyor');
    noErr(t, 'hoca');

    // İnsan ve Toplum Bilimleri: havuzlar itbf sitesinden
    await t.go('#/dersler?b=psikoloji');
    const b1 = elRows(t, '.has-pool').find(c => /Bölüm seçmelisi 1/.test(c.textContent));
    ok(b1 && /30 ders/.test(b1.textContent), 'Psikoloji Bölüm seçmelisi 1: 30 ders');
        m = await elOpen(t, b1);
    eq(m.querySelector('.el-src a').getAttribute('href'), 'https://itbf.yeditepe.edu.tr/tr/secmeli-dersler?secmeliID=61985', 'itbf fakülte sayfası bağlantısı');
    ok(m.querySelector('[data-r=el-q]'), 'Psikoloji havuzunda süzme kutusu');
    eq(m.querySelectorAll('.el-opts > li').length, 30, 'Psikoloji havuzu 30 satır');
    eq([...m.querySelectorAll('.el-opts .ects')].every(e => e.textContent === '3 kredi'), true, 'Psikoloji havuzunda her ders 3 kredi');
    await elClose(t, m);
    await t.go('#/ders/PSY465');
    eq(t.text('[data-r=name]'), 'Psikolojik Travma', 'itbf seçmeli dersinin sayfası');
    eq(t.text('[data-r=dept]'), 'İnsan ve Toplum Bilimleri Fakültesi, 3 kredi, 7 AKTS', 'itbf seçmeli dersinin kredisi');
    eq(elsList(t, 'PSY465').join(','), 'Psikoloji', 'itbf seçmeli dersi hangi bölümde');
    await t.go('#/ders/AFYA102');
    eq(t.text('[data-r=name]'), 'Yabancılar İçin Türk Dili ve Kültürü II', 'ayrıntı sayfası açılmayan dersin adı havuzdan');
    eq(t.text('[data-r=dept]'), 'Ortak ders', 'ayrıntı sayfası açılmayan derste kredi yazılmaz');
    await t.go('#/ders/TKL201');
    eq(t.text('[data-r=dept]'), 'Ortak ders, 2 kredi, 2 AKTS', 'Türk Dili ortak ders');
    await t.go('#/ders/SOC156');
    eq(t.text('[data-r=name]'), "Türkiye'de Sosyal Sorunlar", 'kesme işareti katalogdaki gibi düz');
    await t.go('#/ders/AFGA101');
    eq(t.text('[data-r=dept]'), 'Ortak ders, 3 kredi, 5 AKTS', 'yabancı dil dersi ortak');
    ok(/^Çeviribilimi,İngiliz Dili ve Edebiyatı/.test(elsList(t, 'AFGA101').join(',')), 'dil dersi hangi bölümlerin listesinde: ' + elsList(t, 'AFGA101'));
    await t.go('#/dersler?b=felsefe');
    eq(elRows(t, '.has-link').length, 17, 'Felsefe: 17 serbest hak fakülte listesine bağlı');
    await t.go('#/dersler?b=ceviribilimi');
    const yd = elRows(t, '.has-pool').find(c => /Yabancı dil seçmelisi 1/.test(c.textContent));
    ok(yd && /37 ders/.test(yd.textContent), 'Çeviribilimi yabancı dil havuzu 37 ders: ' + (yd && yd.textContent));
    noErr(t, 'itbf havuzları');

    // İşletme: iki bölümde (Lojistik, E-Ticaret) haklar iki kaynakta farklı dönemde; AKTS dönemi esas, numara sırası korunur
    await t.go('#/dersler?b=lojistik-yonetimi');
    const lj = t.$$('[data-r=list] section.grp').map(sec => [...sec.querySelectorAll('.el-row .row-title')].map(c => c.textContent));
    eq(lj[3].join(' | '), 'Alan seçmelisi 1 | Serbest seçmeli 1 | Serbest seçmeli 2 | Yabancı dil seçmelisi 3', 'Lojistik 4. dönem hakları');
    eq(lj[6].join(' | '), 'Alan seçmelisi 6 | Alan seçmelisi 7 | Serbest seçmeli 3', 'Lojistik 7. dönem hakları');
    eq(CATJ.planlar['lojistik-yonetimi'].kredi, 130, 'Lojistik toplam kredi (hak eklenmedi)');
    await t.go('#/dersler?b=elektronik-ticaret-ve-yonetimi');
    eq(t.$$('[data-r=list] section.grp')[2].querySelectorAll('.el-row').length, 0, 'E-Ticaret 3. dönem: boş "Zorunlu" satırı seçmeli sayılmadı');
    eq(CATJ.planlar['elektronik-ticaret-ve-yonetimi'].akts, 240, 'E-Ticaret toplam 240 AKTS');
    await t.go('#/ders/AGR402');
    eq(t.text('[data-r=dept]'), 'İşletme Fakültesi, 4 kredi, 7 AKTS', '4 kredilik seçmeli');
    eq(elsList(t, 'AGR402').join(','), 'Tarım Ticareti ve İşletmeciliği', 'AGR402 hangi bölümde');
    noErr(t, 'işletme havuzları');

    // Eğitim: tamamlayıcı seçmeli (261 derslik genel liste) serbest gibi fakülte sayfasına bağlanır; boş "Zorunlu" satırları hak değildir
    await t.go('#/dersler?b=okul-oncesi-ogretmenligi');
    const oo = elRows(t);
    eq(oo.filter(c => /Tamamlayıcı/.test(c.textContent)).length, 4, 'Okul Öncesi: 4 tamamlayıcı hak');
    eq(oo.filter(c => /Tamamlayıcı/.test(c.textContent)).every(c => c.classList.contains('has-link')), true, 'tamamlayıcı seçmeliler fakülte listesine bağlı');
    ok(oo.some(c => /Bölüm seçmelisi 1/.test(c.textContent) && /26 ders/.test(c.textContent)), 'Okul Öncesi Bölüm seçmelisi 1: 26 ders');
    await t.go('#/dersler?b=bilgisayar-ve-ogretim-teknolojileri-ogretmenligi');
    eq(t.$$('[data-r=list] section.grp')[0].querySelectorAll('.el-row').length, 0, 'BÖTE 1. dönem: boş "Zorunlu" satırları seçmeli sayılmadı');
    const ba = elRows(t, '.has-pool').find(c => /Alan seçmelisi 1/.test(c.textContent));
    ok(ba && /2 kredi/.test(ba.textContent) && /1 ders/.test(ba.textContent), 'BÖTE Alan seçmelisi 1: ' + (ba && ba.textContent));
        m = await elOpen(t, ba);
    eq([...m.querySelectorAll('.el-opts .code')].map(e => e.textContent).join(), 'CEIT 334', 'BÖTE alan havuzu');
    ok(/Ders planında bu seçmeli 2 kredi görünüyor, listedeki ders 3 kredi/.test(m.querySelector('.pool-warn').textContent), 'kredi uyuşmazlığı notu: ' + m.querySelector('.pool-warn').textContent);
    await elClose(t, m);
    await t.go('#/dersler?b=psikoloji');
    m = await elOpen(t, elRows(t, '.has-pool').find(c => /Bölüm seçmelisi 1/.test(c.textContent)));
    ok(!m.querySelector('.pool-warn'), 'kredisi uyan listede not yok');
    await elClose(t, m);
    await t.go('#/ders/ED113');
    eq(t.text('[data-r=dept]'), 'Eğitim Fakültesi, 2 kredi, 3 AKTS', '2 kredilik seçmeli');
    await t.go('#/ders/SPED228');
    eq(t.text('[data-r=name]'), "OSB'de Davranış Yönetimi", 'kesme işareti düz (SPED228)');
    noErr(t, 'eğitim havuzları');

    // Sanat ve Tasarım: havuzlar stf sitesinden; "Seçili Bölüm Tüm Dersleri" yer tutucu satırı ders değildir
    await t.go('#/dersler?b=tiyatro');
    const ty = elRows(t, '.has-pool');
    eq(ty.length, 14, 'Tiyatro: 14 havuzlu hak');
    const a12 = ty.find(c => c.querySelector('.row-title').textContent === 'Alan seçmelisi 12');
    ok(a12 && /21 ders/.test(a12.textContent), 'Tiyatro Alan seçmelisi 12: 21 ders (yer tutucu satır sayılmadı): ' + (a12 && a12.textContent));
        m = await elOpen(t, a12);
    eq(m.querySelector('.el-src a').getAttribute('href'), 'https://stf.yeditepe.edu.tr/tr/secmeli-dersler?secmeliID=112982', 'stf fakülte sayfası bağlantısı');
    eq(m.querySelectorAll('.el-opts > li').length, 21, 'Tiyatro alan havuzu 21 satır');
    ok(![...m.querySelectorAll('.el-opts .code')].some(e => /ELEC/.test(e.textContent)), 'yer tutucu satır listede yok');
    ok(!m.querySelector('.pool-warn'), 'Tiyatro alan havuzunda kredi notu yok');
    await elClose(t, m);
    await t.go('#/dersler?b=gastronomi-ve-mutfak-sanatlari');
    const gs = elRows(t, '.has-pool').find(c => /Sanat seçmelisi 1/.test(c.textContent));
    ok(gs && /24 ders/.test(gs.textContent), 'Gastronomi Sanat seçmelisi 1: 24 ders: ' + (gs && gs.textContent));
    await t.go('#/dersler?b=tekstil-ve-moda-tasarimi');
    eq(elRows(t, '.has-pool').length, 11, 'Tekstil: 11 havuzlu hak (hakları İngilizce sayfadan okundu)');
    eq(elRows(t, '.has-link').length, 3, 'Tekstil: 3 serbest hak fakülte listesine bağlı');
    await t.go('#/dersler?b=dijital-oyun-tasarimi');
    const d2 = t.$$('[data-r=list] section.grp')[1];
    ok([...d2.querySelectorAll('.el-row .el-tog')].some(e => /Zorunlu seçmeli 21 ders arasından seç2 kredi/.test(e.textContent)), 'Dijital Oyun 2. dönem: fakülte sayfasından eklenen seçmeli');
    eq(CATJ.planlar['dijital-oyun-tasarimi'].akts, 240, 'Dijital Oyun toplam 240 AKTS');
    await t.go('#/ders/GRA102');
    eq(t.text('[data-r=name]'), 'Bilgisayarda Fotoğraf İşleme Teknikleri (Adobe Photoshop)', 'iki kaynakta aynı ad (parantez boşluğu)');
    ok(elsList(t, 'GRA102').length > 0, 'GRA102 seçmeli listesinde: ' + elsList(t, 'GRA102'));
    await t.go('#/ders/ART255');
    eq(t.text('[data-r=name]'), 'Yeni Medya Sanatı, Yapay Zeka ve NFT', 'virgülden sonra boşluk');
    eq(t.text('[data-r=dept]'), 'Sanat ve Tasarım Fakültesi, 3 kredi, 5 AKTS', 'stf seçmeli dersinin kredisi');
    eq(elsList(t, 'ART255').join(','), 'Sanat ve Kültür Yönetimi', 'ART255 hangi bölümde');
    await t.go('#/ders/CULA376');
    eq(t.text('[data-r=dept]'), 'Sanat ve Tasarım Fakültesi, 4 kredi, 6 AKTS', '4 kredilik stf seçmelisi');
    await t.go('#/ders/PLA241');
    eq(t.text('[data-r=name]'), 'Özgün Baskı Resim / Serigrafi', 'bölü işareti aralığı');
    await t.go('#/ders/AFYA201');
    eq(t.text('[data-r=dept]'), 'Ortak ders, 3 kredi, 5 AKTS', 'AFYA201 ortak ders');
    await t.go('#/ders/ATD415');
    eq(t.text('[data-r=name]'), "MetroVersity- Metro Dünyası'nın Kampüsü", 'yayımlanmış ad değişmedi (ATD415)');
    noErr(t, 'sanat ve tasarım havuzları');

    // İletişim: 10 AKTS'lik uygulama hakları küçük havuzlara, staj hakkı (planda 0 kredi) COMM300'e bağlı; COMM300'ün sayfasında kredi yazmıyor
    await t.go('#/dersler?b=halkla-iliskiler-ve-tanitim');
    const hi = elRows(t, '.has-pool');
    const a2 = hi.find(c => /Alan seçmelisi 2/.test(c.textContent));
    ok(a2 && /76 ders/.test(a2.textContent), 'HİT Alan seçmelisi 2: 76 ders: ' + (a2 && a2.textContent));
    const a6 = hi.find(c => /Alan seçmelisi 6/.test(c.textContent));
    ok(a6 && /5 ders/.test(a6.textContent), 'HİT Alan seçmelisi 6 (10 AKTS): 5 ders: ' + (a6 && a6.textContent));
        m = await elOpen(t, a2);
    eq(m.querySelectorAll('.el-opts > li').length, 76, 'HİT alan havuzu 76 satır');
    eq(m.querySelector('.el-src a').getAttribute('href'), 'https://iletisimfakultesi.yeditepe.edu.tr/tr/secmeli-dersler?secmeliID=62899', 'iletişim fakülte sayfası bağlantısı');
    eq([...m.querySelectorAll('.el-opts .ects')].every(e => e.textContent === '3 kredi'), true, 'HİT alan havuzunda her ders 3 kredi');
    await elClose(t, m);
    await t.go('#/dersler?b=gorsel-iletisim-tasarimi');
    const stj = elRows(t, '.has-pool').find(c => /Alan seçmelisi 5/.test(c.textContent));
    ok(stj && /0 kredi/.test(stj.textContent) && /1 ders/.test(stj.textContent), 'Görsel İletişim staj hakkı: ' + (stj && stj.textContent));
        m = await elOpen(t, stj);
    eq([...m.querySelectorAll('.el-opts .code')].map(e => e.textContent).join(), 'COMM 300', 'staj havuzu');
    ok(!m.querySelector('.pool-warn'), 'kredisi yazmayan staj dersinde kredi notu yok');
    eq(m.querySelector('.el-opts .ects').textContent, '10 AKTS', 'kredisi bilinmeyen derste AKTS yazar');
    await elClose(t, m);
    await t.go('#/ders/COMM300');
    eq(t.text('[data-r=name]'), 'Staj', 'COMM300 adı');
    eq(t.text('[data-r=dept]'), 'İletişim Fakültesi, 10 AKTS', 'kredisi sayfada yazmayan ders: yalnız AKTS');
    await t.go('#/ders/RTC351');
    eq(t.text('[data-r=dept]'), 'İletişim Fakültesi, 3 kredi, 10 AKTS', '10 AKTS değerinde seçmeli');
    await t.go('#/ders/VCD111');
    eq(t.text('[data-r=dept]'), 'İletişim Fakültesi, 3 kredi, 6 AKTS', 'plan dersi: kredisi AKTS planından (ayrıntı sayfası okunmadı)');
    ok(elsList(t, 'VCD111').length > 0, 'plan dersi başka bölümün seçmeli listesinde: ' + elsList(t, 'VCD111'));
    eq(CATJ.planlar['gazetecilik'].akts, 230, 'Gazetecilik planı iki kaynakta da 230 AKTS');
    noErr(t, 'iletişim havuzları');

    // Bilgisayar ve Bilişim: Yazılım Geliştirme'nin hakları İngilizce sayfadan okundu; havuz bağlantısı Türkçe sayfaya gider
    await t.go('#/dersler?b=yazilim-gelistirme');
    const yg = elRows(t, '.has-pool');
    eq(yg.length, 9, 'Yazılım Geliştirme: 9 havuzlu hak');
    eq(elRows(t, '.has-link').length, 5, 'Yazılım Geliştirme: 5 serbest hak fakülte listesine bağlı');
    const b7 = yg.find(c => /Bölüm seçmelisi 7/.test(c.textContent));
    ok(b7 && /29 ders/.test(b7.textContent), 'Yazılım Geliştirme Bölüm seçmelisi 7: 29 ders: ' + (b7 && b7.textContent));
        m = await elOpen(t, b7);
    eq(m.querySelector('.el-src a').getAttribute('href'), 'https://bbbf.yeditepe.edu.tr/tr/secmeli-dersler?secmeliID=73032', 'bbbf fakülte sayfası bağlantısı (Türkçe)');
    ok([...m.querySelectorAll('.el-opts .code')].some(e => e.textContent === 'CIS 490'), 'işletmede mesleki eğitim dersi listede');
    await elClose(t, m);
    eq(CATJ.planlar['yazilim-gelistirme'].akts, 240, 'Yazılım Geliştirme 240 AKTS');
    await t.go('#/ders/CIS490');
    eq(t.text('[data-r=dept]'), 'Bilgisayar ve Bilişim Bilimleri Fakültesi, 3 kredi, 6 AKTS', 'CIS490 kredisi');
    eq(elsList(t, 'CIS490').length, 4, 'CIS490 dört bölümün listesinde: ' + elsList(t, 'CIS490'));
    noErr(t, 'bilgisayar ve bilişim havuzları');

    // Mimarlık: Kentsel Tasarım'ın hakları İngilizce sayfadan; Endüstriyel Tasarım'da tek dersli "Zorunlu seçmeli" hakları
    await t.go('#/dersler?b=kentsel-tasarim-ve-peyzaj-mimarligi');
    const kt = elRows(t, '.has-pool');
    eq(kt.length, 7, 'Kentsel Tasarım: 7 havuzlu hak');
    const ka = kt.find(c => /Alan seçmelisi 1/.test(c.textContent));
    ok(ka && /22 ders/.test(ka.textContent), 'Kentsel Tasarım Alan seçmelisi 1: 22 ders: ' + (ka && ka.textContent));
        m = await elOpen(t, ka);
    eq(m.querySelector('.el-src a').getAttribute('href'), 'https://mimarlik.yeditepe.edu.tr/tr/secmeli-dersler?secmeliID=68591', 'mimarlık fakülte sayfası bağlantısı (Türkçe)');
    await elClose(t, m);
    await t.go('#/dersler?b=endustriyel-tasarim');
    const et = t.$$('[data-r=list] section.grp')[0];
    eq([...et.querySelectorAll('.el-row .row-title')].map(c => c.textContent).join(' | '), 'Zorunlu seçmeli 1 | Zorunlu seçmeli 2', 'Endüstriyel Tasarım 1. dönem seçmelileri');
    await t.go('#/ders/ARCH267');
    eq(t.text('[data-r=name]'), "Anadolu'da Geleneksel Ahşap Yapılar", 'kesme işareti düz (ARCH267)');
    eq(t.text('[data-r=dept]'), 'Mimarlık Fakültesi, 3 kredi, 5 AKTS', 'mimarlık seçmelisinin kredisi');
    await t.go('#/ders/INDD477');
    eq(t.text('[data-r=name]'), "Solidworks'a Giriş", 'kesme işareti düz (INDD477)');
    noErr(t, 'mimarlık havuzları');

    // Meslek Yüksekokulu: bölüm seçmelisi 2 kredi; havuzda 2 ve 3 kredilik dersler var (sayfadaki gibi), hakkın kredisi listede olduğu için not çıkmaz
    await t.go('#/dersler?b=mekatronik');
    const mk = elRows(t, '.has-pool').find(c => /Bölüm seçmelisi 1/.test(c.textContent));
    ok(mk && /2 kredi/.test(mk.textContent) && /13 ders/.test(mk.textContent), 'Mekatronik Bölüm seçmelisi 1: ' + (mk && mk.textContent));
        m = await elOpen(t, mk);
    eq([...new Set([...m.querySelectorAll('.el-opts .ects')].map(e => e.textContent))].sort().join('|'), '2 kredi|3 kredi', 'Mekatronik havuzunda 2 ve 3 kredilik dersler');
    ok(!m.querySelector('.pool-warn'), 'hakkın kredisi listede var: not yok');
    eq(m.querySelector('.el-src a').getAttribute('href'), 'https://myo.yeditepe.edu.tr/tr/secmeli-dersler?secmeliID=74404', 'myo fakülte sayfası bağlantısı');
    await elClose(t, m);
    await t.go('#/ders/AUT213');
    eq(t.text('[data-r=dept]'), 'Meslek Yüksekokulu, 3 kredi, 4 AKTS', 'MYO seçmelisinin kredisi');
    noErr(t, 'myo havuzları');

    // Sağlık Bilimleri: tek dersli Alan hakları; PTR408'in AKTS'si hakkınkinden farklı (4 / 3) ama kredisi aynı (2), not çıkmaz
    await t.go('#/dersler?b=fizyoterapi-ve-rehabilitasyon');
    const fz = elRows(t, '.has-pool');
    eq(fz.length, 10, 'Fizyoterapi: 10 havuzlu hak');
    eq(elRows(t, '.has-link').length, 8, 'Fizyoterapi: 8 serbest hak fakülte listesine bağlı');
    const f7 = fz.find(c => /Alan seçmelisi 7/.test(c.textContent));
    ok(f7 && /2 kredi/.test(f7.textContent) && /1 ders/.test(f7.textContent), 'Fizyoterapi Alan seçmelisi 7: ' + (f7 && f7.textContent));
        m = await elOpen(t, f7);
    ok([...m.querySelectorAll('.el-opts .code')].some(e => e.textContent === 'PTR 408'), 'PTR408 havuzda');
    ok(!m.querySelector('.pool-warn'), 'PTR408: kredi aynı, not yok');
    eq(m.querySelector('.el-src a').getAttribute('href'), 'https://saglik.yeditepe.edu.tr/tr/secmeli-dersler?secmeliID=63788', 'sağlık fakülte sayfası bağlantısı');
    await elClose(t, m);
    await t.go('#/dersler?b=beslenme-ve-diyetetik');
    const bd = elRows(t, '.has-pool').filter(c => /Alan seçmelisi/.test(c.textContent));
    eq(bd.length, 3, 'Beslenme ve Diyetetik: 3 Alan hakkı');
    ok(bd.every(c => /2 kredi/.test(c.textContent) && /4 ders/.test(c.textContent)), 'Beslenme Alan hakları 2 kredi, 4 ders: ' + bd.map(c => c.textContent).join(' / '));
    await t.go('#/dersler?b=hemsirelik');
    eq(elRows(t, '.has-pool').length, 7, 'Hemşirelik: 7 havuzlu hak');
    await t.go('#/ders/NUT454');
    eq(t.text('[data-r=name]'), 'Yeme Davranışı Bozukluklarında Beslenme Yaklaşımları', 'NUT454 adı');
    eq(t.text('[data-r=dept]'), 'Sağlık Bilimleri Fakültesi, 2 kredi, 3 AKTS', 'sağlık seçmelisinin kredisi');
    await t.go('#/ders/NHS104');
    eq(t.text('[data-r=dept]'), 'Sağlık Bilimleri Fakültesi, 4 kredi, 5 AKTS', 'NHS104 kredisi');
    noErr(t, 'sağlık havuzları');

    // Tek bölümlü fakülteler: Diş Hekimliği (1 kredilik Bölüm hakları), Eczacılık (6 Alan hakkı aynı 39 derslik havuz),
    // Hukuk (havuzda başka fakültelerin 3 kredilik dersleri de var; 2 kredi listede olduğu için not çıkmaz), Tıp (hakların kredisi planda yok)
    await t.go('#/dersler?b=dis-hekimligi');
    const dh = elRows(t, '.has-pool');
    eq(dh.length, 4, 'Diş Hekimliği: 4 havuzlu hak');
    const db2 = dh.find(c => /Bölüm seçmelisi 2/.test(c.textContent));
    ok(db2 && /1 kredi/.test(db2.textContent) && /3 ders/.test(db2.textContent), 'Diş Bölüm seçmelisi 2: ' + (db2 && db2.textContent));
        m = await elOpen(t, db2);
    eq(m.querySelector('.el-src a').getAttribute('href'), 'https://dishekimligi.yeditepe.edu.tr/tr/secmeli-dersler?secmeliID=65027', 'diş fakülte sayfası bağlantısı');
    await elClose(t, m);
    await t.go('#/ders/DENT401');
    eq(t.text('[data-r=dept]'), 'Diş Hekimliği Fakültesi, 1 kredi, 1 AKTS', 'DENT401 kredisi');
    await t.go('#/dersler?b=eczacilik');
    const ec = elRows(t, '.has-pool').filter(c => /Alan seçmelisi/.test(c.textContent));
    eq(ec.length, 6, 'Eczacılık: 6 Alan hakkı');
    ok(ec.every(c => /2 kredi/.test(c.textContent) && /39 ders/.test(c.textContent)), 'Eczacılık Alan hakları 2 kredi, 39 ders');
    eq(elRows(t, '.has-link').length, 4, 'Eczacılık: 4 serbest hak fakülte listesine bağlı');
        m = await elOpen(t, ec[0]);
    ok(m.querySelector('[data-r=el-q]'), 'uzun havuzda süzme kutusu');
    ok([...m.querySelectorAll('.el-opts .el-opt-t')].some(e => e.textContent === 'Bayer ile İlaç Sektörü (PIWB)'), 'PHAR578 adı havuzda');
    await elClose(t, m);
    await t.go('#/dersler?b=hukuk');
    const hk = elRows(t, '.has-pool').find(c => /Alan seçmelisi 1/.test(c.textContent));
    ok(hk && /2 kredi/.test(hk.textContent) && /40 ders/.test(hk.textContent), 'Hukuk Alan seçmelisi 1: ' + (hk && hk.textContent));
        m = await elOpen(t, hk);
    ok(!m.querySelector('.pool-warn'), 'Hukuk: 2 kredi listede, not yok');
    eq(m.querySelector('.el-src a').getAttribute('href'), 'https://law.yeditepe.edu.tr/tr/secmeli-dersler?secmeliID=62183', 'hukuk fakülte sayfası bağlantısı');
    await elClose(t, m);
    await t.go('#/ders/LAW446');
    eq(t.text('[data-r=dept]'), 'Hukuk Fakültesi, 2 kredi, 3 AKTS', 'LAW446 kredisi');
    await t.go('#/dersler?b=tip');
    const tp = elRows(t, '.has-pool').find(c => /Alan seçmelisi 3/.test(c.textContent));
    ok(tp && !/kredi/.test(tp.textContent) && /33 ders/.test(tp.textContent), 'Tıp Alan seçmelisi 3 (kredisiz hak): ' + (tp && tp.textContent));
        m = await elOpen(t, tp);
    ok(/^33 ders\./.test(m.querySelector('.el-src').textContent) && /6\. sınıf/.test(m.closest('section.grp').querySelector('.sem-h').textContent), 'Tıp listesi: ' + m.querySelector('.el-src').textContent);
    ok(!m.querySelector('.pool-warn'), 'Tıp: hakkın kredisi yok, not yok');
    await elClose(t, m);
    await t.go('#/ders/MED650');
    eq(t.text('[data-r=dept]'), 'Tıp Fakültesi, 5 kredi, 5 AKTS', 'Tıp seçmelisinin kredisi ayrıntı sayfasından');
    noErr(t, 'tek bölümlü fakülte havuzları');

    // Ayhan Abi: ana sayfada gezer, dokununca konuşur; hoş geldin turunu o yapar
    await t.go('#/');
    const ay = t.$('[data-r=ayhan] .ay-roam');
    ok(ay && /Ayhan Abi/.test(ay.getAttribute('aria-label')), 'ana sayfada Ayhan Abi: ' + (ay && ay.getAttribute('aria-label')));
    ok(/(^| )(idle|walk|sleep)( |$)/.test(ay.className), 'Ayhan Abi bir halde: ' + ay.className);
    ok(t.$('[data-r=ayhan] .ay-home .ay-mat') && /AYHAN/.test(t.text('[data-r=ayhan] .ay-home')), 'ana sayfada kırmızı kulübe, paspas ve kap');
    ok(!/küpeli/.test(t.w.document.body.innerHTML) && ay.querySelector('.ay-sleep') && ay.querySelector('.ay-jaw'), 'Ayhan Abi yeni çizimle: uyku hali ve konuşan çene var');
    t.w.localStorage.removeItem('yw:ayhanHi');
    ay.click(); await t.wait(60);
    eq(t.text('[data-r=ayhan] .ay-say'), 'Ben Ayhan Abi. Hav!', 'ilk dokunuşta kendini tanıtır');
    ok(t.$('[data-r=ayhan] .ay-roam').classList.contains('idle'), 'dokununca durur');
    ay.click(); await t.wait(60);
    ok(t.text('[data-r=ayhan] .ay-say').length > 2 && t.text('[data-r=ayhan] .ay-say') !== 'Ben Ayhan Abi. Hav!', 'sonraki dokunuşta başka söz: ' + t.text('[data-r=ayhan] .ay-say'));
    t.ev('tourEnd()');   // yeni hesaba kendiliğinden açılan tur varsa kapanır
    await t.go('#/hakkinda');
    const tr = t.$('#main [data-g=welcome]');
    ok(tr && /Ayhan Abi/.test(tr.textContent), 'Hakkında sayfasında Ayhan Abi turu düğmesi');
    // jsdom'da yerleşim yok: her öğe görünür ve aynı kutuda sayılır
    const EP = t.w.Element.prototype, gcr = EP.getClientRects, gbr = EP.getBoundingClientRect;
    EP.getClientRects = function () { return [{}]; };
    EP.getBoundingClientRect = function () { return { left: 120, top: 140, right: 520, bottom: 200, width: 400, height: 60, x: 120, y: 140 }; };
    tr.click(); await t.wait(150);
    ok(t.$('.tour .tour-card') && !t.$('.modal'), 'tur açıldı, yenilikler penceresi kapandı');
    eq(t.w.location.hash, '#/hakkinda', 'tanışma bulunduğun sayfada');
    ok(t.$('.tour').classList.contains('at-gate') && t.$('.tour [data-t=gate]') && !t.$('.tour [data-t=gate]').classList.contains('open'), 'tur Yeditepe kapısında başlar, kapı kapalı');
    eq(t.text('.tour [data-t=next]'), 'Kapıyı aç', 'kapı düğmesi');
    ok(/Kapıyı aç/.test(t.text('.tour [data-t=say] .tour-key') || ''), 'konuşmadaki düğme adı vurgulu');
    t.$('.tour [data-t=gate]').click(); await t.wait(40);
    ok(t.$('.tour [data-t=gate]').classList.contains('open') && t.$('.tour [data-t=next]').disabled, 'kapıya dokununca kanatlar açılıyor');
    await t.wait(1000);
    ok(/Ben Ayhan Abi, kampüsün köpeği/.test(t.text('.tour [data-t=say]')) && /yedi durak/.test(t.text('.tour [data-t=say]')), 'Ayhan Abi kapıda kendini tanıtıyor: ' + t.text('.tour [data-t=say]'));
    ok(t.$('.tour .tg-ayhan.talk') && t.$$('.tour [data-t=say] .tw').length > 10, 'konuşurken ağzı oynuyor, yazı kelime kelime beliriyor');
    eq(t.text('.tour [data-t=next]'), 'Gezdir beni', 'ilk adım düğmesi');
    ok(!t.$('.tour').classList.contains('has-hole') && t.$('.tour [data-t=back]').hidden, 'tanışmada ışık ve geri yok');
    const tnext = async () => { t.$('.tour [data-t=next]').click(); await t.wait(320); };
    const lit = sel => t.ev(`!!TOUR.tgt && TOUR.tgt === document.querySelector(${JSON.stringify(sel)})`);
    await tnext();
    ok(t.w.location.hash === '#/' && lit('#main .hero .search') && t.$('.tour').classList.contains('has-hole'), 'durak 1: ana sayfada arama kutusu ışıkta');
    eq(t.text('.tour [data-t=step]'), 'Durak 1 / 7', 'durak sayacı');
    ok(!t.$('.tour').classList.contains('at-gate') && t.$('.tour .tour-dog .af-svg'), 'kapı geride kaldı, kartta Ayhan Abi’nin yüzü');
    ok(!t.$('.tour-hole').hidden && t.$('.tour-hole').style.width === '416px' && t.$('.tour-veil[data-t=v0]').style.height === '132px', 'ışık öğenin çevresinde, perde dışında: ' + t.$('.tour-hole').style.width + ' ' + t.$('.tour-veil[data-t=v0]').style.height);
    eq(t.$('.tour-card').dataset.tail, 'up', 'kart ışığın altında, ucu öğeyi gösteriyor');
    await tnext();
    ok(t.w.location.hash === '#/dersler' && lit('#main .toolbar'), 'durak 2: derslere gitti, tur açık, bölüm seçimi ışıkta');
    await tnext();
    ok(/^#\/ders\//.test(t.w.location.hash) && t.ev('!!TOUR.tgt && TOUR.tgt.matches("[data-r=myc], .head-actions")'), 'durak 3: ders sayfasında Derslerime ekle -> ' + t.w.location.hash);
    t.$('.tour [data-t=back]').click(); await t.wait(320);
    ok(t.w.location.hash === '#/dersler' && /Durak 2/.test(t.text('.tour [data-t=step]')), 'geri: derslere döndü');
    await tnext(); await tnext();
    ok(t.w.location.hash === '#/paylas' && t.ev('!!TOUR.tgt && TOUR.tgt.matches("[data-r=dbox], [data-r=form]")'), 'durak 4: not paylaşma, Drive kutusu');
    await tnext();
    ok(t.w.location.hash === '#/hocaolcer' && lit('#main .toolbar'), 'durak 5: HocaÖlçer araması');
    await tnext();
    ok(t.w.location.hash === '#/kubbe' && t.ev('!!TOUR.tgt && TOUR.tgt.matches("[data-r=head], .shop-sec")'), 'durak 6: kubbe');
    await tnext();
    ok(t.w.location.hash === '#/' && lit('#main [data-r=ayhan]'), 'son durak: ana sayfada Ayhan Abi');
    eq(t.text('.tour [data-t=next]'), 'Başlayalım', 'son durak düğmesi');
    t.$('.tour [data-t=next]').click(); await t.wait(60);
    ok(!t.$('.tour') && !t.ev('TOUR.on'), 'tur bitti');
    // tur açıkken başka sayfaya geçmek turu kapatmaz; Esc ve "Turu geç" kapatır
    t.ev('openWelcome()'); await t.wait(60);
    t.$('.tour [data-t=next]').click(); await t.wait(1000);
    await tnext();
    ok(lit('#main .hero .search'), 'yeniden: kapıdan girip durak 1');
    await t.go('#/hakkinda'); await t.wait(1700);
    ok(t.$('.tour') && !t.$('.tour').classList.contains('has-hole') && /Durak 1/.test(t.text('.tour [data-t=step]')), 'başka sayfada tur açık, ışıksız bekliyor');
    await t.go('#/'); await t.wait(200);
    ok(lit('#main .hero .search'), 'sayfaya dönünce ışık yerinde');
    t.w.document.dispatchEvent(new t.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await t.wait(30);
    ok(!t.$('.tour'), 'Esc turu kapattı');
    t.ev('openWelcome()'); await t.wait(60);
    t.$('.tour [data-t=skip]').click(); await t.wait(30);
    ok(!t.$('.tour'), 'Turu geç ile kapandı');
    EP.getClientRects = gcr; EP.getBoundingClientRect = gbr;
    await t.go('#/not/yok');
    ok(t.$('#main .empty') && !t.$('#main .empty svg'), 'boş sayfada Ayhan Abi yok, yalnızca yazı');
    // sitede düz emoji yok: simgeler çizim (gl, avArt)
    for (const h of ['#/', '#/kubbe', '#/hakkinda', '#/profil', '#/dersler', '#/ders/CSE211']) {
      await t.go(h); await t.wait(80);
      const txt = ['.topbar', '#main', '.bnav'].map(x => t.text(x) || '').join(' ');
      ok(!/\p{Extended_Pictographic}/u.test(txt), 'emoji yok: ' + h + ' ' + (txt.match(/.{0,20}\p{Extended_Pictographic}/u) || [''])[0]);
    }
    await t.go('#/');
    ok(t.$('.home-main > .hm-notes') && t.$('.home-main > .hm-lead') && t.$('.home-main > .hm-cms > .hm-cmb[data-r=cms]') && t.$('.home-main > .hm-trend') && t.$('.home-main > .hm-reqs [data-r=reqs]'), 'ızgara: Notlar | sıralama, yorum kutusu | not istekleri');
    ok(t.$('.ns-fire[data-ns=hot] svg.gl-flame') && !t.$('.seg [data-ns=hot]') && t.$('.seg [data-ns=new]'), 'Revaçta kutusuz alev, Yeni kutuda');
    ok(!t.$('.req-card-top p') && !t.text('[data-ns=hot]').trim() && t.$('[data-ns=hot]').getAttribute('aria-label') === 'Revaçta', 'istek kutusunda açıklama yok; Revaçta yalnızca alev');
    ok(!t.$('#main .h-gl') && !t.$('#main .sec-head h2 svg'), 'ana sayfa başlıklarında simge yok');
    // ana sayfada istek tek satır: + ile katılınır, sayı yanında, popülerse alev; ayrıntı (neden) istekler sayfasında
    t.store.put('requests/hot-1', { cid: 'CSE211', kind: 'genel', text: 'Final özeti', why: 'Finale çalışıyorum, son üç hafta eksik', by: 'zz-b', at: Date.now(), plus: { a: true, b: true }, done: false, nid: '', doneBy: '', doneAt: 0 });
    await t.wait(80); await t.go('#/'); await t.wait(80);
    { const li = t.$('.rq-line[data-id="hot-1"]');
      ok(li && li.querySelector('.rq-up') && t.text('.rq-line[data-id="hot-1"] .rq-n') === '3' && li.querySelector('svg.gl-flame') && !li.querySelector('.req-why'), 'istek tek satırda: +, sayı ve popüler alevi; neden yazmıyor');
      ok(li.querySelector('.gl-flame .fb1') && li.querySelector('.gl-flame .fb3') && li.querySelector('.gl-flame .smk3'), 'alev katmanlı ve dumanlı');
      { const ids = t.$$('.gl-flame clipPath').map(c => c.id); ok(ids.length >= 2 && new Set(ids).size === ids.length, 'her alevin kırpma kimliği ayrı: ' + ids.join()); }
      li.querySelector('.rq-up').click(); await t.wait(120); }
    eq(t.text('.rq-line[data-id="hot-1"] .rq-n'), '4', '+ basınca sayı arttı');
    ok(t.$('.rq-line[data-id="hot-1"] .rq-up').getAttribute('aria-pressed') === 'true' && Object.keys(t.store.get('requests/hot-1').plus).length === 3, 'katılım kaydedildi');
    await t.go('#/istekler?r=hot-1'); await t.wait(80);
    ok(t.$('#rq-hot-1.flash') && /Finale çalışıyorum/.test(t.text('#rq-hot-1 .req-why')), 'istekler sayfasında ayrıntı ve gelinen istek ışıkta');
    t.ev("S.db.doc('requests/hot-1').delete()"); await t.wait(60);
    await t.go('#/'); await t.wait(60);
    ok(t.$('[data-ns=hot] svg.gl-flame') && t.$('[data-r=kubbechip] svg.k-coin') && t.$$('#main .avatar svg.av-art').length > 0, 'Revaçta alevi, kubbe sikkesi ve profil resimleri çizim');
    ok(t.ev("spyName().includes('gl-spy') && whoHtml('yok', true, '').includes('gl-spy') && avatarHtml('', { anon: true }).includes('gl-spy')"), 'anonimde casus');
    noErr(t, 'Ayhan Abi');
    noErr(t, 'Ayhan Abi turu');
  }

  console.log('14) yönetici girişi: çık, deneme hesabına gir, e-posta ve şifreyle dön');
  {
    const crypto = require('crypto');
    const OWN = 'owner-w', MAIL = 'admin@std.yeditepe.edu.tr', PW = 'Gizli-Sifre1';
    const login = { email: MAIL, kdf: 'pbkdf2-sha256', it: 1000, salt: 'test-tuz', hash: crypto.pbkdf2Sync(PW, 'test-tuz', 1000, 32, 'sha256').toString('hex'), at: Date.now() };
    const seed = Object.assign(clone(SEED), { ['data/users/' + OWN + '/login']: login });
    const t = await boot({ html: HTML, seed, owner: true, userId: OWN, webcrypto: true });
    await t.wait(250);
    const base = t.ev('S.baseMe');
    ok(t.ev('S.owner') === true && t.store.get('users/' + base) && t.store.get('users/' + base).role === 'admin', 'yönetici hesabı hazır');
    await t.go('#/profil'); await t.wait(60);
    ok(t.text('#main').includes(MAIL), 'profilde yönetici e-postası');
    const outBtn = t.$('[data-g=logout-base]'); ok(!!outBtn, 'Çıkış yap düğmesi');
    outBtn.click(); await t.wait(300);
    ok(t.ev('S.out') === true && t.ev('S.owner') === false && t.ev('hasAcc()') === false, 'çıkış: hesap yok, yönetici yetkisi kapalı');
    eq(JSON.parse(t.w.localStorage.getItem('yw:out')), base, 'çıkış bu cihazda hatırlanır');
    ok(t.$('.modal #au-lmail') && !t.$('.modal [data-r=to-signup]'), 'giriş formu açıldı, hesap açma bağlantısı yok');
    ok(!t.$('[data-r=acc]').hidden && /Giriş yap/.test(t.text('[data-r=acc]')), 'üst çubukta Giriş yap');
    const sub = async (mail, pw) => { t.$('#au-lmail').value = mail; t.$('#au-lpw').value = pw; t.$('.modal form').dispatchEvent(new t.w.Event('submit', { cancelable: true, bubbles: true })); await t.wait(300); };
    t.w.localStorage.setItem('yw:welcomed:deneme123', 'true');
    await sub('deneme123@std.yeditepe.edu.tr', 'deneme123');
    ok(!t.$('.modal'), 'deneme hesabıyla girildi');
    ok(t.ev('S.me') === 'deneme123' && t.ev('S.shared') === true && t.ev('S.owner') === false, 'deneme hesabında yönetici yetkisi yok');
    await t.go('#/hocaolcer');
    ok(t.$$('[data-owner]').length > 0 && t.$$('[data-owner]').every(e => e.hidden), 'yönetici düğmeleri gizli');
    await t.go('#/moderasyon');
    ok(/yalnızca site sahibine açık/.test(t.text('#main')), 'moderasyon kapalı');
    t.ev("G['logout-shared']()"); await t.wait(150);
    ok(t.ev('S.out') === true && t.ev('hasAcc()') === false && t.ev('S.me') === base, 'deneme hesabından çıkınca yine çıkış durumunda');
    t.ev('openAuth()'); await t.wait(60);
    ok(t.$('.modal #au-lmail') && !t.$('.modal [data-r=to-signup]'), 'çıkıştayken giriş formu açılır');
    await sub(MAIL, 'yanlis-sifre');
    eq(t.text('.modal .err'), 'Şifre hatalı.', 'yanlış şifre');
    await sub(MAIL.toUpperCase(), PW);
    ok(!t.$('.modal'), 'yönetici şifresiyle girildi (e-posta büyük harfle de)');
    ok(t.ev('S.out') === false && t.ev('S.owner') === true && t.ev('S.me') === base && t.ev('hasAcc()') === true, 'yönetici hesabına dönüldü');
    eq(t.w.localStorage.getItem('yw:out'), 'null', 'çıkış işareti silindi');
    await t.go('#/hocaolcer');
    ok(t.$$('[data-owner]').every(e => !e.hidden), 'yönetici düğmeleri geri geldi');
    noErr(t, 'yönetici girişi');
  }
  {
    // başka bir Claude hesabı yönetici e-postasıyla giremez: giriş kaydı yalnızca sahibin gizli alanında
    const t = await boot({ html: HTML, seed: clone(SEED), userId: 'viewer-9', webcrypto: true });
    await t.wait(150);
    t.ev('openAuth({ login: true })'); await t.wait(60);
    t.$('#au-lmail').value = 'admin@std.yeditepe.edu.tr'; t.$('#au-lpw').value = 'Gizli-Sifre1';
    t.$('.modal form').dispatchEvent(new t.w.Event('submit', { cancelable: true, bubbles: true })); await t.wait(250);
    eq(t.text('.modal .err'), 'Bu e-postayla şifreli bir hesap yok.', 'başka kimlik yönetici hesabına giremez');
    ok(t.ev('S.owner') === false && t.ev('hasAcc()') === false, 'yetki ve hesap yok');
    noErr(t, 'başka kimlik');
  }

  console.log('15) e-postanın yalnızca ilk kısmı, deneme hesabı normal hesap gibi, profil resmi');
  const submit = async (t, ms = 200) => { t.$('.modal form').dispatchEvent(new t.w.Event('submit', { cancelable: true, bubbles: true })); await t.wait(ms); };
  const typeIn = (t, el, v) => { el.value = v; el.dispatchEvent(new t.w.Event('input', { bubbles: true })); };
  {
    const t = await boot({ html: HTML, seed: clone(SEED), userId: 'viewer-d' });
    await t.wait(200);
    t.ev('openAuth()'); await t.wait(60);
    ok(t.$('.modal .mail-in #au-mail') && t.text('.modal .mail-dom') === '@std.yeditepe.edu.tr', 'uzantı kutuda yazılı');
    const mi = t.$('#au-mail');
    typeIn(t, mi, 'yeni.ogrenci@std.yeditepe.edu.tr');
    eq(mi.value, 'yeni.ogrenci', 'tam adres yapıştırılınca uzantı düşer');
    typeIn(t, mi, 'yeni.ogrenci@');
    eq(mi.value, 'yeni.ogrenci', '@ yazınca uzantı zaten hazır');
    mi.value = 'x@gmail.com';
    await submit(t, 80);
    ok(/Yalnızca @std\.yeditepe\.edu\.tr/.test(t.text('.modal .err')), 'başka uzantı reddedilir: ' + t.text('.modal .err'));
    mi.value = 'yeni.ogrenci';
    await submit(t, 120);
    ok(/yeni\.ogrenci@std\.yeditepe\.edu\.tr/.test(t.text('.modal .help')), 'kod tam adrese gitti: ' + t.text('.modal .help'));
    t.$('#au-code').value = t.text('.demo-code');
    await submit(t, 80);
    ok(!t.$('.modal input[type=file]'), 'profil resminde fotoğraf yükleme yok');
    ok(t.$$('.modal .color-btn').length === 8 && t.$$('.modal .color-btn').every(b => b.style.background), 'hazır renkler boyalı');
    ok(t.$('.modal [data-avp=urun]').hidden && /Marketten aldığın ürünler/.test(t.$('.modal [data-avp=urun]').textContent), 'yeni hesapta market ürünü yok, açıklaması var');
    t.$('.modal [data-avk=harf]').click(); await t.wait(20);
    ok(!t.$('.modal [data-avp=harf]').hidden && t.$('.modal [data-avp=emoji]').hidden, 'Harf sekmesi açıldı');
    const hi = t.$('.modal [data-r=harf-in]'); typeIn(t, hi, 'yö1');
    eq(hi.value, 'YÖ', 'harfler büyük ve en çok iki');
    eq(t.text('.modal [data-r=prev] .avatar.harf'), 'YÖ', 'ön izlemede harfler');
    typeIn(t, t.$('.modal [data-r=color-in]'), '#203040');
    ok(t.$('.modal [data-r=prev] .avatar').classList.contains('on-dark'), 'koyu arka planda harf açık renk');
    eq(t.$('#au-user').value, 'yeni.ogrenci', 'kullanıcı adı okul e-postasının baş kısmından geldi');
    eq(t.$$('.modal .su-prog li').map(x => x.className).join(), 'on,', 'adım 1/2: profil');
    ok(!t.$('.modal #au-no') && !t.$('.modal #au-bolum'), 'ilk adımda telefon ve bölüm yok');
    eq(t.$('.modal [data-vis=showName]').getAttribute('aria-pressed') + '/' + t.$('.modal [data-vis=showYil]').getAttribute('aria-pressed'), 'false/true', 'göz düğmeleri: ad gizli, yıl görünür');
    t.$('.modal [data-vis=showName]').click(); await t.wait(20);
    ok(t.$('.modal [data-vis=showName]').getAttribute('aria-pressed') === 'true' && /Profilde görünür/.test(t.text('.modal [data-vis=showName]')), 'göz açıldı');
    t.$('.modal [data-vis=showName]').click(); await t.wait(20);
    t.$('#au-first').value = 'Yeni'; t.$('#au-last').value = 'Öğrenci';
    await submit(t, 60);
    ok(/Cinsiyetini seç/.test(t.text('.modal .err')) && t.$$('.modal .gv-opt svg.fig').length === 3, 'cinsiyet seçmeden ilerlemez; üç seçenekte küçük karakter');
    t.$('.modal [data-gv=k]').click(); await t.wait(20);
    ok(t.$('.modal [data-gv=k]').getAttribute('aria-checked') === 'true' && t.$('.modal [data-gv=e]').getAttribute('aria-checked') === 'false', 'kadın seçildi');
    await submit(t, 120);
    eq(t.$$('.modal .su-prog li').map(x => x.className).join(), 'done,on', 'adım 2/2: bölüm');
    ok(!!t.$('.modal [data-bpick] #au-bolum') && t.$$('.modal .bp-opt').length >= 60, 'bölüm seçici: ' + t.$$('.modal .bp-opt').length + ' bölüm');
    await submit(t, 80);
    ok(/Listeden bölümünü seç/.test(t.text('.modal .err')) && !t.store.get('users/' + t.ev('S.me')), 'bölüm seçmeden ilerlemez (ya da sonra seçerim)');
    { const q = t.$('.modal [data-r=bp-q]'); typeIn(t, q, 'bilgisayar müh');
      const vis = t.$$('.modal .bp-opt').filter(o => !o.hidden).map(o => o.dataset.bid);
      eq(vis.join(), 'bilgisayar-muhendisligi', 'aramada adı eşleşen bölüm'); typeIn(t, q, 'eczacılık fakültesi');
      ok(t.$$('.modal .bp-opt').filter(o => !o.hidden).length >= 1, 'adında yoksa fakülte adında arar'); typeIn(t, q, ''); }
    t.$('.modal .bp-opt[data-bid="bilgisayar-muhendisligi"]').click(); await t.wait(20);
    ok(/Bilgisayar Mühendisliği/.test(t.text('.modal .bp-prev')) && /yıllık program/.test(t.text('.modal .bp-prev')) && t.$$('.modal .bp-prev .code').length > 0, 'seçilen bölümün planı özetlendi: ' + t.text('.modal .bp-prev'));
    await submit(t, 250);
    const me = t.ev('S.me'), nu = t.store.get('users/' + me);
    eq(nu && nu.bolum, 'bilgisayar-muhendisligi', 'hesap bölümüyle açıldı');
    eq(nu && nu.username, 'yeni.ogrenci', 'kullanıcı adı kaydedildi');
    eq(nu && nu.govde, 'k', 'karakter kadın vücuduyla');
    ok(nu && nu.avk === 'harf' && nu.harf === 'YÖ' && nu.color === '#203040' && nu.pic === '', 'hesap harfli profil resmiyle açıldı: ' + JSON.stringify(nu && { avk: nu.avk, harf: nu.harf, color: nu.color }));
    eq((t.store.get('data/users/viewer-d/private') || {}).email, 'yeni.ogrenci@std.yeditepe.edu.tr', 'özel kayıtta tam adres');
    ok(t.$('[data-r=acc] .avatar.harf') && t.text('[data-r=acc] .avatar') === 'YÖ', 'üst çubukta harfler');
    noErr(t, 'hesap açma ve harfli profil resmi');
  }
  {
    const seed = clone(SEED);
    seed['users/deneme123'] = Object.assign({}, seed['users/deneme123'], { gift: 10000 });
    seed['data/users/viewer-e/private'] = { myc: ['MATH131'], done: ['MATH131'] };
    const t = await boot({ html: HTML, seed, userId: 'viewer-e', webcrypto: true });
    await t.wait(200);
    t.w.localStorage.setItem('yw:welcomed:deneme123', 'true');
    t.ev('openAuth({ login: true })'); await t.wait(60);
    t.$('#au-lmail').value = 'deneme123'; t.$('#au-lpw').value = 'deneme123';
    await submit(t, 300);
    ok(t.ev('S.me') === 'deneme123' && !t.$('.modal'), 'yalnızca ilk kısımla giriş');
    eq(t.ev('privPath()'), 'data/users/viewer-e/private-deneme123', 'deneme hesabının ayrı özel kaydı');
    eq(JSON.stringify(t.ev('myCourses()')), '[]', 'kendi hesabının Derslerim’i deneme hesabına karışmaz');
    eq(t.ev('balanceOf("deneme123")'), 10050, 'hediye kubbe bakiyede');
    eq(t.ev('ranking("all").find(x => x.uid === "deneme123").val'), 50, 'hediye sıralamaya sayılmaz');
    await t.go('#/ders/CSE211');
    t.$('[data-g=myc]').click(); await t.wait(150);
    ok(((t.store.get('data/users/viewer-e/private-deneme123') || {}).myc || []).includes('CSE211'), 'deneme hesabının Derslerim’i kendi kaydında');
    eq(JSON.stringify(t.store.get('data/users/viewer-e/private').myc), '["MATH131"]', 'kendi hesabının kaydı değişmedi');
    await t.go('#/profil');
    ok(/deneme123@std\.yeditepe\.edu\.tr/.test(t.text('#main')) && t.$('[data-g=logout-shared]') && t.$$('#main .led-row').some(r => /Hediye/.test(r.textContent) && /10000/.test(r.textContent)), 'profilde e-posta, çıkış ve hediye');
    t.$('[data-g=profile-edit]').click(); await t.wait(60);
    ok(t.$('.modal #pe-user'), 'deneme hesabının profili düzenlenebilir');
    ok(!t.$('.modal [data-r=emoji-in]') && t.$$('.modal .emoji-btn svg.av-art').length === 24, 'profil resmi çizilmiş karakterlerden seçilir, emoji yazma kutusu yok');
    t.$('.modal [data-emoji="🦊"]').click(); await t.wait(20);
    ok(t.$('.modal [data-r=prev] svg.av-art') && !/\p{Extended_Pictographic}/u.test(t.text('.modal [data-r=prev]')), 'ön izlemede tilki çizimi, emoji yok');
    t.$('#pe-user').value = 'deneme.kurbagasi';
    await submit(t, 200);
    const du = t.store.get('users/deneme123');
    ok(du.username === 'deneme.kurbagasi' && du.emoji === '🦊' && du.avk === 'emoji' && du.login && du.email === 'deneme123@std.yeditepe.edu.tr', 'deneme profili kaydedildi, giriş bilgisi korundu');
    await t.go('#/kubbe');
    t.$('[data-g=buy][data-id="kartal-kanatlari"]').click(); await t.wait(60);
    t.$('.modal [data-ok]').click(); await t.wait(250);
    ok(t.store.get('users/deneme123').items['kartal-kanatlari'], 'ürün hediye kubbeyle alındı');
    const avb = t.$('[data-g=av-urun][data-id="kartal-kanatlari"]'); ok(!!avb, 'alınan üründe Profil resmi yap');
    avb.click(); await t.wait(250);
    const du2 = t.store.get('users/deneme123');
    ok(du2.avk === 'urun' && du2.urun === 'kartal-kanatlari', 'ürün profil resmi oldu');
    ok(/Profil resmin/.test(t.text('[data-r=market]')), 'markette Profil resmin yazıyor');
    const av = t.$('[data-r=acc] .avatar'), src = av && av.querySelector('img') ? av.querySelector('img').getAttribute('src') : '';
    ok(av && av.classList.contains('art') && av.classList.contains('fx-wings') && /^data:image\/svg\+xml,/.test(src), 'üst çubukta ürün çizimi ve kanat efekti');
    ok(/flap-l/.test(decodeURIComponent(src)) && /@keyframes flapL/.test(decodeURIComponent(src)), 'çizimin animasyonu görselin içinde');
    ok(t.ev('itemAvSrc("gece-eskortu") === itemAvSrc("gece-eskortu")'), 'ürün çizimi bir kez hazırlanır');
    { const h1 = t.$('[data-r=acc]').innerHTML; t.ev('S.version++, changed()'); await t.wait(60); eq(t.$('[data-r=acc]').innerHTML, h1, 'yenilemede profil resmi yeniden çizilmez'); }
    await t.go('#/profil');
    t.$('[data-g=profile-edit]').click(); await t.wait(60);
    eq(t.$$('.modal [data-urun]').length, 1, 'market sekmesinde alınan ürün');
    ok(t.$('.modal [data-urun="kartal-kanatlari"]').getAttribute('aria-pressed') === 'true' && !t.$('.modal [data-avp=urun]').hidden, 'seçili ürün işaretli');
    t.$('.modal [data-avk=emoji]').click(); await t.wait(20);
    t.$('.modal [data-emoji]').click(); await t.wait(20);
    await submit(t, 200);
    eq(t.store.get('users/deneme123').avk, 'emoji', 'emojiye geri dönüldü');
    ok(t.$('[data-r=acc] .avatar.fx-wings') && !t.$('[data-r=acc] .avatar.art'), 'kanat efekti emojide de sürüyor');
    // profilde karakter ve kıyafet seçici; kart: rozet çizimleri, büyük sıra rakamları, Aldıkları yok
    await t.go('#/profil');
    ok(t.$('.pf-me svg.fig') && t.$$('.pf-fits [data-g=fit]').length === 3 && t.$('.pf-fits [data-id=tisort]').getAttribute('aria-checked') === 'true', 'profilde karakter, üç kıyafet, tişört seçili');
    t.$('.pf-fits [data-id=mont]').click(); await t.wait(250);
    eq(t.store.get('users/deneme123').kiyafet, 'mont', 'kıyafet kaydedildi');
    ok(t.$('.pf-fits [data-id=mont]').getAttribute('aria-checked') === 'true', 'mont seçili görünüyor');
    t.ev("openUserCard('deneme123')"); await t.wait(40);
    ok(t.$('.modal .uc-fig') && t.$$('.modal .uc-rank').length === 2 && !/Aldıkları/.test(t.text('.modal')), 'kartta karakter ve iki sıra kutusu, Aldıkları yok');
    t.$('.modal [data-close]').click(); await t.wait(30);
    { const bid = t.ev('[...S.users.keys()].find(id => earnedBadges(id).length >= 2) || ""');
      ok(!!bid, 'rozetli bir kullanıcı var'); t.ev(`openUserCard('${bid}')`); await t.wait(40);
      ok(t.$$('.modal .uc-bdgs li').length >= 2 && t.$$('.modal .uc-bdgs .bdg-medal svg').length === t.$$('.modal .uc-bdgs li').length && !/\b(note|trophy|books|bubble|dome|star|heart|buoy|cay)\b/.test(t.text('.modal .uc-bdgs')), 'rozetler çizimle, adları yazı olarak dökülmüyor: ' + t.text('.modal .uc-bdgs'));
      t.$('.modal [data-close]').click(); await t.wait(30); }
    // sıralamanın ilk üçü Kayışdağı'nda: zirvede bayraklı birinci, tırmanan ikinci ve üçüncü, madalyalı künyeler (2, 1, 3 sırasıyla)
    await t.go('#/kubbe');
    { const mt = t.$('[data-r=b-all] .mt');
      ok(mt && mt.querySelector('.mt-flag') && mt.querySelectorAll('.mt-who').length === 3, 'ilk üç dağda: zirvede bayrak, üç karakter');
      eq(t.$$('[data-r=b-all] .mt-tag').map(b => b.className.match(/t(\d)/)[1]).join(), '2,1,3', 'künyeler 2, 1, 3 sırasıyla');
      ok(t.$$('[data-r=b-all] .mt-tag .mt-medal').length === 3 && !/\p{Extended_Pictographic}/u.test(t.text('[data-r=b-all] .mt')), 'her künyede çizim madalya, emoji yok');
      const ids = t.$$('.mt-art [id]').map(e => e.id); eq(new Set(ids).size, ids.length, 'iki sıralamadaki çizim kimlikleri çakışmaz'); }
    { const top = t.ev(`mtFront('x-', { r: 1, sid: 's1', c: '#9DB0FF', body: 'e', fit: 'tisort', hair: '#3B2416', pose: 'flag', g: mtGear({ items: { 'kartal-kanatlari': 1, 'gece-eskortu': 1, 'son-sosisli': 1, 'ikinci-ev': 1 } }) })`);
      ok(/class="mt-wl"/.test(top) && /mt-dogsit/.test(top) && /#D9442E/.test(top) && !/#3D5BD9/.test(top) && /mt-flag/.test(top), 'birincide bayrak, kanat, yanında Ayhan Abi, elinde (pahalı olan) sosisli');
      ok(!/#FF7C7E|ponpon/.test(top) && /fill="#3B2416"/.test(top), 'birincinin başında bere yok, saçı görünür');
      const bare = t.ev(`mtClimb('x-', { r: 3, sid: 's3', c: '#FFE14D', body: 'k', fit: 'mont', hair: '#3B2416', g: mtGear({ items: {} }), flip: true })`);
      ok(!/mt-wl|mt-dog|mt-reach/.test(bare) && /mt-sweat/.test(bare) && /matrix\(-1/.test(bare), 'ürünsüz üçüncü yamaçta terler, aynalanmış madalya sayısı düz');
      ok(/#FF6B8B/.test(bare), 'kadın tırmanıcıda kaskın altından at kuyruğu');
      const k = t.ev(`mtFront('x-', { r: 0, sid: 's0', c: '#FFE14D', body: 'k', fit: 'kapusonlu', hair: '#3B2416', pose: 'wave', g: {} })`), e = t.ev(`mtFront('x-', { r: 0, sid: 's0', c: '#FFE14D', body: 'e', fit: 'tisort', hair: '#3B2416', pose: 'wave', g: {} })`);
      ok(k !== e && /mt-wave/.test(k) && !/mt-swing/.test(k), 'profil karakteri el sallar, madalyasız; kadın ve erkek vücudu farklı'); }
    t.ev("G['logout-shared']()"); await t.wait(150);
    eq(t.ev('privPath()'), 'data/users/viewer-e/private', 'çıkınca kendi özel kaydı');
    eq(JSON.stringify(t.ev('myCourses()')), '["MATH131"]', 'kendi Derslerim’i geri geldi');
    noErr(t, 'deneme hesabı ve profil resmi');
  }

  console.log('16) akademik kadro');
  {
    const t = await asStudent();
    t.w.localStorage.setItem('yw:welcomed:' + t.me, 'true');
    const n = t.ev('CAT.hocas.size');
    ok(n > 100, 'kadro yüklü: ' + n);
    eq(t.ev('S.hocas.size'), t.ev('mergeHocas(S.dbHocas).size'), 'birleşik hoca listesi');
    const k = JSON.parse(t.ev(`JSON.stringify([...CAT.hocas].find(([id, h]) => h.dersler.length && h.kid && h.title && h.dept))`));
    ok(!!k, 'ders veren bir kadro hocası');
    const [hid, h] = k, cid = h.dersler[0][0], yil = h.dersler[0][1];
    ok(!/@/.test(t.ev('document.getElementById("yw-kadro").textContent')), 'kadroda e-posta yok');
    await t.go('#/hoca/' + hid);
    eq(t.text('[data-r=name]'), h.name, 'hoca sayfası: ad');
    eq(t.text('[data-r=title]'), h.title, 'hoca sayfası: unvan');
    ok(t.text('[data-r=dept]').includes(h.dept), 'hoca sayfası: bölüm ' + t.text('[data-r=dept]'));
    eq(t.$('[data-r=dept] a.ext-link').getAttribute('href'), 'https://yeditepe.edu.tr/tr/akademik-kadro/' + h.kid, 'Yeditepe profili bağlantısı');
    await t.go('#/hoca/' + hid + '?tab=dersler');
    ok(t.$$('[data-r=panel] .row-link').some(a => a.getAttribute('href') === '#/ders/' + cid) && t.text('[data-r=panel]').includes(`son: ${yil}-${yil + 1}`), 'verdiği dersler ve son dönem');
    await t.go('#/ders/' + cid + '?tab=hocalar');
    const row = t.$$('[data-r=panel] .row-link').find(a => a.getAttribute('href') === '#/hoca/' + hid);
    ok(row && /Son olarak \d{4}-\d{4} döneminde verdi/.test(row.textContent), 'dersi verenler sekmesinde: ' + (row && row.textContent));
    ok(/akademik kadro sayfalarındaki ders listelerinden/.test(t.text('[data-r=panel]')), 'kaynak notu');
    await t.go('#/hocaolcer');
    { const rated = t.ev('[...S.hocas.values()].filter(h => ratingsOf(h).length).length'), shown = t.$$('[data-r=list] .row-link');
      ok(/Son puanlanan hocalar/.test(t.text('[data-r=list] .sub-h')) && shown.length === Math.min(10, rated) && (rated || /Henüz puanlanan hoca yok/.test(t.text('[data-r=list]'))), 'HocaÖlçer önce son puanlanan hocaları gösterir: ' + shown.length + '/' + rated);
      const last = shown.map(a => t.ev(`Math.max(...ratingsOf(S.hocas.get(${JSON.stringify(a.getAttribute('href').slice(7))})).map(r => r.at))`));
      ok(last.every((x, i) => !i || last[i - 1] >= x), 'en son puanlanan en üstte');
      ok(t.$('[data-r=sort]').hidden && /Tüm hocaları göster \(\d+ hoca\)/.test(t.text('[data-r=list] [data-r=all]')), 'sıralama gizli, Tüm hocaları göster düğmesi'); }
    t.$('[data-r=list] [data-r=all]').click(); await t.wait(60);
    ok(t.$$('[data-r=list] .row-link').length === 60 && /Daha fazla göster \(\d+ hoca daha\)/.test(t.text('[data-r=list] [data-r=more]')) && !t.$('[data-r=sort]').hidden, 'Tümünü göster: ilk 60 hoca, devamı düğmede, sıralama görünür');
    t.$('[data-r=list] [data-r=more]').click(); await t.wait(60);
    ok(t.$$('[data-r=list] .row-link').length > 60, 'daha fazla göster');
    t.$('[data-r=list] [data-r=recent]').click(); await t.wait(60);
    ok(/Son puanlanan hocalar/.test(t.text('[data-r=list]')) && t.$$('[data-r=list] .row-link').length <= 10, 'son puanlananlara dönülür');
    { const w = JSON.parse(t.ev('JSON.stringify(CRIT_W)'));
      ok(w.a > w.n && w.n > w.o && w.o > w.d && Math.abs(w.a + w.n + w.o + w.d - 1) < 1e-9, 'ağırlıklar: anlatım > not verme > ödev yükü > devamsızlık, toplam 1');
      ok(Math.abs(t.ev('critAll({ a: 5, o: 1, n: 3, d: 1 })') - (5 * w.a + 1 * w.o + 3 * w.n + 1 * w.d)) < 1e-9 && Math.abs(t.ev('critAll({ a: 4, o: 4, n: 4, d: 4 })') - 4) < 1e-9, 'genel puan ağırlıklı');
}
    ok(/Hoca listesi Yeditepe’nin sitesindeki akademik kadro sayfalarından alındı/.test(t.text('#main')), 'kaynak satırı');
    const facs = [...t.$$('[data-r=dept] option')].map(o => o.textContent);
    ok(facs.includes(h.fac), 'fakülte süzgeci kadrodaki fakülteleri listeler');
    const f = t.$('[data-r=f]'); f.value = cid.replace(/^([A-Z]+)/, '$1 '); f.dispatchEvent(new t.w.Event('input', { bubbles: true })); await t.wait(60);
    ok(t.$$('[data-r=list] .row-link').some(a => a.getAttribute('href') === '#/hoca/' + hid) && /dersini verenler/.test(t.text('[data-r=list]')), 'ders koduyla arama o dersi verenleri getirir');
    f.value = h.name.split(' ').slice(-1)[0]; f.dispatchEvent(new t.w.Event('input', { bubbles: true })); await t.wait(60);
    ok(t.$$('[data-r=list] .row-link').some(a => a.getAttribute('href') === '#/hoca/' + hid), 'soyadıyla arama');
    await t.go('#/paylas?ders=' + cid); await t.wait(80);
    const grp = [...t.$$('#sh-hoca optgroup')].find(g => g.label === 'Bu dersi verenler');
    ok(grp && [...grp.querySelectorAll('option')].some(o => o.value === hid), 'not paylaşırken listede önce dersi verenler');
    ok(t.$$('#sh-hoca option').length < n, 'açılır listede bütün kadro yok');
    eq(t.ev(`S.dbHocas.has(${JSON.stringify(hid)})`), false, 'kadro hocasının veritabanı kaydı yok');
    await t.go('#/hoca/' + hid);
    t.$('[data-g=rate]').click(); await t.wait(60);
    t.$$('.modal .star-input').forEach(el => el.dispatchEvent(new t.w.MouseEvent('click', { bubbles: true, clientX: 10 })));
    t.$('#r-course').value = cid.replace(/^([A-Z]+)/, '$1 ');
    t.$('.modal form').dispatchEvent(new t.w.Event('submit', { cancelable: true, bubbles: true })); await t.wait(250);
    const d = t.store.get('hocas/' + hid);
    ok(!t.$('.modal #r-course') && d && d.kadro === true && d.ratings[t.me] && d.ratings[t.me].c === cid && !d.name, 'ilk puanda kayıt açıldı, ad kadrodan gelir: ' + hid + ' ' + JSON.stringify(d).slice(0, 300));
    eq(t.ev(`S.hocas.get(${JSON.stringify(hid)}).name`), h.name, 'birleşik kayıtta ad kadrodaki gibi');
    eq(t.ev(`hocaStats(S.hocas.get(${JSON.stringify(hid)})).cnt`), 1, 'puan sayıldı');
    { const o = JSON.parse(t.ev(`JSON.stringify((() => { const s = hocaStats(S.hocas.get(${JSON.stringify(hid)})); return { all: s.all, w: critAll(s) }; })())`));
      ok(o.all > 0 && Math.abs(o.all - o.w) < 1e-9, 'karnedeki genel puan ağırlıklı: ' + JSON.stringify(o)); }
    await t.go('#/hocaolcer');
    ok(t.$$('[data-r=list] .row-link')[0] && t.$$('[data-r=list] .row-link')[0].getAttribute('href') === '#/hoca/' + hid && /az önce/.test(t.text('[data-r=list] .row-sub')), 'yeni puanlanan hoca son puanlananların başında');
    await t.go('#/hoca/' + hid);
    t.ev(`removeRating(${JSON.stringify(hid)})`); await t.wait(60);
    if (t.$('.modal [data-ok]')) { t.$('.modal [data-ok]').click(); await t.wait(200); }
    eq(t.ev(`hocaStats(S.hocas.get(${JSON.stringify(hid)})).cnt`), 0, 'puan kaldırıldı');
    noErr(t, 'akademik kadro');
  }

  console.log('17) bölümler katalogdan, profil, Katkılarım ve ana sayfa düzeni');
  {
    // veritabanında bölüm kaydı olmasa da bölümler katalogdan gelir
    const seed = clone(SEED); for (const k of Object.keys(seed)) if (k.startsWith('bolumler/')) delete seed[k];
    const t = await boot({ html: HTML, seed });
    await t.wait(200);
    ok(t.ev('S.bolumler.size') >= 70 && t.ev('S.dbBolumler.size') === 0, 'bölümler katalogdan: ' + t.ev('S.bolumler.size'));
    eq(t.ev("bolumName('bilgisayar-muhendisligi')"), 'Bilgisayar Mühendisliği', 'bölüm adı katalogdan');
    ok(/Mühendislik/.test(t.ev("S.bolumler.get('bilgisayar-muhendisligi').fakulte")), 'fakülte katalogdan');
    await t.go('#/dersler?b=bilgisayar-muhendisligi');
    ok(t.$$('#main select option').some(o => o.value === 'bilgisayar-muhendisligi'), 'Dersler sayfasında bölüm seçilebiliyor');
    // e-postadan kullanıcı adı
    eq(t.ev("userFromMail('Ahmet13@std.yeditepe.edu.tr')"), 'ahmet13', 'ahmet13@ → ahmet13');
    eq(t.ev("userFromMail('ayse-nur.k')"), 'ayse.nur.k', 'tire noktaya döner');
    eq(t.ev("userFromMail('ab')"), 'ab1', 'kısa ad tamamlanır');
    const taken = t.ev("[...S.users.values()].map(u => u.username).filter(Boolean)[0]");
    ok(taken && t.ev(`userFromMail(${JSON.stringify(taken)})`) === taken.slice(0, 19) + '2', 'alınmış ada sayı eklenir: ' + taken);
    noErr(t, 'bölümler katalogdan');
  }
  {
    const t = await boot({ html: HTML, seed: clone(SEED) });
    await t.wait(200);
    const me = t.ev('S.me');
    t.store.put('users/' + me, { username: 'test.ogrenci', first: 'Test', last: 'Öğrenci', showName: false, yil: 2024, showYil: true, bolum: 'psikoloji', avk: 'emoji', emoji: '🦊', color: '#9DB0FF', pic: '', bonus: 50, spent: 0, items: {}, at: Date.now(), verifiedAt: Date.now() });
    t.w.localStorage.setItem('yw:welcomed:' + me, 'true');
    await t.wait(120);
    await t.go('#/profil');
    ok(!!t.$('#main .pf-cover .pf-sticker .avatar.hero') && t.$('#main .pf-cover').getAttribute('style').includes('#9DB0FF'), 'kapak profil resminin rengiyle, büyük çıkartma profil resmi');
    eq(t.text('#main .pf-user').replace(/\s+/g, ''), '@test.ogrenci', 'kullanıcı adı büyük başlıkta');
    ok(t.$('#main .pf-tag.dept') && t.$('#main .pf-tag.dept').getAttribute('href') === '#/dersler?b=psikoloji', 'bölüm etiketi ders planına götürür');
    ok(!t.$$('#main a.btn, #main button.btn').some(b => b.getAttribute('href') === '#/kubbe'), 'profilde Kubbe ve market düğmesi yok');
    ok(/Profili düzenle/.test(t.text('#main .pf-acts')) && /Katkılarım/.test(t.text('#main .pf-acts')), 'profil düğmeleri');
    { const b = t.$('#main [data-g=vis-toggle][data-k=showName]'); eq(b && b.getAttribute('aria-pressed'), 'false', 'ad gizli (göz kapalı)');
      b.click(); await t.wait(150);
      eq(t.store.get('users/' + me).showName, true, 'gözle ad profilde gösterildi');
      ok(/Profilde görünür/.test(t.text('#main [data-g=vis-toggle][data-k=showName]')), 'göz açık görünüyor'); }
    ok(/Bakiyen/.test(t.text('#main .pf-ledger')) && /50 kubbe/.test(t.text('#main .led-sum')), 'kubbe dökümünde bakiye');
    t.ev('openProfileEdit()'); await t.wait(60);
    ok(t.$('.modal [data-bpick] #pe-bolum') && t.$('.modal #pe-bolum').value === 'psikoloji' && t.$('.modal .bp-opt[aria-checked="true"]').dataset.bid === 'psikoloji', 'düzenlemede bölüm seçici, bölümün seçili');
    ok(t.$('.modal .eye-tg[data-vis=showName]') && t.$('.modal .eye-tg[data-vis=showYil]'), 'düzenlemede göz düğmeleri');
    t.$('.modal .bp-opt[data-bid="bilgisayar-muhendisligi"]').click(); await t.wait(20);
    t.$('.modal form').dispatchEvent(new t.w.Event('submit', { cancelable: true, bubbles: true })); await t.wait(200);
    eq(t.store.get('users/' + me).bolum, 'bilgisayar-muhendisligi', 'bölüm değiştirildi');
    await t.go('#/katkilarim');
    ok(!t.$$('#main a').some(a => a.getAttribute('href') === '#/kubbe'), 'Katkılarım’da Kubbe ve market yok');
    eq(t.$$('#main .head-actions .btn').map(b => b.textContent.trim()).join('|'), 'Profil ayarları', 'yalnızca Profil ayarları düğmesi');
    eq(t.$$('#main .km-sec .km-head h2').map(h => h.textContent).join(','), 'Notlarım,HocaÖlçer puanlarım,Yorumlarım', 'Katkılarım bölümleri');
    ok(t.$$('#main .km-empty .btn').length === 3, 'boş bölümlerde yönlendiren düğme');
    await t.go('#/');
    ok(t.$$('[data-r=notes] .ncard').length <= 6, 'ana sayfada en çok 6 not kartı');
    ok(t.$$('[data-r=cms] li').length <= 3 && t.$$('[data-r=cms] li').length > 0, 'son yorumlardan en çok 3');
    { const secs = t.$$('.home-main .home-sec .sec-head h2').map(h => h.textContent); const i = secs.indexOf('Son yorumlar');
      ok(i >= 0 && secs[i + 1] === 'Gündemdeki dersler', 'Gündemdeki dersler son yorumların hemen altında: ' + secs.join(' | ')); }
    noErr(t, 'profil ve düzen');
  }

  console.log('18) paylaşma formu dörtlüsü, ana sayfada Derslerim yok, DersÖlçer çizimleri, türsüz not isteği');
  {
    const t = await asStudent();
    t.w.localStorage.setItem('yw:welcomed:' + t.me, 'true');
    // paylaşma formu: Ders / Not başlıkları yok; ders kodu, hoca, dönem ve hoca araması dörtlü; tür seçimi anonim seçimin hemen üstünde
    await t.go('#/paylas?ders=CSE211');
    { const f = t.$('[data-r=form]'), all = [...f.querySelectorAll('*')], pos = sel => all.indexOf(f.querySelector(sel));
      eq(t.$$('[data-r=form] h2').length, 0, 'formda bölüm başlığı (Ders, Not) yok');
      eq(t.$$('[data-r=quad] > .field').map(x => (x.querySelector('input,select') || {}).id).join(), 'sh-code,sh-hoca,sh-term,sh-hoca-q', 'dörtlü: ders kodu, hoca, dönem, hoca araması');
      ok(t.$('.q-term #sh-term') && t.$('.q-code #sh-code'), 'dönem ders kodunun altındaki hücrede');
      ok(pos('[data-r=quad]') < pos('#sh-title') && pos('#sh-title') < pos('#sh-drive') && pos('#sh-drive') < pos('#sh-desc'), 'başlık dönemin hemen ardından, altında dosya ve açıklama');
      ok(pos('#sh-desc') < pos('.typepick') && pos('.typepick') < pos('[data-anon]') && pos('[data-anon]') < pos('[data-r=rules]'), 'tür seçimi en altta, anonim seçimin üstünde');
      eq(t.$$('.typepick input[name=type]:checked').map(x => x.value).join(), 'not', 'ders notu seçili gelir');
      eq(t.text('label[for=sh-desc]').replace(/\s+/g, ' '), 'Açıklama isteğe bağlı', 'açıklama alan etiketiyle'); }
    t.$('.typepick input[value=sinav]').click(); await t.wait(20);
    t.$('#sh-title').value = 'Final çıkmışları'; t.$('#sh-drive').value = 'https://drive.google.com/file/d/xyz789/view'; t.$('[data-r=rules]').checked = true;
    t.$('[data-r=form]').dispatchEvent(new t.w.Event('submit', { cancelable: true, bubbles: true })); await t.wait(250);
    { const nn = [...t.store.docs.values()].find(d => d && d.title === 'Final çıkmışları'); ok(nn && nn.type === 'sinav' && nn.cid === 'CSE211', 'aşağıdaki tür seçimi kayda geçti'); }
    // ana sayfada ayrı Derslerim bölümü yok; Dersler > Derslerim'de yeni not rozeti
    t.ev("toggleMyCourse('MATH131')"); await t.wait(120);
    await t.go('#/');
    ok(!t.$('[data-r=mycs]') && !t.$$('.home-main .sec-head h2').some(h => /Derslerim/.test(h.textContent)), 'ana sayfada Derslerim bölümü yok');
    eq(t.$$('.home-main .home-sec .sec-head h2')[0].textContent, 'Notlar', 'ana sayfa notlarla başlıyor');
    t.w.localStorage.setItem('yw:cseen:' + t.me + ':MATH131', '1');
    await t.go('#/dersler?b=__mine');
    ok(/MATH 131/.test(t.text('[data-r=list]')) && /\d+ yeni not/.test(t.text('[data-r=list] .fresh-n')), 'Derslerim listesinde yeni not rozeti: ' + t.text('[data-r=list]').slice(0, 120));
    // DersÖlçer: 1 en zor / en ağır; biber ve kitap çizimi, emoji yok
    t.store.put('users/zz-a', { username: 'zz.a', zor: { CSE211: { z: 5, y: 5, at: 1 } }, at: 1 });
    t.store.put('users/zz-b', { username: 'zz.b', zor: { CSE211: { z: 4, y: 5, at: 1 } }, at: 1 });
    await t.wait(120);
    await t.go('#/ders/CSE211');
    { const card = t.$('.zor-card');
      ok(card && card.closest('.course-top') && card.closest('.course-dol'), 'DersÖlçer ders başlığının yanında kendi kutusunda');
      ok(!!t.$('.zor-card .dol-z svg.chili') && !!t.$('.zor-card .dol-y svg.books') && !/[🌶📚]/u.test(t.text('.zor-card')), 'biber ve kitap çizimleri, emoji yok');
      eq(t.text('.zor-card .dol-z .dol-num'), '1,5/5', 'derece 5 ve 4 → zorluk puanı 1,5');
      eq(t.text('.zor-card .dol-z .dol-word'), 'Zor', 'düşük puan zor demek');
      eq(t.text('.zor-card .dol-y .dol-num'), '1,0/5', 'iş yükü puanı 1,0');
      eq(t.text('.zor-card .dol-y .dol-word'), 'Çok ağır', 'puan 1 en ağır');
      eq(t.$$('.zor-card .dol-y svg.books .bk').length, 5, 'en ağır iş yükünde beş kitaplık yığın');
      eq(t.$$('.zor-card .dol-z .ch-heat').length, 2, 'zor derste biberden ısı dalgaları çıkıyor');
      ok(/1 en zor/.test(t.text('.zor-card .dol-z .dol-ends')) && /5 en kolay/.test(t.text('.zor-card .dol-z .dol-ends')) && /1 en ağır/.test(t.text('.zor-card .dol-y .dol-ends')), 'ölçeğin uçları yazıyor');
      eq(t.$('.zor-card .dol-z .dol-track i').style.left, '12.5%', 'işaret ölçekte puanın yerinde'); }
    t.$('[data-g=zor]').click(); await t.wait(60);
    eq(t.$$('.modal input[name=z]').map(x => x.parentElement.textContent.trim()).join('|'), '1Çok zor|2Zor|3Orta|4Kolay|5Çok kolay', 'oy penceresinde 1 en zor');
    eq(t.$$('.modal input[name=y]').map(x => x.parentElement.textContent.trim()).join('|'), '1Çok ağır|2Ağır|3Orta|4Hafif|5Çok hafif', 'oy penceresinde 1 en ağır');
    eq(t.$$('.modal .zs svg.chili').length + t.$$('.modal .zs svg.books').length, 10, 'her seçenekte çizim');
    t.$('.modal input[name=z][value="1"]').checked = true; t.$('.modal input[name=y][value="5"]').checked = true;
    t.$('.modal form').dispatchEvent(new t.w.Event('submit', { cancelable: true, bubbles: true })); await t.wait(150);
    eq(JSON.stringify([t.store.get('users/' + t.me).zor.CSE211.z, t.store.get('users/' + t.me).zor.CSE211.y]), '[5,1]', 'puan 1 → derece 5, puan 5 → derece 1');
    eq(t.text('.zor-card .dol-z .dol-num'), '1,3/5', 'üç oyla zorluk puanı');
    t.$('[data-g=zor]').click(); await t.wait(60);
    ok(t.$('.modal input[name=z][value="1"]').checked && t.$('.modal input[name=y][value="5"]').checked, 'kendi oyu puan olarak seçili gelir');
    t.$('.modal [data-close]').click(); await t.wait(40);
    // not isteği: tür yok, kısa açıklama yeter; aynı istek ikinci kez açılmaz
    { const b = t.$('[data-g=req-new]'); b.click(); await t.wait(60);
      ok(!t.$('.modal input[name=rk]') && !/Vize notu|Final notu|Konu özeti|Çıkmış sorular/.test(t.text('.modal')), 'istek penceresinde tür seçimi yok');
      t.$('#rq-text').value = '  3. hafta,   bağlı listeler ';
      const r0 = t.store.count('requests');
      t.$('.modal form').dispatchEvent(new t.w.Event('submit', { cancelable: true, bubbles: true })); await t.wait(150);
      eq(t.store.count('requests'), r0 + 1, 'istek kaydedildi');
      const rq = [...t.store.docs.entries()].filter(([p]) => p.startsWith('requests/')).map(([, d]) => d).find(d => d.text === '3. hafta, bağlı listeler');
      ok(rq && !('kind' in rq), 'istekte tür alanı yok, açıklama toparlandı');
      ok(/3\. hafta, bağlı listeler/.test(t.text('.reqbox .req-top b')), 'istek açıklamasıyla listede');
      t.$('[data-g=req-new]').click(); await t.wait(60);
      t.$('#rq-text').value = '3. HAFTA, bağlı listeler';
      t.$('.modal form').dispatchEvent(new t.w.Event('submit', { cancelable: true, bubbles: true })); await t.wait(120);
      ok(/aynı isteğin zaten açık/.test(t.text('.modal .err')) && t.store.count('requests') === r0 + 1, 'aynı istek ikinci kez açılmaz');
      t.$('.modal [data-close]').click(); await t.wait(40); }
    // eski türlü istek de türsüz görünür
    t.store.put('requests/eski-1', { cid: 'CSE211', kind: 'vize', text: '', by: 'zz-a', at: Date.now() - 1000, plus: {}, done: false, nid: '', doneBy: '', doneAt: 0 });
    await t.wait(120);
    ok(!/Vize notu|Final notu|Konu özeti|Çıkmış sorular/.test(t.text('.reqbox')) && /Not isteği/.test(t.text('.reqbox')), 'eski türlü istek “Not isteği” olarak görünür');
    await t.go('#/paylas?ders=CSE211&istek=eski-1'); await t.wait(800);
    ok(/CSE 211 dersinden not istiyor/.test(t.text('.req-banner')) && !/vize/i.test(t.text('.req-banner')), 'paylaşma afişinde tür yok: ' + t.text('.req-banner'));
    await t.go('#/');
    ok(!/Vize notu|Final notu|Konu özeti|Çıkmış sorular/.test(t.text('#main')), 'ana sayfada istek türü yazmıyor');
    noErr(t, 'form, DersÖlçer ve istek');
  }

  console.log('19) ring, tema düğmesi, kırmızı not istekleri, bölüm sırası');
  {
    const t = await asStudent();
    t.w.localStorage.setItem('yw:welcomed:' + t.me, 'true');
    await t.go('#/'); await t.wait(120);
    const ring = t.$('.home-main > .hm-ring');
    ok(ring && ring.querySelector('svg.rg') && ring.getAttribute('aria-hidden') === 'true', 'ana sayfada ring şeridi');
    eq(t.$$('.hm-ring .rg-signt').map(e => e.textContent).join(), 'Kapı,Hukuk,Yurtlar', 'geniş çizimde üç durak');
    ok(t.text('.hm-ring .rg-bus .rg-txt') === 'RİNG' && !/yeditepe/i.test(t.$('.hm-ring').innerHTML), 'ringin yanında RİNG yazar, üniversitenin adı yok');
    ok(t.$$('.hm-ring .rg-spin').length === 2 && t.$('.hm-ring .rg-door-l') && t.$('.hm-ring .rg-water') && t.$$('.hm-ring .rg-w.lit').length > 0, 'tekerler, kapı, havuz, gece yanan pencereler');
    { const ids = t.$$('.hm-ring [id]').map(e => e.id); ok(ids.length > 5 && new Set(ids).size === ids.length, 'çizim kimlikleri tek'); }
    ok(/^translate\([\d.]+ [\d.]+\) rotate\(-?[\d.]+\) scale\(-?[\d.]+ [\d.]+\)$/.test(t.$('.hm-ring .rg-bus').getAttribute('transform')), 'ring yolun üstünde, eğime göre: ' + t.$('.hm-ring .rg-bus').getAttribute('transform'));
    eq(t.ev("ringGeo(360).stops.map(s => s.name).join()"), 'Kapı,Hukuk', 'dar ekranda Kapı ve Hukuk');
    ok(t.ev("(() => { const g = ringGeo(1100); return g.ry(1100) < g.ry(0) && g.H === 220 && ringGeo(360).H === 190; })()"), 'yol kapıdan yurtlara yokuş çıkar');
    ok(/grid-template-areas:"lead" "notes" "ring"/.test(t.ev("[...document.querySelectorAll('style')].map(x => x.textContent).join('')")) && /\.hm-notes \.ncards>li:nth-child\(n\+5\)\{display:none\}/.test(t.ev("[...document.querySelectorAll('style')].map(x => x.textContent).join('')")), 'telefonda önce sıralama, sonra 4 not');
    // tema: sağ üstte güneş, tıklayınca ay
    const tb = t.$('.topbar [data-g=theme]');
    ok(tb && tb.querySelector('.tt-sun') && tb.querySelector('.tt-moon') && !t.$('footer [data-g=theme]') && !t.$('.theme-btn'), 'tema düğmesi üst çubukta, alt menüde yok');
    ok(!tb.classList.contains('is-dark') && tb.getAttribute('aria-pressed') === 'false' && /Gece/.test(tb.getAttribute('aria-label')), 'başta güneş');
    tb.click(); await t.wait(30);
    ok(t.w.document.documentElement.getAttribute('data-theme') === 'dark' && tb.classList.contains('is-dark') && tb.getAttribute('aria-pressed') === 'true' && JSON.parse(t.w.localStorage.getItem('yw:theme')) === 'dark', 'tıklayınca ay ve gece teması');
    eq(t.$$('.topbar .top-stars i').length, 12, 'üst çubukta yıldızlar');
    tb.click(); await t.wait(30);
    ok(t.w.document.documentElement.getAttribute('data-theme') === 'light' && !tb.classList.contains('is-dark'), 'yeniden güneş');
    ok(!t.$('.nav [data-nav=hakkinda]') && t.$$('footer.foot a').some(x => x.textContent === 'Hakkında' && x.getAttribute('href') === '#/hakkinda'), 'Hakkında üst menüde değil, altta');
    // not istekleri: kırmızı kart, parıltılar, yukarı oklu düğme
    t.store.put('requests/rq-19', { cid: 'CSE211', kind: 'genel', text: 'Vize özeti', why: '', by: 'zz-b', at: Date.now(), plus: { a: true }, done: false, nid: '', doneBy: '', doneAt: 0 });
    await t.wait(120);
    ok(t.$$('.req-card .rq-spark i').length >= 10, 'not istekleri kutusunda parıltılar');
    { const b = t.$('.rq-line[data-id="rq-19"] .rq-up');
      ok(b && b.querySelector('svg.up-arr') && b.querySelector('.rq-n') && t.text('.rq-line[data-id="rq-19"] .rq-n') === '2' && !/\+/.test(b.textContent), 'düğmede yukarı ok ve sayı, artı yok');
      b.click(); await t.wait(150); }
    ok(t.text('.rq-line[data-id="rq-19"] .rq-n') === '3' && t.$('.rq-line[data-id="rq-19"] .rq-up.on.go'), 'katılınca sayı arttı, ok fırladı');
    t.ev("S.db.doc('requests/rq-19').delete()"); await t.wait(60);
    // kullanıcı kartı ve profil: iki sıranın altında bölüm sırası
    t.ev('openUserCard(S.me)'); await t.wait(40);
    { const d = t.text('.modal .uc-dept') || '', rv = t.$$('.modal .uc-rank .uc-rv').map(x => x.textContent);
      ok(/Bilgisayar Mühendisliği (bölümünde (bu dönem|tüm zamanlarda) \d\.|sıralamasında #\d+)/.test(d), 'kartta bölüm sırası: ' + d);
      ok(rv.length === 2 && rv.every(v => /^(#\d+|[123]\.)$/.test(v)), 'ilk üç dışında #N: ' + rv.join(' ')); }
    t.$('.modal [data-close]').click(); await t.wait(30);
    await t.go('#/profil'); await t.wait(80);
    ok(/Bilgisayar Mühendisliği/.test(t.text('.pf-kubbe .pf-k-dept') || '') && t.$$('.pf-kubbe .pf-k-rank b').every(b => /^(#\d+|[123]\. sıra)$/.test(b.textContent)), 'profildeki kubbede bölüm sırası: ' + t.text('.pf-kubbe'));
    t.ev(`(() => { const all = boardList('all', 'bilgisayar-muhendisligi'); return all.length; })()`);
    noErr(t, 'ring, tema, istekler ve bölüm sırası');
  }

  console.log(`\n${pass} geçti, ${fail} kaldı`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('TEST ÇÖKTÜ', e); process.exit(2); });
