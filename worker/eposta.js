// Hesap dondurma onayı e-postası. Veritabanı (pg_net) Worker'a yalnızca onay isteğinin belirtecini gönderir; Worker ayrıntıyı
// belirteçle Supabase'den bir kez okur (dondurma_eposta) ve buradaki metni yöneticinin adresine yollar (index.js).
// Gönderim Cloudflare Email Routing'in send_email bağlamasıyla: yalnızca Email Routing'de doğrulanmış adrese gider (wrangler.jsonc).

export const ONAY_KIME = 'uygaryigt@gmail.com';
export const ONAY_KIMDEN = 'iletisim@yediwiki.com';

const RSN = { sahte: 'sahte not', spam: 'spam', uygunsuz: 'uygunsuz' };
const kod = cid => String(cid || '').replace(/^([A-Z]+)(\d)/, '$1 $2');

// Konu ve düz metin gövde
export function onayMetni(q, site) {
  const notlar = (q.notes || []).map(n => {
    const neden = Object.keys(n.rsn || {}).filter(k => RSN[k]).map(k => `${n.rsn[k]} ${RSN[k]}`).join(', ');
    return `- ${n.title || 'Not'} (${kod(n.cid)}${n.anon ? ', anonim' : ''}): ${+n.n || 0} bildirim${neden ? `, ${neden}` : ''}`;
  });
  const silinen = (+q.total || 0) - notlar.length;
  if (silinen > 0) notlar.push(`- ${silinen} not silinmiş`);
  return {
    konu: `Hesap dondurma onayı: @${q.username || 'hesap'}`,
    govde: [
      'Merhaba,',
      '',
      `YediWiki'de @${q.username || 'hesap'} adlı hesabın ${+q.total || notlar.length} notu bildirimlerle gizlendi:`,
      ...notlar,
      '',
      'Hesabı dondurmak ya da isteği geri çevirmek için bağlantıyı aç:',
      `${site}/#/onay/${q.token}`,
      '',
      'Bağlantı 30 gün geçerli; bekleyen istekler Moderasyon sayfasında da görünür.',
      'Dondurulan hesap not paylaşamaz, oy veremez, yorum yazamaz ve sıralamada görünmez. Moderasyon sayfasından geri açabilirsin.',
      '',
      'YediWiki'
    ].join('\n')
  };
}

const utf8b64 = s => {
  const b = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
  return btoa(bin);
};

// RFC 5322 ileti: UTF-8 konu (RFC 2047) ve base64 gövde, satırlar CRLF
export function mimeIleti({ kimden, kime, konu, govde, id, tarih = new Date() }) {
  return [
    `From: YediWiki <${kimden}>`,
    `To: <${kime}>`,
    `Subject: =?UTF-8?B?${utf8b64(konu)}?=`,
    `Message-ID: <${id}@yediwiki.com>`,
    `Date: ${tarih.toUTCString().replace('GMT', '+0000')}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    utf8b64(govde.replace(/\r?\n/g, '\r\n')).replace(/.{1,76}/g, '$&\r\n')
  ].join('\r\n');
}
