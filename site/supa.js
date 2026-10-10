/* YediWiki: Supabase bağdaştırıcısı.
   app.js claude.ai sürümünde belge veritabanını (koleksiyon/belge, onSnapshot, set/update/delete) kullanır.
   Bu dosya aynı arayüzü Supabase üzerinde kurar: okuma public.docs tablosundan, yazma doc_set / doc_update /
   doc_delete RPC'leriyle (kurallar sunucuda), canlı güncelleme Realtime ile.
   Ayrıca belge başına takma ad için eşzamanlı HMAC-SHA256 (sunucudaki yw_private.key_for ile aynı sonuç). */
(function () {
  'use strict';

  /* ---------------- SHA-256 / HMAC ---------------- */
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
  const W = new Uint32Array(64);
  function sha256(msg) {
    const l = msg.length, nb = ((l + 9 + 63) >> 6) << 6, b = new Uint8Array(nb);
    b.set(msg); b[l] = 0x80;
    const dv = new DataView(b.buffer), bits = l * 8;
    dv.setUint32(nb - 4, bits >>> 0); dv.setUint32(nb - 8, Math.floor(bits / 4294967296));
    let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a, h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
    for (let off = 0; off < nb; off += 64) {
      for (let i = 0; i < 16; i++) W[i] = dv.getUint32(off + i * 4);
      for (let i = 16; i < 64; i++) {
        const x = W[i - 15], y = W[i - 2];
        const s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
        const s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
        W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
      }
      let a = h0, bb = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
      for (let i = 0; i < 64; i++) {
        const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        const t1 = (h + S1 + ((e & f) ^ (~e & g)) + K[i] + W[i]) | 0;
        const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        const t2 = (S0 + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
      }
      h0 = (h0 + a) | 0; h1 = (h1 + bb) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
      h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
    }
    const out = new Uint8Array(32), ov = new DataView(out.buffer);
    [h0, h1, h2, h3, h4, h5, h6, h7].forEach((v, i) => ov.setUint32(i * 4, v >>> 0));
    return out;
  }
  const enc = s => new TextEncoder().encode(String(s));
  const hex = u => Array.from(u, x => x.toString(16).padStart(2, '0')).join('');
  function hmac(key, msg) {
    if (key.length > 64) key = sha256(key);
    const k = new Uint8Array(64); k.set(key);
    const ip = new Uint8Array(64 + msg.length), op = new Uint8Array(96);
    for (let i = 0; i < 64; i++) { ip[i] = k[i] ^ 0x36; op[i] = k[i] ^ 0x5c; }
    ip.set(msg, 64); op.set(sha256(ip), 64);
    return sha256(op);
  }
  const hmacHex = (key, msg) => hex(hmac(enc(key), enc(msg)));

  /* ---------------- belge veritabanı ---------------- */
  const COLS = new Set(['users', 'private', 'notes', 'comments', 'hocas', 'courses', 'bolumler', 'requests', 'zor']);
  const ID_OK = /^[A-Za-z0-9_.~:@+-]{1,100}$/;
  const PAGE = 1000;
  const SEL = 'id,data,updated_at';

  /* Zaman damgası karşılaştırması (mikro saniyeye kadar): eski bir canlı olay yeni veriyi ezmesin */
  function tsNum(s) {
    const m = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.(\d+))?(Z|[+-]\d\d(?::?\d\d)?)?$/.exec(String(s || '').replace(' ', 'T'));
    if (!m) return NaN;
    const z = m[3] || 'Z', off = z === 'Z' ? 'Z' : z.length === 3 ? z + ':00' : z.length === 5 ? z.slice(0, 3) + ':' + z.slice(3) : z;
    const base = Date.parse(m[1] + off);
    const frac = (m[2] || '').padEnd(6, '0').slice(0, 6);
    return base * 1000 + (+frac || 0);
  }
  const older = (a, b) => { const x = tsNum(a), y = tsNum(b); return x === x && y === y && y < x; };   // b, a'dan eski mi

  function mapErr(e) {
    const msg = String((e && e.message) || e || 'error');
    const out = new Error(msg);
    const code = e && e.code ? String(e.code) : '';
    out.raw = e;
    if (code === 'P0001') { out.code = 'invalid_argument'; out.msgTr = msg; }
    else if (code === '23505') { out.code = 'invalid_argument'; out.msgTr = 'Bu kullanıcı adı alınmış.'; }
    else if (code === '23514' || code === '22P02' || code === '22023' || code === '22001') { out.code = 'invalid_argument'; out.msgTr = 'Kayıt geçersiz ya da çok büyük.'; }
    else if (code === '42501' || /^PGRST30/.test(code)) { out.code = 'unauthenticated'; out.msgTr = 'Oturumun kapanmış görünüyor. Yeniden giriş yap.'; }
    else if (code === '57014') { out.code = 'unavailable'; }
    else if (!code || /fetch|network|load failed|timeout/i.test(msg)) { out.code = 'unavailable'; }
    else out.code = 'internal';
    return out;
  }
  const snapDoc = (id, data) => ({ id, exists: !!data, data: () => data });
  function clean(o) {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return o;
    const c = {};
    for (const k of Object.keys(o)) if (k !== '$k' && o[k] !== undefined) c[k] = o[k];
    return c;
  }
  function autoId(n = 20) {
    const abc = 'abcdefghijklmnopqrstuvwxyz0123456789', a = new Uint8Array(n);
    try { crypto.getRandomValues(a); } catch (e) { for (let i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 256); }
    return Array.from(a, x => abc[x % 36]).join('');
  }

  function makeDb(sb, opts = {}) {
    const cols = new Map();          // koleksiyon -> durum
    const docSubs = new Map();       // 'col/id' -> Set(abone)
    let chan = null, everUp = false, needResync = false;
    const onLive = typeof opts.onLive === 'function' ? opts.onLive : () => {};

    function colState(name) {
      let st = cols.get(name);
      if (!st) { st = { name, rows: new Map(), subs: new Set(), loaded: false, loading: null, pending: [], order: null, limit: 0, flushQ: false }; cols.set(name, st); }
      return st;
    }
    function snapCol(st) {
      const docs = [];
      for (const [id, r] of st.rows) docs.push({ id, data: () => r.data });
      return { docs, size: docs.length, empty: !docs.length };
    }
    function flush(st) {
      if (st.flushQ) return;
      st.flushQ = true;
      Promise.resolve().then(() => {
        st.flushQ = false;
        const s = snapCol(st);
        for (const sub of st.subs) { try { sub.cb(s); } catch (e) { console.error(e); } }
      });
    }
    // tek bir değişikliği (canlı olay ya da kendi yazmamızın sonucu) önbelleğe uygular
    function apply(col, id, data, ver, del) {
      const st = cols.get(col);
      if (st) {
        if (!st.loaded) st.pending.push([id, data, ver, del]);
        else if (put(st, id, data, ver, del)) flush(st);
      }
      const ds = docSubs.get(col + '/' + id);
      if (ds) for (const s of ds) s.apply(data, ver, del);
    }
    function put(st, id, data, ver, del) {
      const cur = st.rows.get(id);
      if (cur && cur.ver && ver && older(cur.ver, ver)) return false;
      if (del) { if (!cur) return false; st.rows.delete(id); return true; }
      st.rows.set(id, { data, ver: ver || null });
      return true;
    }
    async function fetchCol(st) {
      const out = new Map();
      if (st.limit) {
        let q = sb.from('docs').select(SEL).eq('col', st.name);
        if (st.order) q = q.order('data->' + st.order.f, { ascending: st.order.dir !== 'desc' });
        const { data, error } = await q.limit(st.limit);
        if (error) throw mapErr(error);
        for (const r of data || []) out.set(r.id, { data: r.data, ver: r.updated_at });
      } else {
        for (let from = 0; ; from += PAGE) {
          const { data, error } = await sb.from('docs').select(SEL).eq('col', st.name).order('id', { ascending: true }).range(from, from + PAGE - 1);
          if (error) throw mapErr(error);
          for (const r of data || []) out.set(r.id, { data: r.data, ver: r.updated_at });
          if (!data || data.length < PAGE) break;
        }
      }
      return out;
    }
    async function loadCol(st) {
      const rows = await fetchCol(st);
      // yüklenirken gelen olaylar: yüklenen satırdan yeniyse uygulanır
      const pend = st.pending; st.pending = [];
      st.rows = rows;
      for (const [id, data, ver, del] of pend) put(st, id, data, ver, del);
      st.loaded = true;
      flush(st);
    }
    function ensureChannel() {
      if (chan || !sb.channel) return;
      chan = sb.channel('yw-docs')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'docs' }, p => {
          const del = p.eventType === 'DELETE';
          const row = del ? p.old : p.new;
          if (!row || !row.col || row.id == null) return;
          apply(row.col, String(row.id), del ? null : row.data, del ? (p.commit_timestamp || null) : row.updated_at, del);
        })
        .subscribe(status => {
          if (status === 'SUBSCRIBED') {
            onLive(true);
            if (everUp && needResync) resync();
            everUp = true; needResync = false;
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            needResync = true; onLive(false);
          }
        });
    }
    // bağlantı koptuysa kaçırılan değişiklikler için her şeyi yeniden oku
    async function resync() {
      for (const st of cols.values()) {
        if (!st.loaded) continue;
        try {
          const rows = await fetchCol(st);
          st.rows = rows; flush(st);
        } catch (e) { /* bir sonraki bağlantıda */ }
      }
      for (const [key, set] of docSubs) for (const s of set) s.reload && s.reload();
    }

    function query(name, order, limit) {
      return {
        orderBy(f, dir) { return query(name, { f, dir: dir || 'asc' }, limit); },
        limit(n) { return query(name, order, n); },
        doc(id) { return docRef(name + '/' + (id || autoId())); },
        onSnapshot(cb, errCb) {
          const st = colState(name);
          if (order && !st.order) st.order = order;
          if (limit && !st.limit) st.limit = limit;
          const sub = { cb };
          st.subs.add(sub);
          ensureChannel();
          if (st.loaded) Promise.resolve().then(() => cb(snapCol(st)));
          else if (!st.loading) {
            st.loading = loadCol(st).catch(e => {
              st.loading = null;
              for (const s of st.subs) if (s.err) s.err(e);
            });
          }
          sub.err = errCb;
          return () => { st.subs.delete(sub); };
        }
      };
    }

    function docRef(path) {
      const parts = String(path).split('/');
      const col = parts[0], id = parts.slice(1).join('/');
      const ok = parts.length === 2 && COLS.has(col) && ID_OK.test(id) && id !== '.' && id !== '..';
      async function rpc(fn, args) {
        if (!ok) { const e = new Error('Bilinmeyen kayıt'); e.code = 'invalid_argument'; throw e; }
        const { data, error } = await sb.rpc(fn, Object.assign({ p_col: col, p_id: id }, args));
        if (error) throw mapErr(error);
        if (fn === 'doc_delete') apply(col, id, null, null, true);
        else if (data && typeof data === 'object') apply(col, id, data, null, false);
        return data;
      }
      async function fetchOne() {
        const { data, error } = await sb.from('docs').select(SEL).eq('col', col).eq('id', id).maybeSingle();
        if (error) throw mapErr(error);
        return data || null;
      }
      return {
        id,
        path: col + '/' + id,
        async get() {
          if (!ok) return snapDoc(id, null);
          const r = await fetchOne();
          return snapDoc(id, r ? r.data : null);
        },
        set(d) { return rpc('doc_set', { p_data: clean(d) }); },
        update(p) { return rpc('doc_update', { p_patch: clean(p) }); },
        delete() { return ok ? rpc('doc_delete', {}) : Promise.resolve(); },
        onSnapshot(cb, errCb) {
          if (!ok) { Promise.resolve().then(() => cb(snapDoc(id, null))); return () => {}; }
          const key = col + '/' + id;
          let set = docSubs.get(key);
          if (!set) docSubs.set(key, set = new Set());
          let cur = { data: null, ver: null }, first = false, live = true, pend = [];
          const emit = () => { if (live) { try { cb(snapDoc(id, cur.data)); } catch (e) { console.error(e); } } };
          const sub = {
            apply(data, ver, del) {
              if (!first) { pend.push([data, ver, del]); return; }
              if (cur.ver && ver && older(cur.ver, ver)) return;
              cur = del ? { data: null, ver } : { data, ver: ver || null };
              emit();
            },
            reload() { load(); }
          };
          async function load() {
            try {
              const r = await fetchOne();
              if (!live) return;
              cur = r ? { data: r.data, ver: r.updated_at } : { data: null, ver: null };
              first = true;
              for (const [d, v, del] of pend) if (!(cur.ver && v && older(cur.ver, v))) cur = del ? { data: null, ver: v } : { data: d, ver: v || null };
              pend = [];
              emit();
            } catch (e) { if (live && errCb) errCb(e); }
          }
          set.add(sub);
          ensureChannel();
          load();
          return () => { live = false; set.delete(sub); };
        }
      };
    }

    return {
      collection: name => query(name, null, 0),
      doc: path => docRef(path),
      async rpc(fn, args, applyTo) {
        const { data, error } = await sb.rpc(fn, args || {});
        if (error) throw mapErr(error);
        if (applyTo && data && typeof data === 'object') { const [c, i] = applyTo.split('/'); apply(c, i, data, null, false); }
        return data;
      },
      // test ve hata ayıklama için
      _apply: apply
    };
  }

  window.YWSupa = { makeDb, hmacHex, mapErr, tsNum };
})();
