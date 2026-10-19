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
E = '00000012-0000-4000-8000-000000000012'   # kubbe seviyesi ve gece sayımı
F = '00000013-0000-4000-8000-000000000013'   # ihtar ve dondurma
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
step('A karakterinin vücudunu ve kıyafetini seçer', A, f"select public.doc_update('users', '$A', {j({'govde':'k','kiyafet':'mont'})})",
     'ok', f"{U(A,'govde')} = 'k' and {U(A,'kiyafet')} = 'mont'")
step('Listede olmayan vücut ya da kıyafet reddedilir', A, f"select public.doc_update('users', '$A', {j({'govde':'x','kiyafet':'frak'})})",
     'fail', f"{U(A,'govde')} = 'k' and {U(A,'kiyafet')} = 'mont'")
step('A saç modelini ve rengini seçer', A, f"select public.doc_update('users', '$A', {j({'sac':'kivircik','sacr':'kizil'})})",
     'ok', f"{U(A,'sac')} = 'kivircik' and {U(A,'sacr')} = 'kizil'")
step('Listede olmayan saç modeli reddedilir', A, f"select public.doc_update('users', '$A', {j({'sac':'mohikan'})})", 'fail', f"{U(A,'sac')} = 'kivircik'")
step('Listede olmayan saç rengi reddedilir', A, f"select public.doc_update('users', '$A', {j({'sacr':'mor'})})", 'fail', f"{U(A,'sacr')} = 'kizil'")
step('Kadın karakterde ücretsiz sarı saç düşer (sarısı markette)', A, f"select public.doc_update('users', '$A', {j({'sacr':'sari'})})", 'ok', f"{U(A,'sacr')} is null")
step('Erkek karakterde sarı saç kalır', A, f"select public.doc_update('users', '$A', {j({'govde':'e','sacr':'sari'})})", 'ok', f"{U(A,'sacr')} = 'sari' and {U(A,'govde')} = 'e'")
step('Kadına dönünce sarı düşer', A, f"select public.doc_update('users', '$A', {j({'govde':'k'})})", 'ok', f"{U(A,'sacr')} is null and {U(A,'sac')} = 'kivircik'")
step('Yeditepe Sarısı alınmadan seçilemez; alınmamış ürün takılamaz', A, f"select public.doc_update('users', '$A', {j({'sacr':'ysari','giy':{'ust':'parlak-mont','taki':'kartal-kanatlari'}})})",
     'ok', f"{U(A,'sacr')} is null and {U(A,'giy')} = '{{}}'")

# ---- notlar
step('A adıyla not paylaşır; yazar, zaman ve oylar sunucudan', A,
     f"select public.doc_set('notes', 'tA1', {j({'cid':'CSE211','title':'Veri yapıları','drive':DRIVE,'by':B,'at':1,'likes':{'x':True},'downs':{'y':True},'anon':False,'photos':['p1']})})",
     'ok', f"{DOC('notes','tA1','by')} = '$A' and {DOC('notes','tA1','at')}::bigint > 1000000000000 and {DOC('notes','tA1','likes')} = '{{}}' and {DOC('notes','tA1','downs')} = '{{}}' "
           f"and {DOC('notes','tA1','photos')} = '[]' and {U(A,'kb,all')}::int = 55 and {P(A,'kb,all')}::int = 55")
step('Drive bağlantısı olmayan not reddedilir', A, f"select public.doc_set('notes', 'tAx', {j({'cid':'CSE211','title':'Linksiz','anon':False})})", 'fail')
step('Drive dışı bağlantı reddedilir', A, f"select public.doc_set('notes', 'tAy', {j({'cid':'CSE211','title':'Başka site','drive':'https://example.com/a','anon':False})})", 'fail')
step('A anonim not paylaşır: yazar boş, açık profil hiç değişmez', A,
     f"select public.doc_set('notes', 'tA2', {j({'cid':'MATH131','title':'Kalkülüs','drive':DRIVE,'anon':True,'by':A})})",
     'ok', f"{DOC('notes','tA2','by')} = '' and {DOC('notes','tA2','byk')} = {K(A,'notes','tA2')} "
           f"and {U(A,'kb,all')}::int = 55 and {U(A,'kb,notes')}::int = 1 and {P(A,'kb,all')}::int = 60 and {P(A,'kb,notes')}::int = 2 "
           f"and {CTID(A)} = pre", pre=CTID(A))
step('B nota kendi anahtarıyla ▲ verir; A açık kubbede +10', B,
     f"select public.doc_update('notes', 'tA1', jsonb_build_object('likes', jsonb_build_object({K(B,'notes','tA1')}, true)))",
     'ok', f"{U(A,'kb,all')}::int = 65 and {U(A,'kb,ups')}::int = 1 and {U(A,'kb,likes')}::int = 0 and {U(A,'kb,pi')}::int = 10 and {U(A,'kb,lv')}::int = 1")
