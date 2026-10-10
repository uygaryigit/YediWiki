-- YediWiki 0001: belge deposu
-- Sitenin claude.ai sürümündeki belge veritabanının (koleksiyon/belge, alanlar JSON) Supabase karşılığı.
-- İstemci tabloya doğrudan yazamaz; her yazma doc_set / doc_update / doc_delete / buy_item üzerinden geçer
-- ve kurallar burada uygulanır. Okuma: 'private' dışındaki her şey herkese açık (ana sayfa giriş istemez).
--
-- Gizlilik:
--  * Başkasının belgesine yazılan kişisel anahtarlar (beğeni, bildirim, hoca puanı, "ben de", harf notu)
--    kullanıcı kimliğiyle değil, sunucudaki gizli anahtarla üretilen takma adla (rk) tutulur.
--  * İsimsiz not ve yorumlarda yazar alanı boştur (by = ''); yazarın kendi takma adı byk'de durur.
--    Belgenin gerçek sahibi yalnızca yw_private.doc_owner tablosunda (istemciye kapalı).
--  * Adını ya da sınıfını göstermek istemeyenin ad, soyad ve yılı herkese açık profilde tutulmaz,
--    kendi özel kaydına taşınır.
--  * Kubbe sunucuda hesaplanır ve users belgesinin kb alanına yazılır; istemci değiştiremez.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists yw_private;
revoke all on schema yw_private from public;

create table yw_private.settings (key text primary key, value text not null);
insert into yw_private.settings (key, value)
values ('rk_secret', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;

create table yw_private.doc_owner (
  col text not null,
  id text not null,
  uid uuid not null,
  primary key (col, id)
);
create index doc_owner_uid_idx on yw_private.doc_owner (uid);

create table yw_private.pseudonyms (uid uuid primary key, rk text not null unique);
create table yw_private.admins (uid uuid primary key);
create table yw_private.kadro (id text primary key);
create table yw_private.market (id text primary key, price integer not null check (price >= 0));

insert into yw_private.market (id, price) values
  ('gece-eskortu', 1200), ('kartal-kanatlari', 1500), ('altin-ring', 700), ('selcuklu-kapi', 900),
  ('gunes-aurasi', 800), ('yokus-canavari', 350), ('son-sosisli', 300), ('ikinci-ev', 200), ('karsi-durum', 150)
on conflict (id) do update set price = excluded.price;

create table public.docs (
  col text not null check (col in ('users', 'private', 'notes', 'comments', 'hocas', 'courses', 'bolumler', 'requests')),
  id text not null check (id ~ '^[A-Za-z0-9_.~:@+-]{1,100}$' and id not in ('.', '..')),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 65536),
  updated_at timestamptz not null default now(),
  primary key (col, id)
);
comment on table public.docs is 'YediWiki belgeleri. Yazma yalnızca doc_set/doc_update/doc_delete/buy_item ile.';

create unique index docs_username_uq on public.docs (lower(data ->> 'username'))
  where col = 'users' and coalesce(data ->> 'username', '') <> '';
create index docs_by_idx on public.docs (col, (data ->> 'by'));

alter table public.docs enable row level security;
alter table public.docs replica identity full;
revoke insert, update, delete, truncate on public.docs from anon, authenticated;

create policy docs_okuma on public.docs for select to anon, authenticated
  using (col <> 'private' or id = (select auth.uid())::text);

-- ---------------------------------------------------------------- yardımcılar
create or replace function yw_private.now_ms() returns bigint
language sql volatile set search_path = '' as $$
  select (extract(epoch from clock_timestamp()) * 1000)::bigint
$$;

