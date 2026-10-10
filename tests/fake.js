// Artifact çalışma zamanının (claude.use('db'|'user'|'downloads')) jsdom içinde sahtesi + sayfa yükleyici.
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const clone = o => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
function deepFreeze(o) { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.values(o).forEach(deepFreeze); } return o; }
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
function merge(dst, src) { for (const k of Object.keys(src)) { const v = src[k]; if (isObj(v) && isObj(dst[k])) merge(dst[k], v); else dst[k] = clone(v); } }
const err = (code, message) => Object.assign(new Error(message || code), { code });

function makeStore(seed = {}) {
  const docs = new Map(Object.entries(clone(seed)));
  const subs = new Set(); const log = [];
  let pending = false, failNext = null;
  const collOf = p => p.split('/').slice(0, -1).join('/'), idOf = p => p.split('/').pop();
  const docSnap = p => { const d = docs.get(p); const fr = d === undefined ? undefined : deepFreeze(clone(d)); return { id: idOf(p), exists: d !== undefined, data: () => fr, metadata: { fromCache: false, hasPendingWrites: false } }; };
  function runQuery(q) {
    let list = [...docs.keys()].filter(p => collOf(p) === q.path).map(docSnap);
    for (const [f, op, v] of q.filters) list = list.filter(s => { const x = s.data()[f]; return op === '==' ? x === v : op === '!=' ? x !== v : op === '<' ? x < v : op === '<=' ? x <= v : op === '>' ? x > v : op === '>=' ? x >= v : op === 'in' ? v.includes(x) : op === 'array-contains' ? Array.isArray(x) && x.includes(v) : true; });
    if (q.order) { const [f, dir] = q.order; list.sort((a, b) => { const x = a.data()[f], y = b.data()[f]; if (x === undefined && y === undefined) return 0; if (x === undefined) return 1; if (y === undefined) return -1; return (x < y ? -1 : x > y ? 1 : 0) * (dir === 'desc' ? -1 : 1); }); }
    else list.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    if (q.lim) list = list.slice(0, q.lim);
    return { docs: list, size: list.length, empty: !list.length, docChanges: () => [], metadata: { fromCache: false, hasPendingWrites: false } };
  }
  function fire() { pending = false; for (const s of [...subs]) { try { s.cb(s.q ? runQuery(s.q) : docSnap(s.path)); } catch (e) { console.error('abone hatası', e); } } }
  const notify = () => { if (!pending) { pending = true; setTimeout(fire, 0); } };
  const checkPath = (p, even) => { const seg = String(p).split('/'); if (!p || seg.some(x => !x || !/^[A-Za-z0-9_\-.~:@+]+$/.test(x)) || (seg.length % 2 === 0) !== even) throw new TypeError('bad path ' + p); };
  const tick = () => new Promise(r => setTimeout(r, 1));
  function docRef(p) {
    checkPath(p, true);
    return {
      id: idOf(p), path: p,
      async get() { await tick(); return docSnap(p); },
      async set(data) { await tick(); if (failNext) { const e = failNext; failNext = null; throw e; } if (!isObj(data)) throw err('invalid_argument', 'body'); docs.set(p, clone(data)); log.push({ op: 'set', path: p, data: clone(data) }); notify(); },
      async update(data) { await tick(); if (failNext) { const e = failNext; failNext = null; throw e; } if (!docs.has(p)) throw err('invalid_argument', 'update on missing ' + p); merge(docs.get(p), data); log.push({ op: 'update', path: p, data: clone(data) }); notify(); },
      async delete() { await tick(); docs.delete(p); log.push({ op: 'delete', path: p }); notify(); },
      onSnapshot(cb) { const s = { path: p, cb }; subs.add(s); setTimeout(() => { if (subs.has(s)) cb(docSnap(p)); }, 2); return () => subs.delete(s); },
      collection(sub) { return collRef(p + '/' + sub); }
    };
  }
  function queryOf(q) {
    return {
      path: q.path,
      where(f, op, v) { return queryOf(Object.assign({}, q, { filters: q.filters.concat([[f, op, v]]) })); },
      orderBy(f, dir = 'asc') { return queryOf(Object.assign({}, q, { order: [f, dir] })); },
      limit(n) { if (!(n >= 1 && n <= 1000)) throw err('invalid_argument', 'limit'); return queryOf(Object.assign({}, q, { lim: n })); },
      async get() { await tick(); return runQuery(q); },
      onSnapshot(cb) { const s = { q, cb }; subs.add(s); setTimeout(() => { if (subs.has(s)) cb(runQuery(q)); }, 2); return () => subs.delete(s); },
      doc(id) { return docRef(q.path + '/' + (id || 'auto' + Math.random().toString(36).slice(2, 12))); },
      async add(data) { const r = this.doc(); await r.set(data); return r; }
    };
  }
  function collRef(p) { checkPath(p, false); return queryOf({ path: p, filters: [], order: null, lim: 0 }); }
  return { docs, log, subs, db: { doc: docRef, collection: collRef }, failOnce(code) { failNext = err(code); },
    put(p, data) { docs.set(p, clone(data)); notify(); }, get: p => docs.get(p), count: coll => [...docs.keys()].filter(p => collOf(p) === coll).length };
}