step('Anonim nota gelen ▲ açık profilde iz bırakmaz', B,
     f"select public.doc_update('notes', 'tA2', jsonb_build_object('likes', jsonb_build_object({K(B,'notes','tA2')}, true)))",
     'ok', f"{U(A,'kb,all')}::int = 65 and {P(A,'kb,all')}::int = 80 and {P(A,'kb,ups')}::int = 2 and {CTID(A)} = pre", pre=CTID(A))
step('B ▼ verir: ▲ kalkar, A kubbesi geri düşer', B,
     f"select public.doc_update('notes', 'tA1', jsonb_build_object('downs', jsonb_build_object({K(B,'notes','tA1')}, true)))",
     'ok', f"(select data->'downs'->{K(B,'notes','tA1')} = 'true'::jsonb and data->'likes'->{K(B,'notes','tA1')} = 'null'::jsonb from public.docs where col = 'notes' and id = 'tA1') "
           f"and {U(A,'kb,all')}::int = 55 and {U(A,'kb,ups')}::int = 0")
step('B yeniden ▲ verir: ▼ kalkar', B,
     f"select public.doc_update('notes', 'tA1', jsonb_build_object('likes', jsonb_build_object({K(B,'notes','tA1')}, true)))",
     'ok', f"(select data->'likes'->{K(B,'notes','tA1')} = 'true'::jsonb and data->'downs'->{K(B,'notes','tA1')} = 'null'::jsonb from public.docs where col = 'notes' and id = 'tA1') "
           f"and {U(A,'kb,all')}::int = 65")
step('İkisi birden gelirse ▲ kalır', B,
     f"select public.doc_update('notes', 'tA1', jsonb_build_object('likes', jsonb_build_object({K(B,'notes','tA1')}, true), 'downs', jsonb_build_object({K(B,'notes','tA1')}, true)))",
     'ok', f"(select data->'likes'->{K(B,'notes','tA1')} = 'true'::jsonb and data->'downs'->{K(B,'notes','tA1')} = 'null'::jsonb from public.docs where col = 'notes' and id = 'tA1')")
step('B gerçek kimliğiyle ▼ veremez', B, f"select public.doc_update('notes', 'tA1', '{{\"downs\":{{\"$B\":true}}}}'::jsonb)", 'fail')
step('B başka belgenin anahtarıyla ▼ veremez', B,
     f"select public.doc_update('notes', 'tA1', jsonb_build_object('downs', jsonb_build_object({K(B,'notes','tA2')}, true)))", 'fail')
step('▼ yalnızca evet ya da boş olur', B,
     f"select public.doc_update('notes', 'tA1', jsonb_build_object('downs', jsonb_build_object({K(B,'notes','tA1')}, 5)))", 'fail')
step('A kendi notuna ▼ veremez', A,
     f"select public.doc_update('notes', 'tA1', jsonb_build_object('downs', jsonb_build_object({K(A,'notes','tA1')}, true)))", 'fail')
step('B gerçek kimliğiyle beğenemez', B, f"select public.doc_update('notes', 'tA1', '{{\"likes\":{{\"$B\":true}}}}'::jsonb)", 'fail')
step('B başka belgenin anahtarıyla beğenemez', B,
     f"select public.doc_update('notes', 'tA1', jsonb_build_object('likes', jsonb_build_object({K(B,'notes','tA2')}, true)))", 'fail')
step('B başkasının notunu değiştiremez', B, f"select public.doc_update('notes', 'tA1', '{{\"title\":\"hack\"}}'::jsonb)", 'fail')
step('A kendi notunu beğenemez', A,
     f"select public.doc_update('notes', 'tA1', jsonb_build_object('likes', jsonb_build_object({K(A,'notes','tA1')}, true)))", 'fail')
step('B notu bildirir; zamanı sunucu koyar', B,
     f"select public.doc_update('notes', 'tA1', jsonb_build_object('reports', jsonb_build_object({K(B,'notes','tA1')}, 1)))",
     'ok', f"(select (data->'reports'->>{K(B,'notes','tA1')})::bigint from public.docs where col = 'notes' and id = 'tA1') > 1000000000000")
step('A kendi notunun başlığını düzeltir (uzun başlık 80 harfe kısalır), oylar yerinde', A,
     f"select public.doc_update('notes', 'tA1', {j({'title':'x'*120})})", 'ok',
     f"length({DOC('notes','tA1','title')}) = 80 and (select data->'likes'->{K(B,'notes','tA1')} = 'true'::jsonb from public.docs where col = 'notes' and id = 'tA1')")
step('A notu baştan yazar: oyları silemez', A,
     f"select public.doc_set('notes', 'tA1', {j({'cid':'CSE211','title':'Veri yapıları','drive':DRIVE,'likes':{},'downs':{'z':True},'anon':False})})", 'ok',
     f"(select data->'likes'->{K(B,'notes','tA1')} = 'true'::jsonb and not (data->'downs' ? 'z') from public.docs where col = 'notes' and id = 'tA1') and {U(A,'kb,all')}::int = 65")
step('Not sahibi ▼ alanını düzenleyemez', A,
     f"select public.doc_update('notes', 'tA1', jsonb_build_object('title', 'yeni', 'downs', jsonb_build_object({K(A,'notes','tA1')}, null)))", 'fail')

