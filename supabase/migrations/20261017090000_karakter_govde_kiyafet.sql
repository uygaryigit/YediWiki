-- 0005: sıralama karakteri. users belgesine iki alan:
--   govde: 'e' (erkek), 'k' (kadın), 'd' (diğer; ikisinin arası bir vücut). Kayıtta seçilir, profilde değişir.
--   kiyafet: 'tisort', 'kapusonlu', 'mont'. Profilde karakterin altından seçilir.
-- Başka değer reddedilir. Karakter herkese açık sıralamada çizildiği için alanlar da herkese açık users belgesinde.

create or replace function yw_private.users_norm(p_uid text, d jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pv jsonb := '{}'::jsonb;
begin
  d := coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(d) e
                 where e.key = any (array['username', 'first', 'last', 'showName', 'yil', 'showYil', 'bolum', 'avk', 'emoji', 'harf', 'urun', 'color', 'pic',
                                          'role', 'bonus', 'spent', 'items', 'gift', 'verifiedAt', 'at', 'kb', 'shared',
                                          'govde', 'kiyafet'])), '{}'::jsonb);
  if d ? 'username' and coalesce(d ->> 'username', '') !~ '^[a-z0-9][a-z0-9._]{2,19}$' then
    perform yw_private.fail('Kullanıcı adı 3-20 karakter olmalı; küçük harf, rakam ve nokta kullan.');
  end if;
  if d ? 'govde' and coalesce(d ->> 'govde', '') not in ('e', 'k', 'd') then
    perform yw_private.fail('Karakterin için erkek, kadın ya da diğer seç.');
  end if;
  if d ? 'kiyafet' and coalesce(d ->> 'kiyafet', '') not in ('tisort', 'kapusonlu', 'mont') then
    perform yw_private.fail('Bu kıyafet yok.');
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
