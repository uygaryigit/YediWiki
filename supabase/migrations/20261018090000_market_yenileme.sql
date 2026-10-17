-- 0008: market yenilemesi (18 Ekim).
--   Kalkan ürünler: Son Sosisli, Selçuklu Kapısı, Güneş Paneli Aurası, Nevada Muhabbeti, İkinci Ev Kupası. Marketten silinir;
--   alanlara kubbesi geri verilir (spent düşer), ürün items'tan ve takılılardan (giy) çıkar, profil resmiyse emojiye döner.
--   Altın Ring Bileti artık elde (el), Futbol Topu ayakta (yeni yuva: ayak). Takılı olanlar yeni yuvasına taşınır (bilet, el boşsa).
--   Yeni ürünler: Kampüs Mafya (yoldaş), Ponpon Kız Kıyafeti (elbise), Steteskop (takı), Anı Makinesi, YediWiki Notu,
--   Çıkış Birası, Kırmızı'nın Suflesi (elde).
--   users_norm: giy'de yeni yuva ayak; yeni alan altk: temel alt, kot ya da etek (başka değer reddedilir). Etek erkek karakterde
--   çizilmez, kayıt yine de kalır (cinsiyet değişirse geri gelir).

insert into yw_private.market (id, price, slot) values
  ('altin-ring', 700, 'el'), ('futbol-topu', 220, 'ayak'),
  ('kampus-mafya', 1000, 'yoldas'), ('ponpon-kiyafeti', 650, 'elbise'), ('steteskop', 450, 'taki'), ('ani-makinesi', 380, 'el'),
  ('yediwiki-notu', 300, 'el'), ('cikis-birasi', 260, 'el'), ('kirmizi-sufle', 200, 'el')
on conflict (id) do update set price = excluded.price, slot = excluded.slot;

do $$
declare
  gone text[] := array['son-sosisli', 'selcuklu-kapi', 'gunes-aurasi', 'nevada-kahve', 'ikinci-ev'];
  r record; its jsonb; gi jsonb; nd jsonb; back numeric;
begin
  for r in select x.id, x.data from public.docs x where x.col = 'users' for update loop
    nd := r.data;
    its := yw_private.obj(nd -> 'items');
    if its ?| gone then
      select coalesce(sum(m.price), 0) into back from yw_private.market m where m.id = any (gone) and its ? m.id;
      nd := nd || jsonb_build_object('spent', greatest(0, coalesce(yw_private.num(nd -> 'spent'), 0) - back), 'items', its - gone);
    end if;
    if jsonb_typeof(nd -> 'giy') = 'object' then
      gi := coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(nd -> 'giy') e
                      where jsonb_typeof(e.value) = 'string' and not (e.value #>> '{}' = any (gone))), '{}'::jsonb);
      if gi ->> 'el' = 'futbol-topu' then gi := (gi - 'el') || '{"ayak": "futbol-topu"}'::jsonb; end if;
      if gi ->> 'taki' = 'altin-ring' then
        gi := gi - 'taki';
        if not gi ? 'el' then gi := gi || '{"el": "altin-ring"}'::jsonb; end if;
      end if;
      nd := nd || jsonb_build_object('giy', gi);
    end if;
    if nd ->> 'avk' = 'urun' and coalesce(nd ->> 'urun', '') = any (gone) then
      nd := nd || '{"avk": "emoji", "urun": ""}'::jsonb;
    end if;
    if nd <> r.data then
      update public.docs x set data = nd, updated_at = now() where x.col = 'users' and x.id = r.id;
    end if;
  end loop;
  delete from yw_private.market m where m.id = any (gone);
end $$;

create or replace function yw_private.users_norm(p_uid text, d jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pv jsonb := '{}'::jsonb; its jsonb; g jsonb; gk text; gv jsonb;
begin
  d := coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(d) e
                 where e.key = any (array['username', 'first', 'last', 'showName', 'yil', 'showYil', 'bolum', 'avk', 'emoji', 'harf', 'urun', 'color', 'pic',
                                          'role', 'bonus', 'spent', 'items', 'gift', 'verifiedAt', 'at', 'kb', 'shared',
                                          'govde', 'kiyafet', 'sac', 'sacr', 'giy', 'altk'])), '{}'::jsonb);
  if d ? 'username' and coalesce(d ->> 'username', '') !~ '^[a-z0-9][a-z0-9._]{2,19}$' then
    perform yw_private.fail('Kullanıcı adı 3-20 karakter olmalı; küçük harf, rakam ve nokta kullan.');
  end if;
  if d ? 'govde' and coalesce(d ->> 'govde', '') not in ('e', 'k', 'd') then
    perform yw_private.fail('Karakterin için erkek, kadın ya da diğer seç.');
  end if;
  if d ? 'kiyafet' and coalesce(d ->> 'kiyafet', '') not in ('tisort', 'kapusonlu', 'mont') then
    perform yw_private.fail('Bu kıyafet yok.');
  end if;
  if d ? 'altk' and coalesce(d ->> 'altk', '') not in ('kot', 'etek') then
    perform yw_private.fail('Bu alt yok.');
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
        if gk in ('ust', 'alt', 'elbise', 'el', 'ayak', 'taki', 'yoldas') and jsonb_typeof(gv) = 'string' and its ? (gv #>> '{}')
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
