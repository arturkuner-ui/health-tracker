// Energy and weight math. Formulas are standard ones used by common online calorie calculators.
HT.calc = {
  ACTIVITY: {
    sedentary: { f: 1.2, label: 'Sedentary (little or no exercise)' },
    light: { f: 1.375, label: 'Light (exercise 1 to 3 days a week)' },
    moderate: { f: 1.55, label: 'Moderate (exercise 3 to 5 days a week)' },
    active: { f: 1.725, label: 'Very active (exercise 6 to 7 days a week)' },
    athlete: { f: 1.9, label: 'Extra active (hard training twice a day or physical job)' },
  },
  KCAL_PER_KG: 7700, // approx. energy in 1 kg of body mass change

  // Mifflin-St Jeor resting metabolic rate.
  bmr({ sex, age, heightCm, weightKg }) {
    if (!age || !heightCm || !weightKg) return null;
    return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'female' ? -161 : 5);
  },
  tdee(profile, weightKg) {
    const b = HT.calc.bmr({ ...profile, weightKg });
    if (b == null) return null;
    return b * (HT.calc.ACTIVITY[profile.activity]?.f || 1.55);
  },

  // Maintenance, bulking and cutting targets, plus a macro split for the chosen goal.
  targets(profile, weightKg) {
    const maint = HT.calc.tdee(profile, weightKg);
    if (maint == null) return null;
    const surplus = +profile.bulkSurplus || 300;
    const out = {
      bmr: HT.calc.bmr({ ...profile, weightKg }),
      maintenance: maint,
      leanBulk: maint + surplus,
      bulk: maint + 500,
      cut: maint - 500,
    };
    const goalKcal = { maintain: out.maintenance, bulk: out.leanBulk, cut: out.cut }[profile.goal] ?? out.maintenance;
    const proteinPerKg = { maintain: 1.8, bulk: 2.0, cut: 2.2 }[profile.goal] ?? 1.8;
    const protein = proteinPerKg * weightKg;
    const fat = (goalKcal * 0.25) / 9;
    const carbs = Math.max(0, (goalKcal - protein * 4 - fat * 9) / 4);
    out.goal = { kcal: goalKcal, protein, carbs, fat };
    return out;
  },

  // Least-squares line through (day index, kg). Returns slope in kg/day.
  linreg(points) {
    const n = points.length;
    if (n < 2) return null;
    const mx = points.reduce((s, p) => s + p.x, 0) / n;
    const my = points.reduce((s, p) => s + p.y, 0) / n;
    let num = 0, den = 0;
    for (const p of points) { num += (p.x - mx) * (p.y - my); den += (p.x - mx) ** 2; }
    if (den === 0) return null;
    const slope = num / den;
    return { slope, intercept: my - slope * mx };
  },

  // Trend-based prediction: fit a line to the last 60 days of weigh-ins.
  trendModel(weights) {
    if (weights.length < 2) return null;
    const last = weights[weights.length - 1].date;
    const recent = weights.filter(w => HT.util.daysBetween(w.date, last) <= 60);
    const use = recent.length >= 2 ? recent : weights.slice(-2);
    const origin = use[0].date;
    const fit = HT.calc.linreg(use.map(w => ({ x: HT.util.daysBetween(origin, w.date), y: w.kg })));
    if (!fit) return null;
    const lastX = HT.util.daysBetween(origin, last);
    const base = fit.intercept + fit.slope * lastX; // smoothed "today" weight
    return {
      slopePerWeek: fit.slope * 7,
      span: HT.util.daysBetween(use[0].date, last),
      points: use.length,
      predict(dateKey) { return base + fit.slope * HT.util.daysBetween(last, dateKey); },
      baseDate: last,
    };
  },

  // Energy-balance prediction: average logged intake over the last 14 days vs. your
  // calculated maintenance, simulated day by day so maintenance falls/rises as weight changes.
  energyModel(profile, weights, foodByDay) {
    const latest = weights[weights.length - 1];
    if (!latest || HT.calc.tdee(profile, latest.kg) == null) return null;
    const days = [];
    for (let i = 1; i <= 14; i++) {
      const k = HT.util.dateKey(HT.util.addDays(new Date(), -i));
      const items = foodByDay[k];
      if (items && items.length) days.push(items.reduce((s, f) => s + (+f.kcal || 0), 0));
    }
    if (days.length < 3) return { insufficient: true, loggedDays: days.length };
    const avgIntake = days.reduce((a, b) => a + b, 0) / days.length;
    return {
      avgIntake,
      loggedDays: days.length,
      dailyBalance: avgIntake - HT.calc.tdee(profile, latest.kg),
      predict(dateKey) {
        let w = latest.kg;
        const n = HT.util.daysBetween(latest.date, dateKey);
        for (let i = 0; i < n; i++) w += (avgIntake - HT.calc.tdee(profile, w)) / HT.calc.KCAL_PER_KG;
        return w;
      },
      baseDate: latest.date,
    };
  },
};
