#!/usr/bin/env python3
"""Supabase kural testlerini üretir: supabase/tests/kurallar_testi.sql
Her adım bir kullanıcı adına bir RPC çağırır, beklenen sonuç (ok/fail) ve ardından bir denetim ifadesi.
Test tek bir işlem içinde çalışır ve sonunda bilerek hata verir: hiçbir şey kalıcı olmaz.
Çıktı: SONUC:[{n, t, ok, got, chk}] (hata iletisinde)."""
import json, os, sys

A = '0000000a-0000-4000-8000-00000000000a'
B = '0000000b-0000-4000-8000-00000000000b'
C = '0000000c-0000-4000-8000-00000000000c'   # yönetici
D = '0000000d-0000-4000-8000-00000000000d'   # istemciyle aynı HMAC'i üretiyor mu
DSEC = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff'
H = 'esin-onbasioglu'
DRIVE = 'https://drive.google.com/file/d/abc/view'

MAC = {A: '$A', B: '$B', C: '$C'}
def m(uid): return MAC.get(uid, uid)
def K(uid, col, id_):
    return f"pg_temp.k('{m(uid)}','{col}','{id_}')"

def U(uid, f):          # users belgesindeki alan
    return f"pg_temp.f('users','{m(uid)}','{{{f}}}')"

def P(uid, f):          # private belgesindeki alan
    return f"pg_temp.f('private','{m(uid)}','{{{f}}}')"

def DOC(col, id_, f):
    return f"pg_temp.f('{col}','{id_}','{{{f}}}')"

def CTID(uid):
    return f"pg_temp.ct('{m(uid)}')"

S = []   # (başlık, kim, sql, beklenen, denetim, önce)
def step(t, who, sql, exp='ok', chk='true', pre=None):
    S.append((t, who, sql, exp, chk, pre))

j = lambda o: "'" + json.dumps(o, ensure_ascii=False).replace("'", "''") + "'::jsonb"

# ---- hesaplar
step('A hesap açar; korumalı alanları gönderse de sunucu yok sayar, gizli ad ve yıl özel kayda gider', A,
     f"select public.doc_set('users', '$A', {j({'username':'testa','first':'Ali','last':'Veli','showName':False,'yil':2023,'showYil':False,'bolum':'bilgisayar-muhendisligi','emoji':'🦊','spent':-999,'gift':5000,'role':'admin','items':{'kartal-kanatlari':1},'zor':{'CSE211':{'z':5,'y':5}},'pic':'data:image/png;base64,AAAA','junk':'x'})})",
     'ok', f"{U(A,'first')} = '' and {U(A,'last')} = '' and {U(A,'yil')}::int = 0 and {U(A,'spent')}::int = 0 and {U(A,'gift')}::int = 0 "
           f"and {U(A,'role')} = 'user' and {U(A,'items')} = '{{}}' and {U(A,'bonus')}::int = 50 and {U(A,'kb,all')}::int = 50 "
           f"and {U(A,'zor')} is null and {U(A,'junk')} is null and {U(A,'pic')} = '' "
           f"and {P(A,'first')} = 'Ali' and {P(A,'yil')}::int = 2023 and {P(A,'kb,all')}::int = 50")
step('A kendine hediye kubbe yazamaz', A, f"select public.doc_update('users', '$A', '{{\"gift\":99999}}'::jsonb)", 'fail')
step('A harcamasını sıfırlayamaz', A, f"select public.doc_update('users', '$A', '{{\"spent\":0}}'::jsonb)", 'fail')
step('B hesap açar (adını gösterir)', B,
     f"select public.doc_set('users', '$B', {j({'username':'testb','first':'Bora','last':'Kaya','showName':True,'bolum':'matematik','emoji':'🐼'})})",
     'ok', f"{U(B,'first')} = 'Bora'")
step('B başkasının kullanıcı adını alamaz', B, f"select public.doc_update('users', '$B', '{{\"username\":\"testa\"}}'::jsonb)", 'fail')
step('Geçersiz kullanıcı adı reddedilir', B, f"select public.doc_update('users', '$B', '{{\"username\":\"B!\"}}'::jsonb)", 'fail')

