#!/usr/bin/env python3
"""a/<BID>.txt dökümlerinden ders kataloğunu üretir.

Çıktılar (akts/ altında):
  catalog.json      okunaklı tam katalog (dersler + bölüm planları)
  catalog.min.json  sayfaya gömülen sıkı biçim
  catalog-names.txt KOD|AD|AKTS|KREDİ|FAKÜLTE (gözle denetim için)

Önce tools/check.py temiz çıkmalı; bu betik onu da çalıştırır.
"""
import sys, os, re, json, glob, collections, datetime
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.normpath(os.path.join(HERE, '..'))
sys.path.insert(0, HERE)
import check

SURUM = '2026-10-07'
ORTAK = 'Ortak ders'
# ---- seçmeli dersler (secmeli/ klasörü; fakülte sitelerinden) ----
SEC = os.path.join(ROOT, 'secmeli')
# AKTS planlarında hiç geçmeyen kod öneklerinden hangi fakülteye yazılacağı bilinenler (diğerleri boş kalır)
ONEK_FAK = {'CPLT': 'İnsan ve Toplum Bilimleri Fakültesi'}   # planlarda hiç geçmeyen önekler: CPLT (Karşılaştırmalı Edebiyat) yalnız İngiliz Dili ve Edebiyatı'nın alan seçmelisi havuzunda
ORTAK_ONEK = re.compile(r'^(AFE|AF[A-Z]A|AFRF|TKL)$')   # yabancı dil (AFE, AFxA, AFRF) ve Türk Dili dersleri her fakültenin havuzunda: hep ortak ders (AFN gibi başka önekler değil)
TUR_AKTS = {'Ekstra': 'Extra'}                    # fakülte sitesindeki tür adı -> AKTS sayfasındaki tür adı
ALINMAYAN = {'Serbest', 'Tamamlayıcı', 'Extra'}   # havuzu okunmayan türler (yüzlerce derslik genel liste / müfredat dışı)

# ---- kaynak sayfadaki yazım hataları (iki bağımsız döküm de aynısını verdi, yani sayfada böyle) ----
TYPOS = [
    ('DEMOKTRASİ', 'DEMOKRASİ'),         # PA301
    ('MİLLATTAN', 'MİLATTAN'),           # HIST119
    ('İSTATİKSEL', 'İSTATİSTİKSEL'),     # GBE222
    ('FİZKOKİMYA', 'FİZİKOKİMYA'),       # CHBE211, CHBE213
    ('ÖGRETİMİ', 'ÖĞRETİMİ'),            # PRED305
]
# ---- tek tek elle belirlenen adlar ----
OVERRIDE = {
    # sayfada "GELİŞTİMİ"; Eğitim Fakültesi Bologna bilgi paketi (2021): "Düşünme Becerilerinin Gelişimi"
    'EDEM325': 'Düşünme Becerilerinin Gelişimi',
    # sayfada ad yarım kalmış ("KLASİK TÜRK EDEBİYATININ"); devamı doğrulanamadı
    'TLL188': 'Klasik Türk Edebiyatının…',
}
ACR = {'CNC', 'CHBE', 'RPD'}                       # büyük kalacak kısaltmalar
SMALL = {'VE', 'İLE', 'İÇİN', 'VEYA', 'DA', 'DE', 'YA'}
ROMAN = re.compile(r'^(?=[IVX])X{0,3}(IX|IV|V?I{0,3})$')
LET = 'A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû'

def tr_lower(s): return s.replace('I', 'ı').replace('İ', 'i').lower()
def tr_cap(w):
    lw = tr_lower(w); f = lw[0]
    return ('İ' if f == 'i' else 'I' if f == 'ı' else f.upper()) + lw[1:]

def tidy(n):
    """Büyük harfli kaynak adda boşluk/noktalama düzeni."""
    for a, b in TYPOS: n = n.replace(a, b)
    n = n.replace('YY.LAR', ' YÜZYILLAR')                       # 12-16.YY.LAR -> 12-16. YÜZYILLAR
    return noktalama(n)

