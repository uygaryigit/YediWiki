# YediWiki

Yeditepe öğrencileri için ders notları (Google Drive bağlantısıyla), bölüm ders planları, HocaÖlçer ve Kubbe.
Yeditepe Üniversitesi ile resmî bir bağı yoktur.

## Yapı

| Klasör | İçerik |
| --- | --- |
| `site/` | Sayfanın kaynağı: `pre.html`, `style.css`, `mid.html`, `app.js`, `post.html`; `supa.js` (Supabase bağdaştırıcısı), `config.json` (proje adresi ve herkese açık anahtar) |
| `data/` | Ders kataloğu (`catalog.json`, sayfaya gömülen `catalog.min.json`) ve akademik kadro (`kadro.min.json`) |
| `supabase/migrations/` | Veritabanı: belge deposu, kurallar (RPC), kadro kimlikleri, gizlilik ve özel hesaplar |
| `supabase/tests/` | Kural testleri (`gen_kurallar.py` üretir), yerel PostgreSQL'de çalıştırıcı (`yerel.sh`) |
| `tests/` | Sayfa testleri: `t_katalog.js` (claude.ai sürümü), `t_supa.js` (site sürümü, yerel PostgreSQL'e bağlı sahte supabase-js) |
| `tools/` | Derleme (`build.js`), katalog ve kadro araçları |

Aynı `app.js` iki yerde çalışır: claude.ai artifact'i içinde (`window.claude` veritabanı) ve gerçek sitede (Supabase).

## Derleme

```sh
npm ci
npm run build        # dist/index.html (site) ve dist/artifact.html (claude.ai)
```

Cloudflare Pages: derleme komutu `npm ci --omit=dev && npm run build`, çıktı klasörü `dist`.

## Testler

```sh
npm test             # claude.ai sürümü (jsdom)
npm run test:db      # veritabanı kuralları (yerel PostgreSQL 16, /var/tmp/ywpg soketi, 54329 portu)
npm run test:site    # site sürümü: sayfa + gerçek SQL kuralları, RLS ve tetikleyiciler
```

## Veritabanı tasarımı (özet)

- Tek tablo `public.docs (col, id, data jsonb)`; herkes okuyabilir, `private` kayıtlarını yalnızca sahibi.
- İstemci tabloya doğrudan yazamaz: `doc_set`, `doc_update`, `doc_delete`, `buy_item`, `my_info` RPC'leri kuralları uygular.
- Kişisel anahtarlar (beğeni, bildirim, hoca puanı, "ben de", DersÖlçer oyu) belge başına takma addır:
  `'k' + HMAC-SHA256(kişisel gizli, '<koleksiyon>/<kimlik>')` ilk 24 hane. Anahtarlar birbirine bağlanamaz.
- Anonim not ve yorumda yazar alanı boştur; gerçek sahip yalnızca `yw_private.doc_owner` tablosunda.
- Kubbe sunucuda sayılır: `users.kb` herkese açık (yalnızca adla yapılanlar, sıralama), `private.kb` yalnızca sahibine (bakiye).
- Kayıt yalnızca `@std.yeditepe.edu.tr`; yönetici (`yonetici@yediwiki.com`) ve ortak deneme hesabı `yw_private.special_accounts` listesinde.

## Supabase kurulumu

1. `supabase/migrations` dosyalarını sırayla SQL Editor'de çalıştır.
2. Authentication > Users > Add user (Auto Confirm): `yonetici@yediwiki.com` (güçlü şifre) ve `deneme123@std.yeditepe.edu.tr` (`deneme123`).
   Profilleri ve yönetici yetkisi kendiliğinden kurulur. Bu iki hesabın şifresi uygulamadan değiştirilemez; gerekirse SQL Editor'den.
3. Authentication > Emails: "Magic Link" ve "Confirm signup" şablonlarına `{{ .Token }}` (6 haneli kod) eklenir; SMTP olarak alan adına bağlı bir servis (ör. Resend) girilir.
4. Authentication > URL Configuration: Site URL `https://yediwiki.com`.
