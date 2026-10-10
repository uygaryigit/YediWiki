-- YediWiki 0002: gizlilik ve özel hesaplar
--
-- 1) Takma adlar belge başına. Kullanıcının bir belgedeki anahtarı:
--      'k' + HMAC-SHA256(kişisel gizli, '<koleksiyon>/<kimlik>') onaltılık ilk 24 hane.
--    İki belgedeki anahtarlar birbirine bağlanamaz; biri bir puanını adıyla paylaşsa bile öteki puanları,
--    beğenileri ve anonim paylaşımları açığa çıkmaz. Kişisel gizli yalnızca sahibine verilir (my_info),
--    tarayıcı kendi anahtarlarını bununla hesaplar. Sunucu ters arama için yw_private.keymap tutar.
-- 2) Kubbe ikiye ayrıldı. users.kb (herkese açık, sıralama) yalnızca adla yapılanları sayar;
--    private.kb (yalnızca sahibi görür, bakiye) her şeyi sayar. Hoca puanı, anonim not ve yorum,
--    anonim içeriğe gelen beğeni açık profilde değişiklik yapmaz; açık kayıt değişmediği sürece yazılmaz.
-- 3) Anonim notla karşılanan istekte karşılayan (doneBy) boş kalır; kubbe notun sahibine gider.
-- 4) DersÖlçer oyları kullanıcı kaydında değil, ders başına 'zor' belgesinde takma adla durur.
-- 5) İçerik kuralları sunucuda da: notlar yalnızca Google Drive bağlantısı, alan listesi ve uzunluk sınırları.
-- 6) Özel hesaplar: yönetici (yonetici@yediwiki.com) ve ortak deneme hesabı. Panelden açılıp doğrulanınca
--    profilleri kendiliğinden kurulur; şifre ve e-postaları uygulama üzerinden değiştirilemez.

-- ---------------------------------------------------------------- takma adlar
drop function if exists yw_private.rk(uuid);
drop table if exists yw_private.pseudonyms;
drop function if exists yw_private.author_norm(text, jsonb, uuid);

create table if not exists yw_private.secrets (uid uuid primary key, secret text not null);
create table if not exists yw_private.keymap (k text primary key, uid uuid not null);
create index if not exists keymap_uid_idx on yw_private.keymap (uid);
alter table yw_private.secrets enable row level security;
alter table yw_private.keymap enable row level security;

