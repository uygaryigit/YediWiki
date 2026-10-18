# YediWiki çalışma notları

Projenin ayrıntısı README.md'de. Bu dosya kaldığımız yeri ve çalışma kurallarını tutar.

## Durum (19 Ekim 2026)

- **Kod:** bu depo, `main` dalı.
- **Supabase (canlı):** proje `efyrrbqdiilpqnqzsphk`.
  - Göçler 0001, kadro kimlikleri ve 0002 (gizlilik ve özel hesaplar) uygulandı. `supabase/hesaplari_duzelt.sql` de uygulandı.
  - 0002 SQL Editor'den uygulandığı için göç geçmişinde görünmeyebilir.
  - 0003 (`not_oylari`, notlara ▲/▼ oy) 14 Ekim'de bağlayıcıyla uygulandı; canlıdaki işlevler yereldekiyle aynı (md5 denetlendi).
  - 0004 (`istek_nedeni`, istekte isteğe bağlı `why`, en çok 300) 16 Ekim'de bağlayıcıyla uygulandı; canlıda denendi.
  - 0005 (`karakter_govde_kiyafet`, users'ta `govde` e/k/d ve `kiyafet` tisort/kapusonlu/mont; başka değer reddedilir) 17 Ekim'de bağlayıcıyla uygulandı (öncesinde canlı `users_norm` 0002 ile aynıydı, md5).
  - 0006 (`yorum_siniri`, `public.docs` üzerinde tetikleyici `yw_private.comment_limit`) 17 Ekim'de bağlayıcıyla uygulandı; canlıdaki işlev yereldekiyle aynı (md5). doc_set / doc_update değişmedi.
  - 0007 (`karakter_market`: `yw_private.market`'e `slot` (tür) ve 14 yeni ürün, toplam 23; users'ta `sac`, `sacr`, `giy`) 17 Ekim'de bağlayıcıyla uygulandı. Öncesinde canlı `users_norm` 0005 ile aynıydı, sonrası yereldekiyle aynı (md5); canlıdaki 5 hesabın kaydı yeni kuralla değişmiyor (denendi, geri alındı).
  - 0008 (`market_yenileme`: 5 ürün silindi, 7 ürün eklendi, toplam 25; yeni yuva `ayak`, users'ta `altk` kot / etek) 18 Ekim'de bağlayıcıyla uygulandı. Öncesinde canlı `users_norm` 0007 ile aynıydı, sonrası yereldekiyle aynı (md5). Silinen ürünlerin kubbesi sahibine iade edildi: yalnızca `deneme123` (Selçuklu Kapısı 900 + Güneş Paneli Aurası 800; harcama 9610 → 7910); takılı futbol topu ayağa taşındı.
  - 0009 (`ayakkabi_sapka`: 5 ürün, toplam 30; yeni yuvalar `ayakkabi` ve `bas`) 18 Ekim'de bağlayıcıyla uygulandı. Öncesinde canlı `users_norm` 0008 ile aynıydı, sonrası yereldekiyle aynı (md5).
  - 0010 (`voleybol_elbise`: Voleybol Forması `ust` → `elbise`; üstte takılı olan elbiseye taşınır, canlıda yoktu) 18 Ekim'de bağlayıcıyla uygulandı; `users_norm` değişmedi.
- **Hesaplar:**
  - `yonetici@yediwiki.com`: yönetici, şifreyle girer.
  - `deneme123@std.yeditepe.edu.tr`: ortak deneme hesabı, şifreyle girer. 18 Ekim'de kullanıcının isteğiyle hediye kubbesine 90.000 eklendi (`gift` 10.000 → 100.000), ürünleri deneyebilsin diye.
  - Karakter vücutları (17 Ekim, kullanıcının isteğiyle elle): `deneme123` erkek; `azrock` (Azra) ve `dilara.bahtiyar` kadın. Seçmeyen eski hesaplar "diğer" çizilir.
  - Öğrenciler kayıt olurken şifre belirler ve şifreyle girer; kod yalnızca kayıtta ve şifre yenilemede gider. 17 Ekim'den önce yalnızca kodla açılmış hesaplar bir kez “Şifremi unuttum” ile şifre belirler.
- **Yayın:** Cloudflare Workers (`wrangler.jsonc`): `dist/` statik dosyaları doğrudan sunulur, dosyası olmayan adreslerde `worker/index.js` çalışır. GitHub `main`'den otomatik derlenir (derleme `build/seo-data.json`'u da üretir; worker onu içe aktarır).
  - `yediwiki.uygaryigit.workers.dev` Türkiye'den açılmıyor (erişim sorunu); site yediwiki.com üzerinden kullanılacak.
- **Arama motorları (19 Ekim):** Her dersin Google'a açık adresi `yediwiki.com/ders/<kod küçük harf>` (ör. `/ders/math131`); not başına sayfa yok, kullanıcı öyle istedi.
  - Worker bu adreste index.html'i `HTMLRewriter` ile yazar: başlık "MATH 131 Kalkülüs I Ders Notları · Yeditepe | YediWiki", açıklama, canonical, og etiketleri ve `#main` içine önizleme (`worker/seo.js` `courseBody`: kod, ad, AKTS/kredi, not başlıkları ve sayısı, dersin olduğu bölüm planları, aynı dönemin derslerine `/ders/` bağlantıları). Notlar Supabase REST'ten herkese açık anahtarla (yalnızca gereken alanlar, 2,5 sn sınır); sonuç veri merkezinde 15 dk önbellekte (`caches.default`, anahtarda sürüm). Notlar okunamazsa sayısız yazılır, önbelleğe alınmaz.
  - Büyük harfli ya da tireli adres (`/ders/MATH-131`) 301 ile küçük harfe; katalogda olmayan ders ve bilinmeyen adresler 404 (noindex); `/ders` → `/#/dersler`.
  - Başlık ve açıklama biçimi `app.js` `courseMeta` ile aynı (site testi karşılaştırır); uygulama ders dışı sayfada başlığı "YediWiki", canonical'ı ana sayfa yapar (`setDocMeta`).
  - Uygulama yol adresini tanır (`pathRoute`, `routeHash`); yol adresindeyken #/ ile başka sayfaya geçilince adres `/#/...` olur (`normPath`, `setHashQuiet`). Ders sayfasındaki Paylaş `/ders/<kod>` verir (`data-path`).
  - Sunucu önizlemesi (`[data-ssr]`) veriler gelene kadar yerinde kalır (`route`, `viewCourse` loading).
  - Derleme `dist/sitemap.xml` (ana sayfa + katalogdaki 2823 ders) ve `dist/robots.txt` yazar.
  - Ana sayfa başlığı "YediWiki: Yeditepe Ders Notları, Çıkmış Sınavlar ve Hoca Yorumları" ve yeni açıklama (`tools/build.js` `HOME_TITLE`, app.js'te aynısı; ders dışı diğer sayfalarda sekme başlığı "YediWiki"); `WebSite` yapılandırılmış verisi (ad YediWiki, diğer adlar Yedi Wiki), og:site_name.
  - Sitedeki ders bağlantıları gerçek adres (`courseHref`: sitede `/ders/<kod>`, claude.ai'da `#/ders/<kod>`), böylece Google ana sayfadan derslere geçer. Tıklama dinleyicisi bunları sayfa yenilenmeden `#/ders/<KOD>` (+ `?tab=`) olarak açar; ctrl/cmd ile yeni sekmede yol adresi açılır. Son aramalar ve son yorumlardaki ders bağlantıları da öyle.
  - Ana sayfa 19 Ekim 01:56'da dizindeydi (Search Console). Bing Webmaster Tools'u kullanıcı kendi açacak (hesap açma).
  - Google Search Console: `uygaryigt@gmail.com` hesabında `yediwiki.com` alan adı mülkü, Cloudflare'de `google-site-verification` TXT kaydıyla doğrulandı (kaydı silme).
- **Ders önizlemesi (19 Ekim):** `ders` herkese açık (`PUBLIC`). Giriş yapmamışa (Google dahil) `peek` kipi: başlık, DersÖlçer, not başlıkları (paylaşanın adı ve Anonim yazmaz; `noteRow`/`reqItemHtml` `peek`), sarı giriş kutusu (`peekCtaHtml`: Giriş yap / Kayıt ol); Yorumlar ve Hocalar sekmesi "giriş yapınca görünür". Nota, Not paylaş'a ya da başka kapalı sayfaya basınca önizlemede kalınır, giriş penceresi açılır (`route`, `curUrl`); girişten sonra o sayfaya gidilir.
- **Yasal sayfalar (19 Ekim):** `/kvkk` (aydınlatma metni; veri sorumlusu Uygar Yiğit), `/kosullar` (kullanım koşulları, kaldırma talebi: kişilik hakkı iddiasına 24 saatte yanıt, 5651), `/gizlilik` güncellendi. Alt menüde, Kayıt ol penceresinde (`.auth-legal`), Hakkında'da ve paylaşma formundaki "Kurallar"da bağlantı.
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
  - Auth hız sınırları (19 Ekim, kullanıcı onayıyla): e-posta saatte 100 (önce 25), aynı IP'den 5 dakikada kayıt/giriş 150 ve kod doğrulama 150 (önce 30; kampüs Wi-Fi'ında herkes tek IP). Aynı kişiye 60 saniyede bir.
  - Gelen e-posta (19 Ekim): Cloudflare Email Routing, `iletisim@yediwiki.com` → `uygaryigt@gmail.com`. MX (route1-3.mx.cloudflare.net) ve `cf2024-1._domainkey` eklendi; kök SPF Natro'nunki yerine `v=spf1 include:_spf.mx.cloudflare.net ~all`.
- **Ayhan Abi turu:** Pencere değil, sayfa değişince kapanmayan 7 duraklı tur (`openWelcome`, `TOUR`); her durakta ilgili öğe ışıkla gösterilir.
  - 17 Ekim'den beri yalnızca yeni açılan hesapta, hesap açılır açılmaz bir kez başlar (`S.newAcc`, `createAcc`). Önceden cihaza bağlıydı (localStorage `welcomed:`): var olan hesaplar ve ortak deneme hesabı her yeni tarayıcıda yeniden turu görüyordu. Elle: Hakkında sayfasındaki düğme.
  - Yeditepe'nin Selçuklu kapısında başlar (`GATE_SVG`, `gateOpen`): kapıya dokununca kanatlar açılır, Ayhan Abi kapıda kendini tanıtır. Kartta önden konuşan yüz (`AYHAN_FACE`, `tourTalk`); yazı kelime kelime belirir, tırnaktaki düğme adları sarı, kubbe miktarları mavi (`tourSay`).
- **Ayhan Abi çizimi (15 Ekim):** Kullanıcının fotoğrafındaki gibi: kısa bacak; sırt, baş ve sarkık kulaklar siyah; kaşlar ve ağız kenarı açık kahve; göğüs ve patiler beyaz; küpe yok.
  - Ana sayfada kırmızı kulübe, önünde paspas, yanında mama kabı (`KULUBE_SVG`); uyurken paspasta yatar (`homeX`).
  - Boş sayfalarda (`emptyHtml`) Ayhan Abi yok, kullanıcı istemiyor. Yalnızca ana sayfada ve turda görünür. Marketteki Gece Eskortu 18 Ekim'den beri Ayhan Abi değil, sarı sokak köpeği (kullanıcı istedi); çizimi kullanıcının gönderdiği fotoğraftaki gibi: açık sarı tüy, sarkık kızıl kahve kulaklar, beyaz göğüs, burnu ve ağız çevresi kara, küpesiz (önceki dik kulaklı çizimi tavşana benzetti).
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
- **Ana sayfa:** Notlarda en çok 6 kart (+ haftanın notu; telefonda, 900 pikselin altında 4 kart), Son yorumlar 3, hemen altında Gündemdeki dersler (6). Izgara (`.home-main`, alanlar: `notes` | `lead`, `cmh` (Son yorumlar başlığı) | boş, `cmb` (yorum kutusu) | `reqs`, `trend` | `reqs`; telefonda sıra: lead, notes, cmh, cmb, trend, reqs): Notlar ile Kubbe sıralaması aynı hizada, Not istekleri kutusu Son yorumların başlığıyla değil kutusuyla aynı hizada başlar (`.hm-cms` display:contents); sıralama yapışkan değil. Ana sayfadaki asılı not kartları sarı kareli not kağıdı (`.hm-notes .ncard-link`, `--np-grid`). Not istekleri canlı kırmızı kutuda (`.req-card`: kırmızı geçişli zemin, sağ üstte sıcak ışık, parlayan küçük yıldızlar `.rq-spark`, ara sıra geçen parıltı `::after`; koyu temada koyu kırmızı), başlığın altında açıklama yok (kullanıcı istemiyor); istek yoksa davet yazısı. Ana sayfa başlıklarında simge yok (kullanıcı istemiyor).
  - İstek tek satır (`reqLineHtml`, en çok 5): ders kodu (.9rem), kısa istek, popülerse alev (`REQ_HOT` = 3 kişi), yukarı oklu hap düğme (`.rq-up`, `UP_ARR`, içinde kaç kişinin istediği; artı yok, kullanıcı piksel gibi buldu); sayı artınca sıçrar, ok yukarı fırlar. İstekler sayfasındaki “Ben de”de de aynı ok. İsteğe basınca `/istekler?r=<id>` açılır ve o istek ışıkla gösterilir. Ana sayfada ayrı Derslerim bölümü yok (kullanıcı istemiyor); Derslerim Dersler sayfasının üstünde, yeni not rozetiyle (`freshNotes`).
- **DersÖlçer (14 Ekim):** Ders sayfası başlığında sağda büyük kart (dar ekranda alta iner). Zorluk çizim biber (`chiliSvg`: renk kırmızıdan yeşile, zor derste ısı dalgası), iş yükü kitap yığını (`booksSvg`: ağırlaştıkça yükselir); emoji yok.
  - Ekranda puan: 1 en zor / en ağır, 5 en kolay / en hafif. Kayıtta `z` ve `y` derecedir (5 en zor); puan = 6 − derece (`puanOf`, `degOf`). Bu yüzden göç gerekmedi.
- **Not istekleri (14 Ekim):** Ana sayfadaki kırmızı kutunun sağ üstünde **İSTE** düğmesi (17 Ekim; `.rq-ask`, büyük harfle, "Not iste" yazılmaz, kullanıcı istedi); istekler sayfasında da var. Ders verilmeden açılan istek penceresi önce dersi sorar (`openRequestModal('')`, `#rq-course`, ders önerili). Tür (vize, final, özet, çıkmış) her yerden kalktı; istek kısa açıklamayla (`reqTitle`), aynı açıklamalı açık istek ikinci kez açılmaz (`reqNorm`). Sunucu eski `kind` alanını "genel" yazar.
  - İsteklerin göründüğü yerler (ders sayfası kutusu, ana sayfada sağdaki kutu, `/istekler`). İsterken "Neden lazım?" (`why`) da yazılabilir; yalnızca istekler ve ders sayfasında görünür (`.req-why`), ana sayfada yok. Kullanıcı bir öneri sistemi anlatacak, istekler o zaman başka sayfada toplanacak; kendiliğinden kurma.
- **Bildirim paneli (15 Ekim):** Ortadaki pencere değil, zilin altında açılan küçük panel (`openNotifs`, `placeNotifs`, `#nf-pop`); zile yeniden basınca, dışarı basınca, Esc'te ya da bir bildirime gidince kapanır. Tur açıkken Esc önce paneli kapatır.
- **Çizilmiş simgeler (16 Ekim):** Sitede emoji yok. Simgeler `GL` / `gl(ad, sınıf)` (48'lik: alev, megafon, kep, pati, konfeti, rozet simgeleri, oy okları, kubbe sikkesi, casus...).
  - Alev (🔥 biçimi, solda küçük dil): alttan yukarı sarı > kehribar > turuncu > kırmızı dalgalı katmanlar, alevin içine kırpılı (`clipPath`, her kopyada ayrı kimlik: `gl` içinde `{id}`); katmanlar ayrı yönlere akar (`.fb1`–`.fb3`), gövde esner (`.flm`), tepeden bulut gibi duman tüter (`.smk1`–`.smk3`, `--smoke`).
  - Revaçta düğmesi kutusuz, yazısız, 60 piksellik alev (`.ns-fire`, aria-label Revaçta); kutuda yalnızca "Yeni" var. Yeni seçiliyken alev soluk ve durur. Popüler isteklerde de aynı alev.
  - Profil karakterlerinde gitar rock gitarı (kırmızı Flying V, yanında şimşek).
  - Profil resminde "Karakter" sekmesi: 24 çizim (`AV_ART`, `avArt`); kayıtta anahtar yine emoji (`AV_EMOJI`), serbest emoji yazma kutusu kalktı; listede olmayan eski emoji sabit bir karaktere düşer.
  - Anonim: profil resmi casus, profil resmi olmayan yerlerde adın yanında casus (`spyName`, `whoHtml`); Anonim seçeneklerinde de casus.
  - Pazar küçük rozetleri ve "Aldıkları" ürün çiziminden (`itemAvSrc`); parçacıklar (`burst`) çizim anahtarı alır; `toast(yazı, tür, simge)`.
- **Kubbe sıralaması: Kayışdağı zirvesi (17 Ekim):** Ana sayfada ve Kubbe sayfasında podyumun yerine ilk üç dağda (`summitHtml`): Yokuş Canavarı'ndaki Kayışdağı (yeşil dağ, karlı zirve, yokuş, %18 tabelası), lacivert gökte yıldızlar; etek panele kaybolur.
  - 1. zirvede önden (`mtFront`, pose `flag`): beresiz (saçı görünür), güneş gözlüklü, kubbe amblemli bayrağın direğini tutar, eli belinde. 2. sol sırttan zirveye uzanır, 3. sağ sırttan tırmanır ve terler (`mtClimb`, kasklı, kafa lambalı; 3. aynalı). Gömlek profil rengi; çizim dili koyu kontur + gölgeli dolgu (2.5B).
  - Bayrakta Yeditepe logosu yok: kullanıcı dört kez istedi (17 Ekim'de logoyu da gönderdi, ısrarla; dördüncüsünde rica ederek); üniversitenin logosu çizilmez ve kopyalanıp çizime konmaz, sitenin kubbe amblemi kaldı. Üniversitenin adını yazmak serbest: ringin yanında YEDİTEPE ÜNİVERSİTESİ yazıyor.
  - Ürünler kaydedilen yuvalardan (`giyOf`, `mtGear`): takı sırtta kanat, sırt çantası ya da boyunda stetoskop; elde tutulan; ayakta futbol topu; yoldaş 1.'de önünde oturur (`mtPetSit`), tırmananın peşinden gelir (`mtPetWalk`).
  - Altın, gümüş, bronz madalya karakterin boynunda ve altındaki künyede (`mtTag`, 2-1-3 sırasıyla; dar kutuda künyede profil resmi gizlenir).
- **Karakter (17 Ekim):** Kayıtta cinsiyet zorunlu (Erkek / Kadın / Diğer, her seçenekte küçük karakter: `govdePickHtml`); profili düzenlerken de değişir. Vücut `MT_BODY` (k: dar omuz, ince bel, geniş kalça, kirpik). Çizimin özeti `charSpec` (profil, kart, sıralama, düzenleyici aynı).
  - Profil kapağında profil resminin sağında ve Kubbe sayfasının başında sağda (`.kh-me`, 18 Ekim) el sallayan karakter (`figSvg`, `.pf-me`), altında **Düzenle** (`.pf-char-edit`, `openCharEdit`; karaktere basınca da açılır). Eski üç kıyafet düğmesi kalktı.
  - Düzenleyici (`.ce-modal`): solda (telefonda üstte) canlı önizleme, sekmeler Saç / Kıyafet / Eşyalar, Kaydet'le yazılır (telefonda Kaydet altta yapışık). Sahip olunmayan market ürünleri kesik çizgili ve fiyatlı durur, basınca market o türle açılır (`#/kubbe?tur=`).
  - Saç modeli `sac` (`SAC`, `HAIR_F` önden, `HAIR_S` kaskın altından): erkek Kazınmış, Kısa, Orta, Uzun; kadın Kıvırcık, Dalgalı, Uzun düz, Topuz (kullanıcı "4. ne olursa" dedi, topuz seçildi); diğer sekizinden. Varsayılan e kısa, k uzun düz, d orta. Kazınmış, kısa ve topuzda kulak görünür.
    - 18 Ekim (kullanıcı istedi): kadında Dalgalı belirgin dalgalı, yüzün yanında dalgalı tutamlar. Erkekte Kısa klasik yan ayrık (yanlar tıraşlı değil; önceki tıraşlı, önü kabarık hâlini kullanıcı "keko" buldu, klas ve karizmatik istedi), Orta geriye taranmış dolgun orta boy (kulak hizasında uçları kıvrık, kulaklar görünür). Uzun geriye taranmış, alnı açık, kulakların arkasından enseye inen kat kat uçlu (ilk hâlini kullanıcı kız saçına benzetti; yüzü çevreleyen perçem yok).
  - Saç rengi `sacr` (`SACR`): siyah, kahve, kumral + erkekte sarı, kadında ve diğerde kızıl. Kadında sarı yok (kullanıcı istedi): parlak sarısı markette Yeditepe Sarısı (herkese; saçta iki ışıltı). Seçmemişin rengi ilk üçünden, kullanıcıya göre sabit (`sacrOf`).
  - Takılanlar `giy` (`giyOf`, `mtGear`): yuvalar Üst, Alt, Elbise, Ayakkabı, Elde, Ayakta, Takı, Yoldaş, Baş; her yuvada bir ürün. Ürünün yuvası `slotOf` (türüyle aynı; şapka Saç türünde ama yuvası `bas`), saç boyası `isDye` (yuvasız). Takı tek: kanat, çanta ya da stetoskop (kullanıcı "bunlardan bir tane takabilecek" dedi). Elbise üst ve altı kaplar (seçince ikisi çıkar, üst ya da alt seçince elbise çıkar). Temel üst `kiyafet` (profil renginde Tişört / Kapüşonlu / Mont) market üstü yokken görünür; temel alt `altk` (`altOf`): Kot ya da Etek (kot mini etek; yalnızca kadında ve diğerde, erkekte kot çizilir; 18 Ekim, kullanıcı istedi). Hiç kaydetmemiş eski hesapta takı, elde, ayakta ve yoldaşta sahip olduğu en değerli ürün.
  - Giyilenin çizimi `CLOTH` (renk, kol biçimi: tisort / atlet / ped / mont / cubbe, kol bandı; alt: renkler, yan şerit, şort; elbise eteği kisa / uzun), göğüs ayrıntısı `mtWearFront` (YEDİTEPE yazısı, forma numarası hep 7 = yedi tepe, omuz pedi, parlak montun kayan ışığı `.mt-gloss`, elbisenin çiçekleri `fw`, cübbenin şeridi ve kepi `MT_CAP`). Bacaklar `mtLegs`. Elde tutulanlar `MT_ITEM`. Tırmanırken formada numara yok (yandan).
    - 18 Ekim: etekler `MT_SKIRT` / `MT_SKIRT_S`, `mtSkirtFront` (kot mini, ponponun sarı pileli eteği); ponpon üstü ve iki el ponponu (`mtPom`, `.mt-pom`); stetoskop `MT_STETO_F` / `MT_STETO_S`; ayaktaki top ayağın önünde; yoldaşlar `PET_SIT` / `PET_WALK` (köpek ve kedi).
    - 18 Ekim: ayakkabı `mtShoe(x, y, açı, tür)` (`SHOE_K`: temel koyu spor, beyaz deri sneaker, deri bot), kısa botun konçu ve kürkü `mtBoot` (baldırın ortasından bileğe, uçlar düz; kullanıcı uzun bot istemiyor); şapka `MT_HAT_F` (önden, saçın üstünde; şapkadayken kaşlar çizilmez, cübbenin kepi çizilmez; tırmananlar kasklı olduğu için şapkasız). Düzenleyicide saç seçeneklerinin küçük başları şapkasız.
  - Kullanıcı kartı (`openUserCard`): profil resmi, ad, sağda karakter; tüm zamanlar ve dönem sırası büyük rakamlı renkli kutularda (ilk üçte madalya), not / yorum / puan çipleri, rozetler çizimle. "Aldıkları" kaldırıldı (kullanıcı istemiyor).
- **Ana sayfa (17 Ekim):** Asılı notlar sarı kareli not kağıdı (`--np`, 13 piksellik mavi kareler; önceki çizgili defter kağıdı kalktı). Son yorumlarda yorumu yapan → yorumlanan (ders kodu, unvanıyla hoca ya da not; `hocaFull`). Not isteklerinde + turuncu, verilmişse kırmızı (`.rq-up`); "Ben de" de turuncu.
- **Market güncellemesi (17 Ekim):** Ürünlerin türü `tur` (`TUR`: Üst, Alt, Elbise, Ayakkabı, Elde, Ayakta, Takı, Yoldaş, Saç); Kubbe sayfasında tür sekmeleri (`.mk-turs`, adreste `?tur=`), kartta tür adı, yeni ürünlerde kırmızı "Yeni". Alınan ürün hemen karaktere giyilir (`wearPatch`, `buyItem`), sahip olunanda "Karakterine giy" / "Karakterinde" (Yeditepe Sarısı'nda "Saçını boya" / "Saçında", `wearItem`).
  - 17 Ekim'de 14 ürün eklendi: Mezuniyet Cübbesi 1100, Parlak Mont 950, Eagles Forması 700, Yeditepe Sarısı 600, Bahar Şenliği Elbisesi 480, Futbol Forması 450, Basketbol Forması 450, Amerikan Futbolu Topu 320, Yeditepe Tişörtü 250, Futbol Topu 220, Basketbol Topu 220, Kampüs Eşofmanı 200, Eagles Şortu 160 (ve Nevada Muhabbeti, 18 Ekim'de silindi).
  - 18 Ekim (kullanıcı istedi, 25 ürün): silindi ve kubbesi iade edildi: Son Sosisli, Selçuklu Kapısı (çerçevesi de), Güneş Paneli Aurası, Nevada Muhabbeti, İkinci Ev Kupası. Eklendi (`yeni: 1`): Kampüs Mafya 1000 (şapkalı tekir kedi, Yoldaş), Ponpon Kız Kıyafeti 650 (Eagles maçları: lacivert üst, sarı pileli etek, iki ponpon; Elbise), Stetoskop 450 (kimliği `steteskop`, Takı), Anı Makinesi 380 (fotoğraf makinesi, Elde), YediWiki Notu 300 (hayat kurtaran not, Elde), Çıkış Birası 260 (okul çıkışı pub, Elde), Kırmızı'nın Suflesi 200 (Kırmızı adlı yerin suflesi, İkinci Ev Kupası'nın yerine; Elde).
  - 18 Ekim değişiklikleri: Karşıdaki Dürüm → Ballı Dürüm (ballı tavuk dürüm); Gece Eskortu Ayhan Abi değil, sarı sokak köpeği; Altın Ring Bileti başta değil elde; Futbol Topu elde değil ayakta (yeni yuva `ayak`).
  - 18 Ekim (2. tur, kullanıcı istedi, 30 ürün): Kampüs Sneaker'ı 850 ve Kürklü Bot 750 (yeni tür ve yuva Ayakkabı, `ayakkabi`), Voleybol Forması 450 (lacivert, çapraz sarı, 7), Eagles Şapkası 300 (lacivert kep, sarı siper ve 7; markette Saç türünde, düzenleyicide Saç sekmesinde Şapka satırı, yuvası `bas`), Voleybol Topu 220 (Elde).
    - Kullanıcı "Golden Goose" ve "UGG" ayakkabı istedi (Yeditepe'de popüler): gerçek markalar, adları ve tasarımları kullanılmaz; yerine markasız beyaz deri sneaker ve kürklü bot kondu. Sonra "Altın Kaz" (adın çevirisi) ve "U.G.G" adlarını, tasarımın da daha çok benzetilmesini istedi: bunlar da aynı markalar sayılır, yapılmadı. Yine isterse aynı cevap.
    - Kürklü Bot deri ve kısa (18 Ekim, kullanıcı "süet" yazısını ve uzun botu düzeltti). Voleybol Forması kız forması: dar kesim, kep kollu (`fit: 'kep'`) forma ve kısa tayt şort birlikte, türü Elbise (`CLOTH` elbisenin şortu: `p`, `st`, `sort`, `sl`).
    - Eldeki eşyalar (18 Ekim): yumruğun üstünde durur, parmaklar önden sarar (`mtHeld`, `MT_HOLD`, `mtGrip`); önceden eşya elin arkasında kalıyordu. Çıkış Birası geniş kulplu bardak.
    - Açıklamalar: Parlak Mont "Nevada'da takılanların vazgeçilmezi; kampüsün bitmeyen geyik muhabbeti" (yeni aldın mı esprisi değil); Yeditepe Sarısı ringin sarısı değil: Yeditepe kızlarının boyattığı, başka yerin tutturamadığı ton.
  - Araştırma: Yeditepe'nin takımlarının adı Yeditepe Eagles (maskot kartal; adı mühendislikteki çift başlı Selçuklu kartalından). Amerikan futbolu takımı 2001'den beri ligde, 2020 TKFL şampiyonu. Formalarda yalnızca yazı (YEDİTEPE, EAGLES) ve renkler (lacivert, sarı); çift başlı kartal üniversitenin simgesi olduğu için çizilmedi.
- **Kartal Kanatları (17 Ekim):** Kanat profil resminin ve çerçevesinin arkasından çıkar, her yanda çapın üçte biri kadar. `::before` kanat, `::after` resmin zemini ve çerçevesini (box-shadow) kanadın üstüne yeniden çizer; büyük resimde parlaklık `--avbg` ile.
- **Düğmeler (16 Ekim):** Parlama yok (kullanıcı fazla buldu). `.btn` sade, altta koyu bir kenar (`--edge`): üzerine gelince hafif kalkar, basınca iner.
- **Yenilikler bölümü kaldırıldı (14 Ekim):** Kullanıcı istemiyor; yenilik penceresi ve test listesi geri eklenmesin. Ayhan Abi turu Hakkında sayfasındaki düğmeyle de başlar.

- **Giriş ekranı (17 Ekim):** Sitede önce giriş (`stepLogin`): okul e-postası, şifre (yanında “Şifremi unuttum”), yeşil Giriş yap (`.btn-go`); altında “Hesabın yok mu?” ve kırmızı Kayıt ol (`.btn-new`).
  - Kayıt ol (`stepSignup`): e-posta + şifre (en az 8, `PW_MIN`, göz düğmesi) → kod → profil → bölüm. Şifremi unuttum (`stepForgot`): e-posta + yeni şifre → kod (`shouldCreateUser: false`, hesap yoksa kod gitmez).
  - Kod doğrulanınca şifre `updateUser` ile yazılır (`setPassword`); sunucu zayıf bulursa oturum açık kalır, yeni şifre sorulur (`stepSetPw`). Kayıt ol'da var olan hesabın e-postası yazılırsa giriş yapılır, şifre yenilenir.
  - Yönetici ve deneme hesabı aynı giriş ekranından girer; Kayıt ol'a yazılırlarsa girişe döner. claude.ai sürümünde ilk ekran yine hesap açma.
- **Kod hizası (17 Ekim):** Ders listelerinde kod kutusu en az 5.5em, ortalı (`.row-link > .code:first-child`, seçmeli seçenekleri, arama önerileri, not istekleri); adlar aynı hizadan başlar. En uzun yaygın kod COMM 400; DENTGT kodları biraz taşar.
- **Derslerim (17 Ekim):** Dersler sayfasında hesabı olan öğrencide, aramıyorken listenin üstünde kutu kutu (`mineHtml`, `courseCardHtml`): ilk 6 ders, gerisi “Tümünü göster”, “Liste olarak gör” → `?b=__mine` (o da kutu kutu). “Bu dönemki dersler” kutusu kaldırıldı (kullanıcı istemiyor; `nowSem`, `semStep` silindi, eski özel `donem` kaydı kullanılmıyor).
- **Kutu kutu sonuçlar (17 Ekim):** Arama sayfası (`/ara`) ve Dersler'de ararken eşleşen dersler ders kartı (`.ccards`, `.ccard`: solda ders kodunun rengiyle spiralli defter sırtı, `tintOf`), hocalar hoca kartı. Aramadan katalog ve bölüm planı satır satır kalır.
- **HocaÖlçer (17 Ekim):** En üstte ana sayfadaki gibi büyük arama (`.ho-search`); "Hocalar dört kriterde..." açıklaması kalktı (kullanıcı istemiyor), kadro kaynağı satırı sayfanın altında. Arama ya da fakülte seçilmedikçe yalnızca son puanlanan 10 hoca (en yenisi üstte) ve “Tüm hocaları göster” (listeden biraz aşağıda, `.ho-all`; 18 Ekim, kullanıcı çok yakın buldu); tüm listede sıralama seçicisi ve “Son puanlananlara dön”.
  - Görünüm önce Kutu, istenirse Liste (`.ho-view`, seçim bu tarayıcıda `yw:hocaView`). Hoca kartı (`hocaCardHtml`): fakülte renginde noktalı bant, baş harfli yuvarlak, eğik puan mührü (genel puan + yıldız), unvan, ad, bölüm, dört kriter çubuğu (ağırlık sırasıyla, renk kırmızıdan yeşile), son verdiği dersler, puan sayısı ve ne zaman. Liste satırı `hocaRowHtml`.
  - Genel puan ağırlıklı (`CRIT_W`, `critAll`): anlatım 0,35, not verme 0,30, ödev yükü 0,20, devamsızlık 0,15. Karnede “ağırlıklı genel puan”.
- **Yorum sınırı (17 Ekim):** Bir kişi bir hocaya ya da bir derse en çok 3 yorum (`CM_LIMIT`, anonim dahil); not yorumlarında sınır yok, yönetici serbest. Sınır dolunca yorum kutusu yerine açıklama; puanlama penceresinde yorum yazılamaz, yalnızca puan kaydedilir.
  - Sunucuda 0006: yorum silinince yer açılır; yorumun yeri (`tt`, `tid`) sonradan değişmez.
- **Son yorumlar (17 Ekim):** Anonim yorumda profil resmi casus, ad düz “Anonim” (casus simgesi yok).
- **Zirve künyeleri (17 Ekim):** Podyum gibi alt kenarlar hizalı, 1. en yüksek, 2. biraz alçak, 3. en alçak (üst boşluk 38/30/22 piksel); adlar daha büyük ve kalın (.96rem, 1. için 1.04rem).

- **Tema (17 Ekim):** Siteye giren herkes önce açık temayı görür (cihazın teması izlenmez; `pre.html`'de `yw-tema` betiği sayfa çizilmeden kurar, seçim bu tarayıcıda `yw:theme`).
  - Tema düğmesi sağ boşluğun tepesinde büyük, sayfayı aydınlatan güneş (`.sky-sun`, `toggleTheme`, `paintTheme`; ışınlar yavaşça döner, arkasında sıcak ışık `.sky-glow`). Tıklayınca dönerek aya (krater ve yıldızlı) dönüşür, gece teması açılır, üst çubuğun altında 26 küçük yıldız parlar (`.sky-stars`).
  - Üst çubukta tema düğmesi yok (kullanıcı istemiyor). Dar ekranda (1295 pikselin altı) güneş 60 piksel, sağ üst köşeden bakar.
  - Gök katmanı (`.sky`, z 0) içeriğin arkasında, hero zemininin üstünde; içerik `#main .wrap{position:relative}` ile üstte; güneş düğmesi z 3.
- **Menü (17 Ekim):** Hakkında üst menüden çıktı; alt menüdeki “Kurallar” bağlantısı “Hakkında” oldu (aynı sayfa).
- **Bölüm sırası (17 Ekim):** Kullanıcı kartında iki sıra kutusunun altında, profildeki kubbede sıraların altında ince satır (`deptLineHtml`, `deptStanding`): bu dönem ya da tüm zamanlarda bölümünde ilk üçteyse madalyayla “X bölümünde bu dönem 1.”, değilse “X sıralamasında #N”. İlk üç dışındaki sıralar #N (`rankTxt`; kartta “genel sıralamada”).
- **Ring (17 Ekim):** Ayrı bölme değil; geniş ekranda sayfanın sol ve sağ boşluğunda, düz zeminde (yeşillik yok) kıvrımlı bir yol (`.lane`, `startLane`, `laneGeo`, `laneSvg`).
  - Kıvrım (`laneGeo().nodes`, `laneDy`, `lanePath`): yol yalnızca yukarı tepe yapar (binalar havada kalmasın), duraklarda ve içeriğin kenarında düz, ekran kenarlarında yokuş; uzun boşlukta birkaç tepe, eğim en çok 1/4. Ring tepede tekerlerinin hizasına göre eğilir, ağaçlar yolla yükselir. Solda Selçuklu kapı ve iki ağaç, sağda Hukuk (havuzuyla) ve bir ağaç; kapı ve Hukuk ringden yüksek.
  - Sarı ring (`laneBus`: koyu cam bandında YEDİTEPE ÜNİVERSİTESİ, altta RİNG) Kapı'da bekler, sağa gidip ortadaki listelerin arkasına girer (yol içeriğe yaklaşınca solar, maske), sağdan çıkıp Hukuk'ta durur, aynı yoldan döner. Kapı açılır, fren lambası, egzoz, dönen tekerler; gecede far ve Hukuk'un pencereleri.
  - Yolun hizası Kubbe sıralamasının altı ile Not istekleri arası. Boşluk 140 pikselden darsa (yaklaşık 1340 pikselin altı) ve sıralama açıkken gizli. Yalnızca ekrandayken yürür.
  - Kullanıcının "saçma" dediği ilk tam genişlik şerit (Kayışdağı, çayır, Yurtlar...) silinmedi: `arsiv/kampus-ringi-serit/` (commit 7397e99).

## Sıradaki işler

1. **Drive seçiciyi dene:** yediwiki.com'da "Drive'dan seç" ile gerçek bir Google hesabından dosya seç; paylaşım ayarı ve önizleme.
2. **Search Console:** birkaç gün sonra Sayfalar raporunda dizine eklenen ders sayısına bak; "Taranan, dizine eklenmeyen" çoksa nedenine bak.
3. **Büyüme:** her ziyaretçi bütün kullanıcıları, son 1000 notu ve yorumu indiriyor (`subscribe`). Supabase ücretsiz planında aylık 5 GB çıkış; yüzlerce aktif kullanıcıya gelince sayfa başına yüklemeye geç. Resend ücretsiz planı günde 100 e-posta: açılışta kayıt bunu geçerse ücretli plan ya da ikinci sağlayıcı.
4. **Yedek:** ücretsiz planda otomatik yedek yok.

Supabase advisors (19 Ekim): performans temiz; güvenlikte yalnızca bilinçli tercihler (yw_private'ta politikasız RLS, istemcinin çağırdığı SECURITY DEFINER RPC'ler) ve sızdırılmış şifre denetimi (Pro planında).

## Çalışma kuralları

- **Panel işleri:** Cloudflare, Natro, Resend ve Supabase paneli adımlarını kullanıcıya tek tek yaptırma; tarayıcı bağlıysa kendin yap. Kullanıcıdan yalnızca giriş yapmasını iste.
- **Şifre ve anahtarlar:** Şifre yazma ve isteme. Gizli anahtarları (service_role, API token, Resend anahtarı) sohbette isteme. Supabase publishable anahtarı herkese açıktır (`site/config.json`).
- **Emoji yok:** Sitenin hiçbir yerinde düz emoji kullanılmaz (kullanıcı istemiyor). Simge gerekirse sitenin çizim diliyle çizilir (koyu kontur, düz renk, ışık çizgisi) ve `GL`'ye eklenir; `npm test` sayfalarda emoji arar.
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
- **Beklenen sonuçlar:** `npm test` 1616/1616 ve 62/62 (`tests/t_seo.js`: site haritası, robots, worker verisi, yasal sayfalar, `worker/seo.js`), `npm run test:site` 172/172, `npm run test:db` 138/138.
- **Worker'ı yerelde denemek:** `npx wrangler dev` (önce `npm run build`); yerelde Supabase'e ulaşılamazsa önizleme notsuz yazılır.