# ---- notlar
step('A adıyla not paylaşır; yazar, zaman ve beğeniler sunucudan', A,
     f"select public.doc_set('notes', 'tA1', {j({'cid':'CSE211','title':'Veri yapıları','drive':DRIVE,'by':B,'at':1,'likes':{'x':True},'anon':False,'photos':['p1']})})",
     'ok', f"{DOC('notes','tA1','by')} = '$A' and {DOC('notes','tA1','at')}::bigint > 1000000000000 and {DOC('notes','tA1','likes')} = '{{}}' "
           f"and {DOC('notes','tA1','photos')} = '[]' and {U(A,'kb,all')}::int = 75 and {P(A,'kb,all')}::int = 75")
step('Drive bağlantısı olmayan not reddedilir', A, f"select public.doc_set('notes', 'tAx', {j({'cid':'CSE211','title':'Linksiz','anon':False})})", 'fail')
step('Drive dışı bağlantı reddedilir', A, f"select public.doc_set('notes', 'tAy', {j({'cid':'CSE211','title':'Başka site','drive':'https://example.com/a','anon':False})})", 'fail')
step('A anonim not paylaşır: yazar boş, açık profil hiç değişmez', A,
     f"select public.doc_set('notes', 'tA2', {j({'cid':'MATH131','title':'Kalkülüs','drive':DRIVE,'anon':True,'by':A})})",
     'ok', f"{DOC('notes','tA2','by')} = '' and {DOC('notes','tA2','byk')} = {K(A,'notes','tA2')} "
           f"and {U(A,'kb,all')}::int = 75 and {U(A,'kb,notes')}::int = 1 and {P(A,'kb,all')}::int = 100 and {P(A,'kb,notes')}::int = 2 "
           f"and {CTID(A)} = pre", pre=CTID(A))
step('B notu kendi anahtarıyla beğenir; A açık kubbede +2', B,
     f"select public.doc_update('notes', 'tA1', jsonb_build_object('likes', jsonb_build_object({K(B,'notes','tA1')}, true)))",
     'ok', f"{U(A,'kb,all')}::int = 77 and {U(A,'kb,likes')}::int = 1")
step('Anonim nota gelen beğeni açık profilde iz bırakmaz', B,
     f"select public.doc_update('notes', 'tA2', jsonb_build_object('likes', jsonb_build_object({K(B,'notes','tA2')}, true)))",
     'ok', f"{U(A,'kb,all')}::int = 77 and {P(A,'kb,all')}::int = 104 and {CTID(A)} = pre", pre=CTID(A))
step('B gerçek kimliğiyle beğenemez', B, f"select public.doc_update('notes', 'tA1', '{{\"likes\":{{\"$B\":true}}}}'::jsonb)", 'fail')
step('B başka belgenin anahtarıyla beğenemez', B,
     f"select public.doc_update('notes', 'tA1', jsonb_build_object('likes', jsonb_build_object({K(B,'notes','tA2')}, true)))", 'fail')
step('B başkasının notunu değiştiremez', B, f"select public.doc_update('notes', 'tA1', '{{\"title\":\"hack\"}}'::jsonb)", 'fail')
step('A kendi notunu beğenemez', A,
     f"select public.doc_update('notes', 'tA1', jsonb_build_object('likes', jsonb_build_object({K(A,'notes','tA1')}, true)))", 'fail')
step('B notu bildirir; zamanı sunucu koyar', B,
     f"select public.doc_update('notes', 'tA1', jsonb_build_object('reports', jsonb_build_object({K(B,'notes','tA1')}, 1)))",
     'ok', f"(select (data->'reports'->>{K(B,'notes','tA1')})::bigint from public.docs where col = 'notes' and id = 'tA1') > 1000000000000")
step('A kendi notunun başlığını düzeltir (uzun başlık 80 harfe kısalır)', A,
     f"select public.doc_update('notes', 'tA1', {j({'title':'x'*120})})", 'ok', f"length({DOC('notes','tA1','title')}) = 80")

