#!/usr/bin/env python3
"""AKTS ders planı dosyalarını denetler.
a/<BID>.txt : tam döküm  (@dönem, KOD|AD|AKTS|KREDİ, -|seçmeli türü|AKTS|KREDİ, =|AKTS toplam|KREDİ toplam)
b/<BID>.txt : ikinci bağımsız döküm (KOD|AD|AKTS)
"""
import re, sys, glob, os, json
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
CODE_RE = re.compile(r'^[A-ZÇĞİÖŞÜ]{2,8}\d{3,4}[A-Z]?$')
TR = str.maketrans('çğıöşüÇĞİÖŞÜâîûÂÎÛ', 'cgiosuCGIOSUaiuAIU')
def norm(s): return re.sub(r'[^A-Z0-9]', '', s.translate(TR).upper())
def num(s):
    s = s.strip()
    if s in ('-', ''): return None   # sayfada değer yok
    return float(s)
def z(v): return 0.0 if v is None else v
def parse_a(path):
    d = dict(title=None, pid=None, bid=None, rows=[], el=[], tot={}, errs=[], sems=[], dbl=False, yearly=False)
    sem = None
    for ln, raw in enumerate(open(path, encoding='utf-8'), 1):
        line = raw.rstrip('\n')
        if not line.strip(): continue
        if line != line.strip(): d['errs'].append(f'{ln}: baş/son boşluk')
        line = line.strip()
        if line.startswith('#T '): d['title'] = line[3:].strip(); continue
        if line.startswith('#P '): d['pid'], d['bid'] = line[3:].split(); continue
        if line.startswith('#D'): d['dbl'] = True; continue   # sayfa toplamları kodlu satırları iki kez sayıyor
        if line.startswith('#Y'): d['yearly'] = True; continue   # dönem yerine yıl (@1 = 1. sınıf yıllık)
        if line.startswith('#'): continue
        if line.startswith('@'):
            sem = int(line[1:]); d['sems'].append(sem); continue
        p = line.split('|')
        try:
            if p[0] == '=':
                assert len(p) == 3; d['tot'][sem] = (num(p[1]), num(p[2])); continue
            if p[0] == '-':
                assert len(p) == 4; d['el'].append((sem, p[1], num(p[2]), num(p[3]))); continue
            assert len(p) == 4
            d['rows'].append((sem, p[0], p[1], num(p[2]), num(p[3])))
        except Exception as e:
            d['errs'].append(f'{ln}: bozuk satır: {line}')
    return d
def parse_b(path):
    rows = []; pid = bid = None; errs = []
    for ln, raw in enumerate(open(path, encoding='utf-8'), 1):
        line = raw.strip()
        if not line: continue
        if line.startswith('#P '): pid, bid = line[3:].split(); continue
        if line.startswith('#') or line.startswith('@'): continue
        p = line.split('|')
        if len(p) != 3: errs.append(f'{ln}: bozuk satır: {line}'); continue
        rows.append((p[0], p[1], num(p[2])))
    return dict(pid=pid, bid=bid, rows=rows, errs=errs)
