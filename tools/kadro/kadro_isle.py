#!/usr/bin/env python3
"""Yeditepe kişi sayfalarından toplanan ham kadroyu (ham/*.json) sitenin gömülü kadro biçimine çevirir.
Kullanım: kadro_isle.py <ham.json> <kadro.min.json> [rapor.txt]
Ham satır: [kid, 'Unvan Ad Soyad', fakülte, [[program, adres], ...], {DERSKODU: yıl}, son ders yılı, ders satırı sayısı]
Çıktı: {"v": tarih, "f": [fakülteler], "h": [[hid, ad, unvan, fi, bölüm slug, bölüm adı, kid, [[ders, yıl], ...]], ...]}
Yalnız mesleki bilgi: e-posta, telefon, fotoğraf toplanmadı."""
import json, re, sys, os
from collections import Counter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kadro_isle_lib import CAT, DERSLER, BOL, fold, unvan_ayir, bolum_bul, program_temiz, LISANSUSTU
HAM, OUT = sys.argv[1], sys.argv[2]
RAPOR = sys.argv[3] if len(sys.argv) > 3 else None

ham = json.load(open(HAM, encoding='utf-8'))
rows = ham['kadro']
F, out, seen = [], [], Counter()
rap = Counter(); eslesmeyen = Counter(); unvanlar = Counter()
slugs = {}
for kid, full, fac, bol, ders, son, n in sorted(rows, key=lambda r: r[0]):
    if not fac:
        continue
    title, name = unvan_ayir(full)
    unvanlar[title or '(yok)'] += 1
    if len(name.split()) < 2:
        rap['adı eksik'] += 1
        continue
    if fac not in F: F.append(fac)
    progs = [re.sub(r'\s*\|.*$', '', p[0]).strip() for p in bol if p and p[0]]
    bslug, bad = '', ''
    for p in progs:
        sl = bolum_bul(p)
        if sl:
            bslug, bad = sl, BOL.get(sl, program_temiz(p))
            break
    if not bslug:
        lis = [p for p in progs if not LISANSUSTU.search(fold(p))]
        if lis: eslesmeyen[program_temiz(lis[0])] += 1
        bad = program_temiz(lis[0]) if lis else (program_temiz(progs[0]) if progs else '')
    ds = sorted(((c, y) for c, y in (ders or {}).items() if c in DERSLER and y >= 2015), key=lambda x: (-x[1], x[0]))
    hid = re.sub(r'\s+', '-', fold(name))[:60]
    if hid in slugs:
        hid = (hid[:50] + '-' + str(kid))
    slugs[hid] = kid
    out.append([hid, name, title, F.index(fac), bslug, bad or fac, kid, [[c, y] for c, y in ds]])
    rap['hoca'] += 1
    if bslug: rap['bölümü eşlendi'] += 1
    if ds: rap['katalog dersi var'] += 1
v = (ham.get('at') or '')[:10]
json.dump({'v': v, 'src': 'yeditepe.edu.tr/tr/akademik-kadro', 'f': F, 'h': out}, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
lines = [f'kaynak: {HAM} ({v}), denenen kimlik {ham.get("denenen")}, son kimlik {ham.get("sonId")}, bitti: {ham.get("fin")}',
         f'akademik: {rap["hoca"]}, bölümü eşlenen: {rap["bölümü eşlendi"]}, katalog dersi olan: {rap["katalog dersi var"]}, adı eksik atlanan: {rap["adı eksik"]}',
         'unvanlar: ' + ', '.join(f'{k} {v}' for k, v in unvanlar.most_common()),
         'fakülteler: ' + ', '.join(f'{f} {sum(1 for h in out if F[h[3]] == f)}' for f in F),
         'eşlenmeyen lisans programları (ilk 40): ' + '; '.join(f'{k} ({v})' for k, v in eslesmeyen.most_common(40)),
         'bağlantı sayısı (hoca-ders): ' + str(sum(len(h[7]) for h in out)),
         'boyut: ' + str(os.path.getsize(OUT)) + ' bayt']
txt = '\n'.join(lines)
print(txt)
if RAPOR: open(RAPOR, 'w', encoding='utf-8').write(txt + '\n')