# ---- HocaÖlçer
step('B kadrodaki hocaya ilk puanı verir: puan gizli, açık profil değişmez, hocanın sahibi tutulmaz', B,
     f"select public.doc_set('hocas', '{H}', jsonb_build_object('ratings', jsonb_build_object({K(B,'hocas',H)}, '{{\"a\":4,\"o\":3.5,\"n\":5,\"d\":4,\"c\":\"CSE211\",\"tk\":20261,\"x\":\"fazla\"}}'::jsonb)))",
     'ok', f"(select data->'ratings' ? {K(B,'hocas',H)} and not (data ? 'name') and data->'ratings'->{K(B,'hocas',H)}->'x' is null from public.docs where col = 'hocas' and id = '{H}') "
           f"and {U(B,'kb,ratings')}::int = 0 and {U(B,'kb,all')}::int = 50 and {P(B,'kb,ratings')}::int = 1 and {P(B,'kb,all')}::int = 60 "
           f"and {CTID(B)} = pre and not exists (select 1 from yw_private.doc_owner where col = 'hocas' and id = '{H}')", pre=CTID(B))
step('Listede olmayan hocaya puan verilemez', B,
     f"select public.doc_set('hocas', 'yok-boyle-hoca', jsonb_build_object('ratings', jsonb_build_object({K(B,'hocas','yok-boyle-hoca')}, '{{\"a\":4,\"o\":4,\"n\":4,\"d\":4}}'::jsonb)))", 'fail')
step('B hocanın adını değiştiremez', B, f"select public.doc_update('hocas', '{H}', '{{\"name\":\"X\"}}'::jsonb)", 'fail')
step('A aynı hocaya puan verir (belge varken doc_set güncellemeye döner)', A,
     f"select public.doc_set('hocas', '{H}', jsonb_build_object('ratings', jsonb_build_object({K(A,'hocas',H)}, '{{\"a\":2,\"o\":2,\"n\":2,\"d\":2}}'::jsonb)))",
     'ok', f"{P(A,'kb,ratings')}::int = 1 and (select count(*) from jsonb_object_keys((select data->'ratings' from public.docs where col = 'hocas' and id = '{H}'))) = 2")
step('Geçersiz puan reddedilir', A,
     f"select public.doc_update('hocas', '{H}', jsonb_build_object('ratings', jsonb_build_object({K(A,'hocas',H)}, '{{\"a\":7,\"o\":2,\"n\":2,\"d\":2}}'::jsonb)))", 'fail')
step('Yazı içeren puan reddedilir', A,
     f"select public.doc_update('hocas', '{H}', jsonb_build_object('ratings', jsonb_build_object({K(A,'hocas',H)}, '{{\"a\":\"5\",\"o\":2,\"n\":2,\"d\":2}}'::jsonb)))", 'fail')
step('A, B adına puan veremez', A,
     f"select public.doc_update('hocas', '{H}', jsonb_build_object('ratings', jsonb_build_object({K(B,'hocas',H)}, '{{\"a\":1,\"o\":1,\"n\":1,\"d\":1}}'::jsonb)))", 'fail')
step('A puanını kaldırır', A,
     f"select public.doc_update('hocas', '{H}', jsonb_build_object('ratings', jsonb_build_object({K(A,'hocas',H)}, null)))",
     'ok', f"{P(A,'kb,ratings')}::int = 0")

# ---- not istekleri
step('B not isteği açar (kapanmış gibi gösteremez)', B,
     f"select public.doc_set('requests', 'tR1', {j({'cid':'CSE211','kind':'genel','text':'not lazım','done':True,'doneBy':A})})",
     'ok', f"{DOC('requests','tR1','by')} = '$B' and {DOC('requests','tR1','done')} = 'false' and {DOC('requests','tR1','doneBy')} = ''")
step('B kendi isteğine katılamaz', B,
     f"select public.doc_update('requests', 'tR1', jsonb_build_object('plus', jsonb_build_object({K(B,'requests','tR1')}, true)))", 'fail')
step('A isteğe kendi anahtarıyla katılır', A,
     f"select public.doc_update('requests', 'tR1', jsonb_build_object('plus', jsonb_build_object({K(A,'requests','tR1')}, true)))", 'ok')
