
(() => {
'use strict';

/* ================= Sabitler ================= */
const GRADES = [
  { g: 'AA', p: 4.0 }, { g: 'BA', p: 3.5 }, { g: 'BB', p: 3.0 }, { g: 'CB', p: 2.5 }, { g: 'CC', p: 2.0 },
  { g: 'DC', p: 1.5 }, { g: 'DD', p: 1.0 }, { g: 'FF', p: 0 }, { g: 'FA', p: 0 }
];
const GRADE_P = Object.fromEntries(GRADES.map(x => [x.g, x.p]));
const CRIT = [
  { k: 'a', name: 'Anlatım', lo: 'anlaşılmıyor', hi: 'çok net' },
  { k: 'o', name: 'Ödev yükü', lo: 'çok ağır', hi: 'çok hafif' },
  { k: 'n', name: 'Not verme', lo: 'çok sıkı', hi: 'çok cömert' },
  { k: 'd', name: 'Devamsızlık', lo: 'çok katı', hi: 'esnek' }
];
const NOTE_TYPES = [{ k: 'not', name: 'Ders notu' }, { k: 'sinav', name: 'Çıkmış sınav' }];
const noteType = n => (n && n.type === 'sinav' ? NOTE_TYPES[1] : NOTE_TYPES[0]);   // eski türler (özet, ödev, lab, diğer) ders notu sayılır
const TITLES = ['Prof. Dr.', 'Doç. Dr.', 'Dr. Öğr. Üyesi', 'Öğr. Gör. Dr.', 'Öğr. Gör.', 'Arş. Gör. Dr.', 'Arş. Gör.'];
const FACULTIES = ['Mühendislik Fakültesi', 'Fen-Edebiyat Fakültesi', 'İktisadi ve İdari Bilimler Fakültesi', 'Hukuk Fakültesi',
  'Tıp Fakültesi', 'Diş Hekimliği Fakültesi', 'Eczacılık Fakültesi', 'Sağlık Bilimleri Fakültesi', 'Güzel Sanatlar Fakültesi',
  'Mimarlık Fakültesi', 'İletişim Fakültesi', 'Eğitim Fakültesi', 'Ticari Bilimler Fakültesi', 'İngilizce Hazırlık Okulu', 'Meslek Yüksekokulu'];
const TERM_NAMES = { 1: 'Güz', 2: 'Bahar', 3: 'Yaz' };
const MAIL_DOMAIN = '@std.yeditepe.edu.tr';
const MAIL_RE = /^[a-z0-9][a-z0-9._%+-]{1,40}@std\.yeditepe\.edu\.tr$/i;
/* Sitede kodla değil şifreyle giren hesaplar (yönetici ve ortak deneme hesabı); sunucudaki yw_private.special_accounts ile aynı */
const PW_ACCOUNTS = ['yonetici@yediwiki.com', 'deneme123@std.yeditepe.edu.tr'];
const USER_RE = /^[a-z0-9][a-z0-9._]{2,19}$/;
/* Okul e-postası: kutuya @ işaretinden önceki kısım yazılır, uzantı kutuda hazır durur. Tam adres yapıştırılırsa da çalışır; başka uzantı null döner */
function mailOf(raw) {
  const v = String(raw || '').trim().toLowerCase().replace(/\s+/g, '');
  if (!v) return '';
  if (v.includes('@')) return v.endsWith(MAIL_DOMAIN) ? v : null;
  return v + MAIL_DOMAIN;
}
const mailLocal = mail => String(mail || '').replace(MAIL_DOMAIN, '');
const KUBBE = { signup: 50, note: 25, photos: 10, comment: 5, rating: 10, grade: 5, dist: 15, like: 2, up: 1, fill: 10 };   // up: notuna gelen her ▲
const AV_EMOJI = ['🦉', '🦊', '🐼', '🐧', '🦁', '🐢', '🐝', '🦄', '🐳', '🦖', '🐙', '🦕', '🌵', '🍀', '⚡', '🎧', '📚', '☕', '🧩', '🚀', '🎸', '🧠', '🛰️', '🥐'];
const AV_COLORS = ['#FFE14D', '#9DB0FF', '#8ED6B2', '#FFB4A2', '#C9B6FF', '#9AD8FF', '#F7C1E0', '#E3E7F2'];
const RARITY = {
  yaygin: { ad: 'Yaygın', c: '#3FB67E' },
  nadir: { ad: 'Nadir', c: '#3D7BFF' },
  epik: { ad: 'Epik', c: '#A155FF' },
  efsane: { ad: 'Efsane', c: '#FF9F0A' }
};
const MARKET = [
  { id: 'gece-eskortu', name: 'Gece Eskortu', desc: 'Gece üst kapıdan yurda kadar sana eşlik eden Ayhan Abi. Profilinde adının yanında yürür.', price: 1200, rar: 'efsane', kind: 'Yoldaş', mini: 1 },
  { id: 'kartal-kanatlari', name: 'Kartal Kanatları', desc: 'Yeditepe Kartalları için: profil resminin arkasında altın kanatlar açılır.', price: 1500, rar: 'efsane', kind: 'Profil efekti', mini: 1 },
  { id: 'altin-ring', name: 'Altın Ring Bileti', desc: 'Tıklım tıklım ringde yer bulmanın efsanevi yolu. Adının yanında altın bilet.', price: 700, rar: 'epik', kind: 'Rozet', mini: 1 },
  { id: 'selcuklu-kapi', name: 'Selçuklu Kapısı', desc: '22 metrelik kampüs kapılarından ilham alan taş desenli profil çerçevesi.', price: 900, rar: 'epik', kind: 'Çerçeve', mini: 0 },
  { id: 'gunes-aurasi', name: 'Güneş Paneli Aurası', desc: 'Çatıdaki güneş santralinden enerji: kullanıcı adın altın gibi parlar.', price: 800, rar: 'epik', kind: 'İsim efekti', mini: 0 },
  { id: 'yokus-canavari', name: 'Yokuş Canavarı', desc: 'Kayışdağı yokuşunu “oy anam” demeden çıkanlara verilir.', price: 350, rar: 'nadir', kind: 'Rozet', mini: 1 },
  { id: 'son-sosisli', name: 'Son Sosisli', desc: 'Kantinde “kalmadı” denmeden alınabilmiş efsanevi sosisli.', price: 300, rar: 'nadir', kind: 'Rozet', mini: 1 },
  { id: 'ikinci-ev', name: 'İkinci Ev Kupası', desc: 'Kütüphaneden kaçıp kafede ders çalışanların kupası.', price: 200, rar: 'yaygin', kind: 'Rozet', mini: 1 },
  { id: 'karsi-durum', name: 'Karşıdaki Dürüm', desc: 'Ders arası karşıya geçip alınan dürüm. Klasik.', price: 150, rar: 'yaygin', kind: 'Rozet', mini: 1 }
];
const MARKET_BY_ID = Object.fromEntries(MARKET.map(m => [m.id, m]));
const REPORT_LIMIT = 3;

const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
  heart: '<path d="M12 20s-7.2-4.4-7.2-10.1A4.1 4.1 0 0 1 12 7.4a4.1 4.1 0 0 1 7.2 2.5C19.2 15.6 12 20 12 20z"/>',
  vup: '<path d="M12 4.5 20 14h-4.6v5.5H8.6V14H4z"/>',
  vdown: '<path d="M12 19.5 4 10h4.6V4.5h6.8V10H20z"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4h12l-2.5 4L17 12H5"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  comment: '<path d="M4 5h16v11H9l-5 4z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  shrink: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  eyeoff: '<path d="M3 3l18 18"/><path d="M10.6 5.6c.5-.1.9-.1 1.4-.1 6 0 9.5 6.5 9.5 6.5a17.6 17.6 0 0 1-3.1 3.9M6.4 6.5C3.9 8.2 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.3-1.1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  grad: '<path d="M2.5 9.5 12 5l9.5 4.5L12 14z"/><path d="M6.5 11.6v4.1c1.4 1.4 3.3 2.3 5.5 2.3s4.1-.9 5.5-2.3v-4.1"/><path d="M21.5 9.5v5"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  out: '<path d="M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5"/><path d="M10 16l-4-4 4-4M6 12h10"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  cl: '<path d="m15 5-7 7 7 7"/>',
  cr: '<path d="m9 5 7 7-7 7"/>',
  home: '<path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/>',
  book: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v18M12.5 8h3.5M12.5 12h3.5"/>',
  star: '<path d="M12 3.4l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.7l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
  up: '<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',
  folder: '<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4.2l2 2.2h8.8A1.5 1.5 0 0 1 21 9.7v8.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/><path d="M12 17v-5M9.6 14.3 12 11.9l2.4 2.4"/>',
  dl: '<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>',
  bell: '<path d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  bookmark: '<path d="M7 4h10v16l-5-3.5L7 20z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  chart: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
  kubbe: '<path d="M4 20h16"/><path d="M6.5 20v-5.5a5.5 5.5 0 0 1 11 0V20"/><path d="M12 3.5v3"/>'
};
const icon = n => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;
/* ================= Çizilmiş simgeler: sitede düz emoji yok =================
   Her simge kendi çizimi: koyu kontur, düz renkler, beyaz ışık çizgisi. Yeni bir simge gerekirse buraya çizilir, emoji yazılmaz.
   gl(ad, sınıf): 48'lik çizim (satır içi SVG). avArt(anahtar): profil resmi karakteri (64'lük); kayıtlarda anahtar eski emojidir. */
const GL = (() => {
  const O = 'stroke="#1B1330" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"';
  const L = 'fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".6"';
  const star = (cx, cy, R, r) => 'M' + Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r : R; return (cx + q * Math.cos(a)).toFixed(1) + ' ' + (cy + q * Math.sin(a)).toFixed(1); }).join('L') + 'z';
  const toe = (x, y, a) => `<ellipse cx="${x}" cy="${y}" rx="3.9" ry="4.9" transform="rotate(${a} ${x} ${y})" fill="#3B3B48" ${O}/>`;
  const ARROW = 'M24 5 41 23h-9v13a3 3 0 0 1-3 3H19a3 3 0 0 1-3-3V23H7z';
  return {
    // alev: her renk ayrı katman (fl1..fl4, ayrı ayrı titrer), tepeden duman püfler (smk1..smk3); hareketi CSS'te
    flame: `<g class="smk"><circle class="smk1" cx="24" cy="8" r="2.6" fill="#B8C0D4"/><circle class="smk2" cx="24" cy="8" r="2.2" fill="#B8C0D4"/><circle class="smk3" cx="24" cy="8" r="3" fill="#B8C0D4"/></g><g class="fl fl1"><path d="M24 7c3 6.5 12.5 11 12.5 23.5a12.5 12.5 0 0 1-25 0c0-6.2 2.6-10.2 5.8-13 .5 3.6 2.2 5.8 4.6 6.4-.8-6.2.4-12 2.1-16.9z" fill="#F2542D" ${O}/><path d="M31.5 19.5c2 2.4 3.2 5.2 3.4 8.4" ${L}/></g><path class="fl fl2" d="M24 14.5c2.4 5 9.8 8.6 9.8 18.3a9.8 9.8 0 0 1-19.6 0c0-4.8 2-7.9 4.5-10.1.4 2.8 1.7 4.5 3.6 5-.6-4.8.3-9.3 1.7-13.2z" fill="#FF8A2A"/><path class="fl fl3" d="M24 22c1.8 3.6 7 6.2 7 13a7 7 0 0 1-14 0c0-3.4 1.4-5.6 3.2-7.2.3 2 1.2 3.2 2.6 3.6-.4-3.4.2-6.6 1.2-9.4z" fill="#FFC93C"/><path class="fl fl4" d="M24 29.5c1.2 2.2 4.2 3.8 4.2 7.8a4.2 4.2 0 0 1-8.4 0c0-3.4 2.6-5.2 4.2-7.8z" fill="#FFF1B8"/>`,
    megaphone: `<path d="M12 29.5 14 38h5l-1.2-8.5" fill="#2447D5" ${O}/><rect x="6" y="19" width="11" height="11" rx="3" fill="#FFB020" ${O}/><path d="M16 19.5 33 10v29l-17-9.5z" fill="#3D7BFF" ${O}/><ellipse cx="33" cy="24.5" rx="3.4" ry="14.5" fill="#FFE14D" ${O}/><path d="M19.5 20.5 29 15" ${L}/><path d="M39.5 18c1.8 1.8 2.8 4 2.8 6.5s-1 4.7-2.8 6.5M43.5 13.5c2.9 3 4.3 6.8 4.3 11s-1.4 8-4.3 11" fill="none" stroke="#FF4D6D" stroke-width="2.4" stroke-linecap="round"/>`,
    gradcap: `<path d="M12 21v9c0 3.5 5.4 6.5 12 6.5S36 33.5 36 30v-9l-12 5z" fill="#2B3C94" ${O}/><path d="M24 8 45 17 24 26 3 17z" fill="#3551C9" ${O}/><path d="M13.5 15.6 23 11.6" ${L}/><path d="M24 17l12.5 4.5V32" fill="none" stroke="#FFB020" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M34 31h5l1.2 7.5h-7.4z" fill="#FFB020" ${O}/><circle cx="24" cy="17" r="2.2" fill="#FFB020"/>`,
    paw: `<path d="M24 22.5c6 0 11.5 6.5 11.5 11.6 0 4-3 6.4-6.4 5.8-2.1-.4-3.4-1.6-5.1-1.6s-3 1.2-5.1 1.6c-3.4.6-6.4-1.8-6.4-5.8 0-5.1 5.5-11.6 11.5-11.6z" fill="#3B3B48" ${O}/>${toe(11.5, 20.5, -22)}${toe(19, 11.5, -8)}${toe(29, 11.5, 8)}${toe(36.5, 20.5, 22)}<path d="M19 29.4c1.4-1.6 3-2.4 5-2.4" fill="none" stroke="#7A7A88" stroke-width="2" stroke-linecap="round"/>`,
    party: `<path d="M6 42 16.5 15.5 32.5 31.5z" fill="#FFB020" ${O}/><path d="M10 33.5l4.5 4.5M13 25.5l9 9" stroke="#FF4D6D" stroke-width="2.6" stroke-linecap="round"/><ellipse cx="24.5" cy="23.5" rx="11.3" ry="3.4" transform="rotate(45 24.5 23.5)" fill="#FF4D6D" ${O}/><path d="M28 10c2-2.6 4.6-.6 6.6-3M38 21c2.4.6 3 3.6 5.4 3.4" fill="none" stroke="#3D7BFF" stroke-width="2.4" stroke-linecap="round"/><circle cx="25" cy="6.5" r="2.1" fill="#3FB67E"/><circle cx="41.5" cy="11" r="2.3" fill="#FF4D6D"/><circle cx="43" cy="31" r="1.9" fill="#A155FF"/><rect x="33.5" y="14" width="4.4" height="4.4" rx="1" transform="rotate(25 35.7 16.2)" fill="#FFE14D" stroke="#1B1330" stroke-width="1.2"/>`,
    heart: `<path d="M24 41C10.5 32 5 24 5 17 5 11.5 9 7.5 14.2 7.5c4 0 7.4 2.3 9.8 5.9 2.4-3.6 5.8-5.9 9.8-5.9C39 7.5 43 11.5 43 17c0 7-5.5 15-19 24z" fill="#FF4D6D" ${O}/><path d="M10.5 14.5c1-2.4 3.2-3.6 5.6-3.4" ${L}/>`,
    star: `<path d="${star(24, 25.5, 19.5, 8.6)}" fill="#FFC53D" ${O}/><path d="M20.6 15.6l-1.7 4" ${L}/>`,
    note: `<rect x="7" y="5" width="27" height="35" rx="3" fill="#FFFFFF" ${O}/><path d="M12.5 13h16M12.5 19h16M12.5 25h9" stroke="#9DB0FF" stroke-width="2.4" stroke-linecap="round"/><g transform="rotate(45 32 26)"><rect x="29" y="11" width="7" height="3.6" fill="#FF4D6D" ${O}/><rect x="29" y="14.6" width="7" height="17.4" fill="#FFC53D" ${O}/><path d="M29 32h7l-3.5 6.5z" fill="#F6E2BE" ${O}/><path d="M31.6 36.4l.9 1.7.9-1.7z" fill="#1B1330"/></g>`,
    books: `<rect x="5" y="32" width="37" height="9" rx="2" fill="#3D7BFF" ${O}/><path d="M37 34.5v4" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/><path d="M10 33.3v6.4" stroke="#FFE14D" stroke-width="2.2"/><rect x="8" y="23" width="33" height="9" rx="2" fill="#FF4D6D" ${O}/><path d="M36 25.5v4" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/><path d="M13 24.3v6.4" stroke="#FFE14D" stroke-width="2.2"/><g transform="rotate(-7 23 18)"><rect x="7" y="13.5" width="31" height="9" rx="2" fill="#3FB67E" ${O}/><path d="M33 16v4" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/><path d="M12 14.8v6.4" stroke="#FFE14D" stroke-width="2.2"/></g>`,
    bubble: `<path d="M9 8h30a5 5 0 0 1 5 5v15a5 5 0 0 1-5 5H22l-9 8v-8H9a5 5 0 0 1-5-5V13a5 5 0 0 1 5-5z" fill="#FFFFFF" ${O}/><circle cx="15" cy="20.5" r="2.6" fill="#3D7BFF"/><circle cx="24" cy="20.5" r="2.6" fill="#3D7BFF"/><circle cx="33" cy="20.5" r="2.6" fill="#3D7BFF"/>`,
    cay: `<ellipse cx="22" cy="42" rx="16" ry="3.6" fill="#E3E7F2" ${O}/><path d="M14.5 15.5h15c-1.4 3.4-2.6 6-2.6 10.4 0 4.6 3 7.6 3.6 12.6H13.5c.6-5 3.6-8 3.6-12.6 0-4.4-1.2-7-2.6-10.4z" fill="#C0392B"/><path d="M12.5 10h19c0 6-4.2 9-4.2 15.5S31.5 34 31.5 39h-19c0-5 4.2-7 4.2-13.5S12.5 16 12.5 10z" fill="#fff" fill-opacity=".35" ${O}/><path d="M16.5 17.5c1.2 3 2.2 5.4 2.2 8.4" ${L}/><path d="M18 7c-1.6-1.6 1.6-3 0-4.6M24 7c-1.6-1.6 1.6-3 0-4.6" fill="none" stroke="#9AA4B8" stroke-width="2" stroke-linecap="round"/><path d="M34 6h9a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-4.5L35 21v-3h-1a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3z" fill="#FFE14D" ${O}/><circle cx="35.6" cy="12" r="1.2" fill="#1B1330"/><circle cx="38.6" cy="12" r="1.2" fill="#1B1330"/><circle cx="41.6" cy="12" r="1.2" fill="#1B1330"/>`,
    dome: `<path d="M4 41h40" stroke="#1B1330" stroke-width="2.2" stroke-linecap="round"/><rect x="8" y="30" width="32" height="11" rx="1.5" fill="#F6E2BE" ${O}/><path d="M14 39.6v-5.6M34 39.6v-5.6" stroke="#C9955A" stroke-width="2.2" stroke-linecap="round"/><path d="M20.5 41v-5a3.5 3.5 0 0 1 7 0v5" fill="#2E44B8" ${O}/><rect x="11.5" y="25" width="25" height="5" fill="#E9CFA0" ${O}/><path d="M12 25a12 12 0 0 1 24 0z" fill="#FFC53D" ${O}/><path d="M16.5 20.5c1.4-3 4-5.2 7-5.8" ${L}/><path d="M24 13V8" stroke="#1B1330" stroke-width="2.2" stroke-linecap="round"/><circle cx="24" cy="6.5" r="2.2" fill="#FFC53D" ${O}/>`,
    trophy: `<path d="M14 10H8.5c0 6.5 3 9.5 7.5 9.5M34 10h5.5c0 6.5-3 9.5-7.5 9.5" fill="none" stroke="#1B1330" stroke-width="5.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 10H8.5c0 6.5 3 9.5 7.5 9.5M34 10h5.5c0 6.5-3 9.5-7.5 9.5" fill="none" stroke="#FFC53D" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.5 6.5h21v8.5c0 7.2-4.7 12.5-10.5 12.5S13.5 22.2 13.5 15z" fill="#FFC53D" ${O}/><path d="M24 10.5l1.5 3.1 3.4.5-2.5 2.4.6 3.4-3-1.6-3 1.6.6-3.4-2.5-2.4 3.4-.5z" fill="#FFF3B8"/><path d="M17.5 10v4.5c0 3 1 5.4 2.6 7" ${L}/><path d="M21 27.5h6l1 5.5h-8z" fill="#E0A008" ${O}/><rect x="14" y="33" width="20" height="8" rx="2" fill="#7E4A24" ${O}/><rect x="19" y="35.5" width="10" height="3" rx="1" fill="#FFE14D"/>`,
    buoy: `<path fill-rule="evenodd" d="M24 7a17 17 0 1 1 0 34 17 17 0 0 1 0-34zm0 9a8 8 0 1 0 0 16 8 8 0 0 0 0-16z" fill="#FFFFFF"/><circle cx="24" cy="24" r="12.5" fill="none" stroke="#FF4D6D" stroke-width="9" stroke-dasharray="9.82 9.82" transform="rotate(-22.5 24 24)"/><circle cx="24" cy="24" r="17" fill="none" ${O}/><circle cx="24" cy="24" r="8" fill="none" ${O}/><path d="M12.5 15.5a14 14 0 0 1 7.5-6" ${L}/>`,
    coin: `<circle cx="24" cy="24" r="19" fill="#FFC53D" ${O}/><circle cx="24" cy="24" r="14.5" fill="#FFD866" stroke="#D99A0B" stroke-width="2"/><path d="M15.5 31h17M17.5 31v-3.4a6.5 6.5 0 0 1 13 0V31" fill="#E9A80F" stroke="#8A5A00" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><path d="M24 21.2v-3.4" stroke="#8A5A00" stroke-width="2" stroke-linecap="round"/><path d="M11.5 18.5a13.5 13.5 0 0 1 7.5-7" ${L}/>`,
    check: '<path d="M11 25.5l8.5 8.5L37 15.5" fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"/>',
    up: `<path d="${ARROW}" fill="#3FB67E" ${O}/><path d="M14 21.5l8.4-9" ${L}/>`,
    down: `<path d="${ARROW}" transform="rotate(180 24 22)" fill="#FF4D6D" ${O}/><path d="M20 9v8" ${L}/>`,
    spy: `<path d="M7 47c0-9.5 7.5-15 17-15s17 5.5 17 15z" fill="#3B4252" ${O}/><path d="M24 34l-5.5 13M24 34l5.5 13" stroke="#59627A" stroke-width="2"/><ellipse cx="24" cy="25" rx="9.5" ry="10" fill="#F0C48E" ${O}/><path d="M12.5 29.5l8 6-4.5 9-6.8-4.6zM35.5 29.5l-8 6 4.5 9 6.8-4.6z" fill="#59627A" ${O}/><path d="M14 17c0-6.5 3.6-11.5 10-11.5s10 5 10 11.5z" fill="#26262E" ${O}/><path d="M14.7 13.6h18.6" stroke="#FF4D6D" stroke-width="2.8"/><ellipse cx="24" cy="17.2" rx="16" ry="3.6" fill="#26262E" ${O}/><path d="M14.5 24h19" stroke="#1B1330" stroke-width="2"/><rect x="14.8" y="22.2" width="8" height="5.2" rx="2.4" fill="#111C4E" ${O}/><rect x="25.2" y="22.2" width="8" height="5.2" rx="2.4" fill="#111C4E" ${O}/><path d="M16.8 23.8l2.6-.8M27.2 23.8l2.6-.8" stroke="#9DB0FF" stroke-width="1.4" stroke-linecap="round"/><path d="M21.6 31.4h4.8" stroke="#7E4A24" stroke-width="1.6" stroke-linecap="round"/>`,
    spark: `<path d="M24 3c1.8 9.5 5.6 14.6 18 21-12.4 6.4-16.2 11.5-18 21-1.8-9.5-5.6-14.6-18-21 12.4-6.4 16.2-11.5 18-21z" fill="#FFE14D" ${O}/>`,
    shield: `<path d="M24 4.5 40.5 10.5V22c0 10.5-7.2 17.6-16.5 21.5C14.7 39.6 7.5 32.5 7.5 22V10.5z" fill="#3D7BFF" ${O}/><path d="M24 9.5 36 14v8c0 7.6-5 12.8-12 15.8z" fill="#2447D5"/><path d="M17 23.5l5 5L32 18.5" fill="none" stroke="#FFE14D" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`,
    person: `<circle cx="24" cy="17" r="8" fill="#C9D3EA" ${O}/><path d="M8 44c0-9 7-15 16-15s16 6 16 15z" fill="#C9D3EA" ${O}/>`,
    cup: `<ellipse cx="22" cy="42.5" rx="16" ry="3.4" fill="#E3E7F2" ${O}/><path d="M33 22.5h3.2a5.2 5.2 0 0 1 0 10.4H33" fill="none" stroke="#1B1330" stroke-width="5.4" stroke-linecap="round"/><path d="M33 22.5h3.2a5.2 5.2 0 0 1 0 10.4H33" fill="none" stroke="#FFFFFF" stroke-width="2"/><path d="M9.5 18h24.5v14c0 6.8-5.4 11.5-12.2 11.5S9.5 38.8 9.5 32z" fill="#FFFFFF" ${O}/><path d="M10.6 27.5h22.3" stroke="#3D7BFF" stroke-width="3.2"/><ellipse cx="21.75" cy="18" rx="12.25" ry="3.2" fill="#7E4A24" ${O}/><path d="M16 12c-2-2 2-4 0-6M22 12c-2-2 2-4 0-6M28 12c-2-2 2-4 0-6" fill="none" stroke="#9AA4B8" stroke-width="2" stroke-linecap="round"/>`
  };
})();
const gl = (k, cls = '') => (GL[k] ? `<svg class="gl gl-${k}${cls ? ' ' + cls : ''}" viewBox="0 0 48 48" aria-hidden="true">${GL[k]}</svg>` : '');
const spyName = (t = 'Anonim') => `<span class="spy-name">${gl('spy')}${esc(t)}</span>`;
// Yazar adı: anonimse yanında casus
function whoHtml(uid, anon, fb) { const t = displayName(uid, anon, fb); return t === 'Anonim' ? spyName() : esc(t); }
/* Profil resmi karakterleri (kayıtta eski emoji anahtarıyla durur, ekranda çizim görünür) */
const AV_NAMES = { '🦉': 'Baykuş', '🦊': 'Tilki', '🐼': 'Panda', '🐧': 'Penguen', '🦁': 'Aslan', '🐢': 'Kaplumbağa', '🐝': 'Arı', '🦄': 'Tek boynuzlu at', '🐳': 'Balina', '🦖': 'T-Rex', '🐙': 'Ahtapot', '🦕': 'Uzun boyunlu dinozor', '🌵': 'Kaktüs', '🍀': 'Yonca', '⚡': 'Şimşek', '🎧': 'Kulaklık', '📚': 'Kitaplar', '☕': 'Kahve', '🧩': 'Yapboz', '🚀': 'Roket', '🎸': 'Gitar', '🧠': 'Beyin', '🛰️': 'Uydu', '🥐': 'Kruvasan' };
const AV_ART = (() => {
  const A = 'stroke="#1B1330" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"';
  const L = 'fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".6"';
  // U: birleşik gövde; önce kalın koyu kontur, sonra dolgu: parçaların arasında çizgi kalmaz
  const U = (shapes, fill) => shapes.map(s => s.replace(/\/>$/, ` fill="${fill}" stroke="#1B1330" stroke-width="4.8" stroke-linejoin="round"/>`)).join('') + shapes.map(s => s.replace(/\/>$/, ` fill="${fill}"/>`)).join('');
  const eye = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#1B1330"/><circle cx="${(x + r * 0.35).toFixed(2)}" cy="${(y - r * 0.4).toFixed(2)}" r="${(r * 0.38).toFixed(2)}" fill="#fff"/>`;
  const eyes = (x1, x2, y, r = 2.6) => eye(x1, y, r) + eye(x2, y, r);
  const smile = (x, y, w = 3) => `<path d="M${x - w} ${y}q${w} ${(w * 0.8).toFixed(1)} ${w * 2} 0" fill="none" stroke="#1B1330" stroke-width="2" stroke-linecap="round"/>`;
  const blush = (x1, x2, y) => `<ellipse cx="${x1}" cy="${y}" rx="3.2" ry="1.9" fill="#FF8FA8" opacity=".7"/><ellipse cx="${x2}" cy="${y}" rx="3.2" ry="1.9" fill="#FF8FA8" opacity=".7"/>`;
  const g48 = k => `<g transform="translate(6 6) scale(1.083)">${GL[k]}</g>`;
  const turn = (a, s) => `<g transform="translate(32 32) rotate(${a}) translate(-32 -32)">${s}</g>`;
  const legs = ds => ds.map(d => `<path d="${d}" fill="none" stroke="#1B1330" stroke-width="8.4" stroke-linecap="round"/>`).join('') + ds.map(d => `<path d="${d}" fill="none" stroke="#FF7AA8" stroke-width="4" stroke-linecap="round"/>`).join('');
  const leaf = a => `<path d="M32 31c-6.2-4-12.4-9.4-9.2-15.4 2-3.8 7-3.8 9.2 0 2.2-3.8 7.2-3.8 9.2 0 3.2 6-3 11.4-9.2 15.4z" transform="rotate(${a} 32 31)" fill="#3FB67E" ${A}/>`;
  const FOX = 'M13 11l11 9h16l11-9-1.6 19C49.4 43 41.6 53 32 53S14.6 43 14.6 30z';
  return {
    '🦉': U(['<path d="M15 24c0-6 2.6-11 5.6-13.6L25 16h14l4.4-5.6C46.4 13 49 18 49 24v16c0 10-7.6 17-17 17s-17-7-17-17z"/>'], '#A0673A') + `<ellipse cx="32" cy="43" rx="11" ry="11.5" fill="#F6E2BE"/><path d="M26 40.5l3 2 3-2 3 2 3-2M27.2 46.5l2.4 1.6 2.4-1.6 2.4 1.6 2.4-1.6" fill="none" stroke="#C98B55" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24.6" cy="27" r="7.2" fill="#fff" ${A}/><circle cx="39.4" cy="27" r="7.2" fill="#fff" ${A}/>${eyes(25.6, 38.4, 27.6, 3.4)}<path d="M29.4 32h5.2L32 36.6z" fill="#FFB020" ${A}/><path d="M15.6 33c-2 5-1.4 10.6 1.6 14M48.4 33c2 5 1.4 10.6-1.6 14" fill="none" stroke="#7E4A24" stroke-width="2.4" stroke-linecap="round"/>`,
    '🦊': `<path d="${FOX}" fill="#F07C2A"/><path d="M15.6 15.2l6 4.8-4.6 3.4zM48.4 15.2l-6 4.8 4.6 3.4z" fill="#3A2416"/><path d="M14.8 33c4.4.2 9.6 3.2 11.8 8.2L32 52.6C22 52.2 15.4 43.6 14.8 33zM49.2 33c-4.4.2-9.6 3.2-11.8 8.2L32 52.6c10-.4 16.6-9 17.2-19.6z" fill="#FFF6EC"/><path d="${FOX}" fill="none" ${A}/>${eyes(25, 39, 31)}<ellipse cx="32" cy="44.5" rx="3.2" ry="2.3" fill="#1B1330"/><path d="M29 48.5q3 2 6 0" fill="none" stroke="#1B1330" stroke-width="1.8" stroke-linecap="round"/>`,
    '🐼': `<circle cx="17" cy="18" r="7.4" fill="#26262E" ${A}/><circle cx="47" cy="18" r="7.4" fill="#26262E" ${A}/><ellipse cx="32" cy="35" rx="20.5" ry="18.5" fill="#FFFFFF" ${A}/><ellipse cx="24" cy="33" rx="5.2" ry="6.8" transform="rotate(28 24 33)" fill="#26262E"/><ellipse cx="40" cy="33" rx="5.2" ry="6.8" transform="rotate(-28 40 33)" fill="#26262E"/><circle cx="24.8" cy="32.4" r="2.1" fill="#fff"/><circle cx="39.2" cy="32.4" r="2.1" fill="#fff"/><ellipse cx="32" cy="41" rx="3.4" ry="2.4" fill="#1B1330"/><path d="M29 45.4q3 2.4 6 0" fill="none" stroke="#1B1330" stroke-width="2" stroke-linecap="round"/>${blush(19.5, 44.5, 42)}`,
    '🐧': `<ellipse cx="24.5" cy="55" rx="5.6" ry="2.8" fill="#FFB020" ${A}/><ellipse cx="39.5" cy="55" rx="5.6" ry="2.8" fill="#FFB020" ${A}/><path d="M32 8c11 0 17.5 9 17.5 22v13c0 7.6-7.4 12.5-17.5 12.5S14.5 50.6 14.5 43V30C14.5 17 21 8 32 8z" fill="#2B2F3E" ${A}/><path d="M32 19c-3-4.4-12.5-3.4-12.5 6 0 5 2 8 2 13 0 7.6 4.4 13 10.5 13s10.5-5.4 10.5-13c0-5 2-8 2-13 0-9.4-9.5-10.4-12.5-6z" fill="#FFFFFF"/>${eyes(26.5, 37.5, 27.5)}<path d="M28 32.5h8l-4 5z" fill="#FFB020" ${A}/>${blush(23, 41, 36)}<path d="M24 12.5c2.6-1.8 5.4-2.6 8-2.6" ${L}/>`,
    '🦁': Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6 + 0.26; return `<circle cx="${(32 + 18.5 * Math.cos(a)).toFixed(1)}" cy="${(33 + 18.5 * Math.sin(a)).toFixed(1)}" r="7.6" fill="#C2652A" ${A}/>`; }).join('') + `<circle cx="32" cy="33" r="18.6" fill="#C2652A"/><circle cx="21" cy="21.5" r="4.4" fill="#FFC53D" ${A}/><circle cx="43" cy="21.5" r="4.4" fill="#FFC53D" ${A}/><circle cx="32" cy="34" r="14.6" fill="#FFC53D" ${A}/>${eyes(26.4, 37.6, 31.5, 2.3)}<ellipse cx="32" cy="40.5" rx="6.6" ry="4.6" fill="#FFF0C8"/><path d="M29.4 37h5.2L32 40z" fill="#7E4A24" ${A}/><path d="M32 40v2.2M28.8 43.4q3.2 2.2 6.4 0" fill="none" stroke="#1B1330" stroke-width="1.8" stroke-linecap="round"/>`,
    '🐢': `<g transform="translate(31 38) scale(1.12) translate(-31 -38)"><rect x="15" y="41" width="7.4" height="9" rx="3.2" fill="#8ED6B2" ${A}/><rect x="37" y="41" width="7.4" height="9" rx="3.2" fill="#8ED6B2" ${A}/><circle cx="50.5" cy="36" r="6.6" fill="#8ED6B2" ${A}/>${eye(52.6, 34.4, 1.7)}<path d="M50.6 38.6q2 1.4 4 .2" fill="none" stroke="#1B1330" stroke-width="1.6" stroke-linecap="round"/><path d="M11 41a19 17 0 0 1 38 0z" fill="#3FB67E" ${A}/><path d="M21.5 41l3-10.5h15l3 10.5M24.5 30.5l-5.6-5.4M39.5 30.5l5.6-5.4M32 30.5v-6.3" fill="none" stroke="#1F7A4D" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><rect x="9" y="40" width="42" height="5.4" rx="2.7" fill="#E0B354" ${A}/><path d="M17 31c1.6-3.4 4.4-6 8-7.4" ${L}/></g>`,
    '🐝': `<ellipse cx="21" cy="19" rx="7.5" ry="10" transform="rotate(-28 21 19)" fill="#D9F0FF" ${A}/><ellipse cx="43" cy="19" rx="7.5" ry="10" transform="rotate(28 43 19)" fill="#D9F0FF" ${A}/><path d="M32 54v4.6" stroke="#1B1330" stroke-width="2.4" stroke-linecap="round"/><ellipse cx="32" cy="38" rx="16" ry="17" fill="#FFC53D"/><path d="M16.2 36.5h31.6c.3 1.8.3 3.4.1 5H16.1c-.2-1.6-.2-3.2.1-5zM18.3 46.5h27.4c-.9 1.9-2 3.6-3.4 5H21.7c-1.4-1.4-2.5-3.1-3.4-5z" fill="#26262E"/><ellipse cx="32" cy="38" rx="16" ry="17" fill="none" ${A}/>${eyes(26, 38, 28, 2.5)}${smile(32, 32.5)}<path d="M27 21.6c-1.2-3.6-3-6-5.6-7.6M37 21.6c1.2-3.6 3-6 5.6-7.6" fill="none" stroke="#1B1330" stroke-width="2.2" stroke-linecap="round"/><circle cx="21.4" cy="13.6" r="2.2" fill="#1B1330"/><circle cx="42.6" cy="13.6" r="2.2" fill="#1B1330"/>`,
    '🦄': `<path d="M20 20l-2-9 7.4 5.4zM44 20l2-9-7.4 5.4z" fill="#FFFFFF" ${A}/><path d="M28.6 15.6 32 1.8l3.4 13.8z" fill="#FFC53D" ${A}/><path d="M30 10.4l4-1.2M29.2 13.4l5.4-1.6" stroke="#E0A008" stroke-width="1.6" stroke-linecap="round"/><path d="M19.5 26c0-8 5.4-12.5 12.5-12.5S44.5 18 44.5 26v9.5c0 9.4-5.4 16-12.5 16s-12.5-6.6-12.5-16z" fill="#FFFFFF" ${A}/><path d="M33.4 13.6c-7.6-.6-14 3.6-14.6 10.4 3.4-2.6 8-3.8 12.4-2.6-1.4-2.6-.8-5.4 2.2-7.8z" fill="#A155FF" ${A}/><path d="M44.4 22.6c3.8 2 5.6 6.2 4.4 10.6-1.6-1.8-3.4-2.6-5.4-2.6" fill="#FF7AA8" ${A}/><ellipse cx="32" cy="43.5" rx="8.6" ry="6.6" fill="#F7C1E0" ${A}/><circle cx="29" cy="43" r="1.3" fill="#1B1330"/><circle cx="35" cy="43" r="1.3" fill="#1B1330"/><path d="M23.6 31.4q2.6-2.4 5.2 0M35.2 31.4q2.6-2.4 5.2 0" fill="none" stroke="#1B1330" stroke-width="2.2" stroke-linecap="round"/>${blush(22.8, 41.2, 37)}`,
    '🐳': `<path d="M30 20c0-4-3-6.6-6.4-7.4M30 20c0-4 3-6.6 6.4-7.4M30 20v-8.6" fill="none" stroke="#5BB8FF" stroke-width="2.8" stroke-linecap="round"/><circle cx="22.6" cy="10.4" r="1.8" fill="#5BB8FF"/><circle cx="37.4" cy="10.4" r="1.8" fill="#5BB8FF"/><path d="M14 36c-4.6-1.6-7.4-6-7-10.6 3.4.6 6.4 3 7.8 6.2" fill="#3D7BFF" ${A}/><path d="M10 38c0-10 9.4-17.6 22-17.6S54 28 54 36.6C54 45.4 46 51 34 51H22c-7.4 0-12-5.4-12-13z" fill="#3D7BFF" ${A}/><path d="M14.6 43.6c3.4 3.6 8 5.4 14 5.4h5.4c6.6 0 12.4-2.4 15.6-7-6 1.8-13.4 2.6-19.6 2.6-5.6 0-10.8-.4-15.4-1z" fill="#D6E6FF"/>${eye(43, 34, 2.4)}<path d="M44 40q3.4 1.6 6.4-.6" fill="none" stroke="#1B1330" stroke-width="1.8" stroke-linecap="round"/><ellipse cx="47.6" cy="37.4" rx="2.6" ry="1.5" fill="#FF8FA8" opacity=".7"/><path d="M18 31c3-4 8-6.6 13.4-7" ${L}/>`,
    '🦖': `<path d="M18 30c0-11 8-18 19-18h7c5 0 8 3 8 8v5c0 3-2 5-5 5H36v4h12c0 4-3 7-7 7H30l-2 12H14c0-10 1-17 4-23z" fill="#3FB67E" ${A}/><path d="M38.4 30l1.5 2.6 1.5-2.6M43.4 30l1.5 2.6 1.5-2.6" fill="#fff" stroke="#1B1330" stroke-width="1.2" stroke-linejoin="round"/>${eye(42, 19.5, 2.6)}<circle cx="49" cy="17.6" r="1" fill="#1B1330"/><circle cx="26" cy="22" r="2.2" fill="#2E9466"/><circle cx="22.6" cy="29" r="1.7" fill="#2E9466"/><circle cx="31" cy="17" r="1.6" fill="#2E9466"/><path d="M29 45.6h4.4l1.6 2.6" fill="none" stroke="#1B1330" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 20c2.6-3.4 6.4-5.4 10.6-5.6" ${L}/>`,
    '🐙': legs(['M18 40c-2 6-6.4 8.6-9.4 6.6', 'M24 43c-.4 6.4-3.4 10.4-7 10.6', 'M32 44c0 6.4.6 9.4 3.2 11.4', 'M40 43c.4 6.4 3.4 10.4 7 10.6', 'M46 40c2 6 6.4 8.6 9.4 6.6']) + `<path d="M13.5 35c0-12.6 8.2-22 18.5-22s18.5 9.4 18.5 22c0 6-4 9.6-8.4 9.6H21.9c-4.4 0-8.4-3.6-8.4-9.6z" fill="#FF7AA8" ${A}/><circle cx="39" cy="20" r="2" fill="#FFB4CE"/><circle cx="43" cy="25" r="1.4" fill="#FFB4CE"/>${eyes(26, 38, 31)}${smile(32, 36.5)}${blush(21.6, 42.4, 36)}<path d="M20 22c1.8-3.4 4.6-5.6 8-6.4" ${L}/>`,
    '🦕': U(['<ellipse cx="27" cy="41" rx="15.5" ry="10"/>', '<path d="M35 35c4-6 6.4-14 8.2-20.4.9-3.2 3.2-5.2 6.2-5.2h2c3.2 0 5.4 2.2 5.4 5 0 2.2-1.8 4-4 4h-3.4c-1.8 6.4-3 14.4-6.2 20.4z"/>', '<path d="M12.5 40c-4.6 0-7 3-8.6 6.6 5.2.2 9.4-1 12.6-3.2z"/>', '<rect x="16" y="45" width="7.4" height="11" rx="3"/>', '<rect x="31" y="45" width="7.4" height="11" rx="3"/>'], '#7CC4E8') + `<path d="M17 39c3.6 3.4 9.4 5 15.4 4" fill="none" stroke="#4A9CC4" stroke-width="2" stroke-linecap="round"/>${eye(52, 13.6, 1.8)}<path d="M53.6 17.6q1.4.6 2.6-.4" fill="none" stroke="#1B1330" stroke-width="1.4" stroke-linecap="round"/><circle cx="24" cy="36" r="2" fill="#B8E2F6"/><circle cx="30" cy="34" r="1.6" fill="#B8E2F6"/><path d="M17.6 35.4c2.6-2.6 6-4 9.6-4.2" ${L}/>`,
    '🌵': U(['<rect x="26" y="9.5" width="12" height="34" rx="6"/>', '<path d="M27 33.5h-6.4a4.6 4.6 0 0 1-4.6-4.6v-7.4a3.2 3.2 0 0 1 6.4 0v5.6h4.6z"/>', '<path d="M37 28.5h5.4a3.6 3.6 0 0 0 3.6-3.6v-8.4a3.2 3.2 0 0 1 6.4 0v8.4a10 10 0 0 1-10 10H37z"/>'], '#3FB67E') + `<path d="M30 14.6v3M34.4 34v3M18.4 24v2.6M49.2 20.4v2.6" stroke="#1F7A4D" stroke-width="1.8" stroke-linecap="round"/>${eyes(29, 35, 24.5, 1.8)}${smile(32, 28.4, 2.2)}<circle cx="32" cy="9" r="3.2" fill="#FF7AA8" ${A}/><rect x="17" y="41" width="30" height="6" rx="2" fill="#F08F62" ${A}/><path d="M19.4 47h25.2l-3.2 11H22.6z" fill="#E07A4F" ${A}/>`,
    '🍀': `<path d="M33 32c4.4 8.4 6.4 14.6 4.4 23" fill="none" stroke="#1B1330" stroke-width="6" stroke-linecap="round"/><path d="M33 32c4.4 8.4 6.4 14.6 4.4 23" fill="none" stroke="#2E9466" stroke-width="2.4" stroke-linecap="round"/>${[0, 90, 180, 270].map(leaf).join('')}<path d="M32 31v-9M32 31h9M32 31v9M32 31h-9" stroke="#2E9466" stroke-width="1.8" stroke-linecap="round"/><circle cx="32" cy="31" r="2.4" fill="#2E9466"/><path d="M25.4 17.4c1-1.4 2.6-2 4-1.6" ${L}/>`,
    '⚡': `<circle cx="32" cy="32" r="22" fill="#FFF6C2" opacity=".55"/><path d="M37 6 17 36h13.4L26 58l22-32.4H34.4z" fill="#FFE14D" ${A}/><path d="M33 13.6l-9.6 15" ${L}/>`,
    '🎧': `<path d="M14 40v-7a18 18 0 0 1 36 0v7" fill="none" stroke="#1B1330" stroke-width="7.4" stroke-linecap="round"/><path d="M14 40v-7a18 18 0 0 1 36 0v7" fill="none" stroke="#3D7BFF" stroke-width="3"/><rect x="9" y="35" width="11.4" height="18" rx="5.2" fill="#3D7BFF" ${A}/><rect x="43.6" y="35" width="11.4" height="18" rx="5.2" fill="#3D7BFF" ${A}/><rect x="17.6" y="37" width="5.4" height="14" rx="2.7" fill="#26262E" ${A}/><rect x="41" y="37" width="5.4" height="14" rx="2.7" fill="#26262E" ${A}/><path d="M30.4 41.6V31.4l8-2.2v9.6" fill="none" stroke="#A155FF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="28.4" cy="42" r="2.6" fill="#A155FF"/><circle cx="36.4" cy="39" r="2.6" fill="#A155FF"/><path d="M12 37.6v6" ${L}/>`,
    '📚': g48('books'),
    '☕': g48('cup'),
    '🧩': `<path d="M13 20h10a5 5 0 1 1 10 0h12v10a5 5 0 1 1 0 10v12H33a5 5 0 1 0-10 0H13V40a5 5 0 1 0 0-10z" fill="#A155FF" ${A}/><path d="M17 26c0-1.8 1.2-3.2 3-3.4" ${L}/>${eyes(25, 35, 33, 2.2)}${smile(30, 38, 2.6)}`,
    '🚀': turn(38, `<path d="M26 47c0 6 6 10 6 10s6-4 6-10z" fill="#FFB020" ${A}/><path d="M28.6 47c0 3.6 3.4 6 3.4 6s3.4-2.4 3.4-6z" fill="#FFE14D"/><path d="M21 36l-7.4 8.4v6.6l7.4-4.4zM43 36l7.4 8.4v6.6L43 46.6z" fill="#FF4D6D" ${A}/><path d="M32 6c8 6.2 11.6 16 11.6 27.6V47H20.4V33.6C20.4 22 24 12.2 32 6z" fill="#FFFFFF" ${A}/><path d="M26.8 15.2c3.4-.6 7-.6 10.4 0" fill="none" stroke="#FF4D6D" stroke-width="2.6"/><circle cx="32" cy="27.5" r="5.4" fill="#5BB8FF" ${A}/><path d="M29.8 25.6a3 3 0 0 1 2.6-1.4" ${L}/><path d="M24 36v8" stroke="#C9D3EA" stroke-width="2.4" stroke-linecap="round"/>`),
    '🎸': turn(40, U(['<circle cx="32" cy="45" r="11"/>', '<circle cx="32" cy="31.6" r="8.4"/>'], '#E8A65A') + `<rect x="29.6" y="4" width="4.8" height="30" rx="1.2" fill="#7E4A24" ${A}/><rect x="28" y="2.4" width="8" height="8" rx="2" fill="#3A2416" ${A}/><circle cx="32" cy="40" r="3.8" fill="#3A2416" ${A}/><rect x="27.6" y="48" width="8.8" height="2.8" rx="1" fill="#3A2416"/><path d="M31 9v40.4M33 9v40.4" stroke="#F6E2BE" stroke-width=".8"/><path d="M24.4 41.6c-.4-3 .6-6 2.6-8" ${L}/>`),
    '🧠': U(['<circle cx="22" cy="27" r="9.4"/>', '<circle cx="32" cy="21" r="10.2"/>', '<circle cx="42" cy="27" r="9.4"/>', '<circle cx="23.6" cy="38.6" r="9"/>', '<circle cx="40.4" cy="38.6" r="9"/>', '<circle cx="32" cy="42.4" r="8.4"/>'], '#FFB4C8') + `<path d="M32 13v37.4" stroke="#D94F8A" stroke-width="2.2" stroke-linecap="round"/><path d="M23.4 23.6c3 .2 4.4 3 2.4 5.4M40.6 23.6c-3 .2-4.4 3-2.4 5.4M21.6 37c3-1 6 .8 5.4 4.2M42.4 37c-3-1-6 .8-5.4 4.2M27 16.6c1.4 1.6 1.6 3.6.6 5.4M37 16.6c-1.4 1.6-1.6 3.6-.6 5.4" fill="none" stroke="#D94F8A" stroke-width="2" stroke-linecap="round"/><path d="M17.4 23c1.4-2.6 3.6-4.2 6.2-4.6" ${L}/>`,
    '🛰️': turn(-28, `<path d="M22 32h-3.4M42 32h3.4" stroke="#1B1330" stroke-width="2.6"/><rect x="4.6" y="25.6" width="14.4" height="12.8" rx="1.4" fill="#3D7BFF" ${A}/><rect x="45" y="25.6" width="14.4" height="12.8" rx="1.4" fill="#3D7BFF" ${A}/><path d="M9.4 25.6v12.8M14.2 25.6v12.8M4.6 32h14.4M49.8 25.6v12.8M54.6 25.6v12.8M45 32h14.4" stroke="#9DB0FF" stroke-width="1.4"/><rect x="22" y="23" width="20" height="18" rx="3" fill="#FFC53D" ${A}/><path d="M25 28h14M25 33h14M25 38h9" stroke="#E0A008" stroke-width="1.6" stroke-linecap="round"/><path d="M27 23a5 5 0 0 1 10 0z" fill="#FFFFFF" ${A}/><path d="M32 18v-5.4" stroke="#1B1330" stroke-width="2.2" stroke-linecap="round"/><circle cx="32" cy="11.4" r="2.4" fill="#FF4D6D" ${A}/>`) + '<circle cx="10" cy="12" r="1.4" fill="#FFE14D"/><circle cx="54" cy="52" r="1.6" fill="#FFE14D"/><circle cx="52" cy="10" r="1" fill="#FFE14D"/>',
    '🥐': `<g transform="translate(32 36) scale(1.2) translate(-32 -36)"><ellipse cx="13" cy="42" rx="4.6" ry="7" transform="rotate(-62 13 42)" fill="#D98C3F" ${A}/><ellipse cx="51" cy="42" rx="4.6" ry="7" transform="rotate(62 51 42)" fill="#D98C3F" ${A}/><ellipse cx="20.6" cy="36" rx="7" ry="9.4" transform="rotate(-40 20.6 36)" fill="#E8A65A" ${A}/><ellipse cx="43.4" cy="36" rx="7" ry="9.4" transform="rotate(40 43.4 36)" fill="#E8A65A" ${A}/><ellipse cx="32" cy="32" rx="9.4" ry="11.6" fill="#F2B86E" ${A}/><path d="M27 26c1.4-3 3.4-4.4 6-4.6M17.6 31.4c1-2 2.6-3.2 4.4-3.6M42 28c2 .4 3.6 1.6 4.6 3.6" ${L}/></g>`,
    '🛡️': g48('shield')
  };
})();
function avArt(k) {
  let f = AV_ART[k];
  if (!f) { let h = 0; for (const ch of String(k || '')) h = (h * 31 + ch.codePointAt(0)) >>> 0; f = AV_ART[AV_EMOJI[h % AV_EMOJI.length]]; }   // listede olmayan eski emoji: hep aynı karaktere düşer
  return `<svg class="av-art" viewBox="0 0 64 64" aria-hidden="true">${f}</svg>`;
}

/* ================= Yardımcılar ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fmt1 = v => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');
const fmt2 = v => (Math.round(v * 100) / 100).toFixed(2).replace('.', ',');
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const SEG_OK = /^[A-Za-z0-9_\-.~:@+]{1,200}$/;
const okId = id => typeof id === 'string' && SEG_OK.test(id) && id !== '.' && id !== '..';

function randId(n = 16) {
  const abc = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const a = new Uint8Array(n);
  try { crypto.getRandomValues(a); } catch (e) { for (let i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 256); }
  return Array.from(a, x => abc[x % 36]).join('');
}
const TR = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u', 'Ç': 'c', 'Ğ': 'g', 'I': 'i', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u', 'Â': 'a', 'Î': 'i', 'Û': 'u' };
function fold(s) {
  return String(s || '').replace(/[çğıöşüâîûÇĞIİÖŞÜÂÎÛ]/g, c => TR[c] || c).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
function parseCode(raw) {
  const s = fold(raw).replace(/\s+/g, '');
  const m = /^([a-z]{2,6})(\d{3}[a-z]?)$/.exec(s);
  if (!m) return null;
  const L = m[1].toUpperCase(), N = m[2].toUpperCase();
  return { id: L + N, code: L + ' ' + N };
}
const TITLE_RE = /^\s*(prof\.?\s*dr\.?|do[çc]\.?\s*dr\.?|dr\.?\s*[öo][ğg]r\.?\s*[üu]yesi|[öo][ğg]r\.?\s*g[öo]r\.?\s*dr\.?|[öo][ğg]r\.?\s*g[öo]r\.?|ar[şs]\.?\s*g[öo]r\.?\s*dr\.?|ar[şs]\.?\s*g[öo]r\.?|dr\.?)\s+/i;
const stripTitle = n => String(n || '').replace(TITLE_RE, '').replace(/\s+/g, ' ').trim();
function niceName(n) {
  const s = stripTitle(n);
  const allSame = s === s.toLocaleLowerCase('tr-TR') || s === s.toLocaleUpperCase('tr-TR');
  if (!allSame) return s;
  return s.split(' ').map(w => w ? w.charAt(0).toLocaleUpperCase('tr-TR') + w.slice(1).toLocaleLowerCase('tr-TR') : w).join(' ');
}
const hocaSlug = n => fold(stripTitle(n)).replace(/\s+/g, '-').slice(0, 60);
function initials(n) {
  const w = stripTitle(n).split(' ').filter(Boolean);
  if (!w.length) return '?';
  return ((w[0][0] || '') + (w.length > 1 ? w[w.length - 1][0] : '')).toLocaleUpperCase('tr-TR');
}
const cleanNick = s => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 24);
function ago(ts) {
  if (!ts) return '';
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return 'az önce';
  if (s < 3600) return Math.floor(s / 60) + ' dk önce';
  if (s < 86400) return Math.floor(s / 3600) + ' saat önce';
  const d = Math.floor(s / 86400);
  if (d === 1) return 'dün';
  if (d < 7) return d + ' gün önce';
  try { return new Date(ts).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; }
}
function termLabel(tk) { tk = +tk; if (!tk) return ''; const y = Math.floor(tk / 10), k = tk % 10; return `${y}-${y + 1} ${TERM_NAMES[k] || ''}`.trim(); }
function termList(now = new Date()) {
  const Y = now.getFullYear(), M = now.getMonth();
  const start = tk => { const y = Math.floor(tk / 10), k = tk % 10; return k === 1 ? new Date(y, 8, 1) : k === 2 ? new Date(y + 1, 1, 1) : new Date(y + 1, 6, 1); };
  const cur = M >= 8 ? Y : Y - 1, out = [];
  for (let y = cur; y >= cur - 7; y--) for (const k of [3, 2, 1]) { const tk = y * 10 + k; if (start(tk) <= now) out.push(tk); }
  return out;
}
const CLS = { a: 'aâAÂ', c: 'cçCÇ', g: 'gğGĞ', i: 'iıİIîÎ', o: 'oöOÖ', s: 'sşSŞ', u: 'uüUÜûÛ' };
function hl(text, q) {
  const t = String(text == null ? '' : text);
  const toks = fold(q).split(' ').filter(x => x.length > 0);
  if (!toks.length) return esc(t);
  const parts = toks.map(tok => {
    let p = '';
    const ch = Array.from(tok);
    ch.forEach((c, i) => {
      p += CLS[c] ? '[' + CLS[c] + ']' : c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const nx = ch[i + 1];
      if (nx && /[a-z]/.test(c) && /\d/.test(nx)) p += '\\s?';
    });
    return p;
  });
  let re;
  try { re = new RegExp('(' + parts.join('|') + ')', 'gi'); } catch (e) { return esc(t); }
  return t.split(re).map((seg, i) => (i % 2 ? '<mark>' + esc(seg) + '</mark>' : esc(seg))).join('');
}
const ls = {
  get(k, d) { try { const v = localStorage.getItem('yw:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('yw:' + k, JSON.stringify(v)); } catch (e) { /* depolama kapalı */ } }
};
async function sha(s) {
  try {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 20);
  } catch (e) {
    let h = 2166136261;
    for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
    return 'f' + h.toString(16);
  }
}
/* Yönetici şifresi PBKDF2 (SHA-256) özetiyle denetlenir; özet yalnızca sahibin kendi gizli kaydında (data/users/<id>/login) durur */
async function pbkdf2(pw, salt, it) {
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(String(pw).normalize('NFC')), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(String(salt || '')), iterations: Math.max(1000, +it || 310000) }, key, 256);
    return Array.from(new Uint8Array(bits)).map(x => x.toString(16).padStart(2, '0')).join('');
  } catch (e) { return ''; }
}
function applyWidths(root) {
  $$('[data-w]', root).forEach(el => { el.style.width = clamp(+el.dataset.w || 0, 0, 100) + '%'; });
  $$('[data-bg]', root).forEach(el => { if (/^#[0-9a-f]{3,8}$/i.test(el.dataset.bg)) el.style.background = el.dataset.bg; });
}

/* ================= Durum ================= */
const S = {
  db: null, user: null, downloads: null, me: null, owner: false, ownerId: false, out: false, login: null, canWrite: null, readOnly: false,
  supa: false, sb: null, sec: '', email: '', session: null, sesUid: '', authPending: false, liveSeen: false,
  dbState: 'loading', subErr: null, version: 0,
  courses: new Map(), dbCourses: new Map(), hocas: new Map(), dbHocas: new Map(), notes: new Map(), comments: new Map(), users: new Map(), bolumler: new Map(), dbBolumler: new Map(), requests: new Map(), zor: new Map(), priv: null, privLoaded: false, pendingHash: null, adminProv: 'idle', usersVer: 0,
  loaded: { courses: false, hocas: false, notes: false, comments: false, users: false, requests: false, zor: false },
  photoCache: new Map(), revealed: new Set()
};
const allLoaded = () => S.loaded.courses && S.loaded.hocas && S.loaded.notes && S.loaded.comments && S.loaded.users;

let memo = { v: -1, m: new Map() };
function memoized(key, fn) {
  if (memo.v !== S.version) memo = { v: S.version, m: new Map() };
  if (!memo.m.has(key)) memo.m.set(key, fn());
  return memo.m.get(key);
}

/* ================= Ders kataloğu =================
   Ders adları, AKTS/kredi ve bölüm planları sayfaya gömülü gelir (kaynak: Yeditepe AKTS Bilgi Paketi; seçmeli havuzları fakülte sitelerinden).
   Veritabanındaki courses/<kod> kaydı yalnızca değişen veriyi taşır ve katalogdaki dersin üstüne biner. */
const CAT = { v: '', courses: new Map(), plans: new Map(), bolOf: new Map(), pools: [], elOf: new Map(), bols: new Map() };
(function loadCatalog() {
  try {
    const el = document.getElementById('yw-katalog');
    const raw = el ? JSON.parse(el.textContent || 'null') : null;
    if (!raw || !raw.c) return;
    CAT.v = String(raw.v || '');
    const F = Array.isArray(raw.f) ? raw.f : [];
    for (const id of Object.keys(raw.c)) {
      const a = raw.c[id];
      CAT.courses.set(id, { code: id.replace(/^([A-Z]+)(\d)/, '$1 $2'), name: a[0], ects: +a[1] || 0, kr: a[2] == null ? null : +a[2], dept: F[a[3]] || '', by: 'akts' });
    }
    CAT.pools = Array.isArray(raw.h) ? raw.h : [];
    const U = Array.isArray(raw.u) ? raw.u : [];
    for (const slug of Object.keys(raw.p || {})) {
      const y = raw.p[slug][0], plan = {}, els = {};
      for (const [n, ids, e] of raw.p[slug][1]) {
        plan[n] = ids;
        if (e && e.length) els[n] = e;
        for (const id of ids) { let l = CAT.bolOf.get(id); if (!l) CAT.bolOf.set(id, l = []); l.push(slug); }
        for (const x of e || []) for (const id of poolOf(x) || []) { let l = CAT.elOf.get(id); if (!l) CAT.elOf.set(id, l = []); if (!l.includes(slug)) l.push(slug); }
      }
      CAT.plans.set(slug, { plan, el: els, yillik: !!y, url: U[raw.p[slug][2]] || '' });
    }
    const BF = Array.isArray(raw.bf) ? raw.bf : [];
    for (const slug of Object.keys(raw.b || {})) { const [ad, fi, dil] = raw.b[slug]; if (ad) CAT.bols.set(slug, { ad, fakulte: BF[fi] || '', dil: dil || '', kaynak: 'katalog' }); }
  } catch (e) { console.error('katalog okunamadı', e); }
})();
S.courses = new Map(CAT.courses);
S.bolumler = new Map(CAT.bols);
/* Bölümler: katalogdaki ad ve fakülte; veritabanındaki bolumler/<slug> kaydı (yönetici) üstüne biner */
function mergeBolumler(db) { const m = new Map(CAT.bols); for (const [id, d] of db) m.set(id, Object.assign({}, CAT.bols.get(id) || {}, d)); return m; }
/* Akademik kadro: Yeditepe'nin kişi sayfalarından (ad, unvan, fakülte, bölüm, verdiği dersler) sayfaya gömülü gelir.
   Veritabanındaki hocas/<id> kaydı puanları ve yöneticinin düzeltmesini taşır, kadrodaki kaydın üstüne biner. */
CAT.hocas = new Map(); CAT.kv = '';
(function loadKadro() {
  try {
    const el = document.getElementById('yw-kadro');
    const raw = el ? JSON.parse(el.textContent || 'null') : null;
    if (!raw || !Array.isArray(raw.h)) return;
    CAT.kv = String(raw.v || '');
    const F = Array.isArray(raw.f) ? raw.f : [];
    for (const [id, name, title, fi, bolum, dept, kid, ders] of raw.h) {
      if (!okId(id) || !name) continue;
      CAT.hocas.set(id, { name, title: title || '', fac: F[fi] || '', dept: dept || F[fi] || '', bolum: bolum || '', kid: +kid || 0, dersler: Array.isArray(ders) ? ders : [], ratings: {}, kadro: true });
    }
  } catch (e) { console.error('kadro okunamadı', e); }
})();
function mergeHocas(db) {
  const m = new Map(CAT.hocas);
  for (const [id, d] of db) {
    const k = CAT.hocas.get(id);
    if (!k) { m.set(id, d); continue; }
    const o = Object.assign({}, k, d, { dersler: k.dersler, kid: k.kid, fac: k.fac, bolum: d.bolum || k.bolum, kadro: true });
    if (!d.edAt) { o.name = k.name; o.title = k.title; o.dept = k.dept; }   // yönetici düzeltmediyse kadrodaki bilgi geçerli
    delete o.demo;
    m.set(id, o);
  }
  return m;
}
S.hocas = new Map(CAT.hocas);
function mergeCourses(db) {
  const m = new Map(CAT.courses);
  for (const [id, d] of db) {
    const s = CAT.courses.get(id);
    if (!s) { m.set(id, d); continue; }
    const o = Object.assign({}, d, s);
    if (d.by) o.by = d.by;
    if (d.edAt) { if (d.name) o.name = d.name; if (typeof d.dept === 'string') o.dept = d.dept; }   // yönetici elle düzelttiyse onun yazdığı geçerli
    m.set(id, o);
  }
  return m;
}
/* Bir bölümün ders planı: önce katalog, yoksa veritabanındaki eski kayıt. { plan: {dönem: [kod]}, el: {dönem: [hak]}, yillik, url }
   hak: [tür, AKTS, kredi] ya da fakülte sitesiyle eşlendiyse [tür, AKTS, kredi, havuz sırası | -1, numara, fakülte sitesindeki id] */
function planOf(bid) {
  const s = CAT.plans.get(bid);
  if (s) return s;
  const b = S.bolumler.get(bid);
  return b && b.plan && typeof b.plan === 'object' ? { plan: b.plan, el: {}, yillik: !!b.yillik } : null;
}
const semLabel = (P, sn) => (P && P.yillik ? `${sn}. sınıf` : `${Math.ceil(sn / 2)}. sınıf ${sn % 2 ? 'Güz' : 'Bahar'}`);
function bolumlerOf(cid) {
  const out = (CAT.bolOf.get(cid) || []).slice();
  for (const [id, b] of S.bolumler) {
    if (CAT.plans.has(id) || !b || !b.plan || typeof b.plan !== 'object') continue;
    if (Object.values(b.plan).some(a => Array.isArray(a) && a.includes(cid))) out.push(id);
  }
  return out;
}
const EL_NAMES = { 'Zorunlu': 'Zorunlu seçmeli', 'Kısıtlı': 'Kısıtlı seçmeli', 'Serbest': 'Serbest seçmeli', 'Bölüm': 'Bölüm seçmelisi', 'Alan': 'Alan seçmelisi', 'Tamamlayıcı': 'Tamamlayıcı seçmeli', 'Yabancı Dil': 'Yabancı dil seçmelisi', 'Extra': 'Ekstra seçmeli', 'Bilgisayar': 'Bilgisayar seçmelisi', 'Sanat': 'Sanat seçmelisi' };
/* Seçmeli hakkının ders havuzu (katalogda varsa), dersi seçmeli olarak sunan bölümler, hakkın adı */
function poolOf(e) { return e && e.length > 3 && e[3] >= 0 ? CAT.pools[e[3]] || null : null; }
const secmeliOf = cid => CAT.elOf.get(cid) || [];
const elName = e => (EL_NAMES[e[0]] || e[0] + ' seçmeli') + (e[4] ? ' ' + e[4] : '');
const CODE_COLL = (() => { try { return new Intl.Collator('en', { numeric: true }); } catch (e) { return { compare: (x, y) => (x < y ? -1 : x > y ? 1 : 0) }; } })();
const foldCache = new Map();
function foldName(s) {
  s = String(s || '');
  let v = foldCache.get(s);
  if (v === undefined) { if (foldCache.size > 8000) foldCache.clear(); foldCache.set(s, v = fold(s)); }
  return v;
}
const fmtKr = v => String(Math.round(v * 10) / 10).replace('.', ',');
/* Listelerde gösterilen yük: kredi biliniyorsa kredi, bilinmiyorsa (elle eklenen eski kayıtlar) AKTS */
const loadText = c => (c && c.kr != null ? `${fmtKr(c.kr)} kredi` : c && c.ects ? `${c.ects} AKTS` : '');
const LIST = { lim: 80 };
/* Kişisel anahtar (beğeni, bildirim, hoca puanı, "ben de", DersÖlçer oyu): claude.ai sürümünde hesabın özeti (S.me).
   Sitede her belge için ayrı takma ad: HMAC(kişisel gizli, '<koleksiyon>/<kimlik>'), sunucudaki yw_private.key_for ile aynı.
   Bir belgedeki anahtar başka bir belgedekine bağlanamaz; gizli yalnızca hesabın sahibinde (my_info). */
const keyCache = new Map();
function pk(col, id) {
  if (!S.supa) return S.me;
  if (!S.sec || !col || !id) return '';
  const p = col + '/' + id;
  let k = keyCache.get(p);
  if (k === undefined) { if (keyCache.size > 30000) keyCache.clear(); k = 'k' + window.YWSupa.hmacHex(S.sec, p).slice(0, 24); keyCache.set(p, k); }
  return k;
}
/* Belgenin kendi yolundan anahtar (sitede okunan her belgeye $k = '<koleksiyon>/<kimlik>' eklenir) */
function okey(o) {
  if (!S.supa) return S.me;
  const p = o && typeof o.$k === 'string' ? o.$k : '', i = p.indexOf('/');
  return i > 0 ? pk(p.slice(0, i), p.slice(i + 1)) : '';
}

/* Veri erişimi */
const likeCount = o => Object.values((o && o.likes) || {}).filter(v => v === true).length;
const likedByMe = o => { const k = okey(o); return !!(k && o && o.likes && o.likes[k] === true); };
/* Notlarda likes ▲ (yukarı), downs ▼ (aşağı) oylardır; aynı kişide ikisi birlikte olmaz */
const downCount = o => Object.values((o && o.downs) || {}).filter(v => v === true).length;
const voteScore = o => likeCount(o) - downCount(o);
const myVote = o => { const k = okey(o); if (!k || !o) return 0; return o.likes && o.likes[k] === true ? 1 : o.downs && o.downs[k] === true ? -1 : 0; };
/* Öne çıkan sıralaması: oy farkı + 1, notun yaşıyla (gün) yavaşça söner; ▼ alan not aşağı iner */
const hotScore = n => (voteScore(n) + 1) / Math.pow(Math.max(0, (Date.now() - (+(n && n.at) || 0)) / 864e5) + 2, 1.5);
const byHot = (a, b) => hotScore(b) - hotScore(a) || (b.at || 0) - (a.at || 0);
const byScore = (a, b) => voteScore(b) - voteScore(a) || (b.at || 0) - (a.at || 0);
const reportCount = o => { const ok = +((o && o.ok) || 0); return Object.values((o && o.reports) || {}).filter(t => typeof t === 'number' && t > ok).length; };
const reportedByMe = o => { const k = okey(o); return !!(k && o && o.reports && typeof o.reports[k] === 'number' && o.reports[k] > (+o.ok || 0)); };
const isHidden = o => reportCount(o) >= REPORT_LIMIT;
/* Benim paylaşımım mı: adıyla paylaşılanda yazar kimliği; sitede anonim paylaşımda yazarın o belgedeki anahtarı (byk) */
const isMine = o => !!o && ((!!o.by && o.by === S.me) || (S.supa && !!o.byk && o.byk === okey(o)));
const canManage = o => !!o && (isMine(o) || S.owner);
function codeOf(cid) {
  const c = S.courses.get(cid);
  if (c && c.code) return c.code;
  const m = /^([A-Z]+)(\d.*)$/.exec(String(cid || ''));
  return m ? m[1] + ' ' + m[2] : String(cid || '');
}
const courseName = cid => { const c = S.courses.get(cid); return (c && c.name) || ''; };
const hocaName = hid => { const h = S.hocas.get(hid); return h ? h.name : ''; };
const hocaFull = h => (h ? [h.title, h.name].filter(Boolean).join(' ') : '');
function gradesOf(c) {
  return Object.entries((c && c.grades) || {})
    .filter(([, v]) => v && typeof v === 'object' && GRADE_P[v.g] !== undefined)
    .map(([key, v]) => ({ key, g: v.g, tk: +v.tk || 0, h: v.h || '', at: +v.at || 0 }));
}
function distsOf(c) {
  return Object.entries((c && c.dists) || {})
    .filter(([, v]) => v && typeof v === 'object' && v.c && typeof v.c === 'object')
    .map(([key, v]) => {
      const counts = {};
      for (const { g } of GRADES) counts[g] = Math.max(0, Math.floor(+v.c[g] || 0));
      return { key, c: counts, tk: +v.tk || 0, h: v.h || '', at: +v.at || 0, by: v.by || '' };
    })
    .filter(d => Object.values(d.c).some(n => n > 0));
}
function ratingsOf(h) {
  return Object.entries((h && h.ratings) || {})
    .filter(([, r]) => r && typeof r === 'object' && CRIT.every(c => typeof r[c.k] === 'number' && r[c.k] >= 0.5 && r[c.k] <= 5))
    .map(([key, r]) => ({ key, a: r.a, o: r.o, n: r.n, d: r.d, c: r.c || '', tk: +r.tk || 0, at: +r.at || 0 }));
}
/* cnt: puan sayısı; a, o, n, d: kriter ortalamaları ("n" not verme kriteridir, sayı değil); all: genel ortalama */
function hocaStats(h) {
  const rs = ratingsOf(h), cnt = rs.length, out = { cnt };
  for (const c of CRIT) out[c.k] = cnt ? rs.reduce((s, r) => s + r[c.k], 0) / cnt : 0;
  out.all = cnt ? CRIT.reduce((s, c) => s + out[c.k], 0) / CRIT.length : 0;
  return out;
}
const emptyCounts = () => Object.fromEntries(GRADES.map(x => [x.g, 0]));
function distStats(counts) {
  let n = 0, sum = 0, fail = 0;
  for (const { g, p } of GRADES) { const c = +counts[g] || 0; n += c; sum += c * p; if (g === 'FF' || g === 'FA') fail += c; }
  return { n, avg: n ? sum / n : 0, fail, failPct: pct(fail, n) };
}
function nearestLetter(avg) { let best = GRADES[0]; for (const x of GRADES.slice(0, 8)) if (Math.abs(x.p - avg) < Math.abs(best.p - avg)) best = x; return best.g; }
function notesWhere(pred) { const out = []; for (const [id, n] of S.notes) if (n && pred(n)) out.push(Object.assign({ id }, n)); return out; }
function commentsWhere(pred) { const out = []; for (const [id, c] of S.comments) if (c && pred(c)) out.push(Object.assign({ id }, c)); return out; }
function commentCounts() {
  return memoized('cc', () => {
    const m = new Map();
    for (const c of S.comments.values()) { if (!c || isHidden(c)) continue; const k = c.tt + ':' + c.tid; m.set(k, (m.get(k) || 0) + 1); }
    return m;
  });
}
const commentCount = (tt, tid) => commentCounts().get(tt + ':' + tid) || 0;
function courseActivity() {
  return memoized('act', () => {
    const m = new Map();
    const add = (cid, k) => { if (!S.courses.has(cid)) return; const o = m.get(cid) || { notes: 0, grades: 0, comments: 0, total: 0 }; o[k]++; o.total++; m.set(cid, o); };
    for (const n of S.notes.values()) if (n && !isHidden(n)) add(n.cid, 'notes');
    for (const c of S.comments.values()) if (c && c.tt === 'course' && !isHidden(c)) add(c.tid, 'comments');
    return m;
  });
}
/* Ders ve hoca bağlantıları: kadrodaki verdiği dersler, yöneticinin eşlediği dersler, notlar, puanlar ve yorumlar.
   Her sürümde bir kez kurulur; son: dersi en son verdiği öğretim yılının başı (2024 = 2024-2025) */
function hocaLinks() {
  return memoized('hlinks', () => {
    const byC = new Map(), byH = new Map();
    const mk = () => ({ assigned: 0, notes: 0, grades: 0, ratings: 0, comments: 0, rs: [], son: 0 });
    const cell = (m, a, b) => { let x = m.get(a); if (!x) m.set(a, x = new Map()); let o = x.get(b); if (!o) x.set(b, o = mk()); return o; };
    const bump = (hid, cid, k, y, r) => {
      if (!hid || !cid || !S.hocas.has(hid) || !S.courses.has(cid)) return;
      const a = cell(byC, cid, hid), b = cell(byH, hid, cid);
      a[k]++; b[k]++;
      if (y) { if (y > a.son) a.son = y; if (y > b.son) b.son = y; }
      if (r) b.rs.push(r);
    };
    for (const [hid, h] of S.hocas) for (const d of (Array.isArray(h.dersler) ? h.dersler : [])) if (Array.isArray(d)) bump(hid, d[0], 'assigned', +d[1] || 0);
    for (const [cid, c] of S.courses) if (Array.isArray(c.hocas)) for (const hid of c.hocas) bump(hid, cid, 'assigned');
    for (const n of S.notes.values()) if (n) bump(n.h, n.cid, 'notes');
    for (const [hid, h] of S.hocas) for (const r of ratingsOf(h)) bump(hid, r.c, 'ratings', 0, r);
    for (const cm of S.comments.values()) {
      if (!cm) continue;
      if (cm.tt === 'course') bump(cm.h, cm.tid, 'comments');
      if (cm.tt === 'hoca') bump(cm.tid, cm.c, 'comments');
    }
    return { byC, byH };
  });
}
const NO_LINKS = new Map();
const hocasOfCourse = cid => hocaLinks().byC.get(cid) || NO_LINKS;
const coursesOfHoca = hid => hocaLinks().byH.get(hid) || NO_LINKS;
const yilAd = y => (y ? `${y}-${y + 1}` : '');
function searchAll(q) {
  const f = fold(q);
  if (!f) return [];
  const compact = f.replace(/\s+/g, ''), toks = f.split(' ');
  const out = [];
  for (const [id, c] of S.courses) {
    const codeF = id.toLowerCase(), nameF = foldName(c.name);
    let score = 0;
    if (codeF === compact) score = 100;
    else if (codeF.startsWith(compact)) score = 80;
    else if (toks.every(t => nameF.includes(t) || codeF.includes(t))) score = 50;
    if (score) out.push({ kind: 'course', id, score, label: c.code || codeOf(id), sub: c.name || 'Ders adı girilmemiş' });
  }
  for (const [id, h] of S.hocas) {
    const nf = fold(h.name);
    if (toks.every(t => nf.includes(t))) {
      const starts = nf.split(' ').some(w => w.startsWith(toks[0]));
      out.push({ kind: 'hoca', id, score: starts ? 60 : 40, label: h.name, sub: [h.title, h.dept].filter(Boolean).join(', ') });
    }
  }
  out.sort((a, b) => b.score - a.score || String(a.label).localeCompare(String(b.label), 'tr'));
  return out;
}
const looksLikeName = q => /[a-zçğıöşü]{2,}\s+[a-zçğıöşü]{2,}/i.test(String(q || '').trim()) && !parseCode(q);
function globalResults(q) {
  const res = searchAll(q);
  const cs = res.filter(r => r.kind === 'course').slice(0, 5), hs = res.filter(r => r.kind === 'hoca').slice(0, 5);
  const out = [];
  if (cs.length) out.push({ kind: 'group', label: 'Dersler' }, ...cs);
  if (hs.length) out.push({ kind: 'group', label: 'Hocalar' }, ...hs);
  const pc = parseCode(q);
  if (S.owner && pc && !S.courses.has(pc.id)) out.push({ kind: 'action', action: 'addCourse', code: pc.code, label: pc.code + ' dersini ekle' });
  else if (S.owner && looksLikeName(q) && !S.hocas.has(hocaSlug(q))) out.push({ kind: 'action', action: 'addHoca', name: q.trim(), label: '“' + niceName(q) + '” adlı hocayı ekle' });
  return out;
}
function goItem(it) {
  if (it.kind === 'course') { pushRecent(codeOf(it.id), '#/ders/' + it.id); location.hash = '#/ders/' + it.id; }
  else if (it.kind === 'hoca') { pushRecent(hocaName(it.id) || it.label || it.id, '#/hoca/' + it.id); location.hash = '#/hoca/' + it.id; }
  else if (it.action === 'addCourse') openAddCourse(it.code);
  else if (it.action === 'addHoca') openAddHoca(it.name);
}

/* ================= Hesaplar ve kubbe ================= */
/* S.out: bu cihazda kendi hesabından çıkmış (yönetici deneme hesaplarına geçerken). S.owner: yönetici yetkileri, yalnızca site sahibi kendi hesabındayken */
const myAcc = () => (S.out && !S.shared ? null : S.users.get(S.me) || null);
const syncOwner = () => { S.owner = !!S.ownerId && !S.shared && !S.out; };
const hasAcc = () => !!myAcc();
const userOf = uid => S.users.get(uid) || null;
function displayName(uid, anon, fallback) {
  if (anon) return 'Anonim';
  const u = userOf(uid);
  if (u && u.username) return u.username;
  return fallback && String(fallback).trim() ? String(fallback).trim() : 'Anonim';
}
function fullName(u) { return u ? [u.first, u.last].filter(Boolean).join(' ') : ''; }
function badgesHtml(u) {
  if (!u) return '';
  const minis = MARKET.filter(m => m.mini && ownsItem(u, m.id)).slice(0, 4).map(m => `<span class="badge-mini r-${m.rar}" title="${esc(m.name)}"><img src="${itemAvSrc(m.id)}" alt=""></span>`).join('');
  return (u.role === 'admin' ? '<span class="admin-tag">Yönetici</span>' : '') + minis;
}
function nameHtml(u, text) { return u && ownsItem(u, 'gunes-aurasi') ? `<span class="fx-glow">${esc(text)}</span>` : esc(text); }
/* Profil resmi: çizilmiş karakter (kayıtta emoji anahtarı, avArt), bir iki harf ya da marketten alınan ürün (animasyonlu); arka plan rengi serbest.
   avk: 'emoji' | 'harf' | 'urun' | 'foto' (eski yüklenmiş fotoğraflar görünmeye devam eder). Market efektleri (kanat, çerçeve, parlayan isim) ayrıca uygulanır */
const okHex = c => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);
const avColor = u => (u && okHex(u.color) ? u.color : AV_COLORS[0]);
function darkHex(c) { if (!okHex(c)) return false; const n = parseInt(c.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.55; }
const okHarf = h => typeof h === 'string' && /^[\p{L}\p{N}]{1,2}$/u.test(h);
function graphemes(t) { try { if (typeof Intl !== 'undefined' && Intl.Segmenter) return [...new Intl.Segmenter('tr', { granularity: 'grapheme' }).segment(t)].length; } catch (e) { /* yok */ } return Array.from(t).length > 8 ? 9 : 1; }
function okEmoji(e) { e = String(e || '').trim(); return !!e && e.length <= 20 && /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20E3/u.test(e) && graphemes(e) === 1; }
const avEmoji = u => (u && okEmoji(u.emoji) ? u.emoji.trim() : AV_EMOJI[0]);
function avKind(u) {
  if (!u) return 'emoji';
  if (u.avk === 'urun' && MARKET_BY_ID[u.urun] && ownsItem(u, u.urun)) return 'urun';
  if (u.avk === 'harf' && okHarf(u.harf)) return 'harf';
  if ((!u.avk || u.avk === 'foto') && typeof u.pic === 'string' && /^data:image\/(jpeg|webp|png);base64,/.test(u.pic)) return 'foto';
  return 'emoji';
}
const avFx = u => (ownsItem(u, 'cerceve-kubbe') ? ' framed' : '') + (ownsItem(u, 'selcuklu-kapi') ? ' fr-selcuklu' : '') + (ownsItem(u, 'kartal-kanatlari') ? ' fx-wings' : '');
function avFace(u, cls = '') {
  const k = avKind(u), bg = avColor(u);
  if (k === 'urun') return `<span class="avatar art ${cls}" data-bg="${esc(bg)}" aria-hidden="true"><img src="${itemAvSrc(u.urun)}" alt=""></span>`;
  if (k === 'foto') return `<span class="avatar pic ${cls}" aria-hidden="true"><img src="${esc(u.pic)}" alt=""></span>`;
  if (k === 'harf') return `<span class="avatar harf ${darkHex(bg) ? 'on-dark' : 'on-light'} ${cls}" data-bg="${esc(bg)}" aria-hidden="true">${esc(u.harf)}</span>`;
  return `<span class="avatar ${cls}" data-bg="${esc(bg)}" aria-hidden="true">${avArt(avEmoji(u))}</span>`;
}
function avatarHtml(uid, { anon = false, cls = '' } = {}) {
  if (anon) return `<span class="avatar anon ${cls}" aria-hidden="true">${gl('spy', 'av-art')}</span>`;
  const u = userOf(uid);
  if (!u) return `<span class="avatar ${cls}" aria-hidden="true">${gl('person', 'av-art')}</span>`;
  return avFace(u, cls + avFx(u));
}
/* Market ürününün çizimi profil resmi olarak: kendi animasyonlarıyla, ayrı bir SVG görseli (kimlikler sayfadaki çizimlerle çakışmaz) */
const AV_ART_CSS = '.spin{transform-box:view-box;transform-origin:60px 38px;animation:rays 18s linear infinite}.wag{transform-box:fill-box;transform-origin:0% 100%;animation:wag 1.1s ease-in-out infinite}.flap-l{transform-box:view-box;transform-origin:56px 62px;animation:flapL 2.4s ease-in-out infinite}.flap-r{transform-box:view-box;transform-origin:64px 62px;animation:flapR 2.4s ease-in-out infinite}.wave{transform-box:fill-box;transform-origin:0 50%;animation:wave 1.6s ease-in-out infinite}.glowline{animation:glowline 2s ease-in-out infinite}.shine{animation:shine 4s ease-in-out infinite}.steam{animation:steam 2.6s ease-in-out infinite}.steam.s2{animation-delay:1.1s}@keyframes rays{to{transform:rotate(360deg)}}@keyframes wag{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(10deg)}}@keyframes flapL{0%,100%{transform:rotate(0)}50%{transform:rotate(-8deg)}}@keyframes flapR{0%,100%{transform:rotate(0)}50%{transform:rotate(8deg)}}@keyframes wave{0%,100%{transform:skewY(0)}50%{transform:skewY(6deg) scaleX(.94)}}@keyframes glowline{0%,100%{opacity:.45}50%{opacity:1}}@keyframes shine{0%{transform:translateX(-12px);opacity:0}15%{opacity:.65}40%,100%{transform:translateX(90px);opacity:0}}@keyframes steam{0%{opacity:0;transform:translateY(6px)}40%{opacity:.6}100%{opacity:0;transform:translateY(-8px)}}@media (prefers-reduced-motion:reduce){*{animation:none!important}}';
const itemAvCache = new Map();
function itemAvSrc(id) {
  let src = itemAvCache.get(id);
  if (!src) { src = 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-14 -14 148 148"><style>${AV_ART_CSS}</style>${prodArt(id, 'v')}</svg>`); itemAvCache.set(id, src); }
  return src;
}
function currentTk(now = new Date()) { const l = termList(now); return l.length ? l[0] : 0; }
function termStartMs(tk) { const y = Math.floor(tk / 10), k = tk % 10; return (k === 1 ? new Date(y, 8, 1) : k === 2 ? new Date(y + 1, 1, 1) : new Date(y + 1, 6, 1)).getTime(); }
function kubbeStats() {
  return memoized('kubbe', () => {
    const m = new Map(), start = termStartMs(currentTk());
    const ent = uid => { let o = m.get(uid); if (!o) { o = ZK(); m.set(uid, o); } return o; };
    const add = (uid, pts, at, kind) => { if (!uid || !pts) return; const o = ent(uid); o.all += pts; if (at && at >= start) o.term += pts; if (kind) o[kind]++; };
    for (const [uid, u] of S.users) { const o = ent(uid), b = Math.max(0, +u.bonus || 0); o.all += b; if (u.at && u.at >= start) o.term += Math.min(b, KUBBE.signup); }
    for (const n of S.notes.values()) {
      if (!n || isHidden(n)) continue;
      const photos = Array.isArray(n.photos) ? n.photos.length : 0;
      add(n.by, KUBBE.note + (photos ? KUBBE.photos : 0), n.at, 'notes');
      const up = likeCount(n); if (up) { add(n.by, up * KUBBE.up, n.at); ent(n.by).ups += up; }   // ▼ kubbe almaz
    }
    for (const c of S.comments.values()) {
      if (!c || isHidden(c)) continue;
      add(c.by, KUBBE.comment, c.at, 'comments');
      const lk = likeCount(c); if (lk) { add(c.by, lk * KUBBE.like, c.at); ent(c.by).likes += lk; }
    }
    for (const h of S.hocas.values()) for (const r of ratingsOf(h)) add(r.key, KUBBE.rating, r.at, 'ratings');
    for (const r of S.requests.values()) if (r && r.done && r.doneBy && r.doneBy !== r.by) add(r.doneBy, KUBBE.fill, r.doneAt || r.at, 'fills');
    for (const c of S.courses.values()) {
    }
    return m;
  });
}
const ZK = () => ({ all: 0, term: 0, notes: 0, comments: 0, ratings: 0, grades: 0, likes: 0, ups: 0, fills: 0 });   // likes: yorum beğenisi, ups: not ▲
/* Sitede kubbe sunucuda sayılır. users.kb herkese açık: yalnızca adla yapılanlar (sıralama). private.kb yalnızca sahibine:
   hoca puanları ve anonim paylaşımlar dahil her şey (bakiye). Böylece puanlar ve anonim paylaşımlar kimseye bağlanamaz. */
function kbNorm(k) {
  const o = ZK();
  if (!k || typeof k !== 'object') return o;
  for (const f of Object.keys(o)) o[f] = Math.max(0, +k[f] || 0);
  if (!(+k.ts >= termStartMs(currentTk()) - 2 * 864e5)) o.term = 0;   // yeni dönem başladı, sunucu henüz yeniden saymadı
  return o;
}
const kbPub = uid => kbNorm((userOf(uid) || {}).kb);
const kubbeOf = uid => (S.supa ? (uid === S.me && S.priv && S.priv.kb ? kbNorm(S.priv.kb) : kbPub(uid)) : (kubbeStats().get(uid) || ZK()));
const rankVal = (uid, kind) => (S.supa ? kbPub(uid)[kind] : kubbeOf(uid)[kind]);
const spentOf = uid => { const u = userOf(uid); return Math.max(0, +(u && u.spent) || 0); };
/* Hediye kubbe (yönetimin verdiği): bakiyeye eklenir, harcanır; sıralamaya ve "kazandın" toplamına sayılmaz */
const giftOf = uid => { const u = userOf(uid); return Math.max(0, +(u && u.gift) || 0); };
const balanceOf = uid => Math.max(0, kubbeOf(uid).all + giftOf(uid) - spentOf(uid));
function ranking(kind) {
  return memoized('rank-' + kind, () => {
    const out = [];
    for (const [uid, u] of S.users) if (u && u.role !== 'admin') out.push({ uid, u, val: rankVal(uid, kind) });
    out.sort((a, b) => b.val - a.val || String(a.u.username || '').localeCompare(String(b.u.username || ''), 'tr'));
    out.forEach((x, i) => { x.rank = i + 1; });
    return out;
  });
}
const rankOf = (uid, kind) => { const r = ranking(kind).find(x => x.uid === uid); return r ? r.rank : 0; };
const ownsItem = (u, id) => !!(u && u.items && u.items[id]);

/* ================= Başlatma ================= */
let view = null, rafPending = false;
function changed() {
  if (rafPending) return;
  rafPending = true;
  const run = () => {
    rafPending = false;
    maybeProvisionAdmin();
    const g = gateState();
    if (g !== lastGate) {
      if (curWait || !PUBLIC.has(curKey)) { route(); return; }
      lastGate = g;
    }
    try { if (view && view.refresh) view.refresh(); } catch (e) { console.error(e); } renderChrome();
  };
  if (typeof requestAnimationFrame === 'function' && !document.hidden) requestAnimationFrame(run); else setTimeout(run, 16);
}
function subscribe() {
  const sub = (name, q) => {
    try {
      q.onSnapshot(snap => {
        const m = new Map();
        for (const d of snap.docs) { const v = d.data(); if (v && typeof v === 'object') { if (S.supa) v.$k = name + '/' + d.id; m.set(d.id, v); } }
        if (name === 'courses') { S.dbCourses = m; S.courses = mergeCourses(m); } else if (name === 'hocas') { S.dbHocas = m; S.hocas = mergeHocas(m); } else if (name === 'bolumler') { S.dbBolumler = m; S.bolumler = mergeBolumler(m); } else S[name] = m;
        S.loaded[name] = true; S.version++; if (name === 'users') S.usersVer++; changed();
      }, err => {
        console.error(name, err);
        S.loaded[name] = true; S.subErr = (err && err.code) || 'error'; S.version++; changed();
      });
    } catch (e) { console.error(e); S.loaded[name] = true; S.subErr = 'error'; }
  };
  sub('courses', S.db.collection('courses'));
  sub('hocas', S.db.collection('hocas'));
  sub('notes', S.db.collection('notes').orderBy('at', 'desc').limit(1000));
  sub('comments', S.db.collection('comments').orderBy('at', 'desc').limit(1000));
  sub('users', S.db.collection('users'));
  sub('bolumler', S.db.collection('bolumler'));
  sub('requests', S.db.collection('requests').orderBy('at', 'desc').limit(500));
  if (S.supa) sub('zor', S.db.collection('zor'));
  subPriv();
}
/* Yeni sürüm: yayından sonra açık kalan sekmeler eski kodla kalmasın. Sekmeye dönünce /ver.txt'ye bakılır; yenisi varsa
   bir sonraki sayfa geçişinde sayfa sessizce yenilenir (adres korunur). Aynı sürüm için yalnızca bir kez denenir. */
const VER = { cur: typeof window.YW_VER === 'string' ? window.YW_VER : '', next: '', at: 0 };
async function checkVer() {
  if (!S.supa || !/^[0-9a-f]{12}$/.test(VER.cur) || VER.next || typeof fetch !== 'function' || Date.now() - VER.at < 60e3) return;
  VER.at = Date.now();
  try {
    const r = await fetch('/ver.txt?t=' + Date.now(), { cache: 'no-store' });
    const v = r && r.ok ? String(await r.text()).trim() : '';
    if (/^[0-9a-f]{12}$/.test(v) && v !== VER.cur) VER.next = v;
  } catch (e) { /* çevrimdışı */ }
}
function verReload() {
  if (!VER.next) return false;
  let tried = '';
  try { tried = sessionStorage.getItem('yw:verReload') || ''; } catch (e) { /* yok */ }
  if (tried === VER.next) return false;
  try { sessionStorage.setItem('yw:verReload', VER.next); } catch (e) { return false; }
  location.reload();
  return true;
}
async function init() {
  window.addEventListener('hashchange', () => { if (!verReload()) route(); });
  if (!(window.claude && typeof window.claude.use === 'function') && window.YW_SUPA && window.supabase && window.YWSupa) { S.supa = true; S.authPending = true; }
  route();
  if (S.supa) {
    document.addEventListener('visibilitychange', () => { if (!document.hidden) checkVer(); });
    window.addEventListener('focus', () => checkVer());
    setInterval(() => { if (!document.hidden) checkVer(); }, 10 * 60e3);
    await initSupa(); return;
  }
  const c = window.claude;
  const use = async name => { try { return c && typeof c.use === 'function' ? await c.use(name) : null; } catch (e) { return null; } };
  const [db, user, downloads] = await Promise.all([use('db'), use('user'), use('downloads')]);
  S.user = user; S.downloads = downloads;
  if (user) {
    try { S.ownerId = !!(await user.isOwner()); } catch (e) { /* yok */ }
    try { S.canWrite = await user.can('data.write'); } catch (e) { /* yok */ }
    try { const id = await user.id(); if (id) { S.rawId = String(id); S.me = await sha('yediwiki|' + id); } } catch (e) { /* yok */ }
  }
  if (!S.me) { let k = ls.get('anon', null); if (!k) { k = 'l' + randId(18); ls.set('anon', k); } S.me = k; }
  S.baseMe = S.me;
  S.out = ls.get('out', null) === S.baseMe;
  { const as = ls.get('as', null); if (as) { S.me = String(as); S.shared = true; } }
  syncOwner();
  S.roWhy = !user ? 'nouser' : (S.canWrite === false ? 'nowrite' : '');
  if (S.roWhy) S.readOnly = true;
  if (!db) { S.dbState = 'none'; S.version++; changed(); return; }
  S.db = db; S.dbState = 'ok';
  subscribe();
  loadLogin();
  S.version++; changed();
}

/* ================= Site sürümü: Supabase =================
   Oturum Supabase Auth'ta: öğrenciler okul e-postasına gelen kodla, yönetici ve ortak deneme hesabı şifreyle girer.
   S.me = hesabın kimliği (girişsizken bu cihaza özel yerel kimlik), S.sec = belge anahtarları için kişisel gizli. */
const anonLocalId = () => { let k = ls.get('anon', null); if (!k) { k = 'l' + randId(18); ls.set('anon', k); } return k; };
async function initSupa() {
  const cfg = window.YW_SUPA || {};
  let sb = null;
  try { sb = window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }); }
  catch (e) { console.error(e); }
  if (!sb) { S.authPending = false; S.dbState = 'none'; S.version++; changed(); return; }
  S.sb = sb; S.canWrite = true;
  S.db = window.YWSupa.makeDb(sb, { onLive: up => {
    if (up) { S.liveSeen = true; if (S.subErr === 'live') { S.subErr = null; renderChrome(); } }
    else if (S.liveSeen && !S.subErr) { S.subErr = 'live'; renderChrome(); }
  } });
  S.dbState = 'ok';
  let session = null;
  try { const r = await sb.auth.getSession(); session = r && r.data ? r.data.session : null; } catch (e) { /* oturum yok */ }
  await applySession(session, true);
  try { sb.auth.onAuthStateChange((ev, ses) => { if (ev !== 'INITIAL_SESSION') setTimeout(() => applySession(ses), 0); }); } catch (e) { /* yok */ }
  subscribe();
  S.version++; changed();
}
async function applySession(session, first) {
  const uid = session && session.user ? String(session.user.id) : '';
  S.session = session || null;
  if (!first && uid === S.sesUid) return;   // yalnızca oturum anahtarı yenilendi
  S.sesUid = uid;
  S.email = session && session.user ? String(session.user.email || '') : '';
  S.me = uid || anonLocalId(); S.baseMe = S.me;
  S.sec = ''; S.ownerId = false; keyCache.clear(); syncOwner();
  S.authPending = !!uid;
  if (!first) subPriv();
  S.version++; changed();
  if (!uid) return;
  try {
    const { data, error } = await S.sb.rpc('my_info');
    if (S.me !== uid) return;
    if (!error && data) { S.sec = String(data.sec || ''); S.ownerId = !!data.admin; }
    else if (error) console.error(error);
  } catch (e) { console.error(e); }
  if (S.me !== uid) return;
  S.authPending = false; keyCache.clear(); syncOwner(); S.version++; changed();
}
async function siteLogout() {
  try { await S.sb.auth.signOut({ scope: 'local' }); } catch (e) { /* yine de çık */ }
  await applySession(null);
  toast('Çıkış yapıldı.');
  if (location.hash !== '#/') location.hash = '#/'; else route();
}
/* Supabase giriş hatalarının Türkçesi */
function authErrTr(e) {
  const code = String((e && e.code) || ''), msg = String((e && e.message) || ''), st = +(e && e.status) || 0;
  const sec = /after (\d+) seconds?/i.exec(msg);
  if (sec) return `Yeni kod için ${sec[1]} saniye bekle.`;
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || st === 429) return 'Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.';
  if (code === 'otp_expired' || /expired|invalid.*(token|otp)|token.*invalid/i.test(msg)) return 'Kod hatalı ya da süresi dolmuş. Yeni kod iste.';
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(msg)) return 'E-posta ya da şifre hatalı.';
  if (code === 'email_address_not_authorized') return 'E-posta gönderimi henüz açılmadı. Site yönetimine haber ver.';
  if (code === 'email_address_invalid') return 'Bu e-posta adresi geçersiz.';
  if (code === 'signup_disabled' || code === 'otp_disabled') return 'Yeni hesap açma şu an kapalı.';
  if (code === 'email_not_confirmed') return 'Bu hesabın e-postası henüz doğrulanmamış.';
  if (code === 'unexpected_failure' || /database error/i.test(msg)) return `Yalnızca ${MAIL_DOMAIN} uzantılı okul e-postasıyla giriş yapılır.`;
  if (!st || /fetch|network/i.test(msg)) return 'Bağlantı sorunu. İnternetini kontrol edip tekrar dene.';
  return 'Giriş yapılamadı. Biraz sonra tekrar dene.';
}
async function sendOtp(email) {
  try { const { error } = await S.sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } }); return error ? authErrTr(error) : ''; }
  catch (e) { return authErrTr(e); }
}

/* ================= Hata yönetimi ================= */
function dbErrMsg(e) {
  if (e && e.msgTr) return e.msgTr;
  const code = e && e.code;
  if (code === 'invalid_argument') return S.canWrite === true ? 'Kayıt reddedildi. Girdiğin bilgileri kontrol edip tekrar dene.' : 'Bu sayfada yalnızca görüntüleme iznin var.';
  if (code === 'resource_exhausted') return 'Çok hızlı işlem yapıldı. Birkaç saniye bekleyip tekrar dene.';
  if (code === 'quota_exceeded') return 'Sitenin kayıt sınırı doldu. Site yöneticisine haber ver.';
  if (code === 'revoked' || code === 'not_granted' || code === 'capability_disabled' || code === 'capability_removed') return 'Veri bağlantısı kapandı. Sayfayı yenile.';
  if (code === 'unavailable') return 'Bağlantı sorunu. Biraz sonra tekrar dene.';
  if (code === 'unauthenticated') return 'Oturumun kapanmış görünüyor. Yeniden giriş yap.';
  if (code === 'no_identity') return 'Hesap açmak için claude.ai oturumun tanınmalı. Sayfayı yenileyip tekrar dene.';
  return 'İşlem tamamlanamadı. Tekrar dene.';
}
function noteWriteFail(e) {
  if (!S.supa && e && e.code === 'invalid_argument' && S.canWrite !== true) { S.readOnly = true; renderChrome(); }
}
function guardWrite() {
  if (!S.db) { toast(S.supa ? 'Veri bağlantısı kurulamadı. İnternetini kontrol edip sayfayı yenile.' : 'Veri bağlantısı yok. YediWiki kayıtları yalnızca claude.ai içinde açıldığında çalışır.', 'err'); return false; }
  if (S.readOnly) { toast(S.roWhy === 'nouser' ? 'Yazmak için davetin geldiği e-postayla claude.ai’ye giriş yapıp sayfayı yeniden aç.' : 'Yazma iznin yok. Editor olarak davet edildiysen sayfayı yenile.', 'err'); return false; }
  return true;
}
async function write(fn, okMsg) {
  if (!guardWrite()) return false;
  try { await fn(); if (okMsg) toast(okMsg); return true; }
  catch (e) {
    if (e && e.code === 'unavailable') {
      await sleep(600 + Math.random() * 700);
      try { await fn(); if (okMsg) toast(okMsg); return true; } catch (e2) { e = e2; }
    }
    console.error(e); noteWriteFail(e); toast(dbErrMsg(e), 'err'); return false;
  }
}
async function retrying(fn) {
  try { return await fn(); }
  catch (e) { if (e && e.code === 'unavailable') { await sleep(600 + Math.random() * 700); return fn(); } throw e; }
}

/* ================= Arayüz parçaları ================= */
function toast(msg, kind = '', ico = '') {
  const box = $('#toasts');
  if (!box) return;
  const el = document.createElement('div');
  el.className = 'toast' + (kind ? ' ' + kind : '');
  el.textContent = msg;
  if (ico) el.insertAdjacentHTML('afterbegin', `<span class="toast-ico">${ico}</span>`);
  box.appendChild(el);
  const km = kind !== 'err' && /\+(\d+) kubbe/.exec(msg); if (km) kubbeFloat(+km[1]);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, kind === 'err' ? 4600 : 3000);
}
let modalStack = [];
function openModal({ title, sub = '', body, focusClose = false }) {
  const back = document.createElement('div');
  back.className = 'modal-back';
  const tid = 'm-' + randId(6);
  back.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="${tid}">
    <div class="modal-head"><h2 id="${tid}">${esc(title)}</h2><button type="button" class="iconbtn" data-close aria-label="Kapat">${icon('x')}</button></div>
    ${sub ? `<p class="modal-sub">${esc(sub)}</p>` : ''}<div class="modal-body">${body}</div></div>`;
  const prevFocus = document.activeElement;
  document.body.appendChild(back);
  document.body.classList.add('no-scroll');
  const m = { el: back.querySelector('.modal'), back, closed: false, onClose: null };
  m.close = () => {
    if (m.closed) return;
    m.closed = true; back.remove();
    modalStack = modalStack.filter(x => x !== m);
    if (!modalStack.length && $('#lightbox').hidden) document.body.classList.remove('no-scroll');
    if (m.onClose) m.onClose();
    if (prevFocus && prevFocus.focus && document.contains(prevFocus)) { try { prevFocus.focus({ preventScroll: true }); } catch (e) { /* yok */ } }
  };
  back.addEventListener('mousedown', e => { if (e.target === back) m.close(); });
  back.addEventListener('click', e => { const c = e.target.closest('[data-close]'); if (c) { if (!c.getAttribute('href')) e.preventDefault(); m.close(); } });   // bağlantıysa (ör. Yenilikler'deki “Dene”) gideceği yere gitsin
  modalStack.push(m);
  const first = focusClose ? null : m.el.querySelector('.modal-body input:not([type=hidden]):not([type=radio]), .modal-body select, .modal-body textarea, .modal-body [tabindex="0"], .modal-body button');
  setTimeout(() => { try { (first || m.el.querySelector('[data-close]')).focus({ preventScroll: true }); } catch (e) { /* yok */ } }, 30);
  return m;
}
function closeAllModals() { [...modalStack].forEach(m => m.close()); }
function confirmModal({ title, text, ok = 'Tamam', danger = false }) {
  return new Promise(resolve => {
    let done = false;
    const m = openModal({ title, body: `<p class="muted">${esc(text)}</p><div class="modal-foot"><button type="button" class="btn btn-ghost" data-close>Vazgeç</button><button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(ok)}</button></div>` });
    m.onClose = () => { if (!done) { done = true; resolve(false); } };
    m.el.querySelector('[data-ok]').addEventListener('click', () => { done = true; m.close(); resolve(true); });
    setTimeout(() => { const b = m.el.querySelector('[data-ok]'); if (b) b.focus(); }, 40);
  });
}
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!$('#lightbox').hidden) { closeLightbox(); return; }
  if (modalStack.length) {
    const top = modalStack[modalStack.length - 1];
    const lst = top.el.querySelector('.cb-list:not([hidden])');
    if (lst) return;
    top.close();
    return;
  }
  if (nfPop()) closeNotifs(true);
});

function combobox(input, { source, onPick }) {
  const wrap = input.closest('.cb-wrap') || input.parentElement;
  const list = document.createElement('ul');
  const lid = 'cb-' + randId(6);
  list.id = lid; list.className = 'cb-list'; list.setAttribute('role', 'listbox'); list.hidden = true;
  wrap.appendChild(list);
  input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false'); input.setAttribute('aria-controls', lid); input.setAttribute('autocomplete', 'off');
  let items = [], sel = [], active = -1;
  const open = () => { list.hidden = false; input.setAttribute('aria-expanded', 'true'); };
  const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; };
  function render() {
    if (!items.length) { list.innerHTML = ''; close(); return; }
    const q = input.value;
    sel = [];
    list.innerHTML = items.map((it, i) => {
      if (it.kind === 'group') return `<li class="cb-group" role="presentation">${esc(it.label)}</li>`;
      const si = sel.length; sel.push(i);
      const a = `id="${lid}-${si}" role="option" aria-selected="${si === active}" data-si="${si}"`;
      if (it.kind === 'action') return `<li ${a} class="cb-item cb-action">${icon('plus')}<span>${esc(it.label)}</span></li>`;
      if (it.kind === 'course') return `<li ${a} class="cb-item"><span class="code">${hl(it.label, q)}</span><span class="cb-text"><span>${hl(it.sub || '', q)}</span></span></li>`;
      return `<li ${a} class="cb-item"><span class="avatar">${esc(initials(it.label))}</span><span class="cb-text"><span>${hl(it.label, q)}</span>${it.sub ? `<span class="sub">${esc(it.sub)}</span>` : ''}</span></li>`;
    }).join('');
    open();
    if (active >= 0) input.setAttribute('aria-activedescendant', lid + '-' + active); else input.removeAttribute('aria-activedescendant');
  }
  function update() { items = input.value.trim() ? source(input.value) : []; active = -1; render(); }
  function move(d) {
    if (!sel.length) return;
    active = active < 0 ? (d > 0 ? 0 : sel.length - 1) : (active + d + sel.length) % sel.length;
    render();
    const el = document.getElementById(lid + '-' + active);
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }
  function pick(si) { const it = items[sel[si]]; if (!it) return; close(); onPick(it); }
  input.addEventListener('input', update);
  input.addEventListener('focus', () => { if (input.value.trim()) update(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (list.hidden) update(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') { if (!list.hidden && active >= 0) { e.preventDefault(); pick(active); } }
    else if (e.key === 'Escape') { if (!list.hidden) { e.preventDefault(); e.stopPropagation(); close(); } }
  });
  input.addEventListener('blur', () => setTimeout(close, 150));
  list.addEventListener('mousedown', e => e.preventDefault());
  list.addEventListener('click', e => { const li = e.target.closest('[data-si]'); if (li) pick(+li.dataset.si); });
  return { update, close };
}
function starsHtml(v, size = '') {
  const w = clamp((v / 5) * 100, 0, 100);
  return `<span class="stars ${size}" role="img" aria-label="5 üzerinden ${fmt1(v)}"><i data-w="${w.toFixed(1)}"></i></span>`;
}
function starInput(el, initial, onChange) {
  let v = initial || 0, hover = 0;
  const fill = el.querySelector('i');
  const paint = () => {
    const show = hover || v;
    fill.style.width = (show / 5) * 100 + '%';
    el.setAttribute('aria-valuenow', String(v || 0));
    el.setAttribute('aria-valuetext', v ? fmt1(v) + ' yıldız' : 'Puan verilmedi');
    el.classList.toggle('is-hover', !!hover && hover !== v);
  };
  const at = e => { const r = el.getBoundingClientRect(); if (!(r.width > 0)) return 5; return clamp(Math.ceil(((e.clientX - r.left) / r.width) * 10) / 2, 0.5, 5); };
  const set = nv => { v = nv; hover = 0; paint(); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); onChange(v); };
  el.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { hover = at(e); paint(); } });
  el.addEventListener('pointerleave', () => { hover = 0; paint(); });
  el.addEventListener('click', e => set(at(e)));
  el.addEventListener('keydown', e => {
    const d = { ArrowRight: 0.5, ArrowUp: 0.5, ArrowLeft: -0.5, ArrowDown: -0.5 }[e.key];
    if (d) { e.preventDefault(); set(clamp((v || 0) + d, 0.5, 5)); }
    else if (e.key === 'Home') { e.preventDefault(); set(0.5); }
    else if (e.key === 'End') { e.preventDefault(); set(5); }
  });
  paint();
  return { get value() { return v; } };
}
const loadingHtml = (t = 'Yükleniyor') => `<div class="loading"><span class="hills" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>${esc(t)}</div>`;
function emptyHtml(title, text, action = '') { return `<div class="empty"><h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}${action}</div>`; }
function noDbHtml() { return emptyHtml('Veri bağlantısı yok', S.supa ? 'Sunucuya ulaşılamadı. İnternetini kontrol edip sayfayı yenile.' : 'YediWiki kayıtları yalnızca sayfa claude.ai içinde açıldığında görünür.'); }

/* Fotoğraflar */
function getPhoto(id) {
  if (!okId(id) || !S.db || S.supa) return Promise.resolve(null);
  if (S.photoCache.has(id)) return S.photoCache.get(id);
  const p = (async () => {
    const snap = await retrying(() => S.db.doc('photos/' + id).get());
    const d = snap && snap.exists ? snap.data() : null;
    return d && typeof d.data === 'string' && /^data:image\/(jpeg|webp|png);base64,[A-Za-z0-9+/=]+$/.test(d.data) ? d.data : null;
  })();
  S.photoCache.set(id, p);
  p.catch(() => S.photoCache.delete(id));
  return p;
}
let photoIO = null;
function loadImgPhoto(img) {
  if (img.dataset.loaded) return;
  img.dataset.loaded = '1';
  getPhoto(img.dataset.photo).then(u => { if (u) img.src = u; else img.alt = 'Fotoğraf yüklenemedi'; }).catch(() => { img.alt = 'Fotoğraf yüklenemedi'; });
}
function lazyPhotos(root) {
  const imgs = $$('img[data-photo]', root).filter(i => !i.dataset.loaded);
  if (!imgs.length) return;
  if (typeof IntersectionObserver !== 'function') { imgs.forEach(loadImgPhoto); return; }
  if (!photoIO) photoIO = new IntersectionObserver(ents => ents.forEach(en => { if (en.isIntersecting) { photoIO.unobserve(en.target); loadImgPhoto(en.target); } }), { rootMargin: '200px' });
  imgs.forEach(i => photoIO.observe(i));
}
function dataUrlToBlob(u) {
  const m = /^data:([^;]+);base64,(.*)$/.exec(u);
  const bin = atob(m[2]);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: m[1] });
}

/* Işık kutusu */
const LB = { ids: [], i: 0, name: 'not', sx: null };
function openLightbox(ids, i = 0, name = 'not') {
  LB.ids = ids.filter(okId); LB.i = clamp(i, 0, Math.max(0, LB.ids.length - 1)); LB.name = name;
  if (!LB.ids.length) return;
  const el = $('#lightbox');
  el.hidden = false; document.body.classList.add('no-scroll');
  renderLB();
  setTimeout(() => { const b = $('[data-lb=close]'); if (b) b.focus(); }, 30);
}
function closeLightbox() {
  const el = $('#lightbox');
  el.hidden = true;
  if (!modalStack.length) document.body.classList.remove('no-scroll');
}
function renderLB() {
  const img = $('[data-lb=img]'), msg = $('[data-lb=msg]');
  const n = LB.ids.length, id = LB.ids[LB.i];
  $('[data-lb=count]').textContent = `Sayfa ${LB.i + 1} / ${n}`;
  $('[data-lb=prev]').disabled = LB.i <= 0;
  $('[data-lb=next]').disabled = LB.i >= n - 1;
  $('[data-lb=dl]').hidden = !S.downloads;
  img.removeAttribute('src'); img.alt = ''; msg.textContent = 'Yükleniyor…';
  const want = id;
  getPhoto(id).then(u => {
    if (LB.ids[LB.i] !== want) return;
    if (u) { img.src = u; img.alt = `Not sayfası ${LB.i + 1}`; msg.textContent = ''; } else msg.textContent = 'Bu sayfa yüklenemedi.';
  }).catch(() => { msg.textContent = 'Bu sayfa yüklenemedi.'; });
}
function lbMove(d) { const ni = LB.i + d; if (ni < 0 || ni >= LB.ids.length) return; LB.i = ni; renderLB(); }
async function lbDownload() {
  if (!S.downloads) return;
  try {
    const u = await getPhoto(LB.ids[LB.i]);
    if (!u) { toast('Bu sayfa indirilemedi.', 'err'); return; }
    const ext = u.startsWith('data:image/webp') ? 'webp' : u.startsWith('data:image/png') ? 'png' : 'jpg';
    const safe = fold(LB.name).replace(/\s+/g, '-').slice(0, 40) || 'not';
    await S.downloads.save({ filename: `yediwiki-${safe}-sayfa-${LB.i + 1}.${ext}`, data: dataUrlToBlob(u) });
  } catch (e) {
    if (e && e.code === 'declined') return;
    toast('İndirme başlatılamadı.', 'err');
  }
}
function wireLightbox() {
  const el = $('#lightbox');
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-lb]');
    if (!b) return;
    const k = b.dataset.lb;
    if (k === 'close') closeLightbox(); else if (k === 'prev') lbMove(-1); else if (k === 'next') lbMove(1); else if (k === 'dl') lbDownload();
  });
  document.addEventListener('keydown', e => {
    if (el.hidden) return;
    if (e.key === 'ArrowLeft') lbMove(-1); else if (e.key === 'ArrowRight') lbMove(1);
  });
  const stage = $('[data-lb=stage]');
  stage.addEventListener('pointerdown', e => { LB.sx = e.clientX; });
  stage.addEventListener('pointerup', e => { if (LB.sx == null) return; const dx = e.clientX - LB.sx; LB.sx = null; if (Math.abs(dx) > 50) lbMove(dx < 0 ? 1 : -1); });
}
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); toast('Link kopyalandı'); return; } catch (e) { /* yedek yol */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove();
    toast(ok ? 'Link kopyalandı' : 'Kopyalanamadı. Linki elle seçip kopyala.', ok ? '' : 'err');
  } catch (e) { toast('Kopyalanamadı. Linki elle seçip kopyala.', 'err'); }
}

/* ================= Yazma işlemleri ================= */
async function ensureCourse(pc, name = '', dept = '') {
  if (S.courses.has(pc.id)) return;
  const ref = S.db.doc('courses/' + pc.id);
  const snap = await retrying(() => ref.get());
  if (snap && snap.exists) return;
  await retrying(() => ref.set({ code: pc.code, name: String(name || '').trim().slice(0, 120), dept: String(dept || '').trim().slice(0, 120), at: Date.now(), by: S.me, grades: {}, dists: {} }));
}
async function ensureHoca(name, title = '', dept = '') {
  const slug = hocaSlug(name);
  if (!slug || !okId(slug)) throw { code: 'invalid_argument' };
  if (S.hocas.has(slug)) return slug;
  const ref = S.db.doc('hocas/' + slug);
  const snap = await retrying(() => ref.get());
  if (snap && snap.exists) return slug;
  await retrying(() => ref.set({ name: niceName(name).slice(0, 80), title: TITLES.includes(title) ? title : '', dept: String(dept || '').trim().slice(0, 120), at: Date.now(), by: S.me, ratings: {} }));
  return slug;
}
/* Kadrodan gelen hocanın veritabanında kaydı olmayabilir: ilk puan ya da düzeltmede kayıt açılır */
async function hocaUpdate(hid, patch) {
  const ref = S.db.doc('hocas/' + hid);
  if (S.dbHocas.has(hid)) return ref.update(patch);
  let snap = null;
  try { snap = await ref.get(); } catch (e) { /* yok */ }
  if (snap && snap.exists) return ref.update(patch);
  const body = JSON.parse(JSON.stringify(patch, (k, v) => (v === null ? undefined : v)));
  return ref.set(Object.assign({ at: Date.now(), kadro: true }, body));
}
function matchHoca(text) {
  const t = String(text || '').trim();
  if (!t) return '';
  const slug = hocaSlug(t);
  if (S.hocas.has(slug)) return slug;
  const f = fold(stripTitle(t));
  for (const [id, h] of S.hocas) if (fold(h.name) === f) return id;
  return null;
}
function detectTitle(raw) {
  const m = TITLE_RE.exec(String(raw || ''));
  if (!m) return '';
  const f = fold(m[1]).replace(/\s+/g, '');
  return ({ profdr: 'Prof. Dr.', docdr: 'Doç. Dr.', drogruyesi: 'Dr. Öğr. Üyesi', ogrgordr: 'Öğr. Gör. Dr.', ogrgor: 'Öğr. Gör.', arsgordr: 'Arş. Gör. Dr.', arsgor: 'Arş. Gör.' })[f] || '';
}
function needAcc() {
  if (!guardWrite()) return false;
  if (hasAcc()) return true;
  openAuth();
  return false;
}
function toggleLike(col, id) {
  const o = (col === 'notes' ? S.notes : S.comments).get(id);
  if (!o || !okId(id)) return;
  if (isMine(o)) { toast('Kendi paylaşımını beğenemezsin.'); return; }
  if (!needAcc()) return;
  const next = !likedByMe(o);
  write(() => S.db.doc(col + '/' + id).update({ likes: { [pk(col, id)]: next } }));
}
/* Not oyu: ▲ (1) ya da ▼ (-1); aynısına yeniden basınca geri alınır. ▲ yazara 1 kubbe, ▼ yalnızca sıralamada aşağı iter */
function voteNote(id, dir, el) {
  const n = S.notes.get(id);
  if (!n || !okId(id)) return;
  if (isMine(n)) { toast('Kendi notuna oy veremezsin.'); return; }
  if (!needAcc()) return;
  const k = pk('notes', id);
  if (!k) return;
  const next = myVote(n) === dir ? 0 : dir;
  if (next === 1 && el && !reduceMotion()) { const [x, y] = centerOf(el); burst(x, y, { glyphs: ['up', '+1'], n: 6, cls: 'up', spread: 44 }); }
  write(() => S.db.doc('notes/' + id).update({ likes: { [k]: next === 1 ? true : null }, downs: { [k]: next === -1 ? true : null } }));
}
function voteHtml(n, { big = false } = {}) {
  const v = myVote(n), sc = voteScore(n), id = esc(n.id);
  return `<span class="vote${big ? ' big' : ''}${v > 0 ? ' is-up' : v < 0 ? ' is-down' : ''}" role="group" aria-label="Not oyu, puan ${sc}">`
    + `<button type="button" class="vbtn vup" data-g="vote-up" data-id="${id}" aria-pressed="${v > 0}" aria-label="Yukarı oy: işime yaradı" title="İşime yaradı">${icon('vup')}</button>`
    + `<b class="vnum">${sc}</b>`
    + `<button type="button" class="vbtn vdown" data-g="vote-down" data-id="${id}" aria-pressed="${v < 0}" aria-label="Aşağı oy: işe yaramadı" title="İşe yaramadı">${icon('vdown')}</button></span>`;
}
const voteBadge = n => { const sc = voteScore(n); return sc ? `<span class="vscore${sc < 0 ? ' neg' : ''}">${gl(sc > 0 ? 'up' : 'down')}${Math.abs(sc)}</span>` : ''; };
async function reportItem(col, id) {
  const o = (col === 'notes' ? S.notes : S.comments).get(id);
  if (!o || !okId(id)) return;
  if (isMine(o)) { toast('Kendi paylaşımını bildiremezsin; istersen silebilirsin.'); return; }
  if (reportedByMe(o)) { toast('Bu içeriği zaten bildirdin.'); return; }
  if (!needAcc()) return;
  const ok = await confirmModal({ title: 'Uygunsuz içerik bildir', text: 'Hakaret, kişisel bilgi, telifli kitap ya da alakasız içerik mi? Üç bildirim alan içerik otomatik gizlenir ve moderatör inceler.', ok: 'Bildir', danger: true });
  if (!ok) return;
  write(() => S.db.doc(col + '/' + id).update({ reports: { [pk(col, id)]: Date.now() } }), 'Bildirimin alındı, teşekkürler.');
}
async function deleteNote(id) {
  const n = S.notes.get(id);
  if (!n || !okId(id) || !canManage(n) || !guardWrite()) return;
  const ok = await confirmModal({ title: 'Notu sil', text: 'Not ve altındaki yorumlar kalıcı olarak silinir.', ok: 'Sil', danger: true });
  if (!ok) return;
  const cid = n.cid;
  const done = await write(async () => {
    if (S.supa) { await S.db.doc('notes/' + id).delete(); return; }   // yorumlarını sunucu siler
    for (const p of (Array.isArray(n.photos) ? n.photos : []).filter(okId)) await retrying(() => S.db.doc('photos/' + p).delete());
    for (const [cmid, c] of S.comments) if (c && c.tt === 'note' && c.tid === id && okId(cmid)) await retrying(() => S.db.doc('comments/' + cmid).delete());
    await S.db.doc('notes/' + id).delete();
  }, 'Not silindi');
  if (done && location.hash.indexOf('#/not/' + id) === 0) location.hash = '#/ders/' + cid;
}
async function deleteComment(id) {
  const c = S.comments.get(id);
  if (!c || !okId(id) || !canManage(c) || !guardWrite()) return;
  const ok = await confirmModal({ title: 'Yorumu sil', text: 'Yorum kalıcı olarak silinir.', ok: 'Sil', danger: true });
  if (!ok) return;
  write(() => S.db.doc('comments/' + id).delete(), 'Yorum silindi');
}
function modApprove(col, id) {
  if (!S.owner || !okId(id)) return;
  write(() => S.db.doc(col + '/' + id).update({ ok: Date.now() }), 'Bildirimler temizlendi');
}
async function removeRating(hid) {
  if (!okId(hid) || !needAcc()) return;
  const ok = await confirmModal({ title: 'Puanını kaldır', text: 'Bu hocaya verdiğin HocaÖlçer puanı silinir. Yazdığın yorumlar ayrı durur.', ok: 'Kaldır', danger: true });
  if (!ok) return;
  write(() => hocaUpdate(hid, { ratings: { [pk('hocas', hid)]: null } }), 'Puanın kaldırıldı');
}
const G = {
  'vote-up': (id, el) => voteNote(id, 1, el),
  'vote-down': (id, el) => voteNote(id, -1, el),
  'like-comment': (id, el) => { likeFx(el, S.comments.get(id)); toggleLike('comments', id); },
  'report-note': id => reportItem('notes', id),
  'report-comment': id => reportItem('comments', id),
  'del-note': id => deleteNote(id),
  'del-comment': id => deleteComment(id),
  'reveal': id => { S.revealed.add(id); changed(); },
  'photos': (id, el) => { const n = S.notes.get(id); if (n && Array.isArray(n.photos)) openLightbox(n.photos, +el.dataset.i || 0, codeOf(n.cid) + ' ' + (n.title || '')); },
  'copy': (id, el) => copyText(el.dataset.text || ''),
  'add-course': (id, el) => { if (S.owner) openAddCourse(el.dataset.code || ''); },
  'add-hoca': (id, el) => { if (S.owner) openAddHoca(el.dataset.name || ''); },
  'rate': (id, el) => openRateModal(el.dataset.hid, { cid: el.dataset.cid || '' }),
  'edit-course': id => { if (S.owner) openEditCourse(id); },
  'logout-shared': () => logoutShared(),
  'logout-base': () => logoutBase(),
  'logout': () => siteLogout(),
  'share': (id, el) => shareLink(el.dataset.title || 'YediWiki', el.dataset.hash || location.hash),
  'myc': id => toggleMyCourse(id),
  'bell': () => (nfPop() ? closeNotifs(true) : openNotifs()),
  'theme': () => cycleTheme(),
  'req-new': id => openRequestModal(id),
  'req-plus': (id, el) => togglePlus(id, false, el),
  'req-del': id => deleteRequest(id),
  'zor': id => openZorModal(id),
  'done': (id, el) => toggleDone(id, el),
  'more-courses': () => { LIST.lim += 240; changed(); },
  'el-open': id => { if (EL_OPEN.has(id)) EL_OPEN.delete(id); else EL_OPEN.add(id); EL_FOCUS = `[data-g="el-open"][data-id="${id}"]`; EL_SCROLL = true; changed(); },
  'el-pick': (id, el) => pickElective(id, el.dataset.c || ''),
  'el-done': (id, el) => toggleDone('el:' + id, el),
  'cap-open': id => openCapModal(id),
  'cap-clear': id => capClear(id),
  'cap-hide': (id, el) => capHide(id, el.dataset.k),
  'cap-unhide': (id, el) => capUnhide(id, +el.dataset.sem),
  'recent-clear': () => { ls.set('recent', []); changed(); },
  'dview-max': (id, el) => dviewMax(el.closest('.dview')),
  'welcome': () => { if (hasAcc()) openWelcome(); else openAuth(); },
  'edit-hoca': id => openEditHoca(id),
  'mod-ok': (id, el) => modApprove(el.dataset.col, id),
  'mod-del': (id, el) => (el.dataset.col === 'notes' ? deleteNote(id) : deleteComment(id)),
  'unrate': id => removeRating(id),
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-g]');
  if (!b) return;
  const fn = G[b.dataset.g];
  if (!fn) return;
  e.preventDefault();
  fn(b.dataset.id, b);
});

/* Seçmeliler planda ders satırı: satıra basınca alınabilecek dersler açılır, seçilen ders satırın adı olur.
   Seçimler (secim) ve ÇAP / yandal (cap) hesabın özel kaydında, yoksa bu cihazda; ✓ işaretleri tamamlananlar listesinde "el:<anahtar>". */
const EL_OPEN = new Set(), EL_Q = new Map();
let EL_FOCUS = '', EL_SCROLL = false;
const EL_HINT = { 'Serbest': 'Serbest seçmeliyi başka bölümlerin derslerinden de seçebilirsin.', 'Tamamlayıcı': 'Tamamlayıcı seçmelinin listesi çok uzun olduğu için burada yok.', 'Yabancı Dil': 'Yabancı dil derslerinden birini seçersin.' };
const elKey = (bol, sn, i, e) => bol + '__' + (e && e[5] ? 'h' + e[5] : sn + '_' + i);
function privGet(k) {
  const v = S.priv && S.priv[k] && typeof S.priv[k] === 'object' ? S.priv[k] : ls.get(lsk(k), {});
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
}
async function privPut(k, sub, val) {
  const cur = Object.assign({}, privGet(k));
  if (val == null) delete cur[sub]; else cur[sub] = val;
  ls.set(lsk(k), cur);
  if (S.priv) S.priv = Object.assign({}, S.priv, { [k]: cur });
  changed();
  const pp = privPath();
  if (S.readOnly || !pp || !S.privLoaded) return;
  try { const ref = S.db.doc(pp); if (S.priv) await ref.update({ [k]: { [sub]: val == null ? null : val } }); else await ref.set({ [k]: cur }); } catch (e) { /* bu cihazda kalır */ }
}
const elPick = k => { const v = privGet('secim')[k]; return typeof v === 'string' && S.courses.has(v) ? v : ''; };
/* Aynı planda başka bir seçmeli için seçilmiş dersler: ders -> o seçmelinin adı */
function elTaken(bol, P, except) {
  const m = new Map();
  for (const sn of Object.keys((P && P.el) || {})) (P.el[sn] || []).forEach((e, i) => { const k = elKey(bol, sn, i, e); if (k === except) return; const p = elPick(k); if (p && !m.has(p)) m.set(p, elName(e)); });
  return m;
}
function elOptHtml(k, id, pick, taken) {
  const c = S.courses.get(id) || {}, sel = id === pick, code = c.code || codeOf(id), by = !sel && taken ? taken.get(id) : '';
  const cls = [sel ? 'sel' : '', by ? 'taken' : ''].filter(Boolean).join(' ');
  return `<li${cls ? ` class="${cls}"` : ''} data-k="${esc(id.toLowerCase() + ' ' + foldName(c.name))}"><button type="button" class="el-opt" data-g="el-pick" data-id="${esc(k)}" data-c="${esc(id)}" aria-pressed="${sel}"${by ? ' disabled' : ''}><span class="code">${esc(code)}</span><span class="el-opt-t">${esc(c.name || '')}${by ? `<small>${esc(by)} için seçtin</small>` : ''}</span><span class="el-opt-e">${loadText(c) ? `<span class="ects">${loadText(c)}</span>` : ''}${sel ? '<span class="el-ok">Seçildi</span>' : ''}</span></button><a class="el-go" href="#/ders/${esc(id)}" aria-label="${esc(code)} ders sayfası" title="Ders sayfası">${icon('cr')}</a></li>`;
}
function elPanelHtml(bol, P, e, k, pick) {
  const pool = poolOf(e), taken = elTaken(bol, P, k);
  const src = P.url && e[5] ? `<a href="${esc(P.url + e[5])}" target="_blank" rel="noopener noreferrer">Fakülte sayfasında aç</a>` : '';
  const clear = pick ? ` <button type="button" class="linkish" data-g="el-pick" data-id="${esc(k)}" data-c="">Seçimi kaldır</button>` : '';
  if (pool) {
    const ids = pool.filter(id => S.courses.has(id)).sort(CODE_COLL.compare);
    // Seçmelinin plandaki kredisi listedeki hiçbir dersin kredisine uymuyorsa (iki resmi sayfa farklı yazıyor) bunu saklamayız
    const krs = [...new Set(ids.map(id => S.courses.get(id).kr).filter(v => v != null))];
    const warn = e[2] != null && krs.length && !krs.includes(+e[2]) ? `<p class="fine pool-warn">Ders planında bu seçmeli ${fmtKr(+e[2])} kredi görünüyor, listedeki ${ids.length > 1 ? 'dersler' : 'ders'} ${krs.map(fmtKr).join(' ya da ')} kredi. Üniversitenin iki sayfası farklı yazıyor; kesin bilgi için bölümüne sor.</p>` : '';
    return (ids.length > 8 ? `<label class="search sm el-q">${icon('search')}<input class="input" type="search" data-r="el-q" data-id="${esc(k)}" placeholder="Bu listede ara" aria-label="Seçmeli listesinde ara"></label>` : '')
      + `<ul class="el-opts">${ids.map(id => elOptHtml(k, id, pick, taken)).join('')}</ul><p class="muted el-none" hidden>Eşleşen ders yok.</p>${warn}`
      + `<p class="fine el-src">${ids.length} ders. Liste fakülte sitesinden; o dönem hangilerinin açılacağını bölüm duyurur.${src ? ' ' + src : ''}${clear}</p>`;
  }
  return `<p class="el-hint">${esc(EL_HINT[e[0]] || 'Bu seçmelinin ders listesi burada yok.')} Aldığın dersi tüm dersler arasında ara ve seç.</p>`
    + `<label class="search sm el-q">${icon('search')}<input class="input" type="search" data-r="el-q" data-id="${esc(k)}" data-all="1" placeholder="Ders kodu ya da adıyla ara" aria-label="Tüm derslerde ara"></label>`
    + `<ul class="el-opts" data-r="el-res">${pick ? elOptHtml(k, pick, pick, taken) : ''}</ul><p class="muted el-none" hidden>Eşleşen ders yok.</p>`
    + `<p class="fine el-src">${src ? 'Bu seçmeli için sayılan derslerin güncel listesi fakülte sayfasında. ' + src : 'Hangi derslerin sayıldığını bölümünden öğren.'}${clear}</p>`;
}
/* Plandaki seçmeli satırı. o: { accd, dn, hide (ÇAP satırındaki çıkar düğmesi) } */
function elRowHtml(bol, P, sn, i, e, o) {
  const k = elKey(bol, sn, i, e), pick = elPick(k), c = pick ? S.courses.get(pick) : null;
  const pool = poolOf(e), done = o.dn.has('el:' + k), open = EL_OPEN.has(k), pid = 'elp-' + k;
  const cls = ['el-row', 'prow', pool ? 'has-pool' : P.url && e[5] ? 'has-link' : '', pick ? 'picked' : '', done ? 'done' : '', open ? 'open' : '', o.hide ? 'cap-row' : ''].filter(Boolean).join(' ');
  const sub = c ? elName(e) : pool ? `${pool.length} ders arasından seç` : 'Aldığın dersi seç';
  return `<li class="${cls}" data-k="${esc(k)}">`
    + (o.accd ? `<button type="button" class="done-btn" data-g="el-done" data-id="${esc(k)}" aria-pressed="${done}" aria-label="${esc(c ? c.code || codeOf(pick) : elName(e))} tamamlandı">${gl('check')}</button>` : '')
    + `<button type="button" class="row-link el-tog" data-g="el-open" data-id="${esc(k)}" aria-expanded="${open}" aria-controls="${esc(pid)}"><span class="code el-code">${esc(c ? c.code || codeOf(pick) : 'Seçmeli')}</span><span class="row-main"><span class="row-title">${esc(c ? c.name || '' : elName(e))}</span><span class="row-sub">${esc(sub)}</span></span><span class="row-end">${e[2] != null ? `<span class="ects">${fmtKr(+e[2])} kredi</span>` : ''}<span class="el-chev">${icon('cr')}</span></span></button>`
    + (o.hide || '')
    + (open ? `<div class="el-panel" id="${esc(pid)}">${elPanelHtml(bol, P, e, k, pick)}</div>` : '')
    + '</li>';
}
function pickElective(k, cid) {
  if (!needAcc()) return;
  const prev = elPick(k);
  EL_OPEN.delete(k); EL_Q.delete(k); EL_FOCUS = `[data-g="el-open"][data-id="${k}"]`; EL_SCROLL = true;
  if (cid === prev) { changed(); return; }
  privPut('secim', k, cid || null);
  toast(cid ? `${codeOf(cid)} seçildi` : 'Seçim kaldırıldı');
}
/* Seçmeli listesinde arama: havuzda süzer, uzun listeli seçmelide tüm derslerde arar */
function elFilter(inp) {
  const panel = inp.closest('.el-panel'); if (!panel) return;
  const k = inp.dataset.id || '', raw = inp.value || '';
  if (raw) EL_Q.set(k, raw); else EL_Q.delete(k);
  const q = fold(raw.trim()), qc = q.replace(/\s+/g, ''), none = panel.querySelector('.el-none');
  if (inp.dataset.all) {
    const res = panel.querySelector('[data-r=el-res]'); if (!res) return;
    const bol = k.split('__')[0], pick = elPick(k), taken = elTaken(bol, planOf(bol), k);
    const ids = q.length >= 2 ? searchAll(raw).filter(x => x.kind === 'course').slice(0, 12).map(x => x.id) : (pick ? [pick] : []);
    res.innerHTML = ids.map(id => elOptHtml(k, id, pick, taken)).join('');
    if (none) none.hidden = !(q.length >= 2 && !ids.length);
    return;
  }
  let n = 0;
  panel.querySelectorAll('.el-opts > li').forEach(li => { const kk = li.dataset.k || '', ok = !q || kk.split(' ')[0].includes(qc) || kk.includes(q); li.hidden = !ok; if (ok) n++; });
  if (none) none.hidden = n > 0;
}
document.addEventListener('input', e => { const t = e.target; if (t && t.matches && t.matches('[data-r=el-q]')) elFilter(t); });

/* ÇAP / yandal: ana bölüm planının yanına ikinci program. cap[<ana bölüm>] = { t: 'cap' | 'yandal', b: <ikinci bölüm>, gz: [çıkarılan ders ya da seçmeli] } */
const capTag = c => (c.t === 'yandal' ? 'Yandal' : 'ÇAP');
function capOf(bol) {
  const c = privGet('cap')[bol];
  if (!c || typeof c !== 'object' || !c.b || c.b === bol || !planOf(c.b)) return null;
  return { t: c.t === 'yandal' ? 'yandal' : 'cap', b: String(c.b), gz: Array.isArray(c.gz) ? c.gz.filter(x => typeof x === 'string') : [] };
}
function capBarHtml(bol, cap, b2) {
  if (!cap) return `<div class="cap-bar"><button type="button" class="btn btn-sm" data-g="cap-open" data-id="${esc(bol)}">${icon('plus')}ÇAP / Yandal ekle</button><span class="cap-why">Çift ana dal ya da yandal yapıyorsan ikinci programını ekle, iki plan birlikte görünsün.</span></div>`;
  return `<div class="cap-bar"><span class="cap-pill"><span class="cap-tag">${capTag(cap)}</span>${esc((b2 && b2.ad) || cap.b)}</span><button type="button" class="btn btn-sm btn-ghost" data-g="cap-open" data-id="${esc(bol)}">${icon('edit')}Değiştir</button><button type="button" class="btn btn-sm btn-ghost" data-g="cap-clear" data-id="${esc(bol)}">${icon('x')}Kaldır</button></div>`;
}
function openCapModal(bol) {
  const cur = capOf(bol), b = S.bolumler.get(bol) || {};
  const facs = new Map();
  for (const [id, x] of S.bolumler) { if (id === bol || !planOf(id)) continue; const fk = x.fakulte || 'Diğer'; if (!facs.has(fk)) facs.set(fk, []); facs.get(fk).push([id, x]); }
  const opts = '<option value="">Bölüm seç</option>' + [...facs.entries()].sort((x, y) => x[0].localeCompare(y[0], 'tr')).map(([fk, list]) => `<optgroup label="${esc(fk)}">${list.sort((x, y) => (x[1].ad || '').localeCompare(y[1].ad || '', 'tr')).map(([id, x]) => `<option value="${esc(id)}"${cur && cur.b === id ? ' selected' : ''}>${esc(x.ad || id)}</option>`).join('')}</optgroup>`).join('');
  const t0 = cur ? cur.t : 'cap';
  const m = openModal({ title: 'ÇAP ya da yandal ekle', sub: `${b.ad || bol} planının yanına ikinci programını ekle.`, body: `<form novalidate>
    <fieldset class="field"><legend class="label">Program türü</legend><div class="cap-kind">
      <label class="ck"><input type="radio" name="t" value="cap"${t0 === 'cap' ? ' checked' : ''}><span><b>Çift ana dal (ÇAP)</b>İkinci bölümün bütün planı</span></label>
      <label class="ck"><input type="radio" name="t" value="yandal"${t0 === 'yandal' ? ' checked' : ''}><span><b>Yandal</b>İkinci bölümden birkaç ders</span></label></div></fieldset>
    <div class="field"><label for="cap-b">İkinci bölüm</label><select id="cap-b" class="select">${opts}</select></div>
    <p class="help">İki plan bu sayfada dönem dönem birlikte görünür. Almayacağın dersleri × ile çıkarabilirsin. ÇAP ya da yandalda hangi derslerin sayıldığını bölümünden öğren.</p>
    <p class="err" role="alert"></p>
    <div class="modal-foot"><button type="button" class="btn btn-ghost" data-close>Vazgeç</button><button class="btn btn-primary" type="submit">${cur ? 'Kaydet' : 'Ekle'}</button></div></form>` });
  $('form', m.el).addEventListener('submit', e => {
    e.preventDefault();
    const t = (($('input[name=t]:checked', m.el) || {}).value) === 'yandal' ? 'yandal' : 'cap', b2 = $('#cap-b', m.el).value;
    if (!b2 || !planOf(b2)) { $('.err', m.el).textContent = 'İkinci bölümü seç.'; return; }
    privPut('cap', bol, { t, b: b2, gz: cur && cur.b === b2 ? cur.gz : [] });
    m.close();
    toast(`${t === 'yandal' ? 'Yandal' : 'ÇAP'} eklendi: ${bolumName(b2)}`);
  });
}
async function capClear(bol) {
  const c = capOf(bol); if (!c) return;
  const ok = await confirmModal({ title: `${capTag(c)} programını kaldır`, text: `${bolumName(c.b)} planı bu sayfadan kalkar. Seçtiğin seçmeliler ve tamamladığın dersler silinmez.`, ok: 'Kaldır' });
  if (!ok) return;
  privPut('cap', bol, null);
  toast(`${capTag(c)} kaldırıldı`);
}
function capHide(bol, k) { const c = capOf(bol); if (!c || !k) return; privPut('cap', bol, { t: c.t, b: c.b, gz: [...new Set([...c.gz, k])].slice(-400) }); }
function capUnhide(bol, sn) {
  const c = capOf(bol), P2 = c && planOf(c.b); if (!P2) return;
  const keys = new Set([...(P2.plan[sn] || []), ...((P2.el && P2.el[sn]) || []).map((e, i) => elKey(c.b, sn, i, e))]);
  privPut('cap', bol, { t: c.t, b: c.b, gz: c.gz.filter(k => !keys.has(k)) });
}

/* ================= Formlar (modallar) ================= */
function openAddCourse(code = '', opts = {}) {
  if (!S.owner) { toast('Ders ve hoca listesi site yönetimi tarafından eklenir.'); return; }
  if (!guardWrite()) return;
  if (!S.owner) { toast('Ders listesi yönetim tarafından güncellenir.'); return; }
  const m = openModal({ title: 'Ders ekle', body: `
    <form novalidate>
      <div class="field"><label for="ac-code">Ders kodu</label><input id="ac-code" class="input" maxlength="12" placeholder="Örn. CSE 211" value="${esc(code)}" autocapitalize="characters"></div>
      <div class="field"><label for="ac-name">Ders adı</label><input id="ac-name" class="input" maxlength="120" placeholder="Örn. Data Structures"></div>
      <div class="field"><label for="ac-dept">Fakülte / bölüm <span class="opt">isteğe bağlı</span></label><input id="ac-dept" class="input" maxlength="120" list="dl-fac" placeholder="Örn. Mühendislik Fakültesi"></div>
      <p class="err" role="alert"></p>
      <div class="modal-foot"><button type="button" class="btn btn-ghost" data-close>Vazgeç</button><button class="btn btn-primary" type="submit">Dersi ekle</button></div>
    </form>` });
  const f = $('form', m.el), err = $('.err', m.el);
  if (code) setTimeout(() => $('#ac-name', m.el).focus(), 50);
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const pc = parseCode($('#ac-code', m.el).value), name = $('#ac-name', m.el).value.trim(), dept = $('#ac-dept', m.el).value.trim();
    if (!pc) { err.textContent = 'Ders kodu harf ve üç rakamdan oluşmalı, örneğin CSE 211.'; return; }
    if (S.courses.has(pc.id)) { m.close(); toast('Bu ders zaten kayıtlı.'); location.hash = '#/ders/' + pc.id; return; }
    if (name.length < 2) { err.textContent = 'Ders adını yaz.'; return; }
    const btn = $('[type=submit]', f); btn.disabled = true;
    const ok = await write(() => ensureCourse(pc, name, dept), 'Ders eklendi');
    btn.disabled = false;
    if (ok) { m.close(); if (opts.then) opts.then(pc.id); else location.hash = '#/ders/' + pc.id; }
  });
}
function openAddHoca(name = '', opts = {}) {
  if (!S.owner) { toast('Ders ve hoca listesi site yönetimi tarafından eklenir.'); return; }
  if (!guardWrite()) return;
  if (!S.owner) { toast('Akademik kadro listesi yönetim tarafından güncellenir.'); return; }
  const t0 = detectTitle(name);
  const m = openModal({ title: 'Hoca ekle', body: `
    <form novalidate>
      <div class="field"><label for="ah-name">Ad soyad</label><input id="ah-name" class="input" maxlength="80" placeholder="Örn. Ayşe Demir" value="${esc(niceName(name))}"></div>
      <div class="two">
        <div class="field"><label for="ah-title">Unvan <span class="opt">isteğe bağlı</span></label><select id="ah-title" class="select"><option value="">Seç</option>${TITLES.map(t => `<option${t === t0 ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
        <div class="field"><label for="ah-dept">Fakülte / bölüm <span class="opt">isteğe bağlı</span></label><input id="ah-dept" class="input" maxlength="120" list="dl-fac"></div>
      </div>
      <p class="help">Eklemeden önce aramayı dene. Aynı hoca iki kez eklenirse puanları bölünür.</p>
      <p class="err" role="alert"></p>
      <div class="modal-foot"><button type="button" class="btn btn-ghost" data-close>Vazgeç</button><button class="btn btn-primary" type="submit">Hocayı ekle</button></div>
    </form>` });
  const f = $('form', m.el), err = $('.err', m.el);
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const raw = $('#ah-name', m.el).value, nm = stripTitle(raw);
    const title = $('#ah-title', m.el).value || detectTitle(raw), dept = $('#ah-dept', m.el).value.trim();
    if (nm.split(' ').filter(Boolean).length < 2 || nm.length < 4) { err.textContent = 'Hocanın adını ve soyadını yaz.'; return; }
    const slug = hocaSlug(nm);
    if (!slug) { err.textContent = 'Geçerli bir isim yaz.'; return; }
    if (S.hocas.has(slug)) { m.close(); toast('Bu hoca zaten kayıtlı.'); location.hash = '#/hoca/' + slug; return; }
    const btn = $('[type=submit]', f); btn.disabled = true;
    let id = null;
    const ok = await write(async () => { id = await ensureHoca(nm, title, dept); }, 'Hoca eklendi');
    btn.disabled = false;
    if (ok && id) { m.close(); if (opts.then) opts.then(id); else location.hash = '#/hoca/' + id; }
  });
}
function canEditEntity(o) { return !!o && (o.by === S.me || S.owner || !o.name); }
function openEditCourse(cid) {
  const c = S.courses.get(cid);
  if (!c || !canEditEntity(c) || !guardWrite()) return;
  const m = openModal({ title: 'Dersi düzenle', sub: codeOf(cid), body: `
    <form novalidate>
      <div class="field"><label for="ec-name">Ders adı</label><input id="ec-name" class="input" maxlength="120" value="${esc(c.name || '')}"></div>
      <div class="field"><label for="ec-dept">Fakülte / bölüm <span class="opt">isteğe bağlı</span></label><input id="ec-dept" class="input" maxlength="120" list="dl-fac" value="${esc(c.dept || '')}"></div>
      <p class="err" role="alert"></p>
      <div class="modal-foot"><button type="button" class="btn btn-ghost" data-close>Vazgeç</button><button class="btn btn-primary" type="submit">Kaydet</button></div>
    </form>` });
  $('form', m.el).addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('#ec-name', m.el).value.trim(), dept = $('#ec-dept', m.el).value.trim();
    if (name.length < 2) { $('.err', m.el).textContent = 'Ders adını yaz.'; return; }
    const ok = await write(() => {
      const ref = S.db.doc('courses/' + cid), body = { name: name.slice(0, 120), dept: dept.slice(0, 120), edAt: Date.now() };
      return S.dbCourses.has(cid) ? ref.update(body) : ref.set(Object.assign({ code: c.code || codeOf(cid), ects: +c.ects || 0, at: Date.now(), by: S.me, grades: {}, dists: {} }, body));
    }, 'Ders güncellendi');
    if (ok) m.close();
  });
}
function openEditHoca(hid) {
  const h = S.hocas.get(hid);
  if (!h || !canEditEntity(h) || !guardWrite()) return;
  const m = openModal({ title: 'Hocayı düzenle', body: `
    <form novalidate>
      <div class="field"><label for="eh-name">Ad soyad</label><input id="eh-name" class="input" maxlength="80" value="${esc(h.name || '')}"></div>
      <div class="two">
        <div class="field"><label for="eh-title">Unvan</label><select id="eh-title" class="select"><option value="">Belirtilmemiş</option>${TITLES.map(t => `<option${t === h.title ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
        <div class="field"><label for="eh-dept">Fakülte / bölüm</label><input id="eh-dept" class="input" maxlength="120" list="dl-fac" value="${esc(h.dept || '')}"></div>
      </div>
      <p class="err" role="alert"></p>
      <div class="modal-foot"><button type="button" class="btn btn-ghost" data-close>Vazgeç</button><button class="btn btn-primary" type="submit">Kaydet</button></div>
    </form>` });
  $('form', m.el).addEventListener('submit', async e => {
    e.preventDefault();
    const name = stripTitle($('#eh-name', m.el).value);
    if (name.split(' ').filter(Boolean).length < 2) { $('.err', m.el).textContent = 'Adı ve soyadı yaz.'; return; }
    const ok = await write(() => hocaUpdate(hid, { name: niceName(name).slice(0, 80), title: $('#eh-title', m.el).value, dept: $('#eh-dept', m.el).value.trim().slice(0, 120), edAt: Date.now() }), 'Hoca bilgileri güncellendi');
    if (ok) m.close();
  });
}
function hocaCombo(input) {
  return combobox(input, { source: q => searchAll(q).filter(r => r.kind === 'hoca').slice(0, 6), onPick: it => { input.value = it.label; input.dispatchEvent(new Event('change')); } });
}
function courseCombo(input) {
  return combobox(input, { source: q => searchAll(q).filter(r => r.kind === 'course').slice(0, 6), onPick: it => { input.value = it.label; input.dispatchEvent(new Event('change')); } });
}
function openRateModal(hid, { cid = '' } = {}) {
  if (!needAcc()) return;
  const h = S.hocas.get(hid);
  if (!h) return;
  const mineRaw = h.ratings && h.ratings[pk('hocas', hid)];
  const mine = mineRaw && typeof mineRaw === 'object' ? mineRaw : null;
  const vals = {};
  CRIT.forEach(c => { vals[c.k] = mine && typeof mine[c.k] === 'number' ? mine[c.k] : 0; });
  const terms = termList();
  const preC = cid || (mine && mine.c) || '';
  const preT = mine && mine.tk ? +mine.tk : 0;
  const m = openModal({ title: mine ? 'Değerlendirmeni güncelle' : 'HocaÖlçer değerlendirmesi', sub: hocaFull(h), body: `
    <form novalidate>
      <p class="help">Her kriterde 5 yıldız, öğrenci açısından en iyi durum demek. Yıldızın sol yarısına dokunursan buçuklu puan verirsin.</p>
      <div class="rate-list">${CRIT.map(c => `<div class="rate-row"><div><span class="label" id="rl-${c.k}">${esc(c.name)}</span><span class="help">1 = ${esc(c.lo)}, 5 = ${esc(c.hi)}</span></div><div class="rate-ctl"><span class="stars star-input" tabindex="0" role="slider" aria-labelledby="rl-${c.k}" aria-valuemin="0.5" aria-valuemax="5" data-k="${c.k}"><i></i></span><b class="rate-val" data-v="${c.k}">–</b></div></div>`).join('')}</div>
      <div class="two mt">
        <div class="field cb-wrap"><label for="r-course">Hangi dersi aldın? <span class="opt">isteğe bağlı</span></label><input id="r-course" class="input" maxlength="12" placeholder="Örn. CSE 211" value="${esc(preC ? codeOf(preC) : '')}"></div>
        <div class="field"><label for="r-term">Dönem <span class="opt">isteğe bağlı</span></label><select id="r-term" class="select"><option value="">Seç</option>${terms.map(tk => `<option value="${tk}"${tk === preT ? ' selected' : ''}>${esc(termLabel(tk))}</option>`).join('')}</select></div>
      </div>
      <div class="field"><label for="r-text">Yorum <span class="opt">isteğe bağlı</span></label><textarea id="r-text" class="textarea" rows="4" maxlength="1000" placeholder="Anlatımı, sınavları, ödevleri nasıldı? Derse ve anlatıma odaklan."></textarea></div>
      <div class="field"><span class="label">Yorum nasıl görünsün?</span><div class="chips"><button type="button" class="chip" data-anon="1" aria-pressed="true">${gl('spy')}Anonim</button><button type="button" class="chip" data-anon="0" aria-pressed="false" data-r="asme"></button></div></div>
      <p class="err" role="alert"></p>
      <div class="modal-foot"><button type="button" class="btn btn-ghost" data-close>Vazgeç</button><button class="btn btn-primary" type="submit">${mine ? 'Güncelle' : 'Gönder'}</button></div>
    </form>` });
  $$('.star-input', m.el).forEach(el => {
    const k = el.dataset.k, out = $(`[data-v="${k}"]`, m.el);
    const upd = v => { vals[k] = v; out.textContent = v ? fmt1(v) : '–'; };
    starInput(el, vals[k], upd);
    upd(vals[k]);
  });
  courseCombo($('#r-course', m.el));
  let anon = true;
  const asMe = $('[data-r=asme]', m.el);
  if (asMe) asMe.textContent = '@' + ((myAcc() || {}).username || 'hesabım');
  $$('[data-anon]', m.el).forEach(b => b.addEventListener('click', () => {
    anon = b.dataset.anon === '1';
    $$('[data-anon]', m.el).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  }));
  const err = $('.err', m.el);
  $('form', m.el).addEventListener('submit', async e => {
    e.preventDefault();
    err.textContent = '';
    const miss = CRIT.filter(c => !(vals[c.k] >= 0.5));
    if (miss.length) { err.textContent = 'Dört kriteri de puanla. Eksik: ' + miss.map(c => c.name).join(', ') + '.'; return; }
    const ct = $('#r-course', m.el).value.trim();
    let pc = null;
    if (ct) {
      pc = parseCode(ct);
      if (!pc) { err.textContent = 'Ders kodu CSE 211 biçiminde olmalı.'; return; }
      if (!S.courses.has(pc.id) && !S.owner) { err.textContent = 'Bu ders listede yok. Ders kodunu listeden seç ya da alanı boş bırak.'; return; }
    }
    const tk = +$('#r-term', m.el).value || 0;
    const text = $('#r-text', m.el).value.trim();
    
    const cref = text ? S.db.collection('comments').doc() : null;
    const btn = $('[type=submit]', m.el); btn.disabled = true;
    const r = { a: vals.a, o: vals.o, n: vals.n, d: vals.d };
    const ok = await write(async () => {
      if (pc) await ensureCourse(pc);
      await hocaUpdate(hid, { ratings: { [pk('hocas', hid)]: Object.assign({}, r, { c: pc ? pc.id : '', tk, at: Date.now() }) } });
      if (cref) await cref.set({ tt: 'hoca', tid: hid, text: text.slice(0, 1000), anon, by: S.me, at: Date.now(), c: pc ? pc.id : '', tk, r, likes: {}, reports: {} });
    }, mine ? 'Değerlendirmen güncellendi' : 'Değerlendirmen kaydedildi');
    btn.disabled = false;
    if (ok) m.close();
  });
}

/* ================= Liste parçaları ================= */
const DRIVE_KINDS = { doc: 'Doküman', slide: 'Sunum', sheet: 'Tablo', form: 'Form', folder: 'Klasör', file: 'Dosya', drive: 'Drive' };
function driveInfo(url) {
  const u = String(url || '').trim();
  if (!/^https:\/\/(drive|docs)\.google\.com\/\S+$/i.test(u)) return null;
  let k = 'drive';
  if (/docs\.google\.com\/document\//i.test(u)) k = 'doc';
  else if (/docs\.google\.com\/presentation\//i.test(u)) k = 'slide';
  else if (/docs\.google\.com\/spreadsheets\//i.test(u)) k = 'sheet';
  else if (/docs\.google\.com\/forms\//i.test(u)) k = 'form';
  else if (/drive\.google\.com\/drive\/(u\/\d+\/)?folders\//i.test(u)) k = 'folder';
  else if (/drive\.google\.com\/(file\/d\/|open\?id=|uc\?)/i.test(u)) k = 'file';
  return { k, name: DRIVE_KINDS[k] };
}
function driveGlyph(k) {
  const W = 'fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';
  const G = {
    doc: `<path d="M9 5h9l5 5v17H9z" ${W}/><path d="M13 14h6M13 18h6M13 22h4" ${W}/>`,
    slide: `<rect x="6" y="8" width="20" height="14" rx="2" ${W}/><path d="M16 22v4M11 26h10" ${W}/>`,
    sheet: `<rect x="7" y="7" width="18" height="18" rx="2" ${W}/><path d="M7 13h18M7 19h18M13 7v18" ${W}/>`,
    form: `<rect x="8" y="6" width="16" height="20" rx="2" ${W}/><circle cx="12" cy="12" r="1.4" fill="#fff"/><path d="M15 12h6" ${W}/><circle cx="12" cy="18" r="1.4" fill="#fff"/><path d="M15 18h6" ${W}/>`,
    folder: `<path d="M5 10h8l2 3h12v12H5z" ${W}/>`,
    file: `<path d="M9 5h9l5 5v17H9z" ${W}/><text x="16" y="22" text-anchor="middle" font-size="6.5" font-weight="800" fill="#fff" font-family="Arial,sans-serif">PDF</text>`,
    drive: `<path d="M12 6h8l7 12-4 7H9l-4-7z" ${W}/><path d="M12 6l8 12H5M20 6L9 25M27 18H13" ${W}/>`
  };
  return `<svg viewBox="0 0 32 32" aria-hidden="true">${G[k] || G.drive}</svg>`;
}
function driveCardHtml(url) {
  const info = driveInfo(url) || { k: 'drive', name: 'Drive' };
  return `<div class="dcard mt k-${info.k}"><span class="dtile">${driveGlyph(info.k)}</span><span class="dinfo"><b>${esc(info.name === 'Drive' ? 'Google Drive' : info.name)}</b><span class="dsub">Google Drive’da paylaşıldı</span><span class="url" title="${esc(url)}">${esc(url)}</span></span><span class="dacts"><a class="btn btn-primary" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${icon('external')}Aç</a><button type="button" class="btn" data-g="copy" data-text="${esc(url)}">${icon('copy')}Kopyala</button></span></div>`;
}
/* Drive önizlemesi (yalnızca gerçek sitede; claude.ai sayfası dış çerçeve ve resim açmaz).
   Bağlantıdan dosya kimliği çıkarılır: Drive/Docs'un önizleme adresi çerçeveye, küçük resmi not kartına konur. */
function driveEmbed(url) {
  const u = String(url || '').trim(), info = driveInfo(u);
  if (!info || info.k === 'form') return null;
  const m = /\/folders\/([A-Za-z0-9_-]{10,})/.exec(u) || /\/d\/([A-Za-z0-9_-]{10,})/.exec(u) || /[?&]id=([A-Za-z0-9_-]{10,})/.exec(u);
  if (!m) return null;
  const id = m[1], rk = (/[?&]resourcekey=([A-Za-z0-9_-]+)/.exec(u) || [])[1] || '', q = rk ? '?resourcekey=' + rk : '';
  const src = info.k === 'folder' ? `https://drive.google.com/embeddedfolderview?id=${id}${rk ? '&resourcekey=' + rk : ''}#grid`
    : info.k === 'doc' ? `https://docs.google.com/document/d/${id}/preview${q}`
    : info.k === 'slide' ? `https://docs.google.com/presentation/d/${id}/preview${q}`
    : info.k === 'sheet' ? `https://docs.google.com/spreadsheets/d/${id}/preview${q}`
    : `https://drive.google.com/file/d/${id}/preview${q}`;
  const thumb = info.k === 'folder' ? '' : `https://drive.google.com/thumbnail?id=${id}&sz=w640${rk ? '&resourcekey=' + rk : ''}`;
  return { id, k: info.k, name: info.name, src, thumb };
}
/* Not kartındaki küçük resim; açılamazsa (paylaşım kapalı, klasör) kendini kaldırır, altındaki Drive simgesi görünür */
const driveThumbHtml = url => { const e = S.supa ? driveEmbed(url) : null; return e && e.thumb ? `<img class="dthumb" src="${esc(e.thumb)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ''; };
document.addEventListener('error', e => { const t = e.target; if (t && t.classList && t.classList.contains('dthumb')) t.remove(); }, true);
function drivePreviewHtml(url, { mini = false } = {}) {
  const e = S.supa ? driveEmbed(url) : null;
  if (!e) return driveCardHtml(url);
  const name = e.k === 'drive' || e.k === 'file' ? 'Drive dosyası' : e.name;
  return `<div class="dview k-${e.k}${mini ? ' mini' : ''}">
    <div class="dview-bar"><span class="dtile sm">${driveGlyph(e.k)}</span><b>${esc(name)}</b><span class="spacer"></span>
      ${mini ? '' : `<button type="button" class="btn btn-sm btn-ghost" data-g="dview-max" aria-pressed="false">${icon('expand')}<span class="dv-lbl">Tam ekran</span></button><button type="button" class="btn btn-sm btn-ghost" data-g="copy" data-text="${esc(url)}">${icon('copy')}<span class="dv-lbl">Kopyala</span></button>`}<a class="btn btn-sm btn-primary" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${icon('external')}Drive’da aç</a></div>
    <div class="dview-frame"><div class="dview-load" aria-hidden="true">${loadingHtml()}</div><iframe src="${esc(e.src)}" title="Not önizlemesi" loading="lazy" allow="fullscreen; autoplay" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads"></iframe></div>
    <p class="dview-help">${mini ? 'Önizleme senin Google hesabınla açılıyor olabilir; herkesin görmesi için paylaşım “Bağlantıya sahip olan herkes” olmalı.' : `Önizleme açılmazsa dosyanın paylaşımı “Bağlantıya sahip olan herkes” olmayabilir; <a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Drive’da açmayı dene</a>.`}</p>
  </div>`;
}
function wireDview(root) {
  $$('.dview iframe', root).forEach(f => {
    if (f.dataset.w) return;
    f.dataset.w = '1';
    const box = f.closest('.dview');
    f.addEventListener('load', () => box.classList.add('ready'));
    setTimeout(() => { if (!box.classList.contains('ready')) box.classList.add('ready', 'slow'); }, 12000);
  });
}
/* Tam ekran: sayfanın üstüne serilir (telefonda da çalışır); Esc ya da Küçült ile döner */
function dviewMax(box, on) {
  if (!box) return;
  on = on == null ? !box.classList.contains('max') : !!on;
  box.classList.toggle('max', on);
  document.body.classList.toggle('no-scroll', on || modalStack.length > 0);
  const b = box.querySelector('[data-g=dview-max]');
  if (b) { b.setAttribute('aria-pressed', String(on)); b.innerHTML = icon(on ? 'shrink' : 'expand') + `<span class="dv-lbl">${on ? 'Küçült' : 'Tam ekran'}</span>`; }
}
document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; const mx = document.querySelector('.dview.max'); if (mx && !modalStack.length) { e.stopImmediatePropagation(); dviewMax(mx, false); } }, true);   // önce tam ekran kapanır, tur ve pencereler sonra
/* ================= Google Drive seçici (yalnızca sitede) =================
   Google ile giriş yalnızca drive.file izniyle: YediWiki kullanıcının seçtiği dosyaya erişir, Drive'ın geri kalanını göremez.
   Google Picker'da dosya seçilir (ya da "Yükle" sekmesiyle Drive'a eklenir), seçilen dosya "bağlantıya sahip olan herkes
   görüntüleyebilir" yapılır ve linki forma yazılır. Erişim belirteci yalnızca bu sekmenin belleğinde durur, sunucuya gitmez. */
const DRIVE_LOGO = icon('folder');
const GD = { load: null, tc: null, token: '', exp: 0, onTok: null, onErr: null, asked: false };
function gdCfg() {
  const c = window.YW_GOOGLE;
  return S.supa && c && typeof c.apiKey === 'string' && /^AIza/.test(c.apiKey) && typeof c.clientId === 'string' && /\.apps\.googleusercontent\.com$/.test(c.clientId) && /^\d+$/.test(String(c.appId || '')) ? c : false;
}
function loadScript(src) {
  return new Promise((res, rej) => {
    const old = document.querySelector(`script[data-src="${src}"]`);
    if (old && old.dataset.ok) { res(); return; }
    const el = old || document.createElement('script');
    el.addEventListener('load', () => { el.dataset.ok = '1'; res(); });
    el.addEventListener('error', () => { el.remove(); rej(new Error('load')); });
    if (!old) { el.src = src; el.async = true; el.dataset.src = src; document.head.appendChild(el); }
  });
}
function gdLoad() {
  if (!gdCfg()) return Promise.reject(new Error('cfg'));
  const has = () => !!(window.google && window.google.accounts && window.google.accounts.oauth2 && window.google.picker);
  if (has()) return Promise.resolve();
  if (!GD.load) {
    const gis = window.google && window.google.accounts && window.google.accounts.oauth2 ? Promise.resolve() : loadScript('https://accounts.google.com/gsi/client');
    const pick = window.google && window.google.picker ? Promise.resolve() : loadScript('https://apis.google.com/js/api.js').then(() => new Promise((res, rej) => {
      if (window.google && window.google.picker) { res(); return; }
      window.gapi.load('picker', { callback: res, onerror: () => rej(new Error('picker')), timeout: 15000, ontimeout: () => rej(new Error('picker')) });
    }));
    GD.load = Promise.all([gis, pick]).catch(e => { GD.load = null; throw e; });
  }
  return GD.load;
}
/* Google penceresi tıklamanın içinde açılmalı (açılır pencere engeli); belirteç bir saat geçerli, sekme açıkken yeniden sorulmaz */
function gdToken() {
  if (GD.token && Date.now() < GD.exp - 60e3) return Promise.resolve(GD.token);
  return new Promise((res, rej) => {
    if (!GD.tc) GD.tc = window.google.accounts.oauth2.initTokenClient({
      client_id: gdCfg().clientId, scope: 'https://www.googleapis.com/auth/drive.file',
      callback: r => { if (GD.onTok) GD.onTok(r); }, error_callback: e => { if (GD.onErr) GD.onErr(e); }
    });
    GD.onTok = r => {
      if (r && r.access_token) { GD.token = r.access_token; GD.exp = Date.now() + (+r.expires_in || 3600) * 1000; res(GD.token); }
      else rej(Object.assign(new Error('token'), { code: String((r && r.error) || 'token') }));
    };
    GD.onErr = e => rej(Object.assign(new Error('popup'), { code: String((e && e.type) || 'popup') }));
    GD.tc.requestAccessToken({ prompt: GD.asked ? '' : 'select_account' });
    GD.asked = true;
  });
}
function gdPicker(token) {
  return new Promise(res => {
    const c = gdCfg(), P = window.google.picker;
    const docs = new P.DocsView(P.ViewId.DOCS).setIncludeFolders(true).setSelectFolderEnabled(false);
    const up = new P.DocsUploadView().setIncludeFolders(true);
    const b = new P.PickerBuilder().setAppId(String(c.appId)).setOAuthToken(token).setDeveloperKey(c.apiKey)
      .addView(docs).addView(up).setLocale('tr').setTitle('Notunu seç').setOrigin(location.protocol + '//' + location.host);
    if (P.Feature && P.Feature.SUPPORT_DRIVES) b.enableFeature(P.Feature.SUPPORT_DRIVES);
    b.setCallback(d => {
      const a = d && d[P.Response.ACTION];
      if (a === P.Action.PICKED) {
        const x = ((d && d[P.Response.DOCUMENTS]) || [])[0];
        res(x && x[P.Document.ID] ? { id: String(x[P.Document.ID]), name: String(x[P.Document.NAME] || ''), url: String(x[P.Document.URL] || ''), mime: String(x[P.Document.MIME_TYPE] || '') } : null);
      } else if (a === P.Action.CANCEL) res(null);
    });
    b.build().setVisible(true);
  });
}
/* Seçilen dosyayı bağlantıya sahip olan herkese okunur yap; olmazsa zaten açık mı diye bak */
async function gdShare(f, token) {
  const base = 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(f.id);
  try {
    const r = await fetch(base + '/permissions?supportsAllDrives=true', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'reader', type: 'anyone', allowFileDiscovery: false }) });
    if (r.ok) return true;
  } catch (e) { /* aşağıda bakılır */ }
  try {
    const r = await fetch(base + '?supportsAllDrives=true&fields=permissions(type%2Crole)', { headers: { Authorization: 'Bearer ' + token } });
    const j = r.ok ? await r.json() : null;
    return !!(j && Array.isArray(j.permissions) && j.permissions.some(p => p && p.type === 'anyone'));
  } catch (e) { return false; }
}
const gdUrl = f => (/^https:\/\/(drive|docs)\.google\.com\/\S+$/.test(f.url) ? f.url : 'https://drive.google.com/file/d/' + encodeURIComponent(f.id) + '/view');
async function pickFromDrive(root) {
  const msg = $('[data-r=gmsg]', root), btn = $('[data-r=gbtn]', root);
  if (!msg || !btn || btn.disabled || !gdCfg()) return;
  const say = (t, kind = '') => { msg.textContent = t; msg.className = 'gpick-msg' + (kind ? ' ' + kind : ''); };
  say('');
  if (!(window.google && window.google.accounts && window.google.accounts.oauth2 && window.google.picker)) {
    btn.disabled = true; say('Google Drive hazırlanıyor…');
    try { await gdLoad(); } catch (e) { btn.disabled = false; say('Google Drive’a bağlanılamadı. İnternetini kontrol et ya da linki aşağıya yapıştır.', 'err'); return; }
    btn.disabled = false; say('');
  }
  let tok = '';
  try { tok = await gdToken(); } catch (e) {
    const c = (e && e.code) || '';
    say(/access_denied/.test(c) ? 'İzin verilmedi. Dosyanı seçebilmen için Google’da YediWiki’ye izin vermen gerekiyor.'
      : /popup_closed/.test(c) ? 'Google penceresi kapandı. Yeniden “Drive’dan seç”e bas.'
      : /popup_failed/.test(c) ? 'Google penceresi açılamadı. Yeniden “Drive’dan seç”e bas; olmazsa açılır pencerelere izin ver.'
      : 'Google ile giriş yapılamadı. Yeniden dene ya da linki aşağıya yapıştır.', 'err');
    return;
  }
  let f = null;
  try { f = await gdPicker(tok); } catch (e) { console.error(e); say('Drive penceresi açılamadı. Linki aşağıya yapıştırabilirsin.', 'err'); return; }
  if (!f) return;
  btn.disabled = true; say('Paylaşım ayarı yapılıyor…');
  const pub = await gdShare(f, tok);
  btn.disabled = false;
  const inp = $('#sh-drive', root);
  if (inp) { inp.value = gdUrl(f); inp.dispatchEvent(new Event('input', { bubbles: true })); }
  const t = $('#sh-title', root);
  if (t && !t.value.trim() && f.name) t.value = f.name.replace(/\.[A-Za-z0-9]{2,5}$/, '').replace(/[_]+/g, ' ').trim().slice(0, 80);
  const nm = f.name || 'Dosya';
  say(pub ? `“${nm}” seçildi. Bağlantıya sahip olan herkes görüntüleyebilir.` : `“${nm}” seçildi ama paylaşım ayarı değiştirilemedi. Drive’da dosyanın genel erişimini “Bağlantıya sahip olan herkes” yap.`, pub ? 'ok' : 'warn');
}
function popFx(el) { if (!el) return; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
let drivePasteOn = false;
function wireDriveBox(root) {
  const inp = $('#sh-drive', root), prev = $('[data-r=dprev]', root), box = $('[data-r=dbox]', root), mini = $('[data-r=dmini]', root);
  if (!inp || !prev || !box) return;
  let miniT = 0;
  const renderMini = () => {
    if (!mini) return;
    clearTimeout(miniT);
    const v = inp.value.trim(), e = S.supa && v ? driveEmbed(v) : null;
    if (!e) { mini.innerHTML = ''; mini.dataset.u = ''; return; }
    if (mini.dataset.u === v) return;
    miniT = setTimeout(() => { mini.dataset.u = v; mini.innerHTML = drivePreviewHtml(v, { mini: true }); wireDview(mini); }, 400);
  };
  const render = () => {
    renderMini();
    const v = inp.value.trim(), info = v ? driveInfo(v) : null;
    box.classList.toggle('ok', !!info); box.classList.toggle('bad', !!v && !info);
    if (!v) { prev.hidden = true; prev.innerHTML = ''; return; }
    prev.hidden = false;
    prev.innerHTML = info
      ? `<span class="dtile k-${info.k}">${driveGlyph(info.k)}</span><span class="dinfo"><b>${esc(info.k === 'drive' ? 'Drive linki' : info.name)} tanındı</b><span class="dsub">Paylaşım ayarı “Bağlantıya sahip olan herkes” olmalı.</span></span><a class="btn btn-sm" href="${esc(v)}" target="_blank" rel="noopener noreferrer">Kontrol et</a>`
      : `<span class="dinfo"><b>Bu bir Google Drive linki değil</b><span class="dsub">Link drive.google.com ya da docs.google.com ile başlamalı.</span></span>`;
  };
  inp.addEventListener('input', render);
  const pb = $('[data-r=paste]', root);
  if (pb) pb.addEventListener('click', async () => {
    try {
      const t = ((navigator.clipboard && navigator.clipboard.readText && await navigator.clipboard.readText()) || '').trim();
      if (t) { inp.value = t; render(); if (driveInfo(t)) popFx(box); return; }
    } catch (e) { /* tarayıcı pano iznini vermedi */ }
    inp.focus(); toast('Linki kopyaladıktan sonra kutuya yapıştır: Ctrl+V ya da basılı tutup Yapıştır.');
  });
  if (!drivePasteOn) {
    drivePasteOn = true;
    document.addEventListener('paste', e => {
      const box2 = document.querySelector('[data-r=dbox]'), inp2 = document.getElementById('sh-drive');
      if (!box2 || !inp2) return;
      const tg = e.target, tag = (tg && tg.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (tg && tg.isContentEditable)) return;
      const t = ((e.clipboardData && e.clipboardData.getData('text')) || '').trim();
      if (!driveInfo(t)) return;
      e.preventDefault();
      inp2.value = t; inp2.dispatchEvent(new Event('input', { bubbles: true }));
      if (box2.scrollIntoView) box2.scrollIntoView({ block: 'center', behavior: reduceMotion() ? 'auto' : 'smooth' });
      popFx(box2);
    });
  }
  render();
}
function fxLayer() { let l = document.getElementById('fx'); if (!l) { l = document.createElement('div'); l.id = 'fx'; l.setAttribute('aria-hidden', 'true'); document.body.appendChild(l); } return l; }
function burst(x, y, { glyphs = ['heart'], n = 8, cls = '', spread = 70 } = {}) {
  if (reduceMotion()) return;
  const l = fxLayer();
  for (let i = 0; i < n; i++) {
    const q = document.createElement('span');
    const gk = glyphs[i % glyphs.length];
    q.className = 'fxp ' + cls; if (GL[gk]) q.innerHTML = gl(gk); else q.textContent = gk;
    const a = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.6, d = spread * (0.55 + Math.random() * 0.6);
    q.style.left = x + 'px'; q.style.top = y + 'px';
    q.style.setProperty('--dx', (Math.cos(a) * d).toFixed(1) + 'px');
    q.style.setProperty('--dy', (Math.sin(a) * d - spread * 0.35).toFixed(1) + 'px');
    q.style.setProperty('--r', ((Math.random() - 0.5) * 120).toFixed(0) + 'deg');
    q.style.setProperty('--d', (0.7 + Math.random() * 0.4).toFixed(2) + 's');
    l.appendChild(q); setTimeout(() => q.remove(), 1300);
  }
}
function centerOf(el) { const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null; return r && r.width ? [r.left + r.width / 2, r.top + r.height / 2] : [innerWidth / 2, innerHeight / 2]; }
function likeFx(el, o) { if (!o || !myAcc() || isMine(o) || likedByMe(o)) return; const [x, y] = centerOf(el); burst(x, y, { glyphs: ['heart'], n: 7, cls: 'heart', spread: 46 }); }
function kubbeFloat(n) {
  if (reduceMotion() || !(n > 0)) return;
  const k = document.createElement('div');
  k.className = 'kfloat'; k.innerHTML = `${gl('coin', 'k-coin')}+${n} kubbe`;
  fxLayer().appendChild(k); setTimeout(() => k.remove(), 1700);
}
function introCls() { const t = Date.now(); if (!S.cardsIntroAt) S.cardsIntroAt = t; return t - S.cardsIntroAt < 1500 ? ' intro' : ''; }
/* ================= Yeni özellikler: paylaşım, Derslerim, bildirimler, rozetler, tema ================= */
const SITE_URL = 'https://claude.ai/artifact/QHmvx8rTtGNrcmijbjJAfy';
const siteUrl = () => (S.supa ? location.origin + location.pathname : SITE_URL);
async function shareLink(title, hash) {
  const url = siteUrl() + (hash || '');
  if (navigator.share) { try { await navigator.share({ title, text: title, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  copyText(url);
}
function myCourses() {
  const p = S.priv && Array.isArray(S.priv.myc) ? S.priv.myc : null;
  const l = p || ls.get(lsk('myc'), []);
  return Array.isArray(l) ? l.filter(id => typeof id === 'string') : [];
}
async function toggleMyCourse(cid) {
  if (!needAcc()) return;
  const cur = myCourses(), has = cur.includes(cid), next = has ? cur.filter(x => x !== cid) : [cid, ...cur].slice(0, 30);
  ls.set(lsk('myc'), next);
  if (S.priv) S.priv = Object.assign({}, S.priv, { myc: next });
  if (!has) ls.set('cseen:' + S.me + ':' + cid, Date.now());
  changed();
  toast(has ? `${codeOf(cid)} Derslerim’den çıkarıldı` : `${codeOf(cid)} Derslerim’e eklendi`);
  const pp = privPath();
  if (!S.readOnly && pp) { try { const ref = S.db.doc(pp); if (S.priv) await ref.update({ myc: next }); else await ref.set({ myc: next }); } catch (e) { /* bu cihazda kalır */ } }
}
// Derslerim'deki bir derse, o ders sayfasına son bakıştan sonra başkalarının eklediği not sayısı (Dersler > Derslerim listesinde rozet)
function freshNotes(id) {
  const seen = ls.get('cseen:' + S.me + ':' + id, null);
  return seen == null ? 0 : notesWhere(n => n.cid === id && !isHidden(n) && (n.at || 0) > seen && !isMine(n)).length;
}
function notifItems() {
  if (!myAcc()) return [];
  const mine = new Set(notesWhere(n => isMine(n)).map(n => n.id));
  const out = [];
  for (const c of S.comments.values()) if (c && !isMine(c) && !isHidden(c) && c.tt === 'note' && mine.has(c.tid)) out.push({ at: c.at || 0, c });
  // anonim notla karşılanan istekte karşılayan boştur (sitede)
  for (const [id, r] of S.requests) if (r && r.by === S.me && r.done && (r.doneBy ? r.doneBy !== S.me : S.supa && !!r.nid && !isMine(S.notes.get(r.nid)))) out.push({ at: r.doneAt || 0, r: Object.assign({ id }, r) });
  return out.sort((a, b) => b.at - a.at).slice(0, 30);
}
function likeTotal() {
  let t = 0;
  for (const n of S.notes.values()) if (n && isMine(n)) t += likeCount(n);
  for (const c of S.comments.values()) if (c && isMine(c)) t += likeCount(c);
  return t;
}
function notifState() {
  const seenAt = +ls.get('nseen:' + S.me, 0) || 0, likeSeen = ls.get('lseen:' + S.me, null);
  const items = notifItems(), lt = likeTotal();
  const newCm = items.filter(x => x.at > seenAt).length, newLk = likeSeen == null ? 0 : Math.max(0, lt - likeSeen);
  return { items, newCm, newLk, lt, seenAt, count: newCm + (newLk ? 1 : 0) };
}
function openNotifs() {
  if (!needAcc()) return;
  const st = notifState();
  const rows = st.items.map(x => {
    if (x.r) return `<li class="nf-row${x.at > st.seenAt ? ' new' : ''}"><a href="#/not/${esc(x.r.nid)}" data-close>${avatarHtml(x.r.doneBy, { anon: !x.r.doneBy, cls: 'sm' })}<span><span><b>${esc(x.r.doneBy ? displayName(x.r.doneBy, false, '') : 'Anonim biri')}</b>, ${esc(codeOf(x.r.cid))} not isteğini karşıladı ${gl('party', 'gl-in')}</span><span class="nf-time">${esc(ago(x.at))}</span></span></a></li>`;
    const n = S.notes.get(x.c.tid) || {};
    const who = x.c.anon ? 'Anonim' : displayName(x.c.by, false, x.c.nick);
    return `<li class="nf-row${x.at > st.seenAt ? ' new' : ''}"><a href="#/not/${esc(x.c.tid)}" data-close>${avatarHtml(x.c.by, { anon: !!x.c.anon, cls: 'sm' })}<span><span><b>${esc(who)}</b>, “${esc(n.title || 'notun')}” notuna yorum yazdı</span><span class="nf-text">${esc(String(x.c.text || '').slice(0, 90))}</span><span class="nf-time">${esc(ago(x.at))}</span></span></a></li>`;
  }).join('');
  const lk = st.newLk ? `<li class="nf-row new nf-like"><span class="nf-ico">${icon('heart')}</span><span>Notların ve yorumların <b>${st.newLk}</b> yeni ${gl('up', 'gl-in')} oy ve beğeni aldı.</span></li>` : '';
  closeNotifs();
  const bell = $('[data-r=bell]'), p = document.createElement('div');
  p.id = 'nf-pop'; p.className = 'nf-pop'; p.tabIndex = -1;
  p.setAttribute('role', 'dialog'); p.setAttribute('aria-labelledby', 'nf-pop-t');
  p.innerHTML = `<div class="nf-head"><h2 id="nf-pop-t">Bildirimler</h2><button type="button" class="iconbtn" data-close aria-label="Kapat">${icon('x')}</button></div>`
    + `<div class="nf-body">${(lk || rows) ? `<ul class="nf-list">${lk}${rows}</ul>` : emptyHtml('Henüz bildirim yok', 'Notuna yorum ya da oy gelince burada görünecek.')}</div>`;
  p.addEventListener('click', e => { const a = e.target.closest('a[href]'); if (a || e.target.closest('[data-close]')) closeNotifs(!a); });
  bell.after(p); bell.setAttribute('aria-expanded', 'true');
  placeNotifs();
  try { p.focus({ preventScroll: true }); } catch (e) { /* yok */ }
  ls.set('nseen:' + S.me, Date.now()); ls.set('lseen:' + S.me, st.lt);
  renderChrome();
}
/* Bildirimler ortadaki pencerede değil, zilin hemen altında açılan küçük panelde (üst çubukla birlikte durur).
   Zile yeniden basınca, dışarı basınca, Esc'te ya da bir bildirime gidince kapanır. */
function nfPop() { return document.getElementById('nf-pop'); }
function closeNotifs(focusBell) {
  const p = nfPop(); if (!p) return;
  p.remove();
  const b = $('[data-r=bell]');
  if (b) { b.setAttribute('aria-expanded', 'false'); if (focusBell) { try { b.focus({ preventScroll: true }); } catch (e) { /* yok */ } } }
}
function placeNotifs() {
  const p = nfPop(), b = $('[data-r=bell]');
  if (!p) return;
  if (!b || b.hidden) { closeNotifs(); return; }
  const r = b.getBoundingClientRect(), op = p.offsetParent, o = op ? op.getBoundingClientRect() : { left: 0, top: 0 };
  const vw = document.documentElement.clientWidth || innerWidth, w = Math.min(380, vw - 24);
  const x = Math.min(Math.max(12, r.right - w), vw - 12 - w);   // sağ kenarı zilin sağıyla hizalı, ekrandan taşmaz
  const nav = $('.bnav'), navH = nav ? nav.offsetHeight : 0;     // telefonda alt menünün üstünde biter
  Object.assign(p.style, { width: w + 'px', left: (x - o.left) + 'px', top: (r.bottom - o.top + 12) + 'px', maxHeight: Math.max(220, innerHeight - r.bottom - navH - 28) + 'px' });
  p.style.setProperty('--ax', Math.round(r.left + r.width / 2 - x) + 'px');   // üstteki ok zili gösterir
}
document.addEventListener('pointerdown', e => { const p = nfPop(), t = e.target; if (p && t && t.closest && !p.contains(t) && !t.closest('[data-r=bell]')) closeNotifs(); }, true);
window.addEventListener('resize', placeNotifs);
window.addEventListener('hashchange', () => closeNotifs());
function weekNote() {
  const now = Date.now(), pool = notesWhere(n => !isHidden(n) && voteScore(n) > 0);
  const pick = arr => arr.sort(byScore)[0] || null;
  const w = pick(pool.filter(n => now - (n.at || 0) < 7 * 864e5));
  if (w) return { n: w, label: 'Haftanın notu' };
  const m = pick(pool.filter(n => now - (n.at || 0) < 30 * 864e5));
  return m ? { n: m, label: 'Öne çıkan not' } : null;
}
function weekNoteHtml() {
  const w = weekNote(); if (!w) return '';
  const n = w.n, photos = Array.isArray(n.photos) ? n.photos.filter(okId) : [], di = driveInfo(n.drive) || { k: 'drive', name: 'Not' };
  const c = S.courses.get(n.cid) || {};
  return `<a class="week-note" href="#/not/${esc(n.id)}"><span class="wk-rib">${icon('star')}${esc(w.label)}</span><span class="wk-img">${photos.length ? `<img data-photo="${esc(photos[0])}" alt="">` : `<span class="ncard-drive k-${di.k}">${driveGlyph(di.k)}<b>${esc(di.name)}</b></span>`}</span><span class="wk-body"><span class="ncard-top"><span class="code">${esc(codeOf(n.cid))}</span>${c.name ? `<span class="wk-cname">${esc(c.name)}</span>` : ''}</span><b class="wk-title">${esc(n.title)}</b><span class="meta"><span>${whoHtml(n.by, n.anon, n.nick)}</span>${voteBadge(n)}</span></span></a>`;
}
function fillMoreNotes(root, n, nid) {
  const el = $('[data-r=more]', root); if (!el) return;
  const more = notesWhere(x => x.cid === n.cid && x.id !== nid && !isHidden(x)).sort(byHot).slice(0, 4);
  const h = more.length ? `<h2 class="sub-h">${esc(codeOf(n.cid))} için diğer notlar</h2><ul class="ncards">${more.map(noteCard).join('')}</ul>` : '';
  if (el.dataset.h !== h) { el.dataset.h = h; el.innerHTML = h; lazyPhotos(el); }
}
const BADGES = [
  { id: 'ilk-not', ad: 'İlk not', d: 'İlk notunu paylaştın.', g: 'note', ok: k => k.notes >= 1 },
  { id: 'not-5', ad: 'Not makinesi', d: '5 not paylaştın.', g: 'books', ok: k => k.notes >= 5 },
  { id: 'ilk-yorum', ad: 'Sohbet başladı', d: 'İlk yorumunu yazdın.', g: 'bubble', ok: k => k.comments >= 1 },
  { id: 'yorum-10', ad: 'Kantin muhabbeti', d: '10 yorum yazdın.', g: 'cay', ok: k => k.comments >= 10 },
  { id: 'ilk-puan', ad: 'Hoca ölçer', d: 'İlk hocanı puanladın.', g: 'star', ok: k => k.ratings >= 1 },
  { id: 'begeni-10', ad: 'Sevilen', d: '10 oy ya da beğeni topladın.', g: 'heart', ok: k => (k.likes || 0) + (k.ups || 0) >= 10 },
  { id: 'kubbe-500', ad: 'Kubbe avcısı', d: 'Toplam 500 kubbeye ulaştın.', g: 'dome', ok: k => k.all >= 500 },
  { id: 'podyum', ad: 'Podyum', d: 'Bu dönem ilk 3’e girdin.', g: 'trophy', ok: (k, uid) => { const r = ranking('term').find(x => x.uid === uid); return !!r && r.rank <= 3 && r.val > 0; } },
  { id: 'kurtarici', ad: 'Can kurtaran', d: 'Bir not isteğini karşıladın.', g: 'buoy', ok: k => (k.fills || 0) >= 1 }
];
function earnedBadges(uid) { const k = kubbeOf(uid); return BADGES.filter(b => { try { return b.ok(k, uid); } catch (e) { return false; } }); }
function badgeHtml(b, on) { return `<li class="bdg${on ? ' on' : ''}" title="${esc(b.d)}"><span class="bdg-medal"><span class="bdg-g">${gl(b.g)}</span></span><b>${esc(b.ad)}</b><span>${esc(on ? b.d : 'Kilitli')}</span></li>`; }
function badgesSectionHtml(uid) {
  const on = earnedBadges(uid).map(b => b.id);
  return `<section class="home-sec"><h2 class="sub-h">Rozetler <span class="count">${on.length}/${BADGES.length}</span></h2><ul class="bdgs">${BADGES.map(b => badgeHtml(b, on.includes(b.id))).join('')}</ul></section>`;
}
function checkBadges() {
  if (!myAcc() || !S.loaded.users || !S.loaded.notes || !S.loaded.comments || !S.loaded.hocas) return;
  const key = 'bseen:' + S.me, seen = ls.get(key, null), ids = earnedBadges(S.me).map(b => b.id);
  if (!Array.isArray(seen)) { ls.set(key, ids); return; }
  const fresh = ids.filter(id => !seen.includes(id));
  if (!fresh.length) return;
  ls.set(key, ids);
  const b = BADGES.find(x => x.id === fresh[0]);
  setTimeout(() => { toast(`Yeni rozet: ${b.ad}`, '', gl(b.g)); burst(innerWidth / 2, innerHeight * 0.45, { glyphs: ['spark', 'coin', 'spark', b.g], n: 26, cls: 'coin', spread: 160 }); }, 350);
}
function animNum(el, to) {
  if (!el) return;
  const from = +el.dataset.v || 0; el.dataset.v = String(to);
  if (!el.dataset.init || reduceMotion() || typeof requestAnimationFrame !== 'function' || from === to) { el.dataset.init = '1'; el.textContent = String(to); return; }
  const kb = el.closest('.kubbe-chip'); if (kb && to > from) popFx(kb);
  const t0 = (window.performance && performance.now()) || Date.now(), dur = 700;
  const step = t => { const k = Math.min(1, ((t || Date.now()) - t0) / dur); el.textContent = String(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
const THEMES = { '': 'Sistem', light: 'Açık', dark: 'Koyu' };
function applyTheme(v) {
  v = Object.prototype.hasOwnProperty.call(THEMES, v) ? v : '';
  const r = document.documentElement;
  if (v) r.setAttribute('data-theme', v); else r.removeAttribute('data-theme');
  const b = $('[data-r=theme]');
  if (b) b.innerHTML = (v === 'dark' ? icon('moon') : icon('sun')) + 'Tema: ' + THEMES[v];
}
function cycleTheme() { const order = ['', 'light', 'dark'], cur = ls.get('theme', ''), nx = order[(order.indexOf(cur) + 1) % order.length]; ls.set('theme', nx); applyTheme(nx); toast('Tema: ' + THEMES[nx]); }
function wireShortcuts() {
  document.addEventListener('keydown', e => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target, tag = (t && t.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable) || document.querySelector('.modal')) return;
    e.preventDefault();
    const inp = document.getElementById('home-q') || document.getElementById('s-q');
    if (inp) { inp.focus(); if (inp.select) inp.select(); return; }
    location.hash = '#/ara'; setTimeout(() => { const i = document.getElementById('s-q'); if (i) i.focus(); }, 80);
  });
}
/* Ayhan Abi: kampüsün köpeği (kullanıcının fotoğrafındaki gibi). Kısa bacaklı; sırtı, başı ve sarkık kulakları siyah,
   kaşları ve ağız kenarı açık kahve, göğsü ve patileri beyaz. Siyah parçalar (.k) koyu temada açık bir kenar çizgisi alır.
   AYHAN_SVG yandan: .ay kabı walk / idle / sleep sınıfıyla duruşunu değiştirir, uyurken kulübesinin paspasında yatar.
   AYHAN_FACE önden oturur: turda konuşan yüz (.talk ağzı oynatır). */
const AYHAN_SVG = '<svg class="ay-svg" viewBox="0 2 120 58" aria-hidden="true"><g class="ay-stand"><g class="dw-body">'
  + '<path class="dw-tail" d="M35 31.6c-6.5-1.6-10-6.4-10.4-12.4" fill="none" stroke="#26262E" stroke-width="5" stroke-linecap="round"/>'
  + '<g class="dw-legs-b"><rect x="45.6" y="42" width="5.6" height="11.4" rx="2.8" fill="#93552A" stroke="#1B1330" stroke-width=".8"/><rect x="83.6" y="42" width="5.6" height="11.4" rx="2.8" fill="#D8D1C3" stroke="#1B1330" stroke-width=".8"/>'
  + '<ellipse cx="49" cy="54.8" rx="3.4" ry="2" fill="#D8D1C3" stroke="#1B1330" stroke-width=".8"/><ellipse cx="87" cy="54.8" rx="3.4" ry="2" fill="#D8D1C3" stroke="#1B1330" stroke-width=".8"/></g>'
  + '<g class="dw-legs-a"><rect x="38.4" y="42" width="6" height="12" rx="3" fill="#C2763A" stroke="#1B1330" stroke-width="1"/><rect x="76" y="42" width="6" height="12" rx="3" fill="#F5F1E8" stroke="#1B1330" stroke-width="1"/>'
  + '<circle cx="78.2" cy="48.8" r=".8" fill="#55565F"/><circle cx="80" cy="51.4" r=".7" fill="#55565F"/>'
  + '<ellipse cx="42.2" cy="55.2" rx="3.9" ry="2.2" fill="#F5F1E8" stroke="#1B1330" stroke-width="1"/><ellipse cx="79.8" cy="55.2" rx="3.9" ry="2.2" fill="#F5F1E8" stroke="#1B1330" stroke-width="1"/></g>'
  + '<path class="k" d="M33 36c0-7 6-11 14-11h28c10 0 17 4 17.5 11 .5 7-5 12-13 12H46c-8 0-13-5-13-12z" fill="#26262E"/>'
  + '<path d="M39 29.4c7-3.2 18-4.2 31-3.6" fill="none" stroke="#40404C" stroke-width="1.6" stroke-linecap="round"/>'
  + '<path d="M34.6 40c2 4.4 6 7 10.4 7.6" fill="none" stroke="#C2763A" stroke-width="2.2" stroke-linecap="round"/>'
  + '<path class="k" d="M80 27c3-6 9-9.4 14-9.4l6.4 12.2c-4 4-10 6.2-16.4 6.4z" fill="#26262E"/>'
  + '<path d="M92.4 35.5c.6 6.2-4.2 11.6-11.4 12.4l-5.4.1c4.6-3.6 8-9.6 9.2-16.6z" fill="#F5F1E8"/>'
  + '<path d="M98.6 27.6c-2 3.4-5.4 6.2-9.6 8l2.6 2.4c3.6-1.8 6.6-4.8 8.6-8.4z" fill="#F5F1E8"/>'
  + '<g class="ay-head"><ellipse class="k" cx="97" cy="20.3" rx="10.6" ry="9.8" fill="#26262E"/>'
  + '<path class="k" d="M100.6 15.4c4.4.6 8.4 2.6 10.6 5.2 1.2 1.4.8 3.6-.8 4.4l-8 3.2c-3 .8-6-1-6.6-4.2-.6-3.6 1.4-8.8 4.8-8.6z" fill="#26262E"/>'
  + '<path d="M99 24.4c3.4.6 7.4.2 10.8-1.4l.6 1.6c-.4 1.6-2 2.6-3.8 3.2l-4.2 1.4c-2.4.4-3.4-.6-3.4-2z" fill="#C2763A"/>'
  + '<ellipse cx="96.2" cy="25.4" rx="3" ry="2" fill="#C2763A"/>'
  + '<path d="M103.4 27.4c2.2-.2 4.4-.8 6.4-2.2l.4 1.2c-2 1.8-4.2 2.8-6.6 3z" fill="#5B1A24"/>'
  + '<path class="ay-jaw" d="M103.2 27.2c2.4-.2 4.6-.8 6.6-2.2-.2 1.6-1.4 3-3.2 3.8l-2.2.8c-1 .2-1.2-.6-1.2-1.4z" fill="#C2763A"/>'
  + '<path d="M110 24.4c-2 1.4-4.6 2.4-7 2.6" fill="none" stroke="#0F0F13" stroke-width="1" stroke-linecap="round"/>'
  + '<ellipse cx="110.9" cy="21.4" rx="2.3" ry="2" fill="#0F0F13"/><circle cx="110.3" cy="20.7" r=".55" fill="#6A6A76"/>'
  + '<ellipse cx="100.4" cy="14.8" rx="2.2" ry="1.3" fill="#C2763A"/>'
  + '<ellipse cx="100.6" cy="18.3" rx="1.6" ry="1.7" fill="#2A160B"/><circle cx="101.1" cy="17.7" r=".55" fill="#fff"/>'
  + '<path class="k" d="M93 12.4c-4.6-.6-8.2 3.6-8.6 9.6-.4 5.2 1.6 9.6 4.6 9.8 3 .2 5-4 5.4-9.2.2-4.2 0-7.6-1.4-10.2z" fill="#17171D"/>'
  + '<path d="M92.4 15.4c.6 3 .6 7-.6 11" fill="none" stroke="#383844" stroke-width="1.1" stroke-linecap="round"/></g></g></g>'
  + '<g class="ay-sleep" transform="translate(-4 0)"><path d="M31.4 51.6c-3 1.6-2.6 4.6.6 5.4 4.4 1 11.6.6 17-.6" fill="none" stroke="#26262E" stroke-width="4" stroke-linecap="round"/>'
  + '<g class="ay-breath"><path class="k" d="M30 50c-.6-8.6 9.6-13.6 24.6-13.6 13.8 0 23.4 4.4 24.4 11.6.8 6-4.6 9.8-12.6 9.8H39.6c-6 0-9.4-3-9.6-7.8z" fill="#26262E"/>'
  + '<path d="M38 42c6-3.4 16-4.6 26-3.6" fill="none" stroke="#40404C" stroke-width="1.6" stroke-linecap="round"/>'
  + '<path d="M40 52c3 2.6 8 3.6 13 2.8" fill="none" stroke="#C2763A" stroke-width="2.4" stroke-linecap="round"/></g>'
  + '<ellipse cx="54" cy="55.6" rx="4.6" ry="2.1" fill="#F5F1E8" stroke="#1B1330" stroke-width=".9"/>'
  + '<path d="M74 45.4c3.6 1 6.4 4.6 6 8.6l-7.6 2c.8-3.6 1-7.4 1.6-10.6z" fill="#F5F1E8"/>'
  + '<ellipse cx="93.4" cy="55.2" rx="5.6" ry="2.2" fill="#D8D1C3" stroke="#1B1330" stroke-width=".9"/><ellipse cx="86.6" cy="56" rx="6.4" ry="2.4" fill="#F5F1E8" stroke="#1B1330" stroke-width="1"/>'
  + '<ellipse class="k" cx="83" cy="47.4" rx="9.4" ry="7.6" fill="#26262E"/>'
  + '<path class="k" d="M87.6 45.6c4.6-.6 8.6 1.2 10 4 .8 2-.6 3.8-3 4l-7.2.6c-2.2.2-3.6-1.4-3.6-3.6 0-2.4 1.6-4.6 3.8-5z" fill="#26262E"/>'
  + '<path d="M88.2 51.4c3 .6 6.2.6 9.2-.2-.4 1.4-1.6 2.4-3.4 2.6l-4.2.4c-1 0-1.6-.6-1.6-1.4z" fill="#C2763A"/>'
  + '<ellipse cx="97.2" cy="49.3" rx="1.8" ry="1.5" fill="#0F0F13"/>'
  + '<path class="k" d="M78.6 41.4c-4 .8-6.2 5-5.4 9.2.6 3.2 3.4 4.6 5.6 2.8 1.8-1.6 1.8-6.4.8-11.2z" fill="#17171D"/>'
  + '<ellipse cx="87.4" cy="43.2" rx="2" ry="1.2" fill="#C2763A"/><path d="M85.6 46.2q1.7 1.4 3.4 0" fill="none" stroke="#D7A877" stroke-width="1.1" stroke-linecap="round"/>'
  + '<g class="ay-zzz"><text x="94" y="37">z</text><text x="100" y="28">z</text><text x="106" y="18">Z</text></g></g></svg>';
const AYHAN_FACE = '<ellipse cx="60" cy="128.6" rx="46" ry="3.2" fill="#0B1030" opacity=".14"/>'
  + '<path class="af-tail" d="M86 121c11 1 18-5 18-14" fill="none" stroke="#26262E" stroke-width="6" stroke-linecap="round"/>'
  + '<ellipse class="k" cx="32" cy="109" rx="16.5" ry="16" fill="#26262E"/><ellipse class="k" cx="88" cy="109" rx="16.5" ry="16" fill="#26262E"/>'
  + '<path d="M19 117c2.6 5 8 8 15 8M101 117c-2.6 5-8 8-15 8" fill="none" stroke="#C2763A" stroke-width="3.4" stroke-linecap="round"/>'
  + '<ellipse cx="23" cy="125.4" rx="8.4" ry="3.6" fill="#F5F1E8" stroke="#1B1330" stroke-width="1.2"/><ellipse cx="97" cy="125.4" rx="8.4" ry="3.6" fill="#F5F1E8" stroke="#1B1330" stroke-width="1.2"/>'
  + '<path class="k" d="M40 66c-7 18-9 39-6.4 60h52.8c2.6-21 .6-42-6.4-60-6-6-34-6-40 0z" fill="#26262E"/>'
  + '<path d="M47.6 59c-7.6 12.4-9.6 29-6.6 43 2.2 10 9.4 16.6 19 17.6 9.6-1 16.8-7.6 19-17.6 3-14 1-30.6-6.6-43-5 4.4-19.8 4.4-24.8 0z" fill="#F5F1E8"/>'
  + '<path d="M43.4 84l-3.6 2.8 4 1.2M76.6 84l3.6 2.8-4 1.2M44 72l-3 2.2 3.4 1M76 72l3 2.2-3.4 1" fill="none" stroke="#F5F1E8" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'
  + '<path d="M45.4 97c-1 9.6-1 18.4 0 27.6h11.2c1-9.2 1-18 0-27.6zM63.4 97c-1 9.6-1 18.4 0 27.6h11.2c1-9.2 1-18 0-27.6z" fill="#F5F1E8" stroke="#1B1330" stroke-width="1.2"/>'
  + '<g fill="#5A5B66"><circle cx="48.6" cy="104.6" r="1"/><circle cx="52.4" cy="109" r=".9"/><circle cx="49.2" cy="113.6" r=".8"/><circle cx="53.6" cy="117.2" r=".7"/><circle cx="67.4" cy="106.4" r=".9"/><circle cx="71.2" cy="111" r="1"/><circle cx="68" cy="115.6" r=".75"/></g>'
  + '<ellipse cx="51" cy="125" rx="8.2" ry="4.3" fill="#F5F1E8" stroke="#1B1330" stroke-width="1.2"/><ellipse cx="69" cy="125" rx="8.2" ry="4.3" fill="#F5F1E8" stroke="#1B1330" stroke-width="1.2"/>'
  + '<path d="M47.6 123.4v2.8M51 123.2v3M54.4 123.4v2.8M65.6 123.4v2.8M69 123.2v3M72.4 123.4v2.8" stroke="#1B1330" stroke-width="1" stroke-linecap="round" opacity=".5"/>'
  + '<g class="af-head"><path class="k af-ear af-ear-l" d="M42.6 25.6c-11.2-.4-16.4 13-15.4 27.4.6 9.4 6 14.6 11.4 11.6 5.2-3 6.2-14.2 7.4-27.6z" fill="#17171D"/>'
  + '<path class="k af-ear af-ear-r" d="M77.4 25.6c11.2-.4 16.4 13 15.4 27.4-.6 9.4-6 14.6-11.4 11.6-5.2-3-6.2-14.2-7.4-27.6z" fill="#17171D"/>'
  + '<path class="k" d="M60 15.6c15.4 0 24.6 10.4 24.6 25.4 0 13.6-9.4 22.6-24.6 22.6S35.4 54.6 35.4 41C35.4 26 44.6 15.6 60 15.6z" fill="#26262E"/>'
  + '<path d="M51.4 21.4c5.4-2.2 11.8-2.2 17.2 0" fill="none" stroke="#40404C" stroke-width="1.6" stroke-linecap="round"/>'
  + '<ellipse cx="49.6" cy="31.6" rx="4.2" ry="2.6" fill="#C2763A"/><ellipse cx="70.4" cy="31.6" rx="4.2" ry="2.6" fill="#C2763A"/>'
  + '<g class="af-eyes"><ellipse cx="50.6" cy="38.4" rx="3.7" ry="4" fill="#2A160B"/><ellipse cx="69.4" cy="38.4" rx="3.7" ry="4" fill="#2A160B"/><circle cx="51.8" cy="37" r="1.2" fill="#fff"/><circle cx="70.6" cy="37" r="1.2" fill="#fff"/></g>'
  + '<path d="M46.6 46.4c0-4.4 6.2-6.6 13.4-6.6s13.4 2.2 13.4 6.6l1 6c-1 6.2-7.2 10.4-14.4 10.4S46.6 58.6 45.6 52.4z" fill="#C2763A"/>'
  + '<path d="M55.6 27c1 6.4 1.2 12.6.2 18.4h8.4c-1-5.8-.8-12 .2-18.4-2.4-1.2-6.4-1.2-8.8 0z" fill="#26262E"/>'
  + '<g class="af-mouth"><path d="M53.2 53.6c2 5.4 11.6 5.4 13.6 0z" fill="#5B1A24"/><path d="M56.6 55.8c1.2 2.8 5.6 2.8 6.8 0z" fill="#E46A7B"/></g>'
  + '<ellipse class="af-chin" cx="60" cy="58.6" rx="6.2" ry="2.6" fill="#A8662F"/>'
  + '<path d="M53.4 46.2c0-2.8 13.2-2.8 13.2 0 0 3.2-3.8 5.6-6.6 5.6s-6.6-2.4-6.6-5.6z" fill="#0F0F13"/><ellipse cx="57.6" cy="45.6" rx="2" ry=".9" fill="#5C5C68"/>'
  + '<path d="M60 51.8v1.8M52.6 53.2c2.6 2.4 5 2.6 7.4.4 2.4 2.2 4.8 2 7.4-.4" fill="none" stroke="#0F0F13" stroke-width="1.3" stroke-linecap="round"/></g>';
const ayFaceSvg = (cls = '') => `<svg class="af-svg${cls ? ' ' + cls : ''}" viewBox="0 0 120 132" aria-hidden="true">${AYHAN_FACE}</svg>`;
/* Ana sayfada Ayhan Abi'nin köşesi: kırmızı kulübe, önünde paspas (uyurken üstünde yatar, .ay-mat), yanında mama kabı */
const KULUBE_SVG = '<svg viewBox="0 0 132 100" aria-hidden="true"><ellipse cx="66" cy="96.6" rx="62" ry="3.2" fill="#0B1030" opacity=".12"/>'
  + '<path d="M14 42 51 15l37 27v50H14z" fill="#D63A3A" stroke="#1B1330" stroke-width="2.2" stroke-linejoin="round"/>'
  + '<path d="M15 56h72M15 70h72M15 84h72" stroke="#B32B2B" stroke-width="1.4"/>'
  + '<path d="M3 46 51 9l48 37-6.4 4.6L51 18.4 9.4 50.6z" fill="#7E1D25" stroke="#1B1330" stroke-width="2.2" stroke-linejoin="round"/>'
  + '<path d="M37 92V70c0-8.6 6.2-14 14-14s14 5.4 14 14v22z" fill="#2A1820" stroke="#1B1330" stroke-width="2"/>'
  + '<rect x="34" y="36.6" width="34" height="11.4" rx="2.6" fill="#F6E2BE" stroke="#1B1330" stroke-width="1.6"/><text class="ay-plate" x="51" y="45" text-anchor="middle">AYHAN</text>'
  + '<path class="ay-mat" d="M23.6 89.4h54.8l5 7.2H18.6z" fill="#C99B5C" stroke="#1B1330" stroke-width="1.6" stroke-linejoin="round"/>'
  + '<path d="M26.6 91.4h48.8l2.4 3.4H24.2z" fill="none" stroke="#8E6431" stroke-width="1.2"/>'
  + '<path d="M104 87.6h24l-3.2 8.6h-17.6z" fill="#2E5BD8" stroke="#1B1330" stroke-width="1.6" stroke-linejoin="round"/>'
  + '<ellipse cx="116" cy="87.6" rx="12" ry="2.6" fill="#7A4823" stroke="#1B1330" stroke-width="1.4"/>'
  + '<g fill="#B0703A"><circle cx="111" cy="86.7" r="1.4"/><circle cx="115.6" cy="85.9" r="1.5"/><circle cx="120.2" cy="86.7" r="1.3"/></g>'
  + '<path d="M107.4 91.8h17" stroke="#9DB6FF" stroke-width="1.1" stroke-linecap="round" opacity=".8"/></svg>';
/* Turun açılışı: Yeditepe'nin Selçuklu kapısı (marketteki Selçuklu Kapısı çerçevesinin büyüğü). Dokununca kanatlar açılır, içeride Ayhan Abi bekler. */
const GATE_SVG = (() => {
  const zig = Array.from({ length: 15 }, (_, i) => `l6-9 6 9`).join('');
  const twist = x => Array.from({ length: 24 }, (_, i) => `M${x} ${100 + i * 8}l12-6`).join('');
  const muq = (y, x0, n) => `M${x0} ${y}` + 'q6-8 12 0'.repeat(n);
  const studs = xs => xs.map(x => [214, 236, 258, 278].map(y => `<circle cx="${x}" cy="${y}" r="1.7"/>`).join('')).join('');
  return '<svg class="tg-svg" viewBox="0 0 240 300" aria-hidden="true"><defs>'
    + '<linearGradient id="tg-st" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6E2BE"/><stop offset="1" stop-color="#C9955A"/></linearGradient>'
    + '<pattern id="tg-pt" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M8 0l2.6 5.4L16 8l-5.4 2.6L8 16l-2.6-5.4L0 8l5.4-2.6z" fill="#B07B3E" opacity=".42"/></pattern>'
    + '<radialGradient id="tg-li" cx="50%" cy="72%" r="70%"><stop offset="0" stop-color="#FFF8DC"/><stop offset=".55" stop-color="#FFD45E"/><stop offset="1" stop-color="#F09A22"/></radialGradient>'
    + '<linearGradient id="tg-wd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8F5A2A"/><stop offset="1" stop-color="#5A3414"/></linearGradient>'
    + '<radialGradient id="tg-gl"><stop offset="0" stop-color="#FFE08A" stop-opacity=".95"/><stop offset="1" stop-color="#FFE08A" stop-opacity="0"/></radialGradient></defs>'
    + '<g fill="#FFF6D6"><circle cx="16" cy="24" r="1.4"/><circle cx="40" cy="8" r="1"/><circle cx="214" cy="14" r="1.5"/><circle cx="230" cy="44" r="1"/><circle cx="10" cy="70" r="1"/><circle cx="226" cy="96" r="1.2"/></g>'
    + '<ellipse class="tg-glow" cx="120" cy="246" rx="118" ry="74" fill="url(#tg-gl)"/>'
    + '<rect x="36" y="52" width="168" height="238" fill="url(#tg-st)" stroke="#5E3F1C" stroke-width="2.5"/><rect x="36" y="52" width="168" height="238" fill="url(#tg-pt)"/>'
    + `<path d="M30 40${zig}v14H30z" fill="#E9CFA0" stroke="#5E3F1C" stroke-width="2.5" stroke-linejoin="round"/>`
    + '<path d="M30 48h180" stroke="#B07B3E" stroke-width="2"/>'
    + '<rect x="70" y="62" width="100" height="21" rx="2" fill="#EBD3A4" stroke="#5E3F1C" stroke-width="2"/><text class="tg-kitabe" x="120" y="77" text-anchor="middle">HOŞ GELDİN</text>'
    + '<rect x="43" y="88" width="18" height="7" fill="#D9B27A" stroke="#5E3F1C" stroke-width="2"/><rect x="179" y="88" width="18" height="7" fill="#D9B27A" stroke="#5E3F1C" stroke-width="2"/>'
    + '<rect x="46" y="95" width="12" height="195" fill="#E9CFA0" stroke="#5E3F1C" stroke-width="2"/><rect x="182" y="95" width="12" height="195" fill="#E9CFA0" stroke="#5E3F1C" stroke-width="2"/>'
    + `<path d="${twist(46)}${twist(182)}" stroke="#B07B3E" stroke-width="1.6"/>`
    + '<path d="M66 290V156Q66 100 120 84q54 16 54 72v134z" fill="#EBD3A4" stroke="#5E3F1C" stroke-width="2.5" stroke-linejoin="round"/>'
    + '<path d="M78 290V158Q78 112 120 98q42 14 42 60v132z" fill="#D9B27A" stroke="#5E3F1C" stroke-width="2" stroke-linejoin="round"/>'
    + `<path d="${muq(150, 84, 6)}${muq(138, 90, 5)}${muq(126, 96, 4)}${muq(114, 102, 3)}" fill="none" stroke="#8A5A2B" stroke-width="1.8" stroke-linejoin="round"/>`
    + '<circle cx="120" cy="104" r="3" fill="#FFD23F" stroke="#8A5A2B" stroke-width="1"/>'
    + '<path d="M90 290V200q0-28 30-38q30 10 30 38v90z" fill="url(#tg-li)" stroke="#5E3F1C" stroke-width="2"/>'
    + '<g class="tg-door tg-door-l"><path d="M90 290V200q0-28 30-38V290z" fill="url(#tg-wd)" stroke="#3A210C" stroke-width="2"/><path d="M96 284V204q0-18 18-26v106z" fill="none" stroke="#3A210C" stroke-width="1.2"/>'
    + `<g fill="#E2B064">${studs([100, 108])}</g><circle cx="114.5" cy="242" r="3.2" fill="none" stroke="#FFD23F" stroke-width="2"/></g>`
    + '<g class="tg-door tg-door-r"><path d="M150 290V200q0-28-30-38V290z" fill="url(#tg-wd)" stroke="#3A210C" stroke-width="2"/><path d="M144 284V204q0-18-18-26v106z" fill="none" stroke="#3A210C" stroke-width="1.2"/>'
    + `<g fill="#E2B064">${studs([132, 140])}</g><circle cx="125.5" cy="242" r="3.2" fill="none" stroke="#FFD23F" stroke-width="2"/></g>`
    + `<g class="tg-ayhan"><svg x="80" y="200" width="80" height="88" viewBox="0 0 120 132">${AYHAN_FACE}</svg></g>`
    + '<circle class="tg-tap" cx="120" cy="238" r="15" fill="none" stroke="#FFD23F" stroke-width="3"/>'
    + '<path d="M86 290h68" stroke="#FFD23F" stroke-width="3" stroke-linecap="round"/>'
    + '<path d="M26 290h188v5H26z" fill="#C9955A" stroke="#5E3F1C" stroke-width="2"/><path d="M14 295h212v5H14z" fill="#B7834A" stroke="#5E3F1C" stroke-width="2"/></svg>';
})();
const AYHAN_SAY = {
  hi: 'Ben Ayhan Abi. Hav!',
  pet: ['Hav!', 'Hav hav!', 'Kuyruğum durmuyor.', 'Bir sosisli olsa fena olmazdı.', 'Derslerine çalıştın mı bakalım?', 'Yokuşu bugün kaç kere çıktın?', 'Ringde yer var mı?', 'Notunu paylaştın mı?'],
  wake: ['Hı? Uyumuyordum ki.', 'Beş dakika daha…', 'Hav! Buradayım.']
};
/* Ana sayfada Ayhan Abi: rastgele yürür, durup kuyruk sallar, ara sıra bir köşede uyur. Dokununca havlar, uyuyorsa uyanır. */
function startAyhan(stage) {
  const dog = stage && stage.querySelector('.ay-roam');
  if (!dog) return () => {};
  let x = 0, timer = 0, dead = false, state = '';
  const W = () => Math.max(0, stage.clientWidth - dog.offsetWidth);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const set = st => { state = st; dog.classList.remove('walk', 'idle', 'sleep'); dog.classList.add(st); if (st === 'sleep') dog.classList.remove('left'); dog.setAttribute('aria-label', st === 'sleep' ? 'Ayhan Abi kulübesinin önünde uyuyor. Uyandırmak için dokun.' : 'Ayhan Abi, kampüsün köpeği. Sevmek için dokun.'); };
  // uyku yeri: kulübenin önündeki paspas (uyurken çizimi kutunun ortasında olduğu için paspasın ortasına hizalanır)
  const homeX = () => { const m = stage.querySelector('.ay-mat'); if (!m) return W(); const r = m.getBoundingClientRect(), s = stage.getBoundingClientRect(); return Math.max(0, Math.min(W(), r.left + r.width / 2 - s.left - dog.offsetWidth / 2)); };
  const after = (ms, fn) => { clearTimeout(timer); timer = setTimeout(() => { if (!dead && !document.hidden) fn(); }, ms); };
  const place = (nx, ms) => { dog.style.transitionDuration = Math.round(ms) + 'ms'; dog.style.transform = `translateX(${Math.round(nx)}px)`; };
  const nowX = () => { try { const m = new DOMMatrixReadOnly(getComputedStyle(dog).transform); return isFinite(m.m41) ? m.m41 : x; } catch (e) { return x; } };
  function walkTo(nx, then) {
    nx = Math.max(0, Math.min(W(), nx));
    const dist = Math.abs(nx - x);
    if (dist < 12) { then(); return; }
    dog.classList.toggle('left', nx < x);
    set('walk');
    const ms = dist / 58 * 1000;
    place(nx, ms); x = nx;
    after(ms + 80, then);
  }
  function next() {
    const r = Math.random(), w = W();
    if (r < 0.5) walkTo(rnd(0, w), () => { set('idle'); after(rnd(1800, 4500), next); });
    else if (r < 0.72) { set('idle'); after(rnd(2500, 5000), next); }
    else walkTo(homeX(), () => { set('sleep'); after(rnd(10000, 22000), () => { set('idle'); after(1500, next); }); });
  }
  dog.addEventListener('click', () => {
    const was = state;
    if (was === 'walk') { x = nowX(); place(x, 0); }
    set('idle');
    const hi = !ls.get('ayhanHi', false); if (hi) ls.set('ayhanHi', true);
    petDog(dog, hi ? AYHAN_SAY.hi : (was === 'sleep' ? AYHAN_SAY.wake : AYHAN_SAY.pet)[Math.floor(Math.random() * (was === 'sleep' ? AYHAN_SAY.wake : AYHAN_SAY.pet).length)]);
    if (!reduceMotion()) after(rnd(3000, 5000), next);
  });
  const w0 = W();
  if (reduceMotion()) { x = homeX(); place(x, 0); set('sleep'); }
  else if (Math.random() < 0.35) { x = homeX(); place(x, 0); set('sleep'); after(rnd(6000, 14000), () => { set('idle'); after(1200, next); }); }
  else { x = rnd(0, w0); place(x, 0); set('idle'); after(rnd(700, 2000), next); }
  const onVis = () => { if (!document.hidden && !reduceMotion() && state !== 'walk') after(1500, next); };
  const onResize = () => { if (state === 'sleep') { x = homeX(); place(x, 0); return; } const w = W(); if (x > w) { x = w; place(x, 0); } };
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('resize', onResize);
  return () => { dead = true; clearTimeout(timer); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('resize', onResize); };
}
function noteCard(n) {
  if (isHidden(n) && !S.revealed.has(n.id)) return noteRow(n, { showCourse: true });
  const type = noteType(n).name;
  const photos = Array.isArray(n.photos) ? n.photos.filter(okId) : [];
  return `<li class="ncard"><a class="ncard-link" href="#/not/${esc(n.id)}">
    <span class="ncard-img">${photos.length ? `<img data-photo="${esc(photos[0])}" alt="">` : `${(() => { const di = driveInfo(n.drive) || { k: 'drive', name: 'Drive' }; return `<span class="ncard-drive k-${di.k}">${driveGlyph(di.k)}<b>${esc(di.name)}</b></span>`; })()}${driveThumbHtml(n.drive)}`}${photos.length > 1 ? `<span class="ncard-pages">${photos.length} sayfa</span>` : ''}</span>
    <span class="ncard-body"><span class="ncard-top"><span class="code">${esc(codeOf(n.cid))}</span><span class="kind kind-${noteType(n).k}">${esc(type)}</span></span>
      <span class="ncard-title">${esc(n.title)}</span>
      <span class="meta"><span>${whoHtml(n.by, n.anon, n.nick)}</span><span>${esc(ago(n.at))}</span>${voteBadge(n)}</span></span></a></li>`;
}
function noteRow(n, { showCourse = false } = {}) {
  if (isHidden(n) && !S.revealed.has(n.id)) return `<li><div class="is-hidden"><span>Bu not bildirimler nedeniyle gizlendi.</span><button type="button" class="btn btn-sm btn-ghost" data-g="reveal" data-id="${esc(n.id)}">Yine de göster</button></div></li>`;
  const type = noteType(n).name;
  const h = n.h && S.hocas.get(n.h);
  const photos = Array.isArray(n.photos) ? n.photos.filter(okId) : [];
  const cc = commentCount('note', n.id);
  const ico = photos.length ? `<span class="note-ico"><img data-photo="${esc(photos[0])}" alt=""></span>` : `<span class="note-ico">${icon('external')}${driveThumbHtml(n.drive)}</span>`;
  return `<li class="note-row">
    ${ico}
    <div class="note-body">
      <div class="note-line">${showCourse ? `<a class="code" href="#/ders/${esc(n.cid)}">${esc(codeOf(n.cid))}</a>` : ''}<span class="kind kind-${noteType(n).k}">${esc(type)}</span></div>
      <a class="note-title" href="#/not/${esc(n.id)}">${esc(n.title)}</a>
      <div class="meta">${n.tk ? `<span>${esc(termLabel(n.tk))}</span>` : ''}${h ? `<a href="#/hoca/${esc(n.h)}">${esc(hocaFull(h))}</a>` : ''}<span>${whoHtml(n.by, n.anon, n.nick)}</span><span>${esc(ago(n.at))}</span></div>
    </div>
    <div class="note-side">
      <span class="chips">${photos.length ? `<span class="pill">${icon('camera')}${photos.length} sayfa</span>` : ''}${n.drive ? `<span class="pill">${icon('external')}${esc((driveInfo(n.drive) || { name: 'Drive' }).name)}</span>` : ''}</span>
      <span class="note-stats">${voteHtml(n)}<a class="iconbtn" href="#/not/${esc(n.id)}" aria-label="${cc} yorum">${icon('comment')}${cc}</a></span>
    </div>
  </li>`;
}
function hocaOptions(cid, sel) {
  const byName = (a, b) => hocaName(a).localeCompare(hocaName(b), 'tr');
  const linked = cid ? [...hocasOfCourse(cid).entries()].sort((a, b) => b[1].son - a[1].son || byName(a[0], b[0])).map(([id]) => id) : [];
  const bols = cid ? bolumlerOf(cid).concat(secmeliOf(cid)) : [];
  const shown = new Set(linked);
  const dept = bols.length && bols.length <= 4 ? [...S.hocas.entries()].filter(([id, h]) => !shown.has(id) && h.bolum && bols.includes(h.bolum)).map(([id]) => id).sort(byName).slice(0, 80) : [];
  dept.forEach(id => shown.add(id));
  const rest = S.hocas.size <= 80 ? [...S.hocas.keys()].filter(id => !shown.has(id)).sort(byName) : (sel && S.hocas.has(sel) && !shown.has(sel) ? [sel] : []);
  const opt = id => `<option value="${esc(id)}"${id === sel ? ' selected' : ''}>${esc(hocaFull(S.hocas.get(id)))}</option>`;
  return (linked.length ? `<optgroup label="Bu dersi verenler">${linked.map(opt).join('')}</optgroup>` : '')
    + (dept.length ? `<optgroup label="Bölümün akademik kadrosu">${dept.map(opt).join('')}</optgroup>` : '')
    + (rest.length ? `<optgroup label="${S.hocas.size <= 80 ? 'Diğer hocalar' : 'Seçtiğin hoca'}">${rest.map(opt).join('')}</optgroup>` : '');
}

/* ================= Hesap açma ve profil ================= */
/* Profil resmi seçici: tür (emoji / harf / market ürünü) ve arka plan rengi. Fotoğraf yüklenmez */
function avatarPickerHtml(st) {
  const own = MARKET.filter(m => ownsItem(st, m.id));
  const kinds = [['emoji', 'Karakter'], ['harf', 'Harf'], ['urun', 'Market']];
  return `<div class="field"><span class="label">Profil resmi</span>
    <div class="av-pick">
      <span class="av-prev" data-r="prev"></span>
      <div class="av-opts">
        <div class="seg av-kind" role="group" aria-label="Profil resmi türü">${kinds.map(([k, ad]) => `<button type="button" class="seg-btn" data-avk="${k}" aria-pressed="${st.avk === k}">${ad}</button>`).join('')}</div>
        <div class="av-pane" data-avp="emoji">
          <div class="emoji-grid">${AV_EMOJI.map(e => `<button type="button" class="emoji-btn" data-emoji="${esc(e)}" aria-pressed="false" aria-label="${esc(AV_NAMES[e] || 'Karakter')}" title="${esc(AV_NAMES[e] || '')}">${avArt(e)}</button>`).join('')}</div>
        </div>
        <div class="av-pane" data-avp="harf" hidden>
          <input class="input sm harf-in" data-r="harf-in" maxlength="2" autocomplete="off" placeholder="UY" aria-label="Profil resmindeki harfler" value="${esc(st.harf || '')}">
          <p class="help">Bir ya da iki harf, örneğin adının baş harfleri.</p>
        </div>
        <div class="av-pane" data-avp="urun" hidden>
          ${own.length ? `<div class="urun-grid">${own.map(m => `<button type="button" class="urun-btn" data-urun="${esc(m.id)}" aria-pressed="false" title="${esc(m.name)}" aria-label="${esc(m.name)}"><img src="${itemAvSrc(m.id)}" alt=""></button>`).join('')}</div><p class="help">Aldığın ürün animasyonuyla profil resmin olur.</p>`
            : '<p class="help">Marketten aldığın ürünler burada profil resmi olarak seçilebilir. <a href="#/kubbe" data-close>Markete göz at</a></p>'}
        </div>
        <div class="color-row" role="group" aria-label="Arka plan rengi">${AV_COLORS.map(c => `<button type="button" class="color-btn" data-color="${esc(c)}" data-bg="${esc(c)}" aria-pressed="false" aria-label="Arka plan rengi ${esc(c)}"></button>`).join('')}<label class="color-own"><input type="color" data-r="color-in" value="${esc((okHex(st.color) ? st.color : AV_COLORS[0]).toLowerCase())}" aria-label="Kendi arka plan rengin"><span>Kendi rengin</span></label></div>
      </div>
    </div></div>`;
}
function wireAvatarPicker(root, st) {
  const prev = $('[data-r=prev]', root), hin = $('[data-r=harf-in]', root), cin = $('[data-r=color-in]', root);
  function paint() {
    prev.innerHTML = avFace(st, 'xl' + avFx(st));
    applyWidths(root);
    $$('[data-avk]', root).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.avk === st.avk)));
    $$('[data-avp]', root).forEach(p => { p.hidden = p.dataset.avp !== st.avk; });
    $$('[data-emoji]', root).forEach(b => b.setAttribute('aria-pressed', String(st.avk === 'emoji' && b.dataset.emoji === st.emoji)));
    $$('[data-urun]', root).forEach(b => b.setAttribute('aria-pressed', String(st.avk === 'urun' && b.dataset.urun === st.urun)));
    $$('[data-color]', root).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.color.toLowerCase() === String(st.color || '').toLowerCase())));
  }
  $$('[data-avk]', root).forEach(b => b.addEventListener('click', () => {
    st.avk = b.dataset.avk;
    if (st.avk === 'urun' && !(MARKET_BY_ID[st.urun] && ownsItem(st, st.urun))) { const f = $('[data-urun]', root); st.urun = f ? f.dataset.urun : ''; }
    paint();
    if (st.avk === 'harf' && hin) { try { hin.focus(); } catch (e) { /* yok */ } }
  }));
  $$('[data-emoji]', root).forEach(b => b.addEventListener('click', () => { st.avk = 'emoji'; st.emoji = b.dataset.emoji; paint(); }));
  if (hin) hin.addEventListener('input', () => { const v = hin.value.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toLocaleUpperCase('tr'); if (hin.value !== v) hin.value = v; st.harf = v; st.avk = 'harf'; paint(); });
  $$('[data-urun]', root).forEach(b => b.addEventListener('click', () => { st.avk = 'urun'; st.urun = b.dataset.urun; paint(); }));
  $$('[data-color]', root).forEach(b => b.addEventListener('click', () => { st.color = b.dataset.color; if (cin) cin.value = st.color.toLowerCase(); paint(); }));
  if (cin) cin.addEventListener('input', () => { if (okHex(cin.value)) { st.color = cin.value.toUpperCase(); paint(); } });
  paint();
}
/* Kaydetmeden önce: seçilen türün geçerli olduğunu denetle, kaydedilecek alanları hazırla */
function avError(st, nameForInitials) {
  if (st.avk === 'harf' && !okHarf(st.harf)) { const ini = initials(nameForInitials || '').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toLocaleUpperCase('tr'); if (okHarf(ini)) st.harf = ini; else return 'Profil resmi için bir ya da iki harf yaz.'; }
  if (st.avk === 'urun' && !(MARKET_BY_ID[st.urun] && ownsItem(st, st.urun))) return 'Profil resmi için marketten aldığın bir ürünü seç.';
  return '';
}
const avPayload = st => ({ avk: ['emoji', 'harf', 'urun', 'foto'].includes(st.avk) ? st.avk : 'emoji', emoji: okEmoji(st.emoji) ? String(st.emoji).trim() : AV_EMOJI[0], harf: okHarf(st.harf) ? st.harf : '', urun: st.avk === 'urun' && MARKET_BY_ID[st.urun] ? st.urun : '', color: okHex(st.color) ? st.color.toUpperCase() : AV_COLORS[0], pic: st.avk === 'foto' ? (st.pic || '') : '' });
function bolumName(id) { const b = S.bolumler.get(id); return b ? (b.ad || b.name || id) : ''; }
function bolumOptions(sel, first = 'Bölüm seç') {
  const list = [...S.bolumler.entries()].sort((a, b) => bolumName(a[0]).localeCompare(bolumName(b[0]), 'tr'));
  return `<option value="">${esc(first)}</option>` + list.map(([id]) => `<option value="${esc(id)}"${id === sel ? ' selected' : ''}>${esc(bolumName(id))}</option>`).join('');
}
/* Bölüm seçici: aranabilir, fakülteye göre gruplu liste; seçilince ders planının özeti. Değer gizli kutuda (id) durur */
function planFacts(bid) {
  const P = planOf(bid); if (!P) return null;
  const sems = Object.keys(P.plan).map(Number).filter(Boolean).sort((a, b) => a - b);
  let n = 0; for (const s of sems) n += (P.plan[s] || []).length + ((P.el && P.el[s]) || []).length;
  return { sems, n, yil: P.yillik ? sems.length : Math.ceil(sems.length / 2), first: (P.plan[sems[0]] || []).slice() };
}
function bolumPrevHtml(bid) {
  if (!bid || !S.bolumler.has(bid)) return '<p class="bp-hint">Listeden bölümünü seç; ders planın hazır gelsin.</p>';
  const f = planFacts(bid), b = S.bolumler.get(bid) || {};
  const codes = f ? f.first.slice(0, 6).map(c => `<span class="code">${esc(codeOf(c))}</span>`).join('') + (f.first.length > 6 ? `<span class="bp-more">+${f.first.length - 6}</span>` : '') : '';
  return `<div class="bp-card"><span class="bp-ico" aria-hidden="true">${icon('grad')}</span><div class="bp-txt"><b>${esc(bolumName(bid))}</b>`
    + `<span>${esc(b.fakulte || '')}${f ? `, ${f.yil} yıllık program, ${f.n} ders` : ''}${b.dil ? `, ${esc(b.dil)}` : ''}</span>`
    + (f ? `<span class="bp-say">İlk dönemin hazır; ders planın Dersler sayfasında seni bekliyor.</span><span class="bp-codes">${codes}</span>` : '') + '</div></div>';
}
function bolumPickHtml(id, sel, { big = false } = {}) {
  if (!S.bolumler.size) return '';
  const facs = new Map();
  for (const [bid, b] of S.bolumler) { if (!planOf(bid) && bid !== sel) continue; const f = (b && b.fakulte) || 'Diğer'; if (!facs.has(f)) facs.set(f, []); facs.get(f).push(bid); }
  const fk = [...facs.keys()].sort((a, b) => a.localeCompare(b, 'tr'));
  const opt = (bid, f) => { const dil = (S.bolumler.get(bid) || {}).dil; return `<button type="button" class="bp-opt" role="radio" data-bid="${esc(bid)}" aria-checked="${bid === sel}" data-k="${esc(fold(bolumName(bid)))}" data-f="${esc(fold(f))}"><span class="bp-dot" aria-hidden="true">${icon('check')}</span><span class="bp-nm">${esc(bolumName(bid))}</span>${dil ? `<span class="bp-dil">${esc(dil)}</span>` : ''}</button>`; };
  return `<div class="bpick${big ? ' big' : ''}" data-bpick><input type="hidden" id="${id}" value="${esc(S.bolumler.has(sel) ? sel : '')}">
    <label class="search sm bp-q">${icon('search')}<input class="input" data-r="bp-q" placeholder="Bölümünü ara, örneğin bilgisayar" aria-label="Bölüm ara" autocomplete="off"></label>
    <div class="bp-list" role="radiogroup" aria-label="Bölüm">${fk.map(f => `<div class="bp-fac"><p class="bp-fh">${esc(f)}</p>${facs.get(f).sort((a, b) => bolumName(a).localeCompare(bolumName(b), 'tr')).map(bid => opt(bid, f)).join('')}</div>`).join('')}<p class="bp-none" hidden>Bu adla bölüm bulunamadı.</p></div>
    <div class="bp-prev" data-r="bp-prev" aria-live="polite">${bolumPrevHtml(sel)}</div></div>`;
}
function wireBolumPick(root, onPick) {
  const box = $('[data-bpick]', root); if (!box) return;
  const hid = $('input[type=hidden]', box), q = $('[data-r=bp-q]', box), prev = $('[data-r=bp-prev]', box);
  const pick = bid => {
    hid.value = bid;
    $$('.bp-opt', box).forEach(o => o.setAttribute('aria-checked', String(o.dataset.bid === bid)));
    prev.innerHTML = bolumPrevHtml(bid); popFx(prev.firstElementChild);
    if (onPick) onPick(bid);
  };
  $$('.bp-opt', box).forEach(o => o.addEventListener('click', () => pick(o.dataset.bid)));
  q.addEventListener('input', () => {
    // önce bölüm adında ara; adında yoksa fakülte adında
    const f = fold(q.value), byName = !f || $$('.bp-opt', box).some(o => o.dataset.k.includes(f)); let any = false;
    $$('.bp-fac', box).forEach(g => { let vis = 0; $$('.bp-opt', g).forEach(o => { const on = !f || (byName ? o.dataset.k.includes(f) : o.dataset.f.includes(f)); o.hidden = !on; if (on) vis++; }); g.hidden = !vis; if (vis) any = true; });
    $('.bp-none', box).hidden = any;
  });
  q.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const o = $$('.bp-opt', box).find(x => !x.hidden); if (o) pick(o.dataset.bid); } });
  const cur = $('.bp-opt[aria-checked="true"]', box);
  if (cur) setTimeout(() => { try { const l = $('.bp-list', box); l.scrollTop = Math.max(0, cur.offsetTop - l.offsetTop - 48); } catch (e) { /* yok */ } }, 0);
}
/* Kayıtta kullanıcı adı okul e-postasının baş kısmından gelir: ahmet13@std.yeditepe.edu.tr → ahmet13 (alınmışsa sonuna sayı) */
function userFromMail(mail) {
  let u = String(mail || '').split('@')[0].toLocaleLowerCase('tr').replace(/[çğıöşü]/g, c => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' })[c])
    .replace(/[^a-z0-9._]+/g, '.').replace(/[._]{2,}/g, '.').replace(/^[._]+|[._]+$/g, '').slice(0, 20).replace(/[._]+$/, '');
  if (!u) return '';
  while (u.length < 3) u += '1';
  if (!userTaken(u, S.me)) return u;
  for (let i = 2; i < 100; i++) { const c = u.slice(0, 20 - String(i).length) + i; if (!userTaken(c, S.me)) return c; }
  return '';
}
const coursesOfBolum = id => { const P = planOf(id); const out = new Set(); if (P) Object.values(P.plan).forEach(a => (Array.isArray(a) ? a : []).forEach(c => out.add(c))); return out; };
function yearOptions(sel) {
  const cy = new Date().getFullYear(), out = [];
  for (let y = cy; y >= cy - 12; y--) out.push(`<option value="${y}"${y === +sel ? ' selected' : ''}>${y}</option>`);
  return out.join('');
}
/* Hesabın özel kaydı (yalnızca bu Claude hesabı okuyabilir). Ortak deneme hesabındayken ayrı kayıt: Derslerim, işaretler ve seçimler o hesabın olur */
const privPath = () => (S.supa ? (S.session && okId(S.me) ? 'private/' + S.me : null)
  : S.rawId && okId(S.rawId) ? 'data/users/' + S.rawId + '/' + (S.shared && okId(S.me) ? 'private-' + S.me : 'private') : null);
const lsk = k => (S.supa || S.shared ? k + '@' + S.me : k);
let privUnsub = null;
function subPriv() {
  if (privUnsub) { try { privUnsub(); } catch (e) { /* yok */ } privUnsub = null; }
  S.priv = null; S.privLoaded = false;
  const pp = privPath();
  if (!pp || !S.db) { S.privLoaded = true; return; }
  try {
    privUnsub = S.db.doc(pp).onSnapshot(snap => { if (privPath() !== pp) return; S.priv = snap && snap.exists ? snap.data() : null; S.privLoaded = true; S.version++; changed(); },
      () => { if (privPath() !== pp) return; S.privLoaded = true; changed(); });
  } catch (e) { S.privLoaded = true; }
}
const loginPath = () => (S.rawId && okId(S.rawId) ? 'data/users/' + S.rawId + '/login' : null);
/* Kendi gizli giriş kaydın (yalnızca sen okuyabilirsin). Profilde e-postayı göstermek için yalnızca site sahibinde baştan okunur */
async function loadLogin(any) {
  const lp = loginPath();
  if (!lp || !S.db || (!any && !S.ownerId)) return null;
  try { const snap = await S.db.doc(lp).get(); S.login = snap && snap.exists ? snap.data() : null; }
  catch (e) { return S.login; }
  S.version++; changed();
  return S.login;
}
const mailKey = mail => sha('mail|' + String(mail).trim().toLowerCase());
async function mailTaken(mail) {
  const f = String(mail).toLowerCase();
  for (const [uid, u] of S.users) if (uid !== S.me && String(u.email || '').toLowerCase() === f) return true;
  try { const snap = await S.db.doc('emails/' + (await mailKey(f))).get(); return !!(snap && snap.exists && snap.data().uid !== S.me); }
  catch (e) { return false; }
}
/* Profilde görünsün mü: göz açık (herkes görür) ya da kapalı (gizli) */
const eyeInner = on => `${icon(on ? 'eye' : 'eyeoff')}<span>${on ? 'Profilde görünür' : 'Gizli'}</span>`;
function eyeToggle(key, on, what) { return `<button type="button" class="eye-tg" data-vis="${key}" data-what="${esc(what)}" aria-pressed="${!!on}" aria-label="${esc(what)}: ${on ? 'profilde görünür' : 'gizli'}">${eyeInner(!!on)}</button>`; }
const visIc = (on, what) => `<span class="vis-ic ${on ? 'on' : 'off'}" title="${esc(what)} ${on ? 'profilinde herkese görünür' : 'gizli, yalnızca sen görürsün'}">${icon(on ? 'eye' : 'eyeoff')}<span class="sr">${on ? 'profilde görünür' : 'gizli'}</span></span>`;
function wireToggles(root, st) {
  $$('[data-vis]', root).forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.vis; st[k] = !st[k];
    b.setAttribute('aria-pressed', String(!!st[k])); b.innerHTML = eyeInner(!!st[k]);
    b.setAttribute('aria-label', (b.dataset.what || '') + ': ' + (st[k] ? 'profilde görünür' : 'gizli'));
    popFx(b);
  }));
}
function userTaken(name, exceptUid) {
  const f = String(name).toLowerCase();
  for (const [uid, u] of S.users) if (uid !== exceptUid && String(u.username || '').toLowerCase() === f) return true;
  return false;
}
function mailFieldHtml(id, label, val = '', ac = 'username') {
  return `<div class="field"><label for="${id}">${esc(label)}</label><div class="mail-in"><input id="${id}" class="input" type="text" inputmode="email" autocomplete="${ac}" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="60" placeholder="ad.soyad" value="${esc(mailLocal(val))}" aria-describedby="${id}-dom"><span class="mail-dom" id="${id}-dom">${MAIL_DOMAIN}</span></div></div>`;
}
/* @ yazılınca ya da tam adres yapıştırılınca uzantıyı kutudan düşür (uzantı zaten yanında yazılı) */
function wireMailField(inp) {
  if (!inp) return;
  // tam adres yazılınca (başka uzantı) kutunun yanındaki okul uzantısı gizlenir
  const dom = inp.parentElement ? inp.parentElement.querySelector('.mail-dom') : null;
  const sync = () => { if (dom) dom.hidden = inp.value.includes('@'); };
  inp.addEventListener('input', () => {
    const v = inp.value, i = v.indexOf('@');
    if (i >= 0) {
      const tail = v.slice(i).toLowerCase().replace(/\s+/g, '');
      if (MAIL_DOMAIN.startsWith(tail) || tail === MAIL_DOMAIN) inp.value = v.slice(0, i);
    }
    sync();
  });
  sync();
}
function openAuth(opts = {}) {
  if (!S.db) { guardWrite(); return; }
  if (hasAcc()) { location.hash = '#/profil'; return; }
  if (modalStack.some(x => x.isAuth)) return;
  const st = { email: '', code: '', showName: false, showYil: true, avk: 'emoji', emoji: AV_EMOJI[Math.floor(Math.random() * AV_EMOJI.length)], harf: '', urun: '', color: AV_COLORS[Math.floor(Math.random() * AV_COLORS.length)], pic: '', items: {} };
  const m = openModal({ title: 'Yeditepe hesabınla gir', body: '<div data-r="host"></div>' });
  m.isAuth = true;
  const host = $('[data-r=host]', m.el);
  function step1() {
    host.innerHTML = `<form novalidate>
      ${opts.reason ? '<p class="auth-why">Notları, HocaÖlçer’i ve Kubbe’yi görmek için giriş yap. Giriş yapınca kaldığın yerden devam edersin.</p>' : ''}
      <p class="help">YediWiki yalnızca Yeditepe öğrencilerine açıktır. Okul e-postanın @ işaretinden önceki kısmını yazman yeter.${S.supa ? ' Adresine 6 haneli bir giriş kodu göndereceğiz; hesabın yoksa ilk girişte açılır.' : ''}</p>
      ${mailFieldHtml('au-mail', 'Okul e-postan', st.email, 'email')}
      <p class="err" role="alert"></p>
      <p class="auth-alt">Sana verilmiş bir hesap mı var? <button type="button" class="linkbtn" data-r="to-login">E-posta ve şifreyle giriş yap</button></p>
      <div class="modal-foot"><button type="button" class="btn btn-ghost" data-close>Vazgeç</button><button class="btn btn-primary" type="submit">Doğrulama kodu gönder</button></div></form>`;
    $('[data-r=to-login]', host).addEventListener('click', stepLogin);
    wireMailField($('#au-mail', host));
    const err = $('.err', host);
    $('form', host).addEventListener('submit', async e => {
      e.preventDefault();
      if (S.supa) {
        const raw = $('#au-mail', host).value.trim().toLowerCase().replace(/\s+/g, ''), full = raw.includes('@') ? raw : raw + MAIL_DOMAIN;
        if (PW_ACCOUNTS.includes(full)) { st.loginMail = full; stepLogin(); return; }
      }
      const v = mailOf($('#au-mail', host).value);
      if (v === null) { err.textContent = `Yalnızca ${MAIL_DOMAIN} uzantılı okul e-postasıyla hesap açılır.`; return; }
      if (!MAIL_RE.test(v)) { err.textContent = 'E-postanın @ işaretinden önceki kısmını yaz, örneğin ad.soyad.'; return; }
      if (S.supa) {
        const btn = $('[type=submit]', host); btn.disabled = true; btn.textContent = 'Gönderiliyor…';
        const r = await sendOtp(v);
        btn.disabled = false; btn.textContent = 'Doğrulama kodu gönder';
        if (r) { err.textContent = r; return; }
        st.email = v; st.sentAt = Date.now(); step2(); return;
      }
      if (S.out && userOf(S.baseMe)) { err.textContent = 'Bu cihazda zaten bir hesabın var. E-posta ve şifreyle giriş yap.'; return; }
      if (await mailTaken(v)) { err.textContent = 'Bu e-posta ile açılmış bir hesap var.'; return; }
      st.email = v;
      st.code = String(Math.floor(100000 + Math.random() * 900000));
      step2();
    });
    setTimeout(() => { const i = $('#au-mail', host); if (i) i.focus(); }, 40);
  }
  function step2() {
    if (S.supa) { step2Site(); return; }
    host.innerHTML = `<form novalidate>
      <p class="help">Kod <b>${esc(st.email)}</b> adresine gönderildi.</p>
      <p class="demo-note">Prototip notu: e-posta gönderimi kendi sunucumuza geçince gerçek olacak. Şimdilik kodun burada: <b class="demo-code">${esc(st.code)}</b></p>
      <div class="field"><label for="au-code">6 haneli kod</label><input id="au-code" class="input code-in" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000"></div>
      <p class="err" role="alert"></p>
      <div class="modal-foot"><button type="button" class="btn btn-ghost" data-r="back">Geri</button><button class="btn btn-primary" type="submit">Doğrula</button></div></form>`;
    const err = $('.err', host);
    $('[data-r=back]', host).addEventListener('click', step1);
    $('form', host).addEventListener('submit', e => {
      e.preventDefault();
      if ($('#au-code', host).value.trim() !== st.code) { err.textContent = 'Kod hatalı. Tekrar dene.'; return; }
      step3();
    });
    setTimeout(() => { const i = $('#au-code', host); if (i) i.focus(); }, 40);
  }
  /* Sitede kod gerçekten e-postaya gider; doğrulanınca oturum açılır, hesap yoksa profil adımına geçilir */
  function step2Site() {
    host.innerHTML = `<form novalidate>
      <p class="help">Kod <b>${esc(st.email)}</b> adresine gönderildi. Birkaç dakika içinde gelmezse gereksiz (spam) klasörüne de bak.</p>
      <div class="field"><label for="au-code">Gelen kod</label><input id="au-code" class="input code-in" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="000000"></div>
      <p class="err" role="alert"></p>
      <p class="auth-alt"><button type="button" class="linkbtn" data-r="resend">Kodu yeniden gönder</button></p>
      <div class="modal-foot"><button type="button" class="btn btn-ghost" data-r="back">Geri</button><button class="btn btn-primary" type="submit">Doğrula</button></div></form>`;
    const err = $('.err', host);
    $('[data-r=back]', host).addEventListener('click', step1);
    $('[data-r=resend]', host).addEventListener('click', async () => {
      const left = Math.ceil((60000 - (Date.now() - (st.sentAt || 0))) / 1000);
      if (left > 0) { err.textContent = `Yeni kod için ${left} saniye bekle.`; return; }
      const r = await sendOtp(st.email);
      if (r) { err.textContent = r; return; }
      st.sentAt = Date.now(); err.textContent = ''; toast('Yeni kod gönderildi');
    });
    $('form', host).addEventListener('submit', async e => {
      e.preventDefault();
      err.textContent = '';
      const code = $('#au-code', host).value.replace(/\D/g, '');
      if (code.length < 6) { err.textContent = 'E-postana gelen kodu yaz.'; return; }
      const btn = $('[type=submit]', host); btn.disabled = true; btn.textContent = 'Kontrol ediliyor…';
      let res = null;
      try { res = await S.sb.auth.verifyOtp({ email: st.email, token: code, type: 'email' }); } catch (ex) { res = { error: ex }; }
      btn.disabled = false; btn.textContent = 'Doğrula';
      if (!res || res.error || !res.data || !res.data.session) { err.textContent = authErrTr(res && res.error); return; }
      await applySession(res.data.session);
      if (hasAcc()) { signedIn(); return; }
      step3();
    });
    setTimeout(() => { const i = $('#au-code', host); if (i) i.focus(); }, 40);
  }
  function signedIn() {
    m.close(); toast(`Giriş yapıldı: @${(myAcc() || {}).username || ''}`); changed();
    const nx = S.pendingHash; S.pendingHash = null;
    if (nx && nx !== location.hash) location.hash = nx; else route();
  }
  /* Son adımlar: önce profil (kullanıcı adı e-postadan gelir), sonra bölüm. Telefon sonradan profilden eklenir */
  const progHtml = n => `<ol class="su-prog" aria-label="Son adımlar"><li class="${n === 1 ? 'on' : 'done'}"${n === 1 ? ' aria-current="step"' : ''}>Profilin</li><li class="${n === 2 ? 'on' : ''}"${n === 2 ? ' aria-current="step"' : ''}>Bölümün</li></ol>`;
  function step3() {
    if (st.username == null) st.username = userFromMail(st.email || S.email || '');
    const twoSteps = S.bolumler.size > 0;
    host.innerHTML = `<form novalidate>
      ${twoSteps ? progHtml(1) : ''}
      <p class="help ok">${esc(st.email || S.email)} doğrulandı. ${twoSteps ? 'İki küçük adım kaldı.' : 'Son adım: profilin.'}</p>
      ${avatarPickerHtml(st)}
      <div class="field"><label for="au-user">Kullanıcı adı</label><input id="au-user" class="input" maxlength="20" placeholder="kubbeli.kedi" autocapitalize="none" autocorrect="off" spellcheck="false" value="${esc(st.username || '')}"><p class="help">Okul e-postandan aldık; yorumlarda ve sıralamada bu ad görünür. İstersen değiştir: küçük harf, rakam ve nokta.</p></div>
      <div class="field"><div class="lbl-row"><span class="label">Ad soyad</span>${eyeToggle('showName', st.showName, 'Ad soyad')}</div>
        <div class="two"><input id="au-first" class="input" maxlength="40" autocomplete="given-name" placeholder="Ad" aria-label="Ad" value="${esc(st.first || '')}"><input id="au-last" class="input" maxlength="40" autocomplete="family-name" placeholder="Soyad" aria-label="Soyad" value="${esc(st.last || '')}"></div></div>
      <div class="field"><div class="lbl-row"><label class="label" for="au-year">Giriş yılı</label>${eyeToggle('showYil', st.showYil, 'Giriş yılı')}</div><select id="au-year" class="select">${yearOptions(st.yil || new Date().getFullYear())}</select></div>
      <p class="err" role="alert"></p>
      <div class="modal-foot"><button type="button" class="btn btn-ghost" data-close>Sonra</button><button class="btn btn-primary" type="submit">${twoSteps ? 'Devam' : 'Hesabı oluştur'}</button></div></form>`;
    wireAvatarPicker(host, st);
    wireToggles(host, st);
    const err = $('.err', host);
    $('form', host).addEventListener('submit', async e => {
      e.preventDefault();
      err.textContent = '';
      const first = $('#au-first', host).value.trim(), last = $('#au-last', host).value.trim();
      const username = $('#au-user', host).value.trim().toLowerCase();
      st.first = first; st.last = last; st.username = username; st.yil = +$('#au-year', host).value || 0;
      if (first.length < 2 || last.length < 2) { err.textContent = 'Adını ve soyadını yaz.'; return; }
      if (!USER_RE.test(username)) { err.textContent = 'Kullanıcı adı 3-20 karakter olmalı; küçük harf, rakam ve nokta kullan.'; return; }
      if (userTaken(username)) { err.textContent = 'Bu kullanıcı adı alınmış.'; return; }
      { const ae = avError(st, first + ' ' + last); if (ae) { err.textContent = ae; return; } }
      if (twoSteps) step4(); else await createAcc(err, $('[type=submit]', host));
    });
  }
  function step4() {
    host.innerHTML = `<form novalidate>
      ${progHtml(2)}
      <h3 class="su-h">Bölümünü seç</h3>
      <p class="help">Ders planın hazır gelsin: dönem dönem derslerin, aldıklarını ${gl('check', 'gl-in gl-ok')} ile işaretleyeceğin mezuniyet yolu ve bölümünün kubbe sıralaması.</p>
      ${bolumPickHtml('au-bolum', st.bolum || '', { big: true })}
      <p class="err" role="alert"></p>
      <div class="modal-foot"><button type="button" class="btn btn-ghost" data-r="back">Geri</button><button class="btn btn-primary" type="submit">Hesabı oluştur</button></div>
      <p class="auth-alt su-skip"><button type="button" class="linkbtn" data-r="skip">Bölümümü sonra seçerim</button></p></form>`;
    wireBolumPick(host, v => { st.bolum = v; });
    const err = $('.err', host), btn = $('[type=submit]', host);
    $('[data-r=back]', host).addEventListener('click', () => { st.bolum = $('#au-bolum', host).value; step3(); });
    $('[data-r=skip]', host).addEventListener('click', () => { st.bolum = ''; createAcc(err, btn); });
    $('form', host).addEventListener('submit', e => {
      e.preventDefault();
      err.textContent = '';
      st.bolum = $('#au-bolum', host).value;
      if (!st.bolum) { err.textContent = 'Listeden bölümünü seç ya da “Bölümümü sonra seçerim”e bas.'; return; }
      createAcc(err, btn);
    });
    setTimeout(() => { const i = $('[data-r=bp-q]', host); if (i && !st.bolum && !('ontouchstart' in window)) i.focus(); }, 40);
  }
  async function createAcc(err, btn) {
    const { first, last, username } = st, yil = +st.yil || 0, bolum = st.bolum && S.bolumler.has(st.bolum) ? st.bolum : '';
    if (btn) btn.disabled = true;
    const mk = S.supa ? '' : await mailKey(st.email);
    const prof = { first: niceName(first).slice(0, 40), last: niceName(last).slice(0, 40), showName: !!st.showName, username, yil, showYil: !!st.showYil, bolum, ...avPayload(st) };
    const ok = await write(async () => {
      if (S.supa) {
        if (!S.session) throw { code: 'unauthenticated' };
        await S.db.doc('private/' + S.me).set({ phone: '', at: Date.now() });
        await S.db.doc('users/' + S.me).set(prof);
        return;
      }
      if (!privPath()) throw { code: 'no_identity' };
      await S.db.doc(privPath()).set({ email: st.email, phone: '', at: Date.now(), verifiedAt: Date.now() });
      await S.db.doc('emails/' + mk).set({ uid: S.me, at: Date.now() });
      await S.db.doc('users/' + S.me).set(Object.assign(prof, { bonus: KUBBE.signup, spent: 0, items: {}, at: Date.now(), verifiedAt: Date.now() }));
    }, `Hoş geldin, @${username}. Hesabına ${KUBBE.signup} kubbe eklendi.`);
    if (btn) btn.disabled = false;
    if (!ok) { if (err && !err.textContent) err.textContent = 'Hesap açılamadı, yeniden dene.'; return; }
    m.close();
    const nx = S.pendingHash; S.pendingHash = null;
    if (nx && nx !== location.hash) location.hash = nx;
  }
  function stepLogin() {
    host.innerHTML = `<form novalidate>
      <p class="help">${S.supa ? 'Yönetici ve ortak deneme hesabı şifreyle girer; okul adresi değilse adresin tamamını yaz. Öğrenciler okul e-postasına gelen kodla girer.' : S.readOnly ? 'Bu sayfayı görüntüleme izniyle açtın. Sana verilen hesapla girip siteyi gezebilirsin.' : S.out ? 'Hesabından çıktın. Deneme hesabıyla ya da kendi e-posta ve şifrenle giriş yap.' : 'Sana verilen e-posta ve şifreyle giriş yap.'}</p>
      ${st.loginMail ? '<p class="help ok">Bu hesap kodla değil şifreyle girer.</p>' : ''}
      ${mailFieldHtml('au-lmail', 'E-posta', st.loginMail || '')}
      <div class="field"><label for="au-lpw">Şifre</label><input id="au-lpw" class="input" type="password" autocomplete="current-password"></div>
      <p class="err" role="alert"></p>
      ${S.readOnly || S.out ? '' : '<p class="auth-alt">Hesabın yok mu? <button type="button" class="linkbtn" data-r="to-signup">Yeditepe mailinle hesap aç</button></p>'}
      <div class="modal-foot"><button type="button" class="btn btn-ghost" data-close>Vazgeç</button><button class="btn btn-primary" type="submit">Giriş yap</button></div></form>`;
    const err = $('.err', host), back = $('[data-r=to-signup]', host);
    if (back) back.addEventListener('click', step1);
    wireMailField($('#au-lmail', host));
    $('form', host).addEventListener('submit', async e => {
      e.preventDefault();
      err.textContent = '';
      const rawMail = $('#au-lmail', host).value.trim().toLowerCase().replace(/\s+/g, '');
      const mail = S.supa && rawMail.includes('@') ? rawMail : mailOf(rawMail);
      if (mail === null) { err.textContent = `Yalnızca ${MAIL_DOMAIN} uzantılı adreslerle giriş yapılır.`; return; }
      if (!mail) { err.textContent = 'E-postanın @ işaretinden önceki kısmını yaz.'; return; }
      const btn = $('[type=submit]', host); btn.disabled = true; btn.textContent = 'Kontrol ediliyor…';
      if (S.supa) {
        let res = null;
        try { res = await S.sb.auth.signInWithPassword({ email: mail, password: $('#au-lpw', host).value }); } catch (ex) { res = { error: ex }; }
        btn.disabled = false; btn.textContent = 'Giriş yap';
        if (!res || res.error || !res.data || !res.data.session) { err.textContent = authErrTr(res && res.error); return; }
        await applySession(res.data.session);
        if (hasAcc()) signedIn(); else step3();
        return;
      }
      const r = await tryLogin(mail, $('#au-lpw', host).value);
      btn.disabled = false; btn.textContent = 'Giriş yap';
      if (r === null) { err.textContent = 'Bu e-postayla şifreli bir hesap yok.'; return; }
      if (r === false) { err.textContent = 'Şifre hatalı.'; return; }
      if (r.shared) { ls.set('as', r.uid); S.me = r.uid; S.shared = true; }
      else { ls.set('as', null); ls.set('out', null); S.me = S.baseMe; S.shared = false; S.out = false; }
      syncOwner(); S.version++; subPriv();
      m.close(); toast(`Giriş yapıldı: @${(userOf(S.me) || {}).username || ''}`); changed();
      const nx = S.pendingHash; S.pendingHash = null;
      if (nx && nx !== location.hash) location.hash = nx; else route();
    });
    setTimeout(() => { const i = $(st.loginMail ? '#au-lpw' : '#au-lmail', host); if (i) i.focus(); }, 40);
  }
  if (S.supa && S.session) step3();
  else if (S.readOnly || opts.login || S.out) stepLogin(); else step1();
}
function openProfileEdit() {
  if (!needAcc()) return;
  const u = myAcc();
  const pv = S.priv || {};
  const st = { avk: avKind(u), emoji: avEmoji(u), harf: u.harf || '', urun: u.urun || '', color: avColor(u), pic: u.pic || '', items: u.items || {}, showName: !!u.showName, showYil: u.showYil !== false };
  const m = openModal({ title: 'Profilini düzenle', sub: pv.email || u.email || S.email || '', body: `<form novalidate class="pe-form">
    ${avatarPickerHtml(st)}
    <div class="field"><label for="pe-user">Kullanıcı adı</label><input id="pe-user" class="input" maxlength="20" autocapitalize="none" autocorrect="off" spellcheck="false" value="${esc(u.username || '')}"><p class="help">Yorumlarda ve sıralamada bu ad görünür.</p></div>
    <div class="field"><div class="lbl-row"><span class="label">Ad soyad</span>${eyeToggle('showName', st.showName, 'Ad soyad')}</div>
      <div class="two"><input id="pe-first" class="input" maxlength="40" value="${esc(u.first || pv.first || '')}" aria-label="Ad"><input id="pe-last" class="input" maxlength="40" value="${esc(u.last || pv.last || '')}" aria-label="Soyad"></div></div>
    <div class="field"><div class="lbl-row"><label class="label" for="pe-year">Giriş yılı</label>${eyeToggle('showYil', st.showYil, 'Giriş yılı')}</div><select id="pe-year" class="select">${yearOptions(u.yil || pv.yil)}</select></div>
    ${S.bolumler.size ? `<div class="field"><span class="label">Bölüm</span>${bolumPickHtml('pe-bolum', u.bolum || '')}</div>` : ''}
    <div class="field"><div class="lbl-row"><label class="label" for="pe-no">Telefon numarası <span class="opt">isteğe bağlı</span></label><span class="vis-note">${icon('lock')}Yalnızca sen görürsün</span></div><input id="pe-no" class="input" type="tel" inputmode="tel" maxlength="16" placeholder="05xx xxx xx xx" value="${esc(pv.phone || '')}"></div>
    <p class="err" role="alert"></p>
    <div class="modal-foot"><button type="button" class="btn btn-ghost" data-close>Vazgeç</button><button class="btn btn-primary" type="submit">${icon('check')}Kaydet</button></div></form>` });
  wireAvatarPicker(m.el, st);
  wireToggles(m.el, st);
  wireBolumPick(m.el);
  const err = $('.err', m.el);
  $('form', m.el).addEventListener('submit', async e => {
    e.preventDefault();
    err.textContent = '';
    const first = $('#pe-first', m.el).value.trim(), last = $('#pe-last', m.el).value.trim();
    const username = $('#pe-user', m.el).value.trim().toLowerCase();
    if (u.role !== 'admin' && (first.length < 2 || last.length < 2)) { err.textContent = 'Adını ve soyadını yaz.'; return; }
    if (!USER_RE.test(username)) { err.textContent = 'Kullanıcı adı 3-20 karakter olmalı; küçük harf, rakam ve nokta kullan.'; return; }
    if (userTaken(username, S.me)) { err.textContent = 'Bu kullanıcı adı alınmış.'; return; }
    { const ae = avError(st, first + ' ' + last); if (ae) { err.textContent = ae; return; } }
    const phone = $('#pe-no', m.el).value.replace(/[^\d+]/g, '').slice(0, 16);
    const ok = await write(async () => {
      await S.db.doc('users/' + S.me).update({
        first: niceName(first).slice(0, 40), last: niceName(last).slice(0, 40), showName: !!st.showName, username,
        yil: +$('#pe-year', m.el).value || 0, showYil: !!st.showYil, bolum: ($('#pe-bolum', m.el) || { value: u.bolum || '' }).value, ...avPayload(st)
      });
      if (phone !== (pv.phone || '') && privPath()) { if (S.supa) await (S.priv ? S.db.doc(privPath()).update({ phone }) : S.db.doc(privPath()).set({ phone })); else await S.db.doc(privPath()).set(Object.assign({}, pv, { phone })); }
    }, 'Profilin güncellendi');
    if (ok) m.close();
  });
}
/* Profil sayfasındaki göz: adın ya da giriş yılın profilde görünsün mü (sunucu gizlenenleri özel kayda taşır, bu yüzden değer de gönderilir) */
function toggleVis(k) {
  const u = myAcc();
  if (!u || !needAcc() || (k !== 'showName' && k !== 'showYil')) return;
  const pv = S.priv || {};
  const on = k === 'showName' ? !u.showName : u.showYil === false;
  const patch = k === 'showName' ? { showName: on, first: u.first || pv.first || '', last: u.last || pv.last || '' } : { showYil: on, yil: u.yil || +pv.yil || 0 };
  write(() => S.db.doc('users/' + S.me).update(patch), (k === 'showName' ? 'Adın' : 'Giriş yılın') + (on ? ' artık profilinde görünüyor' : ' gizlendi'));
}
function openUserCard(uid) {
  const u = userOf(uid);
  if (!u) return;
  const k = kubbeOf(uid), items = Object.keys(u.items || {}).filter(id => MARKET_BY_ID[id]);
  const facts = [u.showName && fullName(u) ? esc(fullName(u)) : '', u.showYil !== false && u.yil ? u.yil + ' girişli' : ''].filter(Boolean).join(', ');
  const m = openModal({ title: '@' + (u.username || 'öğrenci'), body: `<div class="ucard">
      ${avatarHtml(uid, { cls: 'xl' })}
      <div><p class="kh-name">${nameHtml(u, u.username || '')}${badgesHtml(u)}</p>${facts ? `<p class="muted">${facts}</p>` : ''}
      <p class="kh-kubbe">${gl('coin', 'k-coin')}<b>${k.all}</b> kubbe</p></div></div>
    <dl class="prof-list"><div><dt>Sıralama</dt><dd>Tüm zamanlar ${rankOf(uid, 'all')}. sıra, ${esc(termLabel(currentTk()))} ${rankOf(uid, 'term')}. sıra</dd></div>
      <div><dt>Katkılar</dt><dd>${k.notes} not, ${k.comments} yorum${S.supa && uid !== S.me ? '' : `, ${k.ratings} hoca puanı`}</dd></div>
      ${(() => { const eb = earnedBadges(uid); return eb.length ? `<div><dt>Rozetler</dt><dd>${eb.map(b => `<span class="tag" title="${esc(b.d)}">${b.g} ${esc(b.ad)}</span>`).join(' ')}</dd></div>` : ''; })()}
      ${items.length ? `<div><dt>Aldıkları</dt><dd>${items.map(id => `<span class="tag" title="${esc(MARKET_BY_ID[id].name)}"><img class="tag-art" src="${itemAvSrc(id)}" alt="">${esc(MARKET_BY_ID[id].name)}</span>`).join(' ')}</dd></div>` : ''}</dl>
    <p class="fine">${S.supa ? 'Anonim paylaşımlar ve hoca puanları bu kartta görünmez.' : 'Anonim paylaşımlar bu kartta gösterilmez.'}</p>` });
  applyWidths(m.el);
}
async function setAvatarItem(id) {
  if (!needAcc()) return;
  const u = myAcc(), it = MARKET_BY_ID[id];
  if (!it || !ownsItem(u, id)) { toast('Bu ürün sende değil.', 'err'); return; }
  await write(() => S.db.doc('users/' + S.me).update({ avk: 'urun', urun: id, pic: '' }), `${it.name} artık profil resmin`);
}
async function buyItem(id) {
  if (!needAcc()) return;
  const it = MARKET_BY_ID[id], u = myAcc();
  if (!it || !u) return;
  if (ownsItem(u, id)) { toast('Bu ürün zaten sende.'); return; }
  const bal = balanceOf(S.me);
  if (bal < it.price) { toast(`${it.price - bal} kubbe daha biriktirmen gerekiyor.`, 'err'); return; }
  const ok = await confirmModal({ title: it.name, text: `${it.price} kubbe harcanacak, bakiyen ${bal - it.price} kubbeye düşecek. Ürün hemen profiline eklenir.`, ok: 'Satın al' });
  if (!ok) return;
  const card = document.querySelector(`[data-g=buy][data-id="${id}"]`), loot = card && card.closest('.loot'), stage = loot && loot.querySelector('.loot-stage');
  const [bx, by] = centerOf(stage || card);
  const done = await write(() => (S.supa ? S.db.rpc('buy_item', { p_item: id }, 'users/' + S.me) : S.db.doc('users/' + S.me).update({ spent: spentOf(S.me) + it.price, items: { [id]: Date.now() } })), it.name + ' alındı');
  if (done) burst(bx, by, { glyphs: ['coin', 'spark', 'coin'], n: 22, cls: 'coin', spread: 120 });
}

/* ================= Liste parçaları ================= */
function commentHtml(c) {
  if (isHidden(c) && !S.revealed.has(c.id)) return `<li class="cm"><div class="is-hidden"><span>Bu yorum bildirimler nedeniyle gizlendi.</span><button type="button" class="btn btn-sm btn-ghost" data-g="reveal" data-id="${esc(c.id)}">Yine de göster</button></div></li>`;
  const bits = [];
  if (c.tt === 'course' && c.h && S.hocas.has(c.h)) bits.push(`<a href="#/hoca/${esc(c.h)}">${esc(hocaFull(S.hocas.get(c.h)))}</a>`);
  if (c.tt === 'hoca' && c.c && S.courses.has(c.c)) bits.push(`<a class="code" href="#/ders/${esc(c.c)}">${esc(codeOf(c.c))}</a>`);
  if (c.tk) bits.push(`<span>${esc(termLabel(c.tk))}</span>`);
  let rate = '';
  if (c.r && typeof c.r === 'object' && CRIT.every(k => typeof c.r[k.k] === 'number')) {
    const avg = CRIT.reduce((s, k) => s + c.r[k.k], 0) / CRIT.length;
    rate = `<span class="minirate">${starsHtml(avg, 'sm')}${fmt1(avg)}</span>`;
  }
  const mine = isMine(c), lk = likeCount(c), anon = !!c.anon;
  const gold = !anon ? badgesHtml(userOf(c.by)) : '';
  return `<li class="cm">
    <div class="cm-top">${avatarHtml(c.by, { anon, cls: 'sm' })}<span class="cm-nick">${anon ? 'Anonim' : nameHtml(userOf(c.by), displayName(c.by, anon, c.nick))}</span>${gold}${mine ? '<span>sen</span>' : ''}<span>${esc(ago(c.at))}</span>${rate}${bits.join('')}</div>
    <p class="cm-text">${esc(c.text)}</p>
    <div class="cm-actions">
      <button type="button" class="iconbtn like" data-g="like-comment" data-id="${esc(c.id)}" aria-pressed="${likedByMe(c)}" aria-label="Faydalı, ${lk} kişi">${icon('heart')}${lk}</button>
      ${mine ? '' : `<button type="button" class="iconbtn flag" data-g="report-comment" data-id="${esc(c.id)}" aria-label="Bildir">${icon('flag')}</button>`}
      ${canManage(c) ? `<button type="button" class="iconbtn" data-g="del-comment" data-id="${esc(c.id)}" aria-label="Sil">${icon('trash')}</button>` : ''}
    </div></li>`;
}
function commentsBlock(el, { tt, tid, ctx = '' }) {
  let sort = 'new', anon = tt === 'hoca';
  const fid = 'ta-' + randId(5);
  const ph = tt === 'hoca' ? 'Anlatımı, sınavları, ödevleri nasıldı?'
    : tt === 'course' ? 'Ders zor mu, neye dikkat etmeli, hangi kaynaklar işe yaradı?'
    : 'Not işine yaradı mı? Eksik bir yer var mı?';
  el.innerHTML = `<div class="cm-wrap">
    <div class="cm-left">
      <form class="composer" novalidate data-r="form" hidden>
        <label class="label" for="${fid}">Yorum yaz</label>
        <textarea id="${fid}" class="textarea sm" rows="4" maxlength="1000" placeholder="${esc(ph)}"></textarea>
        ${ctx === 'course' ? '<div data-r="ctxwrap" hidden><select class="select sm w100" data-r="ctx" aria-label="Hangi hocadan aldın"><option value="">Hoca seçilmedi</option></select></div>' : ''}
        ${ctx === 'hoca' ? '<div class="cb-wrap"><input class="input sm" data-r="ctx" maxlength="12" placeholder="Hangi ders? Örn. CSE 211" aria-label="Hangi ders"></div>' : ''}
        <div class="composer-foot">
          <button type="button" class="chip" data-r="anon" aria-pressed="${anon}">${gl('spy')}Anonim</button>
          <span class="counter" data-r="cnt">0/1000</span>
          <button class="btn btn-primary btn-sm" type="submit">Gönder</button>
        </div>
        <p class="err" role="alert"></p>
        <p class="fine" data-r="who"></p>
      </form>
      <div class="composer locked" data-r="locked" hidden>
        <p class="muted">Yorum yazmak, not paylaşmak ve puanlamak için Yeditepe hesabın gerekli.</p>
        <button type="button" class="btn btn-primary btn-sm" data-r="login">${icon('star')}Hesabımla gir</button>
        <p class="fine">Her yorum ${KUBBE.comment} kubbe kazandırır.</p>
      </div>
    </div>
    <div class="cm-right">
      <div class="cm-head"><h2 class="sub-h">Yorumlar <span class="count" data-r="n"></span></h2>
        <select class="select sm" data-r="sort" aria-label="Yorum sıralaması"><option value="new">En yeni</option><option value="top">En beğenilen</option></select></div>
      <ul class="cm-list" data-r="list"></ul>
    </div>
  </div>`;
  const ta = $('textarea', el), cnt = $('[data-r=cnt]', el), err = $('.err', el), listEl = $('[data-r=list]', el);
  const ctxEl = $('[data-r=ctx]', el), anonBtn = $('[data-r=anon]', el), who = $('[data-r=who]', el);
  if (ctx === 'hoca' && ctxEl) courseCombo(ctxEl);
  function paintWho() {
    const u = myAcc();
    who.textContent = anon ? 'Yorum “Anonim” olarak görünecek.' : `Yorum @${(u && u.username) || 'hesabın'} adıyla görünecek.`;
    anonBtn.setAttribute('aria-pressed', String(anon));
  }
  anonBtn.addEventListener('click', () => { anon = !anon; paintWho(); });
  ta.addEventListener('input', () => { cnt.textContent = ta.value.length + '/1000'; });
  $('[data-r=login]', el).addEventListener('click', openAuth);
  $('[data-r=sort]', el).addEventListener('change', e => { sort = e.target.value; api.refresh(); });
  $('[data-r=form]', el).addEventListener('submit', async e => {
    e.preventDefault();
    err.textContent = '';
    const text = ta.value.trim();
    if (!text) { err.textContent = 'Yorum boş olamaz.'; return; }
    if (!needAcc()) return;
    const doc = { tt, tid, text: text.slice(0, 1000), anon, by: S.me, at: Date.now(), likes: {}, reports: {} };
    let pc = null;
    if (ctx === 'course' && ctxEl && ctxEl.value && S.hocas.has(ctxEl.value)) doc.h = ctxEl.value;
    if (ctx === 'hoca' && ctxEl && ctxEl.value.trim()) {
      pc = parseCode(ctxEl.value);
      if (!pc || !S.courses.has(pc.id)) { err.textContent = 'Bu ders listede yok. Ders kodunu listeden seç.'; return; }
      doc.c = pc.id;
    }
    const ref = S.db.collection('comments').doc();
    const btn = $('[type=submit]', el); btn.disabled = true;
    const ok = await write(() => ref.set(doc), `Yorumun eklendi, +${KUBBE.comment} kubbe`);
    btn.disabled = false;
    if (ok) { ta.value = ''; cnt.textContent = '0/1000'; }
  });
  paintWho();
  const api = {
    refresh() {
      const acc = hasAcc();
      $('[data-r=form]', el).hidden = !acc;
      $('[data-r=locked]', el).hidden = acc;
      paintWho();
      const all = commentsWhere(c => c.tt === tt && c.tid === tid);
      const vis = all.filter(c => !isHidden(c));
      $('[data-r=n]', el).textContent = vis.length ? String(vis.length) : '';
      all.sort(sort === 'top' ? (a, b) => likeCount(b) - likeCount(a) || b.at - a.at : (a, b) => b.at - a.at);
      listEl.innerHTML = all.length ? all.map(commentHtml).join('') : '<li class="cm muted">Henüz yorum yok. İlk yorumu sen yaz.</li>';
      applyWidths(listEl);
      if (ctx === 'course' && ctxEl) {
        const hs = [...hocasOfCourse(tid).keys()];
        const cur = ctxEl.value;
        ctxEl.innerHTML = '<option value="">Hoca seçilmedi</option>' + hs.map(id => `<option value="${esc(id)}">${esc(hocaFull(S.hocas.get(id)))}</option>`).join('');
        ctxEl.value = hs.includes(cur) ? cur : '';
        $('[data-r=ctxwrap]', el).hidden = !hs.length;
      }
    }
  };
  return api;
}

/* ================= Yönlendirme ================= */
let lastGate = null, curKey = null, curWait = false;
const PUBLIC = new Set(['', 'hakkinda']);
async function tryLogin(mail, pw) {
  const em = String(mail || '').trim().toLowerCase();
  for (const [uid, u] of S.users) {
    if (u && u.shared && u.login && String(u.email || '').toLowerCase() === em) return (await sha((u.login.salt || '') + '|' + pw)) === u.login.hash ? { uid, shared: true } : false;
  }
  const L = await loadLogin(true);
  if (L && L.hash && String(L.email || '').toLowerCase() === em) return (await pbkdf2(pw, L.salt, L.it)) === L.hash ? { uid: S.baseMe, shared: false } : false;
  return null;
}
function logoutShared(silent) {
  ls.set('as', null); S.me = S.baseMe; S.shared = false; syncOwner(); S.version++; subPriv(); changed();
  if (!silent) { toast(S.out ? 'Deneme hesabından çıktın.' : 'Çıkış yapıldı.'); location.hash = '#/'; }
}
/* Yönetici hesabından bu cihazda çık: deneme hesaplarıyla öğrenci gibi gezilir, geri dönüş e-posta ve şifreyle */
function logoutBase() {
  if (!S.login || !S.login.hash) { toast('Yönetici girişi tanımlı değil, çıkış yapılamaz.', 'err'); return; }
  ls.set('out', S.baseMe); ls.set('as', null);
  S.out = true; S.shared = false; S.me = S.baseMe; syncOwner(); S.version++; subPriv();
  if (location.hash !== '#/') location.hash = '#/'; else route();
  setTimeout(() => openAuth({ login: true }), 80);
}
function gateState() {
  if (S.dbState === 'none') return 'open';
  if (S.dbState === 'loading' || !S.loaded.users || (S.supa && S.authPending)) return 'wait';
  if (S.shared && !(userOf(S.me) && userOf(S.me).shared)) logoutShared(true);
  if (hasAcc()) return 'open';
  if (S.owner && S.adminProv !== 'fail') return 'wait';
  return 'gate';
}
async function maybeProvisionAdmin() {
  if (!S.owner || S.adminProv !== 'idle' || !S.db || !S.loaded.users || hasAcc() || S.readOnly) return;
  S.adminProv = 'busy';
  let un = 'yonetici', i = 2;
  while (userTaken(un, S.me)) un = 'yonetici' + i++;
  try {
    await retrying(() => S.db.doc('users/' + S.me).set({ username: un, first: '', last: '', showName: false, yil: 0, showYil: false, bolum: '', role: 'admin',
      emoji: '🛡️', color: '#FFE14D', pic: '', bonus: 0, spent: 0, items: {}, at: Date.now(), verifiedAt: Date.now() }));
    S.adminProv = 'done';
    toast('Yönetici hesabın hazır: @' + un);
  } catch (e) { console.error(e); S.adminProv = 'fail'; changed(); }
}
function viewWait(root) { root.innerHTML = `<div class="wrap">${loadingHtml()}</div>`; return {}; }
function parseHash() {
  const h = (location.hash || '').replace(/^#/, '') || '/';
  const qi = h.indexOf('?');
  const path = qi >= 0 ? h.slice(0, qi) : h, qs = qi >= 0 ? h.slice(qi + 1) : '';
  let parts = [];
  try { parts = path.split('/').filter(Boolean).map(decodeURIComponent); } catch (e) { parts = path.split('/').filter(Boolean); }
  return { parts, q: new URLSearchParams(qs) };
}
function setHashQuiet(h) { try { history.replaceState(null, '', h); } catch (e) { /* yok */ } }
const ROUTES = {};
function route() {
  const r = parseHash();
  let key = r.parts[0] || '';
  let fn = ROUTES[key] || viewNotFound;
  lastGate = gateState();
  let askLogin = false, waiting = false;
  if (!PUBLIC.has(key) && lastGate !== 'open') {
    if (lastGate === 'wait') { fn = viewWait; waiting = true; }
    else {
      S.pendingHash = location.hash;
      askLogin = true;
      setHashQuiet('#/');
      if (curKey === '' && !curWait && view) { closeAllModals(); renderChrome(); openAuth({ reason: true }); return; }
      key = ''; fn = ROUTES[''];
    }
  }
  curKey = key; curWait = waiting;
  closeAllModals();
  if (!$('#lightbox').hidden) closeLightbox();
  if (view && view.cleanup) { try { view.cleanup(); } catch (e) { /* yok */ } }
  $$('.dview.max').forEach(x => dviewMax(x, false));
  const main = $('#main');
  main.innerHTML = '';
  try { view = fn(main, r) || {}; } catch (e) { console.error(e); view = {}; main.innerHTML = `<div class="wrap panel">${emptyHtml('Bir şeyler ters gitti', 'Sayfayı yenileyip tekrar dene.')}</div>`; }
  try { if (view.refresh) view.refresh(); } catch (e) { console.error(e); }
  $$('[data-nav]').forEach(a => { if (a.dataset.nav === key) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  try { window.scrollTo(0, 0); } catch (e) { /* yok */ }
  try { main.focus({ preventScroll: true }); } catch (e) { /* yok */ }
  renderChrome();
  if (askLogin) openAuth({ reason: true });
}
function renderChrome() {
  const b = $('#banner');
  let html = '';
  if (S.dbState === 'none') html = '<div class="banner err"><div class="wrap">' + (S.supa ? 'Sunucuya bağlanılamadı. İnternetini kontrol edip sayfayı yenile.' : 'Veri bağlantısı kurulamadı. YediWiki kayıtları yalnızca sayfa claude.ai içinde açıldığında görünür.') + '</div></div>';
  else if (S.subErr === 'live') html = '<div class="banner"><div class="wrap">Canlı bağlantı koptu, yeniden bağlanılıyor. Yeni paylaşımlar birazdan görünür.</div></div>';
  else if (S.subErr === 'revoked') html = '<div class="banner err"><div class="wrap">Bu sayfaya erişimin değişti. Sayfayı yenile.</div></div>';
  else if (S.subErr) html = '<div class="banner err"><div class="wrap">Bağlantı kesildi, veriler güncellenmiyor olabilir. Sayfayı yenile.</div></div>';
  else if (S.readOnly) html = '<div class="banner"><div class="wrap">' + (S.roWhy === 'nouser'
      ? 'Sayfayı Claude hesabınla açmamışsın gibi görünüyor, bu yüzden yalnızca görüntüleyebiliyorsun. Davetin geldiği e-postayla claude.ai’ye giriş yap ve sayfayı davet linkinden yeniden aç.'
      : 'Claude hesabın bu sayfada yalnızca görüntüleme izninde görünüyor. Site sahibi seni Editor olarak davet ettiyse sayfayı yenile; düzelmezse davetin gittiği e-postayla giriş yaptığını kontrol et.') + '</div></div>';
  if (b.innerHTML !== html) b.innerHTML = html;
  $$('[data-owner]').forEach(el => { el.hidden = !S.owner; });
  const chip = $('[data-r=acc]');
  if (chip) {
    const u = myAcc();
    const h = u ? avatarHtml(S.me, { cls: 'sm' }) + `<span class="acc-name">${esc(u.username || '')}</span>` : '<span class="acc-name">Giriş yap</span>';
    if (chip.dataset.h !== h) { chip.dataset.h = h; chip.innerHTML = h; applyWidths(chip); }
    chip.setAttribute('aria-label', u ? 'Profilim' : 'Yeditepe hesabınla gir');
    chip.hidden = !u && !S.out && !S.supa;
    const kb = $('[data-r=kubbechip]');
    if (kb) { kb.hidden = !u; if (u) animNum($('b', kb), balanceOf(S.me)); }
  }
  const bell = $('[data-r=bell]');
  if (bell) {
    const u2 = myAcc();
    bell.hidden = !u2;
    if (!u2) closeNotifs();
    if (u2) {
      if (S.loaded.notes && S.loaded.comments && ls.get('lseen:' + S.me, null) == null) ls.set('lseen:' + S.me, likeTotal());
      const st = notifState();
      const h = icon('bell') + (st.count ? `<span class="bell-dot">${st.count > 9 ? '9+' : st.count}</span>` : '');
      if (bell.dataset.h !== h) { bell.dataset.h = h; bell.innerHTML = h; }
      bell.setAttribute('aria-label', st.count ? `Bildirimler, ${st.count} yeni` : 'Bildirimler');
    }
  }
  { const uu = myAcc(); if (TOUR.on && !uu) tourEnd(); if (uu && S.loaded.users && !S.owner && !TOUR.on && !ls.get('welcomed:' + S.me, false) && !document.querySelector('.modal')) { ls.set('welcomed:' + S.me, true); setTimeout(() => { if (!document.querySelector('.modal') && !TOUR.on) openWelcome(); }, 900); } }
  checkBadges();
}
function waitState() {
  if (S.dbState === 'none') return 'nodb';
  if (S.dbState === 'loading' || !S.db) return 'loading';
  return 'ok';
}
function tabsHtml(tabs, cur) {
  return `<div class="tabs" role="tablist">${tabs.map(t => `<button type="button" class="tab" role="tab" data-tab="${t.k}" aria-selected="${t.k === cur}">${esc(t.name)}<span class="count" data-count="${t.k}"></span></button>`).join('')}</div>`;
}

/* ================= Sıralama ve market parçaları ================= */
const CROWN = '<svg class="crown" viewBox="0 0 40 26" aria-hidden="true"><path d="M3 23 6 6l8 8 6-11 6 11 8-8 3 17z" fill="#FFD23F" stroke="#111C4E" stroke-width="2.5" stroke-linejoin="round"/><circle cx="20" cy="3.5" r="2.6" fill="#FFD23F" stroke="#111C4E" stroke-width="2"/></svg>';
const reduceMotion = () => { try { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };
function countUp(root) {
  if (reduceMotion() || typeof requestAnimationFrame !== 'function') return;
  $$('[data-count]', root).forEach(el => {
    const to = +el.dataset.count || 0;
    if (!to) return;
    const t0 = (window.performance && performance.now()) || Date.now(), dur = 900;
    el.textContent = '0';
    const step = t => { const k = Math.min(1, ((t || Date.now()) - t0) / dur); el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}
function boardList(kind, bolum) {
  return ranking(kind).filter(x => !bolum || x.u.bolum === bolum).map((x, i) => Object.assign({}, x, { rank: i + 1 }));
}
function podItem(x) {
  return `<button type="button" class="pod p${x.rank}${x.uid === S.me ? ' is-me' : ''}" data-g="user" data-id="${esc(x.uid)}">
    ${x.rank === 1 ? CROWN : ''}${avatarHtml(x.uid, { cls: 'pod-av' })}
    <span class="pod-name">${nameHtml(x.u, x.u.username || 'öğrenci')}</span>
    <span class="pod-val"><b data-count="${x.val}">${x.val}</b> kubbe</span>
    <span class="pod-step"><span>${x.rank}</span></span></button>`;
}
function podiumHtml(top) {
  if (!top.length) return '';
  return `<div class="podium">${[top[1], top[0], top[2]].map(x => (x ? podItem(x) : '<span class="pod empty" aria-hidden="true"></span>')).join('')}</div>`;
}
function boardRow(x, max, detail) {
  const k = detail ? kubbeOf(x.uid) : null;
  return `<li><button type="button" class="brow${x.uid === S.me ? ' is-me' : ''}" data-g="user" data-id="${esc(x.uid)}">
    <span class="brow-no">${x.rank}</span>${avatarHtml(x.uid, { cls: 'sm' })}
    <span class="brow-main"><span class="brow-name">${nameHtml(x.u, x.u.username || 'öğrenci')}${badgesHtml(x.u)}</span>
      ${k ? `<span class="brow-sub">${k.notes} not, ${k.comments} yorum, ${k.ratings} hoca puanı</span>` : ''}
      <span class="brow-bar"><i data-w="${max ? ((x.val / max) * 100).toFixed(1) : 0}"></i></span></span>
    <b class="brow-val" data-count="${x.val}">${x.val}</b></button></li>`;
}
function boardHtml(kind, { limit, bolum = '', detail = false }) {
  const list = boardList(kind, bolum);
  if (!list.length) return `<p class="help board-empty">${bolum ? 'Bu bölümden henüz kubbe toplayan yok.' : 'Henüz kubbe toplayan yok. Not paylaş, yorum yaz, hoca puanla.'}</p>`;
  const max = list[0].val, shown = list.slice(0, limit);
  let rows = shown.slice(3).map(x => boardRow(x, max, detail)).join('');
  const meX = list.find(x => x.uid === S.me);
  if (meX && meX.rank > limit) rows += '<li class="brow-gap" aria-hidden="true">…</li>' + boardRow(meX, max, detail);
  return podiumHtml(shown.slice(0, 3)) + (rows ? `<ol class="board${detail ? ' detail' : ''}">${rows}</ol>` : '');
}
const boardSig = (kind, bolum, limit, detail) => [kind, bolum, limit, detail, S.usersVer, S.me, boardList(kind, bolum).slice(0, limit).map(x => x.uid + ':' + x.val).join(',')].join('|');
function fillBolumSelect(sel, cur) {
  if (!sel) return '';
  const has = S.bolumler.size > 0;
  const wrap = sel.closest('[data-r=bolwrap]') || sel;
  wrap.hidden = !has;
  if (!has) return '';
  const html = bolumOptions(cur, 'Tüm bölümler');
  if (sel.dataset.h !== html) { sel.dataset.h = html; sel.innerHTML = html; }
  sel.value = S.bolumler.has(cur) ? cur : '';
  return sel.value;
}
let artSeq = 0;
function prodArt(id, pfx) {
  const p = pfx ? pfx + '-' : 'a' + (++artSeq) + '-';
  const K = 'stroke="#1B1330" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"';
  const K2 = 'stroke="#1B1330" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"';
  const A = {
    'gece-eskortu': `<defs><radialGradient id="${p}g" cx="50%" cy="42%" r="58%"><stop offset="0" stop-color="#FFE7A3" stop-opacity=".95"/><stop offset="1" stop-color="#FFE7A3" stop-opacity="0"/></radialGradient>
      <linearGradient id="${p}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#34343F"/><stop offset="1" stop-color="#1C1C23"/></linearGradient>
      <linearGradient id="${p}h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3A3A46"/><stop offset="1" stop-color="#1E1E25"/></linearGradient></defs>
      <circle cx="60" cy="60" r="50" fill="url(#${p}g)"/><circle cx="90" cy="22" r="9" fill="#FFF6D6"/><circle cx="94" cy="19" r="8" fill="#FFE7A3" opacity=".45"/>
      <path class="wag" d="M80 96c12-1 18-10 15-21" fill="none" stroke="#26262E" stroke-width="6" stroke-linecap="round"/>
      <path d="M38 106c-4-20 3-37 15-43h14c12 6 19 23 15 43z" fill="url(#${p}f)" ${K}/>
      <path d="M50 68c5 12 15 12 20 0 2 10 2 22 0 30-7 4-13 4-20 0-2-8-2-20 0-30z" fill="#F5F1E8"/>
      <ellipse cx="50" cy="106" rx="8" ry="4.5" fill="#F5F1E8" ${K2}/><ellipse cx="70" cy="106" rx="8" ry="4.5" fill="#F5F1E8" ${K2}/>
      <path d="M46 39c-9-1-13 8-11 18 1 4 5 5 7 2 2-4 3-12 4-20z" fill="#17171D" ${K2}/><path d="M74 39c9-1 13 8 11 18-1 4-5 5-7 2-2-4-3-12-4-20z" fill="#17171D" ${K2}/>
      <ellipse cx="60" cy="49" rx="17" ry="15" fill="url(#${p}h)" ${K}/>
      <ellipse cx="53.5" cy="41" rx="2.6" ry="1.6" fill="#C2763A"/><ellipse cx="66.5" cy="41" rx="2.6" ry="1.6" fill="#C2763A"/>
      <ellipse cx="60" cy="56" rx="8.5" ry="6" fill="#C2763A"/><ellipse cx="60" cy="52.5" rx="3.4" ry="2.4" fill="#0F0F13"/>
      <circle cx="53.5" cy="45.5" r="2.3" fill="#2A1A10"/><circle cx="66.5" cy="45.5" r="2.3" fill="#2A1A10"/><circle cx="54.3" cy="44.7" r=".8" fill="#fff"/><circle cx="67.3" cy="44.7" r=".8" fill="#fff"/>
      <path d="M57 60q3 3 6 0" fill="none" stroke="#0F0F13" stroke-width="1.6" stroke-linecap="round"/><path d="M59.3 61.5q.7 3.5 1.4 0" fill="#FF7A8A"/>`,
    'kartal-kanatlari': `<defs><linearGradient id="${p}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF1B8"/><stop offset=".5" stop-color="#FFC43D"/><stop offset="1" stop-color="#D9820B"/></linearGradient>
      <linearGradient id="${p}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3551C9"/><stop offset="1" stop-color="#111C4E"/></linearGradient></defs>
      <g class="flap-l"><path d="M56 62C44 44 24 34 6 38c10 5 17 10 20 16-11-1-19 3-22 9 11 0 19 2 25 6-8 3-12 9-12 16 12-7 24-12 39-19z" fill="url(#${p}w)" ${K}/>
      <path d="M20 44c10 2 20 8 30 16M14 60c12 0 24 4 34 8M22 78c8-5 18-9 28-12" fill="none" stroke="#B86E06" stroke-width="1.6" opacity=".7"/></g>
      <g class="flap-r"><path d="M64 62c12-18 32-28 50-24-10 5-17 10-20 16 11-1 19 3 22 9-11 0-19 2-25 6 8 3 12 9 12 16-12-7-24-12-39-19z" fill="url(#${p}w)" ${K}/>
      <path d="M100 44c-10 2-20 8-30 16M106 60c-12 0-24 4-34 8M98 78c-8-5-18-9-28-12" fill="none" stroke="#B86E06" stroke-width="1.6" opacity=".7"/></g>
      <path d="M60 44l15 6v14c0 12-7 20-15 25-8-5-15-13-15-25V50z" fill="url(#${p}s)" stroke="#FFE7A3" stroke-width="3" stroke-linejoin="round"/>
      <path d="M60 55l3 6.5 7 .8-5.2 4.8 1.4 7L60 70.6l-6.2 3.5 1.4-7-5.2-4.8 7-.8z" fill="#FFD23F"/>
      <path d="M50 49l10-4 10 4" fill="none" stroke="#fff" stroke-width="2" opacity=".5" stroke-linecap="round"/>`,
    'altin-ring': `<defs><linearGradient id="${p}t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF4C2"/><stop offset=".45" stop-color="#FFCB45"/><stop offset="1" stop-color="#DB8E0C"/></linearGradient>
      <linearGradient id="${p}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3D5BD9"/><stop offset="1" stop-color="#142066"/></linearGradient></defs>
      <g transform="rotate(-12 60 60)"><path d="M10 34h100v15a9 9 0 0 0 0 18v15H10V67a9 9 0 0 0 0-18z" fill="url(#${p}t)" stroke="#7A4A00" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M34 37v42" stroke="#7A4A00" stroke-width="2" stroke-dasharray="3 4"/>
      <text x="22" y="61" text-anchor="middle" font-family="Bricolage Grotesque,Arial,sans-serif" font-size="9" font-weight="800" fill="#7A4A00" transform="rotate(-90 22 58)">RİNG</text>
      <rect x="44" y="45" width="52" height="24" rx="6" fill="url(#${p}b)" stroke="#0B1238" stroke-width="2"/>
      <rect x="49" y="49" width="11" height="8" rx="2" fill="#CFE0FF"/><rect x="63" y="49" width="11" height="8" rx="2" fill="#CFE0FF"/><rect x="77" y="49" width="14" height="8" rx="2" fill="#CFE0FF"/>
      <circle cx="56" cy="70" r="4.5" fill="#1B1330"/><circle cx="84" cy="70" r="4.5" fill="#1B1330"/><circle cx="56" cy="70" r="1.6" fill="#C8CCD8"/><circle cx="84" cy="70" r="1.6" fill="#C8CCD8"/>
      <path class="shine" d="M18 37h16L14 78H10z" fill="#fff" opacity=".4"/></g>`,
    'selcuklu-kapi': `<defs><linearGradient id="${p}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6E2BE"/><stop offset="1" stop-color="#C9955A"/></linearGradient>
      <linearGradient id="${p}d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2E44B8"/><stop offset=".7" stop-color="#111C4E"/><stop offset="1" stop-color="#FFB020"/></linearGradient>
      <pattern id="${p}pt" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M6 0l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill="#B07B3E" opacity=".55"/></pattern></defs>
      <rect x="16" y="10" width="88" height="102" rx="4" fill="url(#${p}s)" stroke="#5E3F1C" stroke-width="2.5"/>
      <rect x="16" y="10" width="88" height="102" rx="4" fill="url(#${p}pt)"/>
      <path d="M34 112V64Q34 36 60 26q26 10 26 38v48z" fill="#E9CFA0" stroke="#5E3F1C" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M40 112V66Q40 44 60 36q20 8 20 30v46z" fill="url(#${p}d)" stroke="#5E3F1C" stroke-width="2" stroke-linejoin="round"/>
      <path d="M42 66q4.5-6 9 0q4.5-6 9 0q4.5-6 9 0q4.5-6 9 0" fill="none" stroke="#F6E2BE" stroke-width="1.8"/>
      <path d="M46 58q3.5-5 7 0q3.5-5 7 0q3.5-5 7 0q3.5-5 7 0" fill="none" stroke="#F6E2BE" stroke-width="1.6" opacity=".8"/>
      <circle cx="60" cy="46" r="3" fill="#FFD23F"/><path class="glowline" d="M44 112h32" stroke="#FFD23F" stroke-width="3" stroke-linecap="round"/>`,
    'gunes-aurasi': `<defs><radialGradient id="${p}u"><stop offset="0" stop-color="#FFFBE0"/><stop offset=".55" stop-color="#FFC93C"/><stop offset="1" stop-color="#FF8A00"/></radialGradient>
      <linearGradient id="${p}n" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4A6BFF"/><stop offset="1" stop-color="#101A5C"/></linearGradient></defs>
      <g class="spin">${Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6, x1 = 60 + Math.cos(a) * 22, y1 = 38 + Math.sin(a) * 22, x2 = 60 + Math.cos(a) * 32, y2 = 38 + Math.sin(a) * 32; return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="#FFB020" stroke-width="3.5" stroke-linecap="round"/>`; }).join('')}</g>
      <circle cx="60" cy="38" r="17" fill="url(#${p}u)" stroke="#D97706" stroke-width="2"/>
      <path d="M20 76h80l-12 30H8z" fill="url(#${p}n)" ${K}/>
      <path d="M40 76l-10 30M60 76l-8 30M80 76l-6 30M16 91h80" stroke="#8FA8FF" stroke-width="1.5" opacity=".75"/>
      <path class="shine" d="M26 78h14l-11 26H16z" fill="#fff" opacity=".22"/>
      <path d="M52 106v9M40 115h26" ${K}/>`,
    'yokus-canavari': `<defs><linearGradient id="${p}m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8BE8BA"/><stop offset="1" stop-color="#1A7A50"/></linearGradient>
      <linearGradient id="${p}m2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient></defs>
      <path d="M4 106L58 20l58 86z" fill="url(#${p}m)" stroke="#0F4D33" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M58 20l58 86H58z" fill="url(#${p}m2)"/>
      <path d="M58 20l11 18-7-3-6 8-6-8-7 3z" fill="#fff" stroke="#0F4D33" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M28 106c30-10 12-24 38-32 20-6-4-16 6-26" fill="none" stroke="#F7E7BF" stroke-width="5" stroke-linecap="round"/>
      <path d="M58 20V6" stroke="#3A2414" stroke-width="2.5" stroke-linecap="round"/><path class="wave" d="M58 6h17l-4 5 4 5H58z" fill="#FF4D5E" stroke="#3A2414" stroke-width="1.8" stroke-linejoin="round"/>
      <g transform="rotate(-8 90 88)"><rect x="76" y="80" width="30" height="15" rx="3" fill="#FFE14D" stroke="#3A2414" stroke-width="2"/><text x="91" y="91" text-anchor="middle" font-family="Bricolage Grotesque,Arial,sans-serif" font-size="9.5" font-weight="800" fill="#3A2414">%18</text></g>`,
    'son-sosisli': `<defs><linearGradient id="${p}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFDDA0"/><stop offset="1" stop-color="#D98336"/></linearGradient>
      <linearGradient id="${p}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF8466"/><stop offset="1" stop-color="#B02E1C"/></linearGradient></defs>
      <g transform="rotate(-16 60 66)"><path d="M14 68c0-10 8-16 18-16h56c10 0 18 6 18 16" fill="url(#${p}b)" stroke="#7A3E12" stroke-width="2.5" stroke-linejoin="round"/>
      <rect x="8" y="57" width="104" height="19" rx="9.5" fill="url(#${p}s)" stroke="#6E1B10" stroke-width="2.5"/>
      <path d="M16 64l6 6 6-6 6 6 6-6 6 6 6-6 6 6 6-6 6 6 6-6 6 6 6-6 6 6" fill="none" stroke="#FFD23F" stroke-width="3.2" stroke-linejoin="round"/>
      <path d="M14 72c2 12 10 18 20 18h52c10 0 18-6 20-18" fill="url(#${p}b)" stroke="#7A3E12" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M22 60h34" stroke="#fff" stroke-width="2.5" opacity=".55" stroke-linecap="round"/></g>
      <g transform="rotate(10 92 26)"><rect x="74" y="16" width="38" height="19" rx="5" fill="#111C4E"/><text x="93" y="29.5" text-anchor="middle" font-family="Bricolage Grotesque,Arial,sans-serif" font-size="10" font-weight="800" fill="#FFE14D">SON 1</text></g>`,
    'ikinci-ev': `<defs><linearGradient id="${p}c" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5C7BFF"/><stop offset="1" stop-color="#1A2A8A"/></linearGradient></defs>
      <g transform="rotate(-12 42 48)"><rect x="16" y="16" width="48" height="62" rx="3" fill="#fff" stroke="#8B97BD" stroke-width="2"/>
      <path d="M22 28h36M22 36h36M22 44h28M22 52h36M22 60h22" stroke="#8B97BD" stroke-width="1.6"/><path d="M22 52h24" stroke="#FFE14D" stroke-width="5" opacity=".7"/></g>
      <path class="steam" d="M56 36c-5-6 5-10 0-16" fill="none" stroke="#9AA3C4" stroke-width="3" stroke-linecap="round"/><path class="steam s2" d="M70 36c-5-6 5-10 0-16" fill="none" stroke="#9AA3C4" stroke-width="3" stroke-linecap="round"/>
      <path d="M40 46h46v40a13 13 0 0 1-13 13H53a13 13 0 0 1-13-13z" fill="url(#${p}c)" ${K}/>
      <path d="M86 56h5a11 11 0 0 1 0 22h-5" fill="none" stroke="#1B1330" stroke-width="7"/><path d="M86 56h5a11 11 0 0 1 0 22h-5" fill="none" stroke="#3D5BD9" stroke-width="3.5"/>
      <ellipse cx="63" cy="47" rx="22" ry="5" fill="#6B3E1F" stroke="#1B1330" stroke-width="2"/><ellipse cx="58" cy="46" rx="7" ry="1.6" fill="#B07A4D"/>
      <path d="M47 56v28" stroke="#fff" stroke-width="3.5" opacity=".35" stroke-linecap="round"/>
      <path d="M52 80a3 2.4 0 0 1 6 0a3 3.4 0 0 1 6 0a3 2.8 0 0 1 6 0a3 3.8 0 0 1 6 0z" fill="#FFE14D"/>`,
    'karsi-durum': `<defs><linearGradient id="${p}l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE7BC"/><stop offset="1" stop-color="#DDA25E"/></linearGradient></defs>
      <g transform="rotate(18 60 62)"><path d="M38 30c10-8 34-8 44 0l-8 78c-7 4-21 4-28 0z" fill="url(#${p}l)" stroke="#7A4A18" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M40 30c7 9 33 9 40 0-6-6-34-6-40 0z" fill="#5FBF6A" stroke="#2F7A3A" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="52" cy="30" r="4.5" fill="#FF5A4E" stroke="#8E1F16" stroke-width="1.4"/><circle cx="66" cy="29" r="4" fill="#FF5A4E" stroke="#8E1F16" stroke-width="1.4"/><circle cx="59" cy="33" r="2.6" fill="#FFF4C8"/>
      <path d="M46 44l24 6M47 54l22 5" stroke="#B8793A" stroke-width="2" opacity=".6" stroke-linecap="round"/>
      <path d="M44 64h32l-4 44c-7 4-21 4-28 0z" fill="#fff" stroke="#8B97BD" stroke-width="2" stroke-linejoin="round"/>
      <path d="M46 74h28M47 84h26M48 94h24" stroke="#FF4D5E" stroke-width="3.2"/></g>`
  };
  return A[id] || '';
}
function lootHtml(it, { u = null, bal = 0, buy = true } = {}) {
  const owned = ownsItem(u, it.id), can = !!u && bal >= it.price, R = RARITY[it.rar] || RARITY.yaygin;
  const avBtn = owned && u && u === myAcc() ? (avKind(u) === 'urun' && u.urun === it.id ? '<span class="loot-av">Profil resmin</span>' : `<button type="button" class="buy can" data-g="av-urun" data-id="${esc(it.id)}">Profil resmi yap</button>`) : '';
  const btn = !buy || owned ? '' : `<button type="button" class="buy${can ? ' can' : ''}" data-g="buy" data-id="${esc(it.id)}"${u && !can ? ' disabled' : ''}>${u ? (can ? 'Satın al' : (it.price - bal) + ' kubbe eksik') : 'Hesap aç'}</button>`;
  return `<article class="loot r-${it.rar}${owned ? ' owned' : ''}" data-loot>
    <div class="loot-stage">
      <span class="loot-rays" aria-hidden="true"></span><span class="loot-glow" aria-hidden="true"></span>
      <div class="loot-float"><div class="loot-tilt"><svg class="loot-img" viewBox="0 0 120 120" role="img" aria-label="${esc(it.name)}">${prodArt(it.id)}</svg></div></div>
      <span class="loot-pedestal" aria-hidden="true"></span>
      <span class="loot-sparks" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>
      <span class="loot-sheen" aria-hidden="true"></span>
      ${owned ? '<span class="loot-owned">Sende</span>' : ''}
    </div>
    <span class="loot-rar">${esc(R.ad)}<span>${esc(it.kind)}</span></span>
    <h3>${esc(it.name)}</h3>
    <p>${esc(it.desc)}</p>
    <div class="loot-buy"><span class="dome-price">${gl('coin', 'k-coin')}${it.price}</span>${btn}${avBtn}</div>
  </article>`;
}
function wireLoot(root) {
  if (reduceMotion()) return;
  $$('[data-loot]', root).forEach(card => {
    if (card.dataset.wired) return;
    card.dataset.wired = '1';
    const stage = $('.loot-stage', card);
    stage.addEventListener('pointermove', e => {
      const r = stage.getBoundingClientRect();
      if (!(r.width > 0)) return;
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.setProperty('--rx', (x - 0.5).toFixed(3));
      card.style.setProperty('--ry', (y - 0.5).toFixed(3));
      card.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      card.classList.add('hot');
    });
    stage.addEventListener('pointerleave', () => {
      card.style.setProperty('--rx', '0'); card.style.setProperty('--ry', '0');
      card.classList.remove('hot');
    });
  });
}

/* ================= Ana sayfa ================= */
/* ================= Tur 3: not istekleri, DersÖlçer, mezuniyet yolu, son aramalar ================= */
// İsteğin türü yok: kişi ne lazım olduğunu kısaca yazar (boş da bırakabilir). Eski kayıtlardaki kind alanı okunmaz.
const reqTitle = r => (r && typeof r.text === 'string' && r.text.trim()) || 'Not isteği';
const reqNorm = s => fold(String(s || '')).replace(/\s+/g, ' ').trim();
function requestsWhere(fn) { const out = []; for (const [id, r] of S.requests) if (r && typeof r === 'object' && fn(r)) out.push(Object.assign({ id }, r)); return out; }
const plusCount = r => Object.values((r && r.plus) || {}).filter(Boolean).length;
const plusedByMe = r => { const k = okey(r); return !!(k && r && r.plus && r.plus[k]); };
const demandOf = r => plusCount(r) + 1;
function openRequests(cid) { return requestsWhere(r => !r.done && (!cid || r.cid === cid)).sort((a, b) => demandOf(b) - demandOf(a) || (b.at || 0) - (a.at || 0)); }
function reqItemHtml(r, { showCourse = false } = {}) {
  const mine = r.by === S.me, n = demandOf(r), on = plusedByMe(r) || mine;
  const acts = r.done
    ? (r.nid ? `<a class="btn btn-sm" href="#/not/${esc(r.nid)}">${icon('book')}Nota git</a>` : '')
    : `<button type="button" class="req-plus${on ? ' on' : ''}" data-g="req-plus" data-id="${esc(r.id)}" aria-pressed="${on}"${mine ? ' disabled' : ''} aria-label="Ben de istiyorum, ${n} kişi istiyor"><span>Ben de</span><b>${n}</b></button><a class="btn btn-sm btn-primary" href="#/paylas?ders=${esc(r.cid)}&istek=${esc(r.id)}">${icon('up')}Ben paylaşırım</a>`;
  const cn = showCourse ? (S.courses.get(r.cid) || {}).name : '';
  return `<li class="req${r.done ? ' done' : ''}" id="rq-${esc(r.id)}"><div class="req-main"><span class="req-top">${showCourse ? `<a class="code" href="#/ders/${esc(r.cid)}">${esc(codeOf(r.cid))}</a>` : ''}<b>${esc(reqTitle(r))}</b>${!r.done && n >= REQ_HOT ? gl('flame', 'rq-fire') : ''}${r.done ? '<span class="req-ok">Karşılandı</span>' : ''}</span>${cn ? `<span class="req-cname">${esc(cn)}</span>` : ''}${r.why ? `<p class="req-why">${esc(r.why)}</p>` : ''}<span class="meta"><span>${whoHtml(r.by, false, '')}</span><span>${esc(ago(r.at))}</span>${r.done && (r.doneBy || (S.supa && r.nid)) ? `<span>karşılayan: ${r.doneBy ? whoHtml(r.doneBy, false, '') : spyName()}</span>` : ''}</span></div><div class="req-acts">${acts}${(mine || S.owner) && !r.done ? `<button type="button" class="iconbtn" data-g="req-del" data-id="${esc(r.id)}" aria-label="İsteği sil">${icon('trash')}</button>` : ''}</div></li>`;
}
/* Ana sayfada istek tek satır: ders kodu, istek, (popülerse alev), + ve kaç kişinin istediği. Ayrıntı istekler sayfasında */
const REQ_HOT = 3;
function reqLineHtml(r) {
  const mine = r.by === S.me, n = demandOf(r), on = plusedByMe(r) || mine, hot = n >= REQ_HOT;
  return `<li class="rq-line${hot ? ' hot' : ''}" data-id="${esc(r.id)}" data-n="${n}"><a class="code" href="#/ders/${esc(r.cid)}">${esc(codeOf(r.cid))}</a><a class="rq-t" href="#/istekler?r=${esc(r.id)}">${esc(reqTitle(r))}</a>${hot ? gl('flame', 'rq-fire') : ''}<button type="button" class="rq-up${on ? ' on' : ''}" data-g="req-plus" data-id="${esc(r.id)}" aria-pressed="${on}"${mine ? ' disabled title="Senin isteğin"' : ''} aria-label="Ben de istiyorum, ${n} kişi istiyor">+</button><b class="rq-n" aria-hidden="true">${n}</b></li>`;
}
function requestBoxHtml(cid) {
  const list = openRequests(cid), people = list.reduce((s, r) => s + demandOf(r), 0);
  return `<div class="reqbox"><div class="reqbox-head"><span class="reqbox-ico" aria-hidden="true">${gl('megaphone')}</span><div><b>${list.length ? `${people} kişi bu dersten not bekliyor` : 'Aradığın notu bulamadın mı?'}</b><span>${list.length ? `Paylaşıp isteği karşılayan ${KUBBE.fill} kubbe kazanır.` : `İste; paylaşan arkadaşın ${KUBBE.fill} kubbe kazansın.`}</span></div><button type="button" class="btn btn-sm" data-g="req-new" data-id="${esc(cid)}">${icon('plus')}Not iste</button></div>${list.length ? `<ul class="reqs">${list.slice(0, 4).map(r => reqItemHtml(r)).join('')}</ul>` : ''}</div>`;
}
function openRequestModal(cid) {
  if (!needAcc()) return;
  if (openRequests(cid).filter(r => r.by === S.me).length >= 3) { toast('Bu ders için en fazla 3 açık isteğin olabilir.', 'err'); return; }
  const m = openModal({ title: codeOf(cid) + ' için not iste', body: `<form novalidate>
      <div class="field"><label for="rq-text">Ne lazım? <span class="opt">isteğe bağlı</span></label><input id="rq-text" class="input" maxlength="140" autocomplete="off" placeholder="Örn. 3. hafta, bağlı listeler"><p class="help">Boş bırakırsan bu dersten herhangi bir not istemiş olursun.</p></div>
      <div class="field"><label for="rq-why">Neden lazım? <span class="opt">isteğe bağlı</span></label><textarea id="rq-why" class="input" rows="2" maxlength="300" placeholder="Örn. vizeye çalışıyorum, katılamadığım haftalar eksik"></textarea><p class="help">İstekler sayfasında görünür; ana sayfada yalnızca kısa hali yazar.</p></div>
      <p class="help">İsteğin ders sayfasında ve ana sayfada görünür. Notu paylaşıp isteği karşılayan kişi ${KUBBE.fill} kubbe kazanır.</p>
      <p class="err" role="alert"></p>
      <div class="modal-foot"><button type="button" class="btn btn-ghost" data-close>Vazgeç</button><button class="btn btn-primary" type="submit">İste</button></div></form>` });
  $('form', m.el).addEventListener('submit', async e => {
    e.preventDefault();
    const text = $('#rq-text', m.el).value.trim().replace(/\s+/g, ' ').slice(0, 140), why = $('#rq-why', m.el).value.trim().replace(/\s+/g, ' ').slice(0, 300);
    // aynı ders için aynı istek (boş istek de) zaten açıksa yenisi açılmaz: başkasınınsa ona katılınır
    const dup = openRequests(cid).find(r => reqNorm(r.text) === reqNorm(text));
    if (dup && dup.by !== S.me) { m.close(); await togglePlus(dup.id, true); return; }
    if (dup) { $('.err', m.el).textContent = 'Bu ders için aynı isteğin zaten açık.'; return; }
    const ref = S.db.collection('requests').doc();
    if (await write(() => ref.set({ cid, text, why, by: S.me, at: Date.now(), plus: {}, done: false, nid: '', doneBy: '', doneAt: 0 }), 'İsteğin yayınlandı')) m.close();
  });
}
async function togglePlus(id, join, el) {
  if (!needAcc()) return;
  const r = S.requests.get(id); if (!r || r.done || r.by === S.me) return;
  if (join && plusedByMe(r)) { toast('Bu isteğe zaten katılmıştın.'); return; }
  const on = join ? true : !plusedByMe(r);
  const at = el && on ? centerOf(el) : null;
  const ok = await write(() => S.db.doc('requests/' + id).update({ plus: { [pk('requests', id)]: on ? true : null } }), join ? 'Aynı istek vardı, sen de katıldın' : on ? 'İsteğe katıldın' : 'Katılımın geri alındı');
  if (ok && at) burst(at[0], at[1], { glyphs: ['+1', 'up'], n: 5, cls: 'up', spread: 34 });
}
async function deleteRequest(id) {
  const r = S.requests.get(id); if (!r || !canManage(r)) return;
  if (!(await confirmModal({ title: 'İsteği sil', text: 'Bu not isteği kaldırılacak.', ok: 'Sil', danger: true }))) return;
  await write(() => S.db.doc('requests/' + id).delete(), 'İstek silindi');
}
async function fulfillRequest(id, nid, cid) {
  const r = id && S.requests.get(id);
  S.shareReq = '';
  if (!r || r.done || r.cid !== cid) return;
  try { await S.db.doc('requests/' + id).update({ done: true, nid, doneBy: S.me, doneAt: Date.now() }); if (r.by !== S.me) toast(`İsteği karşıladın, +${KUBBE.fill} kubbe`); } catch (e) { console.error(e); }
}
function renderReqBanner(root) {
  const intro = $('.page-intro', root); if (!intro) return;
  const r = S.shareReq ? S.requests.get(S.shareReq) : null;
  let b = $('.req-banner', root);
  if (!r || r.done) { if (b) b.remove(); return; }
  const h = `${gl('megaphone', 'req-banner-ico')}<span><b>${esc(displayName(r.by, false, ''))}</b> ${esc(codeOf(r.cid))} dersinden not istiyor${r.text ? `: “${esc(r.text)}”` : ''}. Paylaştığın not bu isteği karşılayacak${r.by === S.me ? '' : `, +${KUBBE.fill} kubbe`}.</span>`;
  if (!b) { b = document.createElement('div'); b.className = 'req-banner'; intro.appendChild(b); }
  if (b.dataset.h !== h) { b.dataset.h = h; b.innerHTML = h; }
}
ROUTES['istekler'] = function viewRequests(root) {
  let only = 'all', want = parseHash().q.get('r') || '';
  root.innerHTML = `<div class="wrap"><div class="page-intro"><h1>Not istekleri</h1><p>Öğrencilerin aradığı notlar. Elinde varsa paylaş, isteği karşıla, ${KUBBE.fill} kubbe kazan. Yeni istek için ders sayfasındaki “Not iste” düğmesini kullan.</p></div>
    <div class="toolbar"><div class="chips" role="group" aria-label="Göster"><button type="button" class="chip" data-f="all" aria-pressed="true">Açık istekler</button><button type="button" class="chip" data-f="mine" aria-pressed="false">Derslerim</button><button type="button" class="chip" data-f="done" aria-pressed="false">Karşılananlar</button></div></div>
    <div class="panel pt0" data-r="list"></div></div>`;
  $$('[data-f]', root).forEach(b => b.addEventListener('click', () => { only = b.dataset.f; $$('[data-f]', root).forEach(x => x.setAttribute('aria-pressed', String(x === b))); api.refresh(); }));
  const api = { refresh() {
    const el = $('[data-r=list]', root), st = waitState();
    if (st === 'nodb') { el.innerHTML = noDbHtml(); return; }
    if (st === 'loading' || !S.loaded.requests || !allLoaded()) { el.innerHTML = loadingHtml(); return; }
    const mine = new Set(myCourses());
    const list = only === 'done' ? requestsWhere(r => r.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 30) : openRequests().filter(r => only !== 'mine' || mine.has(r.cid));
    el.innerHTML = list.length ? `<ul class="reqs">${list.map(r => reqItemHtml(r, { showCourse: true })).join('')}</ul>`
      : emptyHtml(only === 'done' ? 'Henüz karşılanan istek yok' : only === 'mine' ? 'Derslerinde açık istek yok' : 'Şu an açık istek yok', only === 'mine' && !mine.size ? 'Önce ders sayfalarından Derslerim’e ders ekle.' : 'Bir ders sayfasından “Not iste” diyerek ilk isteği sen aç.');
    if (want) { const li = document.getElementById('rq-' + want); if (li) { want = ''; li.classList.add('flash'); try { li.scrollIntoView({ block: 'center', behavior: reduceMotion() ? 'auto' : 'smooth' }); } catch (e) { /* yok */ } } }
  } };
  return api;
};
/* DersÖlçer: zorluk ve iş yükü
   Oy kaydındaki z ve y DERECEDİR: 1 çok kolay / çok az ... 5 çok zor / çok fazla (eski kayıtlar da böyle, göç gerekmez).
   Ekranda PUAN gösterilir: puan = 6 − derece. 1 en zor / en ağır, 5 en kolay / en hafif; HocaÖlçer gibi yüksek puan öğrencinin lehine. */
const ZOR_W = ['Çok zor', 'Zor', 'Orta', 'Kolay', 'Çok kolay'], YUK_W = ['Çok ağır', 'Ağır', 'Orta', 'Hafif', 'Çok hafif'];   // puan 1..5
const HEAT = ['#E0262F', '#F2551F', '#F29A0B', '#7DBB2E', '#22A86A'];   // puan 1..5: kırmızıdan yeşile
const dec1 = x => (Math.round(x * 10) / 10).toFixed(1).replace('.', ',');
const puanOf = deg => 6 - deg, degOf = puan => 6 - puan;
const lvOf = p => Math.min(5, Math.max(1, Math.round(p)));
function zorIndex() {
  return memoized('zor', () => {
    const m = new Map();
    const ok = x => x && typeof x.z === 'number' && typeof x.y === 'number';
    const of = cid => { let o = m.get(cid); if (!o) m.set(cid, o = new Map()); return o; };
    if (S.supa) {
      for (const [cid, d] of S.zor) { const v = d && d.v; if (v && typeof v === 'object') for (const k of Object.keys(v)) if (ok(v[k])) of(cid).set(k, v[k]); }
      return m;
    }
    for (const [cid, c] of S.dbCourses) if (c && c.zorluk && typeof c.zorluk === 'object') for (const uid of Object.keys(c.zorluk)) if (ok(c.zorluk[uid])) of(cid).set(uid, c.zorluk[uid]);
    for (const [uid, u] of S.users) {
      if (!u || !u.zor || typeof u.zor !== 'object') continue;
      for (const cid of Object.keys(u.zor)) { if (ok(u.zor[cid])) of(cid).set(uid, u.zor[cid]); else if (m.has(cid)) m.get(cid).delete(uid); }
    }
    return m;
  });
}
const myZor = cid => { const o = zorIndex().get(cid); return (o && o.get(pk('zor', cid))) || null; };
function zorWrite(cid, val) {
  if (!S.supa) return S.db.doc('users/' + S.me).update({ zor: { [cid]: val } });
  const ref = S.db.doc('zor/' + cid), body = { v: { [pk('zor', cid)]: val } };
  return S.zor.has(cid) ? ref.update(body) : ref.set(body);
}
function zorStats(cid) {
  const o = zorIndex().get(cid), v = o ? [...o.values()] : [];
  if (!v.length) return { n: 0, zor: 0, yuk: 0 };
  const avg = k => v.reduce((s, x) => s + x[k], 0) / v.length;
  return { n: v.length, zor: puanOf(avg('z')), yuk: puanOf(avg('y')) };   // puan: 1 en zor / en ağır
}
// Acı biber: rengi zorluğa göre kırmızıdan yeşile döner; zor derste üstünden dalga dalga ısı çıkar
function chiliSvg(lv, { gray = false, mini = false } = {}) {
  const c = gray ? '#C3C9D8' : HEAT[lv - 1], cap = gray ? '#A3ABBE' : '#2A9A55', capD = gray ? '#8E97AD' : '#1E7A41';
  const heat = gray || mini ? 0 : Math.max(0, 4 - lv);   // puan 1: üç dalga, 2: iki, 3: bir
  const waves = [[13, 30], [21, 25], [29, 28]].slice(0, heat).map(([x, y], i) => `<path class="ch-heat ch-h${i}" d="M${x} ${y}c-2.6-2.4 2.6-4.6 0-7.2s2.6-4.6 0-7.2" stroke="${c}"/>`).join('');
  return `<svg class="chili" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${waves ? `<g fill="none" stroke-linecap="round" stroke-width="2.6" opacity=".85">${waves}</g>` : ''}<path d="M35.5 19C43 14.5 50.5 16 51.6 22.4c1.7 9.6-3.6 20.4-13.4 27.8C30.2 56.2 20 59.4 10.8 58.6c-2.4-.2-2.9-2.9-.7-3.7 8.8-3 16.4-8.4 20.6-16.6 3.3-6.5 3-13.4 4.8-19.3z" fill="${c}"/><path d="M11.6 57.7c9.4.4 18.7-2.6 26.6-8.7" fill="none" stroke="#000" stroke-opacity=".16" stroke-width="2.4" stroke-linecap="round"/><path d="M45.2 24.2c1.3 6.4-1.4 13-6.8 18" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/><path d="M47 21.6c.4 1.4.5 2.6.4 3.6" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2.4" stroke-linecap="round"/><path d="M32.6 20.3c1.8-5.6 7.4-8.3 12.6-7.3 4.4.9 7.6 4 8.2 8.4-2.6-1.6-5.5-1.5-7.8.3-2.2-2.4-6-3.2-9.2-1.4-1.3-.4-2.6-.5-3.8 0z" fill="${cap}"/><path d="M36.6 20c2.8-1.6 6.2-1.2 8.6 1.1" fill="none" stroke="${capD}" stroke-width="1.4" stroke-linecap="round"/><path d="M45.4 13.6c-.4-4.6 2.4-8.2 7.4-8.6" fill="none" stroke="${cap}" stroke-width="3.6" stroke-linecap="round"/></svg>`;
}
// Kitap yığını: iş yükü ağırlaştıkça yığın yükselir (puan 1: beş kitap ... puan 5: tek kitap)
const BOOKS = [['#3D5BD9', 48, 0, 0], ['#FFB020', 42, 3, -2.5], ['#FF4D6D', 45, -2, 2], ['#22A86A', 38, 4, -3], ['#7C5CFF', 41, -1, 2.5]];
function booksSvg(lv, { gray = false } = {}) {
  const n = gray ? 3 : 6 - lv;
  const g = BOOKS.slice(0, n).map(([col, w, dx, rot], i) => {
    const r2 = v => Math.round(v * 100) / 100, h = 8.6, y = r2(56.4 - (i + 1) * h - i * .5), x = r2(32 - w / 2 + dx), cx = r2(x + w / 2), cy = r2(y + h / 2), f = gray ? ['#B9C0D1', '#C9CEDB', '#AEB6C9'][i] : col;
    return `<g class="bk" style="animation-delay:${i * 70}ms"><g transform="rotate(${rot} ${cx} ${cy})"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2.2" fill="${f}"/><rect x="${r2(x + w - 7.4)}" y="${r2(y + 1.6)}" width="5.6" height="${r2(h - 3.2)}" rx="1.2" fill="#FFF7E6"/><path d="M${r2(x + w - 7.4)} ${r2(y + 3.5)}h5.6M${r2(x + w - 7.4)} ${r2(y + 5.2)}h5.6" stroke="#E6D9BC" stroke-width=".8"/><rect x="${r2(x + 4.4)}" y="${y}" width="2.6" height="${h}" fill="#fff" fill-opacity=".3"/><rect x="${r2(x + 8.4)}" y="${y}" width="1.2" height="${h}" fill="#fff" fill-opacity=".22"/></g></g>`;
  }).join('');
  return `<svg class="books" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><ellipse cx="32" cy="58.6" rx="23" ry="2.4" fill="#000" fill-opacity=".08"/>${g}</svg>`;
}
function zchipHtml(cid) {
  const st = zorStats(cid); if (!st.n) return '';
  const lv = lvOf(st.zor);
  return `<span class="zchip" style="--hc:${HEAT[lv - 1]}" title="Zorluk ${dec1(st.zor)}/5, ${ZOR_W[lv - 1].toLocaleLowerCase('tr')} (1 en zor, 5 en kolay), ${st.n} oy">${chiliSvg(lv, { mini: true })}<b>${dec1(st.zor)}</b></span>`;
}
function dolTileHtml(kind, p, n) {
  const z = kind === 'z', lv = n ? lvOf(p) : 3, W = z ? ZOR_W : YUK_W;
  return `<div class="dol-tile dol-${kind}${n ? '' : ' empty'}" style="--hc:${n ? HEAT[lv - 1] : '#9AA3BA'}">
    <span class="dol-art">${z ? chiliSvg(lv, { gray: !n }) : booksSvg(lv, { gray: !n })}</span>
    <span class="dol-lbl">${z ? 'Zorluk' : 'İş yükü'}</span>
    ${n ? `<span class="dol-num"><b>${dec1(p)}</b><small>/5</small></span><span class="dol-word">${W[lv - 1]}</span>` : '<span class="dol-none">Henüz oy yok</span>'}
    <span class="dol-scale"><span class="dol-track" aria-hidden="true">${n ? `<i style="left:${((p - 1) / 4 * 100).toFixed(1)}%"></i>` : ''}</span><span class="dol-ends"><span>1 ${z ? 'en zor' : 'en ağır'}</span><span>5 ${z ? 'en kolay' : 'en hafif'}</span></span></span>
  </div>`;
}
function zorCardHtml(cid) {
  const st = zorStats(cid), mine = !!myZor(cid);
  return `<section class="zor-card dol" aria-label="DersÖlçer: zorluk ve iş yükü">
    <div class="dol-head"><span class="dol-t">DersÖlçer</span><span class="dol-n">${st.n ? st.n + ' öğrenci oyladı' : 'İlk oyu sen ver'}</span><button type="button" class="btn btn-sm${mine ? '' : ' btn-primary'}" data-g="zor" data-id="${esc(cid)}">${mine ? 'Oyunu değiştir' : 'Oy ver'}</button></div>
    <div class="dol-grid">${dolTileHtml('z', st.zor, st.n)}${dolTileHtml('y', st.yuk, st.n)}</div>
  </section>`;
}
function openZorModal(cid) {
  if (!needAcc()) return;
  const c = S.courses.get(cid); if (!c) return;
  const cur = myZor(cid), curZ = cur ? puanOf(cur.z) : 0, curY = cur ? puanOf(cur.y) : 0;   // seçenekler puandır
  const scale = (name, label, hint, W, val, art) => `<fieldset class="field zfs"><legend class="label zl">${art(1)}<span>${label}</span><span class="opt">${hint}</span></legend><div class="zor-scale">${W.map((l, i) => `<label class="zs" style="--hc:${HEAT[i]}"><input type="radio" name="${name}" value="${i + 1}"${val === i + 1 ? ' checked' : ''}><span>${art(i + 1)}<b>${i + 1}</b>${esc(l)}</span></label>`).join('')}</div></fieldset>`;
  const m = openModal({ title: codeOf(cid) + ' nasıl bir ders?', body: `<form novalidate>
      ${scale('z', 'Zorluk', '1 en zor, 5 en kolay', ZOR_W, curZ, lv => chiliSvg(lv, { mini: true }))}
      ${scale('y', 'İş yükü', 'ödev, proje, okuma; 1 en ağır, 5 en hafif', YUK_W, curY, lv => booksSvg(lv))}
      <p class="err" role="alert"></p><div class="modal-foot">${cur ? '<button type="button" class="btn btn-ghost" data-r="zdel">Oyumu kaldır</button>' : ''}<button type="button" class="btn btn-ghost" data-close>Vazgeç</button><button class="btn btn-primary" type="submit">Kaydet</button></div></form>` });
  $('form', m.el).addEventListener('submit', async e => {
    e.preventDefault();
    const zp = +(($('input[name=z]:checked', m.el) || {}).value || 0), yp = +(($('input[name=y]:checked', m.el) || {}).value || 0);
    if (!zp || !yp) { $('.err', m.el).textContent = 'İki soruyu da işaretle.'; return; }
    if (await write(() => zorWrite(cid, { z: degOf(zp), y: degOf(yp), at: Date.now() }), 'Oyun kaydedildi')) m.close();
  });
  const del = $('[data-r=zdel]', m.el);
  if (del) del.addEventListener('click', async () => { if (await write(() => zorWrite(cid, null), 'Oyun kaldırıldı')) m.close(); });
}
/* Mezuniyet yolu */
function doneCourses() {
  const p = S.priv && Array.isArray(S.priv.done) ? S.priv.done : null;
  const l = p || ls.get(lsk('done'), []);
  return Array.isArray(l) ? l.filter(id => typeof id === 'string') : [];
}
async function toggleDone(cid, btnEl) {
  if (!needAcc()) return;
  const cur = doneCourses(), has = cur.includes(cid), next = has ? cur.filter(x => x !== cid) : [...cur, cid].slice(-300);
  const btn = btnEl || document.querySelector(`[data-g=done][data-id="${cid}"]`);
  if (!has && btn) { const [x, y] = centerOf(btn); burst(x, y, { glyphs: ['check', 'spark'], n: 8, cls: 'coin', spread: 40 }); }
  ls.set(lsk('done'), next);
  if (S.priv) S.priv = Object.assign({}, S.priv, { done: next });
  changed();
  const pp = privPath();
  if (!S.readOnly && pp) { try { const ref = S.db.doc(pp); if (S.priv) await ref.update({ done: next }); else await ref.set({ done: next }); } catch (e) { /* bu cihazda kalır */ } }
}
/* Bir planın ilerlemesi: zorunlu dersler ve seçmeliler (skip: sayılmayacak dersler, hid: çıkarılanlar) */
function planProgress(P, bol, dn, skip, hid) {
  const krOf = id => { const c = S.courses.get(id) || {}; return c.kr != null ? +c.kr : 0; }, sum = l => l.reduce((s, x) => s + x, 0);
  const ids = [...new Set(Object.values(P.plan).flat())].filter(id => typeof id === 'string' && !(skip && skip.has(id)) && !(hid && hid.has(id)));
  const els = [];
  for (const sn of Object.keys(P.el || {})) (P.el[sn] || []).forEach((e, i) => { const k = elKey(bol, sn, i, e); if (!(hid && hid.has(k))) els.push([e, k]); });
  const d = ids.filter(id => dn.has(id)), ed = els.filter(([, k]) => dn.has('el:' + k)), ekr = ([e]) => (e[2] != null ? +e[2] : 0);
  return { n: ids.length, d: d.length, en: els.length, ed: ed.length, tot: sum(ids.map(krOf)) + sum(els.map(ekr)), got: sum(d.map(krOf)) + sum(ed.map(ekr)) };
}
const gradLine = g => `${g.d}/${g.n} zorunlu ders${g.en ? `, ${g.ed}/${g.en} seçmeli` : ''}${g.tot ? `, ${fmtKr(g.got)}/${fmtKr(g.tot)} kredi` : ''}`;
const gradPct = g => (g.n + g.en ? Math.round((g.d + g.ed) / (g.n + g.en) * 100) : 0);
function gradHtml(P, bol, two) {
  if (!myAcc()) return `<p class="grad-hint">${icon('star')}Giriş yaptığında aldığın dersleri işaretleyip mezuniyet yolunu takip edebilirsin.</p>`;
  const dn = new Set(doneCourses()), g = planProgress(P, bol, dn), pct = gradPct(g);
  let second = '';
  if (two) {
    const h = planProgress(two.P2, two.cap.b, dn, two.mainIds, two.hid), p2 = gradPct(h);
    second = `<div class="grad-2"><div class="grad-top"><b><span class="cap-tag">${capTag(two.cap)}</span>${esc(two.b2.ad || two.cap.b)}</b><span>${gradLine(h)}</span></div><div class="grad-bar cap" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p2}" aria-label="${capTag(two.cap)} ilerlemesi"><span data-w="${p2}"></span></div></div>`;
  }
  return `<div class="grad${pct >= 100 ? ' full' : ''}"><div class="grad-top"><b>${gl('gradcap', 'gl-in')}Mezuniyet yolu</b><span>${gradLine(g)}</span></div><div class="grad-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Tamamlanan dersler"><span data-w="${pct}"></span></div><p class="grad-sub">${pct >= 100 ? 'Tüm dersler tamam, tebrikler!' : pct ? `%${pct} tamam. Aldığın dersleri ${gl('check', 'gl-in gl-ok')} ile işaretlemeye devam et.` : `Aldığın dersleri ${gl('check', 'gl-in gl-ok')} ile işaretle, ilerlemen burada görünsün.`}</p>${second}</div>`;
}
/* Son aramalar */
function pushRecent(q, h) {
  q = String(q || '').trim(); if (!q || !h) return;
  const cur = ls.get('recent', []).filter(x => x && x.q && x.q.toLocaleLowerCase('tr') !== q.toLocaleLowerCase('tr'));
  ls.set('recent', [{ q: q.slice(0, 40), h }, ...cur].slice(0, 6));
}
function recentHtml() {
  const list = (ls.get('recent', []) || []).filter(x => x && x.q && typeof x.h === 'string' && x.h.startsWith('#/'));
  return list.length ? `<span class="rc-lbl">Son aramaların:</span>${list.map(x => `<a class="rc" href="${esc(x.h)}">${esc(x.q)}</a>`).join('')}<button type="button" class="rc-clear" data-g="recent-clear" aria-label="Son aramaları temizle">${icon('x')}</button>` : '';
}
/* Hoş geldin turu: Ayhan Abi sayfadan sayfaya gezdirir, her durakta anlattığı yeri ışıkla gösterir.
   Tur bir pencere değildir; sayfa değişince kapanmaz. Işığın dışındaki alan tıklamaya kapalıdır, ışıktaki öğe kullanılabilir. */
const TOUR = { on: false, i: 0, steps: [], el: null, tgt: null, seq: 0, poll: 0, tick: 0, want: '', t0: 0, prevFocus: null, gate: 0, talkT: 0 };
/* Tur Yeditepe kapısında başlar: kapıya (ya da "Kapıyı aç"a) basınca kanatlar açılır, Ayhan Abi kapıda karşılar. gate: 0 kapalı, 1 açılıyor, 2 açık */
const GATE_MS = 950;
const GATE_SAY = 'Yeditepe’nin kapısındasın. Kapıya dokun ya da “Kapıyı aç”a bas, Ayhan Abi seni içeride bekliyor.';
const TOUR_NUM = ['', 'Bir', 'İki', 'Üç', 'Dört', 'Beş', 'Altı', 'Yedi', 'Sekiz', 'Dokuz'];
function tourCourse() {
  const ok = id => !!id && S.courses.has(id);
  const mine = myCourses().find(ok); if (mine) return mine;
  try { const top = [...courseActivity().entries()].sort((a, b) => b[1].total - a[1].total)[0]; if (top && ok(top[0])) return top[0]; } catch (e) { /* yok */ }
  try { const P = planOf((userOf(S.me) || {}).bolum || ''); const p = P && P.plan ? Object.values(P.plan).flat().find(ok) : ''; if (p) return p; } catch (e) { /* yok */ }
  return ['CSE211', 'MATH131'].find(ok) || S.courses.keys().next().value || '';
}
function tourSteps(u) {
  const cid = tourCourse();
  const list = [
    { gate: true, t: 'Hoş geldin!', next: 'Gezdir beni' },   // kapı ve tanışma bulunduğun sayfada; gezinti ilk durakta başlar
    { go: '#/', sel: '#main .hero .search', t: 'Her şey buradan başlar', say: 'Ders kodunu (CSE 211 gibi) ya da hocanın adını buraya yaz, listeden seç. Aradığın ders ya da hoca hemen önüne gelir.' },
    { go: '#/dersler', sel: '#main .toolbar', t: 'Bölümünün ders planı', say: 'Buradan bölümünü seç: dönem dönem bütün derslerin çıkar. Bitirdiğin dersleri ✓ ile işaretlersen ne kadar kaldığını da görürsün.' },
    cid ? { go: '#/ders/' + cid, sel: ['#main [data-r=myc]', '#main .head-actions'], t: 'Derslerini ekle', say: 'Her dersin kendi sayfası var: notlar, yorumlar ve hocalar. “Derslerime ekle”ye basarsan o derse yeni not düşünce ilk sen görürsün.' } : null,
    { go: '#/paylas', sel: ['#main [data-r=gpick]', '#main [data-r=dbox]', '#main [data-r=form]'], t: 'Notunu paylaş, kubbe kazan', say: `${gdCfg() ? '“Drive’dan seç”e bas, notunu Drive’ından seç; paylaşım ayarını ben hallederim.' : 'Notunu Google Drive’a koy, linkini buraya yapıştır.'} Her not ${KUBBE.note} kubbe, her ▲ oy +${KUBBE.up} kubbe kazandırır; bir not isteğini karşılarsan +${KUBBE.fill} kubbe daha.` },
    { go: '#/hocaolcer', sel: '#main .toolbar', t: 'HocaÖlçer', say: 'Hocayı adıyla ya da ders koduyla bul. Anlatım, ödev yükü, not verme ve devamsızlıkta puanla; yorumunu anonim bırakabilirsin.' },
    { go: '#/kubbe', sel: ['#main [data-r=head]', '#main .shop-sec'], t: 'Kubbe ve market', say: 'Paylaştıkça kubbe toplarsın. Dönemin yıldızı sıralamasında yüksel, marketten profilini süsleyecek parçalar al.' },
    { go: '#/', sel: '#main [data-r=ayhan]', t: 'Hepsi bu kadar!', say: 'Ben burada, ana sayfada dolaşıyorum; yorulunca kırmızı kulübemin önünde uyurum. Canın sıkılırsa gel beni sev. İlk notunu bekliyorum, hav!', next: 'Başlayalım' }
  ].filter(Boolean);
  const n = list.length - 1;
  list[0].say = `Hav! Ben Ayhan Abi, kampüsün köpeği. ${u.username ? '@' + u.username + ', seni' : 'Seni'} YediWiki’de kısa bir tura çıkarayım: ${(TOUR_NUM[n] || String(n)).toLocaleLowerCase('tr')} durak, bir dakika bile sürmez.`;
  return list;
}
const tourPath = h => String(h || '').split('?')[0].replace(/^#?\/?$/, '#/') || '#/';
function openWelcome() {
  const u = myAcc(); if (!u) return;
  tourEnd();
  TOUR.steps = tourSteps(u); TOUR.on = true; TOUR.gate = 0; TOUR.prevFocus = document.activeElement;
  const el = document.createElement('div');
  el.className = 'tour init';
  el.innerHTML = '<div class="tour-veil" data-t="v0"></div><div class="tour-veil" data-t="v1"></div><div class="tour-veil" data-t="v2"></div><div class="tour-veil" data-t="v3"></div><div class="tour-hole" data-t="hole" hidden></div>'
    + `<button type="button" class="tour-gate" data-t="gate" aria-label="Kapıyı aç">${GATE_SVG}</button>`
    + `<section class="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-t" aria-describedby="tour-say" data-t="card">
      <div class="tour-dog idle" aria-hidden="true">${ayFaceSvg()}<span class="tour-name">Ayhan Abi</span></div>
      <div class="tour-txt"><p class="tour-step" data-t="step"></p><h2 class="tour-t" id="tour-t" data-t="t"></h2><p class="tour-say" id="tour-say" data-t="say" aria-live="polite"></p></div>
      <div class="tour-bar" aria-hidden="true"><i data-t="bar"></i></div>
      <div class="tour-foot"><button type="button" class="tour-skip" data-t="skip">Turu geç</button><button type="button" class="btn btn-ghost" data-t="back">Geri</button><button type="button" class="btn btn-primary tour-next" data-t="next">İleri</button></div>
    </section>`;
  document.body.appendChild(el);
  TOUR.el = el;
  const T = k => el.querySelector(`[data-t=${k}]`);
  T('next').addEventListener('click', tourNext);
  T('gate').addEventListener('click', () => { if (!TOUR.gate) gateOpen(); else if (TOUR.gate === 2) tourTalk(900); });
  T('back').addEventListener('click', () => tourGo(TOUR.i - 1));
  T('skip').addEventListener('click', () => tourEnd());
  el.addEventListener('click', e => { if (e.target.classList && e.target.classList.contains('tour-veil')) tourNudge(); });
  window.addEventListener('resize', tourPlace);
  window.addEventListener('scroll', tourPlace, { passive: true });
  window.addEventListener('hashchange', tourRoute);
  document.addEventListener('keydown', tourKey, true);
  TOUR.tick = setInterval(tourPlace, 300);   // sayfa yeniden çizilince ya da kaydırınca ışık öğeyi izler
  tourGo(0);
  const raf = window.requestAnimationFrame || (f => setTimeout(f, 16));
  raf(() => raf(() => { if (TOUR.el === el) el.classList.remove('init'); }));   // ilk yerleşim kaymadan, sonrakiler akarak
}
function tourGo(i) {
  if (!TOUR.on || !TOUR.el) return;
  if (i >= TOUR.steps.length) { tourEnd(); return; }
  i = Math.max(0, i);
  TOUR.i = i; TOUR.seq++; TOUR.tgt = null;
  const st = TOUR.steps[i], el = TOUR.el, T = k => el.querySelector(`[data-t=${k}]`), n = TOUR.steps.length - 1;
  const shut = !!st.gate && TOUR.gate < 2;   // kapı daha açılmadı
  el.classList.toggle('at-gate', !!st.gate);
  T('gate').classList.toggle('open', !!st.gate && TOUR.gate > 0);
  T('step').textContent = shut ? 'Yeditepe kapısı' : i ? `Durak ${i} / ${n}` : 'Tanışalım';
  T('t').textContent = shut ? 'Kampüse hoş geldin!' : st.t;
  tourSay(shut ? GATE_SAY : st.say);
  T('bar').style.width = Math.round(i / n * 100) + '%';
  T('back').hidden = i === 0;
  T('next').textContent = shut ? 'Kapıyı aç' : st.next || 'İleri';
  if (!shut) tourDog(i ? 'walk' : 'bark');
  TOUR.want = tourPath(st.go || location.hash); TOUR.t0 = Date.now();
  if (st.go && tourPath(location.hash) !== TOUR.want) location.hash = st.go;
  tourPlace();
  tourSeek(TOUR.seq);
  tourFocus();
}
function tourNext() { const st = TOUR.steps[TOUR.i]; if (st && st.gate && TOUR.gate < 2) gateOpen(); else tourGo(TOUR.i + 1); }
function gateOpen() {
  if (!TOUR.on || !TOUR.el || TOUR.gate) return;
  const el = TOUR.el, nx = el.querySelector('[data-t=next]');
  TOUR.gate = 1;
  el.querySelector('[data-t=gate]').classList.add('open');
  el.querySelector('[data-t=gate]').setAttribute('aria-label', 'Ayhan Abi');
  nx.disabled = true;
  const done = () => { if (TOUR.el !== el || TOUR.gate !== 1) return; TOUR.gate = 2; nx.disabled = false; tourGo(0); };
  if (reduceMotion()) done(); else setTimeout(done, GATE_MS);
}
/* Konuşma kelime kelime belirir; tırnaktaki düğme adları sarı, kubbe miktarları mavi. Ayhan Abi o sırada konuşur. */
function tourSay(text) {
  const el = TOUR.el && TOUR.el.querySelector('[data-t=say]'); if (!el) return;
  let d = 0;
  const TWG = { '▲': 'up', '▼': 'down', '✓': 'check' };
  const words = s => s.split(/(\s+)/).map(w => !w || /^\s+$/.test(w) ? w : `<span class="tw" style="--d:${d++}">${TWG[w] ? gl(TWG[w], 'gl-in') : esc(w)}</span>`).join('');
  el.innerHTML = String(text || '').split(/(“[^”]*”|\+?\d+ kubbe)/).map(p => !p ? '' : p.startsWith('“') ? `<b class="tour-key">${words(p)}</b>` : /^\+?\d+ kubbe$/.test(p) ? `<b class="tour-num">${words(p)}</b>` : words(p)).join('');
  tourTalk(Math.min(3400, 700 + d * 60));
}
function tourFace() { const el = TOUR.el; return el ? el.querySelector(el.classList.contains('at-gate') ? '.tg-ayhan' : '.tour-dog') : null; }
function tourTalk(ms) {
  const f = tourFace(); if (!f || reduceMotion() || (TOUR.el.classList.contains('at-gate') && TOUR.gate < 2)) return;
  TOUR.el.querySelectorAll('.talk').forEach(x => x.classList.remove('talk'));
  clearTimeout(TOUR.talkT);
  f.classList.add('talk');
  TOUR.talkT = setTimeout(() => f.classList.remove('talk'), ms);
}
function tourFind(sel) {
  for (const s of [].concat(sel || [])) {
    const x = document.querySelector(s);
    if (x && !x.closest('[hidden]') && x.getClientRects().length) return x;
  }
  return null;
}
function tourSeek(seq) {
  clearTimeout(TOUR.poll);
  const st = TOUR.steps[TOUR.i];
  if (!st || !st.sel) { TOUR.tgt = null; tourPlace(); return; }
  const look = () => {
    if (!TOUR.on || seq !== TOUR.seq) return;
    const here = tourPath(location.hash) === TOUR.want && curKey === TOUR.want.slice(2).split('/')[0];
    const x = here ? tourFind(st.sel) : null;
    if (x) { TOUR.tgt = x; tourScroll(x); tourPlace(); tourFocus(); if (TOUR.el.querySelector('.tour-dog.walk')) tourDog('bark', 380); return; }
    if (!here && Date.now() - TOUR.t0 > 1500) { TOUR.tgt = null; tourPlace(); tourDog('idle'); return; }   // kullanıcı başka sayfaya geçti: ışıksız bekle
    if (Date.now() - TOUR.t0 < 6000) TOUR.poll = setTimeout(look, 120);
    else { TOUR.tgt = null; tourPlace(); tourDog('idle'); }
  };
  look();
}
function tourRoute() {
  if (!TOUR.on) return;
  TOUR.tgt = null; TOUR.t0 = Date.now();
  tourSeek(TOUR.seq);
}
const tourMobile = () => (window.innerWidth || 1024) < 700;
function tourTopbar() { const tb = $('.topbar'); return tb ? Math.max(0, tb.getBoundingClientRect().bottom) : 0; }
function tourScroll(x) {
  const r = x.getBoundingClientRect(), vh = window.innerHeight || 768, top = tourTopbar() + 18;
  const card = TOUR.el && TOUR.el.querySelector('[data-t=card]');
  const room = tourMobile() && card ? vh - card.offsetHeight - 28 : vh - 24;
  if (r.top >= top && r.bottom <= room) return;
  const want = Math.max(0, (window.scrollY || 0) + r.top - top);
  try { window.scrollTo({ top: want, behavior: reduceMotion() ? 'auto' : 'smooth' }); } catch (e) { /* yok */ }
}
function tourPlace() {
  if (!TOUR.on || !TOUR.el) return;
  const el = TOUR.el, hole = el.querySelector('[data-t=hole]'), card = el.querySelector('[data-t=card]');
  const vs = [0, 1, 2, 3].map(k => el.querySelector(`[data-t=v${k}]`));
  const vw = Math.min(window.innerWidth || 1024, document.documentElement.clientWidth || window.innerWidth || 1024), vh = window.innerHeight || 768;
  let x = TOUR.tgt;
  if (x && (!document.contains(x) || !x.getClientRects().length || x.closest('[hidden]'))) { x = TOUR.tgt = null; tourSeek(TOUR.seq); }   // sayfa öğeyi yeniden çizdi: yenisini bul
  const box = (v, l, t, w, h) => { v.style.left = l + 'px'; v.style.top = t + 'px'; v.style.width = Math.max(0, w) + 'px'; v.style.height = Math.max(0, h) + 'px'; };
  let R = null;
  if (x) {
    const r = x.getBoundingClientRect(), pad = 8;
    R = { l: Math.max(4, r.left - pad), t: Math.max(4, r.top - pad), r: Math.min(vw - 4, r.right + pad), b: Math.min(vh - 4, r.bottom + pad) };
    if (R.r - R.l < 8 || R.b - R.t < 8) R = null;
  }
  el.classList.toggle('has-hole', !!R);
  hole.hidden = !R;
  if (R) {
    box(hole, R.l, R.t, R.r - R.l, R.b - R.t);
    box(vs[0], 0, 0, vw, R.t); box(vs[1], 0, R.b, vw, vh - R.b); box(vs[2], 0, R.t, R.l, R.b - R.t); box(vs[3], R.r, R.t, vw - R.r, R.b - R.t);
  } else { box(vs[0], 0, 0, vw, vh); vs.slice(1).forEach(v => box(v, 0, 0, 0, 0)); }
  const mob = tourMobile(), atGate = el.classList.contains('at-gate');
  card.classList.toggle('dock', mob);
  const cw = card.offsetWidth || 440, ch = card.offsetHeight || 260, m = 16, minT = tourTopbar() + 8;
  let gb = 0;
  if (atGate) {   // kapı üstte, konuşma kartı altında (telefonda kart altta durur, kapı kalan yerin ortasında)
    const g = el.querySelector('[data-t=gate]'), room = vh - minT - (mob ? ch + 34 : ch + 3 * m);
    const gh = Math.round(Math.max(120, Math.min(320, room))), gw = Math.round(gh * 0.8);
    const gt = mob ? minT + Math.max(0, (vh - ch - 34 - minT - gh) / 2) : Math.max(minT, (vh - gh - m - ch) / 2);
    Object.assign(g.style, { width: gw + 'px', height: gh + 'px', left: Math.round((vw - gw) / 2) + 'px', top: Math.round(gt) + 'px' });
    gb = gt + gh;
  }
  if (mob) { card.style.transform = ''; card.dataset.tail = 'none'; return; }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let left, top, tail = 'none';
  if (atGate) { left = (vw - cw) / 2; top = gb + m; tail = 'up'; card.style.setProperty('--tx', Math.round(cw / 2) + 'px'); }
  else if (!R) { left = (vw - cw) / 2; top = Math.max(minT, (vh - ch) / 2); }
  else if (vh - R.b - m >= ch + m) { top = R.b + m; tail = 'up'; }
  else if (R.t - m - ch >= minT) { top = R.t - m - ch; tail = 'down'; }
  else if (vw - R.r - m >= cw + m) { left = R.r + m; top = clamp(R.t, minT, vh - ch - m); tail = 'left'; }
  else if (R.l - m >= cw + m) { left = R.l - m - cw; top = clamp(R.t, minT, vh - ch - m); tail = 'right'; }
  else top = vh - ch - m;
  if (left == null) left = clamp((R ? (R.l + R.r) / 2 : vw / 2) - cw / 2, m, vw - cw - m);
  card.dataset.tail = tail;
  if (R && (tail === 'up' || tail === 'down')) card.style.setProperty('--tx', Math.round(clamp((R.l + R.r) / 2 - left, 28, cw - 28)) + 'px');
  if (R && (tail === 'left' || tail === 'right')) card.style.setProperty('--ty', Math.round(clamp((R.t + R.b) / 2 - top, 28, ch - 28)) + 'px');
  card.style.transform = `translate3d(${Math.round(left)}px,${Math.round(top)}px,0)`;
}
function tourFocus() {
  const el = TOUR.el; if (!el) return;
  setTimeout(() => { const b = el.querySelector('[data-t=next]'); if (TOUR.el === el && b && !el.contains(document.activeElement)) { try { b.focus({ preventScroll: true }); } catch (e) { /* yok */ } } }, 40);
}
/* Kart yer değiştirirken Ayhan Abi yürür, yerine varınca havlar */
function tourDog(mode, delay = 0) {
  const dog = tourFace(); if (!dog) return;
  clearTimeout(dog._t);
  const go = () => {
    dog.classList.remove('walk', 'idle', 'barking');
    if (mode === 'walk') { dog.classList.add('walk'); return; }
    dog.classList.add('idle');
    if (mode === 'bark') { dog.getBoundingClientRect(); dog.classList.add('barking'); }
  };
  if (delay && !reduceMotion()) dog._t = setTimeout(go, delay); else go();
}
function tourNudge() {
  const card = TOUR.el && TOUR.el.querySelector('[data-t=card]'); if (!card) return;
  card.classList.remove('nudge'); void card.offsetWidth; card.classList.add('nudge');
}
function tourKey(e) {
  if (!TOUR.on || !TOUR.el || modalStack.length || nfPop()) return;   // turun üstünde açılan pencere ve bildirim paneli kendi tuşlarını kullanır
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); tourEnd(); return; }
  if (e.key === 'Tab') {   // odak kapıyla kartın düğmeleri arasında döner
    const atGate = TOUR.el.classList.contains('at-gate');
    const f = [...TOUR.el.querySelectorAll('[data-t=gate], [data-t=card] button')].filter(b => !b.hidden && !b.disabled && (atGate || b.dataset.t !== 'gate'));
    if (!f.length) return;
    const k = f.indexOf(document.activeElement);
    if (k < 0 || (e.shiftKey && k === 0) || (!e.shiftKey && k === f.length - 1)) { e.preventDefault(); f[e.shiftKey ? f.length - 1 : 0].focus(); }
    return;
  }
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '');
  if (typing) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); tourNext(); }
  else if (e.key === 'ArrowLeft' && TOUR.i > 0) { e.preventDefault(); tourGo(TOUR.i - 1); }
}
function tourEnd() {
  clearTimeout(TOUR.poll); clearInterval(TOUR.tick); clearTimeout(TOUR.talkT);
  const was = TOUR.on; TOUR.on = false; TOUR.seq++;
  window.removeEventListener('resize', tourPlace);
  window.removeEventListener('scroll', tourPlace);
  window.removeEventListener('hashchange', tourRoute);
  document.removeEventListener('keydown', tourKey, true);
  if (TOUR.el) TOUR.el.remove();
  TOUR.el = null; TOUR.tgt = null;
  if (was) { const p = TOUR.prevFocus; TOUR.prevFocus = null; if (p && p.focus && document.contains(p) && p !== document.body) { try { p.focus({ preventScroll: true }); } catch (e) { /* yok */ } } }
}
function petDog(el, say) {
  if (!el) return;
  const bub = el.querySelector('.ay-say');
  if (bub && el.parentElement) { const pr = el.parentElement.getBoundingClientRect(), r = el.getBoundingClientRect(), c = r.left + r.width / 2 - pr.left; el.dataset.say = pr.width && c < pr.width * 0.3 ? 'l' : pr.width && c > pr.width * 0.7 ? 'r' : 'c'; }
  if (bub) { bub.textContent = say || 'Hav!'; bub.classList.remove('on'); void bub.offsetWidth; bub.classList.add('on'); clearTimeout(bub._t); bub._t = setTimeout(() => bub.classList.remove('on'), 2600); }
  el.classList.remove('barking'); void el.offsetWidth; el.classList.add('barking');
  setTimeout(() => el.classList.remove('barking'), 1000);
  const [x, y] = centerOf(el); burst(x, y - 10, { glyphs: ['heart', 'paw'], n: 5, cls: 'heart', spread: 36 });
  const n = (+ls.get('pets', 0) || 0) + 1; ls.set('pets', n);
  if (n === 10) toast('Ayhan Abi seni çok sevdi', '', gl('paw'));
}
ROUTES[''] = function viewHome(root) {
  const lb = { kind: 'term', open: false, bolum: '', sig: '' };
  root.innerHTML = `
  <section class="hero has-ayhan">
    <div class="wrap"><div class="hero-in">
      <h1 class="hero-title">Ders kodunu yaz, gerisi burada.</h1>
      <p class="hero-sub">Yeditepe öğrencilerinin paylaştığı ders notları, bölümlerin ders planları ve HocaÖlçer’de hoca değerlendirmeleri tek yerde.</p>
      <form class="search big cb-wrap" role="search" data-r="form">
        ${icon('search')}
        <input id="home-q" type="search" enterkeyhint="search" placeholder="CSE 211, MATH 131 ya da hoca adı" aria-label="Ders kodu ya da hoca adı ara">
      </form>
      <p class="recent" data-r="recent" hidden></p>
      <p class="hero-try" data-r="try" hidden></p>
      <p class="hero-stats" data-r="stats"></p>
    </div>
    <div class="ay-stage" data-r="ayhan"><span class="ay-home" aria-hidden="true">${KULUBE_SVG}</span><button type="button" class="ay ay-roam idle" aria-label="Ayhan Abi, kampüsün köpeği. Sevmek için dokun.">${AYHAN_SVG}<span class="ay-name" aria-hidden="true">Ayhan Abi</span><span class="ay-say" aria-live="polite"></span></button></div></div>
  </section>
  <div class="wrap home-main" data-r="main">
    <div class="home-left">
      <section class="home-sec">
        <div class="sec-head"><h2>Notlar</h2><div class="seg ns-seg" role="group" aria-label="Notları sırala"><button type="button" class="seg-btn" data-ns="hot" aria-pressed="true">${gl('flame')}Revaçta</button><button type="button" class="seg-btn" data-ns="new" aria-pressed="false">Yeni</button></div><a class="sec-link" href="#/paylas">Not paylaş</a></div>
        <div data-r="notes"></div>
      </section>
      <section class="home-sec">
        <div class="sec-head"><h2>Son yorumlar</h2><a class="sec-link" href="#/hocaolcer">HocaÖlçer</a></div>
        <div data-r="cms"></div>
      </section>
      <section class="home-sec">
        <div class="sec-head"><h2>Gündemdeki dersler</h2><a class="sec-link" href="#/dersler">Tüm dersler</a></div>
        <div data-r="hot"></div>
      </section>
    </div>
    <div class="home-right">
    <aside class="lead" data-r="lead" aria-label="Kubbe sıralaması">
      <div class="lead-top"><h2>Kubbe sıralaması</h2><a class="sec-link" href="#/kubbe">Kubbe ve market</a></div>
      <div class="lead-ctl">
        <div class="seg" role="group" aria-label="Sıralama türü"><button type="button" class="seg-btn" data-lk="term" aria-pressed="true">Dönemin yıldızı</button><button type="button" class="seg-btn" data-lk="all" aria-pressed="false">Tüm zamanlar</button></div>
        <span data-r="bolwrap" hidden><select class="select sm" data-r="bolum" aria-label="Bölüm"></select></span>
      </div>
      <p class="rank-sub" data-r="lsub"></p>
      <div data-r="board"></div>
      <button type="button" class="btn btn-sm lead-more" data-r="more" hidden>${icon('chart')}Tümünü gör</button>
    </aside>
    <section class="req-card" data-r="reqsec" aria-labelledby="rq-h">
      <div class="req-card-top"><span class="req-card-ico" aria-hidden="true">${gl('megaphone')}</span><div><h2 id="rq-h">Not istekleri</h2><p>Arkadaşların bu notları bekliyor. Paylaşıp karşılarsan +${KUBBE.fill} kubbe.</p></div></div>
      <div data-r="reqs"></div>
      <a class="btn btn-sm req-card-all" href="#/istekler">Tüm istekler</a>
    </section>
    </div>
  </div>`;
  const input = $('#home-q', root), form = $('[data-r=form]', root);
  combobox(input, { source: globalResults, onPick: goItem });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    const pc = parseCode(q);
    if (pc && S.courses.has(pc.id)) { pushRecent(codeOf(pc.id), '#/ders/' + pc.id); location.hash = '#/ders/' + pc.id; return; }
    pushRecent(q, '#/ara?q=' + encodeURIComponent(q));
    location.hash = '#/ara?q=' + encodeURIComponent(q);
  });
  const R = k => $(`[data-r=${k}]`, root);
  let ns = ls.get('homeNotes', 'hot') === 'new' ? 'new' : 'hot';
  const paintNs = () => $$('[data-ns]', root).forEach(x => x.setAttribute('aria-pressed', String(x.dataset.ns === ns)));
  paintNs();
  $$('[data-ns]', root).forEach(b => b.addEventListener('click', () => { ns = b.dataset.ns; ls.set('homeNotes', ns); paintNs(); api.refresh(); }));
  $$('[data-lk]', root).forEach(b => b.addEventListener('click', () => {
    lb.kind = b.dataset.lk;
    $$('[data-lk]', root).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    renderLead();
  }));
  R('bolum').addEventListener('change', e => { lb.bolum = e.target.value; renderLead(); });
  R('more').addEventListener('click', () => {
    lb.open = !lb.open;
    R('main').classList.toggle('lead-open', lb.open);
    renderLead();
    const el = R('lead');
    if (el && el.scrollIntoView) { try { el.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' }); } catch (e) { /* yok */ } }
  });
  function renderLead() {
    lb.bolum = fillBolumSelect(R('bolum'), lb.bolum);
    const limit = lb.bolum ? 10 : lb.open ? 50 : 8;
    const total = boardList(lb.kind, lb.bolum).length;
    const more = R('more');
    more.hidden = !!lb.bolum || total <= 8;
    more.innerHTML = icon('chart') + (lb.open ? 'Daha az göster' : 'Tümünü gör');
    R('lsub').textContent = (lb.bolum ? bolumName(lb.bolum) + ', ilk 10. ' : '') + (lb.kind === 'term' ? termLabel(currentTk()) + ' boyunca toplanan kubbe' : 'Başından beri toplanan kubbe');
    const sig = boardSig(lb.kind, lb.bolum, limit, lb.open);
    if (sig === lb.sig) return;
    lb.sig = sig;
    const b = R('board');
    b.innerHTML = boardHtml(lb.kind, { limit, bolum: lb.bolum, detail: lb.open });
    applyWidths(b); countUp(b);
  }
  const api = {
    refresh() {
      const st = waitState();
      if (st !== 'ok' || !allLoaded()) {
        R('stats').textContent = st === 'nodb' ? '' : 'Kayıtlar yükleniyor…';
        R('notes').innerHTML = st === 'nodb' ? noDbHtml() : loadingHtml();
        R('cms').innerHTML = st === 'nodb' ? '' : loadingHtml();
        R('board').innerHTML = ''; R('hot').innerHTML = ''; lb.sig = '';
        return;
      }
      let nRatings = 0;
      for (const h of S.hocas.values()) nRatings += ratingsOf(h).length;
      R('stats').innerHTML = `Şu an <b>${S.courses.size}</b> ders, <b>${S.hocas.size}</b> hoca, <b>${notesWhere(n => !isHidden(n)).length}</b> not ve <b>${nRatings}</b> HocaÖlçer puanı var.`;
      const act = courseActivity();
      const top = [...act.entries()].sort((a, b) => b[1].total - a[1].total).map(x => x[0]);
      const tryList = (top.length ? top : [...S.courses.keys()]).slice(0, 4);
      R('try').hidden = !tryList.length;
      R('try').innerHTML = tryList.length ? 'Hızlı erişim: ' + tryList.map(id => `<a class="code" href="#/ders/${esc(id)}">${esc(codeOf(id))}</a>`).join('') : '';
      { const rc = R('recent'), h = recentHtml(); rc.hidden = !h; if (rc.dataset.h !== h) { rc.dataset.h = h; rc.innerHTML = h; } }
      { const list = openRequests().slice(0, 5), h = list.length ? `<ul class="rq-lines">${list.map(reqLineHtml).join('')}</ul>` : '<p class="req-empty">Şu an açık istek yok. Aradığın notu bulamazsan ders sayfasından iste; arkadaşların görsün.</p>', el2 = R('reqs');
        if (el2.dataset.h !== h) {   // sayı artınca küçük bir sıçrama
          const prev = el2._n || {}, now = {}; el2.dataset.h = h; el2.innerHTML = h;
          $$('.rq-line', el2).forEach(li => { const n = +li.dataset.n; now[li.dataset.id] = n; if (prev[li.dataset.id] != null && n > prev[li.dataset.id]) { const b = $('.rq-n', li); if (b) b.classList.add('bump'); } });
          el2._n = now;
        } }
      // Revaçta: oy ve tazelik (▼ alan aşağı iner, eksiye düşen burada görünmez); Yeni: son paylaşılanlar. Haftanın notu üstte, listede tekrar etmez.
      const shown = notesWhere(n => !isHidden(n)), wk = shown.length ? weekNote() : null;
      const notes = (ns === 'new' ? shown.sort((a, b) => b.at - a.at) : shown.filter(n => voteScore(n) >= 0).sort(byHot)).filter(n => !wk || n.id !== wk.n.id).slice(0, 6);
      R('notes').innerHTML = notes.length || wk ? `${wk ? weekNoteHtml() : ''}${notes.length ? `<ul class="ncards${introCls()}">${notes.map(n => noteCard(n)).join('')}</ul>` : ''}`
        : emptyHtml(ns === 'new' || !shown.length ? 'Henüz not paylaşılmadı' : 'Revaçta not yok', 'Notunu Google Drive’dan seç, ilk notu sen paylaş.', '<a class="btn btn-primary" href="#/paylas">Not paylaş</a>');
      lazyPhotos(R('notes'));
      const cms = commentsWhere(c => !isHidden(c)).sort((a, b) => b.at - a.at).slice(0, 3);
      R('cms').innerHTML = cms.length ? `<ul class="list">${cms.map(c => {
        const where = c.tt === 'course' ? { href: '#/ders/' + c.tid + '?tab=yorumlar', label: codeOf(c.tid) }
          : c.tt === 'hoca' ? { href: '#/hoca/' + c.tid, label: hocaName(c.tid) || 'Hoca' }
          : { href: '#/not/' + c.tid, label: ((S.notes.get(c.tid) || {}).title || 'Not') };
        const avg = c.r && CRIT.every(k => typeof c.r[k.k] === 'number') ? CRIT.reduce((s, k) => s + c.r[k.k], 0) / CRIT.length : null;
        return `<li><a class="row-link" href="${esc(where.href)}">${avatarHtml(c.by, { anon: !!c.anon })}<span class="row-main"><span class="row-title">${esc(displayName(c.by, c.anon, c.nick))}<span class="row-where"> ${esc(where.label)}</span></span><span class="row-sub clip">${esc(c.text)}</span></span><span class="row-end">${avg != null ? `<span class="minirate">${starsHtml(avg, 'sm')}${fmt1(avg)}</span>` : `<span>${esc(ago(c.at))}</span>`}</span></a></li>`;
      }).join('')}</ul>` : emptyHtml('Henüz yorum yok', 'Bir dersi ya da hocayı ilk yorumlayan sen ol.');
      applyWidths(R('cms'));
      renderLead();
      const hot = top.slice(0, 6);
      R('hot').innerHTML = hot.length ? `<ul class="list">${hot.map(id => {
        const a = act.get(id);
        return `<li><a class="row-link" href="#/ders/${esc(id)}"><span class="code">${esc(codeOf(id))}</span><span class="row-main"><span class="row-title">${esc(courseName(id) || 'Ders adı girilmemiş')}</span></span><span class="row-end">${a.notes} not, ${a.comments} yorum</span></a></li>`;
      }).join('')}</ul>` : emptyHtml('Henüz gündemde ders yok', 'Ders kodunu arayıp ilk notu paylaşan sen ol.');
    }
  };
  const stopAyhan = startAyhan(root.querySelector('[data-r=ayhan]'));
  api.cleanup = () => stopAyhan();
  return api;
};

/* ================= Arama sonuçları ================= */
ROUTES['ara'] = function viewSearch(root, r) {
  const q0 = r.q.get('q') || '';
  root.innerHTML = `<div class="wrap">
    <div class="page-intro"><h1>Arama</h1></div>
    <form class="search big cb-wrap" role="search" data-r="form">${icon('search')}<input id="s-q" type="search" enterkeyhint="search" value="${esc(q0)}" aria-label="Ders kodu ya da hoca adı ara" placeholder="CSE 211, MATH 131 ya da hoca adı"></form>
    <div class="panel" data-r="res"></div></div>`;
  const input = $('#s-q', root);
  $('[data-r=form]', root).addEventListener('submit', e => { e.preventDefault(); setHashQuiet('#/ara?q=' + encodeURIComponent(input.value.trim())); api.refresh(); });
  const api = {
    refresh() {
      const res = $('[data-r=res]', root), q = input.value.trim();
      const st = waitState();
      if (st === 'nodb') { res.innerHTML = noDbHtml(); return; }
      if (st === 'loading' || !S.loaded.courses || !S.loaded.hocas) { res.innerHTML = loadingHtml(); return; }
      if (!q) { res.innerHTML = emptyHtml('Ne arıyorsun?', 'Ders kodu (CSE 211) ya da hoca adı yaz.'); return; }
      const all = searchAll(q), cs = all.filter(x => x.kind === 'course'), hs = all.filter(x => x.kind === 'hoca');
      const pc = parseCode(q);
      let html = '';
      if (cs.length) html += `<h2 class="sub-h">Dersler</h2><ul class="list">${cs.slice(0, 30).map(x => `<li><a class="row-link" href="#/ders/${esc(x.id)}"><span class="code">${hl(x.label, q)}</span><span class="row-main hl"><span class="row-title">${hl(x.sub, q)}</span></span></a></li>`).join('')}</ul>`;
      if (hs.length) html += `<h2 class="sub-h mt2">Hocalar</h2><ul class="list">${hs.slice(0, 30).map(x => `<li><a class="row-link" href="#/hoca/${esc(x.id)}"><span class="avatar">${esc(initials(x.label))}</span><span class="row-main hl"><span class="row-title">${hl(x.label, q)}</span>${x.sub ? `<span class="row-sub">${esc(x.sub)}</span>` : ''}</span></a></li>`).join('')}</ul>`;
      if (!cs.length && !hs.length) html = emptyHtml('Sonuç bulunamadı', 'Yazımı kontrol et ya da hocanın yalnızca soyadıyla ara. Listede olmayan ders ve hocalar site yönetimi tarafından eklenir.');
      res.innerHTML = html;
    }
  };
  return api;
};

/* ================= Dersler ================= */
ROUTES['dersler'] = function viewCourses(root, r) {
  let bol = (r && r.q && r.q.get('b')) || '', touched = !!bol;
  LIST.lim = 80;
  root.innerHTML = `<div class="wrap">
    <div class="page-intro"><h1>Dersler</h1><p>Bölümünü seç, dönem dönem ders planını gör. Ders sayfasında notlar, yorumlar ve hocalar yer alır.</p>
      <div class="head-actions" data-owner hidden><button type="button" class="btn btn-primary" data-g="add-course">${icon('plus')}Ders ekle</button></div></div>
    <div class="toolbar"><select class="select bol-sel" data-r="bol" aria-label="Bölüm"></select>
      <label class="search sm cb-wrap grow">${icon('search')}<input class="input" data-r="f" type="search" placeholder="Ders kodu ya da adıyla ara" aria-label="Derslerde ara"></label></div>
    <div class="panel pt0" data-r="list"></div></div>`;
  const f = $('[data-r=f]', root), bSel = $('[data-r=bol]', root);
  f.addEventListener('input', () => { LIST.lim = 80; api.refresh(); });
  bSel.addEventListener('change', () => { LIST.lim = 80; bol = bSel.value; touched = true; setHashQuiet(bol ? '#/dersler?b=' + encodeURIComponent(bol) : '#/dersler'); api.refresh(); });
  let actCache = null;
  const courseRow = (id, extra = '') => {
    const c = S.courses.get(id) || {};
    const a = (actCache || (actCache = courseActivity())).get(id) || { notes: 0 };
    return `<li><a class="row-link" href="#/ders/${esc(id)}"><span class="code">${esc(c.code || codeOf(id))}</span><span class="row-main"><span class="row-title">${esc(c.name || 'Ders adı yükleniyor')}</span>${extra}</span><span class="row-end">${zchipHtml(id)}${loadText(c) ? `<span class="ects">${loadText(c)}</span>` : ''}${a.notes ? `<span>${a.notes} not</span>` : ''}</span></a></li>`;
  };
  const api = {
    refresh() {
      const el = $('[data-r=list]', root), st = waitState();
      actCache = null;
      if (st === 'nodb') { el.innerHTML = noDbHtml(); return; }
      if (st === 'loading' || !allLoaded()) { el.innerHTML = loadingHtml(); return; }
      const facs = new Map();
      for (const [id, b] of S.bolumler) { const k = b.fakulte || 'Diğer'; if (!facs.has(k)) facs.set(k, []); facs.get(k).push([id, b]); }
      const html = '<option value="">Tüm dersler</option>' + (myAcc() ? '<option value="__mine">Derslerim</option>' : '') + [...facs.entries()].sort((x, y) => x[0].localeCompare(y[0], 'tr')).map(([fk, list]) => `<optgroup label="${esc(fk)}">${list.sort((x, y) => (x[1].ad || '').localeCompare(y[1].ad || '', 'tr')).map(([id, b]) => `<option value="${esc(id)}">${esc(b.ad || id)}${planOf(id) ? '' : ' (plan yok)'}</option>`).join('')}</optgroup>`).join('');
      if (bSel.dataset.h !== html) { bSel.dataset.h = html; bSel.innerHTML = html; }
      if (!touched && !bol) { const mine = (userOf(S.me) || {}).bolum; if (mine && S.bolumler.has(mine)) bol = mine; }
      bSel.value = (S.bolumler.has(bol) || (bol === '__mine' && myAcc())) ? bol : ''; bol = bSel.value;
      const q = fold(f.value), qc = q.replace(/\s+/g, '');
      const match = id => { const c = S.courses.get(id) || {}; return !q || id.toLowerCase().includes(qc) || foldName(c.name).includes(q); };
      if (bol === '__mine') {
        const mine = myCourses().filter(id => S.courses.has(id) && match(id));
        el.innerHTML = '<div class="bol-head"><h2>Derslerim</h2><p class="muted">Ders sayfalarındaki “Derslerime ekle” düğmesiyle eklediğin dersler. Son bakışından sonra yeni not düşen derste rozet görürsün.</p></div>' + (mine.length ? `<ul class="list">${mine.map(id => { const f = freshNotes(id); return courseRow(id, f ? `<span class="row-sub"><span class="fresh-n">${f} yeni not</span></span>` : ''); }).join('')}</ul>` : emptyHtml('Henüz ders eklemedin', 'Bir ders sayfası açıp “Derslerime ekle”ye bas.'));
        return;
      }
      if (bol) {
        const b = S.bolumler.get(bol);
        const P = planOf(bol), plan = P ? P.plan : null;
        const cap = plan ? capOf(bol) : null, P2 = cap ? planOf(cap.b) : null, b2 = cap ? (S.bolumler.get(cap.b) || {}) : null;
        const head = `<div class="bol-head"><h2>${esc(b.ad)}</h2><p class="muted">${esc(b.fakulte || '')}${b.dil ? ', eğitim dili ' + esc(b.dil) : ''}${b.tur === 'onlisans' ? ', ön lisans' : ''}</p>${plan ? capBarHtml(bol, cap, b2) : ''}</div>`;
        if (!plan) { el.innerHTML = head + emptyHtml('Bu bölümün ders planı yok', 'Bu bölümün planı AKTS Bilgi Paketi’nde yayımlanmamış. Ders kodunu arayarak ders sayfalarına ulaşabilirsin.'); return; }
        const accd = myAcc(), dn = new Set(doneCourses()), opt = { accd, dn };
        const mainIds = new Set(Object.values(plan).flat()), hid = new Set(cap ? cap.gz : []);
        const semsOf = X => Object.keys(X.plan).map(Number).filter(Boolean);
        const sems = [...new Set([...semsOf(P), ...(P2 ? semsOf(P2) : [])])].sort((x, y) => x - y);
        const doneBtn = id => `<button type="button" class="done-btn" data-g="done" data-id="${esc(id)}" aria-pressed="${dn.has(id)}" aria-label="${esc(codeOf(id))} dersini tamamladım">${gl('check')}</button>`;
        const planRow = id => (accd ? courseRow(id).replace('<li>', `<li class="prow${dn.has(id) ? ' done' : ''}">${doneBtn(id)}`) : courseRow(id));
        const krSum = l => (l.every(v => v != null) ? l.reduce((s, v) => s + (+v || 0), 0) : null);   // biri bilinmiyorsa toplam yazılmaz
        const elShown = (X, xb, sn, els) => els.map((e, i) => i).filter(i => { if (!q) return true; const p = elPick(elKey(xb, sn, i, els[i])); return p && match(p); });
        // İkinci programın, ana programdaki bir seçmeliyle aynı listeden seçilen seçmelileri (ör. Türk Dili) bir kez sayılır
        const sharedEl = new Set();
        if (P2) {
          const cnt = new Map();
          for (const sn of Object.keys(P.el || {})) for (const e of P.el[sn] || []) if (e.length > 3 && e[3] >= 0) cnt.set(e[3], (cnt.get(e[3]) || 0) + 1);
          for (const sn of semsOf(P2)) ((P2.el && P2.el[sn]) || []).forEach((e, i) => { const c = e.length > 3 && e[3] >= 0 ? cnt.get(e[3]) || 0 : 0; if (c) { cnt.set(e[3], c - 1); sharedEl.add(elKey(cap.b, sn, i, e)); } });
        }
        const capBlock = sn => {
          const all2 = Array.isArray(P2.plan[sn]) ? P2.plan[sn] : [], els2 = (P2.el && P2.el[sn]) || [];
          const own = all2.filter(id => !mainIds.has(id)), keep = own.filter(id => !hid.has(id));
          const elIdx = els2.map((e, i) => i).filter(i => !sharedEl.has(elKey(cap.b, sn, i, els2[i]))), shared = all2.length - own.length + els2.length - elIdx.length;
          const vis = keep.filter(match), elKeep = elIdx.filter(i => !hid.has(elKey(cap.b, sn, i, els2[i])));
          const elVis = elShown(P2, cap.b, sn, els2).filter(i => elKeep.includes(i));
          const nHid = own.length - keep.length + elIdx.length - elKeep.length;
          if (q ? !vis.length && !elVis.length : !keep.length && !elKeep.length && !nHid && !shared) return '';
          const tot = krSum(keep.map(id => (S.courses.get(id) || {}).kr).concat(elKeep.map(i => els2[i][2])));
          const nAll = keep.length + elKeep.length, nDone = keep.filter(id => dn.has(id)).length + elKeep.filter(i => dn.has('el:' + elKey(cap.b, sn, i, els2[i]))).length;
          const x = (k, label) => `<button type="button" class="cap-x" data-g="cap-hide" data-id="${esc(bol)}" data-k="${esc(k)}" aria-label="${esc(label)}: programımdan çıkar" title="Programımdan çıkar">${icon('x')}</button>`;
          const rows = vis.map(id => planRow(id).replace(/^<li(?: class="prow([^"]*)")?>/, (m0, cls) => `<li class="prow cap-row${cls || ''}">`).replace(/<\/li>$/, x(id, codeOf(id)) + '</li>')).join('')
            + elVis.map(i => elRowHtml(cap.b, P2, sn, i, els2[i], Object.assign({ hide: x(elKey(cap.b, sn, i, els2[i]), elName(els2[i])) }, opt))).join('');
          const note = q ? '' : [shared ? `${shared} ders ana programında da var, burada tekrar gösterilmedi.` : '', nHid ? `${nHid} ders çıkarıldı. <button type="button" class="linkish" data-g="cap-unhide" data-id="${esc(bol)}" data-sem="${sn}">Geri getir</button>` : ''].filter(Boolean).join(' ');
          const lbl = P2.yillik !== P.yillik || !plan[sn] ? ' · ' + esc(semLabel(P2, sn)) : '';
          return `<div class="cap-blk"><h4 class="cap-h"><span class="cap-tag">${capTag(cap)}</span><span class="cap-name">${esc(b2.ad || cap.b)}${lbl}</span>${tot ? `<span class="cap-ects">${fmtKr(tot)} kredi</span>` : ''}${accd && nAll ? `<span class="cap-prog">${nDone}/${nAll}</span>` : ''}</h4>${rows ? `<ul class="list">${rows}</ul>` : ''}${note ? `<p class="cap-note">${note}</p>` : ''}</div>`;
        };
        let progTot = 0, progKnown = true;
        const secs = sems.map(sn => {
          const allIds = Array.isArray(plan[sn]) ? plan[sn] : [], ids = allIds.filter(match), els = (P.el && P.el[sn]) || [];
          const tot = krSum(allIds.map(id => (S.courses.get(id) || {}).kr).concat(els.map(e => e[2])));
          if (tot == null) progKnown = false; else progTot += tot;
          const rows = ids.map(planRow).join('') + elShown(P, bol, sn, els).map(i => elRowHtml(bol, P, sn, i, els[i], opt)).join('');
          const capHtml = P2 ? capBlock(sn) : '';
          if (!rows && !capHtml) return '';
          const nAll = allIds.length + els.length, nDone = allIds.filter(id => dn.has(id)).length + els.filter((e, i) => dn.has('el:' + elKey(bol, sn, i, e))).length;
          const prog = accd && nAll ? `<span class="sem-prog">${nDone}/${nAll}</span>` : '';
          return `<section class="grp"><h3 class="sem-h"><span class="sem-no">${sn}</span>${esc(semLabel(plan[sn] || !P2 ? P : P2, sn))}${tot ? `<span class="sem-ects">${fmtKr(tot)} kredi</span>` : ''}${prog}</h3>${rows ? `<ul class="list">${rows}</ul>` : ''}${capHtml}</section>`;
        }).join('');
        const hasPools = sems.some(sn => ((P.el && P.el[sn]) || []).some(e => poolOf(e))), hasEls = sems.some(sn => ((P.el && P.el[sn]) || []).length);
        let elSec = '';
        if (q && hasPools) {                                   // planda ararken seçmeli listelerindeki dersler de aranır
          const hit = new Map();
          for (const sn of sems) for (const e of (P.el && P.el[sn]) || []) for (const id of poolOf(e) || []) {
            if (!S.courses.has(id) || !match(id)) continue;
            let t = hit.get(id); if (!t) hit.set(id, t = new Map());
            const k = EL_NAMES[e[0]] || e[0] + ' seçmeli'; if (!t.has(k)) t.set(k, new Set()); if (e[4]) t.get(k).add(e[4]);
          }
          const hids = [...hit.keys()].sort(CODE_COLL.compare);
          if (hids.length) elSec = `<section class="grp"><h3 class="sem-h"><span class="sem-no">S</span>Seçmeli dersler<span class="sem-ects">${hids.length} ders</span></h3><ul class="list">${hids.map(id => courseRow(id, `<span class="row-sub">${esc([...hit.get(id)].map(([k, ns]) => k + (ns.size ? ' ' + [...ns].sort((x, y) => x - y).join(', ') : '')).join('; '))}</span>`)).join('')}</ul></section>`;
        }
        // Yeniden çizimde açık arama kutusu ve odak kaybolmasın
        const ae = document.activeElement;
        let fsel = EL_FOCUS, fpos = null;
        if (!fsel && ae && el.contains(ae)) {
          if (ae.matches('[data-r=el-q]')) { fsel = `[data-r="el-q"][data-id="${ae.dataset.id}"]`; fpos = [ae.selectionStart, ae.selectionEnd]; }
          else if (ae.dataset && ae.dataset.g && ae.dataset.id) fsel = `[data-g="${ae.dataset.g}"][data-id="${ae.dataset.id}"]` + (ae.dataset.c != null ? `[data-c="${ae.dataset.c}"]` : '');
        }
        const fscroll = EL_SCROLL; EL_FOCUS = ''; EL_SCROLL = false;
        const tail = hasEls ? (hasPools ? ' Seçmelilerin ders listeleri fakülte sitesinden alındı: mavi seçmeli satırına basınca o seçmeli için alınabilecek dersler açılır, birini seçince satırda o dersin adı görünür. Listesi çok uzun olan seçmelilerde (serbest, tamamlayıcı) aldığın dersi tüm dersler arasında arayıp seçebilirsin.' : ' Mavi seçmeli satırına basıp aldığın dersi tüm dersler arasında arayıp seçebilirsin.') : '';
        el.innerHTML = head + gradHtml(P, bol, P2 ? { P2, b2, cap, mainIds, hid: new Set([...hid, ...sharedEl]) } : null) + (secs + elSec || emptyHtml('Eşleşen ders yok', 'Aramayı temizle.')) + `<p class="fine">Zorunlu dersler${hasEls ? ' ve seçmeliler' : ''} Yeditepe AKTS Bilgi Paketi’ndeki ders planından alındı${progKnown && progTot ? `; planın toplamı ${fmtKr(progTot)} kredi` : ''}.${tail}${P2 ? ` ${esc(capTag(cap))} programının dersleri ${esc(b2.ad || cap.b)} planından; ana programında da olan dersler bir kez gösterilir.` : ''}</p>`; applyWidths(el);
        el.querySelectorAll('[data-r=el-q]').forEach(inp => { const v = EL_Q.get(inp.dataset.id); if (v) { inp.value = v; elFilter(inp); } });
        if (fsel) { const fx = el.querySelector(fsel); if (fx) { try { fx.focus({ preventScroll: true }); if (fpos && fx.setSelectionRange) fx.setSelectionRange(fpos[0], fpos[1]); if (fscroll && fx.scrollIntoView) fx.scrollIntoView({ block: 'nearest', behavior: 'auto' }); } catch (e) { /* yok */ } } }
        return;
      }
      const all = memoized('allIds', () => [...S.courses.keys()].sort(CODE_COLL.compare));
      if (!all.length) { el.innerHTML = emptyHtml('Ders listesi henüz yüklenmedi', 'Ders ve akademik kadro listesi yönetim tarafından eklenir.'); return; }
      const list = q ? all.filter(match) : all;
      if (!list.length) { el.innerHTML = emptyHtml('Eşleşen ders yok', 'Yazımı kontrol et. Listede olmayan bir ders varsa site yönetimine bildir.'); return; }
      const cut = list.slice(0, LIST.lim), rest = list.length - cut.length;
      const groups = new Map();
      for (const id of cut) { const p = (/^[A-Z]+/.exec(id) || ['?'])[0]; if (!groups.has(p)) groups.set(p, []); groups.get(p).push(id); }
      el.innerHTML = `<p class="list-info">${q ? `<b>${list.length}</b> ders eşleşti` : `Katalogda <b>${list.length}</b> ders var`}${rest > 0 ? `, ilk ${cut.length} tanesi gösteriliyor. Kod ya da ad yazarak daralt ya da yukarıdan bölümünü seç.` : '.'}</p>`
        + [...groups.entries()].map(([p, ids]) => `<section class="grp"><h2 class="sub-h">${esc(p)}</h2><ul class="list">${ids.map(id => courseRow(id, S.courses.get(id).dept ? `<span class="row-sub">${esc(S.courses.get(id).dept)}</span>` : '')).join('')}</ul></section>`).join('')
        + (rest > 0 ? `<div class="more-wrap"><button type="button" class="btn" data-g="more-courses">Daha fazla göster (${rest} ders daha)</button></div>` : '');
    }
  };
  return api;
};

/* ================= Ders sayfası ================= */
ROUTES['ders'] = function viewCourse(root, r) {
  const pc = parseCode(r.parts[1] || '');
  if (!pc) return ROUTES.__404(root);
  const cid = pc.id;
  const TABS = [{ k: 'notlar', name: 'Notlar' }, { k: 'yorumlar', name: 'Yorumlar' }, { k: 'hocalar', name: 'Hocalar' }];
  let tab = TABS.some(t => t.k === r.q.get('tab')) ? r.q.get('tab') : 'notlar';
  let mode = null, tabView = null;
  function renderMode() {
    tabView = null;
    if (mode === 'loading') { root.innerHTML = `<div class="wrap">${loadingHtml()}</div>`; return; }
    if (mode === 'nodb') { root.innerHTML = `<div class="wrap panel">${noDbHtml()}</div>`; return; }
    if (mode === 'missing') {
      root.innerHTML = `<div class="wrap panel"><a class="crumb" href="#/dersler">${icon('cl')}Dersler</a>
        <div class="course-head"><span class="code code-xl">${esc(pc.code)}</span></div>
        <div class="empty mt"><h3>Bu ders listede yok</h3><p>Ders listesi okulun kataloğundan yüklenir. Eksik bir ders varsa site yönetimine bildir.</p>
        <a class="btn" href="#/dersler">Ders listesine dön</a><span data-owner hidden><button type="button" class="btn btn-primary" data-g="add-course" data-code="${esc(pc.code)}">${icon('plus')}Dersi ekle</button></span></div></div>`;
      return;
    }
    root.innerHTML = `
      <section class="page-head"><div class="wrap">
        <a class="crumb" href="#/dersler">${icon('cl')}Dersler</a>
        <div class="course-top">
          <div class="course-info">
            <div class="course-head"><span class="code code-xl">${esc(codeOf(cid))}</span><div><h1 data-r="name"></h1><p class="muted" data-r="dept"></p></div></div>
            <div class="head-actions">
              <a class="btn btn-primary" href="#/paylas?ders=${esc(cid)}">${icon('up')}Not paylaş</a>
              <button type="button" class="btn btn-ghost myc-btn" data-g="myc" data-id="${esc(cid)}" data-r="myc" aria-pressed="false" hidden>${icon('bookmark')}<span>Derslerime ekle</span></button>
              <button type="button" class="btn btn-ghost" data-g="share" data-title="${esc(codeOf(cid))} ders notları" data-hash="#/ders/${esc(cid)}">${icon('share')}Paylaş</button>
              <button type="button" class="btn btn-ghost" data-g="edit-course" data-id="${esc(cid)}" data-r="edit" hidden>${icon('edit')}Düzenle</button>
            </div>
            <p class="head-facts" data-r="facts"></p>
          </div>
          <div class="course-dol" data-r="zor"></div>
        </div>
        ${tabsHtml(TABS, tab)}
      </div></section>
      <div class="wrap"><div class="panel" role="tabpanel" data-r="panel"></div></div>`;
    $$('.tab', root).forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
    switchTab(tab, true);
  }
  function switchTab(t, first) {
    tab = t;
    if (!first) setHashQuiet(`#/ders/${cid}${t === 'notlar' ? '' : '?tab=' + t}`);
    $$('.tab', root).forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
    const panel = $('[data-r=panel]', root);
    panel.innerHTML = '';
    tabView = t === 'notlar' ? courseNotesTab(panel, cid) : t === 'yorumlar' ? commentsBlock(panel, { tt: 'course', tid: cid, ctx: 'course' }) : courseHocasTab(panel, cid);
    if (!first && tabView && tabView.refresh) tabView.refresh();
  }
  function refreshHead() {
    const c = S.courses.get(cid);
    $('[data-r=name]', root).textContent = c.name || 'Ders adı girilmemiş';
    $('[data-r=dept]', root).textContent = [c.dept, c.kr != null ? fmtKr(c.kr) + ' kredi' : '', c.ects ? c.ects + ' AKTS' : ''].filter(Boolean).join(', ');
    $('[data-r=edit]', root).hidden = !canEditEntity(c);
    const notes = notesWhere(n => n.cid === cid && !isHidden(n)).length;
    const gs = gradesOf(c), ds = distsOf(c);
    const counts = emptyCounts();
    ds.forEach(d => GRADES.forEach(({ g }) => { counts[g] += d.c[g]; }));
    if (!ds.length) gs.forEach(g => { counts[g.g]++; });
    const st = distStats(counts);
    const cc = commentCount('course', cid), hc = hocasOfCourse(cid).size;
    const set = (k, v) => { const el = $(`[data-count=${k}]`, root); if (el) el.textContent = v ? String(v) : ''; };
    set('notlar', notes); set('yorumlar', cc); set('hocalar', hc);
    $('[data-r=facts]', root).innerHTML = `<span><b>${notes}</b> not</span><span><b>${cc}</b> yorum</span><span><b>${hc}</b> hoca</span>`;
    { const mb = $('[data-r=myc]', root); if (mb) { const on = myCourses().includes(cid); mb.hidden = !myAcc(); mb.setAttribute('aria-pressed', String(on)); mb.classList.toggle('on', on); $('span', mb).textContent = on ? 'Derslerimde' : 'Derslerime ekle'; } }
    if (myAcc() && myCourses().includes(cid)) ls.set('cseen:' + S.me + ':' + cid, Date.now());
    { const zc = $('[data-r=zor]', root); if (zc) { const h = zorCardHtml(cid); if (zc.dataset.h !== h) { zc.dataset.h = h; zc.innerHTML = h; } } }
  }
  return {
    refresh() {
      const st = waitState();
      const want = st !== 'ok' ? st : !S.loaded.courses ? 'loading' : S.courses.has(cid) ? 'ok' : 'missing';
      if (want !== mode) { mode = want; renderMode(); }
      if (mode === 'ok') { refreshHead(); if (tabView && tabView.refresh) tabView.refresh(); }
    }
  };
};
function courseNotesTab(panel, cid) {
  let type = 'all', term = 'all', sort = 'hot';
  panel.innerHTML = `
    <div data-r="reqs"></div>
    <div class="toolbar">
      <div class="chips" role="group" aria-label="Not türü">${[{ k: 'all', name: 'Tümü' }].concat(NOTE_TYPES).map(t => `<button type="button" class="chip" data-type="${t.k}" aria-pressed="${t.k === 'all'}">${esc(t.name)}</button>`).join('')}</div>
      <div class="toolbar-end">
        <select class="select sm" data-r="term" aria-label="Dönem"></select>
        <select class="select sm" data-r="sort" aria-label="Sıralama"><option value="hot">Öne çıkan</option><option value="new">En yeni</option><option value="top">En çok oy alan</option></select>
      </div>
    </div>
    <div data-r="list"></div>`;
  $$('[data-type]', panel).forEach(b => b.addEventListener('click', () => {
    type = b.dataset.type;
    $$('[data-type]', panel).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    api.refresh();
  }));
  const tSel = $('[data-r=term]', panel);
  tSel.addEventListener('change', () => { term = tSel.value; api.refresh(); });
  $('[data-r=sort]', panel).addEventListener('change', e => { sort = e.target.value; api.refresh(); });
  const api = {
    refresh() {
      const el = $('[data-r=list]', panel);
      { const rb = $('[data-r=reqs]', panel); if (rb) { const h = requestBoxHtml(cid); if (rb.dataset.h !== h) { rb.dataset.h = h; rb.innerHTML = h; } } }
      if (!S.loaded.notes) { el.innerHTML = loadingHtml(); return; }
      const all = notesWhere(n => n.cid === cid);
      const terms = [...new Set(all.map(n => +n.tk).filter(Boolean))].sort((a, b) => b - a);
      tSel.innerHTML = '<option value="all">Tüm dönemler</option>' + terms.map(tk => `<option value="${tk}">${esc(termLabel(tk))}</option>`).join('');
      tSel.value = terms.some(tk => String(tk) === term) ? term : 'all';
      term = tSel.value;
      const list = all.filter(n => (type === 'all' || noteType(n).k === type) && (term === 'all' || String(n.tk) === term));
      list.sort(sort === 'top' ? byScore : sort === 'new' ? (a, b) => b.at - a.at : byHot);
      if (!all.length) { el.innerHTML = emptyHtml('Bu derse henüz not paylaşılmadı', 'Notunu Google Drive’a yükleyip linkini paylaşabilirsin.', `<a class="btn btn-primary" href="#/paylas?ders=${esc(cid)}">${icon('up')}İlk notu paylaş</a>`); return; }
      if (!list.length) { el.innerHTML = emptyHtml('Bu seçimde not yok', 'Türü ya da dönemi değiştir.'); return; }
      el.innerHTML = `<ul class="list">${list.map(n => noteRow(n)).join('')}</ul>`;
      lazyPhotos(el);
    }
  };
  return api;
}
function courseHocasTab(panel, cid) {
  panel.innerHTML = `
    <div class="toolbar"><label class="search sm cb-wrap grow">${icon('search')}<input class="input" data-r="q" placeholder="Bu dersi veren hocayı bul ve değerlendir" aria-label="Hoca ara"></label></div>
    <div data-r="list"></div>`;
  const q = $('[data-r=q]', panel);
  combobox(q, {
    source: s => searchAll(s).filter(x => x.kind === 'hoca').slice(0, 8),
    onPick: it => { location.hash = `#/hoca/${it.id}?puanla=1&ders=${cid}`; }
  });
  return {
    refresh() {
      const el = $('[data-r=list]', panel);
      const m = hocasOfCourse(cid);
      if (!m.size) { el.innerHTML = emptyHtml('Bu derse bağlı hoca yok', 'Kadro listesinde bu dersi veren hoca görünmüyor. Not paylaşırken ya da hocayı puanlarken bu dersi seçersen hoca burada görünür.'); return; }
      const act = o => o.ratings + o.notes + o.grades + o.comments;
      const rows = [...m.entries()].sort((a, b) => act(b[1]) - act(a[1]) || b[1].son - a[1].son || hocaName(a[0]).localeCompare(hocaName(b[0]), 'tr'));
      el.innerHTML = `<p class="fine mb">Dersi verenler Yeditepe’nin akademik kadro sayfalarındaki ders listelerinden; puanlar ve notlar öğrencilerden.</p><ul class="list">${rows.map(([hid, o]) => {
        const h = S.hocas.get(hid), st = hocaStats(h);
        const bits = [o.son ? `son olarak ${yilAd(o.son)} döneminde verdi` : '', o.ratings ? `${o.ratings} puan` : '', o.notes ? `${o.notes} not` : '', o.comments ? `${o.comments} yorum` : ''].filter(Boolean).join(', ');
        return `<li><a class="row-link" href="#/hoca/${esc(hid)}"><span class="avatar">${esc(initials(h.name))}</span><span class="row-main"><span class="row-title">${esc(hocaFull(h))}</span><span class="row-sub">${esc(bits ? bits.charAt(0).toLocaleUpperCase('tr') + bits.slice(1) : '')}</span></span><span class="row-end">${st.cnt ? `<span class="minirate">${starsHtml(st.all, 'sm')}${fmt1(st.all)}</span>` : '<span>Puan yok</span>'}</span></a></li>`;
      }).join('')}</ul>`;
      applyWidths(el);
    }
  };
}

/* ================= HocaÖlçer ================= */
ROUTES['hocaolcer'] = function viewHocas(root) {
  root.innerHTML = `<div class="wrap">
    <div class="page-intro"><h1>HocaÖlçer</h1>
      <p>Hocalar dört kriterde, 5 yıldız üzerinden buçuklu puanlanır: anlatım, ödev yükü, not verme ve devamsızlık. Her kriterde 5 yıldız öğrenci açısından en iyi durumdur. Puanlar anonimdir.</p>
      ${CAT.hocas.size ? `<p class="fine">Hoca listesi Yeditepe’nin sitesindeki akademik kadro sayfalarından alındı: ${CAT.hocas.size} kişi, unvanı, fakültesi, bölümü ve verdiği dersler. Ders kodu yazınca o dersi verenler çıkar.</p>` : ''}
      <div class="head-actions" data-owner hidden><button type="button" class="btn btn-primary" data-g="add-hoca">${icon('plus')}Hoca ekle</button></div></div>
    <div class="toolbar"><label class="search sm cb-wrap grow">${icon('search')}<input class="input" data-r="f" type="search" placeholder="Hoca adı ya da ders kodu, örn. CSE 211" aria-label="Hocalarda ara"></label>
      <select class="select sm" data-r="dept" aria-label="Fakülte"></select>
      <select class="select sm" data-r="sort" aria-label="Sıralama"><option value="n">En çok puanlanan</option><option value="top">En yüksek puan</option><option value="az">A’dan Z’ye</option></select></div>
    <div class="panel pt0" data-r="list"></div></div>`;
  const f = $('[data-r=f]', root), dSel = $('[data-r=dept]', root), sSel = $('[data-r=sort]', root);
  let lim = 60;
  [f, dSel, sSel].forEach(x => x.addEventListener(x === f ? 'input' : 'change', () => { lim = 60; api.refresh(); }));
  $('[data-r=list]', root).addEventListener('click', e => { if (e.target.closest('[data-r=more]')) { lim += 120; api.refresh(); } });
  const api = {
    refresh() {
      const el = $('[data-r=list]', root), st = waitState();
      if (st === 'nodb') { el.innerHTML = noDbHtml(); return; }
      if (st === 'loading' || !allLoaded()) { el.innerHTML = loadingHtml(); return; }
      if (!S.hocas.size) { el.innerHTML = emptyHtml('Akademik kadro henüz yüklenmedi', 'Hoca listesi yönetim tarafından eklenir.'); return; }
      const facOf = h => (h.fac || h.dept || '').trim();
      const depts = [...new Set([...S.hocas.values()].map(facOf).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
      const cur = dSel.value;
      dSel.innerHTML = '<option value="">Tüm fakülteler</option>' + depts.map(d => `<option>${esc(d)}</option>`).join('');
      dSel.value = depts.includes(cur) ? cur : '';
      dSel.hidden = !depts.length;
      const q = fold(f.value), qc = parseCode(f.value), byCode = qc && S.courses.has(qc.id) ? hocasOfCourse(qc.id) : null;
      let all = [...S.hocas.entries()].map(([id, h]) => ({ id, h, st: hocaStats(h) }));
      let tot = 0, cnt = 0;
      all.forEach(x => { tot += x.st.all * x.st.cnt; cnt += x.st.cnt; });
      const mean = cnt ? tot / cnt : 3, C = 3;
      all.forEach(x => { x.bayes = (C * mean + x.st.all * x.st.cnt) / (C + x.st.cnt); });
      all = all.filter(x => (!dSel.value || facOf(x.h) === dSel.value) && (byCode ? byCode.has(x.id) : !q || q.split(' ').every(t => fold(x.h.name).includes(t))));
      const s = sSel.value;
      all.sort(s === 'az' ? (a, b) => a.h.name.localeCompare(b.h.name, 'tr') : s === 'top' ? (a, b) => b.bayes - a.bayes || b.st.cnt - a.st.cnt : (a, b) => b.st.cnt - a.st.cnt || a.h.name.localeCompare(b.h.name, 'tr'));
      if (!all.length) { el.innerHTML = emptyHtml('Eşleşen hoca yok', byCode ? `${qc.code} dersini veren hoca kadro listesinde görünmüyor.` : 'Yalnızca soyadıyla aramayı dene. Listede olmayan bir hoca varsa site yönetimine bildir.'); return; }
      const more = all.length - lim;
      el.innerHTML = (byCode ? `<p class="fine mb">${esc(qc.code)} dersini verenler: ${all.length} hoca</p>` : '') + `<ul class="list">${all.slice(0, lim).map(x => {
        const cs = [...coursesOfHoca(x.id).entries()].sort((a, b) => b[1].son - a[1].son).slice(0, 3).map(([cid]) => cid);
        return `<li><a class="row-link" href="#/hoca/${esc(x.id)}"><span class="avatar">${esc(initials(x.h.name))}</span><span class="row-main"><span class="row-title">${esc(hocaFull(x.h))}${x.h.demo ? '<span class="tag">örnek kayıt</span>' : ''}</span><span class="row-sub">${esc([x.h.dept, cs.map(codeOf).join(', ')].filter(Boolean).join(' / '))}</span></span><span class="row-end">${x.st.cnt ? `<span class="minirate">${starsHtml(x.st.all, 'sm')}${fmt1(x.st.all)}</span><span>${x.st.cnt} puan</span>` : '<span>Puan yok</span>'}</span></a></li>`;
      }).join('')}</ul>` + (more > 0 ? `<div class="more-wrap"><button type="button" class="btn" data-r="more">Daha fazla göster (${more} hoca daha)</button></div>` : '');
      applyWidths(el);
    }
  };
  return api;
};

ROUTES['hoca'] = function viewHoca(root, r) {
  const hid = r.parts[1] || '';
  if (!okId(hid)) return ROUTES.__404(root);
  const TABS = [{ k: 'yorumlar', name: 'Yorumlar' }, { k: 'dersler', name: 'Verdiği dersler' }, { k: 'notlar', name: 'Notlar' }];
  let tab = TABS.some(t => t.k === r.q.get('tab')) ? r.q.get('tab') : 'yorumlar';
  let mode = null, tabView = null, autoRate = r.q.get('puanla') === '1';
  const presetC = parseCode(r.q.get('ders') || '');
  function renderMode() {
    tabView = null;
    if (mode === 'loading') { root.innerHTML = `<div class="wrap">${loadingHtml()}</div>`; return; }
    if (mode === 'nodb') { root.innerHTML = `<div class="wrap panel">${noDbHtml()}</div>`; return; }
    if (mode === 'missing') { root.innerHTML = `<div class="wrap panel"><a class="crumb" href="#/hocaolcer">${icon('cl')}HocaÖlçer</a>${emptyHtml('Hoca bulunamadı', 'Bu bağlantıdaki hoca silinmiş ya da hiç eklenmemiş olabilir.', '<a class="btn" href="#/hocaolcer">Hocalara dön</a>')}</div>`; return; }
    root.innerHTML = `
      <section class="page-head"><div class="wrap">
        <a class="crumb" href="#/hocaolcer">${icon('cl')}HocaÖlçer</a>
        <div class="hoca-head">
          <div class="hoca-id"><span class="avatar lg" data-r="ini"></span><div><p class="hoca-title" data-r="title"></p><h1 data-r="name"></h1><p class="muted" data-r="dept"></p></div></div>
          <div class="head-actions nm">
            <button type="button" class="btn btn-primary" data-g="rate" data-hid="${esc(hid)}" data-r="rate">${icon('star')}Değerlendir</button>
            <button type="button" class="btn btn-ghost" data-g="share" data-title="HocaÖlçer değerlendirmeleri" data-hash="#/hoca/${esc(hid)}">${icon('share')}Paylaş</button>
            <button type="button" class="btn btn-ghost" data-g="edit-hoca" data-id="${esc(hid)}" data-r="edit" hidden>${icon('edit')}Düzenle</button>
          </div>
        </div>
        <div class="karne" data-r="karne"></div>
        ${tabsHtml(TABS, tab)}
      </div></section>
      <div class="wrap"><div class="panel" role="tabpanel" data-r="panel"></div></div>`;
    $$('.tab', root).forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
    switchTab(tab, true);
  }
  function switchTab(t, first) {
    tab = t;
    if (!first) setHashQuiet(`#/hoca/${hid}${t === 'yorumlar' ? '' : '?tab=' + t}`);
    $$('.tab', root).forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
    const panel = $('[data-r=panel]', root);
    panel.innerHTML = '';
    tabView = t === 'yorumlar' ? commentsBlock(panel, { tt: 'hoca', tid: hid, ctx: 'hoca' }) : t === 'dersler' ? hocaCoursesTab(panel, hid) : hocaNotesTab(panel, hid);
    if (!first && tabView && tabView.refresh) tabView.refresh();
  }
  function refreshHead() {
    const h = S.hocas.get(hid), st = hocaStats(h);
    $('[data-r=ini]', root).textContent = initials(h.name);
    $('[data-r=title]', root).textContent = h.title || '';
    $('[data-r=name]', root).textContent = h.name;
    $('[data-r=dept]', root).innerHTML = esc([h.fac && h.fac !== h.dept ? h.fac : '', h.dept].filter(Boolean).join(', ')) + (h.kid ? ` <a class="ext-link" href="https://yeditepe.edu.tr/tr/akademik-kadro/${+h.kid}" target="_blank" rel="noopener noreferrer">Yeditepe profili</a>` : '') + (h.demo ? '<span class="tag">örnek kayıt, gerçek kadro listesiyle değiştirilecek</span>' : '');
    $('[data-r=edit]', root).hidden = !canEditEntity(h);
    const mineRaw = h.ratings && h.ratings[pk('hocas', hid)], mine = mineRaw && typeof mineRaw === 'object' && typeof mineRaw.a === 'number' ? mineRaw : null;
    const rb = $('[data-r=rate]', root);
    rb.innerHTML = icon('star') + (mine ? 'Puanını güncelle' : 'Değerlendir');
    if (presetC) rb.dataset.cid = presetC.id;
    const k = $('[data-r=karne]', root);
    k.innerHTML = !st.cnt
      ? `<div class="karne-sum"><div class="karne-big" aria-hidden="true">–</div><p>Henüz puan yok</p></div><div class="karne-rows"><p class="muted">Bu hocayı ilk değerlendiren sen ol. Anlatım, ödev yükü, not verme ve devamsızlık ayrı ayrı puanlanır.</p></div>`
      : `<div class="karne-sum"><div class="karne-big">${fmt1(st.all)}</div><p>${starsHtml(st.all, 'lg')}</p><p>${st.cnt} öğrencinin puanıyla, 5 üzerinden genel ortalama</p></div>
        <div class="karne-rows">${CRIT.map(c => `<div class="karne-row"><span class="k-name">${esc(c.name)}</span>${starsHtml(st[c.k])}<b class="k-val">${fmt1(st[c.k])}</b><span class="k-scale">1 = ${esc(c.lo)}, 5 = ${esc(c.hi)}</span></div>`).join('')}</div>
        ${mine ? `<p class="karne-mine">Senin puanın: ${CRIT.map(c => `${esc(c.name)} ${fmt1(mine[c.k])}`).join(', ')}. <button type="button" class="linkbtn" data-g="unrate" data-id="${esc(hid)}">Puanımı kaldır</button></p>` : ''}`;
    applyWidths(k);
    const set = (key, v) => { const el = $(`[data-count=${key}]`, root); if (el) el.textContent = v ? String(v) : ''; };
    set('yorumlar', commentCount('hoca', hid));
    set('dersler', coursesOfHoca(hid).size);
    set('notlar', notesWhere(n => n.h === hid && !isHidden(n)).length);
  }
  return {
    refresh() {
      const st = waitState();
      const want = st !== 'ok' ? st : !S.loaded.hocas ? 'loading' : S.hocas.has(hid) ? 'ok' : 'missing';
      if (want !== mode) { mode = want; renderMode(); }
      if (mode === 'ok') {
        refreshHead();
        if (tabView && tabView.refresh) tabView.refresh();
        if (autoRate && allLoaded()) { autoRate = false; setHashQuiet('#/hoca/' + hid); openRateModal(hid, { cid: presetC ? presetC.id : '' }); }
      }
    }
  };
};
function hocaCoursesTab(panel, hid) {
  panel.innerHTML = '<div data-r="list"></div>';
  return {
    refresh() {
      const el = $('[data-r=list]', panel), m = coursesOfHoca(hid);
      if (!m.size) { el.innerHTML = emptyHtml('Bu hocaya bağlı ders yok', 'Hocayı puanlarken ya da not paylaşırken dersi seçtiğinde burada görünür.'); return; }
      const rows = [...m.entries()].sort((a, b) => b[1].son - a[1].son || (b[1].ratings + b[1].notes + b[1].grades) - (a[1].ratings + a[1].notes + a[1].grades) || CODE_COLL.compare(a[0], b[0]));
      el.innerHTML = `<ul class="list">${rows.map(([cid, o]) => {
        const avg = o.rs.length ? o.rs.reduce((s, r) => s + CRIT.reduce((t, c) => t + r[c.k], 0) / CRIT.length, 0) / o.rs.length : 0;
        const bits = [o.son ? `son: ${yilAd(o.son)}` : '', o.ratings ? `${o.ratings} puan` : '', o.notes ? `${o.notes} not` : '', o.comments ? `${o.comments} yorum` : ''].filter(Boolean).join(', ');
        return `<li><a class="row-link" href="#/ders/${esc(cid)}"><span class="code">${esc(codeOf(cid))}</span><span class="row-main"><span class="row-title">${esc(courseName(cid) || 'Ders adı girilmemiş')}</span><span class="row-sub">${esc(bits)}</span></span><span class="row-end">${o.rs.length ? `<span class="minirate">${starsHtml(avg, 'sm')}${fmt1(avg)}</span>` : ''}</span></a></li>`;
      }).join('')}</ul>`;
      applyWidths(el);
    }
  };
}
function hocaNotesTab(panel, hid) {
  panel.innerHTML = '<div data-r="list"></div>';
  return {
    refresh() {
      const el = $('[data-r=list]', panel);
      const list = notesWhere(n => n.h === hid).sort(byHot);
      el.innerHTML = list.length ? `<ul class="list">${list.map(n => noteRow(n, { showCourse: true })).join('')}</ul>` : emptyHtml('Bu hocanın dersleri için not yok', 'Not paylaşırken hocayı seçersen burada da görünür.', '<a class="btn btn-primary" href="#/paylas?hoca=' + esc(hid) + '">Not paylaş</a>');
      lazyPhotos(el);
    }
  };
}
/* ================= Not sayfası ================= */
ROUTES['not'] = function viewNote(root, r) {
  const nid = r.parts[1] || '';
  if (!okId(nid)) return ROUTES.__404(root);
  let mode = null, cm = null, shownKey = '';
  function renderMode() {
    cm = null; shownKey = '';
    if (mode === 'loading') { root.innerHTML = `<div class="wrap">${loadingHtml()}</div>`; return; }
    if (mode === 'nodb') { root.innerHTML = `<div class="wrap panel">${noDbHtml()}</div>`; return; }
    if (mode === 'missing') { root.innerHTML = `<div class="wrap panel">${emptyHtml('Not bulunamadı', 'Bu not silinmiş olabilir.', '<a class="btn" href="#/">Ana sayfaya dön</a>')}</div>`; return; }
    const n = S.notes.get(nid);
    root.innerHTML = `
      <section class="page-head"><div class="wrap">
        <a class="crumb" href="#/ders/${esc(n.cid)}">${icon('cl')}<span data-r="crumb"></span></a>
        <div class="note-line"><span class="kind kind-${noteType(n).k}">${esc(noteType(n).name)}</span>${n.tk ? `<span class="pill">${esc(termLabel(n.tk))}</span>` : ''}</div>
        <h1 class="mt-s">${esc(n.title)}</h1>
        <div class="meta" data-r="meta"></div>
        <div class="note-actions" data-r="acts"></div>
      </div></section>
      <div class="wrap panel">
        <div data-r="content"></div>
        <section class="more-notes" data-r="more"></section><section data-r="cm"></section>
      </div>`;
    cm = commentsBlock($('[data-r=cm]', root), { tt: 'note', tid: nid });
  }
  function renderContent(n) {
    const key = (isHidden(n) && !S.revealed.has(nid)) ? 'hidden' : 'shown';
    if (key === shownKey) return;
    shownKey = key;
    const el = $('[data-r=content]', root);
    if (key === 'hidden') { el.innerHTML = `<div class="empty mb2"><h3>Bu not bildirimler nedeniyle gizlendi</h3><p>Moderatör inceleyene kadar içerik kapalı tutuluyor.</p><button type="button" class="btn" data-g="reveal" data-id="${esc(nid)}">Yine de göster</button></div>`; return; }
    const drive = typeof n.drive === 'string' && /^https:\/\/(drive|docs)\.google\.com\//i.test(n.drive) ? n.drive : '';
    const photos = Array.isArray(n.photos) ? n.photos.filter(okId) : [];
    el.innerHTML = `
      ${n.desc ? `<p class="note-desc">${esc(n.desc)}</p>` : ''}
      ${drive ? drivePreviewHtml(drive) : ''}
      ${photos.length ? `<h2 class="sub-h mt">Not fotoğrafları, ${photos.length} sayfa</h2><div class="gallery">${photos.map((p, i) => `<button type="button" data-g="photos" data-id="${esc(nid)}" data-i="${i}" aria-label="Sayfa ${i + 1}, büyüt"><img data-photo="${esc(p)}" alt=""><span class="pg">${i + 1}</span></button>`).join('')}</div>` : ''}
      ${!drive && !photos.length ? '<p class="muted">Bu notta içerik bulunmuyor.</p>' : ''}`;
    lazyPhotos(el); wireDview(el);
  }
  return {
    refresh() {
      const st = waitState();
      const want = st !== 'ok' ? st : !S.loaded.notes ? 'loading' : S.notes.has(nid) ? 'ok' : 'missing';
      if (want !== mode) { mode = want; renderMode(); }
      if (mode !== 'ok') return;
      const n = Object.assign({ id: nid }, S.notes.get(nid));
      const h = n.h && S.hocas.get(n.h);
      $('[data-r=crumb]', root).textContent = (codeOf(n.cid) + ' ' + courseName(n.cid)).trim();
      $('[data-r=meta]', root).innerHTML = `${h ? `<a href="#/hoca/${esc(n.h)}">${esc(hocaFull(h))}</a>` : ''}<span class="by-line">Paylaşan: ${avatarHtml(n.by, { anon: !!n.anon, cls: 'sm' })}${esc(displayName(n.by, n.anon, n.nick))}${isMine(n) ? ' (sen)' : ''}</span><span>${esc(ago(n.at))}</span>`;
      const mv = myVote(n);
      $('[data-r=acts]', root).innerHTML = `<span class="vote-wrap">${voteHtml(n, { big: true })}<span class="vote-hint">${isMine(n) ? 'Notunun puanı' : mv > 0 ? 'İşine yaradı dedin' : mv < 0 ? 'İşe yaramadı dedin' : 'İşine yaradı mı?'}</span></span>
        ${isMine(n) ? '' : `<button type="button" class="btn btn-ghost" data-g="report-note" data-id="${esc(nid)}">${icon('flag')}${reportedByMe(n) ? 'Bildirildi' : 'Bildir'}</button>`}
        ${canManage(n) ? `<button type="button" class="btn btn-ghost" data-g="del-note" data-id="${esc(nid)}">${icon('trash')}Sil</button>` : ''}<button type="button" class="btn btn-ghost" data-g="share" data-title="${esc(n.title || 'Not')}" data-hash="#/not/${esc(nid)}">${icon('share')}Paylaş</button>`;
      fillMoreNotes(root, n, nid);
      renderContent(n);
      if (cm) cm.refresh();
    }
  };
};

/* ================= Not paylaş ================= */
ROUTES['paylas'] = function viewShare(root, r) {
  const pre = parseCode(r.q.get('ders') || '');
  const preH = r.q.get('hoca') || '';
  const terms = termList();
  let anon = false;
  root.innerHTML = `<div class="wrap">
    <div class="page-intro"><h1>Not paylaş</h1><p>${gdCfg() ? 'Notunu Google Drive’dan seç, gerisini YediWiki halleder.' : 'Notunu Google Drive’a yükle, linkini burada paylaş.'} Dosya YediWiki’ye yüklenmez, yalnızca Drive linki saklanır. Her not <b>${KUBBE.note} kubbe</b> kazandırır.</p></div>
    <div class="empty mb2" data-r="locked" hidden><h3>Önce Yeditepe hesabın gerekiyor</h3><p>Not paylaşmak, yorum yazmak ve puan vermek için okul e-postanla bir hesap aç.</p><button type="button" class="btn btn-primary" data-g="auth">${icon('star')}Hesabımla gir</button></div>
    <div class="share-grid" data-r="grid">
      <form class="form-card share-form" novalidate data-r="form">
        <div class="form-sec">
          <div class="quad" data-r="quad">
            <div class="field cb-wrap q-code"><label for="sh-code">Ders kodu</label><input id="sh-code" class="input" maxlength="12" placeholder="Örn. CSE 211" autocapitalize="characters" value="${esc(pre ? pre.code : '')}"><p class="help" data-r="code-help">Listeden seç, örneğin MATH 131.</p></div>
            <div class="field q-hoca"><label for="sh-hoca">Hoca <span class="opt">isteğe bağlı</span></label><select id="sh-hoca" class="select"><option value="">Hoca seçilmedi</option></select><p class="help">Not hocanın sayfasında da görünür.</p></div>
            <div class="field q-term"><label for="sh-term">Dönem</label><select id="sh-term" class="select">${terms.map((tk, i) => `<option value="${tk}"${i === 0 ? ' selected' : ''}>${esc(termLabel(tk))}</option>`).join('')}</select></div>
            <div class="field q-hq"><label for="sh-hoca-q">Hoca listede yoksa</label><div class="cb-wrap"><input id="sh-hoca-q" class="input" autocomplete="off" placeholder="Adıyla ara"></div></div>
          </div>
          <div class="field"><label for="sh-title">Başlık</label><input id="sh-title" class="input" maxlength="80" placeholder="Örn. Vize 1 konu özeti ve çözümlü örnekler"></div>
          ${gdCfg() ? '<span class="label sh-flabel">Dosya</span>' : ''}
          <div class="gpick" data-r="gpick"${gdCfg() ? '' : ' hidden'}>
            <button type="button" class="btn btn-primary gpick-btn" data-r="gbtn">${DRIVE_LOGO}<span>Drive’dan seç</span></button>
            <p class="help">Google hesabınla gir, notunu Drive’ından seç ya da “Yükle” sekmesinden telefonundan ekle. Paylaşım ayarını YediWiki yapar: dosyayı bağlantıya sahip olan herkes görüntüleyebilir.</p>
            <p class="gpick-msg" data-r="gmsg" role="status" aria-live="polite"></p>
          </div>
          <div class="field"><label for="sh-drive">${gdCfg() ? 'Ya da Drive linkini yapıştır' : 'Google Drive linki'}</label>
            <div class="drive-box" data-r="dbox"><div class="drive-in">${icon('external')}<input id="sh-drive" class="input" type="url" inputmode="url" autocomplete="off" placeholder="Linki buraya yapıştır"><button type="button" class="btn btn-sm" data-r="paste">${icon('copy')}Yapıştır</button></div><div class="drive-prev" data-r="dprev" hidden></div></div><div data-r="dmini"></div>
            <p class="help">Drive’da linki kopyaladıktan sonra bu sayfada <b>Ctrl+V</b> yapman yeter, kutu kendiliğinden dolar.</p>
            <details class="drive-help"><summary>Linki nasıl alırım?</summary><ol class="dsteps"><li><span>1</span><div>Drive’da dosyaya ya da klasöre sağ tıkla, <b>Paylaş</b>’ı seç.</div></li><li><span>2</span><div>Genel erişimi <b>Bağlantıya sahip olan herkes</b> yap.</div></li><li><span>3</span><div><b>Bağlantıyı kopyala</b>, buraya dön ve yapıştır.</div></li></ol><a class="btn btn-sm" href="https://drive.google.com/drive/my-drive" target="_blank" rel="noopener noreferrer">${icon('external')}Drive’ı aç</a></details></div>
          <div class="field mb0"><label for="sh-desc">Açıklama <span class="opt">isteğe bağlı</span></label><textarea id="sh-desc" class="textarea" rows="3" maxlength="500" placeholder="Hangi haftaları kapsıyor, neye dikkat etmeli?"></textarea></div>
        </div>
        <div class="form-sec">
          <fieldset class="field"><legend class="label">Tür</legend><div class="typepick">${NOTE_TYPES.map((t, i) => `<label><input type="radio" name="type" value="${t.k}"${i === 0 ? ' checked' : ''}><span>${esc(t.name)}</span></label>`).join('')}</div></fieldset>
          <div class="field"><span class="label">Paylaşan adı</span><div class="chips"><button type="button" class="chip" data-anon="0" aria-pressed="true" data-r="asme"></button><button type="button" class="chip" data-anon="1" aria-pressed="false">${gl('spy')}Anonim</button></div><p class="help" data-r="who"></p></div>
          <label class="check"><input type="checkbox" data-r="rules"><span>Bu içerik kişisel bilgi, telifli kitap ya da devam eden bir sınavın sorularını içermiyor. <a href="#/hakkinda">Kurallar</a></span></label>
          <p class="err mt" role="alert" data-r="err"></p>
          <div class="modal-foot"><button class="btn btn-primary" type="submit" data-r="submit">${icon('up')}Notu paylaş</button></div>
        </div>
      </form>
      <aside class="aside">
        ${gdCfg() ? `<h3>Dosyanı nasıl seçersin?</h3>
        <ol><li>“Drive’dan seç”e bas, Google hesabını seç.</li><li>Notunu listeden seç; Drive’ında yoksa “Yükle” sekmesinden telefonundan ya da bilgisayarından ekle.</li><li>YediWiki dosyayı “Bağlantıya sahip olan herkes görüntüleyebilir” yapar. Başlığı boş bıraktıysan dosyanın adı yazılır.</li></ol>
        <p class="fine">YediWiki yalnızca senin seçtiğin dosyaya erişir; Drive’ının geri kalanını göremez. <a href="/gizlilik">Gizlilik</a></p>` : `<h3>Drive linki nasıl alınır?</h3>
        <ol><li>Drive’da dosyaya ya da klasöre sağ tıkla, Paylaş’ı seç.</li><li>Genel erişimi “Bağlantıya sahip olan herkes” yap, rolü Görüntüleyen olarak bırak.</li><li>Bağlantıyı kopyala ve buraya yapıştır.</li></ol>`}
        <h3>El yazısı notlar için</h3>
        <ol><li>Sayfaları telefonla tarayıp tek PDF yap: Android’de Drive uygulamasındaki Tara, iPhone’da Notlar uygulamasındaki Belgeleri Tara işini görür.</li><li>${gdCfg() ? 'PDF’i “Drive’dan seç” penceresindeki “Yükle” sekmesiyle ekle.' : 'PDF’i Drive’a yükle, paylaşımı “Bağlantıya sahip olan herkes” yap.'}</li><li>Kişisel bilgilerin görünmediğinden emin ol.</li></ol>
      </aside>
    </div></div>`;
  const R = k => $(`[data-r=${k}]`, root);
  const codeIn = $('#sh-code', root), hSel = $('#sh-hoca', root), hq = $('#sh-hoca-q', root);
  combobox(hq, { source: q => searchAll(q).filter(x => x.kind === 'hoca').slice(0, 8), onPick: it => { if (!S.hocas.has(it.id)) return; fillHocas(it.id); hq.value = ''; } });
  function fillHocas(want) {
    const pc = parseCode(codeIn.value), cur = want || hSel.value;
    hSel.innerHTML = '<option value="">Hoca seçilmedi</option>' + hocaOptions(pc && S.courses.has(pc.id) ? pc.id : '', cur);
    hSel.value = S.hocas.has(cur) ? cur : '';
  }
  function checkCode() {
    const v = codeIn.value.trim(), pc = parseCode(v), help = R('code-help');
    help.classList.remove('ok');
    if (!v) { help.textContent = 'Listeden seç, örneğin MATH 131.'; return; }
    if (!pc) { help.textContent = 'Biçim CSE 211 gibi olmalı.'; return; }
    if (S.courses.has(pc.id)) { help.textContent = S.courses.get(pc.id).name || pc.code; help.classList.add('ok'); }
    else help.textContent = 'Bu ders listede yok. Eksikse site yönetimine bildir.';
    fillHocas();
  }
  function paintWho() {
    const u = myAcc();
    const me = R('asme');
    if (me) me.textContent = '@' + ((u && u.username) || 'hesabım');
    $$('[data-anon]', root).forEach(b => b.setAttribute('aria-pressed', String((b.dataset.anon === '1') === anon)));
    R('who').textContent = anon ? (S.supa ? 'Not “Anonim” olarak görünecek. Kubbesi bakiyene yazılır, kimseye görünmez ve sıralamaya sayılmaz.' : 'Not “Anonim” olarak görünecek, kubbe yine hesabına yazılır.') : 'Notun kullanıcı adınla görünecek.';
  }
  $$('[data-anon]', root).forEach(b => b.addEventListener('click', () => { anon = b.dataset.anon === '1'; paintWho(); }));
  courseCombo(codeIn);
  codeIn.addEventListener('input', checkCode);
  codeIn.addEventListener('change', checkCode);
  wireDriveBox(root);
  if (gdCfg()) { gdLoad().catch(() => {}); R('gbtn').addEventListener('click', () => pickFromDrive(root)); }   // Google betikleri önceden yüklenir: tıklayınca pencere hemen açılsın
  S.shareReq = (r && r.q && r.q.get('istek')) || ''; renderReqBanner(root); setTimeout(() => renderReqBanner(root), 700);
  const form = R('form'), err = R('err');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    err.textContent = '';
    const pc = parseCode(codeIn.value);
    if (!pc || !S.courses.has(pc.id)) { err.textContent = 'Ders kodunu listeden seç. Listede olmayan ders eklenemiyor.'; codeIn.focus(); return; }
    const hid = S.hocas.has(hSel.value) ? hSel.value : '';
    const title = $('#sh-title', root).value.trim();
    if (title.length < 3) { err.textContent = 'Nota kısa bir başlık ver.'; $('#sh-title', root).focus(); return; }
    const drive = $('#sh-drive', root).value.trim();
    if (!drive) { err.textContent = 'Notun Google Drive linkini ekle.'; $('#sh-drive', root).focus(); return; }
    if (!/^https:\/\/(drive|docs)\.google\.com\/\S+$/i.test(drive)) { err.textContent = 'Link drive.google.com ya da docs.google.com ile başlamalı.'; $('#sh-drive', root).focus(); return; }
    if (!R('rules').checked) { err.textContent = 'Paylaşmadan önce kural onayını işaretle.'; return; }
    if (!needAcc()) return;
    const type = ($('input[name=type]:checked', root) || { value: 'not' }).value;
    const tk = +$('#sh-term', root).value || 0;
    const btn = R('submit'); btn.disabled = true; btn.textContent = 'Not kaydediliyor…';
    const noteRef = S.db.collection('notes').doc();
    try {
      await retrying(() => noteRef.set({ cid: pc.id, h: hid, tk, type, title: title.slice(0, 80), desc: $('#sh-desc', root).value.trim().slice(0, 500), drive: drive.slice(0, 600), photos: [], anon, by: S.me, at: Date.now(), likes: {}, downs: {}, reports: {} }));
      toast(`Not paylaşıldı, +${KUBBE.note} kubbe`);
      if (S.shareReq) await fulfillRequest(S.shareReq, noteRef.id, pc.id);
      location.hash = '#/not/' + noteRef.id;
    } catch (ex) {
      console.error(ex);
      noteWriteFail(ex);
      err.textContent = dbErrMsg(ex);
      btn.disabled = false; btn.innerHTML = icon('up') + 'Notu paylaş';
    }
  });
  let seeded = false;
  return {
    refresh() {
      const acc = hasAcc();
      R('locked').hidden = acc || waitState() !== 'ok';
      R('grid').hidden = !acc && waitState() === 'ok';
      if (!seeded && allLoaded()) {
        seeded = true;
        fillHocas(preH && S.hocas.has(preH) ? preH : '');
      }
      if (document.activeElement !== codeIn) checkCode();
      paintWho();
    }
  };
};

/* ================= Katkılarım ================= */
ROUTES['katkilarim'] = function viewMine(root) {
  root.innerHTML = `<div class="wrap">
    <div class="page-intro km-intro"><h1>Katkılarım</h1><p>Paylaştığın notlar, HocaÖlçer puanların ve yorumların. Buradan silebilir ya da güncelleyebilirsin. Bu sayfayı yalnızca sen görürsün.</p>
      <div class="head-actions"><a class="btn btn-solid btn-press" href="#/profil">${icon('edit')}Profil ayarları</a></div></div>
    <div class="km-body" data-r="body"></div></div>`;
  return {
    refresh() {
      const el = $('[data-r=body]', root), st = waitState();
      if (st === 'nodb') { el.innerHTML = noDbHtml(); return; }
      if (st === 'loading' || !allLoaded()) { el.innerHTML = loadingHtml(); return; }
      const notes = notesWhere(n => isMine(n)).sort((a, b) => b.at - a.at);
      const cms = commentsWhere(c => isMine(c)).sort((a, b) => b.at - a.at);
      const rates = [];
      for (const [hid, h] of S.hocas) { const r = h.ratings && h.ratings[pk('hocas', hid)]; if (r && typeof r === 'object' && typeof r.a === 'number') rates.push({ hid, h, r }); }
      const sec = (t, n, inner) => `<section class="km-sec"><div class="km-head"><h2>${t}</h2><span class="km-count">${n}</span></div>${inner}</section>`;
      const empty = (txt, href, cta) => `<div class="km-empty"><p>${txt}</p><a class="btn btn-sm btn-primary" href="${href}">${cta}</a></div>`;
      el.innerHTML =
        sec('Notlarım', notes.length, notes.length ? `<ul class="list">${notes.map(n => noteRow(n, { showCourse: true }).replace('</li>', `<div class="cm-actions pad"><button type="button" class="iconbtn" data-g="del-note" data-id="${esc(n.id)}">${icon('trash')}Sil</button></div></li>`)).join('')}</ul>` : empty(`Henüz not paylaşmadın. Her not ${KUBBE.note} kubbe kazandırır.`, '#/paylas', `${icon('up')}Not paylaş`)) +
        sec('HocaÖlçer puanlarım', rates.length, rates.length ? `<ul class="list">${rates.map(x => { const avg = CRIT.reduce((s, c) => s + x.r[c.k], 0) / CRIT.length; return `<li><div class="row-link"><span class="avatar">${esc(initials(x.h.name))}</span><span class="row-main"><a class="row-title" href="#/hoca/${esc(x.hid)}">${esc(hocaFull(x.h))}</a><span class="row-sub">${CRIT.map(c => `${esc(c.name)} ${fmt1(x.r[c.k])}`).join(', ')}</span></span><span class="row-end"><span class="minirate">${starsHtml(avg, 'sm')}${fmt1(avg)}</span><button type="button" class="iconbtn" data-g="rate" data-hid="${esc(x.hid)}">${icon('edit')}Güncelle</button><button type="button" class="iconbtn" data-g="unrate" data-id="${esc(x.hid)}">${icon('trash')}Kaldır</button></span></div></li>`; }).join('')}</ul>` : empty(`Henüz bir hocayı puanlamadın. Her HocaÖlçer puanı ${KUBBE.rating} kubbe kazandırır.`, '#/hocaolcer', `${icon('star')}HocaÖlçer’e git`)) +
        sec('Yorumlarım', cms.length, cms.length ? `<ul class="list">${cms.map(c => { const where = c.tt === 'course' ? `#/ders/${c.tid}?tab=yorumlar` : c.tt === 'hoca' ? `#/hoca/${c.tid}` : `#/not/${c.tid}`; const label = c.tt === 'course' ? codeOf(c.tid) : c.tt === 'hoca' ? hocaName(c.tid) : ((S.notes.get(c.tid) || {}).title || 'Not'); return `<li><div class="row-link"><span class="row-main"><a class="row-title" href="${esc(where)}">${esc(label || 'Silinmiş içerik')}</a><span class="row-sub clip">${esc(c.text)}</span></span><span class="row-end"><span>${esc(ago(c.at))}</span><button type="button" class="iconbtn" data-g="del-comment" data-id="${esc(c.id)}">${icon('trash')}Sil</button></span></div></li>`; }).join('')}</ul>` : empty(`Henüz yorum yazmadın. Her yorum ${KUBBE.comment} kubbe kazandırır.`, '#/dersler', `${icon('book')}Derslere göz at`));
      lazyPhotos(el); applyWidths(el);
    }
  };
};

/* ================= Moderasyon ================= */
ROUTES['moderasyon'] = function viewMod(root) {
  root.innerHTML = `<div class="wrap"><div class="page-intro"><h1>Moderasyon</h1><p>Bildirilen içerikler. Üç bildirim alan içerik otomatik gizlenir; uygun bulursan bildirimleri temizle, değilse sil.</p></div><div data-r="body"></div></div>`;
  return {
    refresh() {
      const el = $('[data-r=body]', root), st = waitState();
      if (st === 'nodb') { el.innerHTML = noDbHtml(); return; }
      if (st === 'loading' || !allLoaded()) { el.innerHTML = loadingHtml(); return; }
      if (!S.owner) { el.innerHTML = emptyHtml('Bu sayfa yalnızca site sahibine açık', 'Uygunsuz bir içerik gördüysen içeriğin yanındaki Bildir düğmesini kullan.'); return; }
      const items = notesWhere(n => reportCount(n) > 0).map(n => ({ col: 'notes', id: n.id, n: reportCount(n), title: n.title, link: '#/not/' + n.id, at: n.at, where: codeOf(n.cid) }))
        .concat(commentsWhere(c => reportCount(c) > 0).map(c => ({ col: 'comments', id: c.id, n: reportCount(c), title: c.text, link: c.tt === 'course' ? '#/ders/' + c.tid + '?tab=yorumlar' : c.tt === 'hoca' ? '#/hoca/' + c.tid : '#/not/' + c.tid, at: c.at, where: c.tt === 'course' ? codeOf(c.tid) : c.tt === 'hoca' ? hocaName(c.tid) : 'Not yorumu' })))
        .sort((a, b) => b.n - a.n || b.at - a.at);
      let photoCount = 0;
      for (const n of S.notes.values()) photoCount += Array.isArray(n.photos) ? n.photos.length : 0;
      const used = S.dbCourses.size + S.dbHocas.size + S.notes.size + S.comments.size + S.users.size + S.dbBolumler.size + S.requests.size + photoCount;
      el.innerHTML = S.supa ? `<p class="help mb">Veritabanında ${used} kayıt (${S.notes.size} not, ${S.comments.size} yorum, ${S.users.size} hesap, ${S.dbHocas.size} hoca kaydı, ${S.requests.size} istek, ${S.zor.size} DersÖlçer belgesi).</p>` + (items.length ? `<ul class="list">${items.map(x => `<li><div class="row-link"><span class="row-main"><a class="row-title clip" href="${esc(x.link)}">${esc(x.title)}</a><span class="row-sub">${x.col === 'notes' ? 'Not' : 'Yorum'}, ${esc(x.where || '')}, ${x.n} bildirim${x.n >= REPORT_LIMIT ? ', gizlendi' : ''}</span></span><span class="row-end"><button type="button" class="iconbtn" data-g="mod-ok" data-col="${x.col}" data-id="${esc(x.id)}">Uygun</button><button type="button" class="iconbtn" data-g="mod-del" data-col="${x.col}" data-id="${esc(x.id)}">${icon('trash')}Sil</button></span></div></li>`).join('')}</ul>` : emptyHtml('Bildirilen içerik yok', 'Her şey yolunda görünüyor.')) : `<p class="help mb">Veritabanı kullanımı yaklaşık ${used} / 5000 kayıt (${S.notes.size} not, ${photoCount} fotoğraf, ${S.comments.size} yorum, ${S.users.size} hesap, ${S.dbCourses.size} ders kaydı, ${S.dbHocas.size} hoca kaydı, ${S.dbBolumler.size} bölüm, ${S.requests.size} istek). Ders kataloğu (${CAT.courses.size} ders, ${CAT.plans.size} bölüm planı) ve akademik kadro (${CAT.hocas.size} hoca) sayfanın içinde durur, bu kotayı kullanmaz.</p>` +
        (items.length ? `<ul class="list">${items.map(x => `<li><div class="row-link"><span class="row-main"><a class="row-title clip" href="${esc(x.link)}">${esc(x.title)}</a><span class="row-sub">${x.col === 'notes' ? 'Not' : 'Yorum'}, ${esc(x.where || '')}, ${x.n} bildirim${x.n >= REPORT_LIMIT ? ', gizlendi' : ''}</span></span><span class="row-end"><button type="button" class="iconbtn" data-g="mod-ok" data-col="${x.col}" data-id="${esc(x.id)}">Uygun</button><button type="button" class="iconbtn" data-g="mod-del" data-col="${x.col}" data-id="${esc(x.id)}">${icon('trash')}Sil</button></span></div></li>`).join('')}</ul>` : emptyHtml('Bildirilen içerik yok', 'Her şey yolunda görünüyor.'));
    }
  };
};

/* ================= Hakkında ================= */
ROUTES['hakkinda'] = function viewAbout(root) {
  root.innerHTML = `<div class="wrap"><article class="prose page-intro">
    <h1>YediWiki nedir?</h1>
    <p>YediWiki, Yeditepe öğrencilerinin ders notlarını paylaştığı, bölüm ders planlarına baktığı ve hocaları HocaÖlçer’de değerlendirdiği bağımsız bir topluluk sitesidir. Yeditepe Üniversitesi ile resmî bir bağı yoktur.</p>
    <h2>Nasıl kullanılır?</h2>
    <p><b>Ders kodunu ara.</b> Ders sayfasında paylaşılan notlar, yorumlar ve dersi veren hocalar yer alır. Dersler sayfasında bölümünü seçip dönem dönem ders planını görebilirsin.</p>
    <p><b>DersÖlçer’e bak.</b> Ders sayfasındaki DersÖlçer, öğrencilerin oylarıyla dersin zorluğunu ve iş yükünü gösterir. Puan 1 ile 5 arasındadır: 1 en zor ve en ağır, 5 en kolay ve en hafif demektir.</p>
    <p><b>Hoca adını ara.</b> HocaÖlçer’de hocalar dört kriterde, 5 yıldız üzerinden buçuklu puanlanır. 5 yıldız her kriterde öğrenci açısından en iyi durumdur: ödev yükünde “çok hafif”, not vermede “çok cömert”, devamsızlıkta “esnek” anlamına gelir.</p>
    <p><b>Not paylaş.</b> Notlar Google Drive’dan paylaşılır; dosyalar siteye yüklenmez, YediWiki yalnızca linki saklar. ${S.supa ? '“Drive’dan seç” ile dosyanı site içinden seçersin, paylaşım ayarını YediWiki yapar. ' : ''}El yazısı notları tarayıp PDF olarak Drive’a koyabilirsin.</p>
    <p><b>Oy ver.</b> İşine yarayan nota yeşil ${gl('up', 'gl-in')}, yaramayana kırmızı ${gl('down', 'gl-in')} ver. ${gl('up', 'gl-in')} alan not öne çıkar ve paylaşana kubbe kazandırır; ${gl('down', 'gl-in')} alan not sıralamada aşağı iner.</p>
    <p><button type="button" class="btn btn-sm" data-g="welcome">${gl('paw')}Ayhan Abi’yle siteyi gez</button></p>
    <h2>Hesap ve anonimlik</h2>
    <p>YediWiki’ye yalnızca okul e-postasıyla katılınır: adres <b>@std.yeditepe.edu.tr</b> ile bitmeli ve doğrulanmalıdır. Not paylaşmak, yorum yazmak ve hoca puanlamak için hesap gerekir; gezinmek için gerekmez.</p>
    <p>Her yorum ve notta “Anonim” seçeneği var. Anonim paylaşımda kullanıcı adın görünmez, kazandığın kubbe yine hesabına yazılır. HocaÖlçer yorumlarında anonim seçeneği varsayılan olarak açıktır.</p>
    ${S.supa ? '<p>HocaÖlçer puanların, oyların, beğenilerin ve anonim paylaşımların hesabına bağlanamaz: her kayıtta yalnızca o kayda özel bir takma ad tutulur, sitenin kendisi bile bunları herkese açık profilinle eşleştiremez. Bu yüzden puanların ve anonim paylaşımların kubbesi bakiyene eklenir ama sıralamaya sayılmaz.</p>' : ''}
    <h2>Kubbe</h2>
    <p>Kubbe, paylaşımı teşvik eden puandır. Hesap açma ${KUBBE.signup}, not ${KUBBE.note}, yorum ${KUBBE.comment}, not isteği karşılamak ${KUBBE.fill}, HocaÖlçer puanı ${KUBBE.rating}, notuna gelen her ${gl('up', 'gl-in')} ${KUBBE.up}, yorumuna gelen her beğeni ${KUBBE.like} kubbe kazandırır; ${gl('down', 'gl-in')} kubbe düşürmez, notu sıralamada aşağı iter. Sıralamalar ana sayfada ve <a href="#/kubbe">Kubbe</a> sayfasında; kubbeni markette kampüs ödüllerine çevirirsin.</p>
    <h2>Ders ve hoca listesi</h2>
    <p>Dersler ve akademik kadro okulun kataloğundan yüklenir; kullanıcılar yeni ders ya da hoca ekleyemez. Eksik bir kayıt görürsen site yönetimine bildir.</p>
    <h2>Topluluk kuralları</h2>
    <ol>
      <li>Hakaret, küfür ve kişisel saldırı yok. Eleştiri derse ve anlatıma yönelik olsun.</li>
      <li>Telefon, e-posta, öğrenci numarası gibi kişisel bilgiler paylaşılmaz.</li>
      <li>Telifli kitapların PDF’leri ve devam eden sınavların soruları paylaşılmaz.</li>
      <li>Üç bildirim alan içerik otomatik gizlenir ve moderatör tarafından incelenir.</li>
    </ol>
    <h2>Devam kuralı</h2>
    <p>Yönetmeliğin 24. maddesine göre haklı bir nedene dayanan devamsızlık derslerin %20’sini geçemez; devam zorunluluğunu yerine getirmeyen öğrenci dersten başarısız sayılır.</p>
    <h2>Google Drive linki nasıl paylaşılır?</h2>
    <ol><li>Drive’da dosyaya ya da klasöre sağ tıkla, Paylaş’ı seç.</li><li>Genel erişimi “Bağlantıya sahip olan herkes” yap, rolü Görüntüleyen olarak bırak.</li><li>Bağlantıyı kopyala ve not paylaşma formuna yapıştır.</li></ol>
  </article></div>`;
  return {};
};

function viewNotFound(root) {
  root.innerHTML = `<div class="wrap panel">${emptyHtml('Sayfa bulunamadı', 'Adres hatalı ya da içerik kaldırılmış olabilir.', '<a class="btn" href="#/">Ana sayfaya dön</a>')}</div>`;
  return {};
}
ROUTES.__404 = viewNotFound;

/* ================= Kubbe: sıralama ve market ================= */
Object.assign(G, {
  auth: () => openAuth(),
  user: id => openUserCard(id),
  acc: () => { if (hasAcc()) location.hash = '#/profil'; else openAuth(); },
  'profile-edit': () => openProfileEdit(),
  'vis-toggle': (id, el) => toggleVis(el.dataset.k),
  buy: (id) => buyItem(id),
  'av-urun': id => setAvatarItem(id)
});
ROUTES['kubbe'] = function viewKubbe(root) {
  const st = { more: { term: false, all: false }, bolum: '', sig: { term: '', all: '' }, headSig: '', shopSig: '' };
  root.innerHTML = `<div class="wrap">
    <section class="kube-hero" data-r="head"></section>
    <div class="lead-ctl kube-ctl" data-r="bolwrap" hidden><label class="label" for="kb-bolum">Bölüm sıralaması</label><select id="kb-bolum" class="select sm" data-r="bolum"></select></div>
    <div class="rank-cols">
      <section class="lead lead-col" aria-label="Dönemin yıldızı"><div class="lead-top"><h2>Dönemin yıldızı</h2><span class="rank-sub">${esc(termLabel(currentTk()))}</span></div><div data-r="b-term"></div><button type="button" class="btn btn-sm lead-more" data-more="term" hidden></button></section>
      <section class="lead lead-col" aria-label="Tüm zamanlar"><div class="lead-top"><h2>Tüm zamanlar</h2><span class="rank-sub">Toplam kubbe</span></div><div data-r="b-all"></div><button type="button" class="btn btn-sm lead-more" data-more="all" hidden></button></section>
    </div>
    <section class="shop-sec">
      <div class="shop-head"><h2>Market</h2><span class="shop-bal" data-r="bal2"></span></div>
      <p class="muted">Kampüs efsanelerinden ilham alan koleksiyon parçaları. Aldıkların profilinde, yorumlarında ve sıralamada görünür.</p>
      <div class="shop" data-r="market"></div>
    </section>
  </div>`;
  const R = k => $(`[data-r=${k}]`, root);
  const onClick = e => {
    const b = e.target.closest('[data-more]');
    if (!b || !root.contains(b)) return;
    const k = b.dataset.more === 'term' ? 'term' : 'all';
    st.more[k] = !st.more[k];
    renderBoards();
  };
  root.addEventListener('click', onClick);
  R('bolum').addEventListener('change', e => { st.bolum = e.target.value; renderBoards(); });
  function renderBoards() {
    st.bolum = fillBolumSelect(R('bolum'), st.bolum);
    for (const kind of ['term', 'all']) {
      const limit = st.bolum ? 10 : st.more[kind] ? 50 : 10;
      const btn = $(`[data-more=${kind}]`, root);
      btn.hidden = !!st.bolum || boardList(kind, st.bolum).length <= 10;
      btn.textContent = st.more[kind] ? 'Küçült' : 'İlk 50’yi göster';
      const sig = boardSig(kind, st.bolum, limit, false);
      if (sig === st.sig[kind]) continue;
      st.sig[kind] = sig;
      const el = R('b-' + kind);
      el.innerHTML = boardHtml(kind, { limit, bolum: st.bolum });
      applyWidths(el); countUp(el);
    }
  }
  const api = {
    refresh() {
      const w = waitState();
      if (w === 'nodb') { R('head').innerHTML = noDbHtml(); R('b-term').innerHTML = ''; R('b-all').innerHTML = ''; R('market').innerHTML = ''; return; }
      if (w === 'loading' || !allLoaded()) { R('head').innerHTML = loadingHtml(); return; }
      const u = myAcc(), k = kubbeOf(S.me), bal = u ? balanceOf(S.me) : 0;
      const isAdmin = u && u.role === 'admin';
      const rT = rankOf(S.me, 'term'), rA = rankOf(S.me, 'all');
      const headSig = [S.usersVer, k.all, k.term, bal, rT, rA].join('|');
      if (u && headSig !== st.headSig) {
        st.headSig = headSig;
        const medal = r => (r === 1 ? ' m1' : r === 2 ? ' m2' : r === 3 ? ' m3' : '');
        R('head').innerHTML = `
          <div class="kh-who">${avatarHtml(S.me, { cls: 'xl' })}
            <div><p class="kh-name">${nameHtml(u, u.username || '')}${badgesHtml(u)}</p><p class="muted">${(() => { const pv = S.supa ? S.priv || {} : {}, nm = fullName(u) || fullName(pv), y = u.yil || +pv.yil || 0; return esc(nm || '') + (y ? (nm ? ', ' : '') + y + ' girişli' : ''); })()}</p></div></div>
          <div class="kh-score"><span class="kh-dome" aria-hidden="true"><svg viewBox="0 0 40 30"><path d="M4 26a16 15 0 0 1 32 0z" fill="#FFD23F" stroke="#111C4E" stroke-width="2.5" stroke-linejoin="round"/><path d="M20 11V5" stroke="#111C4E" stroke-width="2.5" stroke-linecap="round"/><circle cx="20" cy="4" r="2.5" fill="#FFD23F" stroke="#111C4E" stroke-width="2"/></svg></span><b data-count="${k.all}">${k.all}</b><span>kubbe kazandın</span></div>
          <div class="kh-ranks">${isAdmin ? '<span class="rank-pill">Yönetici hesabı sıralamada görünmez</span>' : `<span class="rank-pill${medal(rT)}"><small>Dönemin yıldızı</small><b>${rT || '–'}.</b></span><span class="rank-pill${medal(rA)}"><small>Tüm zamanlar</small><b>${rA || '–'}.</b></span>`}<span class="rank-pill bal"><small>Bakiyen</small><b>${bal}</b></span></div>${S.supa && !isAdmin ? '<p class="fine kh-note">Sıralamaya adınla yaptıkların sayılır. Hoca puanların ve anonim paylaşımların kubbesi yalnızca bakiyene eklenir; böylece kimse onları sana bağlayamaz.</p>' : ''}`;
        applyWidths(R('head')); countUp(R('head'));
      }
      renderBoards();
      R('bal2').innerHTML = u ? `${gl('coin', 'k-coin')} ${bal} kubbe bakiyen var` : '';
      const shopSig = [bal, JSON.stringify((u && u.items) || {}), !!u, u ? avKind(u) + ':' + (u.urun || '') : ''].join('|');
      if (shopSig !== st.shopSig) {
        st.shopSig = shopSig;
        R('market').innerHTML = MARKET.map(it => lootHtml(it, { u, bal })).join('');
        applyWidths(R('market')); wireLoot(R('market'));
      }
    },
    cleanup() { root.removeEventListener('click', onClick); }
  };
  return api;
};

/* ================= Profil ================= */
ROUTES['profil'] = function viewProfile(root) {
  root.innerHTML = '<div class="wrap"><div data-r="body"></div></div>';
  return {
    refresh() {
      const el = $('[data-r=body]', root), st = waitState();
      if (st === 'nodb') { el.innerHTML = noDbHtml(); return; }
      if (st === 'loading' || !allLoaded()) { el.innerHTML = loadingHtml(); return; }
      const u = myAcc();
      if (!u) {
        el.innerHTML = `<div class="page-intro"><h1>Hesabın</h1><p>YediWiki’ye okul e-postanla (${MAIL_DOMAIN}) katılıyorsun. Hesapla not paylaşabilir, yorum yazabilir, hoca puanlayabilir ve kubbe toplarsın.</p>
          <div class="head-actions"><button type="button" class="btn btn-primary" data-g="auth">${icon('star')}Hesap aç</button></div></div>`;
        return;
      }
      const k = kubbeOf(S.me), items = Object.keys(u.items || {}).filter(id => MARKET_BY_ID[id]);
      const pv = S.priv || {}, myName = fullName(u) || (S.supa ? fullName(pv) : ''), myYil = u.yil || (S.supa ? +pv.yil || 0 : 0);
      const accRow = S.supa
        ? `<div><dt>${u.role === 'admin' ? 'Hesap' : 'E-posta'}</dt><dd>${u.role === 'admin' ? 'Yönetici ' : ''}${esc(S.email || '')} <span class="tag ok-tag">doğrulandı</span> <button type="button" class="btn btn-sm" data-g="logout">Çıkış yap</button></dd></div>`
        : u.shared ? `<div><dt>E-posta</dt><dd>${esc(u.email || '')} <span class="tag ok-tag">doğrulandı</span> <button type="button" class="btn btn-sm" data-g="logout-shared">Çıkış yap</button></dd></div>` : u.role === 'admin' ? `<div><dt>Hesap</dt><dd>Yönetici <span class="opt">${S.login && S.login.email ? esc(S.login.email) : 'sıralamada görünmez'}</span>${S.login && S.login.hash && S.me === S.baseMe ? ' <button type="button" class="btn btn-sm" data-g="logout-base">Çıkış yap</button>' : ''}</dd></div>` : `<div><dt>E-posta</dt><dd>${esc((S.priv && S.priv.email) || u.email || '')} <span class="tag ok-tag">doğrulandı</span></dd></div>`;
      // Kapak: profil resminin rengiyle boyanır; profil resmi bantla yapıştırılmış bir çıkartma, altta kubbe sırası
      const color = okHex(u.color) ? u.color : AV_COLORS[0], bol = u.bolum && S.bolumler.has(u.bolum) ? u.bolum : '';
      const eyeBtn = (key, on, what) => `<button type="button" class="vis-st ${on ? 'on' : 'off'}" data-g="vis-toggle" data-k="${key}" aria-pressed="${on}" aria-label="${esc(what)}: ${on ? 'profilde görünür, gizlemek için dokun' : 'gizli, göstermek için dokun'}">${icon(on ? 'eye' : 'eyeoff')}<span>${on ? 'Profilde görünür' : 'Gizli'}</span></button>`;
      const led = (ic, label, val, note = '') => `<li class="led-row"><span class="led-ic" aria-hidden="true">${icon(ic)}</span><span class="led-l">${label}${note ? ` <span class="opt">${note}</span>` : ''}</span><span class="led-dots" aria-hidden="true"></span><b class="led-v">${val}</b></li>`;
      el.innerHTML = `<section class="pf-cover" style="--pf-c:${color}" aria-label="Profilin">
          <div class="pf-in">
            <div class="pf-sticker">${avatarHtml(S.me, { cls: 'hero' })}</div>
            <div class="pf-id">
              <h1 class="pf-user"><span class="pf-at" aria-hidden="true">@</span>${nameHtml(u, u.username || '')}${badgesHtml(u)}</h1>
              ${myName ? `<p class="pf-real">${esc(myName)}${visIc(!!u.showName, 'Adın')}</p>` : ''}
              <div class="pf-tags">
                ${bol ? `<a class="pf-tag dept" href="#/dersler?b=${esc(bol)}" title="Ders planını aç">${icon('grad')}<span>${esc(bolumName(bol))}</span></a>` : S.bolumler.size ? `<button type="button" class="pf-tag add" data-g="profile-edit">${icon('plus')}<span>Bölümünü seç</span></button>` : ''}
                ${myYil ? `<span class="pf-tag">${esc(String(myYil))} girişli${visIc(u.showYil !== false, 'Giriş yılın')}</span>` : ''}
              </div>
              <div class="pf-acts"><button type="button" class="btn btn-primary btn-press" data-g="profile-edit">${icon('edit')}Profili düzenle</button><a class="btn btn-solid btn-press" href="#/katkilarim">${icon('list')}Katkılarım</a></div>
            </div>
            <div class="pf-kubbe" role="group" aria-label="Kubben">
              <span class="pf-k-ico" aria-hidden="true">${icon('kubbe')}</span>
              <b class="pf-k-num">${balanceOf(S.me)}</b><span class="pf-k-lbl">kubbe</span>
              <span class="pf-k-rank"><span>${esc(termLabel(currentTk()))}</span><b>${rankOf(S.me, 'term')}. sıra</b></span>
              <span class="pf-k-rank"><span>Tüm zamanlar</span><b>${rankOf(S.me, 'all')}. sıra</b></span>
            </div>
          </div>
        </section>
        <div class="pf-grid">
          <section class="pf-sec"><h2 class="sub-h">Hesabın</h2>
            <dl class="pf-rows">
              ${accRow}
              <div><dt>Ad soyad</dt><dd><span class="pf-val">${esc(myName || 'girilmedi')}</span>${myName ? eyeBtn('showName', !!u.showName, 'Ad soyad') : ''}</dd></div>
              <div><dt>Giriş yılı</dt><dd><span class="pf-val">${myYil ? esc(String(myYil)) : 'girilmedi'}</span>${myYil ? eyeBtn('showYil', u.showYil !== false, 'Giriş yılı') : ''}</dd></div>
              ${S.bolumler.size || u.bolum ? `<div><dt>Bölüm</dt><dd><span class="pf-val">${esc(bolumName(u.bolum) || 'seçilmedi')}</span></dd></div>` : ''}
              <div><dt>Telefon</dt><dd><span class="pf-val">${esc((S.priv && S.priv.phone) || 'girilmedi')}</span><span class="vis-note">${icon('lock')}Yalnızca sen</span></dd></div>
            </dl>
            ${S.supa ? '<p class="fine">Sıralamaya yalnızca adınla yaptıkların sayılır; anonim paylaşımlar ve hoca puanları bakiyene eklenir.</p>' : ''}
          </section>
          <section class="pf-sec"><h2 class="sub-h">Kubbe dökümü</h2>
            <ul class="pf-ledger">
              ${led('kubbe', 'Hesap açma', Math.max(0, +u.bonus || 0))}
              ${led('book', `${k.notes} not`, k.notes * KUBBE.note, k.notes ? 've üzeri' : '')}
              ${led('vup', `Notlarına ${k.ups || 0} ${gl('up', 'gl-in')} geldi`, (k.ups || 0) * KUBBE.up)}
              ${led('comment', `${k.comments} yorum`, k.comments * KUBBE.comment)}
              ${led('heart', `Yorumların ${k.likes} beğeni aldı`, k.likes * KUBBE.like)}
              ${led('star', `${k.ratings} HocaÖlçer puanı`, k.ratings * KUBBE.rating)}
              ${led('bookmark', `${k.fills || 0} not isteği karşıladın`, (k.fills || 0) * KUBBE.fill)}
              ${giftOf(S.me) ? led('plus', 'Hediye', giftOf(S.me), 'sıralamaya sayılmaz') : ''}
              ${spentOf(S.me) ? led('cr', 'Markette harcadın', '−' + spentOf(S.me)) : ''}
              <li class="led-row led-sum"><span class="led-l">Bakiyen</span><span class="led-dots" aria-hidden="true"></span><b class="led-v">${balanceOf(S.me)} kubbe</b></li>
            </ul>
          </section>
        </div>
        ${badgesSectionHtml(S.me)}
        <section class="home-sec"><h2 class="sub-h">Aldıkların</h2>
          ${items.length ? `<div class="shop">${items.map(id => lootHtml(MARKET_BY_ID[id], { u, buy: false })).join('')}</div>` : '<p class="help">Henüz market ürünü almadın. <a href="#/kubbe">Markete göz at</a></p>'}
        </section>`;
      applyWidths(el); wireLoot(el);
    }
  };
};

/* ================= Açılış ================= */
function boot() {
  const rep = { __HOME__: 'home', __BOOK__: 'book', __STAR__: 'star', __UP__: 'up', __DL__: 'dl', __X__: 'x', __CL__: 'cl', __CR__: 'cr', __KUB__: 'kubbe' };
  $$('.k-dot').forEach(k => { k.outerHTML = gl('coin', 'k-coin'); });   // üst çubuktaki bakiye sikkesi
  for (const el of $$('.bnav a, #lightbox button')) {
    for (const [k, v] of Object.entries(rep)) if (el.innerHTML.indexOf(k) >= 0) el.innerHTML = el.innerHTML.replace(k, icon(v));
  }
  const dl = document.createElement('datalist');
  dl.id = 'dl-fac';
  dl.innerHTML = FACULTIES.map(f => `<option value="${esc(f)}"></option>`).join('');
  document.body.appendChild(dl);
  wireLightbox();
  applyTheme(ls.get('theme', '')); wireShortcuts();
  init();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

