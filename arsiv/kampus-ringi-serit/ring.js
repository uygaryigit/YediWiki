// Arşiv: 17 Ekim 2026'da ana sayfaya konan, sonra kaldırılan tam genişlik kampüs ringi şeridi (commit 7397e99).
// app.js içinde çalışıyordu: esc, artSeq, reduceMotion ve mtTw (CSS) sitenin kendisinden gelir.
// Geri koymak için: bu dosyayı app.js'e, ring.css'i style.css'e ekle; ana sayfada <div class="hm-ring" data-r="ring"> ve startRing(...) çağrısı.

/* ================= Kampüs ringi =================
   Ana sayfada ilk satırın (Notlar | Kubbe sıralaması) altında geniş bir şerit: Kayışdağı'nın eteğinde ağaçlı, yokuş bir yol.
   Sarı ring Kapı, Hukuk ve Yurtlar durakları arasında gidip gelir (dar ekranda Kapı ve Hukuk); durakta kapısını açıp bekler.
   Çizim kutunun genişliğine göre kurulur (1 birim = 1 piksel). Renkler CSS'te (.hm-ring değişkenleri): gece temasında lambalar,
   pencereler ve farlar yanar, gökte ay ve yıldızlar çıkar. Ring yalnızca ekrandayken ve sekme açıkken yürür; hareket azaltılmışsa
   Hukuk durağında bekler. Üstünde üniversitenin adı ve logosu yok, yan yüzünde RİNG yazar. */