def noktalama(n, tire=True):
    """Boşluk/noktalama düzeni: plan adlarında (tidy) ve fakülte sitesinden gelen seçmeli adlarında (sec_ad) aynı kurallar."""
    n = re.sub(r'(\d)\.(?=[%s])' % LET, r'\1. ', n)             # 19.YÜZYIL -> 19. YÜZYIL
    n = re.sub(r'\s*,\s*', ', ', n)                             # AĞIZ,DİŞ -> AĞIZ, DİŞ
    n = re.sub(r'\s*:\s*', ': ', n)                             # PROJE:MARKA / CHBE II : ISI
    n = re.sub(r'\(\s+', '(', n); n = re.sub(r'\s+\)', ')', n)  # ( ADOBE -> (ADOBE
    n = re.sub(r'\s*&\s*', ' & ', n)                            # PROJESİ&SEMİNER
    n = re.sub(r'\s+/\s*|\s*/\s+', ' / ', n)                    # CERRAHİ/ ACİL -> CERRAHİ / ACİL (bitişik olan kalır)
    if tire:
        n = re.sub(r'(?<=\S)-\s+(?=\S)|(?<=\S)\s+-(?=\S)', '-', n)  # ISI- IŞIK -> ISI-IŞIK (iki yanı boşluklu olan kalır)
        n = re.sub(r'(\d)\s+-\s+(\d)', r'\1-\2', n)                 # 6 - 13. -> 6-13.
    return re.sub(r'\s+', ' ', n).strip()

def nice(code, raw):
    if code in OVERRIDE: return OVERRIDE[code]
    s = tidy(raw); out = []; pos = 0; first = True
    for m in re.finditer('[%s]+' % LET, s):
        out.append(s[pos:m.start()]); w = m.group(0); pos = m.end()
        prev = s[m.start() - 1] if m.start() else ''; nxt = s[m.end()] if m.end() < len(s) else ''
        if prev.isdigit(): r = w                                    # 3D, 2B, 3B
        elif prev == "'": r = tr_lower(w)                           # TÜRKİYE'DE -> Türkiye'de
        elif w in ACR: r = w
        elif ROMAN.match(w) and nxt != "'": r = w                   # I, II, IV ... (sıra sayıları)
        elif prev == '-' and w in ('İ', 'U', 'Ü'): r = tr_lower(w)  # SERVET-İ FÜNUN -> Servet-i Fünun
        elif not first and prev == ' ' and w in SMALL: r = tr_lower(w)
        else: r = tr_cap(w)
        out.append(r); first = False
    out.append(s[pos:])
    return ''.join(out)

def code_fmt(c):
    m = re.match(r'^([A-Z]+)(\d.*)$', c); return m.group(1) + ' ' + m.group(2)
def num(v):
    if v is None: return 0
    return int(v) if abs(v - round(v)) < 1e-9 else v
def numn(v):
    """Sayfada değer yoksa None kalır (0 ile karışmasın)."""
    return None if v is None else num(v)

def slot_adi(label):
    """'Seçmeli - Kısıtlı- 3' -> ('Kısıtlı', 3);  'Zorunlu' -> ('Zorunlu', 0)"""
    t = label.replace('Seçmeli', '').strip(' -')
    m = re.match(r'^(.*?)[\s-]*(\d+)$', t)
    t, n = (m.group(1).strip(' -'), int(m.group(2))) if m else (t, 0)
    return TUR_AKTS.get(t, t), n

def sec_ad(ad):
    """Fakülte sitesindeki ders adı: kesme işareti düz yazılır (katalogla aynı), boşluk ve noktalama plan adlarıyla aynı kurala bağlanır."""
    return noktalama(ad.replace('’', "'").replace('‘', "'"), tire=False)   # tire aralığı sayfadaki gibi kalır (MetroVersity- Metro...)

