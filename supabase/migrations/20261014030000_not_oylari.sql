-- YediWiki 0003: notlara ▲ / ▼ oy
--
-- Notta 'likes' artık ▲ (yukarı) oylardır, yeni 'downs' alanı ▼ (aşağı) oylar. İkisi de belge başına takma adla
-- tutulur (yalnızca kendi anahtarın, true ya da null); aynı kişide ▲ ve ▼ birlikte olmaz, biri verilince öteki kalkar.
-- Kubbe: notuna gelen her ▲ 1 kubbe (eskiden beğeni 2). ▼ kubbe almaz; yalnızca sıralamada notu aşağı iter.
-- Yorum beğenisi 2 kubbe olarak kalır. kb'de 'ups' (not ▲ sayısı) ayrı, 'likes' artık yalnızca yorum beğenileri.

create or replace function yw_private.content_norm(p_col text, d jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare keep text[];
begin
  keep := case p_col
    when 'notes' then array['cid', 'h', 'tk', 'type', 'title', 'desc', 'drive', 'photos', 'anon', 'by', 'byk', 'at', 'likes', 'downs', 'reports', 'ok']
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
              + yw_private.likes(d.data) as p,
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
         coalesce(sum(lk) filter (where kind = 'c' and not anon), 0) as pl, coalesce(sum(lk) filter (where kind = 'c'), 0) as fl,
         coalesce(sum(lk) filter (where kind = 'n' and not anon), 0) as pu, coalesce(sum(lk) filter (where kind = 'n'), 0) as fu
    into a from items;

  pub := jsonb_build_object('all', bonus + a.pa, 'term', b_term + a.pt, 'ts', ts, 'notes', a.pn, 'comments', a.pc,
                            'ratings', 0, 'grades', 0, 'likes', a.pl, 'ups', a.pu, 'fills', a.pf);
  prv := jsonb_build_object('all', bonus + a.fa, 'term', b_term + a.ft, 'ts', ts, 'notes', a.fn, 'comments', a.fc,
                            'ratings', a.fr, 'grades', 0, 'likes', a.fl, 'ups', a.fu, 'fills', a.ff);
  -- açık kayıt yalnızca değişince yazılır: anonim bir işlem herkese açık bir değişiklik bırakmaz
  update public.docs d set data = d.data || jsonb_build_object('kb', pub), updated_at = now()
   where d.col = 'users' and d.id = p_uid::text and (d.data -> 'kb') is distinct from pub;
  insert into public.docs as x (col, id, data) values ('private', p_uid::text, jsonb_build_object('kb', prv))
  on conflict (col, id) do update set data = x.data || jsonb_build_object('kb', prv), updated_at = now()
   where (x.data -> 'kb') is distinct from prv;
end $$;

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
      d := (d - 'by' - 'byk' - 'at' - 'likes' - 'downs' - 'reports' - 'ok' - 'plus' - 'done' - 'nid' - 'doneBy' - 'doneAt')
           || jsonb_strip_nulls(jsonb_build_object('at', old -> 'at', 'likes', old -> 'likes', 'downs', old -> 'downs', 'reports', old -> 'reports', 'ok', old -> 'ok', 'plus', old -> 'plus',
                                                   'done', old -> 'done', 'nid', old -> 'nid', 'doneBy', old -> 'doneBy', 'doneAt', old -> 'doneAt'));
    else
      if not exists (select 1 from public.docs x where x.col = 'users' and x.id = me::text) then perform yw_private.fail('Önce hesap açmalısın.'); end if;
      d := (d - 'by' - 'byk' - 'at' - 'likes' - 'downs' - 'reports' - 'ok') || jsonb_build_object('at', now_ms, 'likes', '{}'::jsonb, 'reports', '{}'::jsonb);
      if p_col = 'notes' then d := d || '{"downs": {}}'::jsonb; end if;
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
        and not (p ?| array['likes', 'downs', 'reports', 'ok', 'by', 'byk', 'at', 'plus', 'nid', 'doneBy', 'doneAt']) then
    -- sahibi kendi kaydını düzenliyor
    nw := yw_private.content_norm(p_col, yw_private.merge(old, p));
    if p_col in ('notes', 'comments') then nw := yw_private.author_norm(p_col, p_id, nw, own); end if;

  else
    -- başkasının kaydı: yalnızca kendi anahtarının altındaki alanlar
    for key, v in select * from jsonb_each(p) loop
      if p_col in ('notes', 'comments') and key = 'likes' then
        if own = me then perform yw_private.fail('Kendi paylaşımını beğenemezsin.'); end if;
        if not yw_private.own_key(v, k) or jsonb_typeof(v -> k) not in ('boolean', 'null') then perform yw_private.fail('Beğeni geçersiz.'); end if;
      elsif p_col = 'notes' and key = 'downs' then
        if own = me then perform yw_private.fail('Kendi notuna oy veremezsin.'); end if;
        if not yw_private.own_key(v, k) or jsonb_typeof(v -> k) not in ('boolean', 'null') then perform yw_private.fail('Oy geçersiz.'); end if;
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
    -- notta ▲ (likes) ile ▼ (downs) birlikte olmaz: biri verilince öteki kalkar
    if p_col = 'notes' then
      if (p -> 'likes' -> k) = 'true'::jsonb then p := (p - 'downs') || jsonb_build_object('downs', jsonb_build_object(k, null));
      elsif (p -> 'downs' -> k) = 'true'::jsonb then p := (p - 'likes') || jsonb_build_object('likes', jsonb_build_object(k, null));
      end if;
    end if;
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

-- bakiyeler yeni değerlerle yeniden sayılır
do $$ begin
  perform yw_private.recalc(o.uid) from yw_private.doc_owner o where o.col = 'users';
end $$;