def main():
    meta = json.load(open(os.path.join(ROOT, 'bid2slug.json'), encoding='utf-8'))
    only = set(sys.argv[1:])
    bad = 0; okc = 0; nrows = 0; nob = []
    for path in sorted(glob.glob(os.path.join(ROOT, 'a', '*.txt')), key=lambda p: int(os.path.basename(p)[:-4])):
        bid = os.path.basename(path)[:-4]
        if only and bid not in only: continue
        a = parse_a(path); msgs = list(a['errs']); notes = []
        if a['bid'] != bid: msgs.append(f'#P BID {a["bid"]} dosya adıyla uyuşmuyor')
        m = meta.get(bid)
        if m:
            if str(m['pid']) != str(a['pid']): msgs.append(f'PID {a["pid"]} beklenen {m["pid"]}')
            t = norm(re.sub(r'\(.*?\)', '', a['title'] or '')); e = norm(m['ad'])
            t2 = t.replace('FAKULTESI', '').replace('BOLUMU', '').replace('ONLISANSPROGRAMI', '').replace('PROGRAMI', '')
            if e not in (t, t2) and not t.startswith(e) and not e.startswith(t2): msgs.append(f'başlık uyuşmuyor: "{a["title"]}" beklenen "{m["ad"]}"')
        else: msgs.append('bid2slug içinde yok')
        if not a['sems']: msgs.append('dönem yok')
        if a['sems'] != sorted(a['sems']) or len(set(a['sems'])) != len(a['sems']): msgs.append(f'dönem sırası tuhaf: {a["sems"]}')
        for s in a['sems']:
            k = 2 if a['dbl'] else 1
            ak = k * sum(z(r[3]) for r in a['rows'] if r[0] == s) + sum(z(e[2]) for e in a['el'] if e[0] == s)
            kr = k * sum(z(r[4]) for r in a['rows'] if r[0] == s) + sum(z(e[3]) for e in a['el'] if e[0] == s)
            if s not in a['tot']: msgs.append(f'dönem {s}: toplam satırı yok (AKTS {ak:g}, kredi {kr:g})'); continue
            ta, tk = a['tot'][s]
            if ta is None or abs(ak - ta) > 0.011: msgs.append(f'dönem {s}: AKTS toplamı {ak:g} != {ta}')
            if tk is not None and abs(kr - tk) > 0.011: msgs.append(f'dönem {s}: kredi toplamı {kr:g} != {tk:g}')
        seen = {}
        for s, c, n, ak, kr in a['rows']:
            if not CODE_RE.match(c): msgs.append(f'kod biçimi: {c}')
            if c in seen: msgs.append(f'yinelenen kod: {c} (dönem {seen[c]} ve {s})')
            seen[c] = s
            if n != n.strip() or '  ' in n or not n: msgs.append(f'ad boşluk: {c} "{n}"')
        bp = os.path.join(ROOT, 'b', bid + '.txt')
        if os.path.exists(bp):
            b = parse_b(bp); msgs += ['b ' + x for x in b['errs']]
            if b['bid'] != bid: msgs.append('b: #P uyuşmuyor')
            ar = [(c, n, ak) for s, c, n, ak, kr in a['rows']]; br = b['rows']
            if ar != br:
                am = {c: (n, ak) for c, n, ak in ar}; bm = {c: (n, ak) for c, n, ak in br}
                for c in am:
                    if c not in bm: msgs.append(f'b içinde yok: {c} {am[c][0]}')
                    elif am[c] != bm[c]: msgs.append(f'FARK {c}: a="{am[c][0]}" {am[c][1]:g} | b="{bm[c][0]}" {bm[c][1]:g}')
                for c in bm:
                    if c not in am: msgs.append(f'a içinde yok: {c} {bm[c][0]}')
                if [x[0] for x in ar] != [x[0] for x in br] and am == bm: notes.append('iki dökümde satır sırası farklı, içerik aynı')
        else: nob.append(bid)
        nrows += len(a['rows'])
        tag = 'OK ' if not msgs else '!! '
        if msgs: bad += 1
        else: okc += 1
        real = sum(z(r[3]) for r in a['rows']) + sum(z(e[2]) for e in a['el'])
        print(f'{tag}{bid:>4} {len(a["rows"]):>3} ders, {len(a["el"]):>2} seçmeli, {len(a["sems"]):>2} {"yıl  " if a["yearly"] else "dönem"}, AKTS {real:g}{" (sayfa toplamı çift sayım)" if a["dbl"] else ""}  {a["title"]}')
        for x in msgs: print('      -', x)
        for x in notes: print('      (not)', x)
    print(f'\n{okc} temiz, {bad} sorunlu, {nrows} ders satırı. İkinci dökümü olmayan: {" ".join(nob) or "yok"}')
if __name__ == '__main__': main()
