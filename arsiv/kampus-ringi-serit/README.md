# Kampüs ringi şeridi (arşiv)

17 Ekim 2026'da ana sayfada "Notlar | Kubbe sıralaması" satırının altında tam genişlik bir şerit olarak duruyordu:
Kayışdağı, çayır, uzaktaki binalar, lambalar, Kapı / Hukuk / Yurtlar durakları ve aralarında gidip gelen sarı ring.

Kullanıcı ringin ayrı bir bölme olmasını istemedi; yerine sayfanın sol ve sağ boşluğunda dolaşan sade bir yol kondu
(`site/app.js` → "Ring: yan boşluklarda"). Bu şeridin kodu ileride kullanılabilsin diye burada duruyor:

- `ring.js`: çizim (`ringGeo`, `ringSvg`, durak çizimleri) ve yürütücü (`startRing`)
- `ring.css`: renk değişkenleri (gündüz / gece) ve sınıflar

Son hali git geçmişinde de var: commit `7397e99`.