def secmeli_oku(plan=None):
    """secmeli/ altındaki denetlenmiş dosyaları okur. Yoksa None.
    plan: AKTS planlarından gelen dersler {KOD: {kredi, ...}}. Havuzdaki ders planlarda kredisiyle varsa ve ayrıntı sayfası
    okunmamışsa plan bilgisi geçerli sayılır (adı yine havuz sayfasındaki adla karşılaştırılır)."""
    if not os.path.isfile(os.path.join(SEC, 'detay.tsv')): return None
    detay = {}
    for ln in open(os.path.join(SEC, 'detay.tsv'), encoding='utf-8'):
        c, did, ad, sem, t, u, l, k, e, note = ln.rstrip('\n').split('\t')
        f = lambda v: None if v == '' else num(float(v))
        detay[c] = dict(ad=sec_ad(ad), did=int(did), donem=sem, t=f(t), u=f(u), l=f(l), kredi=f(k), akts=f(e))
    sayfa = {k: v for k, v in json.load(open(os.path.join(SEC, 'sayfalar.json'), encoding='utf-8')).items() if not k.startswith('_')}
    slots = {}; havuz = {}
    for slug, url in sayfa.items():
        rows = []
        for ln in open(os.path.join(SEC, 'slots', slug + '.txt'), encoding='utf-8'):
            sem, label, sid = ln.rstrip('\n').split('|'); tur, n = slot_adi(label)
            rows.append(dict(sem=int(sem), tur=tur, n=n, id=int(sid)))
            f = os.path.join(SEC, 'kod', sid + '.txt')
            if os.path.isfile(f): havuz[int(sid)] = open(f, encoding='utf-8').read().split()
            else: assert tur in ALINMAYAN, ('havuzu okunmamış hak', slug, label)
        m = re.match(r'^(https://[^/]+)/tr/', url); assert m, url
        slots[slug] = dict(rows=rows, onek=m.group(1) + '/tr/secmeli-dersler?secmeliID=')
    # ayrıntı sayfası açılmayan dersler (secmeli/detay-yok.txt: KOD<TAB>neden): adı havuz sayfasından, kredisi/AKTS'si bilinmiyor
    yok = {}
    fy = os.path.join(SEC, 'detay-yok.txt')
    if os.path.isfile(fy):
        for ln in open(fy, encoding='utf-8'):
            if ln.strip() and not ln.startswith('#'): yok[ln.split('\t')[0]] = 1
    adlar = {r[0]: r for r in (l.rstrip('\n').split('\t') for l in open(os.path.join(SEC, 'dersler.tsv'), encoding='utf-8'))}
    for c in yok:
        assert c not in detay, ('ayrıntısı okunmuş ders detay-yok listesinde', c)
        detay[c] = dict(ad=sec_ad(adlar[c][1]), did=int(adlar[c][2]), donem='', t=None, u=None, l=None, kredi=None, akts=None)
    plandan = set()
    for sid, cs in havuz.items():
        for c in cs:
            if c not in detay and plan is not None and c in plan and plan[c]['kredi'] is not None:
                detay[c] = dict(ad=sec_ad(adlar[c][1]), did=int(adlar[c][2]), donem='', t=None, u=None, l=None, kredi=None, akts=None); plandan.add(c)
    for sid, cs in havuz.items():
        for c in cs: assert c in detay, ('havuzdaki dersin ayrıntısı yok', sid, c)
    return dict(detay=detay, slots=slots, havuz=havuz, plandan=plandan)

