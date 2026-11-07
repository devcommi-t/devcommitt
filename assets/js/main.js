(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Remember the visitor's language choice (used by boot.js on the home page)
  $$('a.lang').forEach(a => a.addEventListener('click', () => { try { localStorage.setItem('dcl', a.getAttribute('hreflang')); } catch (e) {} }));

  const root = document.documentElement, RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Mobile menu
  const m = $('.menu'), nav = $('#nav');
  if (nav) $$('a', nav).forEach((a, i) => a.style.setProperty('--i', i));
  if (m) {
    const set = o => { nav.classList.toggle('open', o); m.setAttribute('aria-expanded', o); };
    m.addEventListener('click', () => set(!nav.classList.contains('open')));
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape') { set(false); m.focus(); } });
    nav.addEventListener('click', ev => { if (ev.target.closest('a')) set(false); });
  }

  // Broken images fall back to the placeholder underneath; images still loading show a shimmering skeleton
  $$('.media img').forEach(i => {
    const bad = () => { i.classList.add('broken'); i.parentNode.classList.remove('sk'); };
    i.addEventListener('error', bad);
    if (i.complete && i.naturalWidth === 0) bad();
    else if (!i.complete) { const box = i.parentNode; box.classList.add('sk'); i.addEventListener('load', () => box.classList.remove('sk'), { once: true }); }
  });

  // Light / dark switch: the new theme spreads out as a circle from the button
  const tbtn = $('.theme');
  if (tbtn) {
    const cur = () => root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const set = t => { root.setAttribute('data-theme', t); try { localStorage.setItem('dct', t); } catch (e) {} tbtn.setAttribute('aria-pressed', t === 'dark'); dispatchEvent(new Event('dc:theme')); };
    tbtn.setAttribute('aria-pressed', cur() === 'dark');
    tbtn.addEventListener('click', ev => {
      const next = cur() === 'dark' ? 'light' : 'dark';
      if (!document.startViewTransition || RM) return set(next);
      const r = tbtn.getBoundingClientRect(), x = ev.detail ? ev.clientX : r.left + r.width / 2, y = ev.detail ? ev.clientY : r.top + r.height / 2;
      const rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      const vt = document.startViewTransition(() => set(next));
      vt.ready.then(() => root.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + rad + 'px at ' + x + 'px ' + y + 'px)'] }, { duration: 650, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' })).catch(() => {});
    });
  }

  // Click an image to see it large
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

  // Drag-to-scroll galleries (mouse; touch uses native swiping)
  $$('[data-drag]').forEach(g => {
    let down = false, sx = 0, sl = 0, moved = 0;
    g.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button) return; down = true; moved = 0; sx = e.clientX; sl = g.scrollLeft; g.classList.add('drag'); });
    addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx)); g.scrollLeft = sl - dx; });
    addEventListener('pointerup', () => { if (!down) return; down = false; g.classList.remove('drag'); });
    g.addEventListener('click', e => { if (moved > 5) { e.stopPropagation(); e.preventDefault(); moved = 0; } }, true);
  });

  // Before / after slider
  $$('[data-ba]').forEach(b => { const i = $('input', b), set = () => b.style.setProperty('--v', i.value); i.addEventListener('input', set); set(); });

  // Page transition: a coloured curtain wipes over the page, then the next page uncovers it
  if (!RM) {
    // The curtain (with the brand logo) is already in the HTML so it covers the page from the first paint; build one only if it is missing.
    if (!$('.curtain')) { const c = document.createElement('div'); c.className = 'curtain'; c.setAttribute('aria-hidden', 'true'); c.innerHTML = '<i></i><i></i><img src="' + (root.dataset.base || '') + '/assets/img/logo-light.png" alt="" width="913" height="134">'; document.body.appendChild(c); }
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
      // hold for a beat so the logo is seen, then lift the curtain
      setTimeout(() => { root.classList.add('cv-out'); root.classList.remove('cv-in'); setTimeout(() => root.classList.remove('cv-out'), 1000); }, 380);
    }));
  } else $$('animate').forEach(n => n.remove());

  // Portfolio filter + search
  const grid = $('#grid');
  if (grid) {
    const q = $('#q'), chips = $$('.chip'), empty = $('#empty');
    let cat = '';
    const run = () => {
      const t = q.value.trim().toLowerCase();
      let n = 0;
      $$('.card', grid).forEach(c => {
        const ok = (!cat || c.dataset.cat === cat) && (!t || c.dataset.text.includes(t));
        c.hidden = !ok; if (ok) n++;
      });
      empty.hidden = n > 0;
    };
    chips.forEach(c => c.addEventListener('click', () => {
      cat = c.dataset.f; chips.forEach(x => x.classList.toggle('on', x === c)); run();
    }));
    q.addEventListener('input', run);
  }

  // Contact form
  const f = $('#inquiry');
  if (f && !f.hasAttribute('data-off')) {
    const st = $('#status'), b = $('button[type=submit]', f);
    f.addEventListener('submit', async ev => {
      ev.preventDefault();
      if (f.elements._gotcha.value) return;
      const msg = k => f.getAttribute('data-m-' + k) || '';
      if (!f.checkValidity()) {
        $$('.f', f).forEach(w => {
          const c = $('input,select,textarea', w), bad = !!c && !c.checkValidity();
          w.classList.toggle('bad', bad); if (c) c.setAttribute('aria-invalid', bad ? 'true' : 'false');
          if (bad) { w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake'); }
        });
        f.reportValidity(); st.className = 'err'; st.textContent = msg('required'); return;
      }
      $$('.f.bad', f).forEach(w => w.classList.remove('bad'));
      if (f.dataset.mailto) {
        const lines = [];
        for (const [k, v] of new FormData(f)) if (v && !['_gotcha', 'lang', 'consent'].includes(k)) {
          const l = f.querySelector('[name="' + k + '"]'), lab = l && l.id && f.querySelector('label[for="' + l.id + '"]');
          lines.push((lab ? lab.textContent.replace(/[*]|\(optional\)/g, '').trim() : k) + ': ' + v);
        }
        const subj = 'Inquiry from ' + f.elements.name.value;
        location.href = 'mailto:' + f.dataset.mailto + '?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(lines.join('\n\n'));
        st.className = 'ok'; st.textContent = msg('mailto'); if (window.dcFx) dcFx.confetti(b);
        return;
      }
      b.disabled = true; st.className = ''; st.textContent = msg('sending');
      // 15 s timeout so the form never hangs; no cookies or referrer are sent to the form service.
      const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 15000);
      let sent = false;
      try {
        const r = await fetch(f.action, { method: 'POST', headers: { Accept: 'application/json' }, body: new URLSearchParams(new FormData(f)), signal: ctl.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
        if (!r.ok) throw new Error(r.status);
        sent = true; f.reset(); st.className = 'ok'; st.textContent = st.dataset.success || ''; if (window.dcFx) dcFx.confetti(b);
      } catch {
        st.className = 'err'; st.textContent = msg('error');
      }
      clearTimeout(tm);
      // after a successful send, wait 20 s before the button works again (stops accidental double sends and spam clicks)
      if (sent) setTimeout(() => { b.disabled = false; }, 20000); else b.disabled = false;
    });
  }
  // Services tabs (all panels stay visible without JS)
  const tabs = $$('.tab');
  if (tabs.length) {
    const show = i => tabs.forEach((t, k) => {
      t.classList.toggle('on', k === i); t.setAttribute('aria-selected', k === i);
      $('#' + t.getAttribute('aria-controls')).hidden = k !== i;
    });
    tabs.forEach((t, i) => t.addEventListener('click', () => show(i)));
    show(0);
  }
  // Motion (skipped entirely for reduced-motion users)
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Every piece of content fades/rises in one after another as it scrolls into view.
    const sel = '.sec-head,.sec>h2,.sec>.lead,.two>*,.card,.svc,.feats>div,.why>div,.steps li,.panel,.tabs,.cols3>section,.banner,.love-c,.case>section,.facts,.contact>*,.ba-sec,.gal-sec,.scene,.spot-txt>:not(ul),.spot-it,.spot-vis,.statement,details,.foot-grid>*,.foot .sub,.phero>*,.band .center>*,.filters,.herowrap+*';
    $$(sel).forEach(el => { if (el.closest('[data-r]') || el.closest('.hero')) return; el.setAttribute('data-r', ''); });
    const io = new IntersectionObserver(es => {
      // the elements that arrive together are staggered top-to-bottom, left-to-right
      const hit = es.filter(x => x.isIntersecting).sort((a, b) => (a.boundingClientRect.top - b.boundingClientRect.top) || (a.boundingClientRect.left - b.boundingClientRect.left));
      hit.forEach((x, i) => {
        const el = x.target; io.unobserve(el);
        el.style.setProperty('--d', Math.min(i, 8) * 0.13 + 's');
        el.classList.add('in');
        setTimeout(() => el.style.setProperty('--d', '0s'), 1600 + i * 130);   // hover effects must not stay delayed
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -7% 0px' });
    $$('[data-r]').forEach(el => io.observe(el));

    // Scroll-linked word reveal
    const rw = $('.reveal-words');
    if (rw) {
      rw.classList.add('rw');
      const w = $$('span', rw); let tick = false;
      const upd = () => {
        tick = false;
        const r = rw.getBoundingClientRect(), vh = innerHeight;
        const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (vh * 0.55 + r.height)));
        w.forEach((s, i) => s.classList.toggle('on', i < Math.ceil(p * w.length)));
      };
      addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(upd); } }, { passive: true });
      upd();
    }

    // Hero parallax
    const v = $('.visual');
    if (v) addEventListener('pointermove', ev => {
      v.style.setProperty('--mx', ev.clientX / innerWidth - 0.5);
      v.style.setProperty('--my', ev.clientY / innerHeight - 0.5);
    }, { passive: true });

    // Hero headline: words rise one by one
    const h1 = $('.hero h1');
    if (h1) {
      const frag = document.createDocumentFragment(); let i = 0;
      const add = node => {
        const w = document.createElement('span'), inner = document.createElement('span');
        w.className = 'w'; w.style.setProperty('--i', i++); inner.appendChild(node); w.appendChild(inner);
        frag.appendChild(w); frag.appendChild(document.createTextNode(' '));
      };
      [...h1.childNodes].forEach(n => {
        if (n.nodeType === 3) n.textContent.split(/\s+/).filter(Boolean).forEach(t => add(document.createTextNode(t)));
        else add(n);
      });
      h1.textContent = ''; h1.appendChild(frag); h1.classList.add('split');
    }

    // Process line draws with scroll
    const st = $('.steps:not(.steps-v)');
    if (st) {
      const lis = $$('li', st); let tk = false;
      const up = () => {
        tk = false;
        const r = st.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (innerHeight * 0.8 - r.top) / (innerHeight * 0.35)));
        st.style.setProperty('--p', p);
        lis.forEach((li, k) => li.classList.toggle('lit', p >= k / lis.length + 0.04));
      };
      addEventListener('scroll', () => { if (!tk) { tk = true; requestAnimationFrame(up); } }, { passive: true });
      up();
    }

    // Scroll progress bar
    const bar = document.createElement('div'); bar.className = 'prog'; bar.setAttribute('aria-hidden', 'true'); document.body.appendChild(bar);
    const sp = () => bar.style.setProperty('--sp', scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight));
    addEventListener('scroll', sp, { passive: true }); sp();

  }
  try { sessionStorage.setItem('dcs', '1'); } catch (e) {}
})();
