#!/usr/bin/env node
// YediWiki derlemesi: tek dosyalık iki sayfa üretir.
//   dist/index.html     gerçek site (Supabase): supabase-js, bağdaştırıcı (site/supa.js) ve ayar (site/config.json) sayfaya gömülü
//   build/artifact.html claude.ai sürümü (window.claude veritabanı); yayımlanmaz
// Ders kataloğu (data/catalog.min.json) ve akademik kadro (data/kadro.min.json) ikisine de gömülür.
// Kullanım: node tools/build.js [--artifact-out YOL]
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const P = (...a) => path.join(ROOT, ...a);
const read = p => fs.readFileSync(p, 'utf8');
const must = (c, msg) => { if (!c) throw new Error(msg); };
// gömülen betikte </script> kapanışı ve HTML yorum başlangıcı olmasın
const jsSafe = s => s.split('</script').join('<\\/script').split('<!--').join('<\\!--');
const count = (s, sub) => s.split(sub).length - 1;

const parts = {};
for (const f of ['pre.html', 'style.css', 'mid.html', 'app.js', 'post.html']) parts[f] = read(P('site', f));
// Ders kataloğu + bölümlerin adı, fakültesi ve öğretim dili (tam katalogdan): bölümler veritabanına bağlı kalmadan her yerde görünür
const catMin = JSON.parse(read(P('data', 'catalog.min.json')));
{
  const full = JSON.parse(read(P('data', 'catalog.json')));
  const pl = full.planlar || {}, bf = [];
  catMin.b = {};
  for (const slug of Object.keys(pl)) {
    const x = pl[slug]; if (!x || !x.ad) continue;
    let i = bf.indexOf(x.fakulte || ''); if (i < 0) { bf.push(x.fakulte || ''); i = bf.length - 1; }
    catMin.b[slug] = [x.ad, i, x.dil_akts || ''];
  }
  catMin.bf = bf;
  must(Object.keys(catMin.b).length >= 60, 'katalogda bölüm adları');
}
const cat = JSON.stringify(catMin);
const kad = read(P('data', 'kadro.min.json')); JSON.parse(kad);
let mid = parts['mid.html'];
must(count(mid, '<!--KATALOG-->') === 1 && count(mid, '<!--KADRO-->') === 1, 'mid.html yer tutucuları');
mid = mid.replace('<!--KATALOG-->', () => '<script type="application/json" id="yw-katalog">' + cat.split('<').join('\\u003c') + '</script>');
mid = mid.replace('<!--KADRO-->', () => '<script type="application/json" id="yw-kadro">' + kad.split('<').join('\\u003c') + '</script>');
must(mid.trimEnd().endsWith('<script>'), 'mid.html <script> ile bitmeli');

const artifact = parts['pre.html'] + parts['style.css'] + mid + parts['app.js'] + parts['post.html'];
must(count(artifact, '<script>') === 1, 'artifact: tek satır içi betik');

const cfg = JSON.parse(read(P('site', 'config.json')));
must(/^https:\/\//.test(cfg.url) && /^sb_publishable_/.test(cfg.key), 'yalnızca herkese açık (publishable) anahtar gömülür');
const umd = read(P('node_modules', '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.js'));
const supa = read(P('site', 'supa.js'));
// Google Drive seçici: tarayıcı anahtarı (yalnızca yediwiki.com ve Picker API'ye kısıtlı) ve OAuth istemci kimliği herkese açıktır; gizli anahtar yok
const g = cfg.google || null;
must(!g || (/^AIza[0-9A-Za-z_-]{35}$/.test(g.apiKey) && /^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(g.clientId) && /^\d+$/.test(g.appId) && !('secret' in g) && !('clientSecret' in g)), 'Google ayarı: yalnızca tarayıcı anahtarı, istemci kimliği ve proje numarası');
const conf = 'window.YW_SUPA=' + JSON.stringify({ url: cfg.url, key: cfg.key }) + ';' + (g ? 'window.YW_GOOGLE=' + JSON.stringify({ apiKey: g.apiKey, clientId: g.clientId, appId: g.appId }) + ';' : '');
// Ana sayfanın arama motoru başlığı ve açıklaması (app.js HOME_TITLE / BASE_DESC ile aynı); ders sayfalarında worker kendi başlığını yazar
const HOME_TITLE = 'YediWiki: Yeditepe Ders Notları, Çıkmış Sınavlar ve Hoca Yorumları';
const desc = 'Yeditepe öğrencilerinin paylaştığı ders notları, çıkmış sınavlar, bölüm ders planları ve HocaÖlçer hoca yorumları tek yerde. Ders kodunu yaz, notlara ulaş.';
const siteLd = JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'YediWiki', alternateName: ['Yedi Wiki', 'YediWiki Yeditepe'], url: cfg.siteUrl || 'https://yediwiki.com/', inLanguage: 'tr' });
const icon = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 30%22%3E%3Cpath d=%22M4 26a16 15 0 0 1 32 0z%22 fill=%22%23FFD23F%22 stroke=%22%23111C4E%22 stroke-width=%222.5%22/%3E%3Cpath d=%22M20 11V5%22 stroke=%22%23111C4E%22 stroke-width=%222.5%22 stroke-linecap=%22round%22/%3E%3Ccircle cx=%2220%22 cy=%224%22 r=%222.5%22 fill=%22%23FFD23F%22 stroke=%22%23111C4E%22 stroke-width=%222%22/%3E%3C/svg%3E';
const headExtra =
  `<meta name="description" content="${desc}">\n` +
  '<meta name="theme-color" content="#111C4E">\n' +
  `<meta property="og:title" content="${HOME_TITLE}">\n` +
  '<meta property="og:site_name" content="YediWiki">\n' +
  `<meta property="og:description" content="${desc}">\n` +
  '<meta property="og:type" content="website">\n' +
  `<meta property="og:url" content="${cfg.siteUrl || ''}">\n` +
  `<link rel="canonical" href="${cfg.siteUrl || ''}">\n` +
  `<link rel="icon" href="${icon}">\n` +
  `<script type="application/ld+json">${siteLd}</script>\n`;