const rgN = v => String(Math.round(v * 10) / 10);
const rgR = i => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };   // sabit "rastgele": her çizimde aynı
const rgStarD = (x, y, r) => { const a = rgN(x), b = rgN(y); return `M${a} ${rgN(y - r)}Q${a} ${b} ${rgN(x + r)} ${b}Q${a} ${b} ${a} ${rgN(y + r)}Q${a} ${b} ${rgN(x - r)} ${b}Q${a} ${b} ${a} ${rgN(y - r)}Z`; };
function rgSmooth(pts) {
  let d = `M${rgN(pts[0][0])} ${rgN(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i - 1] || pts[i], b = pts[i], c = pts[i + 1], e = pts[i + 2] || c;
    d += `C${rgN(b[0] + (c[0] - a[0]) / 6)} ${rgN(b[1] + (c[1] - a[1]) / 6)} ${rgN(c[0] - (e[0] - b[0]) / 6)} ${rgN(c[1] - (e[1] - b[1]) / 6)} ${rgN(c[0])} ${rgN(c[1])}`;
  }
  return d;
}
/* Yolun orta çizgisi (soldaki kapıdan sağdaki yurtlara yokuş çıkar), eğimi ve duraklar */
function ringGeo(W) {
  W = Math.max(280, Math.round(W));
  const wide = W >= 640, H = wide ? 220 : 190, s = wide ? 1 : 0.8;
  const y0 = H - 34, rise = Math.min(26, W * 0.045);
  const ry = x => y0 - rise * (0.5 - 0.5 * Math.cos(Math.PI * x / W)) + 2.6 * Math.sin(x / 74 + 0.8);
  const dry = x => -rise * 0.5 * Math.PI / W * Math.sin(Math.PI * x / W) + 2.6 / 74 * Math.cos(x / 74 + 0.8);
  const list = W >= 560 ? [['kapi', 'Kapı', 0.12], ['hukuk', 'Hukuk', 0.5], ['yurt', 'Yurtlar', 0.87]] : [['kapi', 'Kapı', 0.19], ['hukuk', 'Hukuk', 0.69]];
  const HALF = { kapi: 44, hukuk: 84, yurt: 48 };
  return { W, H, s, wide, ry, dry, bs: s * (wide ? 1.12 : 1), stops: list.map(([k, name, f]) => ({ k, name, x: Math.round(W * f), half: HALF[k] * s })) };
}
const rgCircles = (C, cls, add) => C.map(([a, b, q]) => `<circle class="${cls}" cx="${rgN(a)}" cy="${rgN(b)}" r="${rgN(q + add)}"/>`).join('');
function rgTree(x, y, h, pine) {
  if (pine) return `<g transform="translate(${rgN(x)} ${rgN(y)}) scale(${(h / 18).toFixed(3)})"><path class="rg-trunk" d="M-1.6 0V-4.6H1.6V0Z"/><path class="rg-pine" d="M-7.4 -3.4L0 -11.6L7.4 -3.4ZM-6 -8.2L0 -15.4L6 -8.2ZM-4.6 -12.4L0 -18.4L4.6 -12.4Z"/><path class="rg-pinehi" d="M0 -11.6L-7.4 -3.4H0ZM0 -15.4L-6 -8.2H0ZM0 -18.4L-4.6 -12.4H0Z"/></g>`;
  const r = h * 0.3, cy = -h * 0.62, C = [[0, cy - r * 0.2, r], [-r * 0.72, cy + r * 0.38, r * 0.78], [r * 0.72, cy + r * 0.34, r * 0.8]];
  return `<g transform="translate(${rgN(x)} ${rgN(y)})"><path class="rg-trunk" d="M-1.8 0V${rgN(cy + r)}H1.8V0Z"/>${rgCircles(C, 'rg-leafk', 1.4)}${rgCircles(C, 'rg-leaf', 0)}<circle class="rg-leafhi" cx="${rgN(-r * 0.28)}" cy="${rgN(cy - r * 0.48)}" r="${rgN(r * 0.4)}"/></g>`;
}
function rgBush(x, y, w) {
  const C = [[-w * 0.32, -w * 0.2, w * 0.27], [0, -w * 0.32, w * 0.36], [w * 0.32, -w * 0.19, w * 0.26]];
  return `<g transform="translate(${rgN(x)} ${rgN(y)})">${rgCircles(C, 'rg-leafk', 1.2)}${rgCircles(C, 'rg-leaf', 0)}<circle class="rg-leafhi" cx="${rgN(-w * 0.08)}" cy="${rgN(-w * 0.44)}" r="${rgN(w * 0.12)}"/></g>`;
}
function rgLamp(x, y, s, p) {
  return `<g transform="translate(${rgN(x)} ${rgN(y)}) scale(${s})"><ellipse class="rg-night rg-pool" cx="9" cy="14" rx="20" ry="4.6"/>`
    + '<path class="rg-pole" d="M0 1V-36Q0 -41 5 -41H8.5"/><path class="rg-lamph" d="M5.6 -42.6H12.4L10.8 -39.2H7.2Z"/>'
    + `<circle class="rg-night" cx="9" cy="-37" r="16" fill="url(#${p}glow)"/><circle class="rg-bulb" cx="9" cy="-38.4" r="1.7"/></g>`;
}
function rgSign(x, y, s, name) {
  const w = name.length * 5.6 + 13;
  return `<g transform="translate(${rgN(x)} ${rgN(y)}) scale(${s})"><path class="rg-pole" d="M0 1V-30"/><rect class="rg-sign" x="${rgN(-w / 2)}" y="-43" width="${rgN(w)}" height="13.5" rx="3.6"/><text class="rg-signt" x="0" y="-33" text-anchor="middle">${esc(name)}</text></g>`;
}
/* Durak çizimleri (taban ortası 0,0): Selçuklu kapı, Hukuk binası (çizgili cephe, sivri kemerli yeşil cam, havuz), yurtlar */
function rgGate(p) {
  const tw = x => Array.from({ length: 9 }, (_, i) => `M${x} ${-52 + i * 6}l5 -3`).join('');
  return `<ellipse class="rg-night" cx="0" cy="-30" rx="30" ry="26" fill="url(#${p}glow)"/>`
    + `<path class="rg-ln" d="M-40 0V-21H-24V0ZM24 0V-21H40V0Z" fill="url(#${p}st)"/>`
    + '<path class="rg-st3 rg-ln" d="M-42 -21V-25H-22V-21ZM22 -21V-25H42V-21Z"/>'
    + `<rect class="rg-ln" x="-24" y="-60" width="48" height="60" fill="url(#${p}st)"/>`
    + `<path class="rg-st3 rg-ln" d="M-27 -60${'l4.5 -7 4.5 7'.repeat(6)}v4H-27Z"/>`
    + '<path class="rg-st3 rg-ln" d="M-21.5 -56h5V0h-5ZM16.5 -56h5V0h-5Z"/>'
    + `<path class="rg-twist" d="${tw(-21.5)}${tw(16.5)}"/>`
    + '<path class="rg-st3 rg-ln" d="M-13 0V-27Q-13 -40 0 -46Q13 -40 13 -27V0Z"/>'
    + `<path class="rg-mq" d="M-9 -36${'q2.25 -3 4.5 0'.repeat(4)}M-6.75 -40.4${'q2.25 -3 4.5 0'.repeat(3)}"/>`
    + '<path class="rg-wood rg-ln" d="M-8.5 0V-24Q-8.5 -32.5 0 -36Q8.5 -32.5 8.5 -24V0Z"/><path class="rg-woodk" d="M0 -35.6V0"/>'
    + '<rect class="rg-st3 rg-ln" x="-11" y="-55" width="22" height="5.5" rx="1"/>'
    + '<rect class="rg-st3 rg-ln" x="-30" y="-1.5" width="60" height="3.2"/>';
}
function rgHukuk(p) {
  let s = '<ellipse class="rg-plaza" cx="2" cy="1.5" rx="80" ry="6.5"/>'
    + `<rect class="rg-hk" x="-60" y="-96" width="100" height="96" fill="url(#${p}hs)"/>`
    + `<rect class="rg-hk" x="40" y="-90" width="18" height="90" fill="url(#${p}hs)"/><rect class="rg-fr" x="45.5" y="-84" width="7" height="72" fill="url(#${p}gw)"/>`
    + '<path class="rg-frame" d="M-60 -99.6H40' + Array.from({ length: 21 }, (_, i) => `M${-59 + i * 5} -96V-99.6`).join('') + '"/>'
    + `<path class="rg-fr" d="M-51.5 -12V-66Q-51.5 -76 -45 -81Q-38.5 -76 -38.5 -66V-12Z" fill="url(#${p}gw)"/><path class="rg-frame" d="M-45 -80V-12M-51.5 -57H-38.5M-51.5 -44H-38.5M-51.5 -31H-38.5"/>`;
  let k = 0;
  for (const y of [-86, -68, -50]) for (const x of [-30, -23.5, -10, -3.5, 10, 16.5, 27, 33.5]) s += `<rect class="rg-w${rgR(++k) < 0.42 ? ' lit' : ''}" x="${x}" y="${y}" width="5" height="9"/>`;
  const arch = cx => `<path class="rg-arch" d="M${cx - 4.25} 0V-9Q${cx - 4.25} -14 ${cx} -16Q${cx + 4.25} -14 ${cx + 4.25} -9V0Z"/>`;
  s += arch(-28) + arch(-18.5) + arch(17.5) + arch(27) + '<rect class="rg-arch" x="-6" y="-14" width="12" height="14"/><rect class="rg-canopy" x="-8.5" y="-17" width="17" height="2.6" rx="1"/>';
  return s + '<g transform="translate(50 6)"><ellipse class="rg-fbn" cx="0" cy="0" rx="11" ry="3.2"/><path class="rg-fbn" d="M-11 0v2.6Q0 7.8 11 2.6V0"/><rect class="rg-fbn" x="-1.4" y="-11" width="2.8" height="11"/><path class="rg-fbn" d="M-6 -11Q0 -6.6 6 -11Z"/><path class="rg-water" d="M0 -16Q-6 -19 -9.6 0M0 -16Q6 -19 9.6 0M0 -11V-17"/></g>';
}
function rgYurt() {
  let s = '<rect class="rg-cr rg-ln2" x="-42" y="-56" width="46" height="56"/><rect class="rg-cr2 rg-ln2" x="2" y="-74" width="40" height="74"/>'
    + '<path class="rg-pyr" d="M9 -74L22 -87L35 -74Z"/><path class="rg-pyrhi" d="M22 -87L35 -74H22Z"/>';
  let k = 40;
  for (const y of [-49, -39, -29, -19]) for (const x of [-37, -28, -19, -10]) s += `<rect class="rg-w2${rgR(++k) < 0.4 ? ' lit' : ''}" x="${x}" y="${y}" width="5" height="6"/>`;
  for (const y of [-67, -57, -47, -37, -27, -17]) for (const x of [8, 16.5, 25, 33.5]) s += `<rect class="rg-w2${rgR(++k) < 0.4 ? ' lit' : ''}" x="${x}" y="${y}" width="5" height="6"/>`;
  return s + '<rect class="rg-arch" x="-25" y="-10" width="8" height="10"/>';
}
function rgFar(x, y, w, h, cap) {
  let s = `<g transform="translate(${rgN(x)} ${rgN(y)})"><rect class="rg-fb" x="${rgN(-w / 2)}" y="${rgN(-h)}" width="${rgN(w)}" height="${rgN(h)}"/>`;
  for (let r = -h + 6; r < -5; r += 6.5) s += `<path class="rg-fwin" d="M${rgN(-w / 2 + 4)} ${rgN(r)}H${rgN(w / 2 - 4)}"/>`;
  if (cap) s += `<path class="rg-pyr" d="M-7 ${rgN(-h)}L0 ${rgN(-h - 9)}L7 ${rgN(-h)}Z"/>`;
  return s + '</g>';
}
/* Ring (sağa bakar, taban ortası 0,0, boyu 97): yolcular, kayar kapı, dönen tekerler, gece farı; dururken fren lambası yanar */
function rgBus(p) {
  const K = '#2A1F05', WX = [-44, -31.6, -19.2, -6.8, 5.6, 20.2];
  const wins = WX.map((x, i) => `<rect class="rg-bw" x="${x}" y="-39.5" width="${i === 5 ? 13.2 : 11}" height="14.5" rx="2.2"/>`).join('');
  const shine = WX.map(x => `<path d="M${rgN(x + 2)} -27.5L${rgN(x + 7)} -38" stroke="#fff" stroke-width="1.5" opacity=".32"/>`).join('');
  const head = (x, y) => `<circle cx="${x}" cy="${y}" r="2.9"/><path d="M${rgN(x - 4.4)} -25V-26.4Q${x} -30 ${rgN(x + 4.4)} -26.4V-25Z"/>`;
  const wheel = x => `<g transform="translate(${x} -7.5)"><g class="rg-spin"><circle r="7.6" fill="#1D1E26"/><circle r="4.3" fill="#C8CEDA" stroke="#5B6378" stroke-width="1.2"/><path d="M0 -4.3V4.3M-3.7 -2.15L3.7 2.15M-3.7 2.15L3.7 -2.15" stroke="#5B6378" stroke-width="1.1"/><circle r="1.3" fill="#3A3F4F"/></g></g>`;
  return '<g class="rg-bus">'
    + `<path class="rg-night" d="M47 -16L136 -34L140 -1L47 -9Z" fill="url(#${p}beam)"/>`
    + '<ellipse cx="0" cy="0.6" rx="47" ry="3.2" fill="#000" opacity=".22"/>'
    + '<g class="rg-body">'
    + `<rect x="-22" y="-48.6" width="26" height="5.6" rx="2" fill="#E6E9F0" stroke="${K}" stroke-width="1.5"/>`
    + `<path d="M-45 -7.5H44Q48.6 -7.5 48.6 -12L48.2 -25L46 -39.5Q45 -44.4 39.5 -44.4H-41Q-48 -44.4 -48 -37.4V-11Q-48 -7.5 -45 -7.5Z" fill="url(#${p}bus)" stroke="${K}" stroke-width="2" stroke-linejoin="round"/>`
    + '<path d="M-47 -21.2H33.6" stroke="#E39A00" stroke-width="2.2"/>'
    + wins + `<g class="rg-pax">${head(-38.5, -30.6)}${head(-13.7, -31)}${head(-1.3, -30.4)}</g>` + shine
    + `<rect x="34.2" y="-41.2" width="10.8" height="33.4" rx="1.6" fill="#E9A800" stroke="${K}" stroke-width="1.5"/><rect class="rg-bw rg-door-l" x="35.4" y="-39.6" width="4.2" height="30"/><rect class="rg-bw rg-door-r" x="40.2" y="-39.6" width="4.2" height="30"/>`
    + `<path class="rg-bw" d="M45.4 -42.4H46.2L48.3 -26.4H45.4Z"/>`
    + `<path d="M44.6 -12H48.8V-8.2H44.6ZM-48.2 -12H-44V-8.2H-48.2Z" fill="#3A3F4F"/>`
    + `<circle class="rg-head" cx="46.6" cy="-15.8" r="2" stroke="${K}" stroke-width="1"/><rect x="45.4" y="-21.6" width="2.6" height="2" rx=".8" fill="#FF9F1C"/>`
    + '<rect class="rg-tail" x="-48.6" y="-20.4" width="2.8" height="6.2" rx="1"/>'
    + `<path d="M46 -41.4Q51.6 -41.8 51.6 -36.6V-31.4" fill="none" stroke="${K}" stroke-width="1.6" stroke-linecap="round"/><rect x="50" y="-33.4" width="3.2" height="6.2" rx="1.2" fill="#2B2F3D"/>`
    + '<text class="rg-txt" x="-5" y="-10.8" text-anchor="middle">RİNG</text>'
    + '<path d="M-38 -7.5A10 10 0 0 1 -18 -7.5ZM14 -7.5A10 10 0 0 1 34 -7.5Z" fill="#3B2C06"/>'
    + '</g>'
    + wheel(-28) + wheel(24)
    + '<g class="rg-puff"><circle cx="-52" cy="-9" r="2.6"/><circle cx="-57.5" cy="-12" r="3.4"/><circle cx="-63" cy="-9.6" r="2.3"/></g>'
    + '</g>';
}
function ringSvg(g) {
  const { W, H, s, ry, stops } = g, p = 'rg' + (++artSeq) + '-';
  const has = (x, pad) => stops.some(o => Math.abs(x - o.x) < o.half + pad);
  const xs = []; for (let x = 0; x < W; x += 24) xs.push(x); xs.push(W);
  const edge = dy => xs.map(x => [x, ry(x) + dy]);
  const pl = (pts, cont) => pts.map((q, i) => (i || cont ? 'L' : 'M') + rgN(q[0]) + ' ' + rgN(q[1])).join('');
  const band = (a, b) => pl(edge(a)) + pl(edge(b).reverse(), true) + 'Z';
  const defs = '<defs>'
    + `<linearGradient id="${p}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="rg-sky1"/><stop offset="1" class="rg-sky2"/></linearGradient>`
    + `<linearGradient id="${p}mtn" x1="0" y1="0" x2="1" y2="0"><stop offset="0" class="rg-m1"/><stop offset=".55" class="rg-m2"/><stop offset="1" class="rg-m3"/></linearGradient>`
    + `<radialGradient id="${p}glow"><stop offset="0" stop-color="#FFE6A0" stop-opacity=".9"/><stop offset="1" stop-color="#FFE6A0" stop-opacity="0"/></radialGradient>`
    + `<radialGradient id="${p}sun"><stop offset="0" stop-color="#FFF4B8" stop-opacity=".95"/><stop offset="1" stop-color="#FFF4B8" stop-opacity="0"/></radialGradient>`
    + `<linearGradient id="${p}beam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFF1B8" stop-opacity=".75"/><stop offset="1" stop-color="#FFF1B8" stop-opacity="0"/></linearGradient>`
    + `<linearGradient id="${p}bus" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE45C"/><stop offset=".62" stop-color="#FFC81F"/><stop offset="1" stop-color="#E8A300"/></linearGradient>`
    + `<linearGradient id="${p}st" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="rg-st1"/><stop offset="1" class="rg-st2"/></linearGradient>`
    + `<linearGradient id="${p}gw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="rg-g1"/><stop offset="1" class="rg-g2"/></linearGradient>`
    + `<pattern id="${p}hs" width="12" height="9" patternUnits="userSpaceOnUse"><rect class="rg-hs2" width="12" height="9"/><rect class="rg-hs1" width="12" height="4.5"/></pattern>`
    + '</defs>';
  // gök: gündüz güneş ve bulutlar, gece ay ve yıldızlar
  const sx = W - Math.max(46, W * 0.075), sy = 36;
  let stars = '';
  for (let i = 0; i < Math.round(W / 60) + 6; i++) {
    const x = rgR(i + 7) * W, y = 8 + rgR(i + 91) * H * 0.36;
    if (Math.hypot(x - sx, y - sy) > 30) stars += `<path class="rg-tw d${i % 3}" d="${rgStarD(x, y, 1.6 + rgR(i + 33) * 2)}"/>`;
  }
  const cloud = (x, y, k, i) => `<g transform="translate(${rgN(x)} ${y}) scale(${k})"><g class="rg-cloud c${i}"><path d="M-22 6Q-25 -2 -15 -3Q-13 -12 -3 -10Q3 -17 12 -10Q22 -11 21 -1Q28 1 25 6Z"/></g></g>`;
  const sky = `<rect width="${W}" height="${H}" fill="url(#${p}sky)"/>`
    + `<g class="rg-day"><circle cx="${rgN(sx)}" cy="${sy}" r="34" fill="url(#${p}sun)"/><circle class="rg-sun" cx="${rgN(sx)}" cy="${sy}" r="12.5"/>${cloud(W * 0.2, 30, 1, 0)}${cloud(W * 0.47, 18, 0.8, 1)}${W >= 560 ? cloud(W * 0.72, 46, 0.9, 2) : ''}</g>`
    + `<g class="rg-night"><circle cx="${rgN(sx)}" cy="${sy}" r="30" fill="url(#${p}glow)" opacity=".45"/><path class="rg-moon" transform="translate(${rgN(sx - 16.5)} ${sy - 15.5})" d="M21 6.2A10 10 0 1 0 25.8 21A8 8 0 0 1 21 6.2Z"/><g class="rg-stars">${stars}</g></g>`;
  // Kayışdağı: ormanlı yamaç, tepede vericiler (gece kırmızı ışık yanıp söner)
  const MP = [[-30, H * 0.64], [W * 0.1, H * 0.52], [W * 0.27, H * 0.38], [W * 0.44, H * 0.22], [W * 0.6, H * 0.13], [W * 0.73, H * 0.21], [W * 0.87, H * 0.34], [W + 30, H * 0.44]];
  const ridge = rgSmooth(MP);
  const ridgeY = x => { for (let i = 0; i < MP.length - 1; i++) if (x <= MP[i + 1][0]) return MP[i][1] + (MP[i + 1][1] - MP[i][1]) * (x - MP[i][0]) / (MP[i + 1][0] - MP[i][0]); return MP[MP.length - 1][1]; };
  let dots = '';
  for (let i = 0; i < Math.round(W / 24); i++) { const x = rgR(i + 300) * W; dots += `<circle cx="${rgN(x)}" cy="${rgN(ridgeY(x) + 11 + rgR(i + 400) * 46)}" r="${rgN(2 + rgR(i + 500) * 2.6)}"/>`; }
  const [px, py] = MP[4];
  const ant = (x, h) => `<path class="rg-ant" d="M${rgN(x)} ${rgN(py + 3)}V${rgN(py - h)}M${rgN(x - 2.6)} ${rgN(py - h * 0.45)}H${rgN(x + 2.6)}M${rgN(x - 2)} ${rgN(py - h * 0.75)}H${rgN(x + 2)}"/><circle class="rg-red rg-blink" cx="${rgN(x)}" cy="${rgN(py - h - 1.6)}" r="1.7"/>`;
  const mtn = `<path d="${ridge}L${W + 30} ${H}L-30 ${H}Z" fill="url(#${p}mtn)"/><path class="rg-ridge" d="${ridge}"/><g class="rg-mdot">${dots}</g>${ant(px - 6, 22)}${ant(px + 5, 15)}`;
  // çayır, uzaktaki tuğla binalar (yeşil külahlı), yol kenarındaki ağaçlar
  const mpts = []; for (let x = -10; x <= W + 40; x += 40) mpts.push([x, ry(Math.min(x, W)) - 43 - 8 * Math.sin(x / 120 + 1.1) - 5 * Math.sin(x / 53)]);
  const meadow = `<path class="rg-meadow" d="${rgSmooth(mpts)}L${rgN(W + 40)} ${rgN(ry(W) - 12)}${pl(edge(-12).reverse(), true)}Z"/><path class="rg-verge" d="${band(-19, -12)}"/>`;
  const farAt = W >= 560 ? [[0.28, 36, 30, 0], [0.345, 30, 42, 1], [0.66, 44, 34, 1], [0.735, 32, 26, 0]] : [[0.43, 30, 34, 1], [0.93, 28, 26, 0]];
  const far = farAt.map(([f, w, h, cap]) => { const x = W * f; return rgFar(x, ry(x) - 24, w * s, h * s, cap); }).join('');
  const lampXs = []; for (let x = 70; x < W - 20; x += 175) if (!stops.some(o => Math.abs(x - o.x) < o.half * 0.6)) lampXs.push(x);
  let back = '';
  for (let i = 0, x = 8; x < W - 4; i++, x += 40 + rgR(i) * 18) {
    if (has(x, 10) || lampXs.some(l => Math.abs(l - x) < 9)) continue;
    back += rgTree(x, ry(x) - 12.5, (22 + rgR(i + 60) * 14) * s, rgR(i + 120) < 0.45);
  }
  const lmk = stops.map(o => `<g transform="translate(${o.x} ${rgN(ry(o.x) - 14)}) scale(${s})">${o.k === 'kapi' ? rgGate(p) : o.k === 'hukuk' ? rgHukuk(p) : rgYurt()}</g>`).join('');
  // yol, lambalar, durak tabelaları, ön çimen
  const road = `<path class="rg-road" d="${band(-13, 13)}"/><path class="rg-curb" d="${pl(edge(-13))}"/><path class="rg-curb" d="${pl(edge(13))}"/><path class="rg-dash" d="${pl(edge(0))}"/>`;
  const lamps = lampXs.map(x => rgLamp(x, ry(x) - 12.5, s, p)).join('');
  const signs = stops.map(o => { const x = o.x + (o.k === 'kapi' ? 50 : o.k === 'hukuk' ? -72 : -56) * s; return rgSign(x, ry(x) - 12.5, s, o.name); }).join('');
  const near = `<path class="rg-near" d="${pl(edge(13))}L${W} ${H + 2}L0 ${H + 2}Z"/>`;
  // önde: geniş ekranda iki ağaç (ring arkalarından geçer) ve çalılar
  const fr = g.wide && stops.length > 2 ? [(stops[0].x + stops[1].x) / 2 + W * 0.03, (stops[1].x + stops[2].x) / 2 - W * 0.02] : [];
  let front = fr.map(x => rgTree(x, ry(x) + 22, 44, false)).join('');
  for (let i = 0, x = 20; x < W - 10; i++, x += 64 + rgR(i + 700) * 40) {
    if (fr.some(f => Math.abs(f - x) < 26)) continue;
    front += rgBush(x, ry(x) + 21 + rgR(i + 800) * 4, (13 + rgR(i + 900) * 8) * s);
  }
  return `<svg class="rg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true" focusable="false">${defs}${sky}${mtn}${meadow}${far}${back}${lmk}${road}${lamps}${signs}${near}${rgBus(p)}${front}</svg>`;
}
/* Ringi yürütür: durakta bekler (kapı açılır), kalkarken egzoz, yolda hızlanıp yavaşlar, yokuşta eğilir, dönüşte yüzü çevrilir.
   Ekran dışındayken ya da sekme gizliyken durur; genişlik değişince çizim yeniden kurulur. Döndürdüğü işlev her şeyi kapatır. */
