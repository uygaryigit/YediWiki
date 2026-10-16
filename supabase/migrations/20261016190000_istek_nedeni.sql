-- YediWiki 0004: not isteğinde neden (ayrıntı)
--
-- İstek artık kısa açıklamanın ('text', en çok 140) yanında isteğe bağlı bir neden de taşır ('why', en çok 300).
-- Ana sayfada istek tek satırda görünür; neden yalnızca istekler sayfasında ve ders sayfasında yazılır.
-- Yalnızca içerik süzgeci (content_norm) değişir: 'why' korunur ve kısaltılır.

create or replace function yw_private.content_norm(p_col text, d jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare keep text[];
begin
  keep := case p_col
    when 'notes' then array['cid', 'h', 'tk', 'type', 'title', 'desc', 'drive', 'photos', 'anon', 'by', 'byk', 'at', 'likes', 'downs', 'reports', 'ok']
    when 'comments' then array['tt', 'tid', 'text', 'anon', 'h', 'c', 'tk', 'r', 'by', 'byk', 'at', 'likes', 'reports', 'ok']
    when 'requests' then array['cid', 'kind', 'text', 'why', 'by', 'at', 'plus', 'done', 'nid', 'doneBy', 'doneAt']
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
    d := d || jsonb_build_object('text', left(coalesce(d ->> 'text', ''), 140), 'why', left(coalesce(d ->> 'why', ''), 300),
                                 'kind', case when d ->> 'kind' in ('vize', 'final', 'ozet', 'cikmis', 'genel') then d ->> 'kind' else 'genel' end);
  end if;
  return d;
end $$;
