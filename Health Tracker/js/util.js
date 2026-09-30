// Small shared helpers. Everything hangs off window.HT so plain <script> tags work from file://.
window.HT = window.HT || {};

HT.util = {
  esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  // Local-date key "YYYY-MM-DD" (not UTC, so the day resets at local midnight).
  dateKey(d = new Date()) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },
  parseKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  },
  addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; },
  daysBetween(a, b) { return Math.round((HT.util.parseKey(b) - HT.util.parseKey(a)) / 86400000); },
  fmtDate(key, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
    return HT.util.parseKey(key).toLocaleDateString(undefined, opts);
  },
  round(n, dp = 0) { const f = 10 ** dp; return Math.round((Number(n) || 0) * f) / f; },
  uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },
  toast(msg, ms = 2600) {
    const el = document.getElementById('toast');
    el.textContent = msg; el.hidden = false;
    clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true; }, ms);
  },
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1]);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  },
  // Downscale a photo before sending it to the API (keeps requests small and fast).
  resizeImage(file, maxSide = 1280, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        const dataUrl = c.toDataURL('image/jpeg', quality);
        resolve({ dataUrl, base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' });
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image.')); };
      img.src = url;
    });
  },
  h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; },
};