# ---- HocaÖlçer
step('B kadrodaki hocaya ilk puanı verir: puan gizli, açık profil değişmez, hocanın sahibi tutulmaz', B,
     f"select public.doc_set('hocas', '{H}', jsonb_build_object('ratings', jsonb_build_object({K(B,'hocas',H)}, '{{\"a\":4,\"o\":3.5,\"n\":5,\"d\":4,\"c\":\"CSE211\",\"tk\":20261,\"x\":\"fazla\"}}'::jsonb)))",
     'ok', f"(select data->'ratings' ? {K(B,'hocas',H)} and not (data ? 'name') and data->'ratings'->{K(B,'hocas',H)}->'x' is null from public.docs where col = 'hocas' and id = '{H}') "
           f"and {U(B,'kb,ratings')}::int = 0 and {U(B,'kb,all')}::int = 50 and {P(B,'kb,ratings')}::int = 1 and {P(B,'kb,all')}::int = 55 "
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
     'ok', f"{DOC('requests','tR1','doneBy')} = '$A' and {U(A,'kb,fills')}::int = 1 and {U(A,'kb,all')}::int = 75")
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
step('Market ürünleri türleriyle; kalkan ürünler yok, bilet elde, futbol topu ayakta', A, "select 1",
     'ok', "(select count(*) from yw_private.market where slot in ('ust','alt','elbise','ayakkabi','el','ayak','taki','yoldas','sac','bas')) = 30 and (select slot from yw_private.market where id = 'futbol-forma') = 'ust' "
           "and (select slot from yw_private.market where id = 'eagles-sapka') = 'bas' and (select slot from yw_private.market where id = 'kurklu-bot') = 'ayakkabi' "
           "and (select slot from yw_private.market where id = 'voleybol-forma') = 'elbise' "
           "and (select slot from yw_private.market where id = 'altin-ring') = 'el' and (select slot from yw_private.market where id = 'futbol-topu') = 'ayak' "
           "and (select slot from yw_private.market where id = 'kampus-mafya') = 'yoldas' and not exists (select 1 from yw_private.market where id in ('son-sosisli','selcuklu-kapi','gunes-aurasi','nevada-kahve','ikinci-ev'))")
step('Sahip olunan ürün karaktere takılır; türü tutmayan, olmayan ve boş yuva düşer', A,
     f"select public.doc_update('users', '$A', {j({'giy':{'taki':'kartal-kanatlari','el':'kartal-kanatlari','ust':'parlak-mont','alt':None,'uydurma':'kartal-kanatlari'}})})",
     'ok', f"{U(A,'giy')} = '{{\"taki\": \"kartal-kanatlari\"}}'")
step('Yönetici hediye kubbeyi artırır', C, f"select public.doc_update('users', '$A', '{{\"gift\":6000}}'::jsonb)", 'ok', f"{U(A,'gift')}::int = 6000")
step('A forma alır', A, "select public.buy_item('futbol-forma')", 'ok', f"{U(A,'spent')}::int = 1950")
step('A saç boyası alır', A, "select public.buy_item('yeditepe-sarisi')", 'ok', f"{U(A,'spent')}::int = 2550")
step('A elbise alır', A, "select public.buy_item('bahar-elbisesi')", 'ok', f"{U(A,'spent')}::int = 3030")
step('Elbise varken üst ve alt düşer; Yeditepe Sarısı alındıysa kalır', A,
     f"select public.doc_update('users', '$A', {j({'sacr':'ysari','giy':{'ust':'futbol-forma','elbise':'bahar-elbisesi'}})})",
     'ok', f"{U(A,'sacr')} = 'ysari' and {U(A,'giy,elbise')} = 'bahar-elbisesi' and {U(A,'giy,ust')} is null and {U(A,'giy,taki')} = 'kartal-kanatlari'")
step('Temel alt etek olur', A, f"select public.doc_update('users', '$A', {j({'altk':'etek'})})", 'ok', f"{U(A,'altk')} = 'etek'")
step('Listede olmayan temel alt reddedilir', A, f"select public.doc_update('users', '$A', {j({'altk':'sort'})})", 'fail', f"{U(A,'altk')} = 'etek'")
step('A futbol topu alır', A, "select public.buy_item('futbol-topu')", 'ok', f"{U(A,'spent')}::int = 3250")
step('Futbol topu ayağa takılır, ele takılamaz', A,
     f"select public.doc_update('users', '$A', {j({'giy':{'ayak':'futbol-topu','el':'futbol-topu'}})})",
     'ok', f"{U(A,'giy,ayak')} = 'futbol-topu' and {U(A,'giy,el')} is null and {U(A,'giy,elbise')} = 'bahar-elbisesi' and {U(A,'giy,taki')} = 'kartal-kanatlari'")
step('A şapka alır', A, "select public.buy_item('eagles-sapka')", 'ok', f"{U(A,'spent')}::int = 3550")
step('Şapka başa takılır, ayakkabı yuvasına takılamaz', A,
     f"select public.doc_update('users', '$A', {j({'giy':{'bas':'eagles-sapka','ayakkabi':'eagles-sapka'}})})",
     'ok', f"{U(A,'giy,bas')} = 'eagles-sapka' and {U(A,'giy,ayakkabi')} is null and {U(A,'giy,ayak')} = 'futbol-topu'")
