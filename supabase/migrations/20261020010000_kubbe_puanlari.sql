-- YediWiki 0014: kubbe puanları (20 Ekim, kullanıcı istedi)
--
-- 0013'teki hesap kullanıcıya göre fazla cimri ve kasıntılıydı; yerine sabit, cömert puanlar:
--   not paylaşmak 75 · notuna gelen her ▲ 35 · notuna başkasının yazdığı her yorum 35 · yorum yazmak 15 ·
--   HocaÖlçer puanı 10 (sınır yok) · yorumuna gelen beğeni 2 · not isteği karşılamak 10 · hesap açma 50.
--   ▼ kubbe vermez, düşürmez. Bildirimle gizlenen not ve yorum kazandırmaz. Paylaşımcı seviyesi ve çarpanı kalktı (kb'de lv, pi yok).
-- Anonim paylaşımlar ve hoca puanları sıralamaya hemen sayılır: users.kb (sıralama) ile private.kb (bakiye) aynı tam sayım.
-- Gece sayımı (pg_cron işi kubbe-gece, yw_private.kb_gece) kalktı. kb.ncm: notlarına başkalarının yazdığı yorum sayısı.
-- Bildirim nedeni, ihtar ve dondurma 0013'teki gibi.

create or replace function yw_private.kb_calc(p_uid uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_ts bigint := yw_private.term_start_ms();
  u jsonb; bonus numeric; b_term numeric; n record; c record; r record; f record;
begin
  select d.data into u from public.docs d where d.col = 'users' and d.id = p_uid::text;
  if u is null then return null; end if;
  bonus := greatest(0, coalesce(yw_private.num(u -> 'bonus'), 0));
  b_term := case when coalesce(yw_private.num(u -> 'at'), 0) >= v_ts then least(bonus, 50) else 0 end;

  -- notları (görünür) ve gördükleri ilgi: ▲ ile başkalarının yazdığı yorumlar (gizlenen yorum sayılmaz)
  with nt as (
    select d.id, yw_private.likes(d.data) as up, coalesce(yw_private.num(d.data -> 'at'), 0) as at
      from public.docs d join yw_private.doc_owner o on o.col = d.col and o.id = d.id
     where d.col = 'notes' and o.uid = p_uid and not yw_private.hidden(d.data)
  ), cm as (
    select x.data ->> 'tid' as nid, count(*) as k
      from public.docs x join yw_private.doc_owner xo on xo.col = x.col and xo.id = x.id
     where x.col = 'comments' and x.data ->> 'tt' = 'note' and x.data ->> 'tid' in (select nt.id from nt)
       and xo.uid <> p_uid and not yw_private.hidden(x.data)
     group by 1
  )
  select count(*) as k, count(*) filter (where nt.at >= v_ts) as k_t,
         coalesce(sum(nt.up), 0) as up, coalesce(sum(nt.up) filter (where nt.at >= v_ts), 0) as up_t,
         coalesce(sum(cm.k), 0) as cm, coalesce(sum(cm.k) filter (where nt.at >= v_ts), 0) as cm_t
    into n from nt left join cm on cm.nid = nt.id;

  -- yazdığı yorumlar ve aldıkları beğeni
  select count(*) as k, count(*) filter (where z.at >= v_ts) as k_t,
         coalesce(sum(z.lk), 0) as lk, coalesce(sum(z.lk) filter (where z.at >= v_ts), 0) as lk_t
    into c from (
      select yw_private.likes(d.data) as lk, coalesce(yw_private.num(d.data -> 'at'), 0) as at
        from public.docs d join yw_private.doc_owner o on o.col = d.col and o.id = d.id
       where d.col = 'comments' and o.uid = p_uid and not yw_private.hidden(d.data)) z;

  -- HocaÖlçer puanları (takma adla tutulur, sahibi keymap'te)
  select count(*) as k, count(*) filter (where z.at >= v_ts) as k_t into r from (
    select coalesce(yw_private.num(e.value -> 'at'), 0) as at
      from public.docs d cross join lateral jsonb_each(yw_private.obj(d.data -> 'ratings')) e
      join yw_private.keymap m on m.k = e.key
     where d.col = 'hocas' and m.uid = p_uid and yw_private.valid_rating(e.value)) z;

  -- karşıladığı istekler: karşılayan not görünür olmalı, kendi isteği sayılmaz
  select count(*) as k, count(*) filter (where z.at >= v_ts) as k_t into f from (
    select coalesce(yw_private.num(q.data -> 'doneAt'), 0) as at
      from public.docs q
      join yw_private.doc_owner o on o.col = 'notes' and o.id = q.data ->> 'nid'
      join public.docs nn on nn.col = 'notes' and nn.id = o.id
     where q.col = 'requests' and q.data -> 'done' = 'true'::jsonb and o.uid = p_uid
       and coalesce(q.data ->> 'by', '') <> p_uid::text and not yw_private.hidden(nn.data)) z;

  return jsonb_build_object(
    'all', bonus + n.k * 75 + (n.up + n.cm) * 35 + c.k * 15 + c.lk * 2 + r.k * 10 + f.k * 10,
    'term', b_term + n.k_t * 75 + (n.up_t + n.cm_t) * 35 + c.k_t * 15 + c.lk_t * 2 + r.k_t * 10 + f.k_t * 10,
    'ts', v_ts, 'notes', n.k, 'ups', n.up, 'ncm', n.cm,
    'comments', c.k, 'likes', c.lk, 'ratings', r.k, 'fills', f.k, 'grades', 0);
end $$;

-- Açık kayıt (users.kb, sıralama) ve özel kayıt (private.kb, bakiye) aynı tam sayım; donuk hesapta donuk (dondurulma zamanı, ms).
create or replace function yw_private.recalc(p_uid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare kb jsonb := yw_private.kb_calc(p_uid); fz bigint;
begin
  if kb is null then return; end if;
  select (extract(epoch from z.at) * 1000)::bigint into fz from yw_private.donuk z where z.uid = p_uid;
  if fz is not null then kb := kb || jsonb_build_object('donuk', fz); end if;
  update public.docs d set data = d.data || jsonb_build_object('kb', kb), updated_at = now()
   where d.col = 'users' and d.id = p_uid::text and (d.data -> 'kb') is distinct from kb;
  insert into public.docs as x (col, id, data) values ('private', p_uid::text, jsonb_build_object('kb', kb))
  on conflict (col, id) do update set data = x.data || jsonb_build_object('kb', kb), updated_at = now()
   where (x.data -> 'kb') is distinct from kb;
end $$;

-- gece sayımı kalktı
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.unschedule(j.jobid) from cron.job j where j.jobname = 'kubbe-gece';
  end if;
end $$;
drop function if exists yw_private.kb_gece_say();
drop function if exists yw_private.kb_write(uuid, jsonb, jsonb);
drop function if exists yw_private.kb_calc(uuid, boolean);
drop function if exists yw_private.kb_level(numeric);
drop table if exists yw_private.kb_gece;

revoke all on all functions in schema yw_private from public, anon, authenticated;

-- herkesin kubbesi yeni puanlarla
do $$ begin
  perform yw_private.recalc(d.id::uuid) from public.docs d
   where d.col = 'users' and d.id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
end $$;
