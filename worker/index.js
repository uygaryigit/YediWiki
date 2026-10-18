// YediWiki Worker. Statik dosyalar (dist/) doğrudan sunulur; Worker yalnızca dosyası olmayan adreslerde çalışır:
//   /ders/<kod>  index.html'i dersin başlığı, açıklaması, canonical bağlantısı ve önizlemesiyle (not başlıkları) yazarak döner.
//                Arama motorları dersi bu adreste bulur; uygulama da aynı adresten dersi açar (app.js pathRoute).
//   diğerleri    404 sayfası.
// Notlar Supabase'den herkese açık anahtarla okunur (okuma zaten herkese açık); sonuç her veri merkezinde 15 dakika önbellekte durur.
import D from '../build/seo-data.json';
import { parseCode, courseOf, courseMeta, courseBody, visibleNotes, coursePath, notFoundHtml } from './seo.js';

const EDGE_TTL = 900;
const SEC_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'
};

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('İzin verilmeyen istek', { status: 405, headers: { Allow: 'GET, HEAD' } });
    const m = /^\/ders\/([^/]*)\/?$/.exec(url.pathname);
    if (m) return coursePage(req, env, ctx, url, m[1]);
    if (url.pathname === '/ders' || url.pathname === '/ders/') return Response.redirect(url.origin + '/#/dersler', 302);
    return notFound(req, url, '');
  }
};

function notFound(req, url, code) {
  const h = new Headers(SEC_HEADERS);
  h.set('Content-Type', 'text/html; charset=utf-8');
  h.set('Cache-Control', 'public, max-age=300');
  h.set('X-Robots-Tag', 'noindex');
  return new Response(req.method === 'HEAD' ? null : notFoundHtml(D.site, code), { status: 404, headers: h });
}

async function coursePage(req, env, ctx, url, raw) {
  let dec = raw;
  try { dec = decodeURIComponent(raw); } catch (e) { /* olduğu gibi */ }
  const pc = parseCode(dec);
  if (!pc || !courseOf(D, pc.id)) return notFound(req, url, pc ? pc.id : '');
  const path = coursePath(pc.id);
  if (url.pathname !== path) return Response.redirect(url.origin + path + url.search, 301);

  const cache = caches.default;
  const key = new Request(url.origin + path + '?v=' + D.v);
  let res = await cache.match(key);
  if (!res) {
    const notes = await readNotes(pc.id);
    const page = await env.ASSETS.fetch(new Request(url.origin + '/'));
    if (!page.ok) return page;
    const meta = courseMeta(D, pc.id, notes ? visibleNotes(notes, pc.id).length : 0);
    const body = courseBody(D, pc.id, notes);
    const out = new HTMLRewriter()
      .on('title', { element(e) { e.setInnerContent(meta.title); } })
      .on('meta[name="description"]', { element(e) { e.setAttribute('content', meta.desc); } })
      .on('meta[property="og:title"]', { element(e) { e.setAttribute('content', meta.title); } })
      .on('meta[property="og:description"]', { element(e) { e.setAttribute('content', meta.desc); } })
      .on('meta[property="og:url"]', { element(e) { e.setAttribute('content', meta.canon); } })
      .on('link[rel="canonical"]', { element(e) { e.setAttribute('href', meta.canon); } })
      .on('main#main', { element(e) { e.setInnerContent(body, { html: true }); } })
      .transform(page);
    const h = new Headers(SEC_HEADERS);
    h.set('Content-Type', 'text/html; charset=utf-8');
    h.set('Cache-Control', 'public, max-age=' + EDGE_TTL);
    res = new Response(out.body, { status: 200, headers: h });
    if (notes) ctx.waitUntil(cache.put(key, res.clone()));   // notlar okunamadıysa önbelleğe alınmaz, bir sonraki istekte yeniden denenir
  }
  const h = new Headers(res.headers);
  h.set('Cache-Control', 'public, max-age=0, must-revalidate');   // tarayıcı her seferinde sorar; önbellek Cloudflare'de
  return new Response(req.method === 'HEAD' ? null : res.body, { status: 200, headers: h });
}

/* Dersin notları: yalnızca gereken alanlar, en çok 200 kayıt, 2,5 saniyede gelmezse null */
async function readNotes(id) {
  if (!D.sb || !D.sb.url || !D.sb.key) return null;
  const q = new URLSearchParams();
  q.set('select', 'id,cid:data->>cid,title:data->>title,type:data->>type,tk:data->>tk,at:data->at,reports:data->reports,ok:data->ok');
  q.set('col', 'eq.notes');
  q.set('data->>cid', 'eq.' + id);
  q.set('order', 'updated_at.desc');
  q.set('limit', '200');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 2500);
  try {
    const r = await fetch(D.sb.url + '/rest/v1/docs?' + q.toString(), { headers: { apikey: D.sb.key, Accept: 'application/json' }, signal: ctl.signal });
    if (!r.ok) return null;
    const rows = await r.json();
    return Array.isArray(rows) ? rows : null;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
