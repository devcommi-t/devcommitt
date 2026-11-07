// Runs before first paint.
(function () {
  var d = document.documentElement;
  d.classList.add('js');
  // Saved light/dark choice (default is the light brand look).
  try { var th = localStorage.getItem('dct'); if (th === 'dark' || th === 'light') d.setAttribute('data-theme', th); } catch (e) {}
  var rm = false; try { rm = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  // Arrived through the page-transition curtain: start covered, main.js slides it away.
  try { if (sessionStorage.getItem('dcc') === '1') { sessionStorage.removeItem('dcc'); if (!rm) d.classList.add('cv-in'); } } catch (e) {}
  try {
    var base = d.getAttribute('data-base') || '', seen = sessionStorage.getItem('dcs');
    var p = location.pathname; if (base && p.indexOf(base) === 0) p = p.slice(base.length) || '/';
    if (p === '/index.html') p = '/';
    // First visit to the English home page by someone who prefers Arabic: send them to /ar/.
    if (p === '/' && d.hasAttribute('data-ar')) {
      var pref = null; try { pref = localStorage.getItem('dcl'); } catch (e) {}
      if (!pref) pref = /^ar/i.test(navigator.language || '') ? 'ar' : 'en';
      if (pref === 'ar') { location.replace(base + '/ar/' + location.search + location.hash); return; }
    }
    if ((p === '/' || p === '/ar/') && !seen && !rm) d.classList.add('splash');
  } catch (e) {}
})();
