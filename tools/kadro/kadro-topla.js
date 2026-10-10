// YediWiki: Yeditepe akademik kadro toplayıcı. https://yeditepe.edu.tr/tr sayfasında tarayıcı konsoluna yapıştırılır.
// Her hocanın sayfasını (/tr/akademik-kadro/<no>) sırayla açar; ad, unvan, fakülte, bölüm ve verdiği dersleri
// yeditepe-kadro.json dosyasına yazar. E-posta, telefon ve fotoğraf alınmaz. Durdurmak için: window.kadroDur = true
(async () => {
  if (location.origin !== 'https://yeditepe.edu.tr') { console.error('Önce https://yeditepe.edu.tr/tr adresini aç, kodu orada çalıştır.'); return; }
  const BLOCK = /^(ADDRESS|ARTICLE|ASIDE|BLOCKQUOTE|BR|DD|DIV|DL|DT|FIGCAPTION|FIGURE|H[1-6]|HEADER|HR|LI|MAIN|OL|P|PRE|SECTION|TABLE|TBODY|TFOOT|THEAD|TR|UL)$/;
  const CONTACT = /@|\[at\]|mailto:|e-?posta|e-?mail|telefon|phone|\bfaks\b|\bfax\b|dahili|\bofis\b|\boffice\b|yeditepe\.edu\.tr/i;
  const PHONE = /(\+?90[\s-]*)?\(?0?\d{3}\)?[\s-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  function lines(root) {
    const out = []; let cur = '';
    const flush = () => { const t = cur.replace(/\s+/g, ' ').trim(); if (t) out.push(t); cur = ''; };
    (function walk(n) {
      for (const c of n.childNodes) {
        if (c.nodeType === 3) { cur += c.nodeValue; continue; }
        if (c.nodeType !== 1) continue;
        if (c.tagName === 'TD' || c.tagName === 'TH') { walk(c); cur += ' | '; continue; }
        const b = BLOCK.test(c.tagName);
        if (b) flush();
        walk(c);
        if (b) flush(); else cur += ' ';
      }
    })(root);
    flush();
    return out.map(l => l.replace(/(\s*\|\s*)+$/, '').trim()).filter(Boolean);
  }
  function clean(ls) {
    const out = [];
    for (let i = 0; i < ls.length; i++) {
      const l = ls[i];
      if (CONTACT.test(l) || PHONE.test(l)) { const nx = ls[i + 1] || ''; if (nx.length < 60 && /\d|@|\[at\]/.test(nx)) i++; continue; }
      out.push(l.slice(0, 400));
    }
    return out;
  }
  const pages = [], errs = [];
  async function grab(id, tries = 0) {
    try {
      const r = await fetch('/tr/akademik-kadro/' + id, { credentials: 'same-origin' });
      if (r.status === 429 || r.status >= 500) throw new Error('durum ' + r.status);
      if (!r.ok || !new URL(r.url).pathname.endsWith('/akademik-kadro/' + id)) return null;
      const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
      doc.querySelectorAll('script,style,noscript,svg,iframe,template,nav,footer,form,img,picture,video').forEach(e => e.remove());
      const ls = clean(lines(doc.body));
      return ls.length ? { id, t: (doc.title || '').trim(), lines: ls } : null;
    } catch (e) {
      if (tries < 3) { await sleep(2000 * (tries + 1)); return grab(id, tries + 1); }
      errs.push(id); return null;
    }
  }
  let next = 1, last = 0, done = 0;
  const GAP = 800, CAP = 9000, t0 = Date.now();
  async function worker() {
    while (!window.kadroDur) {
      const id = next++;
      if (id > CAP || id > last + GAP) return;
      const p = await grab(id);
      if (p) { pages.push(p); if (id > last) last = id; }
      if (++done % 100 === 0) { console.log(`kadro: ${done} sayfa denendi, ${pages.length} hoca bulundu (${Math.round((Date.now() - t0) / 1000)} sn)`); document.title = `${pages.length} hoca…`; }
      await sleep(150);
    }
  }
  console.log('kadro: başladı. Sekmeyi kapatma; bitince dosya iner.');
  await Promise.all([worker(), worker(), worker()]);
  // her sayfada tekrar eden menü ve alt bilgi satırlarını at; hocanın kendi bilgisinin olduğu aralık kalsın
  const df = new Map();
  for (const p of pages) for (const l of new Set(p.lines)) df.set(l, (df.get(l) || 0) + 1);
  const lim = Math.max(20, pages.length * 0.6);
  for (const p of pages) {
    const u = p.lines.map(l => (df.get(l) || 0) < lim), a = u.indexOf(true), b = u.lastIndexOf(true);
    p.lines = a < 0 ? [] : p.lines.slice(a, b + 1);
  }
  const keep = pages.filter(p => p.lines.length).sort((x, y) => x.id - y.id);
  const frame = [...df].filter(([, n]) => n >= lim).sort((x, y) => y[1] - x[1]).slice(0, 300);
  const out = { v: 1, at: new Date().toISOString(), denenen: done, son: last, hata: errs, kadro: keep, ortak: frame };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: 'application/json' }));
  a.download = 'yeditepe-kadro.json';
  document.body.appendChild(a); a.click();
  console.log(`kadro: bitti. ${keep.length} hoca, ${errs.length} hata. yeditepe-kadro.json indirildi; dosyayı sohbete sürükle.`);
  document.title = 'Kadro bitti';
})();
