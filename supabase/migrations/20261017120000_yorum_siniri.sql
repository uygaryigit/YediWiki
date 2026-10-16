-- YediWiki 0006: yorum sınırı
--
-- Bir kişi bir hocaya ya da bir derse en çok 3 yorum yazar; anonim yorumlar da sayılır (gerçek sahip yw_private.doc_owner'da).
-- Not yorumlarında sınır yok. Yönetici sınıra takılmaz. Yorum silinince yeri açılır.
-- Sınır aşılmasın diye yorumun yeri (tt, tid) sonradan değiştirilemez.
-- doc_set ve doc_update'e dokunulmaz: denetim public.docs üzerinde bir tetikleyicide.

create or replace function yw_private.comment_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  n integer;
begin
  -- SQL düzenleyicisi ve yönetim yolları (oturum yok) ile yönetici serbest
  if me is null or yw_private.is_admin() then return new; end if;

  if tg_op = 'UPDATE' then
    if (new.data ->> 'tt') is distinct from (old.data ->> 'tt') or (new.data ->> 'tid') is distinct from (old.data ->> 'tid') then
      perform yw_private.fail('Yorumun yeri değiştirilemez.');
    end if;
    return new;
  end if;

  if coalesce(new.data ->> 'tt', '') not in ('course', 'hoca') then return new; end if;
  -- var olan yorumun yeniden yazılması (insert ... on conflict) yeni yorum sayılmaz
  if exists (select 1 from public.docs x where x.col = new.col and x.id = new.id) then return new; end if;

  -- aynı kişinin aynı anda gönderdiği yorumlar sırayla sayılsın
  perform pg_advisory_xact_lock(hashtext('yw-yorum/' || me::text));
  select count(*) into n
    from yw_private.doc_owner o join public.docs x on x.col = o.col and x.id = o.id
   where o.col = 'comments' and o.uid = me
     and x.data ->> 'tt' = new.data ->> 'tt' and x.data ->> 'tid' = new.data ->> 'tid';
  if n >= 3 then
    perform yw_private.fail(case when new.data ->> 'tt' = 'hoca'
      then 'Bir hocaya en çok 3 yorum yazabilirsin. Yeni yorum için eski yorumlarından birini sil.'
      else 'Bir derse en çok 3 yorum yazabilirsin. Yeni yorum için eski yorumlarından birini sil.' end);
  end if;
  return new;
end $$;

drop trigger if exists yorum_siniri on public.docs;
create trigger yorum_siniri before insert or update on public.docs
  for each row when (new.col = 'comments') execute function yw_private.comment_limit();
