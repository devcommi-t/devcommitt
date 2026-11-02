// Runs before first paint.
(function () {
  try {
    var d = document.documentElement, base = d.getAttribute('data-base') || '', seen = sessionStorage.getItem('dcs');
    var p = location.pathname; if (base && p.indexOf(base) === 0) p = p.slice(base.length) || '/';
    if (p === '/index.html') p = '/';
    // First visit to the English home page by someone who prefers Arabic: send them to /ar/.
    if (p === '/' && d.hasAttribute('data-ar')) {
      var pref = null; try { pref = localStorage.getItem('dcl'); } catch (e) {}
      if (!pref) pref = /^ar/i.test(navigator.language || '') ? 'ar' : 'en';
      if (pref === 'ar') { location.replace(base + '/ar/' + location.search + location.hash); return; }
    }
    if ((p === '/' || p === '/ar/') && !seen) d.classList.add('splash');
  } catch (e) {}
})();
