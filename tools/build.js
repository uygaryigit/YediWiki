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
const cat = read(P('data', 'catalog.min.json')); JSON.parse(cat);
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
const conf = 'window.YW_SUPA=' + JSON.stringify({ url: cfg.url, key: cfg.key }) + ';';
const desc = 'Yeditepe öğrencileri için ders notları, bölüm ders planları, HocaÖlçer ve Kubbe.';
const icon = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 30%22%3E%3Cpath d=%22M4 26a16 15 0 0 1 32 0z%22 fill=%22%23FFD23F%22 stroke=%22%23111C4E%22 stroke-width=%222.5%22/%3E%3Cpath d=%22M20 11V5%22 stroke=%22%23111C4E%22 stroke-width=%222.5%22 stroke-linecap=%22round%22/%3E%3Ccircle cx=%2220%22 cy=%224%22 r=%222.5%22 fill=%22%23FFD23F%22 stroke=%22%23111C4E%22 stroke-width=%222%22/%3E%3C/svg%3E';
const headExtra =
  `<meta name="description" content="${desc}">\n` +
  '<meta name="theme-color" content="#111C4E">\n' +
  '<meta property="og:title" content="YediWiki">\n' +
  `<meta property="og:description" content="${desc}">\n` +
  '<meta property="og:type" content="website">\n' +
  `<meta property="og:url" content="${cfg.siteUrl || ''}">\n` +
  `<link rel="canonical" href="${cfg.siteUrl || ''}">\n` +
  `<link rel="icon" href="${icon}">\n`;
let pre = parts['pre.html'];
must(count(pre, '<title>YediWiki</title>') === 1, 'pre.html başlığı');
pre = pre.replace('<title>YediWiki</title>', () => '<title>YediWiki</title>\n' + headExtra);
const cut = mid.trimEnd().lastIndexOf('<script>');
const siteMid = mid.slice(0, cut) + '<script id="yw-sb">' + jsSafe(umd) + '</script>\n<script>' + jsSafe(supa) + '</script>\n<script>' + conf + '</script>\n<script>';
const site = pre + parts['style.css'] + siteMid + parts['app.js'] + parts['post.html'];

// dist/ yayımlanır (yalnızca site); claude.ai sürümü build/ altına
fs.rmSync(P('dist'), { recursive: true, force: true });
fs.mkdirSync(P('dist'), { recursive: true });
fs.mkdirSync(P('build'), { recursive: true });
fs.writeFileSync(P('dist', 'index.html'), site);
fs.writeFileSync(P('dist', '_headers'), [
  '/*',
  '  X-Content-Type-Options: nosniff',
  '  Referrer-Policy: strict-origin-when-cross-origin',
  '  X-Frame-Options: DENY',
  '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()',
  ''].join('\n'));
fs.writeFileSync(P('build', 'artifact.html'), artifact);
console.log('dist/index.html', Buffer.byteLength(site), 'bayt; build/artifact.html', Buffer.byteLength(artifact), 'bayt');
const i = process.argv.indexOf('--artifact-out');
if (i > 0 && process.argv[i + 1]) { fs.writeFileSync(process.argv[i + 1], artifact); console.log('->', process.argv[i + 1]); }
