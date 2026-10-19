-- YediWiki 0011: artımlı yükleme
--
-- Site her açılışta bütün koleksiyonları baştan indirmesin: tarayıcı son okuduğunu saklar (IndexedDB), sonraki açılışta ve
-- canlı bağlantı yeniden kurulunca yalnızca updated_at'i daha yeni olanları ve silinenleri ister (site/supa.js).
-- updated_at artık tetikleyicide yazılır: her değişiklikte (göçler ve SQL düzenleyicisi dahil) ilerler, aynı belgede geri gitmez.
-- Silinen belgeler public.docs_gone'da 45 gün durur (yalnızca col, id ve zaman; içerik yok). Özel kayıtlar yazılmaz.
-- doc_set / doc_update / doc_delete değişmedi.

create index if not exists docs_col_updated_idx on public.docs (col, updated_at);

create or replace function yw_private.doc_ver() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := case when tg_op = 'UPDATE' then greatest(clock_timestamp(), old.updated_at + interval '1 microsecond')
                         else clock_timestamp() end;
  return new;
end $$;

drop trigger if exists docs_surum on public.docs;
create trigger docs_surum before insert or update on public.docs
  for each row execute function yw_private.doc_ver();

create table if not exists public.docs_gone (
  col text not null,
  id text not null,
  at timestamptz not null default clock_timestamp(),
  primary key (col, id)
);
create index if not exists docs_gone_at_idx on public.docs_gone (at);
alter table public.docs_gone enable row level security;
revoke insert, update, delete, truncate on public.docs_gone from anon, authenticated;
grant select on public.docs_gone to anon, authenticated;
drop policy if exists docs_gone_okuma on public.docs_gone;
create policy docs_gone_okuma on public.docs_gone for select to anon, authenticated
  using (col <> 'private');

create or replace function yw_private.doc_gone() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.col <> 'private' then
      insert into public.docs_gone (col, id, at) values (old.col, old.id, clock_timestamp())
        on conflict (col, id) do update set at = excluded.at;
      delete from public.docs_gone g where g.at < clock_timestamp() - interval '45 days';
    end if;
    return null;
  end if;
  -- aynı kimlikle yeniden yazılan belge silinmiş sayılmaz
  delete from public.docs_gone g where g.col = new.col and g.id = new.id;
  return null;
end $$;

drop trigger if exists docs_silinen on public.docs;
create trigger docs_silinen after insert or delete on public.docs
  for each row execute function yw_private.doc_gone();
