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
- **Yayın:** Cloudflare Workers, yalnızca statik dosya (`wrangler.jsonc`, `dist/`). GitHub `main`'den otomatik derlenir.
  - Adres: `yediwiki.uygaryigit.workers.dev`. Telefonda açılmadı; dağıtımın başarılı olup olmadığı doğrulanmadı.
- **Alan adları:** `yediwiki.com` ve `yediwiki.xyz`, Natro'da kayıtlı ve doğrulanmış. Henüz Cloudflare'e bağlanmadı.
- **E-posta:** Supabase'in yerleşik göndericisi kullanılıyor. Kod yerine bağlantı gönderiyor ve gönderim sınırı düşük; kod e-postası henüz kurulmadı.

## Sıradaki işler

1. **Dağıtımı doğrula:** Cloudflare'de `yediwiki` Worker'ının son dağıtımı başarılı mı, workers.dev adresi açılıyor mu, kontrol et.
2. **Alan adını Cloudflare'e ekle:** Add a domain → `yediwiki.com`, Free plan. Cloudflare'in verdiği iki isim sunucusunu Natro'da yediwiki.com için gir.
3. **Siteyi alan adına bağla:** Alan adı etkinleşince Worker → Settings → Domains & Routes → Custom domain ile `yediwiki.com` ve `www.yediwiki.com` ekle.
4. **yediwiki.xyz:** Aynı adımları uygula, tüm istekleri `https://yediwiki.com`'a 301 ile yönlendir.
5. **Kod e-postası:**
   - Resend'de alan adını ekle; DNS kayıtları Cloudflare'e girilecek.
   - Supabase Auth'ta SMTP olarak Resend'i ayarla.
   - "Magic Link" ve "Confirm signup" şablonlarına Türkçe metin ve `{{ .Token }}` ekle.
   - Site URL'yi `https://yediwiki.com` yap ve e-posta hız sınırını ayarla.
6. **Deneme:** Yönetici, deneme ve öğrenci (kodla) girişlerini dene; Supabase advisors'a bak.

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
