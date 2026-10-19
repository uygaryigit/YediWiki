-- YediWiki 0012: not kilidi
--
-- Paylaşılan notun içeriği (Drive bağlantısı ve açıklaması) yalnızca giriş yapmış hesaplara açık. İçerik ayrı kayıtta:
-- public.docs col = 'files', kimliği notunkiyle aynı; files'ı girişsiz (anon) okuyamaz. Notun kendisi (başlık, ders, hoca,
-- dönem, oylar) herkese açık kalır; bağlantının yerine yalnızca türü yazılır (dk: doc, slide, sheet, form, folder, file, drive).
-- Yazma yolu değişmedi: doc_set / doc_update notu bağlantısıyla yazar, tetikleyici (notlar_dosya) bağlantıyı ve açıklamayı
-- files'a taşır. Bağlantısız not açılamaz: önce content_norm istiyordu, şimdi tetikleyici (düzeltmede bağlantı gelmeyebilir).
-- files'a istemciden yazılamaz (doc_set / doc_update / doc_delete onu bilinmeyen koleksiyon sayar); not silinince o da silinir.
-- Kayıt yalnızca okul e-postasıyla açıldığı için (yw_check_signup_email; e-postasız oturum yok) giriş yapmış herkes öğrencidir.

alter table public.docs drop constraint if exists docs_col_check;
alter table public.docs add constraint docs_col_check
  check (col in ('users', 'private', 'notes', 'comments', 'hocas', 'courses', 'bolumler', 'requests', 'zor', 'files'));

drop policy if exists docs_okuma on public.docs;
create policy docs_okuma on public.docs for select to anon, authenticated
  using (case col when 'private' then id = (select auth.uid())::text
                  when 'files' then (select auth.uid()) is not null
                  else true end);

create or replace function yw_private.content_norm(p_col text, d jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare keep text[];
begin
  keep := case p_col
    when 'notes' then array['cid', 'h', 'tk', 'type', 'title', 'desc', 'drive', 'dk', 'photos', 'anon', 'by', 'byk', 'at', 'likes', 'downs', 'reports', 'ok']
    when 'comments' then array['tt', 'tid', 'text', 'anon', 'h', 'c', 'tk', 'r', 'by', 'byk', 'at', 'likes', 'reports', 'ok']
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

-- bağlantının türü (sitedeki driveInfo ile aynı)
create or replace function yw_private.drive_kind(u text) returns text
language sql immutable set search_path = '' as $$
  select case
    when u ~* 'docs\.google\.com/document/' then 'doc'
    when u ~* 'docs\.google\.com/presentation/' then 'slide'
    when u ~* 'docs\.google\.com/spreadsheets/' then 'sheet'
    when u ~* 'docs\.google\.com/forms/' then 'form'
    when u ~* 'drive\.google\.com/drive/(u/[0-9]+/)?folders/' then 'folder'
    when u ~* 'drive\.google\.com/(file/d/|open\?id=|uc\?)' then 'file'
    else 'drive' end
$$;

create or replace function yw_private.note_files() returns trigger
language plpgsql security definer set search_path = '' as $$
declare f jsonb := '{}'::jsonb;
begin
  if new.data ? 'drive' then
    f := jsonb_build_object('drive', new.data -> 'drive');
    new.data := (new.data - 'drive') || jsonb_build_object('dk', yw_private.drive_kind(new.data ->> 'drive'));
  end if;
  if new.data ? 'desc' then
    f := f || jsonb_build_object('desc', new.data -> 'desc');
    new.data := new.data - 'desc';
  end if;
  if f <> '{}'::jsonb then
    insert into public.docs as x (col, id, data) values ('files', new.id, f)
      on conflict (col, id) do update set data = x.data || excluded.data where x.data is distinct from x.data || excluded.data;
  elsif tg_op = 'INSERT' and not exists (select 1 from public.docs x where x.col = 'files' and x.id = new.id and x.data ? 'drive') then
    perform yw_private.fail('Not yalnızca Google Drive bağlantısıyla paylaşılır.');
  end if;
  return new;
end $$;

drop trigger if exists notlar_dosya on public.docs;
create trigger notlar_dosya before insert or update on public.docs
  for each row when (new.col = 'notes') execute function yw_private.note_files();

create or replace function yw_private.note_files_gone() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.docs x where x.col = 'files' and x.id = old.id;
  return null;
end $$;

drop trigger if exists notlar_dosya_sil on public.docs;
create trigger notlar_dosya_sil after delete on public.docs
  for each row when (old.col = 'notes') execute function yw_private.note_files_gone();

-- var olan notların bağlantısı ve açıklaması files'a taşınır
update public.docs set data = data where col = 'notes' and (data ? 'drive' or data ? 'desc');
