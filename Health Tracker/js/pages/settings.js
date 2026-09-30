HT.pages.settings = {
  render(el) {
    const { esc } = HT.util;
    const st = HT.store.get().settings;
    el.innerHTML = `
      <div class="page-head"><h1>Settings</h1></div>
      <div class="grid grid-2" style="align-items:start">
        <form class="card" id="sform">
          <h2>Claude API</h2>
          <p class="small muted">Used for the bloodwork evaluation and for estimating food from photos or descriptions. Get a key at console.anthropic.com. Your key is stored only in this browser and sent only to api.anthropic.com.</p>
          <div class="field"><label>API key</label><input name="apiKey" type="password" value="${esc(st.apiKey)}" placeholder="sk-ant-…" autocomplete="off"></div>
          <div class="field"><label>Model</label><select name="model">
            ${HT.claude.MODELS.map(m => `<option value="${m.id}" ${m.id === st.model ? 'selected' : ''}>${m.label}</option>`).join('')}
          </select></div>
          <button class="primary">Save</button>
        </form>
        <div class="card">
          <h2>Your data</h2>
          <p class="small muted">Everything is saved in this browser only. Download a backup now and then, especially before clearing browser data or switching devices.</p>
          <div class="row">
            <button id="exp">Download backup</button>
            <button id="impBtn">Restore backup</button>
            <input type="file" id="imp" accept="application/json" hidden>
          </div>
          <hr style="border:none;border-top:1px solid var(--border);margin:16px 0">
          <button class="danger" id="wipe">Delete all data</button>
        </div>
      </div>`;
    el.querySelector('#sform').onsubmit = e => {
      e.preventDefault();
      const f = new FormData(e.target);
      HT.store.update(s => { s.settings.apiKey = f.get('apiKey').trim(); s.settings.model = f.get('model'); });
      HT.util.toast('Settings saved');
    };
    el.querySelector('#exp').onclick = () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([HT.store.exportJSON()], { type: 'application/json' }));
      a.download = `health-tracker-backup-${HT.util.dateKey()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    el.querySelector('#impBtn').onclick = () => el.querySelector('#imp').click();
    el.querySelector('#imp').onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      if (!confirm('Replace all current data with this backup?')) return;
      try { HT.store.importJSON(await f.text()); HT.util.toast('Backup restored'); HT.pages.settings.render(el); }
      catch (err) { HT.util.toast('That file is not a valid backup.'); }
    };
    el.querySelector('#wipe').onclick = () => {
      if (!confirm('Delete all your data from this browser? This cannot be undone.')) return;
      HT.store.reset(); HT.util.toast('All data deleted'); HT.pages.settings.render(el);
    };
  },
};
