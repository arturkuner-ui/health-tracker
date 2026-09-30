HT.pages.health = {
  pendingFile: null,
  selectedId: null,
  filter: 'all',

  counts(result) {
    const c = { green: 0, yellow: 0, red: 0 };
    for (const m of result.markers || []) c[m.status] = (c[m.status] || 0) + 1;
    return c;
  },

  render(el) {
    const { esc, fmtDate } = HT.util;
    const s = HT.store.get();
    const reports = [...s.bloodwork].sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.createdAt - a.createdAt);
    const self = HT.pages.health;
    if (!reports.find(r => r.id === self.selectedId)) self.selectedId = reports[0]?.id || null;
    const current = reports.find(r => r.id === self.selectedId);

    el.innerHTML = `
      <div class="page-head">
        <h1>Health monitor</h1>
        <p class="muted">Upload your bloodwork as a PDF and Claude will rate each marker.</p>
      </div>
      <div class="grid grid-2" style="align-items:start">
        <div class="card">
          <h2>New report</h2>
          <div class="dropzone" id="drop">
            <input type="file" id="pdf" accept="application/pdf" hidden>
            <div style="font-size:1.8rem">📄</div>
            <div id="dropText">${self.pendingFile ? esc(self.pendingFile.name) : 'Drop a PDF here or click to choose'}</div>
          </div>
          <button class="primary" id="evalBtn" style="width:100%;margin-top:12px" ${self.pendingFile ? '' : 'disabled'}>Evaluate my health</button>
          ${!HT.claude.hasKey() ? `<p class="small muted" style="margin-top:8px">Needs a Claude API key. <a href="#/settings">Add it in Settings.</a></p>` : ''}
        </div>
        <div class="card">
          <h2>Past reports</h2>
          ${reports.length ? `<ul class="food-list">${reports.map(r => {
            const c = self.counts(r.result);
            return `<li>
              <a href="#" data-open="${r.id}" style="color:inherit;flex:1">
                <b>${r.date ? fmtDate(r.date) : 'Undated'}</b> ${r.id === self.selectedId ? '<span class="pill" style="background:var(--accent-soft);color:var(--accent)">viewing</span>' : ''}
                <div class="food-meta">${esc(r.fileName)} · ${c.green} good, ${c.yellow} mild, ${c.red} urgent</div>
              </a>
              <button class="small ghost danger" data-del="${r.id}" title="Delete">✕</button>
            </li>`;
          }).join('')}</ul>` : '<p class="muted">No reports yet.</p>'}
        </div>
      </div>
      <div id="result" style="margin-top:16px">${current ? self.renderResult(current) : ''}</div>
      <p class="notice small" style="margin-top:16px">This evaluation is for information only and is not medical advice. Always discuss your results with a doctor, especially anything marked red.</p>
    `;

    const drop = el.querySelector('#drop'), input = el.querySelector('#pdf');
    const pick = f => {
      if (!f) return;
      if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) return HT.util.toast('Please choose a PDF file.');
      if (f.size > 30 * 1024 * 1024) return HT.util.toast('That PDF is over 30 MB, which is too large to send.');
      self.pendingFile = f;
      el.querySelector('#dropText').textContent = f.name;
      el.querySelector('#evalBtn').disabled = false;
    };
    drop.onclick = () => input.click();
    input.onchange = () => pick(input.files[0]);
    drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
    drop.ondragleave = () => drop.classList.remove('over');
    drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); pick(e.dataTransfer.files[0]); };

    el.querySelector('#evalBtn').onclick = () => self.evaluate(el);
    el.querySelectorAll('[data-open]').forEach(a => a.onclick = e => { e.preventDefault(); self.selectedId = a.dataset.open; self.render(el); });
    el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      if (!confirm('Delete this report?')) return;
      HT.store.update(s => { s.bloodwork = s.bloodwork.filter(r => r.id !== b.dataset.del); });
      self.render(el);
    });
    el.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => { self.filter = b.dataset.filter; self.render(el); });
  },

  async evaluate(el) {
    const self = HT.pages.health, btn = el.querySelector('#evalBtn');
    const f = self.pendingFile;
    if (!f) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Reading your report…';
    try {
      const b64 = await HT.util.fileToBase64(f);
      const result = await HT.claude.evaluateBloodwork(b64, HT.store.get().profile);
      const date = /^\d{4}-\d{2}-\d{2}$/.test(result.test_date) ? result.test_date : HT.util.dateKey();
      const id = HT.util.uid();
      HT.store.update(s => s.bloodwork.push({ id, date, fileName: f.name, createdAt: Date.now(), result }));
      self.pendingFile = null; self.selectedId = id; self.filter = 'all';
      self.render(el);
      el.querySelector('#result').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
      HT.util.toast(e.message, 5000);
      btn.disabled = false;
      btn.textContent = 'Evaluate my health';
    }
  },

  renderResult(report) {
    const { esc } = HT.util;
    const self = HT.pages.health;
    const r = report.result, c = self.counts(r);
    const order = { red: 0, yellow: 1, green: 2 };
    const markers = (r.markers || [])
      .filter(m => self.filter === 'all' || m.status === self.filter)
      .sort((a, b) => order[a.status] - order[b.status] || a.category.localeCompare(b.category));
    const label = { green: 'Good', yellow: 'Mild', red: 'Immediate attention' };

    return `
      <div class="card stack">
        <div class="spread"><h2 style="margin:0">Results</h2><span class="pill ${r.overall_status}">Overall: ${label[r.overall_status]}</span></div>
        <div class="counts">
          <div class="count green"><div class="n">${c.green}</div>Good</div>
          <div class="count yellow"><div class="n">${c.yellow}</div>Mild</div>
          <div class="count red"><div class="n">${c.red}</div>Immediate attention</div>
        </div>
        <p>${esc(r.summary)}</p>
        ${r.key_actions?.length ? `<div><h3>What to do next</h3><ol style="margin:0;padding-left:20px">${r.key_actions.map(a => `<li>${esc(a)}</li>`).join('')}</ol></div>` : ''}
      </div>
      <div class="spread" style="margin:20px 0 12px">
        <h2 style="margin:0">Markers</h2>
        <div class="tabs">
          ${['all', 'red', 'yellow', 'green'].map(f => `<button data-filter="${f}" class="${self.filter === f ? 'active' : ''}">${{ all: 'All', red: 'Red', yellow: 'Yellow', green: 'Green' }[f]}</button>`).join('')}
        </div>
      </div>
      <div class="grid grid-2">
        ${markers.map(m => `
          <div class="card marker ${m.status}">
            <div class="spread">
              <div><b>${esc(m.name)}</b> <span class="muted small">· ${esc(m.category)}</span></div>
              <span class="pill ${m.status}" style="white-space:nowrap">${{ green: 'Good', yellow: 'Mild', red: 'Urgent' }[m.status]}</span>
            </div>
            <div class="row" style="margin:6px 0">
              <span class="value">${esc(m.value)} ${esc(m.unit)}</span>
              ${m.reference_range ? `<span class="muted small">range ${esc(m.reference_range)}</span>` : ''}
            </div>
            <p class="small">${esc(m.explanation)}</p>
            ${m.recommendation ? `<p class="small muted" style="margin:0"><b>Tip:</b> ${esc(m.recommendation)}</p>` : ''}
          </div>`).join('') || '<p class="muted">No markers in this group.</p>'}
      </div>`;
  },
};
