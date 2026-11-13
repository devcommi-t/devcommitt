// fx.js — decorative motion. Plain JavaScript, no libraries.        الحركات الزخرفية، من غير مكتبات.
// Everything here is progressive enhancement: the site works without it, and nothing runs for visitors who ask for reduced motion.
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement, AR = root.lang === 'ar';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const cv = n => getComputedStyle(root).getPropertyValue(n).trim();
  const hex = h => { h = (h || '').replace('#', ''); return h.length === 6 ? [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)) : null; };
  const theme = () => ({ accent: hex(cv('--accent')) || [200, 103, 74], brand: hex(cv('--brand')) || [47, 93, 80], bg: hex(cv('--bg')) || [250, 243, 232], surface: hex(cv('--surface')) || [241, 230, 211] });
  const mk = (cls, html) => { const d = document.createElement('div'); d.className = cls; d.setAttribute('aria-hidden', 'true'); if (html) d.innerHTML = html; document.body.appendChild(d); return d; };
  const pad = n => String(n).padStart(2, '0');

  // Confetti is used by the contact form, even when motion is reduced it is simply not defined.
  if (RM) return;

  // ---------- One shared, frame-throttled scroll loop ----------
  const scrollFns = []; let ticking = false;
  const onScroll = f => scrollFns.push(f);
  const run = () => { ticking = false; scrollFns.forEach(f => f()); };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(run); } }, { passive: true });
  addEventListener('resize', () => requestAnimationFrame(run));

  // ---------- Smooth scrolling (mouse/trackpad only; touch keeps native scrolling) ----------
  if (FINE) {
    let target = scrollY, cur = scrollY, raf = 0;
    const max = () => root.scrollHeight - innerHeight;
    root.classList.add('smooth'); root.style.scrollBehavior = 'auto';
    const tick = () => { cur += (target - cur) * .11; const done = Math.abs(target - cur) < .4; if (done) cur = target; scrollTo(0, cur); raf = done ? 0 : requestAnimationFrame(tick); };
    addEventListener('wheel', e => {
      if (e.ctrlKey || e.defaultPrevented || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (e.target.closest && e.target.closest('textarea,select,.lb,.gal')) return;
      e.preventDefault();
      if (!raf) cur = target = scrollY;
      target = clamp(target + e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? innerHeight : 1), 0, max());
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: false });
    // Keyboard, scrollbar and in-page links move the page too: stay in sync.
    addEventListener('scroll', () => { if (!raf && Math.abs(scrollY - cur) > 2) cur = target = scrollY; }, { passive: true });
  }

  // ---------- Parallax (images inside frames, floating tiles, aurora) ----------
  const px = [];
  $$('.card .media img, .shot-hero .media img').forEach(el => px.push({ el, k: .07, box: el.parentElement }));
  $$('.floaters .tile').forEach((el, i) => px.push({ el, k: .05 + (i % 3) * .04, box: el.parentElement }));
  $$('.aurora').forEach((el, i) => px.push({ el, k: i ? -.08 : .1, box: el.parentElement }));
  onScroll(() => px.forEach(o => {
    const r = o.box.getBoundingClientRect(); if (r.bottom < -300 || r.top > innerHeight + 300) return;
    let v = -(r.top + r.height / 2 - innerHeight / 2) * o.k;
    if (o.el.tagName === 'IMG') { const lim = r.height * .06; v = clamp(v, -lim, lim); }
    o.el.style.setProperty('--py', v.toFixed(1) + 'px');
  }));

  // ---------- Hero: shapes and devices follow the mouse ----------
  const vis = $('.visual');
  if (vis && FINE) addEventListener('pointermove', ev => { vis.style.setProperty('--mx', (ev.clientX / innerWidth - .5).toFixed(3)); vis.style.setProperty('--my', (ev.clientY / innerHeight - .5).toFixed(3)); }, { passive: true });

  // ---------- Typed hero line ----------
  $$('.tw').forEach(el => {
    let words; try { words = JSON.parse(el.dataset.words); } catch (x) { return; }
    if (!Array.isArray(words) || words.length < 2) return;
    const box = el.closest('.typed'), tp = $('.tp', box);
    const sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = (tp ? tp.textContent + ' ' : '') + words.join(', '); box.appendChild(sr);
    $$('.tp,.tw,.caret', box).forEach(n => n.setAttribute('aria-hidden', 'true'));
    let i = 0, n = [...words[0]].length, del = true;
    const step = () => {
      const w = [...words[i]];
      if (del) { n--; el.textContent = w.slice(0, n).join(''); if (n <= 0) { del = false; i = (i + 1) % words.length; n = 0; return void setTimeout(step, 260); } return void setTimeout(step, 35); }
      n++; el.textContent = w.slice(0, n).join('');
      if (n >= w.length) { del = true; return void setTimeout(step, 1600); }
      setTimeout(step, 70);
    };
    setTimeout(step, 2400);
  });

  // ---------- Words that flip in the call-to-action ----------
  $$('.swapw').forEach(el => {
    let words; try { words = JSON.parse(el.dataset.words); } catch (x) { return; }
    const b = $('b', el); if (!b || !Array.isArray(words) || words.length < 2) return;
    let i = 0;
    const hold = () => setTimeout(next, 2300);
    const next = () => {
      const out = b.animate([{ transform: 'rotateX(0)', opacity: 1 }, { transform: 'rotateX(-90deg) translateY(-30%)', opacity: 0 }], { duration: 280, easing: 'ease-in', fill: 'forwards' });
      out.onfinish = () => {
        i = (i + 1) % words.length; b.textContent = words[i];
        b.animate([{ transform: 'rotateX(90deg) translateY(30%)', opacity: 0 }, { transform: 'rotateX(0)', opacity: 1 }], { duration: 340, easing: 'cubic-bezier(.2,.8,.2,1)' }).onfinish = () => { out.cancel(); hold(); };
      };
    };
    hold();
  });

  // ---------- Showcase: auto-advance when the progress line ends; the window tilts with the mouse ----------
  $$('.showcase').forEach(sec => {
    const items = $$('.sc-it', sec); if (items.length < 2) return;
    items.forEach(el => $('.sc-bar', el).addEventListener('animationend', () => { if (el.classList.contains('on')) sec.dispatchEvent(new CustomEvent('sc:next')); }));
    new IntersectionObserver(es => es.forEach(x => sec.classList.toggle('paused', !x.isIntersecting)), { threshold: .25 }).observe(sec);
    sec.classList.add('auto');
    const lst = $('.sc-list', sec);   // pause only while the list itself is hovered or focused
    lst.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') sec.classList.add('hold'); }); lst.addEventListener('pointerleave', () => sec.classList.remove('hold'));
    lst.addEventListener('focusin', () => sec.classList.add('hold')); lst.addEventListener('focusout', () => sec.classList.remove('hold'));
    const v = $('.sc-vis', sec), w = $('.win', sec);
    if (FINE && v && w) {
      v.addEventListener('pointermove', e => { const r = v.getBoundingClientRect(); w.style.setProperty('--wx', ((e.clientX - r.left) / r.width - .5).toFixed(3)); w.style.setProperty('--wy', ((e.clientY - r.top) / r.height - .5).toFixed(3)); });
      v.addEventListener('pointerleave', () => { w.style.setProperty('--wx', 0); w.style.setProperty('--wy', 0); });
    }
  });

  // ---------- Big text: slides sideways while the outline fills with colour ----------
  const bt = $('.bigtext');
  if (bt) {
    const a = $('.bt-a', bt), b = $('.bt-b', bt);
    onScroll(() => {
      const r = bt.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
      const p = clamp((innerHeight - r.top) / (innerHeight + r.height), 0, 1);
      a.style.setProperty('--bx', (-p * 700).toFixed(0)); b.style.setProperty('--bx', ((p - 1) * 700).toFixed(0));
      a.style.setProperty('--fill', (clamp((p - .15) / .6, 0, 1) * 100).toFixed(0));
    });
  }

  // ---------- Ticker speeds up while you scroll ----------
  const anims = $$('.tk-track').map(t => t.getAnimations && t.getAnimations()[0]).filter(Boolean);
  if (anims.length) {
    let last = scrollY, vel = 0, raf = 0;
    const loop = () => { const d = Math.abs(scrollY - last); last = scrollY; vel = lerp(vel, Math.min(d, 70), .12); anims.forEach(an => { an.playbackRate = 1 + vel * .22; }); raf = vel > .05 || d ? requestAnimationFrame(loop) : 0; if (!raf) anims.forEach(an => { an.playbackRate = 1; }); };
    onScroll(() => { if (!raf) raf = requestAnimationFrame(loop); });
  }

  // ---------- Process: stacked cards, the ring counter follows the card that is on top ----------
  const sv = $('.steps-v');
  if (sv) {
    const lis = $$('li', sv), cnt = $('.pin-count'), num = cnt && $('b', cnt), desk = matchMedia('(min-width: 960px)'); let cur = -1;
    onScroll(() => {
      if (!desk.matches) { lis.forEach(li => li.classList.remove('past', 'cur')); return; }
      let idx = 0;
      lis.forEach((li, k) => { const top = parseFloat(getComputedStyle(li).top) || 0; if (li.getBoundingClientRect().top <= top + 8) idx = k; });
      if (sv.getBoundingClientRect().top > innerHeight * .6) idx = 0;
      lis.forEach((li, k) => { li.classList.toggle('past', k < idx); li.classList.toggle('cur', k === idx); });
      if (idx !== cur) { cur = idx; if (cnt) { cnt.style.setProperty('--p', ((idx + 1) / lis.length).toFixed(3)); num.textContent = pad(idx + 1); num.classList.remove('flip'); void num.offsetWidth; num.classList.add('flip'); } }
    });
  }

  // ---------- 3D cube (about page) ----------
  const cube = $('.cube');
  if (cube) {
    let ry = 35, tx = 0, ty = 0, sx = 0, sy = 0, on = true;
    new IntersectionObserver(es => { on = es[0].isIntersecting; }).observe(cube.parentElement);
    addEventListener('pointermove', e => { tx = (e.clientX / innerWidth - .5) * 70; ty = (e.clientY / innerHeight - .5) * -50; }, { passive: true });
    const f = () => { if (on) { ry += .35; sx = lerp(sx, tx, .06); sy = lerp(sy, ty, .06); cube.style.transform = `rotateX(${(-22 + sy + scrollY * .04).toFixed(2)}deg) rotateY(${(ry + sx).toFixed(2)}deg)`; } requestAnimationFrame(f); };
    f();
  }

  // ---------- Reactive dot grid behind the hero ----------
  const dots = $('.dots');
  if (dots) {
    const ctx = dots.getContext('2d'); let W = 0, H = 0, gap = 32, col = [47, 93, 80], sx = -999, sy = -999, str = 0, inside = false, raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H); const R = 150, near = [];
      ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},.2)`; ctx.beginPath();
      for (let y = gap / 2; y < H; y += gap) for (let x = gap / 2; x < W; x += gap) {
        const dx = x - sx, dy = y - sy, d = Math.hypot(dx, dy);
        if (str > .01 && d < R) near.push(x, y, dx, dy, d); else { ctx.moveTo(x + 1.3, y); ctx.arc(x, y, 1.3, 0, 6.2832); }
      }
      ctx.fill();
      for (let i = 0; i < near.length; i += 5) {
        const x = near[i], y = near[i + 1], d = near[i + 4] || 1, k = 1 - d / R, push = k * k * 38 * str;
        ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${(.2 + k * .5 * str).toFixed(3)})`; ctx.beginPath();
        ctx.arc(x + near[i + 2] / d * push, y + near[i + 3] / d * push, 1.3 + k * 1.6 * str, 0, 6.2832); ctx.fill();
      }
    };
    const size = () => {
      const r = dots.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height;
      dots.width = W * dpr; dots.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); gap = W < 700 ? 26 : 32;
      col = (getComputedStyle(dots).color.match(/[\d.]+/g) || [47, 93, 80]).slice(0, 3).map(Number); draw();
    };
    const frame = () => { str = lerp(str, inside ? 1 : 0, .12); draw(); raf = inside || str > .01 ? requestAnimationFrame(frame) : 0; };
    if (FINE) addEventListener('pointermove', e => {
      const r = dots.getBoundingClientRect(); sx = e.clientX - r.left; sy = e.clientY - r.top;
      inside = sx >= 0 && sy >= 0 && sx <= r.width && sy <= r.height; if ((inside || str > .01) && !raf) raf = requestAnimationFrame(frame);
    }, { passive: true });
    let rs; addEventListener('resize', () => { clearTimeout(rs); rs = setTimeout(size, 150); }); addEventListener('dc:theme', () => setTimeout(size, 60));
    size();
  }

  // ---------- Liquid WebGL shader behind the call-to-action (colours follow the light / dark theme) ----------
  const small = innerWidth < 700 && !FINE;
  if (!small) $$('.liquid').forEach(c => {
    const gl = c.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) return c.remove();
    const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
    const vs = sh(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}');
    const fs = sh(gl.FRAGMENT_SHADER, 'precision mediump float;uniform vec2 r;uniform float t;uniform vec2 m;uniform vec3 c1;uniform vec3 c2;uniform vec3 c3;void main(){vec2 q=(gl_FragCoord.xy/r-.5)*vec2(r.x/r.y,1.)*2.4;for(int i=1;i<5;i++){float f=float(i);q+=vec2(.55/f*sin(f*q.y+t*.35+m.x*2.),.55/f*cos(f*q.x+t*.3+m.y*2.));}float f=.5+.5*sin(q.x+q.y+t*.15);vec3 col=mix(c1,c2,smoothstep(.1,.95,f));col=mix(col,c3,smoothstep(.82,1.,f)*.2);gl_FragColor=vec4(col,1.);}');
    if (!vs || !fs) return c.remove();
    const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr); gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = n => gl.getUniformLocation(pr, n);
    const colours = () => { const f = n => (hex(cv(n)) || [20, 40, 35]).map(v => v / 255); gl.uniform3fv(U('c1'), f('--sh-1')); gl.uniform3fv(U('c2'), f('--sh-2')); gl.uniform3fv(U('c3'), f('--sh-3')); };
    colours(); addEventListener('dc:theme', () => setTimeout(colours, 60));
    let seen = false, raf = 0, mx = 0, my = 0, tx = 0, ty = 0; const t0 = performance.now();
    const size = () => { const s = .55, w = Math.max(2, Math.round(c.clientWidth * s)), h = Math.max(2, Math.round(c.clientHeight * s)); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; gl.viewport(0, 0, w, h); } };
    const draw = () => {
      size(); mx = lerp(mx, tx, .05); my = lerp(my, ty, .05);
      gl.uniform2f(U('r'), c.width, c.height); gl.uniform1f(U('t'), (performance.now() - t0) / 1000); gl.uniform2f(U('m'), mx, my);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); c.classList.add('ready'); raf = seen ? requestAnimationFrame(draw) : 0;
    };
    new IntersectionObserver(es => { seen = es[0].isIntersecting; if (seen && !raf) raf = requestAnimationFrame(draw); }).observe(c);
    c.parentElement.addEventListener('pointermove', e => { const r = c.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width - .5; ty = (e.clientY - r.top) / r.height - .5; }, { passive: true });
  });

  // ---------- Letters that jump on hover (CTA title). Arabic is split by word so letters keep their joins. ----------
  $$('.wave').forEach(el => {
    const t = el.textContent.trim(); let c = 0; el.setAttribute('aria-label', t); el.textContent = '';
    t.split(/\s+/).forEach((w, wi, all) => {
      const sp = document.createElement('span'); sp.className = 'wd'; sp.setAttribute('aria-hidden', 'true');
      (AR ? [w] : [...w]).forEach(ch => { const s = document.createElement('span'); s.className = 'ch'; s.style.setProperty('--c', AR ? wi : c++); s.textContent = ch; sp.appendChild(s); });
      el.appendChild(sp); if (wi < all.length - 1) el.appendChild(document.createTextNode(' '));
    });
  });

  // ---------- Mouse-only effects ----------
  if (FINE) {
    // Spotlight that follows the pointer on cards.
    $$('.svc,.feats>div,.panel,.facts,.cols3>section,.love-c,.ccard,.xcard,.step,.why>div').forEach(el => el.classList.add('spot'));
    let sp = null;
    addEventListener('pointermove', e => {
      const t = e.target.closest && e.target.closest('.spot'); if (!t) return;
      if (sp) return; sp = requestAnimationFrame(() => { sp = null; const r = t.getBoundingClientRect(); t.style.setProperty('--sx', (e.clientX - r.left) + 'px'); t.style.setProperty('--sy', (e.clientY - r.top) + 'px'); });
    }, { passive: true });

    // 3D tilt + glare on project cards.
    $$('.card-link').forEach(a => {
      a.addEventListener('pointermove', e => {
        const r = a.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        a.style.setProperty('--ty', ((x - .5) * 9).toFixed(2) + 'deg'); a.style.setProperty('--tx', ((.5 - y) * 7).toFixed(2) + 'deg');
        a.style.setProperty('--gx', (x * 100).toFixed(0) + '%'); a.style.setProperty('--gy', (y * 100).toFixed(0) + '%');
      });
      a.addEventListener('pointerleave', () => { a.style.setProperty('--tx', '0deg'); a.style.setProperty('--ty', '0deg'); });
    });

    // Magnetic buttons.
    $$('.btn,.soc,.theme,.menu,.nav a.lang').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mgx', clamp((e.clientX - r.left - r.width / 2) * .28, -12, 12).toFixed(1) + 'px');
        el.style.setProperty('--mgy', clamp((e.clientY - r.top - r.height / 2) * .28, -10, 10).toFixed(1) + 'px');
      });
      el.addEventListener('pointerleave', () => { el.style.removeProperty('--mgx'); el.style.removeProperty('--mgy'); });
    });

    // Ripple on project images: one pulse of distortion that settles.
    const dm = $('#ripple feDisplacementMap'), tb = $('#ripple feTurbulence');
    if (dm && tb) {
      let raf = 0, amp = 0, ph = 0, img = null;
      const tick = () => {
        amp *= .93; ph += .05; dm.setAttribute('scale', amp.toFixed(1));
        tb.setAttribute('baseFrequency', `${(.012 + Math.sin(ph) * .004).toFixed(4)} ${(.018 + Math.cos(ph) * .005).toFixed(4)}`);
        if (amp > .4) raf = requestAnimationFrame(tick); else { raf = 0; dm.setAttribute('scale', 0); if (img) img.classList.remove('rip'); }
      };
      $$('.card-link').forEach(a => a.addEventListener('pointerenter', () => {
        const i = $('.media img:not(.broken)', a); if (!i) return;
        if (img && img !== i) img.classList.remove('rip'); img = i; img.classList.add('rip'); amp = 26; if (!raf) raf = requestAnimationFrame(tick);
      }));
    }

    // Scrambling letters on hover (English only; scrambling Arabic would break the letter joins).
    if (!AR) {
      const CH = 'abcdefghijklmnopqrstuvwxyz<>/{}[]=+*#_-';
      $$('.nav a:not(.btn):not(.lang),.foot nav a,.btn>span:not(.sr)').forEach(el => {
        if (el.children.length) return;
        const hostEl = el.closest('a,button') || el, orig = el.textContent; let raf = 0;
        if (!hostEl.hasAttribute('aria-label') && !$('.sr', hostEl)) hostEl.setAttribute('aria-label', orig.trim());
        hostEl.addEventListener('pointerenter', () => {
          cancelAnimationFrame(raf); el.style.minWidth = el.getBoundingClientRect().width + 'px';
          const t0 = performance.now(), n = orig.length;
          const step = t => {
            const p = clamp((t - t0) / 520, 0, 1); let out = '';
            for (let i = 0; i < n; i++) out += (orig[i] === ' ' || i < p * n * 1.15) ? orig[i] : CH[Math.random() * CH.length | 0];
            el.textContent = out; if (p < 1) raf = requestAnimationFrame(step); else { el.textContent = orig; el.style.minWidth = ''; }
          };
          raf = requestAnimationFrame(step);
        });
        hostEl.addEventListener('pointerleave', () => { cancelAnimationFrame(raf); el.textContent = orig; el.style.minWidth = ''; });
      });
    }

    // Custom cursor.
    const dot = mk('cur cur-dot'), ring = mk('cur cur-ring', '<i class="ri"><span></span></i>'), ri = $('.ri', ring), lab = $('span', ri);
    root.classList.add('has-cur');
    let mx = -100, my = -100, rx = -100, ry = -100, shown = false, craf = 0;
    const frame = () => {
      rx = lerp(rx, mx, .2); ry = lerp(ry, my, .2);
      ring.style.transform = `translate3d(${rx.toFixed(1)}px,${ry.toFixed(1)}px,0)`; dot.style.transform = `translate3d(${mx}px,${my}px,0)`;
      craf = Math.abs(mx - rx) + Math.abs(my - ry) > .2 ? requestAnimationFrame(frame) : 0;
    };
    addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return; mx = e.clientX; my = e.clientY;
      if (!shown) { shown = true; rx = mx; ry = my; dot.classList.add('on'); ring.classList.add('on'); }
      const t = e.target.closest ? e.target : document.body, l = t.closest('[data-cursor]');
      const txt = l ? l.dataset.cursor : '';
      lab.textContent = txt; ri.classList.toggle('lbl', !!txt);
      ri.classList.toggle('hov', !txt && !!t.closest('a,button,summary,.fchip,[role=tab],label,.ba'));
      ri.classList.toggle('hide', !!t.closest('input:not([type=range]):not([type=checkbox]),textarea,select'));
      if (!craf) craf = requestAnimationFrame(frame);
    }, { passive: true });
    addEventListener('pointerdown', () => ri.classList.add('dn')); addEventListener('pointerup', () => ri.classList.remove('dn'));
    document.addEventListener('mouseleave', () => { dot.classList.remove('on'); ring.classList.remove('on'); shown = false; });

    // Soft coloured trail behind the pointer.
    const tc = document.createElement('canvas'); tc.className = 'trail'; tc.setAttribute('aria-hidden', 'true'); document.body.appendChild(tc);
    const tx = tc.getContext('2d'); let pts = [], traf = 0, dpr = 1;
    const tsize = () => { dpr = Math.min(devicePixelRatio || 1, 2); tc.width = innerWidth * dpr; tc.height = innerHeight * dpr; tx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    tsize(); addEventListener('resize', tsize);
    const tframe = () => {
      const now = performance.now(), th = theme(); pts = pts.filter(p => now - p.t < 520);
      tx.clearRect(0, 0, innerWidth, innerHeight); tx.lineCap = 'round';
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], life = 1 - (now - b.t) / 520, k = i / pts.length;
        const c = th.accent.map((v, j) => Math.round(lerp(v, [242, 170, 140][j], k)));
        tx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${(life * .45).toFixed(3)})`; tx.lineWidth = 2 + life * 7;
        tx.beginPath(); tx.moveTo(a.x, a.y); tx.lineTo(b.x, b.y); tx.stroke();
      }
      traf = pts.length ? requestAnimationFrame(tframe) : 0;
    };
    addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; pts.push({ x: e.clientX, y: e.clientY, t: performance.now() }); if (pts.length > 40) pts.shift(); if (!traf) traf = requestAnimationFrame(tframe); }, { passive: true });
  }

  // ---------- Confetti (called after the contact form is sent) ----------
  window.dcFx = {
    confetti(from) {
      const c = document.createElement('canvas'); c.className = 'confetti'; c.setAttribute('aria-hidden', 'true'); document.body.appendChild(c);
      const dpr = Math.min(devicePixelRatio || 1, 2), ctx = c.getContext('2d'); c.width = innerWidth * dpr; c.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const r = from && from.getBoundingClientRect ? from.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
      const ox = r.left + r.width / 2, oy = r.top + r.height / 2, th = theme();
      const cols = [th.accent, th.brand, [242, 146, 111], th.bg, th.surface].map(a => `rgb(${a[0]},${a[1]},${a[2]})`);
      const ps = Array.from({ length: 150 }, () => { const a = -Math.PI / 2 + (Math.random() - .5) * 2.2, v = 6 + Math.random() * 9; return { x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, w: 6 + Math.random() * 6, h: 4 + Math.random() * 5, rot: Math.random() * 6, vr: (Math.random() - .5) * .4, c: cols[Math.random() * cols.length | 0] }; });
      const t0 = performance.now();
      const f = t => {
        const age = t - t0; ctx.clearRect(0, 0, innerWidth, innerHeight);
        ps.forEach(p => { p.vy += .28; p.vx *= .992; p.x += p.vx; p.y += p.vy; p.rot += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = clamp(1 - (age - 1800) / 700, 0, 1); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); });
        if (age < 2600) requestAnimationFrame(f); else c.remove();
      };
      requestAnimationFrame(f);
    }
  };

  run();
})();