-- Derin birleştirme: iç içe nesneler birleşir, diğer değerler (null ve diziler dahil) üzerine yazar.
create or replace function yw_private.merge(a jsonb, b jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare k text; v jsonb; r jsonb;
begin
  if a is null or jsonb_typeof(a) <> 'object' or b is null or jsonb_typeof(b) <> 'object' then return b; end if;
  r := a;
  for k, v in select * from jsonb_each(b) loop
    if jsonb_typeof(v) = 'object' and jsonb_typeof(r -> k) = 'object' then
      r := jsonb_set(r, array[k], yw_private.merge(r -> k, v));
    else
      r := r || jsonb_build_object(k, v);
    end if;
  end loop;
  return r;
end $$;

create or replace function yw_private.rk(p_uid uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare v text;
begin
  select p.rk into v from yw_private.pseudonyms p where p.uid = p_uid;
  if v is null then
    v := 'k' || substr(encode(extensions.hmac(p_uid::text, (select s.value from yw_private.settings s where s.key = 'rk_secret'), 'sha256'), 'hex'), 1, 24);
    insert into yw_private.pseudonyms (uid, rk) values (p_uid, v) on conflict (uid) do nothing;
  end if;
  return v;
end $$;

create or replace function yw_private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from yw_private.admins a where a.uid = auth.uid())
$$;

create or replace function yw_private.fail(msg text) returns void
language plpgsql set search_path = '' as $$
begin
  raise exception using message = msg, errcode = 'P0001';
end $$;

-- Dönemin başlangıcı (Güz 1 Eylül, Bahar 1 Şubat, Yaz 1 Temmuz; İstanbul saati), milisaniye
create or replace function yw_private.term_start_ms() returns bigint
language sql stable set search_path = '' as $$
  with n as (select (now() at time zone 'Europe/Istanbul') as t),
  b as (
    select case
      when extract(month from t) >= 9 then make_timestamp(extract(year from t)::int, 9, 1, 0, 0, 0)
      when extract(month from t) >= 7 then make_timestamp(extract(year from t)::int, 7, 1, 0, 0, 0)
      when extract(month from t) >= 2 then make_timestamp(extract(year from t)::int, 2, 1, 0, 0, 0)
      else make_timestamp(extract(year from t)::int - 1, 9, 1, 0, 0, 0)
    end as s from n)
  select (extract(epoch from (s at time zone 'Europe/Istanbul')) * 1000)::bigint from b
$$;

create or replace function yw_private.likes(d jsonb) returns integer
language sql immutable set search_path = '' as $$
  select count(*)::int from jsonb_each(case when jsonb_typeof(d -> 'likes') = 'object' then d -> 'likes' else '{}'::jsonb end) e
  where e.value = 'true'::jsonb
$$;

-- Üç geçerli bildirim alan içerik gizlenir (istemcideki isHidden ile aynı)
create or replace function yw_private.hidden(d jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select count(*) >= 3 from jsonb_each(case when jsonb_typeof(d -> 'reports') = 'object' then d -> 'reports' else '{}'::jsonb end) e
  where jsonb_typeof(e.value) = 'number'
    and (e.value)::text::numeric > coalesce(case when jsonb_typeof(d -> 'ok') = 'number' then (d ->> 'ok')::numeric end, 0)
$$;

create or replace function yw_private.valid_rating(r jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(r) = 'object' and coalesce((
    select bool_and(jsonb_typeof(r -> k) = 'number' and (r ->> k)::numeric between 0.5 and 5 and ((r ->> k)::numeric * 2) = floor((r ->> k)::numeric * 2))
    from unnest(array['a', 'o', 'n', 'd']) k), false)
$$;

-- Tek anahtarlı yama mı ve anahtar beklenen mi: {"<rk>": değer}
create or replace function yw_private.own_key(v jsonb, k text) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(v) = 'object' and (select count(*) from jsonb_object_keys(v)) = 1 and v ? k
$$;

-- ---------------------------------------------------------------- kubbe
create or replace function yw_private.recalc(p_uid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  k text := yw_private.rk(p_uid);
  ts bigint := yw_private.term_start_ms();
  u jsonb; bonus numeric;
  n_cnt int; n_all numeric; n_term numeric; n_likes int;
  c_cnt int; c_all numeric; c_term numeric; c_likes int;
  r_cnt int; r_term int; f_cnt int; f_term int;
  t_all numeric; t_term numeric;
begin
  select d.data into u from public.docs d where d.col = 'users' and d.id = p_uid::text;
  if u is null then return; end if;
  bonus := greatest(0, coalesce(case when jsonb_typeof(u -> 'bonus') = 'number' then (u ->> 'bonus')::numeric end, 0));

  select count(*), coalesce(sum(p), 0), coalesce(sum(p) filter (where at >= ts), 0), coalesce(sum(lk), 0)
    into n_cnt, n_all, n_term, n_likes
  from (
    select 25 + case when jsonb_typeof(d.data -> 'photos') = 'array' and jsonb_array_length(d.data -> 'photos') > 0 then 10 else 0 end
             + 2 * yw_private.likes(d.data) as p,
           yw_private.likes(d.data) as lk,
           coalesce(case when jsonb_typeof(d.data -> 'at') = 'number' then (d.data ->> 'at')::numeric end, 0) as at
    from public.docs d join yw_private.doc_owner o on o.col = d.col and o.id = d.id
    where d.col = 'notes' and o.uid = p_uid and not yw_private.hidden(d.data)) x;

  select count(*), coalesce(sum(p), 0), coalesce(sum(p) filter (where at >= ts), 0), coalesce(sum(lk), 0)
    into c_cnt, c_all, c_term, c_likes
  from (
    select 5 + 2 * yw_private.likes(d.data) as p, yw_private.likes(d.data) as lk,
           coalesce(case when jsonb_typeof(d.data -> 'at') = 'number' then (d.data ->> 'at')::numeric end, 0) as at
    from public.docs d join yw_private.doc_owner o on o.col = d.col and o.id = d.id
    where d.col = 'comments' and o.uid = p_uid and not yw_private.hidden(d.data)) x;

  select count(*), count(*) filter (where coalesce(case when jsonb_typeof(e.value -> 'at') = 'number' then (e.value ->> 'at')::numeric end, 0) >= ts)
    into r_cnt, r_term
  from public.docs d, jsonb_each(case when jsonb_typeof(d.data -> 'ratings') = 'object' then d.data -> 'ratings' else '{}'::jsonb end) e
  where d.col = 'hocas' and e.key = k and yw_private.valid_rating(e.value);

  select count(*), count(*) filter (where coalesce(case when jsonb_typeof(d.data -> 'doneAt') = 'number' then (d.data ->> 'doneAt')::numeric end, 0) >= ts)
    into f_cnt, f_term
  from public.docs d
  where d.col = 'requests' and d.data -> 'done' = 'true'::jsonb and d.data ->> 'doneBy' = p_uid::text and d.data ->> 'by' <> p_uid::text;

  t_all := bonus + n_all + c_all + 10 * r_cnt + 10 * f_cnt;
  t_term := n_term + c_term + 10 * r_term + 10 * f_term
    + case when coalesce(case when jsonb_typeof(u -> 'at') = 'number' then (u ->> 'at')::numeric end, 0) >= ts then least(bonus, 50) else 0 end;

  update public.docs d set data = d.data || jsonb_build_object('kb', jsonb_build_object(
      'all', t_all, 'term', t_term, 'ts', ts, 'notes', n_cnt, 'comments', c_cnt, 'ratings', r_cnt,
      'grades', 0, 'likes', n_likes + c_likes, 'fills', f_cnt)), updated_at = now()
  where d.col = 'users' and d.id = p_uid::text;
end $$;

-- ---------------------------------------------------------------- belge kuralları
-- users: kişisel ad/yıl göstermek istemeyenin bilgileri özel kayda taşınır, ürün profil resmi sahiplik ister
create or replace function yw_private.users_norm(p_uid text, d jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pv jsonb := '{}'::jsonb;
begin
  if coalesce(d -> 'showName', 'false'::jsonb) <> 'true'::jsonb and (coalesce(d ->> 'first', '') <> '' or coalesce(d ->> 'last', '') <> '') then
    pv := pv || jsonb_build_object('first', coalesce(d ->> 'first', ''), 'last', coalesce(d ->> 'last', ''));
    d := d || '{"first": "", "last": ""}'::jsonb;
  end if;
  if coalesce(d -> 'showYil', 'false'::jsonb) <> 'true'::jsonb and coalesce(d -> 'yil', '0'::jsonb) not in ('0'::jsonb, 'null'::jsonb) then
    pv := pv || jsonb_build_object('yil', d -> 'yil');
    d := d || '{"yil": 0}'::jsonb;
  end if;
  if pv <> '{}'::jsonb then
    insert into public.docs (col, id, data) values ('private', p_uid, pv)
    on conflict (col, id) do update set data = public.docs.data || excluded.data, updated_at = now();
  end if;
  if d ->> 'avk' = 'urun' and not (coalesce(d -> 'items', '{}'::jsonb) ? coalesce(d ->> 'urun', '')) then
    d := d || '{"avk": "emoji", "urun": ""}'::jsonb;
  end if;
  return d;
end $$;

-- notes/comments: isimsizse yazar alanı boş, yazarın takma adı byk'de; değilse by = kullanıcı kimliği
create or replace function yw_private.author_norm(p_col text, d jsonb, p_owner uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if p_owner is null then return d; end if;
  if p_col in ('notes', 'comments') and coalesce(d -> 'anon', 'false'::jsonb) = 'true'::jsonb then
    return (d - 'by' - 'byk') || jsonb_build_object('by', '', 'byk', yw_private.rk(p_owner));
  end if;
  return (d - 'byk') || jsonb_build_object('by', p_owner::text);
end $$;

create or replace function public.my_info() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return null; end if;
  return jsonb_build_object('uid', auth.uid()::text, 'rk', yw_private.rk(auth.uid()), 'admin', yw_private.is_admin());
end $$;

create or replace function public.doc_set(p_col text, p_id text, p_data jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  adm boolean := yw_private.is_admin();
  k text;
  now_ms bigint := yw_private.now_ms();
  old jsonb; own uuid; d jsonb := p_data; rt jsonb;
begin
  if me is null then perform yw_private.fail('Giriş yapmalısın.'); end if;
  if d is null or jsonb_typeof(d) <> 'object' then perform yw_private.fail('Geçersiz kayıt.'); end if;
  k := yw_private.rk(me);
  select x.data into old from public.docs x where x.col = p_col and x.id = p_id for update;
  select o.uid into own from yw_private.doc_owner o where o.col = p_col and o.id = p_id;

  if p_col = 'users' then
    if p_id <> me::text and not adm then perform yw_private.fail('Başkasının profili değiştirilemez.'); end if;
    d := d - 'role' - 'bonus' - 'spent' - 'items' - 'gift' - 'verifiedAt' - 'kb' - 'login' - 'email' - 'at';
    if old is null then
      d := d || jsonb_build_object('bonus', 50, 'spent', 0, 'items', '{}'::jsonb, 'gift', 0, 'at', now_ms, 'verifiedAt', now_ms,
                                   'role', case when adm and p_id = me::text then 'admin' else 'user' end);
    else
      d := d || jsonb_strip_nulls(jsonb_build_object('bonus', old -> 'bonus', 'spent', old -> 'spent', 'items', old -> 'items', 'gift', old -> 'gift',
                                   'at', old -> 'at', 'verifiedAt', old -> 'verifiedAt', 'role', old -> 'role', 'kb', old -> 'kb'));
    end if;
    d := yw_private.users_norm(p_id, d);
    own := case when p_id ~ '^[0-9a-f-]{36}$' then p_id::uuid end;

  elsif p_col = 'private' then
    if p_id <> me::text then perform yw_private.fail('Özel kayıt yalnızca sahibine açık.'); end if;
    own := me;

  elsif p_col in ('notes', 'comments', 'requests') then
    if old is not null then
      if not adm and own is distinct from me then perform yw_private.fail('Bu kaydı değiştiremezsin.'); end if;
      d := (d - 'by' - 'byk' - 'at' - 'likes' - 'reports' - 'ok' - 'plus' - 'done' - 'nid' - 'doneBy' - 'doneAt')
           || jsonb_strip_nulls(jsonb_build_object('at', old -> 'at', 'likes', old -> 'likes', 'reports', old -> 'reports', 'ok', old -> 'ok', 'plus', old -> 'plus',
                                                   'done', old -> 'done', 'nid', old -> 'nid', 'doneBy', old -> 'doneBy', 'doneAt', old -> 'doneAt'));
    else
      if not exists (select 1 from public.docs x where x.col = 'users' and x.id = me::text) then perform yw_private.fail('Önce hesap açmalısın.'); end if;
      d := (d - 'by' - 'byk' - 'at' - 'likes' - 'reports' - 'ok') || jsonb_build_object('at', now_ms, 'likes', '{}'::jsonb, 'reports', '{}'::jsonb);
      if p_col = 'requests' then
        d := (d - 'plus' - 'done' - 'nid' - 'doneBy' - 'doneAt') || '{"plus": {}, "done": false, "nid": "", "doneBy": "", "doneAt": 0}'::jsonb;
      end if;
      own := me;
    end if;
    d := yw_private.author_norm(p_col, d, own);

  elsif p_col = 'hocas' then
    if adm then
      own := coalesce(own, me);
    elsif old is null then
      if not exists (select 1 from yw_private.kadro x where x.id = p_id) then perform yw_private.fail('Bu hoca listede yok.'); end if;
      if exists (select 1 from jsonb_object_keys(d - 'at' - 'kadro' - 'ratings') z) then perform yw_private.fail('Hoca bilgisini yalnızca yönetim değiştirir.'); end if;
      if not yw_private.own_key(d -> 'ratings', k) or not yw_private.valid_rating(d -> 'ratings' -> k) then perform yw_private.fail('Puan geçersiz.'); end if;
      rt := (d -> 'ratings' -> k) || jsonb_build_object('at', now_ms);
      d := jsonb_build_object('at', now_ms, 'kadro', true, 'ratings', jsonb_build_object(k, rt));
      own := me;
    else
      -- aynı anda iki kişi ilk puanı verirse ikincisi güncelleme olarak işlenir
      return public.doc_update(p_col, p_id, jsonb_build_object('ratings', coalesce(d -> 'ratings', '{}'::jsonb)));
    end if;

  elsif p_col in ('courses', 'bolumler') then
    if not adm then perform yw_private.fail('Bu kaydı yalnızca yönetim değiştirir.'); end if;
    own := coalesce(own, me);
  else
    perform yw_private.fail('Bilinmeyen koleksiyon.');
  end if;

  insert into public.docs (col, id, data, updated_at) values (p_col, p_id, d, now())
  on conflict (col, id) do update set data = excluded.data, updated_at = now();
  if own is not null then
    insert into yw_private.doc_owner (col, id, uid) values (p_col, p_id, own) on conflict (col, id) do nothing;
  end if;

  if p_col in ('users', 'notes', 'comments') and own is not null then perform yw_private.recalc(own); end if;
  if p_col = 'hocas' then
    perform yw_private.recalc(ps.uid) from yw_private.pseudonyms ps
      where ps.rk in (select jsonb_object_keys(coalesce(old -> 'ratings', '{}'::jsonb)) union select jsonb_object_keys(coalesce(d -> 'ratings', '{}'::jsonb)));
  end if;
  return d;
end $$;

create or replace function public.doc_update(p_col text, p_id text, p_patch jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  adm boolean := yw_private.is_admin();
  k text;
  now_ms bigint := yw_private.now_ms();
  old jsonb; own uuid; nw jsonb; p jsonb := p_patch; key text; v jsonb; affected uuid[] := '{}';
  nid text; note jsonb;
begin
  if me is null then perform yw_private.fail('Giriş yapmalısın.'); end if;
  if p is null or jsonb_typeof(p) <> 'object' then perform yw_private.fail('Geçersiz değişiklik.'); end if;
  k := yw_private.rk(me);
  select x.data into old from public.docs x where x.col = p_col and x.id = p_id for update;
  if old is null then perform yw_private.fail('Kayıt bulunamadı.'); end if;
  select o.uid into own from yw_private.doc_owner o where o.col = p_col and o.id = p_id;

  if adm then
    nw := yw_private.merge(old, p);
    if p_col in ('notes', 'comments') then nw := yw_private.author_norm(p_col, nw, own); end if;
    if p_col = 'users' then nw := yw_private.users_norm(p_id, nw); end if;

  elsif p_col = 'users' then
    if p_id <> me::text then perform yw_private.fail('Başkasının profili değiştirilemez.'); end if;
    if p ?| array['role', 'bonus', 'spent', 'items', 'gift', 'verifiedAt', 'kb', 'login', 'email', 'at'] then
      perform yw_private.fail('Bu alanlar değiştirilemez.');
    end if;
    nw := yw_private.users_norm(p_id, yw_private.merge(old, p));

  elsif p_col = 'private' then
    if p_id <> me::text then perform yw_private.fail('Özel kayıt yalnızca sahibine açık.'); end if;
    nw := yw_private.merge(old, p);

  elsif p_col in ('notes', 'comments', 'requests') and own = me
        and not (p ? 'likes' or p ? 'reports' or p ? 'ok' or p ? 'by' or p ? 'byk' or p ? 'at' or (p_col = 'requests' and p ? 'plus')) then
    -- sahibi kendi kaydını düzenliyor (istek sahibi isteğini kendi notuyla da kapatabilir)
    if p_col = 'requests' and p ? 'done' then
      if p -> 'done' <> 'true'::jsonb or p ->> 'doneBy' <> me::text then perform yw_private.fail('İstek kapatılamadı.'); end if;
      p := p || jsonb_build_object('doneAt', now_ms);
    end if;
    nw := yw_private.merge(old, p);
    if p_col in ('notes', 'comments') then nw := yw_private.author_norm(p_col, nw, own); end if;

  else
    -- başkasının kaydı: yalnızca kendi anahtarın (takma ad) altındaki alanlar
    for key, v in select * from jsonb_each(p) loop
      if p_col in ('notes', 'comments') and key = 'likes' then
        if own = me then perform yw_private.fail('Kendi paylaşımını beğenemezsin.'); end if;
        if not yw_private.own_key(v, k) or jsonb_typeof(v -> k) not in ('boolean', 'null') then perform yw_private.fail('Beğeni geçersiz.'); end if;
      elsif p_col in ('notes', 'comments', 'hocas') and key = 'reports' then
        if not yw_private.own_key(v, k) or jsonb_typeof(v -> k) not in ('number', 'null') then perform yw_private.fail('Bildirim geçersiz.'); end if;
        if jsonb_typeof(v -> k) = 'number' then p := jsonb_set(p, array['reports', k], to_jsonb(now_ms)); end if;
      elsif p_col = 'hocas' and key = 'ratings' then
        if not yw_private.own_key(v, k) then perform yw_private.fail('Puan geçersiz.'); end if;
        if jsonb_typeof(v -> k) <> 'null' then
          if not yw_private.valid_rating(v -> k) then perform yw_private.fail('Puan geçersiz.'); end if;
          p := jsonb_set(p, array['ratings', k], (v -> k) || jsonb_build_object('at', now_ms));
        end if;
      elsif p_col = 'requests' and key = 'plus' then
        if not yw_private.own_key(v, k) or (v -> k) not in ('true'::jsonb, 'null'::jsonb) then perform yw_private.fail('Katılım geçersiz.'); end if;
      elsif p_col = 'courses' and key in ('grades', 'dists') then
        if not yw_private.own_key(v, k) or jsonb_typeof(v -> k) not in ('object', 'null') then perform yw_private.fail('Not bilgisi geçersiz.'); end if;
      elsif p_col = 'requests' and key in ('done', 'nid', 'doneBy', 'doneAt') then
        null;  -- aşağıda bütün olarak denetlenir
      else
        perform yw_private.fail('Bu alanı değiştiremezsin.');
      end if;
    end loop;
    if p_col = 'requests' and (p ? 'done' or p ? 'nid' or p ? 'doneBy' or p ? 'doneAt') then
      nid := p ->> 'nid';
      select x.data into note from public.docs x join yw_private.doc_owner o on o.col = x.col and o.id = x.id
        where x.col = 'notes' and x.id = coalesce(nid, '') and o.uid = me;
      if old -> 'done' = 'true'::jsonb or p -> 'done' <> 'true'::jsonb or p ->> 'doneBy' <> me::text or note is null
         or note ->> 'cid' is distinct from old ->> 'cid' then
        perform yw_private.fail('İstek kapatılamadı.');
      end if;
      p := p || jsonb_build_object('doneAt', now_ms);
      affected := array_append(affected, me);
    end if;
    nw := yw_private.merge(old, p);
  end if;

  update public.docs x set data = nw, updated_at = now() where x.col = p_col and x.id = p_id;

  if p_col in ('notes', 'comments') and own is not null then affected := array_append(affected, own); end if;
  if p_col = 'hocas' then
    -- puanı değişenler: yönetici değişikliğinde bütün eski/yeni anahtarlar, kullanıcıda kendisi
    if adm then
      select coalesce(array_agg(distinct ps.uid), '{}') into affected from yw_private.pseudonyms ps
      where ps.rk in (select jsonb_object_keys(coalesce(old -> 'ratings', '{}'::jsonb)) union select jsonb_object_keys(coalesce(nw -> 'ratings', '{}'::jsonb)));
    else
      affected := array_append(affected, me);
    end if;
  end if;
  if p_col = 'users' and p_id ~ '^[0-9a-f-]{36}$' then affected := array_append(affected, p_id::uuid); end if;
  if p_col = 'requests' then
    if old ->> 'doneBy' ~ '^[0-9a-f-]{36}$' then affected := array_append(affected, (old ->> 'doneBy')::uuid); end if;
    if nw ->> 'doneBy' ~ '^[0-9a-f-]{36}$' then affected := array_append(affected, (nw ->> 'doneBy')::uuid); end if;
  end if;
  perform yw_private.recalc(u) from (select distinct unnest(affected) as u) z where u is not null;
  return nw;
end $$;

create or replace function public.doc_delete(p_col text, p_id text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  adm boolean := yw_private.is_admin();
  old jsonb; own uuid; parent_owner uuid; affected uuid[] := '{}';
begin
  if me is null then perform yw_private.fail('Giriş yapmalısın.'); end if;
  select x.data into old from public.docs x where x.col = p_col and x.id = p_id for update;
  if old is null then return; end if;
  select o.uid into own from yw_private.doc_owner o where o.col = p_col and o.id = p_id;

  if not adm then
    if p_col = 'private' then
      if p_id <> me::text then perform yw_private.fail('Özel kayıt yalnızca sahibine açık.'); end if;
    elsif p_col in ('notes', 'requests') then
      if own is distinct from me then perform yw_private.fail('Bu kaydı silemezsin.'); end if;
    elsif p_col = 'comments' then
      if own is distinct from me then
        select o.uid into parent_owner from yw_private.doc_owner o where o.col = 'notes' and old ->> 'tt' = 'note' and o.id = old ->> 'tid';
        if parent_owner is distinct from me then perform yw_private.fail('Bu yorumu silemezsin.'); end if;
      end if;
    else
      perform yw_private.fail('Bu kaydı yalnızca yönetim siler.');
    end if;
  end if;

  if own is not null then affected := array_append(affected, own); end if;
  if p_col = 'notes' then
    -- notun yorumları da gider
    select affected || coalesce(array_agg(o.uid), '{}') into affected
      from public.docs x join yw_private.doc_owner o on o.col = x.col and o.id = x.id
      where x.col = 'comments' and x.data ->> 'tt' = 'note' and x.data ->> 'tid' = p_id;
    delete from yw_private.doc_owner o using public.docs x
      where o.col = x.col and o.id = x.id and x.col = 'comments' and x.data ->> 'tt' = 'note' and x.data ->> 'tid' = p_id;
    delete from public.docs x where x.col = 'comments' and x.data ->> 'tt' = 'note' and x.data ->> 'tid' = p_id;
  end if;
  if p_col = 'requests' and old ->> 'doneBy' ~ '^[0-9a-f-]{36}$' then affected := array_append(affected, (old ->> 'doneBy')::uuid); end if;
  if p_col = 'hocas' then
    select affected || coalesce(array_agg(ps.uid), '{}') into affected from yw_private.pseudonyms ps
      where ps.rk in (select jsonb_object_keys(coalesce(old -> 'ratings', '{}'::jsonb)));
  end if;

  delete from public.docs x where x.col = p_col and x.id = p_id;
  delete from yw_private.doc_owner o where o.col = p_col and o.id = p_id;
  perform yw_private.recalc(u) from (select distinct unnest(affected) as u) z where u is not null;
end $$;

-- Market: fiyat ve bakiye sunucuda denetlenir
create or replace function public.buy_item(p_item text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  u jsonb; price integer; bal numeric;
begin
  if me is null then perform yw_private.fail('Giriş yapmalısın.'); end if;
  select m.price into price from yw_private.market m where m.id = p_item;
  if price is null then perform yw_private.fail('Bu ürün markette yok.'); end if;
  perform yw_private.recalc(me);
  select x.data into u from public.docs x where x.col = 'users' and x.id = me::text for update;
  if u is null then perform yw_private.fail('Önce hesap açmalısın.'); end if;
  if coalesce(u -> 'items', '{}'::jsonb) ? p_item then perform yw_private.fail('Bu ürün zaten sende.'); end if;
  bal := coalesce((u -> 'kb' ->> 'all')::numeric, 0) + greatest(0, coalesce((u ->> 'gift')::numeric, 0)) - greatest(0, coalesce((u ->> 'spent')::numeric, 0));
  if bal < price then perform yw_private.fail('Kubben yetmiyor.'); end if;
  u := u || jsonb_build_object('spent', greatest(0, coalesce((u ->> 'spent')::numeric, 0)) + price,
                               'items', coalesce(u -> 'items', '{}'::jsonb) || jsonb_build_object(p_item, yw_private.now_ms()));
  update public.docs x set data = u, updated_at = now() where x.col = 'users' and x.id = me::text;
  return u;
end $$;

-- ---------------------------------------------------------------- kayıt: yalnızca okul e-postası
create or replace function yw_private.check_signup_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email is null or lower(new.email) !~ '^[a-z0-9][a-z0-9._%+-]{1,40}@std\.yeditepe\.edu\.tr$' then
    raise exception 'Yalnızca @std.yeditepe.edu.tr adresiyle kayıt olunabilir.';
  end if;
  return new;
end $$;

grant usage on schema yw_private to supabase_auth_admin;
grant execute on function yw_private.check_signup_email() to supabase_auth_admin;

create trigger yw_check_signup_email before insert or update of email on auth.users
  for each row execute function yw_private.check_signup_email();

-- ---------------------------------------------------------------- yetkiler
revoke all on all functions in schema yw_private from public;
grant execute on function yw_private.check_signup_email() to supabase_auth_admin;
revoke all on function public.doc_set(text, text, jsonb) from public, anon;
revoke all on function public.doc_update(text, text, jsonb) from public, anon;
revoke all on function public.doc_delete(text, text) from public, anon;
revoke all on function public.buy_item(text) from public, anon;
revoke all on function public.my_info() from public, anon;
grant execute on function public.doc_set(text, text, jsonb) to authenticated;
grant execute on function public.doc_update(text, text, jsonb) to authenticated;
grant execute on function public.doc_delete(text, text) to authenticated;
grant execute on function public.buy_item(text) to authenticated;
grant execute on function public.my_info() to authenticated;

-- ---------------------------------------------------------------- canlı güncelleme
alter publication supabase_realtime add table public.docs;
