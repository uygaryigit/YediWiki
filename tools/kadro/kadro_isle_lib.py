#!/usr/bin/env python3
"""(kadro_isle.py ve ders_esle.py ortak tanımları) Yeditepe kişi sayfalarından toplanan ham kadroyu (ham/*.json) sitenin gömülü kadro biçimine çevirir.
Kullanım: kadro_isle.py <ham.json> <kadro.min.json> [rapor.txt]
Ham satır: [kid, 'Unvan Ad Soyad', fakülte, [[program, adres], ...], {DERSKODU: yıl}, son ders yılı, ders satırı sayısı]
Çıktı: {"v": tarih, "f": [fakülteler], "h": [[hid, ad, unvan, fi, bölüm slug, bölüm adı, kid, [[ders, yıl], ...]], ...]}
Yalnız mesleki bilgi: e-posta, telefon, fotoğraf toplanmadı."""
import json, re, sys, unicodedata, glob, os
from collections import Counter

CAT = json.load(open('/mnt/user-data/outputs/akts/catalog.json', encoding='utf-8'))
DERSLER = set(CAT['dersler'].keys())
BOL = {}
for f in glob.glob('/mnt/user-data/outputs/yedek/bolumler/*.json'):
    d = json.load(open(f, encoding='utf-8'))
    BOL[os.path.basename(f)[:-5]] = d.get('ad', '')
for slug, p in CAT['planlar'].items():
    BOL.setdefault(slug, p.get('ad', ''))

TRM = {'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u', 'Ç': 'c', 'Ğ': 'g', 'I': 'i', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u', 'Â': 'a', 'Î': 'i', 'Û': 'u'}
def fold(s):   # app.js fold() ile aynı
    s = ''.join(TRM.get(c, c) for c in str(s or '')).lower()
    s = ''.join(c for c in unicodedata.normalize('NFD', s) if not ('̀' <= c <= 'ͯ'))
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()

# unvanlar: sayfadaki uzun biçimler kısaltılır (sitede kullanılan TITLES ile aynı yazım)
UNVAN = [
    (r'prof(esör)?\.?\s*dr\.?', 'Prof. Dr.'),
    (r'doç(ent)?\.?\s*dr\.?', 'Doç. Dr.'),
    (r'(dr\.?\s*öğr(etim)?\.?\s*üyesi|yrd\.?\s*doç\.?\s*dr\.?)', 'Dr. Öğr. Üyesi'),
    (r'öğr(etim)?\.?\s*gör(evlisi)?\.?\s*dr\.?', 'Öğr. Gör. Dr.'),
    (r'öğr(etim)?\.?\s*gör(evlisi)?\.?', 'Öğr. Gör.'),
    (r'ar(aş|ş)(tırma)?\.?\s*gör(evlisi)?\.?\s*dr\.?', 'Arş. Gör. Dr.'),
    (r'ar(aş|ş)(tırma)?\.?\s*gör(evlisi)?\.?', 'Arş. Gör.'),
    (r'prof(esör)?\.?', 'Prof.'),
    (r'doç(ent)?\.?', 'Doç.'),
    (r'okutman', 'Okutman'),
    (r'uzm(an)?\.?\s*dr\.?', 'Uzm. Dr.'),
    (r'uzm(an)?\.?', 'Uzm.'),
    (r'dr\.?', 'Dr.'),
]
def unvan_ayir(s):
    s = re.sub(r'\s+', ' ', s).strip()
    for rx, t in UNVAN:
        m = re.match(r'^(' + rx + r')\s+(?=\S)', s, re.I)
        if m:
            return t, s[m.end():].strip()
    return '', s

# bölüm adları: "Bilgisayar Mühendisliği Bölümü", "Tarih Lisans Programı | Bölüm Başkanı" -> sitedeki bölüm
EK = r'\b(lisans programi|programi|bolumu|bolum|anabilim dali|onlisans|on lisans|ingilizce|turkce|en|tr)\b'
def bol_anahtar(ad):
    f = fold(ad)
    f = re.sub(EK, ' ', f)
    return re.sub(r'\s+', ' ', f).strip()
BOL_IDX = {}
for slug, ad in BOL.items():
    BOL_IDX.setdefault(bol_anahtar(ad), slug)
OZEL = {'tip fakultesi': 'tip', 'tip': 'tip', 'dis hekimligi fakultesi': 'dis-hekimligi', 'eczacilik fakultesi': 'eczacilik', 'hukuk fakultesi': 'hukuk',
        'elektrik ve elektronik muhendisligi': 'elektrik-elektronik-muhendisligi', 'ceviribilim': 'ceviribilimi', 'genetik ve biyomuhendisligi': 'genetik-ve-biyomuhendislik'}
LISANSUSTU = re.compile(r'yuksek lisans|doktora|tezli|tezsiz|lisansustu|master|phd|mba', re.I)
def bolum_bul(program):
    f = fold(program)
    if LISANSUSTU.search(f):
        return None
    k = bol_anahtar(program)
    if k in OZEL: return OZEL[k]
    if k in BOL_IDX: return BOL_IDX[k]
    for kk, slug in BOL_IDX.items():          # "Bilgisayar Mühendisliği (İngilizce)" gibi küçük farklar
        if kk and (k == kk or k.startswith(kk + ' ') or kk.startswith(k + ' ')):
            return slug
    return None
def program_temiz(p):
    p = re.sub(r'\s*\|.*$', '', p).strip()
    p = re.sub(r'\s+(Lisans Programı|Önlisans Programı|Ön Lisans Programı|Programı|Bölümü)$', '', p).strip()
    return p

