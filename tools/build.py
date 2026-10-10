#!/usr/bin/env python3
"""YediWiki derlemesi: tek dosyalık iki sayfa üretir.
  dist/index.html     gerçek site (Supabase): supabase-js, bağdaştırıcı (site/supa.js) ve ayar (site/config.json) sayfaya gömülü
  dist/artifact.html  claude.ai sürümü (window.claude veritabanı)
Ders kataloğu (data/catalog.min.json) ve akademik kadro (data/kadro.min.json) ikisine de gömülür.
Kullanım: python3 tools/build.py [--artifact-out YOL]"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
read = lambda p: open(p, encoding='utf-8').read()

def js_safe(s):
    # gömülen betikte </script> kapanışı olmasın
    return s.replace('</script', '<\\/script').replace('<!--', '<\\!--')

def build():
    parts = {f: read(P('site', f)) for f in ('pre.html', 'style.css', 'mid.html', 'app.js', 'post.html')}
    cat = read(P('data', 'catalog.min.json')); json.loads(cat)
    kad = read(P('data', 'kadro.min.json')); json.loads(kad)
    mid = parts['mid.html']
    assert mid.count('<!--KATALOG-->') == 1 and mid.count('<!--KADRO-->') == 1
    mid = mid.replace('<!--KATALOG-->', '<script type="application/json" id="yw-katalog">' + cat.replace('<', '\\u003c') + '</script>')
    mid = mid.replace('<!--KADRO-->', '<script type="application/json" id="yw-kadro">' + kad.replace('<', '\\u003c') + '</script>')
    assert mid.rstrip().endswith('<script>')

    artifact = parts['pre.html'] + parts['style.css'] + mid + parts['app.js'] + parts['post.html']
    assert artifact.count('<script>') == 1

    cfg = json.loads(read(P('site', 'config.json')))
    assert cfg['url'].startswith('https://') and cfg['key'].startswith('sb_publishable_'), 'yalnızca herkese açık (publishable) anahtar gömülür'
    umd = read(P('node_modules', '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.js'))
    supa = read(P('site', 'supa.js'))
    conf = 'window.YW_SUPA=' + json.dumps({'url': cfg['url'], 'key': cfg['key']}) + ';'
    head_extra = ('<meta name="description" content="Yeditepe öğrencileri için ders notları, bölüm ders planları, HocaÖlçer ve Kubbe.">\n'
                  '<meta name="theme-color" content="#111C4E">\n'
                  '<meta property="og:title" content="YediWiki">\n'
                  '<meta property="og:description" content="Yeditepe öğrencileri için ders notları, bölüm ders planları, HocaÖlçer ve Kubbe.">\n'
                  '<meta property="og:type" content="website">\n'
                  f'<meta property="og:url" content="{cfg.get("siteUrl", "")}">\n'
                  f'<link rel="canonical" href="{cfg.get("siteUrl", "")}">\n'
                  '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 30%22%3E%3Cpath d=%22M4 26a16 15 0 0 1 32 0z%22 fill=%22%23FFD23F%22 stroke=%22%23111C4E%22 stroke-width=%222.5%22/%3E%3Cpath d=%22M20 11V5%22 stroke=%22%23111C4E%22 stroke-width=%222.5%22 stroke-linecap=%22round%22/%3E%3Ccircle cx=%2220%22 cy=%224%22 r=%222.5%22 fill=%22%23FFD23F%22 stroke=%22%23111C4E%22 stroke-width=%222%22/%3E%3C/svg%3E">\n')
    pre = parts['pre.html']
    assert pre.count('<title>YediWiki</title>') == 1
    pre = pre.replace('<title>YediWiki</title>', '<title>YediWiki</title>\n' + head_extra)
    site_mid = mid[:mid.rstrip().rfind('<script>')] + ('<script id="yw-sb">' + js_safe(umd) + '</script>\n<script>' + js_safe(supa) + '</script>\n<script>' + conf + '</script>\n<script>')
    site = pre + parts['style.css'] + site_mid + parts['app.js'] + parts['post.html']

    os.makedirs(P('dist'), exist_ok=True)
    open(P('dist', 'index.html'), 'w', encoding='utf-8').write(site)
    open(P('dist', 'artifact.html'), 'w', encoding='utf-8').write(artifact)
    print('dist/index.html', len(site.encode('utf-8')), 'bayt;', 'dist/artifact.html', len(artifact.encode('utf-8')), 'bayt')
    if '--artifact-out' in sys.argv:
        out = sys.argv[sys.argv.index('--artifact-out') + 1]
        open(out, 'w', encoding='utf-8').write(artifact)
        print('->', out)

if __name__ == '__main__':
    build()
