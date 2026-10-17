-- 0007: karakter düzenleyici ve market güncellemesi (17 Ekim).
--   market: yeni ürünler ve her ürünün türü (slot): karakterde nereye gittiği. ust, alt, elbise, el, taki, yoldas; sac: saç boyası.
--   users belgesine üç alan (karakter herkese açık sıralamada çizildiği için açık belgede):
--     sac  : saç modeli. kel, kisa, orta, uzun (erkek); kivircik, dalgali, duz, topuz (kadın); diğer hepsinden. Başka değer reddedilir.
--     sacr : saç rengi. siyah, kahve, kumral, sari, kizil, ysari. Başka değer reddedilir. Sarı yalnızca erkek karakterde ücretsiz,
--            kadında ve diğerde düşer (parlak sarısı markette). Yeditepe Sarısı (ysari) alınmadan seçilirse düşer.
--     giy  : takılı ürünler (yuva → ürün). Yalnızca sahip olunan ve türü yuvayı tutan ürün kalır, gerisi sessizce düşer;
--            elbise varken üst ve alt düşer. İstemci boş yuvayı null gönderir (birleşmede eski seçim kalmasın), null da düşer.

alter table yw_private.market add column if not exists slot text;

insert into yw_private.market (id, price, slot) values
  ('gece-eskortu', 1200, 'yoldas'), ('kartal-kanatlari', 1500, 'taki'), ('altin-ring', 700, 'taki'), ('selcuklu-kapi', 900, 'taki'),
  ('gunes-aurasi', 800, 'taki'), ('yokus-canavari', 350, 'taki'), ('son-sosisli', 300, 'el'), ('ikinci-ev', 200, 'el'), ('karsi-durum', 150, 'el'),
  ('mezuniyet-cubbesi', 1100, 'elbise'), ('parlak-mont', 950, 'ust'), ('eagles-forma', 700, 'ust'), ('yeditepe-sarisi', 600, 'sac'),
  ('bahar-elbisesi', 480, 'elbise'), ('futbol-forma', 450, 'ust'), ('basket-forma', 450, 'ust'), ('amerikan-topu', 320, 'el'),
  ('yeditepe-tisort', 250, 'ust'), ('futbol-topu', 220, 'el'), ('basket-topu', 220, 'el'), ('kampus-esofman', 200, 'alt'),
  ('nevada-kahve', 180, 'el'), ('eagles-sort', 160, 'alt')
on conflict (id) do update set price = excluded.price, slot = excluded.slot;

create or replace function yw_private.users_norm(p_uid text, d jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pv jsonb := '{}'::jsonb; its jsonb; g jsonb; gk text; gv jsonb;
begin
  d := coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(d) e
                 where e.key = any (array['username', 'first', 'last', 'showName', 'yil', 'showYil', 'bolum', 'avk', 'emoji', 'harf', 'urun', 'color', 'pic',
                                          'role', 'bonus', 'spent', 'items', 'gift', 'verifiedAt', 'at', 'kb', 'shared',
                                          'govde', 'kiyafet', 'sac', 'sacr', 'giy'])), '{}'::jsonb);
  if d ? 'username' and coalesce(d ->> 'username', '') !~ '^[a-z0-9][a-z0-9._]{2,19}$' then
    perform yw_private.fail('Kullanıcı adı 3-20 karakter olmalı; küçük harf, rakam ve nokta kullan.');
  end if;
  if d ? 'govde' and coalesce(d ->> 'govde', '') not in ('e', 'k', 'd') then
    perform yw_private.fail('Karakterin için erkek, kadın ya da diğer seç.');
  end if;
  if d ? 'kiyafet' and coalesce(d ->> 'kiyafet', '') not in ('tisort', 'kapusonlu', 'mont') then
    perform yw_private.fail('Bu kıyafet yok.');
  end if;
  if d ? 'sac' and coalesce(d ->> 'sac', '') not in ('kel', 'kisa', 'orta', 'uzun', 'kivircik', 'dalgali', 'duz', 'topuz') then
    perform yw_private.fail('Bu saç modeli yok.');
  end if;
  if d ? 'sacr' and coalesce(d ->> 'sacr', '') not in ('siyah', 'kahve', 'kumral', 'sari', 'kizil', 'ysari') then
    perform yw_private.fail('Bu saç rengi yok.');
  end if;
  its := yw_private.obj(d -> 'items');
  if (d ->> 'sacr' = 'sari' and coalesce(d ->> 'govde', 'd') <> 'e') or (d ->> 'sacr' = 'ysari' and not its ? 'yeditepe-sarisi') then
    d := d - 'sacr';
  end if;
  if d ? 'giy' then
    g := '{}'::jsonb;
    if jsonb_typeof(d -> 'giy') = 'object' then
      for gk, gv in select e.key, e.value from jsonb_each(d -> 'giy') e loop
        if gk in ('ust', 'alt', 'elbise', 'el', 'taki', 'yoldas') and jsonb_typeof(gv) = 'string' and its ? (gv #>> '{}')
           and exists (select 1 from yw_private.market m where m.id = gv #>> '{}' and m.slot = gk) then
          g := g || jsonb_build_object(gk, gv);
        end if;
      end loop;
    end if;
    if g ? 'elbise' then g := g - 'ust' - 'alt'; end if;
    d := d || jsonb_build_object('giy', g);
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
  if d ->> 'avk' = 'urun' and not (its ? coalesce(d ->> 'urun', '')) then
    d := d || '{"avk": "emoji", "urun": ""}'::jsonb;
  end if;
  return d;
end $$;
