#!/usr/bin/env python3
"""Hoca profillerindeki ders satırlarını (ham/adlar.json) katalog derslerine bağlar ve ham kadroya ekler.
Kullanım: ders_esle.py <birlesik.json> <adlar.json> <çıktı.json> [rapor.txt]
adlar.json satırı: [kid, [[hücre metni, yıl, dil], ...]]  (yalnız 2015 ve sonrası, aynı metin tek)
Eşleme sırası: 1) metindeki ders kodu (BME 492, BME492) katalogda varsa;
2) kod yoksa ders adı: adı katalogdaki Türkçe adla ya da AKTS'nin İngilizce sayfasındaki adla (ham/en-adlar.json) birebir
   aynı olmalı (harf, boşluk, I/1, "ve/and/of" gibi bağlaç farkları yok sayılarak).
   Aynı adda birden çok ders varsa hocanın bölüm planındaki, o da yoksa fakültesindeki tek ders seçilir; yine birden çoksa bağlanmaz.
   'Proje', 'Seminer', 'Staj' gibi genel adlar ancak hocanın bölüm planında tek dersse bağlanır."""
import json, re, sys, collections
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
SRC, ADLAR, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
RAPOR = sys.argv[4] if len(sys.argv) > 4 else None

from kadro_isle_lib import CAT, fold, bolum_bul, unvan_ayir
D = CAT['dersler']