step('Başka dersin notuyla istek kapatılamaz', A,
     f"select public.doc_update('requests', 'tR1', {j({'done':True,'nid':'tA2','doneBy':A,'doneAt':0})})", 'fail')
step('A isteği adıyla paylaştığı notla karşılar', A,
     f"select public.doc_update('requests', 'tR1', {j({'done':True,'nid':'tA1','doneBy':A,'doneAt':0})})",
     'ok', f"{DOC('requests','tR1','doneBy')} = '$A' and {U(A,'kb,fills')}::int = 1 and {U(A,'kb,all')}::int = 87")
step('Anonim notla karşılanan istekte karşılayan görünmez', B,
     f"select public.doc_set('requests', 'tR2', {j({'cid':'MATH131','kind':'vize','text':''})})", 'ok')
step('A ikinci isteği anonim notuyla karşılar: açık profil değişmez', A,
     f"select public.doc_update('requests', 'tR2', {j({'done':True,'nid':'tA2','doneBy':A,'doneAt':0})})",
     'ok', f"{DOC('requests','tR2','doneBy')} = '' and {U(A,'kb,fills')}::int = 1 and {P(A,'kb,fills')}::int = 2 and {CTID(A)} = pre", pre=CTID(A))
step('İstek metni 140 harfe kısalır, tür listede değilse genel olur', B,
     f"select public.doc_set('requests', 'tR3', {j({'cid':'CSE211','kind':'uydurma','text':'y'*300})})",
     'ok', f"length({DOC('requests','tR3','text')}) = 140 and {DOC('requests','tR3','kind')} = 'genel'")

# ---- market
step('Kubbe yetmeyince ürün alınamaz', A, "select public.buy_item('kartal-kanatlari')", 'fail')
step('Yönetici hediye kubbe verir', C, f"select public.doc_update('users', '$A', '{{\"gift\":2000}}'::jsonb)", 'ok', f"{U(A,'gift')}::int = 2000")
step('A ürünü alır (bakiye tam hesaptan)', A, "select public.buy_item('kartal-kanatlari')",
     'ok', f"{U(A,'spent')}::int = 1500 and (select data->'items' ? 'kartal-kanatlari' from public.docs where col = 'users' and id = '$A')")
step('Aynı ürün iki kez alınamaz', A, "select public.buy_item('kartal-kanatlari')", 'fail')
step('Sahip olunmayan ürün profil resmi olamaz', A, f"select public.doc_update('users', '$A', '{{\"avk\":\"urun\",\"urun\":\"gece-eskortu\"}}'::jsonb)",
     'ok', f"{U(A,'avk')} = 'emoji'")
step('Sahip olunan ürün profil resmi olur', A, f"select public.doc_update('users', '$A', '{{\"avk\":\"urun\",\"urun\":\"kartal-kanatlari\"}}'::jsonb)",
     'ok', f"{U(A,'avk')} = 'urun'")

# ---- yorumlar
step('B nota adıyla yorum yazar', B, f"select public.doc_set('comments', 'tC1', {j({'tt':'note','tid':'tA1','text':'teşekkürler','anon':False})})",
     'ok', f"{DOC('comments','tC1','by')} = '$B' and {U(B,'kb,comments')}::int = 1")
step('B anonim yorum yazar: yazar boş, açık profil değişmez', B,
     f"select public.doc_set('comments', 'tC3', {j({'tt':'note','tid':'tA1','text':'gizli','anon':True})})",
     'ok', f"{DOC('comments','tC3','by')} = '' and {DOC('comments','tC3','byk')} = {K(B,'comments','tC3')} and {U(B,'kb,comments')}::int = 1 "
           f"and {P(B,'kb,comments')}::int = 2 and {CTID(B)} = pre", pre=CTID(B))
