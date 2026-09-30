HT.pages.food = {
  day: null,          // selected day key
  month: null,        // Date for the first of the displayed calendar month
  tab: 'search',
  aiItems: null,      // pending AI estimate for review
  aiNotes: '',
  photo: null,        // { dataUrl, base64, mediaType }

  render(el, param) {
    const self = HT.pages.food;
    const { dateKey, parseKey } = HT.util;
    self.day = param && /^\d{4}-\d{2}-\d{2}$/.test(param) && param <= dateKey() ? param : dateKey();
    const d = parseKey(self.day);
    self.month = new Date(d.getFullYear(), d.getMonth(), 1);

    el.innerHTML = `
      <div class="page-head">
        <h1>Calorie tracker</h1>
        <p class="muted">Each day starts fresh at midnight. Past days are kept in the calendar below.</p>
      </div>
      <div class="grid grid-2" style="align-items:start">
        <div class="card" id="daySummary"></div>
        <div class="card" id="addFood"></div>
      </div>
      <div class="card" style="margin-top:16px" id="calendar"></div>
    `;
    self.renderSummary(el);
    self.renderAdd(el);
    self.renderCalendar(el);
  },

  goal() {
    const s = HT.store.get(), w = HT.store.latestWeight();
    return w ? HT.calc.targets(s.profile, w.kg)?.goal : null;
  },

  renderSummary(el) {
    const self = HT.pages.food;
    const { esc, round, fmtDate, dateKey, addDays, parseKey } = HT.util;
    const box = el.querySelector('#daySummary');
    const items = HT.store.foodFor(self.day);
    const t = HT.store.dayTotals(self.day);
    const g = self.goal();
    const isToday = self.day === dateKey();
    const bar = (label, val, goal, color) => `
      <div class="macro">
        <div class="spread small"><b>${label}</b><span>${round(val)}${goal ? ` / ${round(goal)}` : ''} g</span></div>
        <div class="macro-bar"><span style="width:${goal ? Math.min(100, (val / goal) * 100) : Math.min(100, val)}%;background:${color}"></span></div>
      </div>`;
    const pct = g ? Math.min(1, t.kcal / g.kcal) : 0;
    const over = g && t.kcal > g.kcal * 1.05;
    const macroKcal = t.protein * 4 + t.carbs * 4 + t.fat * 9 || 1;

    box.innerHTML = `
      <div class="spread">
        <button class="small ghost" data-nav="-1">‹</button>
        <div style="text-align:center">
          <h2 style="margin:0">${isToday ? 'Today' : fmtDate(self.day, { weekday: 'long', day: 'numeric', month: 'short' })}</h2>
          ${!isToday ? `<a href="#/food" class="small">Back to today</a>` : ''}
        </div>
        <button class="small ghost" data-nav="1" ${isToday ? 'disabled' : ''}>›</button>
      </div>
      <div class="kcal-ring" style="margin:16px 0">
        <svg width="110" height="110" viewBox="0 0 110 110">
          <circle cx="55" cy="55" r="46" fill="none" stroke="var(--surface-2)" stroke-width="10"/>
          <circle cx="55" cy="55" r="46" fill="none" stroke="${over ? 'var(--red)' : 'var(--green)'}" stroke-width="10"
            stroke-dasharray="${(2 * Math.PI * 46 * pct).toFixed(1)} 999" transform="rotate(-90 55 55)" stroke-linecap="round"/>
          <text x="55" y="54" text-anchor="middle" font-size="20" font-weight="800" fill="var(--text)">${round(t.kcal)}</text>
          <text x="55" y="72" text-anchor="middle" font-size="11" fill="var(--muted)">kcal</text>
        </svg>
        <div>
          ${g ? `<div><b>${round(Math.abs(g.kcal - t.kcal))}</b> kcal ${t.kcal <= g.kcal ? 'left' : 'over'}</div><div class="small muted">Goal ${round(g.kcal)} kcal (${HT.store.get().profile.goal === 'bulk' ? 'bulking' : HT.store.get().profile.goal === 'cut' ? 'cutting' : 'maintenance'})</div>`
            : `<div class="small muted">Fill in your <a href="#/profile">profile</a> to get a daily calorie and macro goal.</div>`}
          <div class="small muted" style="margin-top:6px">Split: P ${round(t.protein * 400 / macroKcal)}% · C ${round(t.carbs * 400 / macroKcal)}% · F ${round(t.fat * 900 / macroKcal)}%</div>
        </div>
      </div>
      ${bar('Protein', t.protein, g?.protein, 'var(--protein)')}
      ${bar('Carbs', t.carbs, g?.carbs, 'var(--carbs)')}
      ${bar('Fat', t.fat, g?.fat, 'var(--fat)')}
      <h3 style="margin-top:18px">Foods (${items.length})</h3>
      ${items.length ? `<ul class="food-list">${items.map(f => `
        <li>
          <div style="flex:1;min-width:0">
            <div><b>${esc(f.name)}</b> ${f.grams ? `<span class="muted small">${round(f.grams)} g</span>` : ''} ${f.source === 'photo' ? '<span title="From photo">📷</span>' : f.source === 'ai' ? '<span title="Estimated by Claude">✨</span>' : ''}</div>
            <div class="food-meta">${esc(f.time || '')} · P ${round(f.protein, 1)}g · C ${round(f.carbs, 1)}g · F ${round(f.fat, 1)}g</div>
          </div>
          <b class="num">${round(f.kcal)}</b>
          <button class="small ghost danger" data-rm="${f.id}" title="Remove">✕</button>
        </li>`).join('')}</ul>` : '<p class="muted">Nothing logged yet.</p>'}
    `;
    box.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => {
      location.hash = '#/food/' + dateKey(addDays(parseKey(self.day), +b.dataset.nav));
    });
    box.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => {
      HT.store.removeFood(self.day, b.dataset.rm);
      self.renderSummary(el); self.renderCalendar(el);
    });
  },

  added(el, n = 1) {
    const self = HT.pages.food;
    HT.util.toast(n > 1 ? `Added ${n} foods` : 'Added');
    self.renderSummary(el); self.renderCalendar(el);
  },

  renderAdd(el) {
    const self = HT.pages.food;
    const { esc, round, fmtDate, dateKey } = HT.util;
    const box = el.querySelector('#addFood');
    const tabs = { search: 'Search', manual: 'Manual', photo: 'Photo', describe: 'Describe' };
    box.innerHTML = `
      <div class="spread" style="margin-bottom:14px">
        <h2 style="margin:0">Add food${self.day !== dateKey() ? ` <span class="muted small">to ${fmtDate(self.day, { day: 'numeric', month: 'short' })}</span>` : ''}</h2>
        <div class="tabs">${Object.entries(tabs).map(([k, v]) => `<button data-tab="${k}" class="${self.tab === k ? 'active' : ''}">${v}</button>`).join('')}</div>
      </div>
      <div id="tabBody"></div>`;
    box.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { self.tab = b.dataset.tab; self.renderAdd(el); });
    const body = box.querySelector('#tabBody');
    self['tab_' + self.tab](body, el);
  },

  // --- Search the built-in food list, enter grams, macros are calculated.
  tab_search(body, el) {
    const self = HT.pages.food;
    const { esc, round } = HT.util;
    let chosen = null;
    body.innerHTML = `
      <div class="field suggest">
        <label>Food</label>
        <input id="q" placeholder="e.g. chicken breast, oats, banana" autocomplete="off">
        <div class="suggest-list hidden" id="sugg"></div>
      </div>
      <div class="fields">
        <div class="field"><label>Weight (g)</label><input id="g" type="number" min="0" step="1"></div>
      </div>
      <div id="preview" class="notice small" style="margin:12px 0">Pick a food to see its calories and macros.</div>
      <button class="primary" id="add" disabled style="width:100%">Add</button>
      <p class="small muted" style="margin-top:10px">Not in the list? Use Manual, or Describe to have Claude estimate it.</p>`;
    const q = body.querySelector('#q'), sugg = body.querySelector('#sugg'), g = body.querySelector('#g');
    const calc = () => {
      if (!chosen) return null;
      const grams = +g.value || 0, k = grams / 100;
      return { name: chosen.name, grams, kcal: chosen.kcal * k, protein: chosen.protein * k, carbs: chosen.carbs * k, fat: chosen.fat * k, source: 'db' };
    };
    const update = () => {
      const c = calc();
      body.querySelector('#add').disabled = !c || !c.grams;
      body.querySelector('#preview').innerHTML = c
        ? `<b>${esc(c.name)}</b>, ${round(c.grams)} g: <b>${round(c.kcal)} kcal</b> · P ${round(c.protein, 1)}g · C ${round(c.carbs, 1)}g · F ${round(c.fat, 1)}g`
        : 'Pick a food to see its calories and macros.';
    };
    q.oninput = () => {
      chosen = null; update();
      const res = HT.foods.search(q.value);
      sugg.classList.toggle('hidden', !res.length);
      sugg.innerHTML = res.map((f, i) => `<div data-i="${i}">${esc(f.name)} <span class="muted small">${f.kcal} kcal/100g</span></div>`).join('');
      sugg.querySelectorAll('[data-i]').forEach(d => d.onclick = () => {
        chosen = res[+d.dataset.i];
        q.value = chosen.name; g.value = chosen.unit;
        sugg.classList.add('hidden'); update(); g.focus(); g.select();
      });
    };
    g.oninput = update;
    body.querySelector('#add').onclick = () => {
      const c = calc(); if (!c) return;
      HT.store.addFood(self.day, c);
      q.value = ''; g.value = ''; chosen = null; update();
      self.added(el);
    };
  },

  // --- Type everything in by hand. Calories fill in from macros if left blank.
  tab_manual(body, el) {
    const self = HT.pages.food;
    body.innerHTML = `
      <div class="field"><label>Food name</label><input id="n" placeholder="e.g. Homemade chili"></div>
      <div class="fields">
        <div class="field"><label>Weight (g)</label><input id="g" type="number" min="0"></div>
        <div class="field"><label>Calories (kcal)</label><input id="k" type="number" min="0" placeholder="auto"></div>
      </div>
      <div class="fields" style="margin-top:12px">
        <div class="field"><label>Protein (g)</label><input id="p" type="number" min="0" step="0.1"></div>
        <div class="field"><label>Carbs (g)</label><input id="c" type="number" min="0" step="0.1"></div>
        <div class="field"><label>Fat (g)</label><input id="f" type="number" min="0" step="0.1"></div>
      </div>
      <label style="margin-top:12px;display:flex;gap:8px;align-items:center;color:var(--text)"><input type="checkbox" id="per100" style="width:auto"> Values above are per 100 g (scale by weight)</label>
      <button class="primary" id="add" style="width:100%;margin-top:12px">Add</button>`;
    const v = id => body.querySelector('#' + id).value;
    body.querySelector('#add').onclick = () => {
      const name = v('n').trim();
      if (!name) return HT.util.toast('Give the food a name.');
      let p = +v('p') || 0, c = +v('c') || 0, f = +v('f') || 0, k = v('k') === '' ? null : +v('k');
      const grams = +v('g') || 0;
      if (body.querySelector('#per100').checked) {
        if (!grams) return HT.util.toast('Enter the weight to scale per-100 g values.');
        const m = grams / 100; p *= m; c *= m; f *= m; if (k != null) k *= m;
      }
      if (k == null) k = p * 4 + c * 4 + f * 9;
      if (!k && !p && !c && !f) return HT.util.toast('Enter calories or at least one macro.');
      HT.store.addFood(self.day, { name, grams, kcal: k, protein: p, carbs: c, fat: f, source: 'manual' });
      body.querySelectorAll('input').forEach(i => i.type === 'checkbox' ? (i.checked = false) : (i.value = ''));
      self.added(el);
    };
  },

  // --- Take or upload a photo; Claude estimates each food; you review before adding.
  tab_photo(body, el) {
    const self = HT.pages.food;
    body.innerHTML = `
      ${!HT.claude.hasKey() ? `<div class="notice warn small" style="margin-bottom:12px">Photo recognition needs a Claude API key. <a href="#/settings">Add it in Settings.</a></div>` : ''}
      <input type="file" id="cam" accept="image/*" capture="environment" hidden>
      <input type="file" id="lib" accept="image/*" hidden>
      <div class="row" style="margin-bottom:12px">
        <button id="takeBtn">📷 Take photo</button>
        <button id="libBtn">🖼️ Choose image</button>
      </div>
      ${self.photo ? `<img class="photo-preview" src="${self.photo.dataUrl}" alt="Meal photo">` : '<div class="dropzone" id="pdrop">Drop a meal photo here</div>'}
      <div class="field" style="margin-top:12px"><label>Anything Claude should know? (optional)</label><input id="hint" placeholder="e.g. cooked in butter, large plate, 2 eggs"></div>
      <button class="primary" id="analyze" style="width:100%" ${self.photo ? '' : 'disabled'}>Estimate calories</button>
      <div id="review"></div>`;
    const load = async f => {
      if (!f) return;
      try { self.photo = await HT.util.resizeImage(f); self.aiItems = null; self.renderAdd(el); }
      catch (e) { HT.util.toast(e.message); }
    };
    body.querySelector('#takeBtn').onclick = () => body.querySelector('#cam').click();
    body.querySelector('#libBtn').onclick = () => body.querySelector('#lib').click();
    body.querySelector('#cam').onchange = e => load(e.target.files[0]);
    body.querySelector('#lib').onchange = e => load(e.target.files[0]);
    const pd = body.querySelector('#pdrop');
    if (pd) {
      pd.onclick = () => body.querySelector('#lib').click();
      pd.ondragover = e => { e.preventDefault(); pd.classList.add('over'); };
      pd.ondragleave = () => pd.classList.remove('over');
      pd.ondrop = e => { e.preventDefault(); load(e.dataTransfer.files[0]); };
    }
    body.querySelector('#analyze').onclick = async () => {
      const btn = body.querySelector('#analyze');
      btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Looking at your meal…';
      try {
        const r = await HT.claude.estimateFromPhoto(self.photo.base64, self.photo.mediaType, body.querySelector('#hint').value.trim());
        self.aiItems = r.items; self.aiNotes = r.notes; self.aiSource = 'photo';
        self.renderReview(body.querySelector('#review'), el);
      } catch (e) { HT.util.toast(e.message, 5000); }
      btn.disabled = false; btn.textContent = 'Estimate calories';
    };
    if (self.aiItems && self.aiSource === 'photo') self.renderReview(body.querySelector('#review'), el);
  },

  // --- Describe a meal in words; Claude estimates it.
  tab_describe(body, el) {
    const self = HT.pages.food;
    body.innerHTML = `
      ${!HT.claude.hasKey() ? `<div class="notice warn small" style="margin-bottom:12px">This needs a Claude API key. <a href="#/settings">Add it in Settings.</a></div>` : ''}
      <div class="field"><label>What did you eat?</label>
        <textarea id="desc" rows="3" placeholder="e.g. 200g grilled chicken, a cup of rice, a tablespoon of olive oil and a side salad"></textarea></div>
      <button class="primary" id="go" style="width:100%">Estimate</button>
      <div id="review"></div>`;
    body.querySelector('#go').onclick = async () => {
      const text = body.querySelector('#desc').value.trim();
      if (!text) return HT.util.toast('Describe the meal first.');
      const btn = body.querySelector('#go');
      btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Estimating…';
      try {
        const r = await HT.claude.estimateFromText(text);
        self.aiItems = r.items; self.aiNotes = r.notes; self.aiSource = 'ai';
        self.renderReview(body.querySelector('#review'), el);
      } catch (e) { HT.util.toast(e.message, 5000); }
      btn.disabled = false; btn.textContent = 'Estimate';
    };
    if (self.aiItems && self.aiSource === 'ai') self.renderReview(body.querySelector('#review'), el);
  },

  // Editable table of Claude's estimate. Changing grams rescales that row's numbers.
  renderReview(box, el) {
    const self = HT.pages.food;
    const { esc, round } = HT.util;
    const items = self.aiItems || [];
    if (!items.length) { box.innerHTML = `<p class="notice small" style="margin-top:12px">${esc(self.aiNotes || 'No food found.')}</p>`; return; }
    box.innerHTML = `
      <h3 style="margin-top:16px">Check and adjust</h3>
      ${self.aiNotes ? `<p class="small muted">${esc(self.aiNotes)}</p>` : ''}
      <div style="overflow-x:auto"><table>
        <thead><tr><th></th><th>Food</th><th class="num">g</th><th class="num">kcal</th><th class="num">P</th><th class="num">C</th><th class="num">F</th></tr></thead>
        <tbody>${items.map((it, i) => `
          <tr data-row="${i}">
            <td><input type="checkbox" data-k="on" checked style="width:auto"></td>
            <td><input data-k="name" value="${esc(it.name)}" style="min-width:120px"></td>
            ${['grams', 'kcal', 'protein', 'carbs', 'fat'].map(k => `<td><input data-k="${k}" type="number" step="0.1" value="${round(it[k], 1)}" style="width:70px"></td>`).join('')}
          </tr>`).join('')}</tbody>
      </table></div>
      <button class="primary" id="addAll" style="width:100%;margin-top:12px">Add selected</button>`;
    box.querySelectorAll('[data-k="grams"]').forEach(inp => {
      inp.dataset.prev = inp.value;
      inp.onchange = () => {
        const prev = +inp.dataset.prev, now = +inp.value;
        if (prev > 0 && now >= 0) {
          const row = inp.closest('tr'), m = now / prev;
          ['kcal', 'protein', 'carbs', 'fat'].forEach(k => { const f = row.querySelector(`[data-k="${k}"]`); f.value = round(+f.value * m, 1); });
        }
        inp.dataset.prev = inp.value;
      };
    });
    box.querySelector('#addAll').onclick = () => {
      let n = 0;
      box.querySelectorAll('tr[data-row]').forEach(row => {
        if (!row.querySelector('[data-k="on"]').checked) return;
        const val = k => row.querySelector(`[data-k="${k}"]`).value;
        HT.store.addFood(self.day, {
          name: val('name') || 'Food', grams: +val('grams') || 0, kcal: +val('kcal') || 0,
          protein: +val('protein') || 0, carbs: +val('carbs') || 0, fat: +val('fat') || 0, source: self.aiSource,
        });
        n++;
      });
      if (!n) return HT.util.toast('Nothing selected.');
      self.aiItems = null; self.photo = null;
      self.renderAdd(el);
      self.added(el, n);
    };
  },

  renderCalendar(el) {
    const self = HT.pages.food;
    const { dateKey, round } = HT.util;
    const box = el.querySelector('#calendar');
    const m = self.month, y = m.getFullYear(), mo = m.getMonth();
    const first = new Date(y, mo, 1);
    const lead = (first.getDay() + 6) % 7; // Monday first
    const daysIn = new Date(y, mo + 1, 0).getDate();
    const today = dateKey(), g = self.goal();
    const monthKeys = [];
    let cells = '';
    for (let i = 0; i < lead; i++) cells += '<div class="day empty"></div>';
    for (let d = 1; d <= daysIn; d++) {
      const k = dateKey(new Date(y, mo, d));
      const t = HT.store.dayTotals(k), has = HT.store.foodFor(k).length > 0;
      if (has) monthKeys.push(t);
      let cls = '';
      if (has && g) cls = t.kcal > g.kcal * 1.05 ? 'over' : t.kcal >= g.kcal * 0.9 ? 'near' : 'under';
      const future = k > today;
      cells += `<div class="day ${has ? 'has ' + cls : ''} ${k === today ? 'today' : ''} ${k === self.day ? 'selected' : ''}" ${future ? 'style="opacity:.4;cursor:default"' : `data-day="${k}"`}>
        <span>${d}</span>${has ? `<span class="kc">${round(t.kcal)}</span><span class="muted" style="font-size:.7rem">P${round(t.protein)}</span>` : ''}
      </div>`;
    }
    const avg = monthKeys.length ? monthKeys.reduce((a, t) => ({ kcal: a.kcal + t.kcal, protein: a.protein + t.protein }), { kcal: 0, protein: 0 }) : null;
    box.innerHTML = `
      <div class="spread" style="margin-bottom:12px">
        <button class="small ghost" data-m="-1">‹</button>
        <h2 style="margin:0">${m.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
        <button class="small ghost" data-m="1">›</button>
      </div>
      <div class="cal">
        ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<div class="dow">${d}</div>`).join('')}
        ${cells}
      </div>
      <div class="spread small muted" style="margin-top:12px">
        <span>${avg ? `${monthKeys.length} days logged · avg ${round(avg.kcal / monthKeys.length)} kcal, ${round(avg.protein / monthKeys.length)} g protein` : 'No days logged this month.'}</span>
        ${g ? `<span class="legend"><span><i style="background:var(--green)"></i>under goal</span><span><i style="background:var(--yellow)"></i>on target</span><span><i style="background:var(--red)"></i>over</span></span>` : ''}
      </div>`;
    box.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
      self.month = new Date(y, mo + +b.dataset.m, 1); self.renderCalendar(el);
    });
    box.querySelectorAll('[data-day]').forEach(c => c.onclick = () => { location.hash = '#/food/' + c.dataset.day; });
  },
};