ROMA = {'1': 'i', '2': 'ii', '3': 'iii', '4': 'iv', '5': 'v', '6': 'vi'}
BAGLAC = re.compile(r'\b(ve|ile|icin|and|the|of|to|in|for|an?)\b')
def ad_norm(s):
    s = re.sub(r'\([^)]*\)', ' ', s)                       # (Güz), (Spring), (Section 2)
    s = re.sub(r'\b(sube|section|grup|group)\s*\w+\b', ' ', fold(s))
    s = re.sub(r'\b(intro|intr|introd)\b', 'introduction', s)
    s = BAGLAC.sub(' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    s = re.sub(r'\b(\d)$', lambda m: ROMA.get(m.group(1), m.group(1)), s)
    return s

# katalog ad dizini: Türkçe adlar + AKTS İngilizce adları
import os
EN_P = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ham', 'en-adlar.json')
EN = json.load(open(EN_P, encoding='utf-8'))['names'] if os.path.exists(EN_P) else {}
BYNAME = collections.defaultdict(set)
for c, v in D.items():
    for n in {v.get('ad') or '', v.get('kaynak_ad') or '', EN.get(c, '')}:
        k = ad_norm(n)
        if k: BYNAME[k].add(c)
# bölüm planındaki dersler (zorunlu + seçmeli havuzları)
PLAN = {}
for slug, p in CAT['planlar'].items():
    s = set()
    for dn in (p.get('donemler') or {}).values():
        s.update(dn.get('dersler') or [])
        for it in dn.get('secmeli') or []:
            for x in (it if isinstance(it, list) else [it]):
                hv = CAT['havuzlar'].get(str(x))
                if hv: s.update(hv)
    PLAN[slug] = s
GENEL = re.compile(r'^(proje|bitirme projesi|bitirme calismasi|bitirme tezi|mezuniyet tezi|mezuniyet calismasi|son yil projesi|muhendislik projesi|tasarim projesi|seminer|staj|yaz staji|tez|bagimsiz calisma|ozel konular|ozel konular semineri|uzmanlik alan dersi|arastirma projesi|mezuniyet projesi|mezuniyet arastirma projesi|graduation project|graduation thesis|senior project|senior design project|capstone project|engineering project|design project|research project|term project|project|seminar|internship|summer internship|summer practice|thesis|special topics|independent study)( [iv]+)?$')
ONEK = {re.sub(r'\d.*$', '', c) for c in D}     # katalogdaki ders kodu önekleri
CODE = re.compile(r'\b([A-Za-z]{2,5})\s?(\d{3}[A-Za-z]?)\b')
def fak_uyar(tx, c):
    # metin başka bir fakülteyi anıyorsa ("Biyokimya (Tıp Fakültesi I. Dönem)") o fakültenin dersi olmalı
    f = fold(tx).replace(' ', '')
    if 'fakulte' not in f: return True
    fk = fold(D[c].get('fak') or '').replace('fakultesi', '').replace(' ', '')
    return bool(fk) and fk in f

src = json.load(open(SRC, encoding='utf-8'))
adlar = {r[0]: r[1] for r in json.load(open(ADLAR, encoding='utf-8'))['rows']}
st = collections.Counter(); ornek_ad = []; belirsiz = collections.Counter(); bulunmayan = collections.Counter()
rows = []
for r in src['kadro']:
    kid, full, fac, bol, ders, son, n = r
    ders = dict(ders or {})
    satirlar = adlar.get(kid)
    if satirlar is not None:
        slug = ''
        for p in bol:
            sl = bolum_bul(re.sub(r'\s*\|.*$', '', p[0]).strip()) if p and p[0] else None
            if sl: slug = sl; break
        for tx, y, dil in satirlar:
            st['satır'] += 1
            hep = [(m.group(1) + m.group(2)).upper() for m in CODE.finditer(tx)]
            kods = [k for k in hep if k in D]
            if kods:
                for k in kods:
                    if ders.get(k, 0) < y: ders[k] = y
                st['kodla'] += 1
                continue
            ad, eski = tx, None
            if hep:                      # kodu var ama katalogda yok: lisansüstüyse geç, eski lisans koduysa adına bak
                if any(int(re.sub(r'\D', '', k)[:3]) >= 500 for k in hep):
                    st['lisansüstü kod'] += 1
                    continue
                ad = CODE.sub(' ', tx)
                eski = {re.sub(r'\d.*$', '', k) for k in hep}
                st['eski kod, ada bakıldı'] += 1
            k = ad_norm(ad)
            cand = BYNAME.get(k, set())
            if not cand:
                st['adı katalogda yok'] += 1
                bulunmayan[(dil, k)] += 1
                continue
            pick = cand
            if len(pick) > 1 or GENEL.match(k):
                inplan = {c for c in pick if c in PLAN.get(slug, ())}
                if len(inplan) == 1: pick = inplan
                elif len(pick) > 1:
                    infac = {c for c in (inplan or pick) if D[c].get('fak') == fac}
                    pick = infac if len(infac) == 1 else set()
                else:
                    pick = set()     # genel ad, bölüm planında değil
            if len(pick) != 1:
                st['ad belirsiz'] += 1
                belirsiz[k] += 1
                continue
            c = next(iter(pick))
            if eski:
                # eski kodun öneki katalogda hâlâ varsa aynı önekli ders olmalı (TLL 351 ≠ RLL202);
                # önek kalktıysa (PLAS -> PLA) ders hocanın fakültesinden ya da bölüm planından olmalı
                cp = re.sub(r'\d.*$', '', c)
                if (eski & ONEK and cp not in eski) or (not eski & ONEK and D[c].get('fak') != fac and c not in PLAN.get(slug, ())):
                    st['eski kodla uyuşmuyor'] += 1
                    continue
            if not fak_uyar(tx, c):
                st['başka fakülteyi anıyor'] += 1
                continue
            if ders.get(c, 0) < y: ders[c] = y
            st['adla'] += 1
            if len(ornek_ad) < 5000: ornek_ad.append((kid, full, tx, c, D[c].get('ad'), y))
    rows.append([kid, full, fac, bol, ders, son, n])
out = dict(src); out['kadro'] = rows; out['ders_esleme'] = 'kod + katalog adı (ders_esle.py)'
json.dump(out, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False)
lines = ['satırlar: ' + ', '.join(f'{k} {v}' for k, v in st.most_common()),
         'belirsiz adlar (ilk 30): ' + '; '.join(f'{k} ({v})' for k, v in belirsiz.most_common(30)),
         'katalogda bulunmayan adlar, dile göre: ' + ', '.join(f'{d} {v}' for d, v in collections.Counter(d for (d, _), n in bulunmayan.items() for _ in range(n)).most_common()),
         'katalogda bulunmayan Türkçe adlar (ilk 40): ' + '; '.join(f'{k} ({v})' for (d, k), v in bulunmayan.most_common() if d == 'Türkçe')[:3000],
         '', 'adla eşlenen örnekler:'] + [f'  {kid} {full}: "{tx}" -> {c} {ad} ({y})' for kid, full, tx, c, ad, y in ornek_ad]
txt = '\n'.join(lines)
print('\n'.join(lines[:4]))
if RAPOR: open(RAPOR, 'w', encoding='utf-8').write(txt + '\n')