create or replace function yw_private.secret_of(p_uid uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare s text;
begin
  select x.secret into s from yw_private.secrets x where x.uid = p_uid;
  if s is null then
    insert into yw_private.secrets (uid, secret) values (p_uid, encode(extensions.gen_random_bytes(32), 'hex'))
    on conflict (uid) do nothing;
    select x.secret into s from yw_private.secrets x where x.uid = p_uid;
  end if;
  return s;
end $$;

create or replace function yw_private.key_for(p_uid uuid, p_col text, p_id text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_k text;
begin
  v_k := 'k' || substr(encode(extensions.hmac(p_col || '/' || p_id, yw_private.secret_of(p_uid), 'sha256'), 'hex'), 1, 24);
  insert into yw_private.keymap as m (k, uid) values (v_k, p_uid) on conflict on constraint keymap_pkey do nothing;
  return v_k;
end $$;

-- ---------------------------------------------------------------- küçük yardımcılar
create or replace function yw_private.num(v jsonb) returns numeric
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(v) = 'number' then (v #>> '{}')::numeric end
$$;

create or replace function yw_private.obj(v jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(v) = 'object' then v else '{}'::jsonb end
$$;

create or replace function yw_private.valid_rating(r jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(r) = 'object' and jsonb_typeof(r -> 'a') = 'number' and jsonb_typeof(r -> 'o') = 'number'
                   and jsonb_typeof(r -> 'n') = 'number' and jsonb_typeof(r -> 'd') = 'number'
    then (select bool_and((r ->> x)::numeric between 0.5 and 5 and ((r ->> x)::numeric * 2) = floor((r ->> x)::numeric * 2))
          from unnest(array['a', 'o', 'n', 'd']) x)
    else false end
$$;

-- Kaydedilen puan yalnızca bu alanları taşır; zamanı sunucu koyar
create or replace function yw_private.clean_rating(r jsonb, p_at bigint) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('a', r -> 'a', 'o', r -> 'o', 'n', r -> 'n', 'd', r -> 'd',
    'c', case when jsonb_typeof(r -> 'c') = 'string' and length(r ->> 'c') <= 12 then r -> 'c' else '""'::jsonb end,
    'tk', case when jsonb_typeof(r -> 'tk') = 'number' then r -> 'tk' else '0'::jsonb end,
    'at', to_jsonb(p_at))
$$;

-- DersÖlçer oyu: zorluk (z) ve iş yükü (y), 1-5 arası tam sayı
create or replace function yw_private.valid_zor(r jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(r) = 'object' and jsonb_typeof(r -> 'z') = 'number' and jsonb_typeof(r -> 'y') = 'number'
    then (r ->> 'z')::numeric in (1, 2, 3, 4, 5) and (r ->> 'y')::numeric in (1, 2, 3, 4, 5)
    else false end
$$;

-- ---------------------------------------------------------------- içerik kuralları
-- users: istemcinin yazabildiği alanlar + sunucu alanları; ad/yıl gizliyse özel kayda taşınır
create or replace function yw_private.users_norm(p_uid text, d jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pv jsonb := '{}'::jsonb;
begin
  d := coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(d) e
                 where e.key = any (array['username', 'first', 'last', 'showName', 'yil', 'showYil', 'bolum', 'avk', 'emoji', 'harf', 'urun', 'color', 'pic',
                                          'role', 'bonus', 'spent', 'items', 'gift', 'verifiedAt', 'at', 'kb', 'shared'])), '{}'::jsonb);
  if d ? 'username' and coalesce(d ->> 'username', '') !~ '^[a-z0-9][a-z0-9._]{2,19}$' then
    perform yw_private.fail('Kullanıcı adı 3-20 karakter olmalı; küçük harf, rakam ve nokta kullan.');
  end if;
  if d ? 'first' then d := d || jsonb_build_object('first', left(coalesce(d ->> 'first', ''), 40)); end if;
  if d ? 'last' then d := d || jsonb_build_object('last', left(coalesce(d ->> 'last', ''), 40)); end if;
  if d ? 'bolum' then d := d || jsonb_build_object('bolum', left(coalesce(d ->> 'bolum', ''), 80)); end if;
  if d ? 'pic' then d := d || '{"pic": ""}'::jsonb; end if;                 -- fotoğraf yüklenmez
  if coalesce(d -> 'showName', 'false'::jsonb) <> 'true'::jsonb and (coalesce(d ->> 'first', '') <> '' or coalesce(d ->> 'last', '') <> '') then
    pv := pv || jsonb_build_object('first', coalesce(d ->> 'first', ''), 'last', coalesce(d ->> 'last', ''));
    d := d || '{"first": "", "last": ""}'::jsonb;
  end if;
  if coalesce(d -> 'showYil', 'false'::jsonb) <> 'true'::jsonb and coalesce(d -> 'yil', '0'::jsonb) not in ('0'::jsonb, 'null'::jsonb) then
    pv := pv || jsonb_build_object('yil', d -> 'yil');
    d := d || '{"yil": 0}'::jsonb;
  end if;
  if pv <> '{}'::jsonb then
    insert into public.docs as x (col, id, data) values ('private', p_uid, pv)
    on conflict (col, id) do update set data = x.data || excluded.data, updated_at = now();
  end if;
  if d ->> 'avk' = 'urun' and not (yw_private.obj(d -> 'items') ? coalesce(d ->> 'urun', '')) then
    d := d || '{"avk": "emoji", "urun": ""}'::jsonb;
  end if;
  return d;
end $$;

-- notes / comments / requests: alan listesi, uzunluklar; not yalnızca Google Drive bağlantısıyla
create or replace function yw_private.content_norm(p_col text, d jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare keep text[];
begin
  keep := case p_col
    when 'notes' then array['cid', 'h', 'tk', 'type', 'title', 'desc', 'drive', 'photos', 'anon', 'by', 'byk', 'at', 'likes', 'reports', 'ok']
    when 'comments' then array['tt', 'tid', 'text', 'anon', 'h', 'c', 'tk', 'r', 'by', 'byk', 'at', 'likes', 'reports', 'ok']
    when 'requests' then array['cid', 'kind', 'text', 'by', 'at', 'plus', 'done', 'nid', 'doneBy', 'doneAt']
  end;
  if keep is null then return d; end if;
  d := coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(d) e where e.key = any (keep)), '{}'::jsonb);
  if p_col = 'notes' then
    if coalesce(d ->> 'drive', '') !~ '^https://(drive|docs)\.google\.com/\S+$' or length(d ->> 'drive') > 600 then
      perform yw_private.fail('Not yalnızca Google Drive bağlantısıyla paylaşılır.');
    end if;
    if length(trim(coalesce(d ->> 'title', ''))) < 2 then perform yw_private.fail('Notun başlığını yaz.'); end if;
    if coalesce(d ->> 'cid', '') = '' then perform yw_private.fail('Dersi seç.'); end if;
    d := d || jsonb_build_object('title', left(d ->> 'title', 80), 'desc', left(coalesce(d ->> 'desc', ''), 500), 'photos', '[]'::jsonb);
  elsif p_col = 'comments' then
    if coalesce(d ->> 'tt', '') not in ('note', 'course', 'hoca') or coalesce(d ->> 'tid', '') = '' then
      perform yw_private.fail('Yorumun yeri belli değil.');
    end if;
    if length(trim(coalesce(d ->> 'text', ''))) = 0 then perform yw_private.fail('Yorum boş olamaz.'); end if;
    d := d || jsonb_build_object('text', left(d ->> 'text', 1000));
  else
    if coalesce(d ->> 'cid', '') = '' then perform yw_private.fail('Dersi seç.'); end if;
    d := d || jsonb_build_object('text', left(coalesce(d ->> 'text', ''), 140),
                                 'kind', case when d ->> 'kind' in ('vize', 'final', 'ozet', 'cikmis', 'genel') then d ->> 'kind' else 'genel' end);
  end if;
  return d;
end $$;

-- notes/comments: isimsizse yazar alanı boş, yazarın bu belgedeki anahtarı byk'de; değilse by = kullanıcı kimliği
create or replace function yw_private.author_norm(p_col text, p_id text, d jsonb, p_owner uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if p_owner is null then return d; end if;
  if p_col in ('notes', 'comments') and coalesce(d -> 'anon', 'false'::jsonb) = 'true'::jsonb then
    return (d - 'by' - 'byk') || jsonb_build_object('by', '', 'byk', yw_private.key_for(p_owner, p_col, p_id));
  end if;
  return (d - 'byk') || jsonb_build_object('by', p_owner::text);
end $$;

-- ---------------------------------------------------------------- kubbe
-- Puanlar istemcideki KUBBE ile aynı: hesap 50, not 25 (+10 fotoğraf), yorum 5, beğeni 2, hoca puanı 10, karşılanan istek 10.
create or replace function yw_private.recalc(p_uid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  ts bigint := yw_private.term_start_ms();
  u jsonb; bonus numeric; b_term numeric; a record; pub jsonb; prv jsonb;
begin
  select d.data into u from public.docs d where d.col = 'users' and d.id = p_uid::text;
  if u is null then return; end if;
  bonus := greatest(0, coalesce(yw_private.num(u -> 'bonus'), 0));
  b_term := case when coalesce(yw_private.num(u -> 'at'), 0) >= ts then least(bonus, 50) else 0 end;

  with items as (
    select coalesce(d.data ->> 'by', '') = '' as anon, 'n' as kind,
           25 + case when jsonb_typeof(d.data -> 'photos') = 'array' and jsonb_array_length(d.data -> 'photos') > 0 then 10 else 0 end
              + 2 * yw_private.likes(d.data) as p,
           yw_private.likes(d.data) as lk, coalesce(yw_private.num(d.data -> 'at'), 0) as at
      from public.docs d join yw_private.doc_owner o on o.col = d.col and o.id = d.id
     where d.col = 'notes' and o.uid = p_uid and not yw_private.hidden(d.data)
    union all
    select coalesce(d.data ->> 'by', '') = '', 'c', 5 + 2 * yw_private.likes(d.data), yw_private.likes(d.data), coalesce(yw_private.num(d.data -> 'at'), 0)
      from public.docs d join yw_private.doc_owner o on o.col = d.col and o.id = d.id
     where d.col = 'comments' and o.uid = p_uid and not yw_private.hidden(d.data)
    union all
    select true, 'r', 10, 0, coalesce(yw_private.num(e.value -> 'at'), 0)
      from public.docs d
      cross join lateral jsonb_each(yw_private.obj(d.data -> 'ratings')) e
      join yw_private.keymap m on m.k = e.key
     where d.col = 'hocas' and m.uid = p_uid and yw_private.valid_rating(e.value)
    union all
    select coalesce(n.data ->> 'by', '') = '', 'f', 10, 0, coalesce(yw_private.num(r.data -> 'doneAt'), 0)
      from public.docs r
      join yw_private.doc_owner o on o.col = 'notes' and o.id = r.data ->> 'nid'
      join public.docs n on n.col = 'notes' and n.id = o.id
     where r.col = 'requests' and r.data -> 'done' = 'true'::jsonb and o.uid = p_uid and coalesce(r.data ->> 'by', '') <> p_uid::text
  )
  select coalesce(sum(p) filter (where not anon), 0) as pa, coalesce(sum(p) filter (where not anon and at >= ts), 0) as pt,
         coalesce(sum(p), 0) as fa, coalesce(sum(p) filter (where at >= ts), 0) as ft,
         count(*) filter (where kind = 'n' and not anon) as pn, count(*) filter (where kind = 'n') as fn,
         count(*) filter (where kind = 'c' and not anon) as pc, count(*) filter (where kind = 'c') as fc,
         count(*) filter (where kind = 'r') as fr,
         count(*) filter (where kind = 'f' and not anon) as pf, count(*) filter (where kind = 'f') as ff,
         coalesce(sum(lk) filter (where not anon), 0) as pl, coalesce(sum(lk), 0) as fl
    into a from items;

  pub := jsonb_build_object('all', bonus + a.pa, 'term', b_term + a.pt, 'ts', ts, 'notes', a.pn, 'comments', a.pc,
                            'ratings', 0, 'grades', 0, 'likes', a.pl, 'fills', a.pf);
  prv := jsonb_build_object('all', bonus + a.fa, 'term', b_term + a.ft, 'ts', ts, 'notes', a.fn, 'comments', a.fc,
                            'ratings', a.fr, 'grades', 0, 'likes', a.fl, 'fills', a.ff);
  -- açık kayıt yalnızca değişince yazılır: anonim bir işlem herkese açık bir değişiklik bırakmaz
  update public.docs d set data = d.data || jsonb_build_object('kb', pub), updated_at = now()
   where d.col = 'users' and d.id = p_uid::text and (d.data -> 'kb') is distinct from pub;
  insert into public.docs as x (col, id, data) values ('private', p_uid::text, jsonb_build_object('kb', prv))
  on conflict (col, id) do update set data = x.data || jsonb_build_object('kb', prv), updated_at = now()
   where (x.data -> 'kb') is distinct from prv;
end $$;

-- ---------------------------------------------------------------- okuma yardımcısı
create or replace function public.my_info() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return null; end if;
  return jsonb_build_object('uid', auth.uid()::text, 'sec', yw_private.secret_of(auth.uid()), 'admin', yw_private.is_admin());
end $$;

-- ---------------------------------------------------------------- yazma
create or replace function public.doc_set(p_col text, p_id text, p_data jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  adm boolean := yw_private.is_admin();
  k text;
  now_ms bigint := yw_private.now_ms();
  old jsonb; own uuid; d jsonb := p_data; aff uuid[] := '{}';
begin
  if me is null then perform yw_private.fail('Giriş yapmalısın.'); end if;
  if d is null or jsonb_typeof(d) <> 'object' then perform yw_private.fail('Geçersiz kayıt.'); end if;
  if p_col is null or p_id is null then perform yw_private.fail('Geçersiz kayıt.'); end if;
  k := yw_private.key_for(me, p_col, p_id);
  select x.data into old from public.docs x where x.col = p_col and x.id = p_id for update;
  select o.uid into own from yw_private.doc_owner o where o.col = p_col and o.id = p_id;

  if p_col = 'users' then
    if p_id <> me::text and not adm then perform yw_private.fail('Başkasının profili değiştirilemez.'); end if;
    if not adm then
      d := d - 'role' - 'bonus' - 'spent' - 'items' - 'gift' - 'verifiedAt' - 'kb' - 'at' - 'shared';
      if old is null then
        d := d || jsonb_build_object('bonus', 50, 'spent', 0, 'items', '{}'::jsonb, 'gift', 0, 'at', now_ms, 'verifiedAt', now_ms, 'role', 'user');
      else
        d := d || jsonb_strip_nulls(jsonb_build_object('bonus', old -> 'bonus', 'spent', old -> 'spent', 'items', old -> 'items', 'gift', old -> 'gift',
                                     'at', old -> 'at', 'verifiedAt', old -> 'verifiedAt', 'role', old -> 'role', 'kb', old -> 'kb', 'shared', old -> 'shared'));
      end if;
    elsif old is null then
      d := jsonb_build_object('bonus', 0, 'spent', 0, 'items', '{}'::jsonb, 'gift', 0, 'at', now_ms, 'verifiedAt', now_ms,
                              'role', case when p_id = me::text then 'admin' else 'user' end) || (d - 'kb');
    end if;
    d := yw_private.users_norm(p_id, d);
    own := case when p_id ~ '^[0-9a-f-]{36}$' then p_id::uuid end;

  elsif p_col = 'private' then
    if p_id <> me::text then perform yw_private.fail('Özel kayıt yalnızca sahibine açık.'); end if;
    d := coalesce(old, '{}'::jsonb) || (d - 'kb');
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
    if not adm then d := yw_private.content_norm(p_col, d); end if;
    d := yw_private.author_norm(p_col, p_id, d, own);

  elsif p_col = 'hocas' then
    if adm then
      own := coalesce(own, me);
    elsif old is null then
      if not exists (select 1 from yw_private.kadro x where x.id = p_id) then perform yw_private.fail('Bu hoca listede yok.'); end if;
      if exists (select 1 from jsonb_object_keys(d - 'at' - 'kadro' - 'ratings') z) then perform yw_private.fail('Hoca bilgisini yalnızca yönetim değiştirir.'); end if;
      if not yw_private.own_key(d -> 'ratings', k) or not yw_private.valid_rating(d -> 'ratings' -> k) then perform yw_private.fail('Puan geçersiz.'); end if;
      d := jsonb_build_object('at', now_ms, 'kadro', true, 'ratings', jsonb_build_object(k, yw_private.clean_rating(d -> 'ratings' -> k, now_ms)));
    else
      -- aynı anda iki kişi ilk puanı verirse ikincisi güncelleme olarak işlenir
      return public.doc_update(p_col, p_id, jsonb_build_object('ratings', coalesce(d -> 'ratings', '{}'::jsonb)));
    end if;

  elsif p_col = 'zor' then
    if not adm then
      if old is not null then
        return public.doc_update(p_col, p_id, jsonb_build_object('v', coalesce(d -> 'v', '{}'::jsonb)));
      end if;
      if p_id !~ '^[A-Z]{2,6}[0-9]{3}[A-Z]?$' then perform yw_private.fail('Ders kodu geçersiz.'); end if;
      if not exists (select 1 from public.docs x where x.col = 'users' and x.id = me::text) then perform yw_private.fail('Önce hesap açmalısın.'); end if;
      if exists (select 1 from jsonb_object_keys(d - 'v') z) or not yw_private.own_key(d -> 'v', k) or not yw_private.valid_zor(d -> 'v' -> k) then
        perform yw_private.fail('Oy geçersiz.');
      end if;
      d := jsonb_build_object('v', jsonb_build_object(k, jsonb_build_object('z', d -> 'v' -> k -> 'z', 'y', d -> 'v' -> k -> 'y', 'at', now_ms)));
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

  if p_col in ('users', 'notes', 'comments') and own is not null then aff := array_append(aff, own); end if;
  if p_col = 'hocas' then
    select aff || coalesce(array_agg(distinct m.uid), '{}') into aff from yw_private.keymap m
     where m.k in (select jsonb_object_keys(yw_private.obj(old -> 'ratings')) union select jsonb_object_keys(yw_private.obj(d -> 'ratings')));
  end if;
  perform yw_private.recalc(z.u) from (select distinct unnest(aff) as u) z where z.u is not null;
  return d;
end $$;

create or replace function public.doc_update(p_col text, p_id text, p_patch jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  adm boolean := yw_private.is_admin();
  k text;
  now_ms bigint := yw_private.now_ms();
  old jsonb; own uuid; nw jsonb; p jsonb := p_patch; key text; v jsonb; aff uuid[] := '{}';
  note_owner uuid; note jsonb;
begin
  if me is null then perform yw_private.fail('Giriş yapmalısın.'); end if;
  if p is null or jsonb_typeof(p) <> 'object' then perform yw_private.fail('Geçersiz değişiklik.'); end if;
  if p_col is null or p_id is null then perform yw_private.fail('Geçersiz değişiklik.'); end if;
  k := yw_private.key_for(me, p_col, p_id);
  select x.data into old from public.docs x where x.col = p_col and x.id = p_id for update;
  if old is null then perform yw_private.fail('Kayıt bulunamadı.'); end if;
  select o.uid into own from yw_private.doc_owner o where o.col = p_col and o.id = p_id;

  if adm then
    nw := yw_private.merge(old, case when p_col = 'private' then p - 'kb' else p end);
    if p_col in ('notes', 'comments') then nw := yw_private.author_norm(p_col, p_id, nw, own); end if;
    if p_col = 'users' then nw := yw_private.users_norm(p_id, nw); end if;

  elsif p_col = 'users' then
    if p_id <> me::text then perform yw_private.fail('Başkasının profili değiştirilemez.'); end if;
    if p ?| array['role', 'bonus', 'spent', 'items', 'gift', 'verifiedAt', 'kb', 'login', 'email', 'at', 'shared'] then
      perform yw_private.fail('Bu alanlar değiştirilemez.');
    end if;
    nw := yw_private.users_norm(p_id, yw_private.merge(old, p));

  elsif p_col = 'private' then
    if p_id <> me::text then perform yw_private.fail('Özel kayıt yalnızca sahibine açık.'); end if;
    nw := yw_private.merge(old, p - 'kb');

  elsif p_col = 'requests' and p ? 'done' then
    -- karşılama: kendi notunla, aynı dersten; notun anonimse karşılayan boş kalır
    if exists (select 1 from jsonb_object_keys(p - 'done' - 'nid' - 'doneBy' - 'doneAt') z) then perform yw_private.fail('İstek kapatılamadı.'); end if;
    select o.uid, x.data into note_owner, note from public.docs x join yw_private.doc_owner o on o.col = x.col and o.id = x.id
     where x.col = 'notes' and x.id = coalesce(p ->> 'nid', '');
    if old -> 'done' = 'true'::jsonb or p -> 'done' <> 'true'::jsonb or (p ->> 'doneBy') is distinct from me::text
       or note_owner is distinct from me or (note ->> 'cid') is distinct from (old ->> 'cid') then
      perform yw_private.fail('İstek kapatılamadı.');
    end if;
    p := p || jsonb_build_object('doneBy', case when coalesce(note ->> 'by', '') = '' then '' else me::text end, 'doneAt', now_ms);
    nw := yw_private.merge(old, p);
    aff := array_append(aff, me);

  elsif p_col in ('notes', 'comments', 'requests') and own = me
        and not (p ?| array['likes', 'reports', 'ok', 'by', 'byk', 'at', 'plus', 'nid', 'doneBy', 'doneAt']) then
    -- sahibi kendi kaydını düzenliyor
    nw := yw_private.content_norm(p_col, yw_private.merge(old, p));
    if p_col in ('notes', 'comments') then nw := yw_private.author_norm(p_col, p_id, nw, own); end if;

  else
    -- başkasının kaydı: yalnızca kendi anahtarının altındaki alanlar
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
          p := jsonb_set(p, array['ratings', k], yw_private.clean_rating(v -> k, now_ms));
        end if;
      elsif p_col = 'requests' and key = 'plus' then
        if own = me then perform yw_private.fail('Kendi isteğine katılamazsın.'); end if;
        if not yw_private.own_key(v, k) or (v -> k) not in ('true'::jsonb, 'null'::jsonb) then perform yw_private.fail('Katılım geçersiz.'); end if;
      elsif p_col = 'courses' and key in ('grades', 'dists') then
        if not yw_private.own_key(v, k) or jsonb_typeof(v -> k) not in ('object', 'null') then perform yw_private.fail('Not bilgisi geçersiz.'); end if;
      elsif p_col = 'zor' and key = 'v' then
        if not yw_private.own_key(v, k) or not (jsonb_typeof(v -> k) = 'null' or yw_private.valid_zor(v -> k)) then perform yw_private.fail('Oy geçersiz.'); end if;
        if jsonb_typeof(v -> k) <> 'null' then
          p := jsonb_set(p, array['v', k], jsonb_build_object('z', v -> k -> 'z', 'y', v -> k -> 'y', 'at', now_ms));
        end if;
      else
        perform yw_private.fail('Bu alanı değiştiremezsin.');
      end if;
    end loop;
    nw := yw_private.merge(old, p);
  end if;

  update public.docs x set data = nw, updated_at = now() where x.col = p_col and x.id = p_id;

  if p_col in ('notes', 'comments') and own is not null then aff := array_append(aff, own); end if;
  if p_col = 'users' and p_id ~ '^[0-9a-f-]{36}$' then aff := array_append(aff, p_id::uuid); end if;
  if p_col = 'hocas' then
    if adm then
      select aff || coalesce(array_agg(distinct m.uid), '{}') into aff from yw_private.keymap m
       where m.k in (select jsonb_object_keys(yw_private.obj(old -> 'ratings')) union select jsonb_object_keys(yw_private.obj(nw -> 'ratings')));
    else
      aff := array_append(aff, me);
    end if;
  end if;
  if p_col = 'requests' and adm then
    select aff || coalesce(array_agg(distinct o.uid), '{}') into aff from yw_private.doc_owner o
     where o.col = 'notes' and o.id in (old ->> 'nid', nw ->> 'nid');
  end if;
  perform yw_private.recalc(z.u) from (select distinct unnest(aff) as u) z where z.u is not null;
  return nw;
end $$;

create or replace function public.doc_delete(p_col text, p_id text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  adm boolean := yw_private.is_admin();
  old jsonb; own uuid; parent_owner uuid; aff uuid[] := '{}';
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

  if own is not null then aff := array_append(aff, own); end if;
  if p_col = 'notes' then
    -- notun yorumları da gider
    select aff || coalesce(array_agg(o.uid), '{}') into aff
      from public.docs x join yw_private.doc_owner o on o.col = x.col and o.id = x.id
     where x.col = 'comments' and x.data ->> 'tt' = 'note' and x.data ->> 'tid' = p_id;
    delete from yw_private.doc_owner o using public.docs x
     where o.col = x.col and o.id = x.id and x.col = 'comments' and x.data ->> 'tt' = 'note' and x.data ->> 'tid' = p_id;
    delete from public.docs x where x.col = 'comments' and x.data ->> 'tt' = 'note' and x.data ->> 'tid' = p_id;
  end if;
  if p_col = 'requests' then
    select aff || coalesce(array_agg(o.uid), '{}') into aff from yw_private.doc_owner o where o.col = 'notes' and o.id = old ->> 'nid';
  end if;
  if p_col = 'hocas' then
    select aff || coalesce(array_agg(distinct m.uid), '{}') into aff from yw_private.keymap m
     where m.k in (select jsonb_object_keys(yw_private.obj(old -> 'ratings')));
  end if;

  delete from public.docs x where x.col = p_col and x.id = p_id;
  delete from yw_private.doc_owner o where o.col = p_col and o.id = p_id;
  perform yw_private.recalc(z.u) from (select distinct unnest(aff) as u) z where z.u is not null;
end $$;

-- Market: fiyat ve bakiye sunucuda; bakiye tam hesaptan (private.kb) + hediye − harcanan
create or replace function public.buy_item(p_item text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  u jsonb; price integer; total numeric; bal numeric;
begin
  if me is null then perform yw_private.fail('Giriş yapmalısın.'); end if;
  select m.price into price from yw_private.market m where m.id = p_item;
  if price is null then perform yw_private.fail('Bu ürün markette yok.'); end if;
  perform yw_private.recalc(me);
  select x.data into u from public.docs x where x.col = 'users' and x.id = me::text for update;
  if u is null then perform yw_private.fail('Önce hesap açmalısın.'); end if;
  if yw_private.obj(u -> 'items') ? p_item then perform yw_private.fail('Bu ürün zaten sende.'); end if;
  select yw_private.num(x.data -> 'kb' -> 'all') into total from public.docs x where x.col = 'private' and x.id = me::text;
  bal := coalesce(total, 0) + greatest(0, coalesce(yw_private.num(u -> 'gift'), 0)) - greatest(0, coalesce(yw_private.num(u -> 'spent'), 0));
  if bal < price then perform yw_private.fail('Kubben yetmiyor.'); end if;
  u := u || jsonb_build_object('spent', greatest(0, coalesce(yw_private.num(u -> 'spent'), 0)) + price,
                               'items', yw_private.obj(u -> 'items') || jsonb_build_object(p_item, yw_private.now_ms()));
  update public.docs x set data = u, updated_at = now() where x.col = 'users' and x.id = me::text;
  return u;
end $$;

-- ---------------------------------------------------------------- DersÖlçer belgeleri
alter table public.docs drop constraint if exists docs_col_check;
alter table public.docs add constraint docs_col_check
  check (col in ('users', 'private', 'notes', 'comments', 'hocas', 'courses', 'bolumler', 'requests', 'zor'));

-- ---------------------------------------------------------------- özel hesaplar
create table if not exists yw_private.special_accounts (
  email text primary key check (email = lower(email)),
  kind text not null check (kind in ('admin', 'shared')),
  profile jsonb not null default '{}'::jsonb
);
alter table yw_private.special_accounts enable row level security;
insert into yw_private.special_accounts (email, kind, profile) values
  ('yonetici@yediwiki.com', 'admin', '{"username": "yonetici", "first": "", "last": "", "showName": false, "yil": 0, "showYil": false, "bolum": "",
    "avk": "emoji", "emoji": "🛡️", "color": "#FFE14D", "pic": "", "bonus": 0, "gift": 100000}'),
  ('deneme123@std.yeditepe.edu.tr', 'shared', '{"username": "deneme123", "first": "Deneme", "last": "Hesabı", "showName": false, "yil": 0, "showYil": false, "bolum": "",
    "avk": "emoji", "emoji": "🧪", "color": "#E3E7F2", "pic": "", "bonus": 50, "gift": 10000, "shared": true}')
on conflict (email) do update set kind = excluded.kind, profile = excluded.profile;

-- kayıt: okul e-postası ya da listedeki özel hesap
create or replace function yw_private.check_signup_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email is not null and exists (select 1 from yw_private.special_accounts s where s.email = lower(new.email)) then
    return new;
  end if;
  if new.email is null or lower(new.email) !~ '^[a-z0-9][a-z0-9._%+-]{1,40}@std\.yeditepe\.edu\.tr$' then
    raise exception 'Yalnızca @std.yeditepe.edu.tr adresiyle kayıt olunabilir.';
  end if;
  return new;
end $$;

-- özel hesap doğrulanınca (panelden "Auto Confirm" ile açılınca hemen) yetkisi ve profili kurulur
create or replace function yw_private.provision_special() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  sa yw_private.special_accounts%rowtype;
  d jsonb; now_ms bigint := yw_private.now_ms();
begin
  if new.email_confirmed_at is null then return new; end if;
  select * into sa from yw_private.special_accounts s where s.email = lower(coalesce(new.email, ''));
  if not found then return new; end if;
  if sa.kind = 'admin' then
    insert into yw_private.admins (uid) values (new.id) on conflict (uid) do nothing;
  end if;
  if not exists (select 1 from public.docs x where x.col = 'users' and x.id = new.id::text) then
    d := sa.profile || jsonb_build_object('role', case when sa.kind = 'admin' then 'admin' else 'user' end,
                                          'spent', 0, 'items', '{}'::jsonb, 'at', now_ms, 'verifiedAt', now_ms);
    d := yw_private.users_norm(new.id::text, d);
    begin
      insert into public.docs (col, id, data) values ('users', new.id::text, d);
    exception when unique_violation then
      insert into public.docs (col, id, data)
      values ('users', new.id::text, d || jsonb_build_object('username', left(d ->> 'username', 15) || substr(replace(new.id::text, '-', ''), 1, 4)));
    end;
    insert into yw_private.doc_owner (col, id, uid) values ('users', new.id::text, new.id) on conflict (col, id) do nothing;
    perform yw_private.recalc(new.id);
  end if;
  return new;
end $$;

-- özel hesapların şifresi ve e-postası uygulama (Auth) üzerinden değişmez; gerekirse SQL düzenleyicisinden
create or replace function yw_private.guard_special() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if session_user = 'supabase_auth_admin'
     and (new.encrypted_password is distinct from old.encrypted_password or new.email is distinct from old.email)
     and exists (select 1 from yw_private.special_accounts s where s.email = lower(coalesce(old.email, ''))) then
    raise exception 'Bu hesabın şifresi ve e-postası uygulamadan değiştirilemez.';
  end if;
  return new;
end $$;

drop trigger if exists yw_provision_special on auth.users;
create trigger yw_provision_special after insert or update of email_confirmed_at on auth.users
  for each row execute function yw_private.provision_special();
drop trigger if exists yw_guard_special on auth.users;
create trigger yw_guard_special before update on auth.users
  for each row execute function yw_private.guard_special();

-- ---------------------------------------------------------------- yetkiler
revoke all on all functions in schema yw_private from public, anon, authenticated;
grant execute on function yw_private.check_signup_email() to supabase_auth_admin;
grant execute on function yw_private.provision_special() to supabase_auth_admin;
grant execute on function yw_private.guard_special() to supabase_auth_admin;
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
