// supabase-js'in testler için sahtesi: aynı arayüz, arkasında yerel PostgreSQL'deki gerçek şema, kurallar, RLS ve tetikleyiciler.
// Auth: e-posta kodu (kod e-posta yerine `mails` listesine düşer), şifreyle giriş; PostgREST: docs okuma ve RPC; Realtime: LISTEN/NOTIFY.
const { Pool, Client } = require('pg');

const PG = { host: process.env.PGHOST || '/var/tmp/ywpg', port: +(process.env.PGPORT || 54329), user: 'postgres' };

// Testin veritabanını kurar: Supabase taklidi + bütün göçler + canlı güncelleme için NOTIFY tetikleyicisi
async function setupDb(name, { shim, migrations }) {
  const fs = require('fs');
  const admin = new Client(Object.assign({ database: 'postgres' }, PG));
  await admin.connect();
  await admin.query(`drop database if exists ${name} with (force)`);
  await admin.query(`create database ${name}`);
  for (const r of ['anon', 'authenticated', 'service_role', 'supabase_auth_admin']) {
    try { await admin.query(`drop role if exists ${r}`); } catch (e) { /* başka veritabanında yetkisi var: kalsın */ }
  }
  await admin.end();
  const c = new Client(Object.assign({ database: name }, PG));
  await c.connect();
  await c.query(fs.readFileSync(shim, 'utf8'));   // taklit dosyası rolleri yalnızca yoksa oluşturur
  for (const f of migrations) await c.query(fs.readFileSync(f, 'utf8'));
  await c.query(`
    create or replace function public.test_notify() returns trigger language plpgsql as $$
    begin
      perform pg_notify('yw_docs', json_build_object('t', tg_op, 'col', coalesce(new.col, old.col), 'id', coalesce(new.id, old.id),
        'data', case when tg_op = 'DELETE' then null else new.data end,
        'updated_at', case when tg_op = 'DELETE' then null else to_json(new.updated_at) end,
        'ts', to_json(clock_timestamp()))::text);
      return null;
    end $$;
    create trigger test_notify after insert or update or delete on public.docs for each row execute function public.test_notify();`);
  await c.end();
}

function makeBackend(db) {
  const pool = new Pool(Object.assign({ database: db, max: 6 }, PG));
  const listeners = new Set();
  let lc = null;
  async function listen() {
    if (lc) return;
    lc = new Client(Object.assign({ database: db }, PG));
    await lc.connect();
    lc.on('notification', n => { let p; try { p = JSON.parse(n.payload); } catch (e) { return; } for (const l of [...listeners]) l(p); });
    await lc.query('listen yw_docs');
  }
  return { pool, listeners, listen, mails: [], passwords: new Map(), async end() { if (lc) await lc.end(); await pool.end(); } };
}

const pgErr = e => ({ code: e.code || '', message: e.message, details: e.detail || null, hint: e.hint || null });

