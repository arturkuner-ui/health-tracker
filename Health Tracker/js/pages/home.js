HT.pages = HT.pages || {};

HT.pages.home = {
  render(el) {
    const { esc, round, dateKey, fmtDate } = HT.util;
    const s = HT.store.get();
    const today = dateKey();
    const tot = HT.store.dayTotals(today);
    const latest = HT.store.latestWeight();
    const targets = latest ? HT.calc.targets(s.profile, latest.kg) : null;
    const goalKcal = targets?.goal.kcal;
    const report = [...s.bloodwork].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
    const counts = report ? HT.pages.health.counts(report.result) : null;
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    el.innerHTML = `
      <div class="page-head">
        <h1>${greet}</h1>
        <p class="muted">${new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>
      ${!HT.claude.hasKey() ? `<div class="notice warn" style="margin-bottom:16px">Bloodwork evaluation and photo calorie counting use Claude. Add your API key in <a href="#/settings">Settings</a> to turn them on. Everything else works without it.</div>` : ''}
      <div class="grid grid-3">
        <a class="card tile" href="#/health">
          <div class="spread"><span class="tile-icon">🩸</span>${counts ? `<span class="pill ${report.result.overall_status}">${{ green: 'Good', yellow: 'Watch', red: 'Attention' }[report.result.overall_status]}</span>` : ''}</div>
          <h2 style="margin-top:10px">Health monitor</h2>
          ${counts ? `
            <p class="muted small">Latest report ${report.date ? fmtDate(report.date) : ''}</p>
            <div class="row small"><span class="pill green">${counts.green} good</span><span class="pill yellow">${counts.yellow} mild</span><span class="pill red">${counts.red} urgent</span></div>`
          : `<p class="muted">Upload a bloodwork PDF and get each marker rated green, yellow or red.</p>`}
        </a>
        <a class="card tile" href="#/food">
          <span class="tile-icon">🍽️</span>
          <h2 style="margin-top:10px">Calorie tracker</h2>
          <div class="big">${round(tot.kcal)}${goalKcal ? ` <span class="muted small">/ ${round(goalKcal)} kcal</span>` : ' <span class="muted small">kcal today</span>'}</div>
          <p class="small muted" style="margin-top:6px">
            <b style="color:var(--protein)">P ${round(tot.protein)}g</b> ·
            <b style="color:var(--carbs)">C ${round(tot.carbs)}g</b> ·
            <b style="color:var(--fat)">F ${round(tot.fat)}g</b>
          </p>
        </a>
        <a class="card tile" href="#/profile">
          <span class="tile-icon">📈</span>
          <h2 style="margin-top:10px">Profile & weight</h2>
          ${latest ? `
            <div class="big">${latest.kg} <span class="muted small">kg</span></div>
            <p class="small muted">Logged ${fmtDate(latest.date)}${targets ? ` · maintenance ${round(targets.maintenance)} kcal` : ''}</p>`
          : `<p class="muted">Enter your stats to get maintenance and bulking calories, then track your weight.</p>`}
        </a>
      </div>
      ${HT.pages.home.weekStrip()}
    `;
  },

  weekStrip() {
    const { dateKey, addDays, round, fmtDate } = HT.util;
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const k = dateKey(addDays(new Date(), -i));
      days.push({ k, t: HT.store.dayTotals(k) });
    }
    const max = Math.max(1, ...days.map(d => d.t.kcal));
    if (!days.some(d => d.t.kcal)) return '';
    return `
      <div class="card" style="margin-top:16px">
        <h2>Last 7 days</h2>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px;align-items:end;height:140px">
          ${days.map(d => `
            <a href="#/food/${d.k}" style="display:flex;flex-direction:column;justify-content:flex-end;height:100%;text-align:center;color:inherit" title="${round(d.t.kcal)} kcal">
              <span class="small muted">${d.t.kcal ? round(d.t.kcal) : ''}</span>
              <span style="display:block;height:${(d.t.kcal / max) * 90}px;background:var(--accent);border-radius:6px 6px 2px 2px;min-height:${d.t.kcal ? 3 : 0}px"></span>
              <span class="small muted">${fmtDate(d.k, { weekday: 'short' })}</span>
            </a>`).join('')}
        </div>
      </div>`;
  },
};
