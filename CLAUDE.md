# YediWiki çalışma notları

Projenin ayrıntısı README.md'de. Bu dosya kaldığımız yeri ve çalışma kurallarını tutar.

## Durum (13 Ekim 2026)

- **Kod:** bu depo, `main` dalı.
- **Supabase (canlı):** proje `efyrrbqdiilpqnqzsphk`.
  - Göçler 0001, kadro kimlikleri ve 0002 (gizlilik ve özel hesaplar) uygulandı. `supabase/hesaplari_duzelt.sql` de uygulandı.
  - 0002 SQL Editor'den uygulandığı için göç geçmişinde görünmeyebilir.
- **Hesaplar:**
  - `yonetici@yediwiki.com`: yönetici, şifreyle girer.
  - `deneme123@std.yeditepe.edu.tr`: ortak deneme hesabı, şifreyle girer.
  - Öğrenciler okul e-postasına gelen kodla girer.
- **Yayın:** Cloudflare Workers, yalnızca statik dosya (`wrangler.jsonc`, `dist/`). GitHub `main`'den otomatik derlenir; dağıtım çalışıyor.
  - `yediwiki.uygaryigit.workers.dev` Türkiye'den açılmıyor (erişim sorunu); site yediwiki.com üzerinden kullanılacak.
- **Alan adları (13 Ekim):** `yediwiki.com` ve `yediwiki.xyz` Cloudflare'e eklendi (Free). Natro'da isim sunucuları `colin.ns.cloudflare.com` ve `wren.ns.cloudflare.com` yapıldı; .com kaydında görünüyor, Cloudflare'in etkinleştirmesi bekleniyor.
  - `yediwiki.com`: Worker'a özel alan adı olarak bağlı. Always Use HTTPS açık.
  - `www.yediwiki.com`: A 192.0.2.1 (proxied) ve Redirect Rule ile `https://yediwiki.com`'a 301.
  - `yediwiki.xyz`: Redirect Rule ile tüm istekler `https://yediwiki.com` + yol, 301.
  - Natro'dan gelen park kayıtları (A ve www CNAME) silindi; kök SPF TXT kaydı (Natro) duruyor.
- **E-posta (14 Ekim):** Supabase Auth, Resend üzerinden gönderiyor (Resend → Supabase bağlantısı kullanıcı onayıyla kuruldu).
  - Gönderen `YediWiki <iletisim@yediwiki.com>`, smtp.resend.com:465, kullanıcı `resend`; aynı kişiye en sık 60 saniyede bir e-posta.
  - Resend'de yediwiki.com doğrulandı (eu-west-1). DNS kayıtları Cloudflare'de: `resend._domainkey` TXT, `rsend` ve `send` CNAME (DNS only), `_dmarc` TXT.
  - "Magic link or OTP" ve "Confirm sign up" şablonları Türkçe; gövdede ve konuda `{{ .Token }}` (kod) var, bağlantı yok.
  - Supabase Site URL `https://yediwiki.com`.
  - Gerçek bir okul adresiyle kodun gelişi henüz denenmedi. Resend ücretsiz planı günde 100 e-posta.
- **Ayhan Abi turu:** Pencere değil, sayfa değişince kapanmayan 7 duraklı tur (`openWelcome`, `TOUR`); her durakta ilgili öğe ışıkla gösterilir.

## Sıradaki işler

1. **Kod e-postasını dene:** Gerçek bir `@std.yeditepe.edu.tr` adresiyle yediwiki.com'da kod iste; e-posta geliyor mu, kod çalışıyor mu bak. Resend → Logs'ta gönderim görünür.
2. **Hız sınırı:** Supabase Auth → Rate Limits'te e-posta sınırını kullanıma göre ayarla (Resend ücretsiz planı günde 100).
3. **Deneme:** Yönetici ve deneme hesabıyla şifreli giriş; yeni öğrenci hesabında Ayhan Abi turu; Supabase advisors.

Daha sonra: KVKK, kullanım koşulları ve kaldırma talebi sayfaları; market ürünleri; Drive önizleme.

## Çalışma kuralları

- **Panel işleri:** Cloudflare, Natro, Resend ve Supabase paneli adımlarını kullanıcıya tek tek yaptırma; tarayıcı bağlıysa kendin yap. Kullanıcıdan yalnızca giriş yapmasını iste.
- **Şifre ve anahtarlar:** Şifre yazma ve isteme. Gizli anahtarları (service_role, API token, Resend anahtarı) sohbette isteme. Supabase publishable anahtarı herkese açıktır (`site/config.json`).
- **Kayıt:** Yalnızca `@std.yeditepe.edu.tr` adresleri, artı yukarıdaki iki özel hesap.
- **İçerik:**
  - Ders ve hoca ekleme yalnızca yöneticiye açık.
  - Dosya yükleme yok; notlar yalnızca Google Drive bağlantısı olabilir. Bu sunucuda da zorunlu tutuluyor.
  - Kadro verisinde yalnızca mesleki bilgi bulunur.
- **Veritabanı değişikliği:** Önce yerelde test et (`npm run test:db`, `npm run test:site`), sonra göç olarak uygula.

## Ortam

- **Supabase bağlayıcısı:** "Supabase YediWiki" (`mcp__Supabase_YediWiki__*`), `skip_elicitations=execute_sql,apply_migration` ile kurulu; şema değişikliği buradan yapılabilir.
- **Yerel testler:** PostgreSQL 16 ister (`/usr/lib/postgresql/16/bin`). `supabase/tests/pg_yerel.sh` sunucuyu kurar ve başlatır.
- **Beklenen sonuçlar:** `npm test` 1358/1358, `npm run test:site` 66/66, `npm run test:db` 84/84.