step('Sahip olunmayan ürün profil resmi olamaz', A, f"select public.doc_update('users', '$A', '{{\"avk\":\"urun\",\"urun\":\"gece-eskortu\"}}'::jsonb)",
     'ok', f"{U(A,'avk')} = 'emoji'")
step('Sahip olunan ürün profil resmi olur', A, f"select public.doc_update('users', '$A', '{{\"avk\":\"urun\",\"urun\":\"kartal-kanatlari\"}}'::jsonb)",
     'ok', f"{U(A,'avk')} = 'urun'")

# ---- yorumlar
step('B nota adıyla yorum yazar: B +2, notun sahibi A +5', B, f"select public.doc_set('comments', 'tC1', {j({'tt':'note','tid':'tA1','text':'teşekkürler','anon':False,'downs':{'q':True}})})",
     'ok', f"{DOC('comments','tC1','by')} = '$B' and {U(B,'kb,comments')}::int = 1 and {DOC('comments','tC1','downs')} is null "
           f"and {U(B,'kb,all')}::int = 52 and {U(A,'kb,ncm')}::int = 1 and {U(A,'kb,all')}::int = 80")
step('A kendi notuna yorum yazar: kendi yorumu notuna kubbe getirmez', A, f"select public.doc_set('comments', 'tC0', {j({'tt':'note','tid':'tA1','text':'rica ederim','anon':False})})",
     'ok', f"{U(A,'kb,ncm')}::int = 1 and {U(A,'kb,comments')}::int = 1 and {U(A,'kb,all')}::int = 82")
step('B aynı nota ikinci yorumu yazar: kişi başına bir kez sayılır', B, f"select public.doc_set('comments', 'tC9', {j({'tt':'note','tid':'tA1','text':'bir daha','anon':False})})",
     'ok', f"{U(A,'kb,ncm')}::int = 1 and {U(A,'kb,all')}::int = 82 and {U(B,'kb,comments')}::int = 2")
step('A yorumu beğenir: B +2 kubbe, beğeni sayısı yorumlardan', A,
     f"select public.doc_update('comments', 'tC1', jsonb_build_object('likes', jsonb_build_object({K(A,'comments','tC1')}, true)))",
     'ok', f"{U(B,'kb,likes')}::int = 1 and {U(B,'kb,ups')}::int = 0 and {U(B,'kb,all')}::int = 56")
step('Yorumda ▼ yok', A,
     f"select public.doc_update('comments', 'tC1', jsonb_build_object('downs', jsonb_build_object({K(A,'comments','tC1')}, true)))", 'fail')
step('B anonim yorum yazar: yazar boş, açık profil değişmez', B,
     f"select public.doc_set('comments', 'tC3', {j({'tt':'note','tid':'tA1','text':'gizli','anon':True})})",
     'ok', f"{DOC('comments','tC3','by')} = '' and {DOC('comments','tC3','byk')} = {K(B,'comments','tC3')} and {U(B,'kb,comments')}::int = 2 "
           f"and {P(B,'kb,comments')}::int = 3 and {CTID(B)} = pre", pre=CTID(B))
step('Boş yorum reddedilir', B, f"select public.doc_set('comments', 'tC4', {j({'tt':'note','tid':'tA1','text':'   '})})", 'fail')
step('Yeri belli olmayan yorum reddedilir', B, f"select public.doc_set('comments', 'tC5', {j({'tt':'xx','tid':'tA1','text':'a'})})", 'fail')
step('B başkasının notunu silemez', B, "select public.doc_delete('notes', 'tA1')", 'fail')
step('B ikinci yorumunu siler', B, "select public.doc_delete('comments', 'tC9')", 'ok', f"{U(A,'kb,ncm')}::int = 1")
step('Not sahibi altındaki yorumu silebilir; adıyla yorumu kalmayan B açık kayıtta sayılmaz, anonim yorumu bakiyede sayılır', A, "select public.doc_delete('comments', 'tC1')",
     'ok', f"not exists (select 1 from public.docs where col = 'comments' and id = 'tC1') and {U(A,'kb,ncm')}::int = 0 and {P(A,'kb,ncm')}::int = 1")
step('B yeni yorum yazar', B, f"select public.doc_set('comments', 'tC2', {j({'tt':'note','tid':'tA1','text':'ikinci','anon':False})})", 'ok')
step('A notunu silince yorumları ve karşılama kubbesi de gider', A, "select public.doc_delete('notes', 'tA1')",
     'ok', f"not exists (select 1 from public.docs where (col = 'notes' and id = 'tA1') or (col = 'comments' and id in ('tC2', 'tC3'))) "
           f"and {U(B,'kb,comments')}::int = 0 and {P(B,'kb,comments')}::int = 0 and {U(A,'kb,fills')}::int = 0")

