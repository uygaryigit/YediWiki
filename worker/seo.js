// Ders sayfalarının arama motoru önizlemesi: başlık, açıklama ve sayfaya gömülen içerik.
// Worker (worker/index.js) bunları /ders/<kod> adresinde index.html'in içine yazar; uygulama açılınca aynı dersi kendisi çizer.
// Başlık ve açıklama biçimi site/app.js'teki courseMeta ile aynı tutulur (tests/t_seo.js karşılaştırır).
// D = build/seo-data.json: { v, site, sb: {url, key}, f: [fakülte], c: {KOD: [ad, akts, kredi, fakülte sırası]}, p: {slug: [ad, yıllık, [[dönem, [kod]]]]} }

export const REPORT_LIMIT = 3;   // app.js ile aynı: bu kadar bildirim alan not gizlenir
const TERM_NAMES = { 1: 'Güz', 2: 'Bahar', 3: 'Yaz' };
const TR = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u', 'Ç': 'c', 'Ğ': 'g', 'I': 'i', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u', 'Â': 'a', 'Î': 'i', 'Û': 'u' };

export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function fold(s) {
  return String(s || '').replace(/[çğıöşüâîûÇĞIİÖŞÜÂÎÛ]/g, c => TR[c] || c).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
/* "math-131", "MATH 131", "math131" -> { id: 'MATH131', code: 'MATH 131' } (app.js parseCode ile aynı) */
export function parseCode(raw) {
  const s = fold(raw).replace(/\s+/g, '');
  const m = /^([a-z]{2,6})(\d{3}[a-z]?)$/.exec(s);
  if (!m) return null;
  const L = m[1].toUpperCase(), N = m[2].toUpperCase();
  return { id: L + N, code: L + ' ' + N };
}
export const codeOf = id => String(id || '').replace(/^([A-Z]+)(\d)/, '$1 $2');
export const coursePath = id => '/ders/' + String(id || '').toLowerCase();
const fmtKr = v => String(Math.round(v * 10) / 10).replace('.', ',');
function termLabel(tk) { tk = +tk; if (!tk) return ''; const y = Math.floor(tk / 10), k = tk % 10; return `${y}-${y + 1} ${TERM_NAMES[k] || ''}`.trim(); }
const semLabel = (yillik, sn) => (yillik ? `${sn}. sınıf` : `${Math.ceil(sn / 2)}. sınıf ${sn % 2 ? 'Güz' : 'Bahar'}`);

export function courseOf(D, id) {
  const a = D && D.c ? D.c[id] : null;
  if (!a) return null;
  return { id, code: codeOf(id), name: String(a[0] || '').trim(), ects: +a[1] || 0, kr: a[2] == null ? null : +a[2], fak: (D.f || [])[a[3]] || '' };
}

const reportCount = o => { const ok = +((o && o.ok) || 0); return Object.values((o && o.reports) || {}).filter(t => typeof t === 'number' && t > ok).length; };
/* Dersin görünen notları (gizlenenler hariç), en yenisi başta */
export function visibleNotes(notes, id) {
  return (Array.isArray(notes) ? notes : [])
    .filter(n => n && typeof n === 'object' && n.cid === id && typeof n.title === 'string' && n.title.trim() && reportCount(n) < REPORT_LIMIT)
    .sort((a, b) => (+b.at || 0) - (+a.at || 0));
}

export function courseMeta(D, id, notes) {
  const c = courseOf(D, id) || { code: codeOf(id), name: '', ects: 0, kr: null };
  const site = (D && D.site) || 'https://yediwiki.com';
  const title = `${c.code}${c.name ? ' ' + c.name : ''} Ders Notları · Yeditepe | YediWiki`;
  const bits = [c.ects ? c.ects + ' AKTS' : '', c.kr != null ? fmtKr(c.kr) + ' kredi' : ''].filter(Boolean).join(', ');
  const desc = `Yeditepe Üniversitesi ${c.code}${c.name ? ' ' + c.name : ''} ders notları ve çıkmış sınavlar${notes ? ` (${notes} not)` : ''}${bits ? ', ' + bits : ''}. Öğrencilerin paylaştığı notlar, hoca puanları ve ders yorumları YediWiki’de.`;
  return { title, desc, canon: site + coursePath(id) };
}

/* Dersin bulunduğu bölüm planları ve aynı dönemin diğer dersleri */
export function plansOf(D, id) {
  const out = [];
  for (const slug of Object.keys((D && D.p) || {})) {
    const [ad, yillik, sems] = D.p[slug];
    const hit = (sems || []).filter(([, ids]) => Array.isArray(ids) && ids.includes(id));
    if (hit.length) out.push({ slug, ad, sems: hit.map(([n]) => semLabel(yillik, n)), mates: hit.flatMap(([, ids]) => ids) });
  }
  return out.sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
}
function relatedOf(D, id, plans, max = 12) {
  const seen = new Set([id]), out = [];
  for (const p of plans) for (const x of p.mates) {
    if (out.length >= max) return out;
    if (seen.has(x) || !D.c[x]) continue;
    seen.add(x); out.push(x);
  }
  return out;
}

/* /ders/<kod> sayfasında #main içine yazılan önizleme. Sınıflar sitenin kendi stilinden; uygulama açılınca yerini gerçek sayfa alır.
   notes: veritabanından gelen notlar (null: okunamadı, bölüm yazılmaz). Paylaşanların adı yazılmaz. */
export function courseBody(D, id, notes) {
  const c = courseOf(D, id);
  if (!c) return '';
  const list = notes ? visibleNotes(notes, id) : null;
  const exams = list ? list.filter(n => n.type === 'sinav').length : 0;
  const facts = [c.fak, c.kr != null ? fmtKr(c.kr) + ' kredi' : '', c.ects ? c.ects + ' AKTS' : ''].filter(Boolean).join(', ');
  const plans = plansOf(D, id), rel = relatedOf(D, id, plans);
  const noteLi = n => `<li class="note-row"><div class="note-body"><div class="note-line"><span class="kind kind-${n.type === 'sinav' ? 'sinav' : 'not'}">${n.type === 'sinav' ? 'Çıkmış sınav' : 'Ders notu'}</span></div>`
    + `<a class="note-title" href="/#/not/${esc(encodeURIComponent(String(n.id || '')))}">${esc(String(n.title).trim().slice(0, 160))}</a>`
    + (n.tk ? `<div class="meta"><span>${esc(termLabel(n.tk))}</span></div>` : '') + '</div></li>';
  let notesHtml = '';
  if (list && list.length) notesHtml = `<ul class="list ssr-list">${list.slice(0, 30).map(noteLi).join('')}</ul>` + (list.length > 30 ? `<p class="fine">ve ${list.length - 30} not daha</p>` : '');
  else if (list) notesHtml = `<div class="empty"><h3>Bu derse henüz not paylaşılmadı</h3><p>Notun varsa Google Drive bağlantısıyla paylaş; isteyen arkadaşlarına ulaşsın, sen de kubbe kazan.</p></div>`;
  return `<div data-ssr="${esc(id)}">`
    + `<section class="page-head"><div class="wrap"><a class="crumb" href="/#/dersler">Dersler</a>`
    + `<div class="course-top"><div class="course-info"><div class="course-head"><span class="code code-xl">${esc(c.code)}</span><div><h1>${esc(c.name || c.code)}</h1>${facts ? `<p class="muted">${esc(facts)}</p>` : ''}</div></div>`
    + (list ? `<p class="head-facts"><span><b>${list.length}</b> not</span>${exams ? `<span><b>${exams}</b> çıkmış sınav</span>` : ''}</p>` : '')
    + `</div></div></div></section>`
    + `<div class="wrap"><div class="panel">`
    + `<h2 class="sub-h">${esc(c.code)} ders notları ve çıkmış sınavlar</h2>${notesHtml}`
    + `<p class="fine">YediWiki, Yeditepe öğrencilerinin kendi notlarını Google Drive bağlantısıyla paylaştığı bağımsız bir topluluk sitesidir; Yeditepe Üniversitesi ile resmî bir bağı yoktur. Notları açmak, ders yorumlarını ve HocaÖlçer puanlarını görmek için okul e-postanla giriş yap.</p>`
    + (plans.length ? `<div class="ssr-more"><h2 class="sub-h">${esc(c.code)} hangi bölümlerin ders planında?</h2><ul class="ssr-tags">${plans.slice(0, 24).map(p => `<li>${esc(p.ad)} <span>${esc(p.sems.join(', '))}</span></li>`).join('')}</ul></div>` : '')
    + (rel.length ? `<div class="ssr-more"><h2 class="sub-h">Aynı dönemin diğer dersleri</h2><ul class="ssr-tags">${rel.map(x => { const r = courseOf(D, x); return `<li><a href="${esc(coursePath(x))}">${esc(r.code)}</a> ${esc(r.name)}</li>`; }).join('')}</ul></div>` : '')
    + `</div></div></div>`;
}

export function notFoundHtml(site, code) {
  const pc = code ? parseCode(code) : null;
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Sayfa bulunamadı · YediWiki</title>`
    + `<style>:root{color-scheme:light dark}body{margin:0;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#F3F5FA;color:#111C4E}@media (prefers-color-scheme:dark){body{background:#0B1030;color:#E9EDFB}a{color:#8FA5FF}}main{max-width:560px;margin:12vh auto;padding:0 16px}h1{font-size:1.8rem;line-height:1.2;margin:0 0 8px}a{color:#2447D5}</style></head>`
    + `<body><main><h1>Bu sayfa yok</h1><p>Aradığın sayfa YediWiki’de bulunamadı.${pc ? ` ${esc(pc.code)} kataloğumuzda görünmüyor; ders sonradan eklendiyse <a href="/#/ders/${esc(pc.id)}">sitede aç</a>.` : ''}</p><p><a href="${esc(site || '/')}">Ana sayfaya dön</a></p></main></body></html>`;
}
