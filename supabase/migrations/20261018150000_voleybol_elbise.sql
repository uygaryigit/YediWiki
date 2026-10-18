-- 0010: Voleybol Forması kız forması oldu (18 Ekim): dar kesim forma ve kısa tayt şort birlikte, türü Elbise (elbise yuvası).
--   Üst yuvasında takılı olan varsa elbise yuvasına taşınır (elbise üstü ve altı birlikte kaplar).

update yw_private.market set slot = 'elbise' where id = 'voleybol-forma';

update public.docs x
set data = x.data || jsonb_build_object('giy', (((x.data -> 'giy') - 'ust') - 'alt') || '{"elbise": "voleybol-forma"}'::jsonb), updated_at = now()
where x.col = 'users' and x.data -> 'giy' ->> 'ust' = 'voleybol-forma';