# ---- yorum sınırı: bir kişi bir derse ya da hocaya en çok 3 yorum (anonim de sayılır); not yorumunda sınır yok
for i, an in enumerate([False, True, False]):
    step(f'B derse {i + 1}. yorumunu yazar', B, f"select public.doc_set('comments', 'tL{i}', {j({'tt':'course','tid':'CSE211','text':'yorum','anon':an})})", 'ok')
step('B aynı derse 4. yorumu yazamaz (anonim de olsa)', B, f"select public.doc_set('comments', 'tL3', {j({'tt':'course','tid':'CSE211','text':'dördüncü','anon':True})})",
     'fail', "not exists (select 1 from public.docs where col = 'comments' and id = 'tL3')")
step('Sınır kişi başı: A aynı derse yazar', A, f"select public.doc_set('comments', 'tL4', {j({'tt':'course','tid':'CSE211','text':'benim','anon':False})})", 'ok')
step('B başka derse yazar', B, f"select public.doc_set('comments', 'tL5', {j({'tt':'course','tid':'MATH131','text':'başka','anon':False})})", 'ok')
step('Yorumun yeri sonradan değişmez', B, f"select public.doc_update('comments', 'tL5', {j({'tid':'CSE211'})})",
     'fail', f"{DOC('comments','tL5','tid')} = 'MATH131'")
step('Yorum yeniden yazılırken de yeri değişmez', B, f"select public.doc_set('comments', 'tL5', {j({'tt':'course','tid':'CSE211','text':'taşı'})})",
     'fail', f"{DOC('comments','tL5','tid')} = 'MATH131'")
step('Sınırdayken yorumun yazısı düzeltilir', B, f"select public.doc_update('comments', 'tL0', {j({'text':'düzeltildi'})})", 'ok', f"{DOC('comments','tL0','text')} = 'düzeltildi'")
step('Sınırdaki yorum beğenilir', A, f"select public.doc_update('comments', 'tL0', jsonb_build_object('likes', jsonb_build_object({K(A,'comments','tL0')}, true)))", 'ok')
step('Bir yorumunu silen yerine yenisini yazabilir', B, "select public.doc_delete('comments', 'tL1')", 'ok')
step('Silinen yorumun yerine yeni yorum', B, f"select public.doc_set('comments', 'tL6', {j({'tt':'course','tid':'CSE211','text':'yeni','anon':True})})", 'ok')
for i in range(3):
    step(f'B hocaya {i + 1}. yorumunu yazar', B, f"select public.doc_set('comments', 'tH{i}', {j({'tt':'hoca','tid':H,'text':'hoca yorumu','anon':True})})", 'ok')
step('B aynı hocaya 4. yorumu yazamaz', B, f"select public.doc_set('comments', 'tH3', {j({'tt':'hoca','tid':H,'text':'fazla'})})",
     'fail', "not exists (select 1 from public.docs where col = 'comments' and id = 'tH3')")
for i in range(4):
    step(f'Not yorumunda sınır yok ({i + 1})', B, f"select public.doc_set('comments', 'tN{i}', {j({'tt':'note','tid':'tA2','text':'not yorumu'})})", 'ok')
step('Deneme yorumları silinir, kubbe yeniden sayılır', C,
     "select count(public.doc_delete('comments', x) is null) from unnest(array['tL0','tL2','tL4','tL5','tL6','tH0','tH1','tH2','tN0','tN1','tN2','tN3']) x",
     'ok', f"not exists (select 1 from public.docs where col = 'comments' and (id like 'tL%' or id like 'tH%' or id like 'tN%')) "
           f"and {U(B,'kb,comments')}::int = 0 and {P(B,'kb,comments')}::int = 0 and {U(B,'kb,likes')}::int = 0")

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

# ---- not kilidi (0012): bağlantı ve açıklama files kaydında, notta yalnızca bağlantının türü
DOCX = 'https://docs.google.com/document/d/xyz/edit'
step('Not paylaşılınca bağlantı ve açıklama files kaydına gider, notta türü kalır', A,
     f"select public.doc_set('notes', 'tF1', {j({'cid':'CSE211','title':'Kilitli not','desc':'Vize özeti','drive':DRIVE,'anon':False})})", 'ok',
     f"{DOC('notes','tF1','drive')} is null and {DOC('notes','tF1','desc')} is null and {DOC('notes','tF1','dk')} = 'file' "
     f"and {DOC('files','tF1','drive')} = '{DRIVE}' and {DOC('files','tF1','desc')} = 'Vize özeti'")
step('Başlık düzeltilir: bağlantı istenmez, files değişmez', A,
     f"select public.doc_update('notes', 'tF1', {j({'title':'Kilitli not 2'})})", 'ok',
     f"{DOC('notes','tF1','title')} = 'Kilitli not 2' and {DOC('notes','tF1','dk')} = 'file' and {DOC('files','tF1','drive')} = '{DRIVE}' and {DOC('files','tF1','desc')} = 'Vize özeti'")