function startRing(host) {
  if (!host) return () => {};
  const anim = !reduceMotion() && typeof requestAnimationFrame === 'function' && 'IntersectionObserver' in window;
  const now = () => (window.performance && performance.now ? performance.now() : Date.now());
  const DWELL = 2600;
  const st = { i: 1, dir: Math.random() < 0.5 ? 1 : -1, face: 1, phase: 'dwell', t0: now(), from: 0, to: 0, T: 1, x: 0, d: 0, open: false, next: 1 };
  let g = null, W = 0, raf = 0, dead = false, seen = false, paused = now(), bus = null, body = null, spins = [], puff = null, io = null, ro = null, rt = 0;
  function place(t) {
    const a = Math.atan(g.dry(st.x)) * 180 / Math.PI, rot = (st.d / (7.6 * g.bs)) * 57.2958 % 360;
    bus.setAttribute('transform', `translate(${rgN(st.x)} ${rgN(g.ry(st.x) + 6.5)}) rotate(${a.toFixed(2)}) scale(${st.face * g.bs} ${g.bs})`);
    spins.forEach(w => w.setAttribute('transform', `rotate(${rot.toFixed(1)})`));
    if (body) body.setAttribute('transform', st.phase === 'move' ? `translate(0 ${(-Math.abs(Math.sin(t / 95)) * 0.8).toFixed(2)})` : 'translate(0 0)');
  }
  function build() {
    const w = Math.round(host.clientWidth) || 720;
    if (g && Math.abs(w - W) < 6) return;
    W = w; g = ringGeo(W);
    host.innerHTML = `<div class="rg-box">${ringSvg(g)}</div>`;
    bus = host.querySelector('.rg-bus'); body = host.querySelector('.rg-body'); spins = [...host.querySelectorAll('.rg-spin')]; puff = host.querySelector('.rg-puff');
    st.i = Math.min(st.i, g.stops.length - 1); st.x = g.stops[st.i].x; st.phase = 'dwell'; st.t0 = now(); st.open = false;
    bus.classList.toggle('flip', st.face < 0); bus.classList.add('brake');
    place(st.t0);
  }
  function depart(t) {
    let j = st.i + st.dir;
    if (j < 0 || j >= g.stops.length) { st.dir = -st.dir; j = st.i + st.dir; }
    st.next = j; st.from = st.x; st.to = g.stops[j].x; st.face = st.to >= st.from ? 1 : -1;
    st.T = Math.max(1600, Math.abs(st.to - st.from) / (68 * g.s) * 1000 + 800);
    st.phase = 'move'; st.t0 = t; st.open = false;
    bus.classList.toggle('flip', st.face < 0); bus.classList.remove('brake', 'open');
    if (puff) { puff.classList.remove('go'); try { puff.getBoundingClientRect(); } catch (e) { /* yok */ } puff.classList.add('go'); }
  }
  function tick(t) {
    raf = 0;
    if (dead || !bus) return;
    if (st.phase === 'dwell') {
      const el = t - st.t0, open = el > 380 && el < DWELL - 700;
      if (open !== st.open) { st.open = open; bus.classList.toggle('open', open); }
      if (el >= DWELL && g.stops.length > 1) depart(t);
    } else {
      const k = Math.min(1, (t - st.t0) / st.T), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(2 - 2 * k, 2) / 2;
      const nx = st.from + (st.to - st.from) * e;
      st.d += Math.abs(nx - st.x); st.x = nx;
      if (k >= 1) { st.i = st.next; st.x = st.to; st.phase = 'dwell'; st.t0 = t; bus.classList.add('brake'); }
    }
    place(t);
    loop();
  }
  const loop = () => { if (anim && !raf && !dead && seen && !document.hidden) raf = requestAnimationFrame(tick); };
  const pause = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } if (!paused) paused = now(); };
  const resume = () => { if (paused) { st.t0 += now() - paused; paused = 0; } loop(); };
  const onVis = () => { if (document.hidden) pause(); else if (seen) resume(); };
  const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { if (!dead) build(); }, 120); };
  build();
  if (anim) {
    io = new IntersectionObserver(es => { const v = es[es.length - 1].isIntersecting; if (v === seen) return; seen = v; if (v) resume(); else pause(); }, { rootMargin: '80px' });
    io.observe(host);
    document.addEventListener('visibilitychange', onVis);
  }
  if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(onResize); ro.observe(host); } else window.addEventListener('resize', onResize);
  return () => {
    dead = true; clearTimeout(rt); if (raf) cancelAnimationFrame(raf);
    if (io) io.disconnect(); if (ro) ro.disconnect(); else window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVis);
  };
}
