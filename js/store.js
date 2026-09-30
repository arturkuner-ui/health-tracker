// All data lives in the browser's localStorage under one key. Nothing is sent anywhere
// except the specific requests to the Claude API that the user triggers.
(function () {
  const KEY = 'healthTracker.v1';
  const defaults = () => ({
    settings: { apiKey: '', model: 'claude-opus-5-5' },
    profile: { sex: 'male', age: '', heightCm: '', activity: 'moderate', goal: 'maintain', bulkSurplus: 300 },
    weights: [],        // [{ date: 'YYYY-MM-DD', kg: 80.1 }]
    food: {},           // { 'YYYY-MM-DD': [{ id, name, grams, kcal, protein, carbs, fat, time, source }] }
    bloodwork: [],      // [{ id, date, fileName, createdAt, result }]
  });

  let state;
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const d = defaults();
      state = {
        ...d, ...parsed,
        settings: { ...d.settings, ...(parsed.settings || {}) },
        profile: { ...d.profile, ...(parsed.profile || {}) },
      };
    } catch (e) {
      console.warn('Could not read saved data, starting fresh', e);
      state = defaults();
    }
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      HT.util.toast('Could not save: browser storage is full or blocked.');
      throw e;
    }
  }
  load();

  HT.store = {
    get: () => state,
    save,
    update(fn) { fn(state); save(); },
    exportJSON() { return JSON.stringify(state, null, 2); },
    importJSON(text) {
      const parsed = JSON.parse(text);
      if (typeof parsed !== 'object' || !parsed) throw new Error('Not a backup file');
      localStorage.setItem(KEY, JSON.stringify(parsed));
      load();
    },
    reset() { localStorage.removeItem(KEY); load(); },

    // Food helpers
    foodFor(key) { return state.food[key] || []; },
    addFood(key, item) {
      HT.store.update(s => { (s.food[key] ||= []).push({ id: HT.util.uid(), time: new Date().toTimeString().slice(0, 5), ...item }); });
    },
    removeFood(key, id) {
      HT.store.update(s => {
        s.food[key] = (s.food[key] || []).filter(f => f.id !== id);
        if (!s.food[key].length) delete s.food[key];
      });
    },
    dayTotals(key) {
      return HT.store.foodFor(key).reduce((t, f) => ({
        kcal: t.kcal + (+f.kcal || 0), protein: t.protein + (+f.protein || 0),
        carbs: t.carbs + (+f.carbs || 0), fat: t.fat + (+f.fat || 0),
      }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
    },

    // Weight helpers (one entry per day; re-logging a day replaces it)
    sortedWeights() { return [...state.weights].sort((a, b) => a.date.localeCompare(b.date)); },
    latestWeight() { const w = HT.store.sortedWeights(); return w.length ? w[w.length - 1] : null; },
    setWeight(date, kg) {
      HT.store.update(s => {
        s.weights = s.weights.filter(w => w.date !== date);
        s.weights.push({ date, kg: +kg });
      });
    },
    removeWeight(date) { HT.store.update(s => { s.weights = s.weights.filter(w => w.date !== date); }); },
  };
})();
