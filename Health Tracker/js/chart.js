// Tiny dependency-free SVG line chart for weight over time.
HT.chart = {
  weight(series) {
    // series: { actual: [{date, kg}], trend: [{date, kg}], energy: [{date, kg}] }
    const all = [...series.actual, ...(series.trend || []), ...(series.energy || [])];
    if (!all.length) return '<p class="muted">Log your weight to see the graph.</p>';
    const W = 720, H = 300, L = 44, R = 16, T = 14, B = 34;
    const t = d => HT.util.parseKey(d).getTime();
    let x0 = Math.min(...all.map(p => t(p.date))), x1 = Math.max(...all.map(p => t(p.date)));
    if (x0 === x1) { x0 -= 3 * 864e5; x1 += 3 * 864e5; }
    let y0 = Math.min(...all.map(p => p.kg)), y1 = Math.max(...all.map(p => p.kg));
    const pad = Math.max(0.5, (y1 - y0) * 0.12);
    y0 = Math.floor(y0 - pad); y1 = Math.ceil(y1 + pad);
    const X = d => L + ((t(d) - x0) / (x1 - x0)) * (W - L - R);
    const Y = v => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
    const path = pts => pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.date).toFixed(1)},${Y(p.kg).toFixed(1)}`).join(' ');

    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight over time">`;
    // y grid
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const v = y0 + ((y1 - y0) * i) / ySteps, y = Y(v);
      svg += `<line class="gridline" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/><text x="${L - 6}" y="${y + 4}" text-anchor="end">${HT.util.round(v, 1)}</text>`;
    }
    // x labels
    const xSteps = Math.min(6, Math.max(1, Math.round((x1 - x0) / 864e5)));
    for (let i = 0; i <= xSteps; i++) {
      const ms = x0 + ((x1 - x0) * i) / xSteps;
      const key = HT.util.dateKey(new Date(ms));
      svg += `<text x="${X(key)}" y="${H - 10}" text-anchor="middle">${HT.util.fmtDate(key, { day: 'numeric', month: 'short' })}</text>`;
    }
    svg += `<line class="axis" x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}"/>`;
    if (series.energy?.length > 1) svg += `<path class="pred" style="stroke: var(--carbs)" d="${path(series.energy)}"/>`;
    if (series.trend?.length > 1) svg += `<path class="pred" d="${path(series.trend)}"/>`;
    if (series.actual.length > 1) svg += `<path class="line" d="${path(series.actual)}"/>`;
    for (const p of series.actual) {
      svg += `<circle class="dot" cx="${X(p.date)}" cy="${Y(p.kg)}" r="4"><title>${HT.util.fmtDate(p.date)}: ${p.kg} kg</title></circle>`;
    }
    const lastT = series.trend?.[series.trend.length - 1];
    if (lastT) svg += `<circle cx="${X(lastT.date)}" cy="${Y(lastT.kg)}" r="4" fill="var(--green)"><title>Predicted ${HT.util.fmtDate(lastT.date)}: ${HT.util.round(lastT.kg, 1)} kg</title></circle>`;
    svg += '</svg>';
    return svg;
  },
};