let pre = parts['pre.html'];
must(count(pre, '<title>YediWiki</title>') === 1, 'pre.html başlığı');
pre = pre.replace('<title>YediWiki</title>', () => '<title>' + HOME_TITLE + '</title>\n' + headExtra);
const cut = mid.trimEnd().lastIndexOf('<script>');
const siteMid = mid.slice(0, cut) + '<script id="yw-sb">' + jsSafe(umd) + '</script>\n<script>' + jsSafe(supa) + '</script>\n<script>' + conf + 'window.YW_VER="__YWVER__";</script>\n<script>';
const site0 = pre + parts['style.css'] + siteMid + parts['app.js'] + parts['post.html'];
// sürüm: sayfanın özeti. Açık sekmeler /ver.txt ile karşılaştırır, yenisi yayımlanınca bir sonraki geçişte sayfayı yeniler
const ver = require('crypto').createHash('sha256').update(site0).digest('hex').slice(0, 12);
must(count(site0, '__YWVER__') === 1, 'sürüm yer tutucusu');
const site = site0.replace('__YWVER__', ver);

// dist/ yayımlanır (yalnızca site); claude.ai sürümü build/ altına
fs.rmSync(P('dist'), { recursive: true, force: true });
fs.mkdirSync(P('dist'), { recursive: true });
fs.mkdirSync(P('build'), { recursive: true });
fs.writeFileSync(P('dist', 'index.html'), site);
fs.writeFileSync(P('dist', 'ver.txt'), ver + '\n');
for (const f of ['gizlilik.html', 'kvkk.html', 'kosullar.html']) fs.writeFileSync(P('dist', f), read(P('site', f)));

// Arama motorları: her ders /ders/<kod> adresinde (worker/index.js sayfayı dersin başlığı ve önizlemesiyle yazar)
const SITE = String(cfg.siteUrl || 'https://yediwiki.com/').replace(/\/+$/, '');
must(/^https:\/\/[a-z0-9.-]+$/.test(SITE), 'config.json siteUrl');
const courseIds = Object.keys(catMin.c).filter(id => /^[A-Z]{2,6}\d{3}[A-Z]?$/.test(id)).sort();
must(courseIds.length >= 1000, 'site haritası için ders sayısı');
fs.writeFileSync(P('dist', 'robots.txt'), ['User-agent: *', 'Allow: /', '', 'Sitemap: ' + SITE + '/sitemap.xml', ''].join('\n'));
fs.writeFileSync(P('dist', 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + [SITE + '/'].concat(courseIds.map(id => SITE + '/ders/' + id.toLowerCase())).map(u => '  <url><loc>' + u + '</loc></url>').join('\n') + '\n</urlset>\n');
// Worker'ın okuduğu veri (yayımlanmaz): dersler, bölüm planları, Supabase'in herkese açık adresi ve anahtarı
{
  const plans = {};
  for (const slug of Object.keys(catMin.p || {})) {
    const b = catMin.b[slug];
    if (!b) continue;
    plans[slug] = [b[0], catMin.p[slug][0] ? 1 : 0, catMin.p[slug][1].map(([n, ids]) => [n, ids])];
  }
  fs.writeFileSync(P('build', 'seo-data.json'), JSON.stringify({ v: ver, site: SITE, sb: { url: cfg.url, key: cfg.key }, f: catMin.f, c: catMin.c, p: plans }));
}
fs.writeFileSync(P('dist', '_headers'), [
  '/*',
  '  X-Content-Type-Options: nosniff',
  '  Referrer-Policy: strict-origin-when-cross-origin',
  '  X-Frame-Options: DENY',
  '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()',
  '/ver.txt',
  '  Cache-Control: no-store',
  '/sitemap.xml',
  '  Cache-Control: public, max-age=3600',
  ''].join('\n'));
fs.writeFileSync(P('build', 'artifact.html'), artifact);
console.log('dist/index.html', Buffer.byteLength(site), 'bayt; build/artifact.html', Buffer.byteLength(artifact), 'bayt');
const i = process.argv.indexOf('--artifact-out');
if (i > 0 && process.argv[i + 1]) { fs.writeFileSync(process.argv[i + 1], artifact); console.log('->', process.argv[i + 1]); }