step('Boş yorum reddedilir', B, f"select public.doc_set('comments', 'tC4', {j({'tt':'note','tid':'tA1','text':'   '})})", 'fail')
step('Yeri belli olmayan yorum reddedilir', B, f"select public.doc_set('comments', 'tC5', {j({'tt':'xx','tid':'tA1','text':'a'})})", 'fail')
step('B başkasının notunu silemez', B, "select public.doc_delete('notes', 'tA1')", 'fail')
step('Not sahibi altındaki yorumu silebilir', A, "select public.doc_delete('comments', 'tC1')",
     'ok', "not exists (select 1 from public.docs where col = 'comments' and id = 'tC1')")
step('B yeni yorum yazar', B, f"select public.doc_set('comments', 'tC2', {j({'tt':'note','tid':'tA1','text':'ikinci','anon':False})})", 'ok')
step('A notunu silince yorumları ve karşılama kubbesi de gider', A, "select public.doc_delete('notes', 'tA1')",
     'ok', f"not exists (select 1 from public.docs where (col = 'notes' and id = 'tA1') or (col = 'comments' and id in ('tC2', 'tC3'))) "
           f"and {U(B,'kb,comments')}::int = 0 and {P(B,'kb,comments')}::int = 0 and {U(A,'kb,fills')}::int = 0")

# ---- DersÖlçer
step('A DersÖlçer oyu verir (takma adla, ders belgesinde)', A, f"select public.doc_set('zor', 'CSE211', jsonb_build_object('v', jsonb_build_object({K(A,'zor','CSE211')}, '{{\"z\":4,\"y\":3,\"x\":1}}'::jsonb)))",
     'ok', f"(select data->'v'->{K(A,'zor','CSE211')}->>'z' = '4' and data->'v'->{K(A,'zor','CSE211')}->'x' is null and (data->'v'->{K(A,'zor','CSE211')}->>'at')::bigint > 0 from public.docs where col = 'zor' and id = 'CSE211')")
step('B aynı derse oy verir', B, f"select public.doc_set('zor', 'CSE211', jsonb_build_object('v', jsonb_build_object({K(B,'zor','CSE211')}, '{{\"z\":2,\"y\":2}}'::jsonb)))",
     'ok', "(select count(*) from jsonb_object_keys((select data->'v' from public.docs where col = 'zor' and id = 'CSE211'))) = 2")
step('Geçersiz oy reddedilir', A, f"select public.doc_update('zor', 'CSE211', jsonb_build_object('v', jsonb_build_object({K(A,'zor','CSE211')}, '{{\"z\":7,\"y\":3}}'::jsonb)))", 'fail')
step('Ders kodu olmayan belgeye oy verilemez', A, f"select public.doc_set('zor', 'xx', jsonb_build_object('v', jsonb_build_object({K(A,'zor','xx')}, '{{\"z\":3,\"y\":3}}'::jsonb)))", 'fail')
step('A, B adına oy veremez', A, f"select public.doc_update('zor', 'CSE211', jsonb_build_object('v', jsonb_build_object({K(B,'zor','CSE211')}, null)))", 'fail')
step('A oyunu kaldırır', A, f"select public.doc_update('zor', 'CSE211', jsonb_build_object('v', jsonb_build_object({K(A,'zor','CSE211')}, null)))",
     'ok', f"(select data->'v'->{K(A,'zor','CSE211')} = 'null'::jsonb from public.docs where col = 'zor' and id = 'CSE211')")
step('Kullanıcı kaydına DersÖlçer oyu yazılamaz', A, f"select public.doc_update('users', '$A', '{{\"zor\":{{\"CSE211\":{{\"z\":1,\"y\":1}}}}}}'::jsonb)",
     'ok', f"{U(A,'zor')} is null")

# ---- özel kayıt
step('B başkasının özel kaydına yazamaz', B, f"select public.doc_set('private', '$A', '{{\"x\":1}}'::jsonb)", 'fail')
step('A özel kaydına yazar; sunucunun kubbesi ve gizli adı korunur', A, f"select public.doc_set('private', '$A', '{{\"myc\":[\"CSE211\"],\"kb\":{{\"all\":99999}}}}'::jsonb)",
     'ok', f"{P(A,'myc,0')} = 'CSE211' and {P(A,'first')} = 'Ali' and {P(A,'kb,all')}::int < 99999")