def hak_esle(els, rows, havuz, kr_of, slug, rapor, ak_of=None):
    """Bir programın AKTS seçmeli haklarını fakülte sitesindeki haklarla eşler.
    els: {dönem: [[tür, akts, kredi], ...]} (AKTS sayfasındaki sıra);  rows: fakülte sitesindeki haklar [{sem, tur, n, id}]
    Dönüş: {dönem: [[tür, akts, kredi, havuz id | None, numara, hak id], ...]} (AKTS sırası; AKTS'de olmayan fakülte hakları dönemin sonuna).
    Her tür için: dönem dönem sayılar tutuyorsa dönem içinde eşlenir. Toplam aynı ama dönemlere dağılım farklıysa (iki kaynak
    hakkı farklı döneme koymuş) AKTS sırası fakülte numarası sırasıyla eşlenir; plandaki dönem AKTS'deki dönemdir."""
    import itertools
    out = {s: [[t, a, k, None, 0, 0] for t, a, k in el] for s, el in els.items()}
    def uyum(e, f):                                                   # 0: hakkın kredisi havuzdaki derslerin kredileri arasında
        if f['id'] not in havuz or e[2] is None: return 0
        ks = {kr_of(c) for c in havuz[f['id']]}
        return 0 if e[2] in ks or None in ks else 1          # kredisi sayfada yazmayan ders (staj gibi) uyuşmazlık sayılmaz
    def uyum_a(e, f):                                                 # 0: hakkın AKTS'si havuzdaki derslerin AKTS'leri arasında (yalnız eşitlik bozucu:
        if ak_of is None or f['id'] not in havuz or not e[1]: return 0   #    aynı dönemde aynı türden iki hak varsa 10 AKTS'lik hak 10 AKTS'lik havuza gider)
        aks = {ak_of(c) for c in havuz[f['id']]}
        return 0 if e[1] in aks or None in aks or 0 in aks else 1
    def bagla(e, f, s):
        if uyum(e, f): rapor.append('%s %d. dönem: %s-%d hakkının kredisi (%s) havuzdaki derslerle uyuşmuyor' % (slug, s, f['tur'], f['n'], e[2]))
        e[3:] = [f['id'] if f['id'] in havuz else None, f['n'], f['id']]
    for tur in sorted({f['tur'] for f in rows} | {e[0] for el in out.values() for e in el}):
        if tur == 'Extra': continue                                   # müfredat dışı ek haklar eşlenmez
        F = [f for f in rows if f['tur'] == tur and not (f['id'] in havuz and not havuz[f['id']])]   # havuzu boş olan satır yok sayılır
        sems = sorted(set(out) | {f['sem'] for f in F})
        A = {s: [e for e in out.get(s, []) if e[0] == tur] for s in sems}
        B = {s: sorted((f for f in F if f['sem'] == s), key=lambda f: f['n']) for s in sems}
        nA = sum(len(v) for v in A.values())
        if nA == len(F) and any(len(A[s]) != len(B[s]) for s in sems):
            pairs = list(zip([(s, e) for s in sems for e in A[s]], sorted(F, key=lambda f: f['n'])))
            for (s, e), f in pairs: bagla(e, f, s)
            rapor.append('%s: %s haklarının dönemleri iki kaynakta farklı (AKTS %s, fakülte sitesi %s); AKTS dönemleri esas alınıp numara sırasıyla eşlendi' % (
                slug, tur, [len(A[s]) for s in sems], [len(B[s]) for s in sems]))
            continue
        artanA = []; artanB = []
        for s in sems:
            a, b = A[s], B[s]; n = min(len(a), len(b))
            best = min(itertools.permutations(range(len(b)), n), key=lambda p: (sum(uyum(a[j], b[p[j]]) for j in range(n)), sum(uyum_a(a[j], b[p[j]]) for j in range(n)), p)) if n else ()
            for j in range(n): bagla(a[j], b[best[j]], s)
            if best and list(best) != sorted(best): rapor.append('%s %d. dönem: %s hakları krediye ya da AKTS değerine göre sırası değiştirilerek eşlendi %s' % (slug, s, tur, [b[i]['n'] for i in best]))
            artanA += [(s, e) for e in a[n:]]
            artanB += [b[i] for i in range(len(b)) if i not in best]
        artanB.sort(key=lambda f: f['n'])
        for (s, e), f in zip(artanA, artanB):                         # dönemi iki kaynakta farklı olan tek tük hak
            bagla(e, f, s)
            rapor.append('%s: %s-%d hakkı AKTS planında %d., fakülte sitesinde %d. dönemde; AKTS dönemi esas alındı' % (slug, tur, f['n'], s, f['sem']))
        for f in artanB[len(artanA):]:
            ks = {kr_of(c) for c in havuz.get(f['id'], [])}
            rapor.append('%s %d. dönem: AKTS sayfasında olmayan %s-%d hakkı fakülte sayfasından eklendi (havuz: %s)' % (slug, f['sem'], tur, f['n'], ' '.join(havuz.get(f['id'], [])) or '?'))
            out.setdefault(f['sem'], []).append([tur, None, next(iter(ks)) if len(ks) == 1 else None, f['id'] if f['id'] in havuz else None, f['n'], f['id']])
        if len(artanA) > len(artanB) and tur not in ALINMAYAN:
            rapor.append('%s: %d %s hakkının havuzu fakülte sayfasında yok (dönem %s)' % (slug, len(artanA) - len(artanB), tur, [s for s, e in artanA[len(artanB):]]))
    return out

