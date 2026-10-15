# YediWiki çalışma notları

Projenin ayrıntısı README.md'de. Bu dosya kaldığımız yeri ve çalışma kurallarını tutar.

## Durum (14 Ekim 2026)

- **Kod:** bu depo, `main` dalı.
- **Supabase (canlı):** proje `efyrrbqdiilpqnqzsphk`.
  - Göçler 0001, kadro kimlikleri ve 0002 (gizlilik ve özel hesaplar) uygulandı. `supabase/hesaplari_duzelt.sql` de uygulandı.
  - 0002 SQL Editor'den uygulandığı için göç geçmişinde görünmeyebilir.
  - 0003 (`not_oylari`, notlara ▲/▼ oy) 14 Ekim'de bağlayıcıyla uygulandı; canlıdaki işlevler yereldekiyle aynı (md5 denetlendi).
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
  - Gerçek bir okul adresiyle denendi (14 Ekim): kod geliyor, hesap açılıyor. Resend ücretsiz planı günde 100 e-posta.
- **Ayhan Abi turu:** Pencere değil, sayfa değişince kapanmayan 7 duraklı tur (`openWelcome`, `TOUR`); her durakta ilgili öğe ışıkla gösterilir.
- **Drive önizlemesi (14 Ekim):** Yalnızca sitede (`S.supa`): not sayfasında gömülü önizleme ve tam ekran (`drivePreviewHtml`, `dviewMax`), not listelerinde küçük resim (`driveThumbHtml`), paylaşırken anlık önizleme. Artifact eski kartı gösterir.
- **Not türleri:** Yalnızca "Ders notu" (`not`) ve "Çıkmış sınav" (`sinav`); eski türler ders notu sayılır (`noteType`).
- **Not oyları (14 Ekim):** Notta `likes` ▲ (yeşil), `downs` ▼ (kırmızı); takma adla, aynı kişide ikisi birlikte olmaz. ▲ yazara 1 kubbe (`KUBBE.up`), ▼ kubbe almaz, yalnızca sıralamada aşağı iter. Yorum beğenisi 2 kubbe kalır. `kb.ups` not ▲ sayısı, `kb.likes` yorum beğenileri.
  - Sıralama `hotScore`: (oy farkı + 1) / (gün + 2)^1.5. Ana sayfada "Revaçta / Yeni", ders sayfasında "Öne çıkan / En yeni / En çok oy alan".
- **Paylaşma formu (14 Ekim):** Bölüm başlığı yok. Dörtlü: Ders kodu | Hoca / Dönem | Hoca listede yoksa (`.quad`; telefonda tek sütun) → Başlık → Dosya ("Drive'dan seç" ya da link) → Açıklama → Tür (Ders notu / Çıkmış sınav) → Paylaşan adı → onay.
- **Google Drive seçici (14 Ekim):** Google Cloud projesi `yediwiki-511523` (numara 1008166841421), sahibi `yediwiki@gmail.com`.
  - Picker API ve Drive API açık. OAuth onay ekranı "YediWiki", External, yayında; yalnızca `drive.file` (hassas olmayan, doğrulama gerekmez); destek e-postası yediwiki@gmail.com.
  - Web istemcisi "YediWiki site" (köken `https://yediwiki.com`); tarayıcı anahtarı "YediWiki Picker" (`https://yediwiki.com/*` ve yalnızca Picker API). Herkese açık değerler `site/config.json` → `google`; gizli anahtar yok.
  - Seçilen dosya "bağlantıya sahip olan herkes görüntüleyebilir" yapılır (`gdShare`); erişim belirteci yalnızca sekmenin belleğinde.
  - `uygaryigt@gmail.com` hesabında yanlışlıkla açılmış boş bir "YediWiki" projesi (`yediwiki`) var; silinebilir.
- **Gizlilik sayfası:** `site/gizlilik.html` → `https://yediwiki.com/gizlilik` (OAuth onay ekranında gizlilik bağlantısı).
- **Yeni sürüm:** Derleme `dist/ver.txt` yazar; açık sekme sekmeye dönünce bakar, yeni sürüm varsa bir sonraki sayfa geçişinde kendini yeniler.
- **Bölümler katalogdan (14 Ekim):** Bölüm adı, fakültesi ve dili `data/catalog.json`'dan derlemede gömülür (`CAT.bols`); veritabanındaki `bolumler` kayıtları üstüne biner (`mergeBolumler`). Canlı veritabanında bölüm kaydı yok, gerek de yok.
- **Hesap açma (14 Ekim):** Kod doğrulandıktan sonra iki adım: Profilin (kullanıcı adı e-postanın baş kısmından, `userFromMail`; ad soyad ve giriş yılında göz düğmesi) → Bölümün (aranabilir bölüm seçici, ders planı özeti; "sonra seçerim" var). Telefon yalnızca profil düzenlemede.
- **Profil sayfası (14 Ekim):** Profil resminin rengiyle boyalı kareli kapak, bantlı çıkartma büyük profil resmi, kubbe biçiminde bakiye, bölüm etiketi ders planına gider; gözle ad ve giriş yılı tek dokunuşla gizlenir/gösterilir (`toggleVis`). Profilde ve Katkılarım'da "Kubbe ve market" düğmesi yok (kullanıcı istemiyor).
- **Ana sayfa:** Notlarda en çok 6 kart (+ haftanın notu), Son yorumlar 3, hemen altında Gündemdeki dersler (6). Ayrı Derslerim bölümü yok (kullanıcı istemiyor); yeni not rozeti Dersler > Derslerim listesinde (`freshNotes`).
- **DersÖlçer (14 Ekim):** Ders sayfası başlığında sağda büyük kart (dar ekranda alta iner). Zorluk çizim biber (`chiliSvg`: renk kırmızıdan yeşile, zor derste ısı dalgası), iş yükü kitap yığını (`booksSvg`: ağırlaştıkça yükselir); emoji yok.
  - Ekranda puan: 1 en zor / en ağır, 5 en kolay / en hafif. Kayıtta `z` ve `y` derecedir (5 en zor); puan = 6 − derece (`puanOf`, `degOf`). Bu yüzden göç gerekmedi.
