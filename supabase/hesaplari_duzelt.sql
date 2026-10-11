-- Panelden açılmış hesapların düzeltilmesi (0002'den sonra, bir kez).
-- 1) Okul adresiyle (admin@std.yeditepe.edu.tr) açılan yönetici hesabının adresi yonetici@yediwiki.com olur; şifresi değişmez.
--    Okul adresinin sahibi olabilecek biri o kutuya gelen kodla yönetici olamasın diye.
update auth.users set email = 'yonetici@yediwiki.com', email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now()
 where lower(email) = 'admin@std.yeditepe.edu.tr'
   and not exists (select 1 from auth.users x where lower(x.email) = 'yonetici@yediwiki.com');
update auth.identities set identity_data = identity_data || jsonb_build_object('email', 'yonetici@yediwiki.com'), updated_at = now()
 where provider = 'email' and lower(identity_data ->> 'email') = 'admin@std.yeditepe.edu.tr'
   and exists (select 1 from auth.users x where x.id = user_id and lower(x.email) = 'yonetici@yediwiki.com');
-- Yönetici hesabı zaten yonetici@yediwiki.com ile açılmışsa yetkisi ve profili kurulsun (tetikleyici yeniden çalışır)
update auth.users set email_confirmed_at = email_confirmed_at where lower(email) = 'yonetici@yediwiki.com' and email_confirmed_at is not null;

-- 2) Ortak deneme hesabı (deneme123@std.yeditepe.edu.tr / deneme123), yoksa: panelden "Auto Confirm" ile açılmış gibi
do $$
declare uid uuid := gen_random_uuid(); inst uuid;
begin
  if exists (select 1 from auth.users where lower(email) = 'deneme123@std.yeditepe.edu.tr') then return; end if;
  select u.instance_id into inst from auth.users u where u.instance_id is not null limit 1;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (coalesce(inst, '00000000-0000-0000-0000-000000000000'), uid, 'authenticated', 'authenticated', 'deneme123@std.yeditepe.edu.tr',
          extensions.crypt('deneme123', extensions.gen_salt('bf', 10)), now(), '', '', '', '',
          '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', now(), now());
  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (uid::text, uid, jsonb_build_object('sub', uid::text, 'email', 'deneme123@std.yeditepe.edu.tr', 'email_verified', false, 'phone_verified', false),
          'email', now(), now(), now());
end $$;