function loadBackup(dir) {
  const seed = {};
  for (const col of fs.readdirSync(dir)) {
    const cd = path.join(dir, col); if (!fs.statSync(cd).isDirectory()) continue;
    for (const f of fs.readdirSync(cd)) if (f.endsWith('.json')) seed[col + '/' + f.slice(0, -5)] = JSON.parse(fs.readFileSync(path.join(cd, f), 'utf8'));
  }
  return seed;
}

async function boot({ html, seed = {}, owner = false, userId = 'viewer-1', noDb = false, hash = '#/', canWrite = true, webcrypto = false } = {}) {
  const store = makeStore(seed);
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('error', (...a) => errors.push(['console.error', ...a.map(x => (x && x.stack) || String(x))]));
  vc.on('jsdomError', e => errors.push(['jsdomError', (e && e.detail && e.detail.stack) || (e && e.stack) || String(e)]));
  // yalnızca test: uygulama kapalı bir işlev içinde çalışır; içine bakabilmek için bir kanca eklenir (yayımlanan dosyada yok)
  const tail = /\}\)\(\);\s*<\/script>\s*<\/body>/;
  if (!tail.test(html)) throw new Error('betik sonu bulunamadı');
  html = html.replace(tail, 'window.__t = c => eval(c);\n})();\n</script>\n</body>');
  const dom = new JSDOM(html, {
    url: 'https://yediwiki.test/' + hash, runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.claude = { use: async name => (name === 'db' ? (noDb ? null : store.db) : name === 'user' ? { isOwner: async () => owner, can: async () => canWrite, id: async () => userId } : name === 'downloads' ? { save: async () => {} } : null) };
      w.scrollTo = () => {};
      // isteğe bağlı: tarayıcıdaki gibi TextEncoder + crypto.subtle (yönetici şifresi PBKDF2 ile denetlenir)
      if (webcrypto) { w.TextEncoder = require('util').TextEncoder; Object.defineProperty(w.crypto, 'subtle', { value: require('crypto').webcrypto.subtle, configurable: true }); }
      w.Element.prototype.scrollIntoView = function () {};
    }
  });
  const w = dom.window;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const ev = code => w.__t(code);
  const go = async h => { w.location.hash = h; await wait(60); };
  await wait(120);
  return { dom, w, store, errors, wait, ev, go, $: s => w.document.querySelector(s), $$: s => [...w.document.querySelectorAll(s)], text: s => { const e = w.document.querySelector(s); return e ? e.textContent : null; } };
}

module.exports = { boot, makeStore, loadBackup, clone };
