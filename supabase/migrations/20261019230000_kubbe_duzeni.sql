-- YediWiki 0013: kubbe düzeni (19 Ekim)
--
-- 1) Kubbe yeniden. Paylaşmak az, notun gördüğü ilgi çok kazandırır:
--      not paylaşmak 5 (görünür not başına) · notuna gelen her ▲ 10 · notuna yorum yazan her kişi 5 (not başına bir kez,
--      notun sahibi sayılmaz) · ▼ kubbe vermez, düşürmez.
--    ▲ ve yorum kubbesi paylaşımcı seviyesiyle çarpılır: notlarına gelen toplam ▲ 10'a ulaşınca ×1,25, 30'da ×1,5, 100'de ×2.
--    Diğerleri: yorum 2, yorumuna gelen beğeni 2, HocaÖlçer puanı 5 (ilk 30 hoca), not isteği karşılamak 10 (karşılayan not
--    görünürse), hesap açma 50. Bildirimle gizlenen not ya da yorum hiçbir şey kazandırmaz.
--    kb'de yeni alanlar: ncm (notlarına yorum yazan kişi sayısı), pi (▲ ve yorum kubbesi, çarpanla), lv (seviye 1-4).
-- 2) Anonim paylaşımlar ve hoca puanları da sıralamaya sayılır, ama her gece toplu: users.kb'nin all ve term'i = adıyla
--    yapılanlar (anında) + son gece sayımındaki anonim pay (yw_private.kb_gece). Gece sayımı pg_cron'la her gün 01:00 UTC'de
--    (04:00 İstanbul) herkes için birden yapılır; anonim bir paylaşım, oy ya da puan anında açık profilde iz bırakmaz.
--    users.kb'nin sayaçları (notes, comments, ups, ...) yalnızca adıyla yapılanları sayar. private.kb her şeyi anında sayar (bakiye).
-- 3) Bildirimin nedeni: notes ve comments'ta rsn {anahtar: 'sahte' | 'spam' | 'uygunsuz'}, bildirenin o belgedeki takma adıyla.
-- 4) İhtar ve dondurma: kişinin notlarından üçü bildirimle gizlenince (önceki onay isteklerinde sayılmamış olanlar)
--    yw_private.dondurma'ya onay isteği yazılır ve yöneticiye e-posta gider: pg_net → Worker /api/dondurma → Cloudflare e-posta.
--    E-postadaki bağlantı (#/onay/<belirteç>, 30 gün geçerli) hesabı dondurur ya da isteği geri çevirir; yönetici Moderasyon'dan
--    da karar verir ve dondurmayı kaldırır. Donuk hesap özel kaydı dışında hiçbir şey yazamaz (docs_donuk), sıralamada görünmez
--    (kb.donuk).
-- doc_set, doc_update ve doc_delete 0003 / 0002'deki gibi; değişenler: rsn, not yorumu yazılınca, değişince ya da silinince
-- notun sahibinin kubbesi de yeniden sayılır, not gizlenince ihtar denetlenir.

-- ---------------------------------------------------------------- tablolar
create table if not exists yw_private.kb_gece (
  uid uuid primary key,
  pa numeric not null default 0,      -- anonim pay, tüm zamanlar (tam sayım − adıyla sayım)
  pt numeric not null default 0,      -- anonim pay, dönem
  ts bigint not null default 0,       -- sayımdaki dönem başlangıcı (dönem değişince pt sayılmaz)
  at timestamptz not null default now()
);
alter table yw_private.kb_gece enable row level security;

create table if not exists yw_private.dondurma (
  id uuid primary key default gen_random_uuid(),
  uid uuid not null,
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  notes text[] not null default '{}',
  status text not null default 'bekliyor' check (status in ('bekliyor', 'donduruldu', 'reddedildi')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  mailed_at timestamptz
);
create index if not exists dondurma_uid_idx on yw_private.dondurma (uid);
alter table yw_private.dondurma enable row level security;

create table if not exists yw_private.donuk (uid uuid primary key, at timestamptz not null default now(), req uuid);
alter table yw_private.donuk enable row level security;

-- notuna gelen yorumlar her kubbe sayımında aranır (ve not silinince yorumları)
create index if not exists docs_comment_tid_idx on public.docs ((data ->> 'tid')) where col = 'comments';

-- onay isteğinin gideceği adres (Worker); boşsa e-posta gitmez, istek yine Moderasyon'da görünür
insert into yw_private.settings (key, value) values ('onay_url', 'https://yediwiki.com/api/dondurma') on conflict (key) do nothing;

-- ---------------------------------------------------------------- küçük yardımcılar
-- paylaşımcı seviyesi: notlarına gelen toplam ▲ (görünür notlar)
create or replace function yw_private.kb_level(p_ups numeric) returns integer
language sql immutable set search_path = '' as $$
  select case when p_ups >= 100 then 4 when p_ups >= 30 then 3 when p_ups >= 10 then 2 else 1 end
$$;

-- not yorumunun bağlı olduğu notun sahibi (notuna gelen yorumun kubbesi onun)
create or replace function yw_private.note_owner_of(c jsonb) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(o.uid), '{}') from yw_private.doc_owner o
   where c ->> 'tt' = 'note' and o.col = 'notes' and o.id = c ->> 'tid'
$$;

-- etkin bildirimler (yöneticinin "uygun" demesinden sonra gelenler) ve nedenleri: {n, rsn: {neden: sayı}}; nedensiz bildirim ''
create or replace function yw_private.report_info(d jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  with r as (
    select coalesce(yw_private.obj(d -> 'rsn') ->> e.key, '') as why
      from jsonb_each(yw_private.obj(d -> 'reports')) e
     where jsonb_typeof(e.value) = 'number' and (e.value)::text::numeric > coalesce(yw_private.num(d -> 'ok'), 0)
  )
  select jsonb_build_object('n', (select count(*) from r),
                            'rsn', coalesce((select jsonb_object_agg(g.why, g.k) from (select r.why, count(*) as k from r group by r.why) g), '{}'::jsonb))
$$;

-- ---------------------------------------------------------------- kubbe
-- Sayım: p_named ise yalnızca adıyla yapılanlar (açık profil), değilse her şey (bakiye). Puanlar istemcideki KUBBE ile aynı.
create or replace function yw_private.kb_calc(p_uid uuid, p_named boolean) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_ts bigint := yw_private.term_start_ms();
  u jsonb; bonus numeric; b_term numeric; n record; c record; r record; f record;
  lv integer; mult numeric; ilgi bigint; ilgi_t bigint; rp bigint; rp_t bigint;
begin
  select d.data into u from public.docs d where d.col = 'users' and d.id = p_uid::text;
  if u is null then return null; end if;
  bonus := greatest(0, coalesce(yw_private.num(u -> 'bonus'), 0));
  b_term := case when coalesce(yw_private.num(u -> 'at'), 0) >= v_ts then least(bonus, 50) else 0 end;

  -- notları (görünür) ve gördükleri ilgi: ▲ ve yorum yazan farklı kişi (notun sahibi ve gizlenen yorum sayılmaz)
  with nt as (
    select d.id, yw_private.likes(d.data) as up, coalesce(yw_private.num(d.data -> 'at'), 0) as at
      from public.docs d join yw_private.doc_owner o on o.col = d.col and o.id = d.id
     where d.col = 'notes' and o.uid = p_uid and not yw_private.hidden(d.data)
       and (not p_named or coalesce(d.data ->> 'by', '') <> '')
  ), cm as (
    select x.data ->> 'tid' as nid, count(distinct xo.uid) as k
      from public.docs x join yw_private.doc_owner xo on xo.col = x.col and xo.id = x.id
     where x.col = 'comments' and x.data ->> 'tt' = 'note' and x.data ->> 'tid' in (select nt.id from nt)
       and xo.uid <> p_uid and not yw_private.hidden(x.data)
       and (not p_named or coalesce(x.data ->> 'by', '') <> '')
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
       where d.col = 'comments' and o.uid = p_uid and not yw_private.hidden(d.data)
         and (not p_named or coalesce(d.data ->> 'by', '') <> '')) z;

  -- HocaÖlçer puanları takma adla tutulur, adıyla sayımda yok; kubbe ilk 30 hocaya
  select count(*) as k, count(*) filter (where z.at >= v_ts) as k_t into r from (
    select coalesce(yw_private.num(e.value -> 'at'), 0) as at
      from public.docs d cross join lateral jsonb_each(yw_private.obj(d.data -> 'ratings')) e
      join yw_private.keymap m on m.k = e.key
     where not p_named and d.col = 'hocas' and m.uid = p_uid and yw_private.valid_rating(e.value)) z;

  -- karşıladığı istekler: karşılayan not görünür olmalı, kendi isteği sayılmaz
  select count(*) as k, count(*) filter (where z.at >= v_ts) as k_t into f from (
    select coalesce(yw_private.num(q.data -> 'doneAt'), 0) as at
      from public.docs q
      join yw_private.doc_owner o on o.col = 'notes' and o.id = q.data ->> 'nid'
      join public.docs nn on nn.col = 'notes' and nn.id = o.id
     where q.col = 'requests' and q.data -> 'done' = 'true'::jsonb and o.uid = p_uid
       and coalesce(q.data ->> 'by', '') <> p_uid::text and not yw_private.hidden(nn.data)
       and (not p_named or coalesce(nn.data ->> 'by', '') <> '')) z;

  lv := yw_private.kb_level(n.up);
  mult := case lv when 4 then 2 when 3 then 1.5 when 2 then 1.25 else 1 end;
  ilgi := floor((n.up * 10 + n.cm * 5) * mult);
  ilgi_t := floor((n.up_t * 10 + n.cm_t * 5) * mult);
  rp := least(r.k, 30) * 5;
  rp_t := least(r.k_t, greatest(0, 30 - (r.k - r.k_t))) * 5;   -- dönemin puanları en yenileri: ilk 30'a girenler sayılır
  return jsonb_build_object(
    'all', bonus + n.k * 5 + ilgi + c.k * 2 + c.lk * 2 + rp + f.k * 10,
    'term', b_term + n.k_t * 5 + ilgi_t + c.k_t * 2 + c.lk_t * 2 + rp_t + f.k_t * 10,
    'ts', v_ts, 'notes', n.k, 'ups', n.up, 'ncm', n.cm, 'pi', ilgi, 'lv', lv,
    'comments', c.k, 'likes', c.lk, 'ratings', r.k, 'fills', f.k, 'grades', 0);
end $$;

-- Açık kayıt (users.kb): adıyla yapılanlar anında; all ve term'e son gece sayımındaki anonim pay eklenir (dönem değiştiyse
-- dönem payı sıfır). Özel kayıt (private.kb) tam sayım. Donuk hesapta ikisinde de donuk (dondurulma zamanı, ms).
-- Gün içinde anonim bir not adıyla yapılırsa (ya da tersi) açık toplam o gece düzelir.
create or replace function yw_private.kb_write(p_uid uuid, p_nam jsonb, p_ful jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare pub jsonb := p_nam; prv jsonb := p_ful; g_pa numeric; g_pt numeric; g_ts bigint; fz bigint;
begin
  if p_nam is null or p_ful is null then return; end if;
  select x.pa, x.pt, x.ts into g_pa, g_pt, g_ts from yw_private.kb_gece x where x.uid = p_uid;
  if g_pa is not null then
    pub := pub || jsonb_build_object('all', yw_private.num(pub -> 'all') + g_pa,
                                     'term', yw_private.num(pub -> 'term') + case when g_ts = (pub ->> 'ts')::bigint then g_pt else 0 end);
  end if;
  select (extract(epoch from z.at) * 1000)::bigint into fz from yw_private.donuk z where z.uid = p_uid;
  if fz is not null then
    pub := pub || jsonb_build_object('donuk', fz);
    prv := prv || jsonb_build_object('donuk', fz);
  end if;
  -- açık kayıt yalnızca değişince yazılır: anonim bir işlem herkese açık bir değişiklik bırakmaz
  update public.docs d set data = d.data || jsonb_build_object('kb', pub), updated_at = now()
   where d.col = 'users' and d.id = p_uid::text and (d.data -> 'kb') is distinct from pub;
  insert into public.docs as x (col, id, data) values ('private', p_uid::text, jsonb_build_object('kb', prv))
  on conflict (col, id) do update set data = x.data || jsonb_build_object('kb', prv), updated_at = now()
   where (x.data -> 'kb') is distinct from prv;
end $$;

create or replace function yw_private.recalc(p_uid uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform yw_private.kb_write(p_uid, yw_private.kb_calc(p_uid, true), yw_private.kb_calc(p_uid, false));
end $$;

-- Gece sayımı: herkesin anonim payı yenilenir, açık kayıt tam sayıma eşitlenir. Herkes için aynı anda yapıldığından
-- açık kayıttaki artış hangi anonim paylaşımdan geldiğini göstermez.
create or replace function yw_private.kb_gece_say() returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid; nam jsonb; ful jsonb;
begin
  for v_uid in select d.id::uuid from public.docs d
                where d.col = 'users' and d.id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' loop
    nam := yw_private.kb_calc(v_uid, true);
    ful := yw_private.kb_calc(v_uid, false);
    if nam is null or ful is null then continue; end if;
    insert into yw_private.kb_gece (uid, pa, pt, ts, at)
    values (v_uid, yw_private.num(ful -> 'all') - yw_private.num(nam -> 'all'), yw_private.num(ful -> 'term') - yw_private.num(nam -> 'term'),
            (ful ->> 'ts')::bigint, now())
    on conflict (uid) do update set pa = excluded.pa, pt = excluded.pt, ts = excluded.ts, at = excluded.at;
    perform yw_private.kb_write(v_uid, nam, ful);
  end loop;
end $$;

-- ---------------------------------------------------------------- ihtar ve dondurma
-- E-posta: Worker'a yalnızca belirteç gider (pg_net, işlem bitince gönderir); Worker ayrıntıyı belirteçle bir kez okur
-- (dondurma_eposta) ve yöneticinin adresine yollar. pg_net yoksa (yerel testler) ya da adres boşsa hiçbir şey gitmez.
create or replace function yw_private.mail_ping(p_token text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_url text;
begin
  select s.value into v_url from yw_private.settings s where s.key = 'onay_url';
  if coalesce(v_url, '') = '' or not exists (select 1 from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
                                             where ns.nspname = 'net' and p.proname = 'http_post') then
    return;
  end if;
  execute 'select net.http_post(url := $1, body := $2, headers := $3, timeout_milliseconds := 10000)'
    using v_url, jsonb_build_object('t', p_token), '{"Content-Type": "application/json"}'::jsonb;
end $$;

-- İhtar: bildirimle gizlenen not. Önceki onay isteklerinde sayılmamış 3 gizli not olunca yöneticiye onay isteği gider
-- (art arda üç). Bekleyen istek varken ya da hesap donukken yenisi açılmaz; yönetici sayılmaz.
create or replace function yw_private.strike_check(p_uid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare hid text[]; tok text;
begin
  if p_uid is null or exists (select 1 from yw_private.admins a where a.uid = p_uid) then return; end if;
  perform pg_advisory_xact_lock(hashtext('yw-ihtar/' || p_uid::text));
  if exists (select 1 from yw_private.donuk z where z.uid = p_uid)
     or exists (select 1 from yw_private.dondurma q where q.uid = p_uid and q.status = 'bekliyor') then
    return;
  end if;
  select coalesce(array_agg(d.id order by d.id), '{}') into hid
    from public.docs d join yw_private.doc_owner o on o.col = d.col and o.id = d.id
   where d.col = 'notes' and o.uid = p_uid and yw_private.hidden(d.data)
     and not exists (select 1 from yw_private.dondurma q where q.uid = p_uid and d.id = any (q.notes));
  if cardinality(hid) < 3 then return; end if;
  insert into yw_private.dondurma (uid, notes) values (p_uid, hid) returning token into tok;
  perform yw_private.mail_ping(tok);
end $$;

-- Onay isteğinin özeti: kim, hangi notlar (başlık, ders, bildirim sayısı ve nedenleri), durum
create or replace function yw_private.dondurma_ozet(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'token', q.token, 'status', q.status, 'uid', q.uid, 'username', coalesce(u.data ->> 'username', ''),
    'at', (extract(epoch from q.created_at) * 1000)::bigint,
    'decidedAt', case when q.decided_at is not null then (extract(epoch from q.decided_at) * 1000)::bigint end,
    'donuk', exists (select 1 from yw_private.donuk z where z.uid = q.uid),
    'total', cardinality(q.notes),
    'notes', coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'title', coalesce(n.data ->> 'title', ''), 'cid', coalesce(n.data ->> 'cid', ''),
                                                         'anon', coalesce(n.data ->> 'by', '') = '', 'at', n.data -> 'at')
                                        || yw_private.report_info(n.data) order by n.id)
                         from public.docs n where n.col = 'notes' and n.id = any (q.notes)), '[]'::jsonb))
  from yw_private.dondurma q left join public.docs u on u.col = 'users' and u.id = q.uid::text
  where q.id = p_id
$$;

-- Worker: e-postanın içeriği, belirteçle yalnızca bir kez (sonra null)
create or replace function public.dondurma_eposta(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  update yw_private.dondurma x set mailed_at = now()
   where x.token = p_token and x.mailed_at is null and x.status = 'bekliyor'
  returning x.id into v_id;
  if v_id is null then return null; end if;
  return yw_private.dondurma_ozet(v_id);
end $$;

-- Onay sayfası (#/onay/<belirteç>): belirteç 30 gün geçerli; yönetici süresiz
create or replace function public.dondurma_bilgi(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_id uuid;
begin
  select x.id into v_id from yw_private.dondurma x
   where x.token = p_token and (x.created_at > now() - interval '30 days' or yw_private.is_admin());
  if v_id is null then return null; end if;
  return yw_private.dondurma_ozet(v_id);
end $$;

-- Karar: dondur (true) ya da geri çevir (false). Karar bir kez verilir; sonra yalnızca özet döner.
create or replace function public.dondurma_karar(p_token text, p_dondur boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_uid uuid; v_st text;
begin
  if p_dondur is null then perform yw_private.fail('Karar geçersiz.'); end if;
  select x.id, x.uid, x.status into v_id, v_uid, v_st from yw_private.dondurma x
   where x.token = p_token and (x.created_at > now() - interval '30 days' or yw_private.is_admin()) for update;
  if v_id is null then perform yw_private.fail('Bağlantının süresi dolmuş ya da geçersiz.'); end if;
  if v_st = 'bekliyor' then
    update yw_private.dondurma x set status = case when p_dondur then 'donduruldu' else 'reddedildi' end, decided_at = now() where x.id = v_id;
    if p_dondur then
      insert into yw_private.donuk (uid, req) values (v_uid, v_id) on conflict (uid) do nothing;
      perform yw_private.recalc(v_uid);
    end if;
  end if;
  return yw_private.dondurma_ozet(v_id);
end $$;

-- Moderasyon: bekleyen istekler ve donuk hesaplar (yalnızca yönetici)
create or replace function public.dondurma_liste() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not yw_private.is_admin() then perform yw_private.fail('Bu bilgi yalnızca yönetime açık.'); end if;
  return jsonb_build_object(
    'bekleyen', coalesce((select jsonb_agg(yw_private.dondurma_ozet(x.id) order by x.created_at desc)
                            from yw_private.dondurma x where x.status = 'bekliyor'), '[]'::jsonb),
    'donuk', coalesce((select jsonb_agg(jsonb_build_object('uid', z.uid, 'username', coalesce(u.data ->> 'username', ''),
                                                           'at', (extract(epoch from z.at) * 1000)::bigint) order by z.at desc)
                         from yw_private.donuk z left join public.docs u on u.col = 'users' and u.id = z.uid::text), '[]'::jsonb));
end $$;

-- Dondurmayı kaldır (yalnızca yönetici). İsteğin notları sayılmış kalır: yeni istek için üç yeni gizli not gerekir.
create or replace function public.dondurma_kaldir(p_uid uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not yw_private.is_admin() then perform yw_private.fail('Bunu yalnızca yönetim yapar.'); end if;
  delete from yw_private.donuk z where z.uid = p_uid;
  perform yw_private.recalc(p_uid);
end $$;

-- Donuk hesap yazamaz (kendi özel kaydı hariç: ders listesi, bildirim okundu bilgisi). SQL düzenleyicisi ve
-- gece sayımı (oturum yok) serbest; başkasının işlemi donuk hesabın kubbesini yeniden sayabilir.
create or replace function yw_private.frozen_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); v_col text;
begin
  if tg_op = 'DELETE' then v_col := old.col; else v_col := new.col; end if;
  if me is not null and v_col <> 'private' and exists (select 1 from yw_private.donuk z where z.uid = me) then
    perform yw_private.fail('Hesabın donduruldu: not paylaşamaz, oy veremez, yorum yazamazsın. İtiraz için iletisim@yediwiki.com');
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

drop trigger if exists docs_donuk on public.docs;
create trigger docs_donuk before insert or update or delete on public.docs
  for each row execute function yw_private.frozen_guard();

-- ---------------------------------------------------------------- yazma yolları (0012 / 0003 / 0002'den; değişenler yukarıda)
create or replace function yw_private.content_norm(p_col text, d jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare keep text[];
begin
  keep := case p_col
    when 'notes' then array['cid', 'h', 'tk', 'type', 'title', 'desc', 'drive', 'dk', 'photos', 'anon', 'by', 'byk', 'at', 'likes', 'downs', 'reports', 'rsn', 'ok']
    when 'comments' then array['tt', 'tid', 'text', 'anon', 'h', 'c', 'tk', 'r', 'by', 'byk', 'at', 'likes', 'reports', 'rsn', 'ok']
    when 'requests' then array['cid', 'kind', 'text', 'why', 'by', 'at', 'plus', 'done', 'nid', 'doneBy', 'doneAt']
  end;
  if keep is null then return d; end if;
  d := coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(d) e where e.key = any (keep)), '{}'::jsonb);
  if p_col = 'notes' then
    -- bağlantı gelirse biçimi denetlenir; bağlantısız not açılamaz (notlar_dosya), düzeltmede bağlantı gelmeyebilir
    if d ? 'drive' and (coalesce(d ->> 'drive', '') !~ '^https://(drive|docs)\.google\.com/\S+$' or length(d ->> 'drive') > 600) then
      perform yw_private.fail('Not yalnızca Google Drive bağlantısıyla paylaşılır.');
    end if;
    if length(trim(coalesce(d ->> 'title', ''))) < 2 then perform yw_private.fail('Notun başlığını yaz.'); end if;
    if coalesce(d ->> 'cid', '') = '' then perform yw_private.fail('Dersi seç.'); end if;
    d := d || jsonb_build_object('title', left(d ->> 'title', 80), 'photos', '[]'::jsonb);
    if d ? 'desc' then d := d || jsonb_build_object('desc', left(coalesce(d ->> 'desc', ''), 500)); end if;
    if d ? 'dk' and coalesce(d ->> 'dk', '') not in ('doc', 'slide', 'sheet', 'form', 'folder', 'file', 'drive') then d := d - 'dk'; end if;
  elsif p_col = 'comments' then
    if coalesce(d ->> 'tt', '') not in ('note', 'course', 'hoca') or coalesce(d ->> 'tid', '') = '' then
      perform yw_private.fail('Yorumun yeri belli değil.');
    end if;
    if length(trim(coalesce(d ->> 'text', ''))) = 0 then perform yw_private.fail('Yorum boş olamaz.'); end if;
    d := d || jsonb_build_object('text', left(d ->> 'text', 1000));
  else
    if coalesce(d ->> 'cid', '') = '' then perform yw_private.fail('Dersi seç.'); end if;
    d := d || jsonb_build_object('text', left(coalesce(d ->> 'text', ''), 140), 'why', left(coalesce(d ->> 'why', ''), 300),
                                 'kind', case when d ->> 'kind' in ('vize', 'final', 'ozet', 'cikmis', 'genel') then d ->> 'kind' else 'genel' end);
  end if;
  return d;
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
      d := (d - 'by' - 'byk' - 'at' - 'likes' - 'downs' - 'reports' - 'rsn' - 'ok' - 'plus' - 'done' - 'nid' - 'doneBy' - 'doneAt')
           || jsonb_strip_nulls(jsonb_build_object('at', old -> 'at', 'likes', old -> 'likes', 'downs', old -> 'downs', 'reports', old -> 'reports', 'rsn', old -> 'rsn', 'ok', old -> 'ok', 'plus', old -> 'plus',
                                                   'done', old -> 'done', 'nid', old -> 'nid', 'doneBy', old -> 'doneBy', 'doneAt', old -> 'doneAt'));
    else
      if not exists (select 1 from public.docs x where x.col = 'users' and x.id = me::text) then perform yw_private.fail('Önce hesap açmalısın.'); end if;
      d := (d - 'by' - 'byk' - 'at' - 'likes' - 'downs' - 'reports' - 'rsn' - 'ok') || jsonb_build_object('at', now_ms, 'likes', '{}'::jsonb, 'reports', '{}'::jsonb);
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
  if p_col = 'comments' then aff := aff || yw_private.note_owner_of(d); end if;   -- notuna gelen yorumun kubbesi
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
        and not (p ?| array['likes', 'downs', 'reports', 'rsn', 'ok', 'by', 'byk', 'at', 'plus', 'nid', 'doneBy', 'doneAt']) then
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
      elsif p_col in ('notes', 'comments') and key = 'rsn' then
        if not yw_private.own_key(v, k) or not (jsonb_typeof(v -> k) = 'null' or (v ->> k) in ('sahte', 'spam', 'uygunsuz')) then
          perform yw_private.fail('Bildirimin nedeni geçersiz.');
        end if;
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
  if p_col = 'comments' then aff := aff || yw_private.note_owner_of(nw); end if;   -- notuna gelen yorumun kubbesi
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
  -- not bildirimle gizlendi: ihtar
  if p_col = 'notes' and own is not null and yw_private.hidden(nw) and not yw_private.hidden(old) then perform yw_private.strike_check(own); end if;
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
  if p_col = 'comments' then aff := aff || yw_private.note_owner_of(old); end if;   -- notuna gelen yorumun kubbesi
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

-- ---------------------------------------------------------------- gece sayımı ve e-posta için eklentiler
-- pg_cron: her gün 01:00 UTC (04:00 İstanbul). pg_net: onay e-postası için Worker'a istek. Yerelde yoklar, atlanır.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    begin
      create extension if not exists pg_cron;
      perform cron.schedule('kubbe-gece', '0 1 * * *', 'select yw_private.kb_gece_say()');
    exception when others then raise notice 'pg_cron kurulamadı: %', sqlerrm;
    end;
  end if;
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    begin
      create extension if not exists pg_net with schema extensions;
    exception when others then raise notice 'pg_net kurulamadı: %', sqlerrm;
    end;
  end if;
end $$;

-- ---------------------------------------------------------------- yetkiler
revoke all on all functions in schema yw_private from public, anon, authenticated;
revoke all on function public.dondurma_eposta(text) from public;
revoke all on function public.dondurma_bilgi(text) from public;
revoke all on function public.dondurma_karar(text, boolean) from public;
revoke all on function public.dondurma_liste() from public, anon;
revoke all on function public.dondurma_kaldir(uuid) from public, anon;
grant execute on function public.dondurma_eposta(text) to anon, authenticated;
grant execute on function public.dondurma_bilgi(text) to anon, authenticated;
grant execute on function public.dondurma_karar(text, boolean) to anon, authenticated;
grant execute on function public.dondurma_liste() to authenticated;
grant execute on function public.dondurma_kaldir(uuid) to authenticated;

-- herkesin kubbesi yeni hesapla sayılır; şimdiye kadarki anonim paylaşımlar ve hoca puanları sıralamaya bugünden eklenir
do $$ begin perform yw_private.kb_gece_say(); end $$;