// Bir tarayıcı sekmesi gibi: kendi oturumu olan bir istemci
function makeClient(be, { delay = 2 } = {}) {
  const st = { session: null, authSubs: new Set(), channels: new Set(), calls: [] };
  const later = fn => setTimeout(fn, delay);
  const emit = (ev, s) => { for (const cb of [...st.authSubs]) later(() => cb(ev, s)); };

  async function asRole(fn) {
    const c = await be.pool.connect();
    try {
      await c.query('begin');
      const claims = st.session ? JSON.stringify({ sub: st.session.user.id, role: 'authenticated', email: st.session.user.email, aud: 'authenticated' }) : '';
      await c.query("select set_config('request.jwt.claims', $1, true)", [claims]);
      await c.query(st.session ? 'set local role authenticated' : 'set local role anon');
      const r = await fn(c);
      await c.query('commit');
      return r;
    } catch (e) { try { await c.query('rollback'); } catch (_) { /* yok */ } throw e; }
    finally { c.release(); }
  }

  function from(table) {
    if (table !== 'docs') throw new Error('yalnızca docs');
    const q = { filters: [], order: [], limit: null, range: null, single: false };
    const b = {
      select() { return b; },
      eq(f, v) { if (!/^(col|id)$/.test(f)) throw new Error('alan ' + f); q.filters.push([f, v]); return b; },
      order(f, o) { q.order.push([f, o && o.ascending === false ? 'desc' : 'asc']); return b; },
      limit(n) { q.limit = n; return b; },
      range(a, z) { q.range = [a, z]; return b; },
      maybeSingle() { q.single = true; return b; },
      then(res, rej) { return run(q).then(res, rej); }
    };
    return b;
  }
  async function run(q) {
    st.calls.push(['select', q]);
    try {
      const where = q.filters.map(([f], i) => `${f} = $${i + 1}`).join(' and ');
      const ord = q.order.map(([f, d]) => {
        const m = /^data->(\w+)$/.exec(f);
        if (m) return `data->'${m[1]}' ${d}`;
        if (!/^(id|col)$/.test(f)) throw new Error('sıra ' + f);
        return `${f} ${d}`;
      }).join(', ');
      let sql = "select id, data, to_json(updated_at) #>> '{}' as updated_at from public.docs" + (where ? ' where ' + where : '') + (ord ? ' order by ' + ord : '');
      const maxRows = 1000;   // PostgREST'in varsayılan üst sınırı
      if (q.range) sql += ` limit ${Math.min(maxRows, q.range[1] - q.range[0] + 1)} offset ${q.range[0]}`;
      else sql += ` limit ${Math.min(maxRows, q.limit || maxRows)}`;
      const r = await asRole(c => c.query(sql, q.filters.map(x => x[1])));
      if (q.single) return r.rows.length > 1 ? { data: null, error: { code: 'PGRST116', message: 'multiple rows' } } : { data: r.rows[0] || null, error: null };
      return { data: r.rows, error: null };
    } catch (e) { return { data: null, error: pgErr(e) }; }
  }

  async function rpc(name, args = {}) {
    if (!/^[a-z_]+$/.test(name)) throw new Error('rpc ' + name);
    st.calls.push(['rpc', name, args]);
    try {
      const keys = Object.keys(args);
      const vals = keys.map(k => (args[k] !== null && typeof args[k] === 'object' ? JSON.stringify(args[k]) : args[k]));
      const r = await asRole(c => c.query(`select public.${name}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')}) as r`, vals));
      return { data: r.rows[0].r, error: null };
    } catch (e) { return { data: null, error: pgErr(e) }; }
  }

  async function signIn(u) {
    st.session = { access_token: 'sahte-' + u.id, refresh_token: 'r', user: { id: u.id, email: u.email } };
    emit('SIGNED_IN', st.session);
    return { data: { session: st.session, user: st.session.user }, error: null };
  }
  const lower = s => String(s || '').trim().toLowerCase();
  const auth = {
    async getSession() { return { data: { session: st.session }, error: null }; },
    onAuthStateChange(cb) { st.authSubs.add(cb); later(() => cb('INITIAL_SESSION', st.session)); return { data: { subscription: { unsubscribe: () => st.authSubs.delete(cb) } } }; },
    async signInWithOtp({ email, options }) {
      email = lower(email);
      try {
        const ex = await be.pool.query('select id from auth.users where lower(email) = $1', [email]);
        if (!ex.rows.length) {
          if (options && options.shouldCreateUser === false) return { data: {}, error: { code: 'otp_disabled', message: 'Signups not allowed for otp', status: 422 } };
          await be.pool.query("insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $1, now(), now(), '{}', '{}')", [email]);
        }
      } catch (e) { return { data: {}, error: { code: 'unexpected_failure', message: 'Database error saving new user', status: 500 } }; }
      const last = [...be.mails].reverse().find(m => m.email === email);
      if (last && Date.now() - last.at < 60000 && !be.noRateLimit) return { data: {}, error: { code: 'over_email_send_rate_limit', message: `For security purposes, you can only request this after ${Math.ceil((60000 - (Date.now() - last.at)) / 1000)} seconds.`, status: 429 } };
      const code = String(100000 + Math.floor(Math.random() * 900000));
      be.mails.push({ email, code, at: Date.now() });
      return { data: { user: null, session: null }, error: null };
    },
    async verifyOtp({ email, token, type }) {
      email = lower(email);
      const last = [...be.mails].reverse().find(m => m.email === email);
      if (type !== 'email' || !last || last.used || last.code !== String(token)) return { data: { user: null, session: null }, error: { code: 'otp_expired', message: 'Token has expired or is invalid', status: 403 } };
      last.used = true;
      await be.pool.query('update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()), last_sign_in_at = now() where lower(email) = $1', [email]);
      const u = (await be.pool.query('select id::text as id, email from auth.users where lower(email) = $1', [email])).rows[0];
      return signIn(u);
    },
    async signInWithPassword({ email, password }) {
      email = lower(email);
      const pw = be.passwords.get(email);
      const u = (await be.pool.query('select id::text as id, email, email_confirmed_at from auth.users where lower(email) = $1', [email])).rows[0];
      if (!u || !pw || pw !== password) return { data: { user: null, session: null }, error: { code: 'invalid_credentials', message: 'Invalid login credentials', status: 400 } };
      return signIn(u);
    },
    async signOut() { st.session = null; emit('SIGNED_OUT', null); return { error: null }; }
  };

  function channel(name) {
    const ch = {
      handlers: [], status: null,
      on(type, filter, cb) { if (type === 'postgres_changes') ch.handlers.push(cb); return ch; },
      subscribe(cb) {
        const l = p => {
          // RLS taklidi: özel kayıt yalnızca sahibine
          if (p.col === 'private' && !(st.session && st.session.user.id === p.id)) return;
          const del = p.t === 'DELETE';
          const payload = { eventType: p.t, schema: 'public', table: 'docs', commit_timestamp: p.ts,
            new: del ? {} : { col: p.col, id: p.id, data: p.data, updated_at: p.updated_at }, old: { col: p.col, id: p.id } };
          later(() => { for (const h of ch.handlers) h(payload); });
        };
        ch.l = l; be.listeners.add(l); st.channels.add(ch);
        be.listen().then(() => later(() => cb && cb('SUBSCRIBED')));
        return ch;
      },
      unsubscribe() { be.listeners.delete(ch.l); st.channels.delete(ch); }
    };
    return ch;
  }

  const client = { auth, from, rpc, channel, removeChannel: ch => ch.unsubscribe() };
  return { createClient: () => client, client, st };
}

// Panelden "Auto Confirm" ile hesap açmak gibi (özel hesaplar için tetikleyiciler çalışır)
async function dashboardUser(be, email, password) {
  const r = await be.pool.query("insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $1, 'x', now(), now(), now(), '{}', '{}') returning id::text as id", [email.toLowerCase()]);
  be.passwords.set(email.toLowerCase(), password);
  return r.rows[0].id;
}

module.exports = { setupDb, makeBackend, makeClient, dashboardUser, PG };
