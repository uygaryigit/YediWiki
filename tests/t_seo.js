// Arama motorları ve yasal sayfalar: node tests/t_seo.js (önce npm run build)
// Derlemenin ürettiği site haritası, robots.txt, worker verisi ve yasal sayfalar; worker/seo.js'in başlık, açıklama ve önizleme çıktısı.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const P = (...a) => path.join(ROOT, ...a);
let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) pass++; else { fail++; console.log('  ✗ ' + msg); } };
const eq = (a, b, msg) => ok(a === b, `${msg}: beklenen ${JSON.stringify(b)}, gelen ${JSON.stringify(a)}`);

(async () => {
  const seo = await import(P('worker', 'seo.js'));
  const D = JSON.parse(fs.readFileSync(P('build', 'seo-data.json'), 'utf8'));
  const CAT = JSON.parse(fs.readFileSync(P('data', 'catalog.min.json'), 'utf8'));
  const CFG = JSON.parse(fs.readFileSync(P('site', 'config.json'), 'utf8'));
  const ver = fs.readFileSync(P('dist', 'ver.txt'), 'utf8').trim();

  console.log('1) derleme çıktıları');
  eq(D.v, ver, 'worker verisinin sürümü sayfanınkiyle aynı');
  eq(D.site, 'https://yediwiki.com', 'site adresi');
  ok(D.sb && D.sb.url === CFG.url && /^sb_publishable_/.test(D.sb.key), 'worker yalnızca herkese açık Supabase anahtarını taşır');
  ok(!/service_role|sb_secret_/.test(JSON.stringify(D)), 'worker verisinde gizli anahtar yok');
  eq(Object.keys(D.c).length, Object.keys(CAT.c).length, 'worker tüm dersleri bilir');
  ok(Object.keys(D.p).length >= 60 && Object.values(D.p).every(p => typeof p[0] === 'string' && Array.isArray(p[2])), 'bölüm planları adıyla');
  const sm = fs.readFileSync(P('dist', 'sitemap.xml'), 'utf8');
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  eq(locs.length, Object.keys(CAT.c).length + 1, 'site haritası: ana sayfa ve her ders');
  ok(locs.includes('https://yediwiki.com/') && locs.includes('https://yediwiki.com/ders/math131') && locs.includes('https://yediwiki.com/ders/cse211'), 'site haritasında ders adresleri küçük harfle');
  ok(locs.every(u => /^https:\/\/yediwiki\.com\/(ders\/[a-z]{2,6}\d{3}[a-z]?)?$/.test(u)), 'site haritasında yalnızca geçerli adresler');
  eq(new Set(locs).size, locs.length, 'site haritasında tekrar yok');
  const rb = fs.readFileSync(P('dist', 'robots.txt'), 'utf8');
  ok(/User-agent: \*/.test(rb) && /Sitemap: https:\/\/yediwiki\.com\/sitemap\.xml/.test(rb) && !/Disallow: \/\s*$/m.test(rb), 'robots.txt site haritasını gösterir, siteyi kapatmaz');
  const idx = fs.readFileSync(P('dist', 'index.html'), 'utf8');
  for (const s of ['<title>YediWiki: Yeditepe Ders Notları, Çıkmış Sınavlar ve Hoca Yorumları</title>', '<meta name="description" content="Yeditepe öğrencilerinin paylaştığı ders notları', '<meta property="og:title"', '<meta property="og:url"', '<link rel="canonical" href="https://yediwiki.com/">', '<main id="main" tabindex="-1"></main>'])
    ok(idx.includes(s), 'ana sayfanın başlığı ve worker\'ın değiştirdiği öğeler: ' + s);
  { const m = /<script type="application\/ld\+json">([^<]+)<\/script>/.exec(idx); let ld = null; try { ld = m && JSON.parse(m[1]); } catch (e) { ld = null; }
    ok(ld && ld['@type'] === 'WebSite' && ld.name === 'YediWiki' && ld.url === 'https://yediwiki.com/' && ld.alternateName.includes('Yedi Wiki'), 'site adı yapılandırılmış veride (WebSite)'); }
  ok(!fs.readFileSync(P('build', 'artifact.html'), 'utf8').includes('application/ld+json'), 'claude.ai sürümünde yapılandırılmış veri yok');
  const hd = fs.readFileSync(P('dist', '_headers'), 'utf8');
  ok(/\/sitemap\.xml\n  Cache-Control: public, max-age=3600/.test(hd), 'site haritası bir saat önbellekte');
  const wr = fs.readFileSync(P('wrangler.jsonc'), 'utf8');
  ok(/"main": "worker\/index\.js"/.test(wr) && /"binding": "ASSETS"/.test(wr) && /"directory": "\.\/dist"/.test(wr), 'wrangler: worker ve statik dosyalar');
  const wsrc = fs.readFileSync(P('worker', 'index.js'), 'utf8');
  ok(wsrc.includes("from '../build/seo-data.json'") && wsrc.includes('HTMLRewriter') && /cache\.put/.test(wsrc), 'worker sayfayı yazar ve önbelleğe alır');

  console.log('2) yasal sayfalar');
  const kv = fs.readFileSync(P('dist', 'kvkk.html'), 'utf8'), ko = fs.readFileSync(P('dist', 'kosullar.html'), 'utf8'), gz = fs.readFileSync(P('dist', 'gizlilik.html'), 'utf8');
  for (const [s, msg] of [['Veri sorumlusu', 'veri sorumlusu'], ['m.5/2-c', 'hukuki sebepler'], ['KVKK’nın 9. maddesi', 'yurt dışı aktarım'], ['Hakların (KVKK m.11)', 'ilgili kişinin hakları'], ['30 gün', 'başvuru süresi'], ['iletisim@yediwiki.com', 'başvuru adresi'], ['Akademik kadro', 'hocalar hakkında bilgi'], ['<link rel="canonical" href="https://yediwiki.com/kvkk">', 'canonical']])
    ok(kv.includes(s), 'KVKK metni: ' + msg);
  for (const [s, msg] of [['Kaldırma talebi', 'kaldırma talebi'], ['24 saat', 'kişilik hakkı yanıt süresi'], ['5651', '5651 sayılı Kanun'], ['Kubbe', 'kubbe'], ['resmî bir bağı yoktur', 'bağımsızlık notu'], ['href="/kvkk"', 'KVKK bağlantısı']])
    ok(ko.includes(s), 'kullanım koşulları: ' + msg);
  ok(gz.includes('href="/kvkk"') && gz.includes('href="/kosullar"') && gz.includes('arama motorlarında'), 'gizlilik sayfası yeni sayfalara ve önizlemeye değinir');
  const emoji = /\p{Extended_Pictographic}/u;
  for (const [n, s] of [['kvkk', kv], ['kosullar', ko], ['gizlilik', gz]]) ok(!emoji.test(s.replace(/[▲▼]/g, '')), 'emoji yok: ' + n);

  console.log('3) ders başlığı, açıklaması ve önizlemesi');
  eq(JSON.stringify(seo.parseCode('math-131')), JSON.stringify({ id: 'MATH131', code: 'MATH 131' }), 'kod: tireli');
  eq(seo.parseCode('Math 131').id, 'MATH131', 'kod: boşluklu');
  eq(seo.parseCode('ders'), null, 'kod değil');
  eq(seo.coursePath('CSE211'), '/ders/cse211', 'adres küçük harf');
  const notes = [
    { id: 'n1', cid: 'MATH131', title: 'Vize <script>alert(1)</script>', type: 'sinav', tk: 20251, at: 20 },
    { id: 'n2', cid: 'MATH131', title: 'Limit özeti', type: 'not', tk: 20252, at: 30 },
    { id: 'n3', cid: 'MATH131', title: 'Bildirilen', type: 'not', at: 40, reports: { a: 9, b: 9, c: 9 }, ok: 1 },
    { id: 'n4', cid: 'MATH131', title: 'Onaylanan', type: 'not', at: 10, reports: { a: 9, b: 9, c: 9 }, ok: 99 },
    { id: 'n5', cid: 'PHYS101', title: 'Başka ders', at: 50 },
    { id: 'n6', cid: 'MATH131', title: '  ', at: 60 }
  ];
  const vis = seo.visibleNotes(notes, 'MATH131');
  eq(vis.map(n => n.id).join(), 'n2,n1,n4', 'görünen notlar: gizlenen, başka dersin ve başlıksız olan yok, en yenisi başta');
  const mt = seo.courseMeta(D, 'MATH131', vis.length);
  eq(mt.title, 'MATH 131 Kalkülüs I Ders Notları · Yeditepe | YediWiki', 'başlık');
  ok(/^Yeditepe Üniversitesi MATH 131 Kalkülüs I ders notları ve çıkmış sınavlar \(3 not\), 6 AKTS, 4 kredi\./.test(mt.desc), 'açıklama: ' + mt.desc);
  eq(mt.canon, 'https://yediwiki.com/ders/math131', 'canonical');
  ok(!/\(0 not\)/.test(seo.courseMeta(D, 'MATH131', 0).desc), 'notu olmayan derste sayı yazmaz');
  const body = seo.courseBody(D, 'MATH131', notes);
  ok(body.startsWith('<div data-ssr="MATH131">') && body.endsWith('</div>'), 'önizleme data-ssr kutusunda');
  ok(/<h1>Kalkülüs I<\/h1>/.test(body) && body.includes('MATH 131'), 'önizlemede dersin adı ve kodu');
  ok(!body.includes('<script>') && body.includes('&lt;script&gt;'), 'not başlığı kaçırılır');
  ok(body.includes('href="/#/not/n2"') && !body.includes('Bildirilen') && body.includes('Onaylanan'), 'not bağlantıları; gizlenen not yok');
  ok(/<b>3<\/b> not/.test(body) && /<b>1<\/b> çıkmış sınav/.test(body), 'not ve çıkmış sınav sayısı');
  ok(body.includes('Bilgisayar Mühendisliği') && body.includes('1. sınıf Güz'), 'dersin olduğu bölüm planları');
  ok(/href="\/ders\/[a-z]+\d{3}[a-z]?"/.test(body), 'aynı dönemin derslerine bağlantı');
  ok(!/<a [^>]*href="\/ders\/math131"/.test(body), 'kendine bağlantı vermez');
  const empty = seo.courseBody(D, 'MATH131', []);
  ok(empty.includes('henüz not paylaşılmadı') && /<b>0<\/b> not/.test(empty), 'notu olmayan ders');
  const nodb = seo.courseBody(D, 'MATH131', null);
  ok(!nodb.includes('head-facts') && !nodb.includes('henüz not') && nodb.includes('<h1>'), 'notlar okunamazsa sayı yazılmaz');
  eq(seo.courseBody(D, 'XYZ999', []), '', 'katalogda olmayan ders');
  const nf = seo.notFoundHtml(D.site, 'XYZ999');
  ok(nf.includes('noindex') && nf.includes('XYZ 999') && nf.includes('/#/ders/XYZ999'), '404 sayfası: noindex ve sitede açma bağlantısı');
  ok(!emoji.test(body + nf), 'önizlemede emoji yok');

  console.log(`\n${pass} geçti, ${fail} kaldı`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('  ✗ beklenmeyen hata: ' + (e && e.stack || e)); process.exit(1); });