step('A özel kubbesini güncelleyemez', A, f"select public.doc_update('private', '$A', '{{\"kb\":{{\"all\":99999}}}}'::jsonb)",
     'ok', f"{P(A,'kb,all')}::int < 99999")
step('Giriş yapmadan yazılamaz', None, f"select public.doc_set('notes', 'tX', {j({'cid':'CSE211','title':'xx','drive':DRIVE})})", 'fail')

# ---- yönetim yolları (her deyim en az bir kez çalışsın)
step('Yönetici ders kaydı açar', C, f"select public.doc_set('courses', 'CSE211', {j({'code':'CSE 211','name':'Veri Yapıları','edAt':1})})", 'ok', f"{DOC('courses','CSE211','name')} = 'Veri Yapıları'")
step('Öğrenci ders kaydı açamaz', A, f"select public.doc_set('courses', 'CSE212', {j({'name':'x'})})", 'fail')
step('Öğrenci derste kendi anahtarıyla not bilgisi yazar', A, f"select public.doc_update('courses', 'CSE211', jsonb_build_object('grades', jsonb_build_object({K(A,'courses','CSE211')}, '{{\"g\":\"BA\"}}'::jsonb)))", 'ok')
step('Yönetici bölüm kaydı açar', C, f"select public.doc_set('bolumler', 'deneme-bolum', {j({'name':'Deneme','plan':{}})})", 'ok')
step('Öğrenci bölüm kaydı açamaz', A, f"select public.doc_set('bolumler', 'x-bolum', {j({'name':'x'})})", 'fail')
step('Yönetici hocanın adını düzeltir', C, f"select public.doc_set('hocas', '{H}', jsonb_build_object('name', 'Esin Onbaşıoğlu', 'edAt', 1, 'ratings', (select data->'ratings' from public.docs where col = 'hocas' and id = '{H}')))",
     'ok', f"{DOC('hocas',H,'name')} = 'Esin Onbaşıoğlu' and {P(B,'kb,ratings')}::int = 1")
step('Yönetici bildirimleri temizler (anonim notta yazar gizli kalır)', C, "select public.doc_update('notes', 'tA2', '{\"ok\": 9999999999999}'::jsonb)",
     'ok', f"{DOC('notes','tA2','by')} = '' and {DOC('notes','tA2','byk')} = {K(A,'notes','tA2')}")
step('Yönetici isteği düzenler', C, "select public.doc_update('requests', 'tR2', '{\"text\": \"düzenlendi\"}'::jsonb)", 'ok', f"{P(A,'kb,fills')}::int = 1")
step('Yönetici DersÖlçer belgesini düzenler', C, "select public.doc_set('zor', 'MATH131', '{\"v\": {}}'::jsonb)", 'ok')
step('Yönetici başkası adına profil açar', C, f"select public.doc_set('users', '00000011-0000-4000-8000-000000000011', {j({'username':'testx','first':'X','last':'Y','showName':True})})",
     'ok', f"{DOC('users','00000011-0000-4000-8000-000000000011','role')} = 'user'")
step('Yönetici hocanın puan belgesini siler; puan verenlerin kubbesi düşer', C, f"select public.doc_delete('hocas', '{H}')",
     'ok', f"{P(B,'kb,ratings')}::int = 0 and {P(B,'kb,all')}::int = 50")
step('Yönetici isteği siler', C, "select public.doc_delete('requests', 'tR2')", 'ok', f"{P(A,'kb,fills')}::int = 0")
step('Öğrenci kendi isteğini siler', B, "select public.doc_delete('requests', 'tR3')", 'ok')
step('Öğrenci başkasının isteğini silemez', A, "select public.doc_delete('requests', 'tR1')", 'fail')
step('Olmayan kaydı silmek sessizce geçer', A, "select public.doc_delete('hocas', 'yok')", 'ok')
step('Yönetici anonim notu siler', C, "select public.doc_delete('notes', 'tA2')", 'ok', f"{P(A,'kb,notes')}::int = 0")

S2 = len(S)