step('Bağlantı ve açıklama değişir: files ve tür güncellenir', A,
     f"select public.doc_update('notes', 'tF1', {j({'drive':DOCX,'desc':''})})", 'ok',
     f"{DOC('files','tF1','drive')} = '{DOCX}' and {DOC('files','tF1','desc')} = '' and {DOC('notes','tF1','dk')} = 'doc' and {DOC('notes','tF1','drive')} is null")
step('Düzeltmede Drive dışı bağlantı reddedilir', A, f"select public.doc_update('notes', 'tF1', {j({'drive':'https://example.com/x'})})", 'fail',
     f"{DOC('files','tF1','drive')} = '{DOCX}'")
step('B nota oy verir: files değişmez', B,
     f"select public.doc_update('notes', 'tF1', jsonb_build_object('likes', jsonb_build_object({K(B,'notes','tF1')}, true)))", 'ok',
     f"{DOC('files','tF1','drive')} = '{DOCX}'")
step('files kaydına doğrudan yazılamaz', B, f"select public.doc_set('files', 'tF1', {j({'drive':DRIVE})})", 'fail', f"{DOC('files','tF1','drive')} = '{DOCX}'")
step('files kaydı düzeltilemez', B, f"select public.doc_update('files', 'tF1', {j({'drive':DRIVE})})", 'fail', f"{DOC('files','tF1','drive')} = '{DOCX}'")
step('files kaydı silinemez', B, "select public.doc_delete('files', 'tF1')", 'fail', f"{DOC('files','tF1','drive')} = '{DOCX}'")
step('Not silinince files kaydı da silinir', A, "select public.doc_delete('notes', 'tF1')", 'ok', "not exists (select 1 from public.docs where id = 'tF1')")
step('Okuma denetimi için bir not kalır', A, f"select public.doc_set('notes', 'tF2', {j({'cid':'CSE211','title':'Açık başlık','desc':'gizli açıklama','drive':DRIVE,'anon':False})})", 'ok',
     f"{DOC('files','tF2','drive')} = '{DRIVE}'")

# ---- kubbe düzeni (0013): seviye, gece sayımı, HocaÖlçer sınırı
step('E hesap açar', E, f"select public.doc_set('users', '{E}', {j({'username':'teste','first':'E','last':'E','showName':True})})", 'ok')
step('E adıyla not paylaşır: +5', E, f"select public.doc_set('notes', 'tE1', {j({'cid':'CSE211','title':'Seviye notu','drive':DRIVE,'anon':False})})",
     'ok', f"{U(E,'kb,all')}::int = 55 and {U(E,'kb,lv')}::int = 1")
step('Notuna 10 ▲: seviye 2, ▲ kubbesi ×1,25', None, "select pg_temp.fake_likes('tE1', 10)",
     'ok', f"{U(E,'kb,lv')}::int = 2 and {U(E,'kb,pi')}::int = 125 and {U(E,'kb,all')}::int = 180 and {P(E,'kb,all')}::int = 180")
step('E anonim not paylaşır: açık kayıt değişmez', E, f"select public.doc_set('notes', 'tE2', {j({'cid':'CSE211','title':'Gizli not','drive':DRIVE,'anon':True})})",
     'ok', f"{U(E,'kb,all')}::int = 180 and {P(E,'kb,all')}::int = 185 and {CTID(E)} = pre", pre=CTID(E))
step('Anonim notuna 20 ▲: açık kayıt değişmez; bakiyede seviye 3, ×1,5', None, "select pg_temp.fake_likes('tE2', 20)",
     'ok', f"{U(E,'kb,all')}::int = 180 and {P(E,'kb,lv')}::int = 3 and {P(E,'kb,pi')}::int = 450 and {P(E,'kb,all')}::int = 510 and {CTID(E)} = pre", pre=CTID(E))
step('Gece sayımı: anonim pay açık toplama eklenir, sayaçlar yalnızca adıyla yapılanlar', None, "select yw_private.kb_gece_say()",
     'ok', f"{U(E,'kb,all')}::int = 510 and {U(E,'kb,term')}::int = 510 and {U(E,'kb,notes')}::int = 1 and {U(E,'kb,ups')}::int = 10 and {U(E,'kb,lv')}::int = 2")
step('Gün içinde adıyla ▲: açık toplam anında artar, gece payı yerinde', None, "select pg_temp.fake_likes('tE1', 11)",
     'ok', f"{U(E,'kb,all')}::int = 522 and {P(E,'kb,all')}::int = 525")
step('HocaÖlçer: 31 puanın ilk 30\'u kubbe kazandırır, açık kayıt değişmez', None, f"select pg_temp.fake_ratings('{E}', 31)",
     'ok', f"{P(E,'kb,ratings')}::int = 31 and {P(E,'kb,all')}::int = 675 and {U(E,'kb,all')}::int = 522")

# ---- bildirim nedeni, ihtar ve dondurma (0013)
TOK = f"(select token from yw_private.dondurma where uid = '{F}')"
step('F hesap açar', F, f"select public.doc_set('users', '{F}', {j({'username':'testf','first':'F','last':'F','showName':True})})", 'ok')
for i in (1, 2, 3):
    step(f'F {i}. notunu paylaşır' + (' (anonim)' if i == 3 else ''), F,
         f"select public.doc_set('notes', 'tS{i}', {j({'cid':'CSE211','title':f'Sahte {i}','drive':DRIVE,'anon':i == 3})})", 'ok')
