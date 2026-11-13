// boot.js — runs before the first paint (loaded in <head>).   يشتغل قبل ما الصفحة تتعرض.
(function () {
  var d = document.documentElement;
  d.classList.add('js');

  // SECURITY: clickjacking guard. GitHub Pages cannot send the X-Frame-Options header, so if another website
  // puts this site inside a frame we hide it and try to break out. (Local preview, e.g. the VS Code browser, is allowed.)
  // الأمان: لو موقع تاني حط موقعك جوه iframe بنخفيه ونخرج منه. المعاينة المحلية مسموحة.
  try {
    var h = location.hostname;
    if (window.top !== window.self && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(h)) {
      d.style.display = 'none';
      try { window.top.location.href = window.self.location.href; } catch (e) {}
    }
  } catch (e) { d.style.display = 'none'; }

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