# ---- okuma ve özel hesaplar (doğrudan SQL)
extra = f"""
  -- okuma kuralları: anon özel kayıtları görmez, sahibi kendi özel kaydını görür
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'anon', true);
  select count(*) into n1 from public.docs where col = 'private';
  select count(*) into n2 from public.docs where col = 'users';
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', json_build_object('sub', '$A', 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select count(*) into n3 from public.docs where col = 'private';
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', json_build_object('sub', '$B', 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select count(*) into n4 from public.docs where col = 'private' and id = '$A';
  perform set_config('role', 'postgres', true);
  res := res || jsonb_build_array(jsonb_build_object('t', 'okuma: anon özel kayıt görmez, profilleri görür', 'ok', n1 = 0 and n2 = 3, 'got', n1 || '/' || n2));
  res := res || jsonb_build_array(jsonb_build_object('t', 'okuma: sahibi kendi özel kaydını görür, başkası göremez', 'ok', n3 = 1 and n4 = 0, 'got', n3 || '/' || n4));
  perform set_config('request.jwt.claims', json_build_object('sub', '$C', 'role', 'authenticated')::text, true);
  res := res || jsonb_build_array(jsonb_build_object('t', 'my_info yöneticiyi tanır', 'ok', (public.my_info()->>'admin')::boolean));
  perform set_config('request.jwt.claims', json_build_object('sub', '$A', 'role', 'authenticated')::text, true);
  res := res || jsonb_build_array(jsonb_build_object('t', 'my_info öğrenciye kendi gizlisini verir, yönetici saymaz', 'ok',
    not (public.my_info()->>'admin')::boolean and public.my_info()->>'sec' = (select secret from yw_private.secrets where uid = '$A')));
  perform set_config('request.jwt.claims', '', true);

  -- istemcideki HMAC ile aynı anahtar (bilinen gizliyle)
  insert into yw_private.secrets (uid, secret) values ('{D}', '{DSEC}');
  res := res || jsonb_build_array(jsonb_build_object('t', 'anahtar istemciyle aynı', 'ok', yw_private.key_for('{D}', 'notes', 'x1') = '__JSKEY__', 'got', yw_private.key_for('{D}', 'notes', 'x1')));

  -- özel hesaplar: panelden onaylı açılan yönetici
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  values ('0000000e-0000-4000-8000-00000000000e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'Yonetici@yediwiki.com', 'x', now(), now(), now(), '{{}}', '{{}}');
  res := res || jsonb_build_array(jsonb_build_object('t', 'yönetici hesabı açılınca yetki ve profil kurulur', 'ok',
    exists (select 1 from yw_private.admins where uid = '0000000e-0000-4000-8000-00000000000e')
    and (select data->>'role' = 'admin' and data->>'username' = 'yonetici' and (data->>'gift')::int = 100000 from public.docs where col = 'users' and id = '0000000e-0000-4000-8000-00000000000e')));
  -- deneme hesabı önce onaysız açılır (kodla kayıt gibi), onaylanınca kurulur
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  values ('0000000f-0000-4000-8000-00000000000f', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'deneme123@std.yeditepe.edu.tr', 'x', now(), now(), '{{}}', '{{}}');
  n1 := (select count(*) from public.docs where col = 'users' and id = '0000000f-0000-4000-8000-00000000000f');
  update auth.users set email_confirmed_at = now() where id = '0000000f-0000-4000-8000-00000000000f';
  res := res || jsonb_build_array(jsonb_build_object('t', 'deneme hesabı onaylanınca kurulur (ad özel kayıtta, hediye 10000)', 'ok',
    n1 = 0 and not exists (select 1 from yw_private.admins where uid = '0000000f-0000-4000-8000-00000000000f')
    and (select data->>'username' = 'deneme123' and data->>'first' = '' and (data->>'gift')::int = 10000 and data->'shared' = 'true'::jsonb and (data->'kb'->>'all')::int = 50
         from public.docs where col = 'users' and id = '0000000f-0000-4000-8000-00000000000f')
    and (select data->>'first' = 'Deneme' from public.docs where col = 'private' and id = '0000000f-0000-4000-8000-00000000000f')));
  -- okul dışı adresle kayıt olunamaz
  begin
    insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    values ('00000010-0000-4000-8000-000000000010', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'biri@gmail.com', now(), now(), '{{}}', '{{}}');
    got := 'ok';
  exception when others then got := 'fail';
  end;
  res := res || jsonb_build_array(jsonb_build_object('t', 'okul dışı adresle kayıt olunamaz', 'ok', got = 'fail'));
  -- SQL düzenleyicisi (postgres) özel hesabın şifresini değiştirebilir
  begin
    update auth.users set encrypted_password = 'y' where id = '0000000f-0000-4000-8000-00000000000f';
    got := 'ok';
  exception when others then got := 'fail: ' || sqlerrm;
  end;
  res := res || jsonb_build_array(jsonb_build_object('t', 'yönetim SQL ile özel hesabın şifresini değiştirebilir', 'ok', got = 'ok', 'got', got));
"""