step('A bildirir, nedeni sahte not', A,
     f"select public.doc_update('notes', 'tS1', jsonb_build_object('reports', jsonb_build_object({K(A,'notes','tS1')}, 1), 'rsn', jsonb_build_object({K(A,'notes','tS1')}, 'sahte')))",
     'ok', f"(select data->'rsn'->>{K(A,'notes','tS1')} = 'sahte' from public.docs where col = 'notes' and id = 'tS1')")
step('Listede olmayan neden reddedilir', B,
     f"select public.doc_update('notes', 'tS1', jsonb_build_object('rsn', jsonb_build_object({K(B,'notes','tS1')}, 'kızgınım')))", 'fail')
step('Başkasının anahtarıyla neden yazılamaz', B,
     f"select public.doc_update('notes', 'tS1', jsonb_build_object('rsn', jsonb_build_object({K(A,'notes','tS1')}, 'spam')))", 'fail')
step('Not sahibi düzeltirken bildirim nedenleri yerinde kalır', F, f"select public.doc_update('notes', 'tS1', {j({'title':'Sahte 1 düzeltildi'})})",
     'ok', f"(select data->'rsn'->>{K(A,'notes','tS1')} = 'sahte' from public.docs where col = 'notes' and id = 'tS1')")
step('Not sahibi nedenleri baştan yazarak silemez', F, f"select public.doc_set('notes', 'tS1', {j({'cid':'CSE211','title':'Sahte 1','drive':DRIVE,'anon':False,'rsn':{}})})",
     'ok', f"(select data->'rsn'->>{K(A,'notes','tS1')} = 'sahte' from public.docs where col = 'notes' and id = 'tS1')")
for nid in ('tS1', 'tS2', 'tS3'):
    for who, why in ((A, 'sahte'), (B, 'spam'), (E, 'sahte')):
        if nid == 'tS1' and who == A:
            continue
        step(f'{nid} bildirilir ({why})', who,
             f"select public.doc_update('notes', '{nid}', jsonb_build_object('reports', jsonb_build_object({K(who,'notes',nid)}, 1), 'rsn', jsonb_build_object({K(who,'notes',nid)}, '{why}')))", 'ok')
    if nid == 'tS2':
        step('İki not gizlendi: onay isteği yok; gizli not kubbe kazandırmaz', None, "select 1",
             'ok', f"not exists (select 1 from yw_private.dondurma where uid = '{F}') and {P(F,'kb,notes')}::int = 1 and {U(F,'kb,all')}::int = 50")
step('Üçüncü gizli not (anonim de sayılır): yöneticiye onay isteği', None, "select 1",
     'ok', f"(select count(*) from yw_private.dondurma where uid = '{F}' and status = 'bekliyor' and notes = array['tS1','tS2','tS3']) = 1 "
           f"and {P(F,'kb,notes')}::int = 0 and {P(F,'kb,all')}::int = 50")
step('Onay sayfası belirteçle açılır: kim, hangi notlar, kaç bildirim, nedenleri', None, f"select public.dondurma_bilgi({TOK}) is not null",
     'ok', f"(select x->>'username' = 'testf' and x->>'status' = 'bekliyor' and jsonb_array_length(x->'notes') = 3 and (x->'notes'->0->>'n')::int = 3 "
           f"and (x->'notes'->0->'rsn'->>'sahte')::int = 2 and (x->'notes'->0->'rsn'->>'spam')::int = 1 and (x->'notes'->2->>'anon')::boolean "
           f"from public.dondurma_bilgi({TOK}) x)")
step('Yanlış belirteçle bilgi gelmez', None, "select public.dondurma_bilgi('yok') is null", 'ok', "(select public.dondurma_bilgi('yok')) is null")
step('E-posta içeriği belirteçle yalnızca bir kez okunur', None, f"select public.dondurma_eposta({TOK}) is not null",
     'ok', f"(select public.dondurma_eposta({TOK})) is null and (select mailed_at is not null from yw_private.dondurma where uid = '{F}')")
step('Öğrenci onay listesini göremez', A, "select public.dondurma_liste()", 'fail')
step('Yönetici bekleyen isteği görür', C, "select 1 / (case when public.dondurma_liste()->'bekleyen'->0->>'username' = 'testf' then 1 else 0 end)", 'ok')
step('Bekleyen istek varken F yine yazabilir', F, f"select public.doc_update('users', '{F}', {j({'kiyafet':'mont'})})", 'ok', f"{U(F,'kiyafet')} = 'mont'")
step('Yanlış belirteçle karar verilemez', None, "select public.dondurma_karar('yok', true)", 'fail')
step('E-postadaki bağlantıyla hesap dondurulur', None, f"select public.dondurma_karar({TOK}, true)",
     'ok', f"exists (select 1 from yw_private.donuk where uid = '{F}') and {U(F,'kb,donuk')}::bigint > 0 and {P(F,'kb,donuk')}::bigint > 0 "
           f"and (select status from yw_private.dondurma where uid = '{F}') = 'donduruldu'")