def main():
    meta = json.load(open(os.path.join(ROOT, 'bid2slug.json'), encoding='utf-8'))
    progs = {}
    for path in sorted(glob.glob(os.path.join(ROOT, 'a', '*.txt')), key=lambda p: int(os.path.basename(p)[:-4])):
        bid = os.path.basename(path)[:-4]; a = check.parse_a(path)
        assert not a['errs'], (bid, a['errs']); assert bid in meta, bid
        progs[bid] = a
    assert set(progs) == set(meta), sorted(set(meta) ^ set(progs))
    # ---- dersler: programlar arası tutarlılık ----
    raw = {}; where = collections.defaultdict(list)
    for bid, a in progs.items():
        for s, c, n, ak, kr in a['rows']:
            v = (n, ak, kr)
            if c in raw: assert raw[c] == v, ('programlar arası fark', c, raw[c], v, bid)
            raw[c] = v; where[c].append(bid)
    faks = sorted({m['fakulte'] for m in meta.values()}, key=lambda x: x.translate(check.TR).lower())
    # ---- fakülte: tek fakültede geçen ders o fakültenin; değilse kod önekinin açık ara en çok geçtiği fakülte; o da yoksa ortak ----
    pre = lambda c: re.match(r'^[A-Z]+', c).group(0)
    score = collections.defaultdict(collections.Counter)
    for c, bids in where.items():
        for f in {meta[b]['fakulte'] for b in bids}: score[pre(c)][f] += 1
    def fak_of(c):
        if ORTAK_ONEK.match(pre(c)): return ORTAK
        fs = {meta[b]['fakulte'] for b in where[c]}
        if len(fs) == 1: return next(iter(fs))
        top = score[pre(c)].most_common(2)
        if len(top) == 1 or top[0][1] >= 2 * top[1][1]: return top[0][0]
        return ORTAK
    flist = faks + [ORTAK]
    dersler = {}
    for c in sorted(raw, key=lambda x: (pre(x), x)):
        n, ak, kr = raw[c]
        dersler[c] = dict(kod=code_fmt(c), ad=nice(c, n), akts=num(ak), kredi=numn(kr), fak=fak_of(c), kaynak_ad=n, bolum_sayisi=len(where[c]))
    # ---- seçmeli dersler: fakülte sitesindeki havuzlardan gelen, planlarda olmayan dersler ----
    sec = secmeli_oku(plan=dersler); rapor = []; yeni = 0
    if sec:
        def fak_yeni(c):
            p = pre(c)
            if ORTAK_ONEK.match(p): return ORTAK
            if p not in score: return ONEK_FAK.get(p, '')
            top = score[p].most_common(2)
            return top[0][0] if len(top) == 1 or top[0][1] >= 2 * top[1][1] else ORTAK
        for c, d in sorted(sec['detay'].items(), key=lambda x: (pre(x[0]), x[0])):
            if c in dersler:                                    # iki kaynak da aynı şeyi söylemeli
                o = dersler[c]
                assert tr_lower(o['ad']) == tr_lower(d['ad']), ('ad farkı', c, o['ad'], d['ad'])
                if d['akts'] is None: continue                  # ayrıntı sayfası açılmayan ders: plan bilgisi geçerli
                assert o['akts'] == d['akts'] and (o['kredi'] is None or o['kredi'] == d['kredi']), ('kredi/AKTS farkı', c, o, d)
                if o['kredi'] is None: o['kredi'] = d['kredi']
                continue
            dersler[c] = dict(kod=code_fmt(c), ad=d['ad'], akts=d['akts'], kredi=d['kredi'], fak=fak_yeni(c), kaynak_ad=d['ad'], bolum_sayisi=0, kaynak='fakülte sitesi (seçmeli)')
            yeni += 1
        dersler = dict(sorted(dersler.items(), key=lambda x: (pre(x[0]), x[0])))
    # ---- planlar ----
    planlar = {}
    for bid, a in sorted(progs.items(), key=lambda x: meta[x[0]]['slug']):
        m = meta[bid]; don = {}
        els = {s: [[e[1], num(e[2]), numn(e[3])] for e in a['el'] if e[0] == s] for s in a['sems']}
        if sec and m['slug'] in sec['slots']:
            els = hak_esle(els, sec['slots'][m['slug']]['rows'], sec['havuz'], lambda c: dersler[c]['kredi'], m['slug'], rapor, ak_of=lambda c: dersler[c]['akts'])
            assert set(els) == set(a['sems']), ('fakülte sitesinde AKTS planında olmayan dönem', m['slug'], sorted(els))
            for el in els.values():
                for e in el:                                    # fakülte sayfasından eklenen hakkın AKTS'si: havuzdaki dersler aynı AKTS'deyse o
                    if e[1] is None:
                        aks = {dersler[c]['akts'] for c in sec['havuz'].get(e[3], [])}
                        e[1] = next(iter(aks)) if len(aks) == 1 else 0
        for s in a['sems']:
            cs = [r[1] for r in a['rows'] if r[0] == s]
            el = els[s]
            tot = sum(dersler[c]['akts'] for c in cs) + sum(e[1] for e in el)
            krs = [dersler[c]['kredi'] for c in cs] + [e[2] for e in el]
            don[str(s)] = dict(dersler=cs, secmeli=el, akts=num(tot), kredi=num(sum(k for k in krs if k is not None)), kredi_tam=all(k is not None for k in krs))
        mm = re.search(r'\(([^)]*)\)\s*$', a['title'] or '')
        planlar[m['slug']] = dict(ad=m['ad'], fakulte=m['fakulte'], pid=int(a['pid']), bid=int(bid), dil_akts=mm.group(1) if mm else '', havuz_onek=(sec['slots'][m['slug']]['onek'] if sec and m['slug'] in sec['slots'] else ''),
                                  yillik=bool(a['yearly']), akts=num(sum(d['akts'] for d in don.values())), kredi=num(sum(d['kredi'] for d in don.values())), kredi_tam=all(d['kredi_tam'] for d in don.values()), donemler=don)
    # ---- havuzlar: aynı ders listesi tek kez tutulur; planlardaki haklar havuz sırasını gösterir ----
    hlist = []; hidx = {}; hid2i = {}
    for p in planlar.values():
        for d in p['donemler'].values():
            for e in d['secmeli']:
                if len(e) > 3 and e[3] is not None:
                    key = tuple(sec['havuz'][e[3]])
                    if key not in hidx: hidx[key] = len(hlist); hlist.append(list(key))
                    hid2i[e[3]] = hidx[key]
    full = dict(surum=SURUM, kaynak='akts.yeditepe.edu.tr Ders Planı sayfaları; her program iki kez okunup AKTS toplamlarıyla denetlendi. Seçmeli havuzları ve seçmeli derslerin kredisi fakülte sitelerinden (secmeli/).',
                program_sayisi=len(planlar), ders_sayisi=len(dersler), fakulteler=flist, dersler=dersler, planlar=planlar,
                havuzlar={str(k): sec['havuz'][k] for k in sorted(hid2i)} if sec else {})
    json.dump(full, open(os.path.join(ROOT, 'catalog.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    # ---- sıkı biçim ----
    # c: kod -> [ad, akts, kredi (bilinmiyorsa null), fakülte sırası]   p: slug -> [yıllık mı, [[dönem, [kodlar], [[seçmeli türü, akts, kredi|null], ...]], ...]]
    # h: havuzlar [[kod, ...], ...]   u: fakülte sitesindeki havuz sayfası adres önekleri
    # seçmeli hakkı: [tür, akts, kredi|null] ya da fakülte sitesiyle eşlendiyse [tür, akts, kredi|null, havuz sırası|-1, numara, hak id]
    ulist = sorted({p['havuz_onek'] for p in planlar.values() if p['havuz_onek']})
    def hak(e):
        if len(e) <= 3 or not e[5]: return [e[0], e[1], e[2]]
        return [e[0], e[1], e[2], hid2i[e[3]] if e[3] is not None else -1, e[4], e[5]]
    mini = dict(v=SURUM, f=flist,
                c={c: [d['ad'], d['akts'], d['kredi'], flist.index(d['fak']) if d['fak'] else -1] for c, d in dersler.items()},
                p={s: [1 if p['yillik'] else 0, [[int(k), d['dersler'], [hak(e) for e in d['secmeli']]] for k, d in p['donemler'].items()]] + ([ulist.index(p['havuz_onek'])] if p['havuz_onek'] else []) for s, p in planlar.items()},
                h=hlist, u=ulist)
    txt = json.dumps(mini, ensure_ascii=False, separators=(',', ':'))
    open(os.path.join(ROOT, 'catalog.min.json'), 'w', encoding='utf-8').write(txt)
    with open(os.path.join(ROOT, 'catalog-names.txt'), 'w', encoding='utf-8') as f:
        for c, d in dersler.items(): f.write('%s|%s|%s|%s|%s|%s\n' % (c, d['ad'], d['akts'], d['kredi'], d['fak'], d['kaynak_ad']))
    print('%d program, %d ders, %d plan satırı; catalog.min.json %d bayt' % (len(planlar), len(dersler), sum(len(a['rows']) for a in progs.values()), len(txt.encode('utf-8'))))
    print('fakülte dağılımı:', dict(collections.Counter(d['fak'] for d in dersler.values()).most_common()))
    print('ortak:', ' '.join(c for c, d in dersler.items() if d['fak'] == ORTAK))
    print('plan AKTS toplamı 240 (lisans) / 120 (ön lisans) olmayanlar:', {s: p['akts'] for s, p in planlar.items() if p['akts'] not in (240, 120)})
    if sec:
        haklar = [e for p in planlar.values() for d in p['donemler'].values() for e in d['secmeli']]
        print('seçmeli: %d yeni ders, %d farklı havuz, havuzu bağlı hak %d / fakülte sitesiyle eşlenen %d / toplam %d' % (yeni, len(hlist), sum(1 for e in haklar if len(e) > 3 and e[3] is not None), sum(1 for e in haklar if len(e) > 3 and e[5]), len(haklar)))
        if sec['plandan']: print('  ayrıntı sayfası okunmayan plan dersi (kredisi AKTS planından): %d' % len(sec['plandan']))
        for r in rapor: print('  *', r)

if __name__ == '__main__':
    main()