def js_key():
    import hmac, hashlib
    return 'k' + hmac.new(DSEC.encode(), b'notes/x1', hashlib.sha256).hexdigest()[:24]

def q(t):
    return "'" + str(t).replace("'", "''") + "'"

HELPERS = f"""
create function pg_temp.mac(s text) returns text language sql as $f$
  select replace(replace(replace(s, '$A', '{A}'), '$B', '{B}'), '$C', '{C}')
$f$;
create function pg_temp.k(u text, c text, i text) returns text language sql as $f$ select yw_private.key_for(pg_temp.mac(u)::uuid, c, i) $f$;
create function pg_temp.f(c text, i text, p text) returns text language sql as $f$ select data #>> p::text[] from public.docs where col = c and id = pg_temp.mac(i) $f$;
create function pg_temp.ct(u text) returns text language sql as $f$ select ctid::text from public.docs where col = 'users' and id = pg_temp.mac(u) $f$;
create function pg_temp.step(n int, t text, who text, q text, want text, chk text, pre text) returns jsonb language plpgsql as $f$
declare got text; pv text; ok boolean;
begin
  if pre is not null then execute 'select (' || pg_temp.mac(pre) || ')::text' into pv; end if;
  perform set_config('request.jwt.claims', case when who is null then '' else json_build_object('sub', pg_temp.mac(who), 'role', 'authenticated')::text end, true);
  begin
    execute 'select (' || pg_temp.mac(q) || ')';
    got := 'ok';
  exception when others then got := 'fail: ' || sqlerrm;
  end;
  perform set_config('request.jwt.claims', '', true);
  execute 'select coalesce((' || replace(pg_temp.mac(chk), '$pre', coalesce(quote_literal(pv), 'null')) || '), false)' into ok;
  return jsonb_build_object('n', n, 't', t, 'ok', (case when want = 'ok' then got = 'ok' else got like 'fail%' end) and ok, 'got', got);
end $f$;
"""

def build(js_key_value):
    out = [HELPERS, "do $test$",
           "declare res jsonb := '[]'::jsonb; got text; n1 int; n2 int; n3 int; n4 int;",
           "begin",
           f"  insert into yw_private.admins (uid) values ('{C}');"]
    for i, (t, who, sql, exp, chkx, prex) in enumerate(S, 1):
        chkx = chkx.replace("= pre", "= $pre")
        out.append(f"  res := res || pg_temp.step({i}, {q(t)}, {q(m(who)) if who else 'null'}, {q(sql)}, '{exp}', {q(chkx)}, {q(prex) if prex else 'null'});")
    out.append(extra.replace('__JSKEY__', js_key_value).replace('$A', A).replace('$B', B).replace('$C', C))
    out += ["  raise exception 'SONUC:%', res::text;", "end", "$test$;"]
    return '\n'.join(out) + '\n'

if __name__ == '__main__':
    here = os.path.dirname(os.path.abspath(__file__))
    sql = build(js_key())
    open(os.path.join(here, 'kurallar_testi.sql'), 'w', encoding='utf-8').write(sql)
    print(len(S), 'adım +', extra.count("jsonb_build_object('t'"), 'ek denetim ->', os.path.join(here, 'kurallar_testi.sql'))
