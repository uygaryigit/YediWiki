#!/usr/bin/env python3
"""Sohbet kaydındaki (transcript) KADROPARCA|<etiket>|i|N|<base64> sonuçlarını toplar, gzip açar, JSON yazar.
Kullanım: parca_al.py <etiket> <çıktı.json>"""
import json, sys, base64, gzip
TR = '/root/.claude/projects/-home-claude/07ef1fc1-869e-5519-9e7b-c83d076000a5.jsonl'
tag, out = sys.argv[1], sys.argv[2]
parts = {}
for line in open(TR, encoding='utf-8'):
    if 'KADROPARCA|' + tag + '|' not in line or '"tool_result"' not in line:
        continue
    o = json.loads(line)
    for c in o.get('message', {}).get('content', []):
        if c.get('type') != 'tool_result':
            continue
        cont = c.get('content')
        texts = [x.get('text', '') for x in cont] if isinstance(cont, list) else [str(cont)]
        for t in texts:
            i = t.find('KADROPARCA|' + tag + '|')
            if i < 0: continue
            s = t[i:]
            if s.startswith('KADROPARCA'):
                body = s.split('"', 1)[0] if '"' in s else s
                _, _, idx, n, data = body.split('|', 4)
                data = data.split('\n', 1)[0].strip()
                parts[int(idx)] = (int(n), data)
if not parts:
    sys.exit('parça yok')
n = next(iter(parts.values()))[0]
miss = [i for i in range(n) if i not in parts]
if miss:
    sys.exit('eksik parça: %s' % miss)
b64 = ''.join(parts[i][1] for i in range(n))
raw = gzip.decompress(base64.b64decode(b64))
d = json.loads(raw.decode('utf-8'))
json.dump(d, open(out, 'w', encoding='utf-8'), ensure_ascii=False)
print('parça', n, 'b64', len(b64), 'json', len(raw), 'satır', len(d.get('kadro', [])), '->', out)
