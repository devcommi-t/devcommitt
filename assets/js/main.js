// main.js — behaviour that the site needs (menu, theme, filters, form, lightbox, reveal).
// Decorative motion lives in fx.js.                       السلوك الأساسي للموقع. الحركات الزخرفية في fx.js
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement, RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const T0 = Date.now();

  // Remember the visitor's language choice (used by boot.js on the home page)
  $$('a.lang').forEach(a => a.addEventListener('click', () => { try { localStorage.setItem('dcl', a.getAttribute('hreflang')); } catch (e) {} }));

  // ---------- Header: compact when scrolled ----------
  const head = $('.head');
  if (head) { const f = () => head.classList.toggle('scrolled', scrollY > 24); addEventListener('scroll', f, { passive: true }); f(); }

  // ---------- Mobile menu ----------
  const m = $('.menu'), nav = $('#nav');
  if (nav) $$('a', nav).forEach((a, i) => a.style.setProperty('--i', i));
  if (m && nav) {
    const set = o => { nav.classList.toggle('open', o); m.setAttribute('aria-expanded', String(o)); };
    m.addEventListener('click', () => set(!nav.classList.contains('open')));
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && nav.classList.contains('open')) { set(false); m.focus(); } });
    document.addEventListener('click', ev => { if (nav.classList.contains('open') && !ev.target.closest('.bar')) set(false); });
    nav.addEventListener('click', ev => { if (ev.target.closest('a')) set(false); });
  }

  // ---------- Broken images fall back to the storefront mock underneath; loading images show a skeleton ----------
  $$('.media img').forEach(i => {
    const bad = () => { i.classList.add('broken'); i.parentNode.classList.remove('sk'); };
    i.addEventListener('error', bad);
    if (i.complete && i.naturalWidth === 0) bad();
    else if (!i.complete) { const box = i.parentNode; box.classList.add('sk'); i.addEventListener('load', () => box.classList.remove('sk'), { once: true }); }
  });

  // ---------- Light / dark switch: the new theme spreads out as a circle from the button ----------
  const tbtn = $('.theme');
  if (tbtn) {
    const cur = () => root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const set = t => { root.setAttribute('data-theme', t); try { localStorage.setItem('dct', t); } catch (e) {} tbtn.setAttribute('aria-pressed', String(t === 'dark')); dispatchEvent(new Event('dc:theme')); };
    tbtn.setAttribute('aria-pressed', String(cur() === 'dark'));
    tbtn.addEventListener('click', ev => {
      const next = cur() === 'dark' ? 'light' : 'dark';
      if (!document.startViewTransition || RM) return set(next);
      const r = tbtn.getBoundingClientRect(), x = ev.detail ? ev.clientX : r.left + r.width / 2, y = ev.detail ? ev.clientY : r.top + r.height / 2;
      const rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      const vt = document.startViewTransition(() => set(next));
      vt.ready.then(() => root.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + rad + 'px at ' + x + 'px ' + y + 'px)'] }, { duration: 650, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' })).catch(() => {});
    });
  }

  // ---------- Back to top ----------
  $$('.totop').forEach(b => b.addEventListener('click', () => scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' })));

  // ---------- Click an image to see it large ----------
  const closeLabel = root.getAttribute('data-close') || 'Close';
  document.addEventListener('click', ev => {
    const box = ev.target.closest('[data-zoom]'); if (!box) return;
    const im = $('img', box); if (!im || im.classList.contains('broken')) return;
    const prev = document.activeElement, lb = document.createElement('div');
    lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', im.alt || closeLabel);
    lb.innerHTML = '<button class="lb-x" type="button">&times;</button><img alt="">';
    const x = $('.lb-x', lb), big = $('img', lb); x.setAttribute('aria-label', closeLabel); big.src = im.currentSrc || im.src; big.alt = im.alt;
    document.body.appendChild(lb); document.body.classList.add('noscroll'); requestAnimationFrame(() => lb.classList.add('on')); x.focus();
    const close = () => { lb.classList.remove('on'); document.body.classList.remove('noscroll'); document.removeEventListener('keydown', key); setTimeout(() => { lb.remove(); if (prev && prev.focus) prev.focus(); }, 300); };
    const key = e => { if (e.key === 'Escape') close(); else if (e.key === 'Tab') { e.preventDefault(); x.focus(); } };
    lb.addEventListener('click', close); document.addEventListener('keydown', key);
  });

  // ---------- Drag-to-scroll galleries (mouse; touch uses native swiping) ----------
  $$('[data-drag]').forEach(g => {
    let down = false, sx = 0, sl = 0, moved = 0;
    g.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button) return; down = true; moved = 0; sx = e.clientX; sl = g.scrollLeft; g.classList.add('drag'); });
    addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx)); g.scrollLeft = sl - dx; });
    addEventListener('pointerup', () => { if (!down) return; down = false; g.classList.remove('drag'); });
    g.addEventListener('click', e => { if (moved > 5) { e.stopPropagation(); e.preventDefault(); moved = 0; } }, true);
  });

  // ---------- Before / after slider ----------
  $$('[data-ba]').forEach(b => { const i = $('input', b), set = () => b.style.setProperty('--v', i.value); i.addEventListener('input', set); set(); });

  // ---------- Page transition: a coloured curtain wipes over the page, then the next page uncovers it ----------
  if (!RM) {
    document.addEventListener('click', ev => {
      if (ev.defaultPrevented || ev.button || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      const a = ev.target.closest('a[href]'); if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      let u; try { u = new URL(a.href, location.href); } catch (e) { return; }
      if (u.origin !== location.origin || /^(mailto|tel):/.test(a.getAttribute('href')) || (u.pathname === location.pathname && u.search === location.search)) return;
      ev.preventDefault(); try { sessionStorage.setItem('dcc', '1'); } catch (e) {}
      root.classList.add('cv-go'); setTimeout(() => { location.href = a.href; }, 850);
    });
    addEventListener('pageshow', e => { if (e.persisted) root.classList.remove('cv-go', 'cv-in', 'cv-out'); });
    if (root.classList.contains('cv-in')) requestAnimationFrame(() => requestAnimationFrame(() => {
      setTimeout(() => { root.classList.add('cv-out'); root.classList.remove('cv-in'); setTimeout(() => root.classList.remove('cv-out'), 1000); }, 380);
    }));
  } else $$('animate').forEach(n => n.remove());

  // ---------- Work page: filter + search (cards re-appear with a staggered animation) ----------
  const grid = $('#grid');
  if (grid) {
    const q = $('#q'), chips = $$('.fchip'), empty = $('#empty'), count = $('#count');
    let cat = '';
    const run = () => {
      const t = q.value.trim().toLowerCase(); let n = 0, k = 0;
      $$('.card[data-cat]', grid).forEach(c => {
        const ok = (!cat || c.dataset.cat === cat) && (!t || c.dataset.text.includes(t));
        const was = !c.hidden; c.hidden = !ok; if (ok) n++;
        if (ok && !was && !RM && c.animate) c.animate([{ opacity: 0, transform: 'translateY(26px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 520, delay: (k++) * 70, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
      });
      empty.hidden = n > 0;
      if (count) count.textContent = (count.dataset.tpl || '{n}').replace('{n}', n);
    };
    chips.forEach(c => c.addEventListener('click', () => { cat = c.dataset.f; chips.forEach(x => x.classList.toggle('on', x === c)); run(); }));
    q.addEventListener('input', run);
  }

  // ---------- Contact form ----------
  const f = $('#inquiry');
  if (f && !f.hasAttribute('data-off')) {
    const st = $('#status'), b = $('button[type=submit]', f);
    f.addEventListener('submit', async ev => {
      ev.preventDefault();
      if (f.elements._gotcha.value) return;                       // honeypot: bots fill the hidden field
      const msg = k => f.getAttribute('data-m-' + k) || '';
      if (!f.checkValidity()) {
        $$('.f', f).forEach(w => {
          const c = $('input,select,textarea', w), bad = !!c && !c.checkValidity();
          w.classList.toggle('bad', bad); if (c) c.setAttribute('aria-invalid', bad ? 'true' : 'false');
          if (bad && !RM) { w.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(7px)' }, { transform: 'translateX(-4px)' }, { transform: 'none' }], { duration: 420 }); }
        });
        f.reportValidity(); st.className = 'err'; st.textContent = msg('required'); return;
      }
      $$('.f.bad', f).forEach(w => w.classList.remove('bad'));
      if (f.dataset.mailto) {
        const lines = [];
        for (const [k, v] of new FormData(f)) if (v && !['_gotcha', 'lang', 'consent'].includes(k)) {
          const l = f.querySelector('[name="' + k + '"]'), lab = l && l.id && f.querySelector('label[for="' + l.id + '"]');
          lines.push((lab ? lab.textContent.replace(/[*]|\(optional\)|\(اختياري\)/g, '').trim() : k) + ': ' + v);
        }
        const subj = 'Inquiry from ' + String(f.elements.name.value).replace(/[\r\n]+/g, ' ');
        location.href = 'mailto:' + f.dataset.mailto + '?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(lines.join('\n\n'));
        st.className = 'ok'; st.textContent = msg('mailto'); if (window.dcFx) dcFx.confetti(b);
        return;
      }
      // Bot check: a person cannot fill this form in under 2 seconds. Pretend success, send nothing.
      if (Date.now() - T0 < 2000) { st.className = 'ok'; st.textContent = st.dataset.success || ''; return; }
      b.disabled = true; st.className = ''; st.textContent = msg('sending');
      // 15 s timeout so the form never hangs; no cookies or referrer are sent to the form service.
      const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 15000);
      let sent = false;
      try {
        const r = await fetch(f.action, { method: 'POST', headers: { Accept: 'application/json' }, body: new URLSearchParams(new FormData(f)), signal: ctl.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
        if (!r.ok) throw new Error(r.status);
        sent = true; f.reset(); st.className = 'ok'; st.textContent = st.dataset.success || ''; if (window.dcFx) dcFx.confetti(b);
      } catch (x) {
        st.className = 'err'; st.textContent = msg('error');
      }
      clearTimeout(tm);
      // after a successful send, wait 20 s before the button works again (stops accidental double sends and spam clicks)
      if (sent) setTimeout(() => { b.disabled = false; }, 20000); else b.disabled = false;
    });
  }

  // ---------- Services tabs (all panels stay visible without JS). Arrow keys move between tabs. ----------
  const tabs = $$('.tab');
  if (tabs.length) {
    const show = (i, focus) => tabs.forEach((t, k) => {
      t.classList.toggle('on', k === i); t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = k !== i; if (focus && k === i) t.focus();
    });
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => show(i));
      t.addEventListener('keydown', e => {
        const rtl = root.dir === 'rtl', next = (e.key === 'ArrowDown' || e.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) ? 1 : (e.key === 'ArrowUp' || e.key === (rtl ? 'ArrowRight' : 'ArrowLeft')) ? -1 : 0;
        if (e.key === 'Home') { e.preventDefault(); show(0, true); } else if (e.key === 'End') { e.preventDefault(); show(tabs.length - 1, true); } else if (next) { e.preventDefault(); show((i + next + tabs.length) % tabs.length, true); }
      });
    });
    show(0);
  }

  // ---------- Showcase list: click a point to show its scene (auto-advance is in fx.js) ----------
  $$('.showcase').forEach(sec => {
    const items = $$('.sc-it', sec), scenes = $$('.sc', sec), url = $('.win-url', sec); let cur = 0;
    const show = n => {
      cur = (n + items.length) % items.length;
      items.forEach(el => el.classList.remove('on')); void sec.offsetWidth;   // restart the progress line
      items.forEach((el, k) => { const on = k === cur; el.classList.toggle('on', on); $('.sc-b', el).setAttribute('aria-pressed', String(on)); });
      scenes.forEach((s, k) => s.classList.toggle('on', k === cur));
      if (url) url.textContent = $('.sc-l', items[cur]).textContent;
    };
    items.forEach((el, k) => $('.sc-b', el).addEventListener('click', () => show(k)));
    sec.addEventListener('sc:next', () => show(cur + 1));
  });

  // ---------- Motion (skipped entirely for reduced-motion users) ----------
  if (!RM) {
    // Headings: words rise out of a mask.
    const split = h => {
      const frag = document.createDocumentFragment(); let i = 0;
      const add = node => { const w = document.createElement('span'), inner = document.createElement('span'); w.className = 'tw-w'; inner.className = 'tw-i'; inner.style.setProperty('--i', i++); inner.appendChild(node); w.appendChild(inner); frag.appendChild(w); frag.appendChild(document.createTextNode(' ')); };
      [...h.childNodes].forEach(n => { if (n.nodeType === 3) n.textContent.split(/\s+/).filter(Boolean).forEach(t => add(document.createTextNode(t))); else add(n); });
      h.setAttribute('aria-label', h.textContent.trim()); h.textContent = ''; h.appendChild(frag);
      [...h.children].forEach(c => c.setAttribute('aria-hidden', 'true'));
    };
    const heads = $$('.hero h1, .sec-head h2, .two h2, .phero h1, .pin-sticky h2, .sc-txt h2, .love h2, .sec > h2, .banner h2, .xblock h2').filter(h => !h.classList.contains('wave'));
    const hio = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add('tw-on'); hio.unobserve(x.target); } }), { threshold: .2 });
    heads.forEach(h => { split(h); hio.observe(h); });

    // Every piece of content fades/rises in one after another as it scrolls into view.
    const sel = '.sec-head,.sec>.eyebrow,.sec>.lead,.two>*,.card,.svc,.feats>div,.why>div,.steps:not(.steps-v) li,.panel,.tabs,.cols3>section,.banner,.love-c,.case>section,.facts,.contact>*,.ba-sec,.gal-sec,.scene,.sc-txt>:not(ul),.sc-it,.sc-vis,.statement,details,.foot-grid>*,.foot .sub,.phero>*,.cta .center>*,.filters,.xgrid>*,.xs-grid>*,.ticker';
    $$(sel).forEach(el => { if (el.closest('[data-r]') || el.closest('.hero')) return; el.setAttribute('data-r', ''); });
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => {
        const hit = es.filter(x => x.isIntersecting).sort((a, b) => (a.boundingClientRect.top - b.boundingClientRect.top) || (a.boundingClientRect.left - b.boundingClientRect.left));
        hit.forEach((x, i) => {
          const el = x.target; io.unobserve(el);
          el.style.setProperty('--d', Math.min(i, 8) * 0.12 + 's');
          el.classList.add('in');
          setTimeout(() => el.style.setProperty('--d', '0s'), 1600 + i * 130);   // hover effects must not stay delayed
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -7% 0px' });
      $$('[data-r]').forEach(el => io.observe(el));
    } else $$('[data-r]').forEach(el => el.classList.add('in'));

    // Statement: words light up while you scroll
    const rw = $('.reveal-words');
    if (rw) {
      rw.classList.add('rw');
      const w = $$('span', rw); let tick = false;
      const upd = () => { tick = false; const r = rw.getBoundingClientRect(), vh = innerHeight; const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (vh * 0.55 + r.height))); w.forEach((s, i) => s.classList.toggle('on', i < Math.ceil(p * w.length))); };
      addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(upd); } }, { passive: true }); upd();
    }

    // Scroll progress bar
    const bar = document.createElement('div'); bar.className = 'prog'; bar.setAttribute('aria-hidden', 'true'); document.body.appendChild(bar);
    const sp = () => bar.style.setProperty('--sp', scrollY / Math.max(1, root.scrollHeight - innerHeight));
    addEventListener('scroll', sp, { passive: true }); sp();
  }
  try { sessionStorage.setItem('dcs', '1'); } catch (e) {}
})();
