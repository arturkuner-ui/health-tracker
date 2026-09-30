// Hash router: #/ (home), #/health, #/food[/YYYY-MM-DD], #/profile, #/settings
(function () {
  const routes = { '': 'home', health: 'health', food: 'food', profile: 'profile', settings: 'settings' };
  function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    const name = routes[parts[0]] ? parts[0] : '';
    document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('active', a.dataset.route === name));
    const el = document.getElementById('app');
    HT.pages[routes[name]].render(el, parts[1]);
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  route();
})();