- **Not istekleri (14 Ekim):** Tür (vize, final, özet, çıkmış) her yerden kalktı; istek kısa açıklamayla (`reqTitle`), aynı açıklamalı açık istek ikinci kez açılmaz (`reqNorm`). Sunucu eski `kind` alanını "genel" yazar.
  - İsteklerin göründüğü yerler (ders sayfası kutusu, ana sayfa "Not istekleri", `/istekler`) şimdilik olduğu gibi. Kullanıcı bir öneri sistemi anlatacak, istekler o zaman başka sayfada toplanacak; kendiliğinden kurma.
- **Bildirim paneli (15 Ekim):** Ortadaki pencere değil, zilin altında açılan küçük panel (`openNotifs`, `placeNotifs`, `#nf-pop`); zile yeniden basınca, dışarı basınca, Esc'te ya da bir bildirime gidince kapanır. Tur açıkken Esc önce paneli kapatır.
- **Yenilikler bölümü kaldırıldı (14 Ekim):** Kullanıcı istemiyor; yenilik penceresi ve test listesi geri eklenmesin. Ayhan Abi turu Hakkında sayfasındaki düğmeyle de başlar.

## Sıradaki işler

1. **Drive seçiciyi dene:** yediwiki.com'da "Drive'dan seç" ile gerçek bir Google hesabından dosya seç; paylaşım ayarı ve önizleme.
2. **Hız sınırı:** Supabase Auth → Rate Limits'te e-posta sınırını kullanıma göre ayarla (Resend ücretsiz planı günde 100).
3. **Deneme:** Yönetici ve deneme hesabıyla şifreli giriş; yeni öğrenci hesabında Ayhan Abi turu; Supabase advisors.

Daha sonra: KVKK, kullanım koşulları ve kaldırma talebi sayfaları; market ürünleri.

## Çalışma kuralları

- **Panel işleri:** Cloudflare, Natro, Resend ve Supabase paneli adımlarını kullanıcıya tek tek yaptırma; tarayıcı bağlıysa kendin yap. Kullanıcıdan yalnızca giriş yapmasını iste.
- **Şifre ve anahtarlar:** Şifre yazma ve isteme. Gizli anahtarları (service_role, API token, Resend anahtarı) sohbette isteme. Supabase publishable anahtarı herkese açıktır (`site/config.json`).
- **Kayıt:** Yalnızca `@std.yeditepe.edu.tr` adresleri, artı yukarıdaki iki özel hesap.
- **İçerik:**
  - Ders ve hoca ekleme yalnızca yöneticiye açık.
  - Dosya yükleme yok; notlar yalnızca Google Drive bağlantısı olabilir. Bu sunucuda da zorunlu tutuluyor.
  - Kadro verisinde yalnızca mesleki bilgi bulunur.
- **Veritabanı değişikliği:** Önce yerelde test et (`npm run test:db`, `npm run test:site`), sonra göç olarak uygula.
- **Limit tasarrufu:** Kullanıcının kullanım limiti dar.
  - Ekran görüntüsü alma, doğrulamayı testlerle yap. Tasarım işinde en sonda en fazla bir iki görüntü al.
  - Büyük dosyaları baştan okuma, gereken yeri `grep` ile bul.
  - Adım sayısını az tut. Testleri en sonda bir kez çalıştır.
  - Oturum uzadıysa her yeni iş grubu için yeni oturum öner.

## Ortam

- **Supabase bağlayıcısı:** "Supabase YediWiki" (`mcp__Supabase_YediWiki__*`), `skip_elicitations=execute_sql,apply_migration` ile kurulu; şema değişikliği buradan yapılabilir.
- **Yerel testler:** PostgreSQL 16 ister (`/usr/lib/postgresql/16/bin`). `supabase/tests/pg_yerel.sh` sunucuyu kurar ve başlatır.
- **Beklenen sonuçlar:** `npm test` 1479/1479, `npm run test:site` 116/116, `npm run test:db` 95/95.