step('Donuk hesap not paylaşamaz', F, f"select public.doc_set('notes', 'tS5', {j({'cid':'CSE211','title':'Yeni','drive':DRIVE,'anon':False})})", 'fail',
     "not exists (select 1 from public.docs where col = 'notes' and id = 'tS5')")
step('Donuk hesap oy veremez', F, f"select public.doc_update('notes', 'tE1', jsonb_build_object('likes', jsonb_build_object({K(F,'notes','tE1')}, true)))", 'fail')
step('Donuk hesap profilini değiştiremez', F, f"select public.doc_update('users', '{F}', {j({'kiyafet':'tisort'})})", 'fail', f"{U(F,'kiyafet')} = 'mont'")
step('Donuk hesap notunu silemez', F, "select public.doc_delete('notes', 'tS1')", 'fail')
step('Donuk hesap özel kaydına yazabilir', F, f"select public.doc_set('private', '{F}', '{{\"myc\":[\"CSE211\"]}}'::jsonb)", 'ok', f"{P(F,'myc,0')} = 'CSE211'")
step('Başkasının oyu donuk hesabın kubbesini yeniden sayar', A,
     f"select public.doc_update('notes', 'tS2', jsonb_build_object('likes', jsonb_build_object({K(A,'notes','tS2')}, true)))", 'ok', f"{U(F,'kb,donuk')}::bigint > 0")
step('Karar bir kez verilir', None, f"select public.dondurma_karar({TOK}, false)", 'ok', f"(select status from yw_private.dondurma where uid = '{F}') = 'donduruldu'")
step('Öğrenci dondurmayı kaldıramaz', A, f"select public.dondurma_kaldir('{F}')", 'fail')
step('Yönetici dondurmayı kaldırır', C, f"select public.dondurma_kaldir('{F}')",
     'ok', f"not exists (select 1 from yw_private.donuk where uid = '{F}') and {U(F,'kb,donuk')} is null")
step('Açılan hesap yine yazar', F, f"select public.doc_update('users', '{F}', {j({'kiyafet':'tisort'})})", 'ok', f"{U(F,'kiyafet')} = 'tisort'")
step('Sayılmış gizli notlar yeni onay isteği açmaz', None, f"select yw_private.strike_check('{F}')",
     'ok', f"(select count(*) from yw_private.dondurma where uid = '{F}') = 1")

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
  res := res || jsonb_build_array(jsonb_build_object('t', 'okuma: anon özel kayıt görmez, profilleri görür', 'ok', n1 = 0 and n2 = 5, 'got', n1 || '/' || n2));
  res := res || jsonb_build_array(jsonb_build_object('t', 'okuma: sahibi kendi özel kaydını görür, başkası göremez', 'ok', n3 = 1 and n4 = 0, 'got', n3 || '/' || n4));
  -- not kilidi: anon bağlantıları (files) göremez, notlarda bağlantı ve açıklama yok; giriş yapmış görür
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'anon', true);
  select count(*) into n1 from public.docs where col = 'files';
  select count(*) into n2 from public.docs where col = 'notes' and (data ? 'drive' or data ? 'desc');
  select count(*) into n4 from public.docs where col = 'notes';
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', json_build_object('sub', '$B', 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select count(*) into n3 from public.docs where col = 'files';
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
  res := res || jsonb_build_array(jsonb_build_object('t', 'not kilidi: anon notları görür ama bağlantıları ve açıklamaları göremez', 'ok', n1 = 0 and n2 = 0 and n4 > 0, 'got', n1 || '/' || n2 || '/' || n4));
  res := res || jsonb_build_array(jsonb_build_object('t', 'not kilidi: giriş yapmış öğrenci bağlantıları görür', 'ok', n3 > 0, 'got', n3));
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
-- seviye ve HocaÖlçer sınırı için: çok kişinin oyu ve puanı doğrudan yazılır, kubbe yeniden sayılır
create function pg_temp.fake_likes(nid text, n int) returns int language plpgsql as $f$
begin
  update public.docs set data = jsonb_set(data, '{{likes}}', coalesce((select jsonb_object_agg('kfake' || nid || g, true) from generate_series(1, n) g), '{{}}'::jsonb))
   where col = 'notes' and id = nid;
  perform yw_private.recalc(o.uid) from yw_private.doc_owner o where o.col = 'notes' and o.id = nid;
  return n;
end $f$;
create function pg_temp.fake_ratings(u text, n int) returns int language plpgsql as $f$
begin
  for i in 1..n loop
    insert into public.docs (col, id, data)
    values ('hocas', 'th' || i, jsonb_build_object('ratings', jsonb_build_object(yw_private.key_for(pg_temp.mac(u)::uuid, 'hocas', 'th' || i),
            jsonb_build_object('a', 4, 'o', 4, 'n', 4, 'd', 4, 'at', yw_private.now_ms()))))
    on conflict (col, id) do nothing;
  end loop;
  perform yw_private.recalc(pg_temp.mac(u)::uuid);
  return n;
end $f$;
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
