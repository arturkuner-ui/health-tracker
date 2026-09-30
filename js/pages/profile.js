HT.pages.profile = {
  horizon: 8, // weeks to project on the graph

  render(el) {
    const self = HT.pages.profile;
    const { esc, round, dateKey, fmtDate } = HT.util;
    const s = HT.store.get(), p = s.profile;
    const latest = HT.store.latestWeight();
    const t = latest ? HT.calc.targets(p, latest.kg) : null;
    const opt = (v, cur, label) => `<option value="${v}" ${String(v) === String(cur) ? 'selected' : ''}>${label}</option>`;

    el.innerHTML = `
      <div class="page-head">
        <h1>Profile & weight</h1>
        <p class="muted">Your stats drive the calorie targets used across the app.</p>
      </div>
      <div class="grid grid-2" style="align-items:start">
        <form class="card" id="pform">
          <h2>Your details</h2>
          <div class="fields">
            <div class="field"><label>Sex</label><select name="sex">${opt('male', p.sex, 'Male')}${opt('female', p.sex, 'Female')}</select></div>
            <div class="field"><label>Age</label><input name="age" type="number" min="10" max="100" value="${esc(p.age)}" required></div>
            <div class="field"><label>Height (cm)</label><input name="heightCm" type="number" min="100" max="250" step="0.5" value="${esc(p.heightCm)}" required></div>
            <div class="field"><label>Weight today (kg)</label><input name="weight" type="number" min="30" max="300" step="0.1" placeholder="${latest ? latest.kg : ''}"></div>
          </div>
          <div class="field" style="margin-top:12px"><label>Exercise frequency</label>
            <select name="activity">${Object.entries(HT.calc.ACTIVITY).map(([k, a]) => opt(k, p.activity, a.label)).join('')}</select></div>
          <div class="fields">
            <div class="field"><label>Goal</label><select name="goal">${opt('maintain', p.goal, 'Maintain')}${opt('bulk', p.goal, 'Bulk')}${opt('cut', p.goal, 'Cut')}</select></div>
            <div class="field"><label>Bulk surplus (kcal)</label><input name="bulkSurplus" type="number" min="100" max="1000" step="50" value="${esc(p.bulkSurplus)}"></div>
            <div class="field"><label>Target weight (kg)</label><input name="targetKg" type="number" min="30" max="300" step="0.1" value="${esc(p.targetKg ?? '')}" placeholder="optional"></div>
          </div>
          <button class="primary" style="width:100%;margin-top:14px">Save</button>
          ${latest ? `<p class="small muted" style="margin:8px 0 0">Using your latest weight: ${latest.kg} kg (${fmtDate(latest.date)}).</p>` : ''}
        </form>

        <div class="card">
          <h2>Your calories</h2>
          ${t ? `
            <div class="grid grid-2" style="gap:10px">
              <div class="stat"><div class="l">Maintenance</div><div class="v">${round(t.maintenance)}</div><div class="l">kcal / day</div></div>
              <div class="stat" style="background:var(--green-soft)"><div class="l">Lean bulk (+${round(p.bulkSurplus)})</div><div class="v">${round(t.leanBulk)}</div><div class="l">kcal / day</div></div>
              <div class="stat"><div class="l">Faster bulk (+500)</div><div class="v">${round(t.bulk)}</div><div class="l">kcal / day</div></div>
              <div class="stat"><div class="l">Cut (−500)</div><div class="v">${round(t.cut)}</div><div class="l">kcal / day</div></div>
            </div>
            <p class="small muted" style="margin-top:10px">Resting metabolism (BMR) ${round(t.bmr)} kcal, from the Mifflin-St Jeor equation times your activity factor ${HT.calc.ACTIVITY[p.activity].f}.</p>
            <h3 style="margin-top:14px">Daily goal: ${{ maintain: 'maintain', bulk: 'lean bulk', cut: 'cut' }[p.goal]}</h3>
            <div class="grid grid-3" style="gap:10px">
              <div class="stat"><div class="l">Protein</div><div class="v" style="color:var(--protein)">${round(t.goal.protein)}g</div></div>
              <div class="stat"><div class="l">Carbs</div><div class="v" style="color:var(--carbs)">${round(t.goal.carbs)}g</div></div>
              <div class="stat"><div class="l">Fat</div><div class="v" style="color:var(--fat)">${round(t.goal.fat)}g</div></div>
            </div>
            <p class="small muted" style="margin-top:10px">Protein ${{ maintain: 1.8, bulk: 2.0, cut: 2.2 }[p.goal]} g per kg, fat 25% of calories, carbs make up the rest. The food tracker uses these as your daily goal.</p>`
          : '<p class="muted">Enter your age, height and weight to see your maintenance and bulking calories.</p>'}
        </div>
      </div>

      <div class="card" style="margin-top:16px">
        <div class="spread">
          <h2 style="margin:0">Weight progress</h2>
          <div class="tabs">${[4, 8, 12, 26].map(w => `<button data-h="${w}" class="${self.horizon === w ? 'active' : ''}">${w < 26 ? w + ' wk' : '6 mo'}</button>`).join('')}</div>
        </div>
        <div id="wstats" style="margin:14px 0"></div>
        <div class="chart" id="wchart"></div>
        <div class="legend" style="margin-top:8px">
          <span><i style="background:var(--accent)"></i>Logged weight</span>
          <span><i style="background:var(--green)"></i>Trend prediction</span>
          <span><i style="background:var(--carbs)"></i>Prediction from calories eaten</span>
        </div>
      </div>

      <div class="grid grid-2" style="margin-top:16px;align-items:start">
        <div class="card">
          <h2>Predicted weight</h2>
          <div id="ptable"></div>
          <div class="fields" style="margin-top:14px;align-items:end">
            <div class="field"><label>Predict for a date</label><input type="date" id="pdate" min="${dateKey()}"></div>
            <div class="field"><div id="pdateOut" class="notice small">Pick a future date.</div></div>
          </div>
        </div>
        <div class="card">
          <h2>Log weight</h2>
          <form class="fields" id="wform" style="align-items:end">
            <div class="field"><label>Date</label><input type="date" name="date" value="${dateKey()}" max="${dateKey()}" required></div>
            <div class="field"><label>Weight (kg)</label><input type="number" name="kg" min="30" max="300" step="0.1" required></div>
            <div class="field"><button class="primary" style="width:100%">Add</button></div>
          </form>
          <div id="wlist" style="margin-top:12px"></div>
        </div>
      </div>
    `;

    el.querySelector('#pform').onsubmit = e => {
      e.preventDefault();
      const f = new FormData(e.target);
      HT.store.update(s => {
        Object.assign(s.profile, {
          sex: f.get('sex'), age: +f.get('age'), heightCm: +f.get('heightCm'),
          activity: f.get('activity'), goal: f.get('goal'), bulkSurplus: +f.get('bulkSurplus') || 300,
          targetKg: f.get('targetKg') ? +f.get('targetKg') : null,
        });
      });
      if (f.get('weight')) HT.store.setWeight(dateKey(), +f.get('weight'));
      if (!HT.store.latestWeight()) HT.util.toast('Saved. Add your weight to see calorie targets.');
      else HT.util.toast('Saved');
      self.render(el);
    };
    el.querySelector('#wform').onsubmit = e => {
      e.preventDefault();
      const f = new FormData(e.target);
      HT.store.setWeight(f.get('date'), +f.get('kg'));
      HT.util.toast('Weight logged');
      self.render(el);
    };
    el.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { self.horizon = +b.dataset.h; self.render(el); });
    self.renderWeights(el);
  },

  renderWeights(el) {
    const self = HT.pages.profile;
    const { round, dateKey, addDays, fmtDate, parseKey } = HT.util;
    const s = HT.store.get();
    const ws = HT.store.sortedWeights();
    const trend = HT.calc.trendModel(ws);
    const energy = HT.calc.energyModel(s.profile, ws, s.food);
    const hasEnergy = energy && !energy.insufficient;

    // Chart series
    const end = dateKey(addDays(new Date(), self.horizon * 7));
    const proj = model => {
      if (!model) return [];
      const out = [], start = parseKey(model.baseDate);
      const total = HT.util.daysBetween(model.baseDate, end);
      const step = Math.max(1, Math.round(total / 30));
      for (let i = 0; i <= total; i += step) { const k = dateKey(addDays(start, i)); out.push({ date: k, kg: model.predict(k) }); }
      if (out[out.length - 1]?.date !== end) out.push({ date: end, kg: model.predict(end) });
      return out;
    };
    el.querySelector('#wchart').innerHTML = HT.chart.weight({ actual: ws, trend: proj(trend), energy: hasEnergy ? proj(energy) : [] });

    // Headline stats
    const first = ws[0], last = ws[ws.length - 1];
    const target = s.profile.targetKg;
    let eta = '';
    if (trend && target && last) {
      const rate = trend.slopePerWeek / 7;
      const need = target - trend.predict(last.date);
      if (Math.abs(need) < 0.1) eta = 'At target';
      else if (rate !== 0 && Math.sign(rate) === Math.sign(need)) {
        const days = Math.ceil(need / rate);
        eta = days < 3650 ? fmtDate(dateKey(addDays(parseKey(last.date), days))) : 'Over 10 years away';
      } else eta = 'Trend is moving away from target';
    }
    el.querySelector('#wstats').innerHTML = ws.length ? `
      <div class="grid grid-3" style="gap:10px">
        <div class="stat"><div class="l">Current</div><div class="v">${last.kg} kg</div><div class="l">${fmtDate(last.date)}</div></div>
        <div class="stat"><div class="l">Change since start</div><div class="v">${last.kg - first.kg >= 0 ? '+' : ''}${round(last.kg - first.kg, 1)} kg</div><div class="l">since ${fmtDate(first.date)}</div></div>
        <div class="stat"><div class="l">${target ? `Reach ${target} kg` : 'Weekly trend'}</div>
          <div class="v" style="font-size:${target ? '1.05rem' : '1.5rem'}">${target ? (eta || 'Need more weigh-ins') : trend ? `${trend.slopePerWeek >= 0 ? '+' : ''}${round(trend.slopePerWeek, 2)} kg` : '–'}</div>
          <div class="l">${target ? (trend ? `at ${round(trend.slopePerWeek, 2)} kg/week` : '') : 'per week'}</div></div>
      </div>` : '';

    // Prediction table
    const rows = [1, 2, 4, 8, 12, 26].map(w => {
      const k = dateKey(addDays(new Date(), w * 7));
      return `<tr><td>${w < 26 ? `${w} week${w > 1 ? 's' : ''}` : '6 months'} <span class="muted small">${fmtDate(k, { day: 'numeric', month: 'short' })}</span></td>
        <td class="num">${trend ? round(trend.predict(k), 1) + ' kg' : '–'}</td>
        <td class="num">${hasEnergy ? round(energy.predict(k), 1) + ' kg' : '–'}</td></tr>`;
    }).join('');
    el.querySelector('#ptable').innerHTML = `
      <table><thead><tr><th>When</th><th class="num">By trend</th><th class="num">By calories</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="small muted" style="margin-top:10px">
        <b>By trend</b>: a straight line fitted to your weigh-ins from the last 60 days${trend ? ` (${trend.points} entries)` : ', needs at least 2'}.
        <b>By calories</b>: your average logged intake${hasEnergy ? ` of ${round(energy.avgIntake)} kcal over ${energy.loggedDays} days` : ''} versus your maintenance, where ${HT.calc.KCAL_PER_KG} kcal ≈ 1 kg and maintenance is recalculated as your weight changes${hasEnergy ? '' : '. Needs a profile, a weight, and food logged on at least 3 of the last 14 days'}.
        ${trend && trend.span < 14 ? ' Predictions get more reliable after two or more weeks of weigh-ins.' : ''}
      </p>`;

    const pd = el.querySelector('#pdate'), out = el.querySelector('#pdateOut');
    pd.onchange = () => {
      const k = pd.value;
      if (!k || k < dateKey()) { out.textContent = 'Pick a future date.'; return; }
      if (!trend && !hasEnergy) { out.textContent = 'Log at least two weigh-ins first.'; return; }
      out.innerHTML = [trend && `Trend: <b>${round(trend.predict(k), 1)} kg</b>`, hasEnergy && `Calories: <b>${round(energy.predict(k), 1)} kg</b>`].filter(Boolean).join('<br>');
    };

    // Entry list
    const list = [...ws].reverse();
    el.querySelector('#wlist').innerHTML = list.length ? `
      <table><tbody>${list.slice(0, 12).map((w, i) => {
        const prev = list[i + 1];
        const diff = prev ? w.kg - prev.kg : null;
        return `<tr><td>${fmtDate(w.date)}</td><td class="num"><b>${w.kg}</b> kg</td>
          <td class="num small" style="color:${diff == null ? 'var(--muted)' : diff > 0 ? 'var(--carbs)' : 'var(--green)'}">${diff == null ? '' : (diff > 0 ? '+' : '') + round(diff, 1)}</td>
          <td class="num"><button class="small ghost danger" data-wdel="${w.date}">✕</button></td></tr>`;
      }).join('')}</tbody></table>
      ${list.length > 12 ? `<p class="small muted">Showing the latest 12 of ${list.length} entries.</p>` : ''}` : '<p class="muted">No weigh-ins yet.</p>';
    el.querySelectorAll('[data-wdel]').forEach(b => b.onclick = () => { HT.store.removeWeight(b.dataset.wdel); self.render(el); });
  },
};
