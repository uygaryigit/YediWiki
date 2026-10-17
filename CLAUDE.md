# YediWiki çalışma notları

Projenin ayrıntısı README.md'de. Bu dosya kaldığımız yeri ve çalışma kurallarını tutar.

## Durum (17 Ekim 2026)

- **Kod:** bu depo, `main` dalı.
- **Supabase (canlı):** proje `efyrrbqdiilpqnqzsphk`.
  - Göçler 0001, kadro kimlikleri ve 0002 (gizlilik ve özel hesaplar) uygulandı. `supabase/hesaplari_duzelt.sql` de uygulandı.
  - 0002 SQL Editor'den uygulandığı için göç geçmişinde görünmeyebilir.
  - 0003 (`not_oylari`, notlara ▲/▼ oy) 14 Ekim'de bağlayıcıyla uygulandı; canlıdaki işlevler yereldekiyle aynı (md5 denetlendi).
  - 0004 (`istek_nedeni`, istekte isteğe bağlı `why`, en çok 300) 16 Ekim'de bağlayıcıyla uygulandı; canlıda denendi.
  - 0005 (`karakter_govde_kiyafet`, users'ta `govde` e/k/d ve `kiyafet` tisort/kapusonlu/mont; başka değer reddedilir) 17 Ekim'de bağlayıcıyla uygulandı (öncesinde canlı `users_norm` 0002 ile aynıydı, md5).
  - 0006 (`yorum_siniri`, `public.docs` üzerinde tetikleyici `yw_private.comment_limit`) 17 Ekim'de bağlayıcıyla uygulandı; canlıdaki işlev yereldekiyle aynı (md5). doc_set / doc_update değişmedi.
- **Hesaplar:**
  - `yonetici@yediwiki.com`: yönetici, şifreyle girer.
  - `deneme123@std.yeditepe.edu.tr`: ortak deneme hesabı, şifreyle girer.
  - Karakter vücutları (17 Ekim, kullanıcının isteğiyle elle): `deneme123` erkek; `azrock` (Azra) ve `dilara.bahtiyar` kadın. Seçmeyen eski hesaplar "diğer" çizilir.
  - Öğrenciler kayıt olurken şifre belirler ve şifreyle girer; kod yalnızca kayıtta ve şifre yenilemede gider. 17 Ekim'den önce yalnızca kodla açılmış hesaplar bir kez “Şifremi unuttum” ile şifre belirler.
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
  - 17 Ekim'den beri yalnızca yeni açılan hesapta, hesap açılır açılmaz bir kez başlar (`S.newAcc`, `createAcc`). Önceden cihaza bağlıydı (localStorage `welcomed:`): var olan hesaplar ve ortak deneme hesabı her yeni tarayıcıda yeniden turu görüyordu. Elle: Hakkında sayfasındaki düğme.
  - Yeditepe'nin Selçuklu kapısında başlar (`GATE_SVG`, `gateOpen`): kapıya dokununca kanatlar açılır, Ayhan Abi kapıda kendini tanıtır. Kartta önden konuşan yüz (`AYHAN_FACE`, `tourTalk`); yazı kelime kelime belirir, tırnaktaki düğme adları sarı, kubbe miktarları mavi (`tourSay`).
- **Ayhan Abi çizimi (15 Ekim):** Kullanıcının fotoğrafındaki gibi: kısa bacak; sırt, baş ve sarkık kulaklar siyah; kaşlar ve ağız kenarı açık kahve; göğüs ve patiler beyaz; küpe yok.
  - Ana sayfada kırmızı kulübe, önünde paspas, yanında mama kabı (`KULUBE_SVG`); uyurken paspasta yatar (`homeX`).
  - Boş sayfalarda (`emptyHtml`) Ayhan Abi yok, kullanıcı istemiyor. Yalnızca ana sayfada, turda ve marketteki Gece Eskortu'nda görünür.
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
  - Ürün eşlemesi (`mtGear`, kullanıcı "sonra ayarlayacağız" dedi): kanat sırtta, Gece Eskortu yanında Ayhan Abi (1.'de önden oturur), Altın Ring kulağının arkasında / kaskında bilet, Güneş Aurası arkasında güneş, Selçuklu Kapısı desenli atkı, Yokuş Canavarı sırt çantası, sosisli / kupa / dürüm elinde (biri, fiyat sırasıyla).
  - Altın, gümüş, bronz madalya karakterin boynunda ve altındaki künyede (`mtTag`, 2-1-3 sırasıyla; dar kutuda künyede profil resmi gizlenir).
- **Karakter (17 Ekim):** Kayıtta cinsiyet zorunlu (Erkek / Kadın / Diğer, her seçenekte küçük karakter: `govdePickHtml`); profili düzenlerken de değişir. Vücut `MT_BODY` (k: dar omuz, ince bel, geniş kalça, uzun saç, kirpik; d: arası, küt saç; e: kısa saç), tırmanırken `MT_TR` / `MT_HAIR_S` (k at kuyruklu). Saç rengi kullanıcıya göre sabit (`mtHairOf`).
  - Profil kapağında profil resminin sağında el sallayan karakter (`figSvg`, `.pf-me`), altında üç kıyafet: Tişört, Kapüşonlu, Mont (`KIYAFET`, `setFit`). Market ürünleri ileride buraya gelecek.
  - Kullanıcı kartı (`openUserCard`): profil resmi, ad, sağda karakter; tüm zamanlar ve dönem sırası büyük rakamlı renkli kutularda (ilk üçte madalya), not / yorum / puan çipleri, rozetler çizimle. "Aldıkları" kaldırıldı (kullanıcı istemiyor).
- **Ana sayfa (17 Ekim):** Asılı notlar sarı kareli not kağıdı (`--np`, 13 piksellik mavi kareler; önceki çizgili defter kağıdı kalktı). Son yorumlarda yorumu yapan → yorumlanan (ders kodu, unvanıyla hoca ya da not; `hocaFull`). Not isteklerinde + turuncu, verilmişse kırmızı (`.rq-up`); "Ben de" de turuncu.
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
- **HocaÖlçer (17 Ekim):** En üstte ana sayfadaki gibi büyük arama (`.ho-search`); "Hocalar dört kriterde..." açıklaması kalktı (kullanıcı istemiyor), kadro kaynağı satırı sayfanın altında. Arama ya da fakülte seçilmedikçe yalnızca son puanlanan 10 hoca (en yenisi üstte) ve “Tüm hocaları göster”; tüm listede sıralama seçicisi ve “Son puanlananlara dön”.
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
2. **Hız sınırı:** Supabase Auth → Rate Limits'te e-posta sınırını kullanıma göre ayarla (Resend ücretsiz planı günde 100).
3. **Deneme:** Yönetici ve deneme hesabıyla şifreli giriş; yeni öğrenci hesabında Ayhan Abi turu; Supabase advisors.

Daha sonra: KVKK, kullanım koşulları ve kaldırma talebi sayfaları; market ürünleri.

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
- **Beklenen sonuçlar:** `npm test` 1585/1585, `npm run test:site` 142/142, `npm run test:db` 118/118.
