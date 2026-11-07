// <dev.commit> site generator: content/*.json -> dist/ (English at /, Arabic at /ar/). No dependencies. Node >= 18.
const fs = require('fs'), path = require('path'), http = require('http');
const I = require('./lib/i18n.js');
const R = __dirname, OUT = path.join(R, 'dist');
// GitHub Pages project sites live under /<repo>/, so every root-relative URL gets this prefix (empty for a custom domain or local dev).
const BASE = (process.env.BASE_PATH || '').replace(/\/+$/, '').replace(/^(?!\/)(.+)/, '/$1');
const rd = f => JSON.parse(fs.readFileSync(path.join(R, 'content', f), 'utf8'));
const rdOpt = (f, d) => { try { return rd(f); } catch (x) { if (x.code === 'ENOENT') return d; throw x; } };
const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Only http(s), mailto, tel, in-site paths and anchors are allowed ("//host" is not an in-site path).
const safeUrl = s => /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/.test(s || '');
const HEX = /^#[0-9a-fA-F]{6}$/;
const NO_PREFIX = /^\/(assets|api|admin|\.well-known)(\/|$)/;
const IMG = /\.(jpe?g|png|webp|avif|gif)$/i;
const slugify = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const nat = (a, b) => a.localeCompare(b, undefined, { numeric: true });

// Drop-in project images: put files in assets/img/projects/<slug>/ and they are picked up without editing any JSON.
//   cover.jpg (or desktop/main/hero)  -> main image        mobile.jpg (or phone)  -> phone screenshot
//   before.jpg + after.jpg            -> before/after slider   1.jpg, 2.jpg, gallery-1.jpg ... -> draggable gallery
// A single file named assets/img/projects/<slug>.jpg (and <slug>-mobile.jpg) also works.
function autoAssets(p) {
  const root = path.join(R, 'assets/img/projects'), url = f => '/assets/img/projects/' + f;
  let top = [], inner = [];
  try { top = fs.readdirSync(root).filter(f => IMG.test(f)); } catch (x) {}
  try { inner = fs.readdirSync(path.join(root, p.slug)).filter(f => IMG.test(f)).sort(nat); } catch (x) {}
  const find = (list, re, pre) => { const f = list.find(n => re.test(n.replace(IMG, ''))); return f ? url((pre || '') + f) : ''; };
  const sub = p.slug + '/';
  if (!p.image) p.image = find(inner, /^(cover|desktop|main|hero|image)$/i, sub) || find(top, new RegExp('^' + p.slug + '$', 'i'));
  if (!p.mobileImage) p.mobileImage = find(inner, /^(mobile|phone)$/i, sub) || find(top, new RegExp('^' + p.slug + '-mobile$', 'i'));
  if (!(p.beforeAfter && p.beforeAfter.before && p.beforeAfter.after)) {
    const b = find(inner, /^before$/i, sub), a = find(inner, /^after$/i, sub);
    if (b && a) p.beforeAfter = { before: b, after: a };
  }
  if (!Array.isArray(p.gallery) || !p.gallery.length) p.gallery = inner.filter(f => /^(\d+|gallery[-_ ]?\d*|shot[-_ ]?\d*)$/i.test(f.replace(IMG, ''))).map(f => url(sub + f));
}

// Inline icons (stroke style). Every shape gets pathLength="1" so CSS can "draw" it.
const svg = (inner, size = 22) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner.replace(/<(path|circle|rect|line|polyline|polygon)\b/g, '<$1 pathLength="1"')}</svg>`;
const PATHS = [
  '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10.5" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
  '<path d="M8 8l-5 4 5 4"/><path d="M16 8l5 4-5 4"/><path d="M14 5l-4 14"/>',
  '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>',
  '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
  '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  '<path d="M20 11a8 8 0 0 0-14.9-3M4 5v4h4"/><path d="M4 13a8 8 0 0 0 14.9 3M20 19v-4h-4"/>',
  '<path d="M9 3v5M15 3v5"/><path d="M6 8h12v3a6 6 0 0 1-12 0V8z"/><path d="M12 17v4"/>',
  '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6z"/>'
];
const BAG = '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8a3 3 0 0 1 6 0"/>';
const SOC = {
  instagram: '<rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>',
  linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
  facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
  youtube: '<path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>',
  x: '<path d="M4 4l16 16M20 4L4 20"/>',
  github: '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>'
};
const SUN = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
const MOON = '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';

function build() {
  const S_en = rd('site.json');
  const P_en = rd('projects.json');
  P_en.forEach(p => { if (!p.slug) p.slug = slugify(p.title); autoAssets(p); });
  const arabicOn = S_en.arabic !== false;
  const S_ar = I.resolveSite(S_en, rdOpt('site.ar.json', {}), 'ar');
  const P_ar = I.mergeProjects(P_en, rdOpt('projects.ar.json', {}));
  const S_enR = I.resolveSite(S_en, null, 'en');
  const SITE = (process.env.SITE_URL || S_en.siteUrl || '').replace(/\/$/, '');
  const ENDPOINT = process.env.FORM_ENDPOINT || S_en.formEndpoint || '';
  if (process.env.NODE_ENV === 'production' && P_en.some(p => p.demo) && S_en.showDemoProjects) console.warn('WARNING: demo projects are included in a production build (set showDemoProjects to false).');
  P_en.forEach(p => { if (!/^[a-z0-9-]+$/.test(p.slug || '')) throw new Error('Invalid project slug: ' + p.slug); });

  const out = {};
  const ctx = { SITE, ENDPOINT, arabicOn, S_en: S_enR };
  Object.assign(out, render('en', S_enR, P_en, ctx));
  if (arabicOn) {
    const cat = c => { const i = (S_en.categories || []).indexOf(c); return i >= 0 && S_ar.categories && S_ar.categories[i] ? S_ar.categories[i] : c; };
    Object.assign(out, render('ar', S_ar, P_ar.map(p => ({ ...p, category: cat(p.category) })), ctx));
  }

  fs.rmSync(OUT, { recursive: true, force: true });
  for (let [url, html] of Object.entries(out)) {
    const f = url.endsWith('.html') ? path.join(OUT, url) : path.join(OUT, url, 'index.html');
    if (BASE) html = html.replace(/\b(href|src|action)="\/(?!\/)/g, `$1="${BASE}/`);
    fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html);
  }
  fs.cpSync(path.join(R, 'assets'), path.join(OUT, 'assets'), { recursive: true });

  // Theme colours live in a generated stylesheet so pages need no inline <style> (strict CSP).
  const th = { background: '#FAF3E8', primary: '#2F5D50', accent: '#C8674A', surface: '#F1E6D3', text: '#2F5D50', ...(S_en.theme || {}) };
  for (const k of Object.keys(th)) if (!HEX.test(th[k])) th[k] = { background: '#FAF3E8', primary: '#2F5D50', accent: '#C8674A', surface: '#F1E6D3', text: '#2F5D50' }[k];
  fs.writeFileSync(path.join(OUT, 'assets/css/theme.css'), `:root{--color-cream:${th.background};--color-forest:${th.primary};--color-terracotta:${th.accent};--color-terracotta-dark:color-mix(in srgb, ${th.accent} 78%, #000);--color-cream-deep:${th.surface};--color-line:${th.primary}33;--color-text:${th.text};--bg:${th.background};--primary:${th.primary};--accent:${th.accent};--surface:${th.surface};color-scheme:light}body{color:var(--color-text)}\n`);

  fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
  if (fs.existsSync(path.join(R, 'CNAME'))) fs.copyFileSync(path.join(R, 'CNAME'), path.join(OUT, 'CNAME'));
  const urls = Object.keys(out).filter(x => !x.endsWith('.html'));
  fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n${SITE ? `Sitemap: ${SITE}/sitemap.xml\n` : ''}`);
  if (SITE) {
    const neutral = x => x.replace(/^\/ar(\/|$)/, '/');
    const alt = x => arabicOn ? `<xhtml:link rel="alternate" hreflang="en" href="${e(SITE + neutral(x))}"/><xhtml:link rel="alternate" hreflang="ar" href="${e(SITE + '/ar' + neutral(x))}"/>` : '';
    fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.map(x => `<url><loc>${e(SITE + x)}</loc>${alt(x)}</url>`).join('')}</urlset>`);
  } else console.warn('Note: siteUrl is empty, so canonical URLs, Open Graph URLs and sitemap.xml were skipped.');
  if (S_en.email) {
    fs.mkdirSync(path.join(OUT, '.well-known'), { recursive: true });
    const exp = new Date(Date.now() + 300 * 864e5).toISOString();
    fs.writeFileSync(path.join(OUT, '.well-known/security.txt'), `Contact: mailto:${S_en.email}\nExpires: ${exp}\nPreferred-Languages: en, ar\n${SITE ? `Canonical: ${SITE}/.well-known/security.txt\n` : ''}`);
  }
  return check();
}

function render(lang, S, P, ctx) {
  const { SITE, ENDPOINT, arabicOn, S_en } = ctx;
  const AR = lang === 'ar', pre = AR ? '/ar' : '';
  const T = { ...I.DEF[lang].ui, ...(S.ui || {}) };
  // The brand name contains < > . which a right-to-left page would mirror; isolate it as left-to-right text.
  const NAME = AR ? '\u2066' + S.name + '\u2069' : S.name;
  const nm = s => I.fill(s, NAME);
  const iso = s => (AR ? String(s).split(S.name).join(NAME) : String(s));
  const u = s => { s = String(s || ''); if (!safeUrl(s)) return '#'; if (AR && s[0] === '/' && !NO_PREFIX.test(s) && !/^\/ar(\/|$)/.test(s)) s = '/ar' + s; return e(s); };
  const arrow = AR ? '←' : '→', arrowUp = '↗';
  if (!S.showDemoProjects) P = P.filter(p => !p.demo);
  const feat = P.find(p => p.featured) || P[0];
  const list = a => (a && a.length ? `<ul class="list">${a.map(x => `<li>${e(x)}</li>`).join('')}</ul>` : '');
  const socials = Object.entries(S.social || {}).filter(([, v]) => v && safeUrl(v));
  const soc = ([k, v]) => { const n = T['soc_' + k] || k[0].toUpperCase() + k.slice(1); return SOC[k] ? `<a class="soc soc-${e(k)}" href="${u(v)}" target="_blank" rel="noopener noreferrer" aria-label="${e(n)}" title="${e(n)}">${svg(SOC[k], 20)}<span class="sr"> ${e(T.newTab)}</span></a>` : `<a class="link" href="${u(v)}" target="_blank" rel="noopener noreferrer">${e(n)}</a>`; };
  const eb = s => e(s).split(e(S.name)).join(`<span class="brand">${e(S.name)}</span>`);
  const CP = { title: 'Get in Touch', text: 'Have a project in mind? Fill out the form and we will get back to you.', submitLabel: 'Send inquiry', successMessage: 'Thank you. Your inquiry was sent and we will reply by email.', ...(S.contactPage || {}) };
  const contactChannels = Array.isArray(CP.channels) ? CP.channels : [];
  const CL = CP.labels, FT = S.footer;
  const extraFields = Array.isArray(CP.extraFields) ? CP.extraFields : [];
  const txt = key => { const v = nm(S.copy[key]); return v || (key === 'aboutPageText' ? S.description : ''); };
  const year = new Date().getFullYear();
  // Strict CSP: no inline scripts/styles, nothing loaded from other sites except images; forms may only go to the configured endpoint.
  const epOrigin = (() => { try { return new URL(ENDPOINT).origin; } catch (x) { return ''; } })();
  const CSP = `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'${epOrigin ? ' ' + epOrigin : ''}; form-action 'self'${epOrigin ? ' ' + epOrigin : ''}; base-uri 'self'; object-src 'none'; manifest-src 'self'`;

  const logo = h => `<img src="/assets/img/logo.png" alt="${e(S.name)}" width="913" height="134" class="logo ${h}">`;
  const media = (p, eager, zoom) => {
    const ini = e([...String(p.title || '').replace(/[^\p{L}\p{N} ]/gu, '').split(' ').filter(Boolean).map(w => [...w][0]).join('')].slice(0, 2).join('').toUpperCase());
    return `<div class="media"${zoom && p.image ? ' data-zoom data-cursor="+"' : ''}><div class="ph" aria-hidden="true">${ini}</div>${p.image ? `<img src="${u(p.image)}" alt="${e(p.title)}${AR ? '' : ' storefront'}" ${eager ? '' : 'loading="lazy"'} decoding="async">` : ''}</div>`;
  };
  const card = p => `<article class="card" data-cat="${e(p.category)}" data-text="${e([p.title, p.client, p.summary, p.category].join(' ').toLowerCase())}">
<a class="card-link" data-cursor="${e(T.cursorView)}" href="${u('/work/' + p.slug + '/')}"><div class="folder">${media(p)}<div class="front"><p class="meta"><span class="cat">${e(p.category)}</span>${p.demo ? `<span class="badge">${e(T.demo)}</span>` : ''}</p><h3>${e(p.title)}</h3><p>${e(p.summary)}</p><span class="more">${e(T.viewProject)} <span aria-hidden="true">${arrow}</span></span></div></div></a>${p.url ? `<a class="live" href="${u(p.url)}" target="_blank" rel="noopener noreferrer">${e(T.visitLive)} <span aria-hidden="true">${arrowUp}</span><span class="sr"> ${e(T.newTab)}</span></a>` : ''}</article>`;
  const btn = (b, cls) => `<a class="btn ${cls || ''}" href="${u(b.href)}">${e(b.label)}</a>`;

  function page({ url, title, desc, body, img, ld, noindex, trail }) {
    const full = title ? `${title} — ${NAME}` : iso(S.title);
    const d = desc || S.description;
    const full_url = SITE + pre + url;
    const canon = SITE ? `<link rel="canonical" href="${e(full_url)}">` : '';
    const neutral = url === '/404.html' ? '/' : url;
    const alts = SITE && arabicOn && !noindex ? `<link rel="alternate" hreflang="en" href="${e(SITE + neutral)}"><link rel="alternate" hreflang="ar" href="${e(SITE + '/ar' + neutral)}"><link rel="alternate" hreflang="x-default" href="${e(SITE + neutral)}">` : '';
    const og = `<meta property="og:title" content="${e(full)}"><meta property="og:description" content="${e(d)}"><meta property="og:type" content="website"><meta property="og:locale" content="${AR ? 'ar_AR' : 'en_US'}">${SITE ? `<meta property="og:url" content="${e(full_url)}"><meta property="og:image" content="${e(SITE + (img || '/assets/img/logo-original.jpg'))}">` : ''}<meta name="twitter:card" content="summary_large_image">`;
    const nav = S.nav.map(n => `<a href="${u(n.href)}"${n.href === url || (n.href !== '/' && url.startsWith(n.href)) ? ' aria-current="page"' : ''}>${e(n.label)}</a>`).join('');
    const switcher = arabicOn ? `<a class="lang" href="${e(AR ? neutral : '/ar' + neutral)}" hreflang="${AR ? 'en' : 'ar'}" lang="${AR ? 'en' : 'ar'}" aria-label="${e(T.switchAria)}">${e(T.switchLabel)}</a>` : '';
    const foot = `<footer class="foot"><div class="wrap foot-grid"><div><a href="${u('/')}" aria-label="${e(nm(T.homeAria))}">${logo('foot-logo')}</a><p class="muted">${e(S.description)}</p></div>
<nav aria-label="${e(T.ariaFooter)}"><h2 class="fh">${e(FT.navigationTitle)}</h2>${S.nav.map(n => `<a href="${u(n.href)}">${e(n.label)}</a>`).join('')}</nav>
<nav aria-label="${e(T.ariaServices)}"><h2 class="fh">${e(FT.servicesTitle)}</h2>${S.services.slice(0, 5).map(s => `<a href="${u('/services/')}">${e(s.title)}</a>`).join('')}</nav>
<div><h2 class="fh">${e(FT.contactTitle)}</h2>${S.email ? `<a href="mailto:${e(S.email)}" class="ltr">${e(S.email)}</a>` : `<a href="${u('/contact/')}">${e(T.sendInquiryLink)}</a>`}${socials.length ? `<p class="follow">${e(T.followUs)}</p><div class="socs">${socials.map(soc).join('')}</div>` : ''}</div></div>
<div class="wrap sub"><span>&copy; ${year} <span dir="auto">${e(S.name)}</span>. ${e(FT.copyright)}</span>${(S.legal || []).map(l => `<a href="${u(l.href)}">${e(l.label)}</a>`).join('')}</div></footer>`;
    return `<!doctype html><html lang="${lang}" dir="${AR ? 'rtl' : 'ltr'}"${arabicOn ? ' data-ar' : ''} data-base="${e(BASE)}" data-close="${e(T.closeZoom)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${e(CSP)}"><meta name="referrer" content="strict-origin-when-cross-origin">
<title>${e(full)}</title><meta name="description" content="${e(d)}">${noindex ? '<meta name="robots" content="noindex">' : ''}${canon}${alts}${og}
<meta name="theme-color" content="${e(HEX.test(S_en.theme && S_en.theme.background) ? S_en.theme.background : '#FAF3E8')}"><link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml"><script src="/assets/js/boot.js"></script><link rel="preload" href="/assets/fonts/cairo-latin.woff" as="font" type="font/woff" crossorigin>${AR ? '<link rel="preload" href="/assets/fonts/cairo-arabic.woff" as="font" type="font/woff" crossorigin>' : ''}<link rel="stylesheet" href="/assets/css/styles.css"><link rel="stylesheet" href="/assets/css/fx.css"><link rel="stylesheet" href="/assets/css/theme.css">${ld ? `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>` : ''}</head>
<body><div class="curtain" aria-hidden="true"><i></i><i></i><img src="/assets/img/logo-light.png" alt="" width="913" height="134" decoding="async"></div><a class="skip" href="#main">${e(T.skip)}</a>
<svg class="defs" width="0" height="0" aria-hidden="true" focusable="false"><filter id="ripple" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter></svg>
<header class="head"><div class="wrap bar"><a href="${u('/')}" aria-label="${e(nm(T.homeAria))}">${logo('head-logo')}</a>
<div class="bar-end"><nav id="nav" class="nav" aria-label="${e(T.ariaMain)}">${nav}${switcher}${btn(S.headerCta, 'sm')}</nav>
<button class="theme" type="button" aria-label="${e(T.themeAria)}"><span class="i-sun">${svg(SUN, 20)}</span><span class="i-moon">${svg(MOON, 20)}</span></button>
<button class="menu" aria-expanded="false" aria-controls="nav"><span class="sr">${e(T.menu)}</span><i></i></button></div></div></header>
<main id="main"${trail ? ' data-trail' : ''}>${body}</main>${foot}<script src="/assets/js/main.js" defer></script><script src="/assets/js/fx.js" defer></script></body></html>`;
  }

  const FL = ['f1', 'f2 c', 'f3 c', 'f4', 'f5', 'f6 c'];
  const floaters = () => `<div class="floaters" aria-hidden="true">${FL.map(c => `<i class="tile ${c}">${ICON}</i>`).join('')}</div>`;
  const swapWords = (S.cta.swap && Array.isArray(S.cta.swap.words) ? S.cta.swap.words : []).filter(w => typeof w === 'string' && w.trim());
  const swap = swapWords.length ? `<p class="swap"><span>${e(S.cta.swap.prefix || '')}</span> <span class="swapw" data-words="${e(JSON.stringify(swapWords))}"><b>${e(swapWords[0])}</b></span></p>` : '';
  const cta = () => `<section class="band dark"><canvas class="liquid" aria-hidden="true"></canvas>${floaters()}<div class="wrap center"><h2 class="wave">${e(S.cta.title)}</h2>${swap}<p class="lead">${e(S.cta.text)}</p>${btn(S.cta, 'inv')}</div></section>`;
  const head = (t, sub) => `<div class="sec-head"><h2>${e(t)}</h2>${sub ? `<p class="lead">${e(sub)}</p>` : ''}</div>`;
  const steps = cls => `<ol class="steps${cls ? ' ' + cls : ''}">${S.process.map((s, i) => `<li><span class="num">${String(i + 1).padStart(2, '0')}</span><h3>${e(s.title)}</h3><p>${e(s.desc)}</p></li>`).join('')}</ol>`;
  const pageHero = (t, sub) => `<section class="wrap phero"><h1>${e(t)}</h1>${sub ? `<p class="lead">${e(sub)}</p>` : ''}</section>`;
  const ICON = svg(BAG);
  const ico = i => `<span class="ico" aria-hidden="true">${svg(PATHS[i % PATHS.length])}</span>`;
  const out = {};
  const K = url => pre + url;

  // HOME
  const H = S.hero;
  const heroDesktopImage = H.image || (feat && feat.image) || '';
  const heroMobileImage = H.mobileImage || (feat && feat.mobileImage) || heroDesktopImage;
  const heroMedia = { ...(feat || { title: 'dev.commit' }), image: heroDesktopImage };
  const heroPhoneMedia = { ...(feat || { title: 'dev.commit' }), image: heroMobileImage };
  const heroVisual = `<div class="visual"><i class="shape s1"></i><i class="shape s2"></i><div class="laptop"><div class="screen">${media(heroMedia, true)}</div><div class="base"></div></div>${(feat || heroDesktopImage || heroMobileImage) ? `<div class="phone">${media(heroPhoneMedia, true)}</div>` : ''}</div>`;
  const tests = (S.testimonials || []).filter(t => t.approved && t.quote);
  const tw = (H.typed && Array.isArray(H.typed.words) ? H.typed.words : []).filter(w => typeof w === 'string' && w.trim());
  const typed = tw.length ? `<p class="typed"><span class="tp">${e(H.typed.prefix || '')}</span> <span class="tw" data-words="${e(JSON.stringify(tw))}">${e(tw[0])}</span><i class="caret" aria-hidden="true"></i></p>` : '';
  const fmt = n => n.toLocaleString(AR ? 'ar-EG' : 'en-US');
  // Spotlight band (replaces the old counters): a cycling list of real selling points + a floating brand visual.
  const SP = S.spotlight || {};
  const spItems = (Array.isArray(SP.items) ? SP.items : []).filter(x => x && x.value && x.label);
  const spotHtml = spItems.length ? `<section class="band dark spotband" aria-label="${e(T.spotAria)}"><div class="wrap spot-grid"><div class="spot-txt">${SP.eyebrow ? `<p class="eyebrow lt">${e(SP.eyebrow)}</p>` : ''}${SP.title ? `<h2>${e(SP.title)}</h2>` : ''}${SP.text ? `<p class="lead">${e(SP.text)}</p>` : ''}<ul class="spot-list">${spItems.map((x, i) => `<li class="spot-it${i === 0 ? ' on' : ''}"><button type="button" class="spot-b" aria-pressed="${i === 0}"><b>${e(x.value)}</b><span class="spot-l">${e(x.label)}</span><span class="spot-d">${e(x.desc || '')}</span></button><i class="spot-bar" aria-hidden="true"></i></li>`).join('')}</ul></div><div class="spot-vis" aria-hidden="true"><i class="ring r1"></i><i class="ring r2"></i><i class="ring r3"></i><i class="dot d1"></i><i class="dot d2"></i><i class="dot d3"></i><div class="orb"><img src="/assets/img/logo-light.png" alt="" width="913" height="134" decoding="async"></div><div class="chip"><b>${e(spItems[0].value)}</b><span>${e(spItems[0].label)}</span></div></div></div></section>` : '';
  // "More love from our clients": cards come from content/site.json -> testimonials (only approved ones with a quote).
  // While there are none, clearly-labelled placeholder cards show only when showDemoProjects is on; a live site hides the section.
  const initials = n => e([...String(n || '').replace(/[^\p{L}\p{N} ]/gu, '').split(' ').filter(Boolean).map(w => [...w][0]).join('')].slice(0, 2).join('').toUpperCase());
  const loveCard = t => { const r = Math.round(Number(t.rating)); const stars = r >= 1 && r <= 5 ? `<div class="stars" role="img" aria-label="${r} / 5">${'★'.repeat(r)}<span>${'★'.repeat(5 - r)}</span></div>` : ''; const who = [t.role, t.company].filter(Boolean).join(AR ? ' – ' : ' · '); const av = t.image && safeUrl(t.image) && IMG.test(t.image) ? `<img class="av" src="${u(t.image)}" alt="" width="44" height="44" loading="lazy" decoding="async">` : `<span class="av" aria-hidden="true">${initials(t.name)}</span>`; return `<figure class="love-c">${stars}<blockquote>${e(t.quote)}</blockquote><figcaption>${av}<span><b>${e(t.name)}</b>${who ? `<small>${e(who)}</small>` : ''}</span></figcaption></figure>`; };
  const loveDemo = [0, 1, 2].map(() => `<figure class="love-c is-demo"><div class="stars" aria-hidden="true">★★★★★</div><blockquote>${e(T.loveEmpty)}</blockquote><figcaption><span class="av" aria-hidden="true">+</span><span><b>${e(T.loveEmptyName)}</b><small>${e(T.loveEmptyRole)}</small></span></figcaption></figure>`).join('');
  const loveHtml = S.sections.testimonials !== false && (tests.length || S.showDemoProjects) ? `<section class="wrap sec love" aria-labelledby="love-h"><div class="sec-head"><p class="eyebrow"><span class="arr" aria-hidden="true">↳</span> ${e(T.loveEyebrow)}</p><h2 id="love-h">${e(T.loveTitle)}</h2></div><div class="love-grid">${tests.length ? tests.map(loveCard).join('') : loveDemo}</div></section>` : '';
  const big = S.bigText ? (e(S.bigText) + ' ').repeat(6) : '';
  const bigHtml = big ? `<section class="bigtext" aria-hidden="true"><div class="bt bt-a"><span>${big}</span></div><div class="bt bt-b"><span>${big}</span></div></section>` : '';
  const pad = n => String(n).padStart(2, '0');
  out[K('/')] = page({
    url: '/', trail: true, ld: SITE ? { '@context': 'https://schema.org', '@type': 'Organization', name: S.name, url: SITE, logo: SITE + '/assets/img/logo.png', ...(socials.length ? { sameAs: socials.map(x => x[1]) } : {}) } : null,
    body: `<div class="herowrap"><div class="hero-bg" aria-hidden="true"><canvas class="dots"></canvas><i class="aurora a1"></i><i class="aurora a2"></i></div><section class="wrap hero"><div><p class="eyebrow">${e(H.eyebrow)}</p><h1>${e(H.title).replace(/(\S+)$/, '<span class="acc">$1</span>')}</h1>${typed}<p class="lead">${e(H.text)}</p><div class="row">${btn({ label: H.primary.label + ' ' + arrow, href: H.primary.href })}${btn(H.secondary, 'ghost')}</div></div>${heroVisual}</section></div>
${P.length ? `<section class="wrap sec"><div class="sec-head split"><div><p class="eyebrow">${eb(txt('featuredEyebrow'))}</p><h2>${e(txt('featuredTitle'))}</h2></div><a class="link" href="${u('/work/')}">${e(T.viewAll)} <span aria-hidden="true">${arrow}</span></a></div><div class="grid">${P.slice(0, 3).map(card).join('')}</div></section>` : ''}
${S.statement ? `<section class="wrap statement"><p class="reveal-words">${S.statement.split(' ').map(w => `<span>${e(w)}</span>`).join(' ')}</p></section>` : ''}
${spotHtml}${bigHtml}
<section class="band dark"><div class="wrap"><div class="two"><div><p class="eyebrow lt">${eb(txt('servicesEyebrow'))}</p><h2>${e(S.servicesIntro.title)}</h2></div><p class="lead">${e(S.servicesIntro.text)}</p></div><div class="svc-grid">${S.services.map((s, i) => `<div class="svc">${ico(i)}<div><h3>${e(s.title)}</h3><p>${e(s.desc)}</p></div></div>`).join('')}</div></div></section>
<section class="wrap sec pinsec"><div class="pin-l"><div class="pin-sticky"><p class="eyebrow">${eb(txt('processEyebrow'))}</p><h2>${e(S.processIntro.title)}</h2><p class="lead">${e(S.processIntro.text)}</p><div class="pin-count" aria-hidden="true"><b>01</b><span>/${pad(S.process.length)}</span></div></div></div>${steps('steps-v')}</section>
${S.sections.why ? `<section class="wrap sec"><p class="eyebrow">${eb(txt('whyEyebrow'))}</p><h2>${e(S.whyTitle)}</h2><div class="feats">${S.why.map((w, i) => `<div>${ico(i + 2)}<div><h3>${e(w.title)}</h3><p>${e(w.desc)}</p></div></div>`).join('')}</div></section>` : ''}
${loveHtml}
${cta()}`
  });

  // WORK
  out[K('/work/')] = page({
    url: '/work/', title: T.pageWork, desc: nm(T.descWork),
    body: `${pageHero(txt('workPageTitle'), txt('workPageText'))}<section class="wrap sec">
${P.length ? `<div class="filters"><label class="sr" for="q">${e(T.searchProjects)}</label><input id="q" type="search" placeholder="${e(T.searchProjects)}"><div role="group" aria-label="${e(T.ariaFilter)}"><button class="chip on" data-f="">${e(T.all)}</button>${[...new Set([...(S.categories || []), ...P.map(p => p.category)])].filter(c => c && P.some(p => p.category === c)).map(c => `<button class="chip" data-f="${e(c)}">${e(c)}</button>`).join('')}</div></div>
<div class="grid" id="grid">${P.map(card).join('')}</div><p id="empty" class="muted" hidden>${e(T.noMatch)}</p>` : `<p class="muted">${e(T.noProjects)} <a class="link" href="${u('/contact/')}">${e(T.getInTouch)}</a>.</p>`}</section>${cta()}`
  });
  P.forEach(p => {
    const rel = P.filter(x => x !== p && x.category === p.category).slice(0, 2);
    const blk = (t, c) => (c ? `<section><h2>${e(t)}</h2>${c}</section>` : '');
    const ba = p.beforeAfter && p.beforeAfter.before && p.beforeAfter.after ? p.beforeAfter : null;
    const baHtml = ba ? `<section class="wrap ba-sec"><h2>${e(T.beforeAfter)}</h2><div class="ba" dir="ltr" data-ba><div class="media ba-b"><img src="${u(ba.before)}" alt="${e(T.before)}" loading="lazy" decoding="async"></div><div class="media ba-a"><img src="${u(ba.after)}" alt="${e(T.after)}" loading="lazy" decoding="async"></div><span class="tag t-b">${e(T.before)}</span><span class="tag t-a">${e(T.after)}</span><i class="ba-line" aria-hidden="true"></i><i class="ba-knob" aria-hidden="true"></i><input type="range" min="0" max="100" value="50" aria-label="${e(T.compareAria)}"></div></section>` : '';
    const gal = (Array.isArray(p.gallery) ? p.gallery : []).map(g => (typeof g === 'string' ? { src: g } : g)).filter(g => g && g.src && safeUrl(g.src));
    const galHtml = gal.length ? `<section class="wrap gal-sec"><h2>${e(T.gallery)}</h2><div class="gal" data-drag tabindex="0" role="group" aria-label="${e(T.gallery)}">${gal.map((g, i) => `<figure class="gal-item"><div class="media" data-zoom data-cursor="+"><img src="${u(g.src)}" alt="${e(g.alt || p.title + ' ' + (i + 1))}" loading="lazy" decoding="async" draggable="false"></div></figure>`).join('')}</div><p class="hint muted">${e(T.dragHint)}</p></section>` : '';
    out[K(`/work/${p.slug}/`)] = page({
      url: `/work/${p.slug}/`, title: p.title, desc: p.summary, img: p.image || undefined,
      body: `<section class="wrap phero"><nav class="crumb" aria-label="${e(T.ariaBreadcrumb)}"><a href="${u('/work/')}">${e(T.crumbWork)}</a> / ${e(p.title)}</nav><p class="eyebrow">${e(p.category)}${p.demo ? ' · ' + e(T.demo) : ''}</p><h1>${e(p.title)}</h1><p class="lead">${e(p.summary)}</p>${p.url ? `<p><a class="btn" href="${u(p.url)}" target="_blank" rel="noopener noreferrer">${e(T.visitLive)} ${arrowUp}<span class="sr"> ${e(T.newTab)}</span></a></p>` : ''}</section>
<div class="wrap">${media(p, true, true)}</div>
<div class="wrap case">${blk(T.overview, p.overview ? `<p>${e(p.overview)}</p>` : '')}
<aside class="facts">${p.client ? `<h3>${e(T.client)}</h3><p>${e(p.client)}</p>` : ''}${p.services?.length ? `<h3>${e(T.servicesH)}</h3>${list(p.services)}` : ''}${p.tech?.length ? `<h3>${e(T.builtWith)}</h3>${list(p.tech)}` : ''}</aside>
${blk(T.goals, list(p.goals))}${blk(T.challenges, list(p.challenges))}${blk(T.approach, p.approach ? `<p>${e(p.approach)}</p>` : '')}${blk(T.outcomes, list(p.outcomes))}
${p.mobileImage ? `<section><h2>${e(T.onMobile)}</h2><div class="shot">${media({ ...p, image: p.mobileImage }, false, true)}</div></section>` : ''}</div>
${baHtml}${galHtml}
${rel.length ? `<section class="wrap sec">${head(T.related)}<div class="grid">${rel.map(card).join('')}</div></section>` : ''}${cta()}`
    });
  });

  // SERVICES
  out[K('/services/')] = page({
    url: '/services/', title: T.pageServices, desc: nm(T.descServices),
    body: `${pageHero(txt('servicesPageTitle'), txt('servicesPageText'))}<section class="wrap sec split-svc"><div class="tabs" role="tablist" aria-label="${e(T.ariaServices)}">${S.services.map((s, i) => `<button type="button" role="tab" id="t${i}" aria-controls="p${i}" aria-selected="${i === 0}" class="tab${i === 0 ? ' on' : ''}">${ico(i)}${e(s.title)}</button>`).join('')}</div><div>${S.services.map((s, i) => `<article class="panel" id="p${i}" role="tabpanel" aria-labelledby="t${i}"><h2>${e(s.title)}</h2><p>${e(s.desc)}</p><p class="val">${e(s.value)}</p><h3>${e(T.included)}</h3>${list(s.deliverables)}${btn({ label: T.startProject, href: '/contact/' })}</article>`).join('')}</div></section>
<section class="band tint"><div class="wrap">${head(T.workflow)}${steps()}</div></section>
<section class="wrap sec">${head(T.waysToWork)}<div class="why light">${S.engagements.map(g => `<div><h3>${e(g.title)}</h3><p>${e(g.desc)}</p></div>`).join('')}</div></section>
${S.sections.faq ? `<section class="wrap sec narrow">${head(T.faqTitle)}${S.faq.map(f => `<details><summary>${e(f.q)}</summary><p>${e(f.a)}</p></details>`).join('')}</section>` : ''}${cta()}`
  });

  // ABOUT
  const A = S.about;
  const blk2 = (t, c) => `<section><h2>${e(t)}</h2><p>${e(c)}</p></section>`;
  out[K('/about/')] = page({
    url: '/about/', title: T.pageAbout, desc: nm(T.descAbout),
    body: `<section class="wrap phero phero-split"><div><h1>${e(txt('aboutPageTitle'))}</h1>${txt('aboutPageText') ? `<p class="lead">${e(txt('aboutPageText'))}</p>` : ''}</div><div class="scene" aria-hidden="true"><svg class="blob" viewBox="0 0 200 200"><path d="M100,20 C150,18 182,58 180,102 C178,150 140,182 98,180 C54,178 20,146 20,100 C20,56 56,22 100,20 Z"><animate attributeName="d" dur="11s" repeatCount="indefinite" values="M100,20 C150,18 182,58 180,102 C178,150 140,182 98,180 C54,178 20,146 20,100 C20,56 56,22 100,20 Z;M104,16 C158,30 186,70 172,116 C160,160 126,186 86,178 C40,170 14,128 26,84 C36,44 70,10 104,16 Z;M96,24 C140,12 190,50 182,100 C176,146 150,170 104,184 C58,196 18,150 18,104 C18,60 58,34 96,24 Z;M100,20 C150,18 182,58 180,102 C178,150 140,182 98,180 C54,178 20,146 20,100 C20,56 56,22 100,20 Z"/></path></svg><div class="cube">${[0, 1, 2, 3, 4, 5].map(i => `<i class="face f${i}">${svg(PATHS[i], 38)}</i>`).join('')}</div></div></section><section class="wrap sec"><div class="cols3">${[[T.aboutMission, A.mission], [T.aboutPhilosophy, A.design + ' ' + A.development], [T.aboutApproach, A.approach]].map(([t, c]) => blk2(t, c)).join('')}</div></section>
${(S.team || []).length ? `<section class="wrap sec">${head(T.team)}<div class="why light">${S.team.map(m => `<div><h3>${e(m.name)}</h3><p>${e(m.role)}</p></div>`).join('')}</div></section>` : ''}
<section class="wrap sec"><div class="banner"><h2>${e(T.letsBuild)}</h2><a class="btn inv" href="${u('/work/')}">${e(T.exploreWork)}</a></div></section>`
  });

  // CONTACT
  // Labels are shown in the page language; the submitted value is always the English one (what the admin reads).
  const opt = (a, vals) => a.map((x, i) => `<option${vals && vals[i] != null ? ` value="${e(vals[i])}"` : ''}>${e(x)}</option>`).join('');
  const enCP = S_en.contactPage || {};
  const fld = (id, label, extra = '', req) => `<div class="f"><label for="${id}">${label}${req ? ' <span aria-hidden="true">*</span>' : ` <span class="muted">${e(T.optional)}</span>`}</label>${extra}</div>`;
  const E = e;
  out[K('/contact/')] = page({
    url: '/contact/', title: T.pageContact, desc: T.descContact,
    body: `${pageHero(CP.title, CP.text)}<section class="wrap sec contact"><aside class="cinfo"><h2>${e(CP.emailHeading || T.contactEmail)}</h2>${S.email ? `<p><a class="link ltr" href="mailto:${e(S.email)}">${e(S.email)}</a></p>` : `<p class="muted">${e(T.useFormReply)}</p>`}${socials.length ? `<div class="socs">${socials.map(soc).join('')}</div>` : ''}${contactChannels.map(c => `<p><a class="link" href="${u(c.href || '#')}" ${/^https?:/.test(c.href || '') ? 'target="_blank" rel="noopener noreferrer"' : ''}>${e(c.label)}${c.value ? ': ' + e(c.value) : ''}</a></p>`).join('')}</aside><form id="inquiry" method="post" action="${ENDPOINT ? u(ENDPOINT) : '#'}" ${ENDPOINT || !S.email ? '' : `data-mailto="${e(S.email)}"`} ${ENDPOINT || S.email ? '' : 'data-off'} data-m-mailto="${E(T.msgMailto)}" data-m-required="${E(T.msgRequired)}" data-m-sending="${E(T.msgSending)}" data-m-error="${E(T.msgError)}" novalidate>
${ENDPOINT ? '' : S.email ? `<p class="note">${e(T.formMailto)}</p>` : `<p class="note">${e(T.formOff)} ${S.email ? `${e(T.emailUsPrefix)} <a class="link ltr" href="mailto:${e(S.email)}">${e(S.email)}</a> ${e(T.emailUsSuffix)}` : e(T.formAddEndpoint)}</p>`}
<input type="hidden" name="lang" value="${lang}">
${fld('name', e(CL.name), '<input id="name" name="name" autocomplete="name" maxlength="120" required>', 1)}
${fld('email', e(CL.email), '<input id="email" name="email" type="email" autocomplete="email" maxlength="200" required>', 1)}
${fld('company', e(CL.company), '<input id="company" name="company" autocomplete="organization" maxlength="200" required>', 1)}
${fld('site', e(CL.website), '<input id="site" name="website" type="url" placeholder="https://" maxlength="300">')}
${fld('service', e(CL.service), `<select id="service" name="service" required><option value="">${e(T.selectService)}</option>${opt(S.services.map(s => s.title), S_en.services.map(s => s.title))}</select>`, 1)}
${(S.budgets || []).length ? fld('budget', e(CL.budget), `<select id="budget" name="budget"><option value="">${e(T.preferNot)}</option>${opt(S.budgets, S_en.budgets)}</select>`) : ''}
${fld('msg', e(CL.message), '<textarea id="msg" name="message" rows="6" required minlength="20" maxlength="5000"></textarea>', 1)}
${fld('pref', e(CL.contactMethod), `<select id="pref" name="contact_method"><option value="Email">${e(T.contactEmail)}</option><option value="Video call">${e(T.videoCall)}</option></select>`)}
${extraFields.map((x, i) => { const n = 'custom_' + i, label = e(x.label || (T.extraField + ' ' + (i + 1))), req = x.required ? ' required' : ''; if (x.type === 'textarea') return fld(n, label, `<textarea id="${n}" name="${n}" rows="4" maxlength="2000"${req}></textarea>`, x.required); if (x.type === 'select') return fld(n, label, `<select id="${n}" name="${n}"${req}><option value="">${e(T.chooseOption)}</option>${opt(x.options || [], ((enCP.extraFields || [])[i] || {}).options)}</select>`, x.required); const typ = ['text', 'email', 'tel', 'url', 'number'].includes(x.type) ? x.type : 'text'; return fld(n, label, `<input id="${n}" name="${n}" type="${typ}" maxlength="2000"${req}>`, x.required); }).join('')}
<div class="f hp" aria-hidden="true"><label for="_g">${e(T.leaveEmpty)}</label><input id="_g" name="_gotcha" tabindex="-1" autocomplete="off"></div>
<div class="f check"><input id="consent" name="consent" type="checkbox" required><label for="consent">${e(CL.consent)} <span aria-hidden="true">*</span></label></div>
<button class="btn" type="submit" ${ENDPOINT || S.email ? '' : 'disabled'}>${e(CP.submitLabel || 'Send inquiry')}</button><p id="status" data-success="${e(CP.successMessage)}" role="status" aria-live="polite"></p></form></section>`
  });
  out[K('/404.html')] = page({ url: '/404.html', title: T.notFoundTitle, noindex: true, body: `${pageHero(T.notFoundTitle, T.notFoundText)}<p class="wrap sec"><a class="btn" href="${u('/')}">${e(T.backHome)}</a></p>` });
  return out;
}

function check() {
  let bad = 0;
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(x => (x.isDirectory() ? walk(path.join(d, x.name)) : [path.join(d, x.name)]));
  for (const f of walk(OUT).filter(f => f.endsWith('.html'))) {
    const h = fs.readFileSync(f, 'utf8');
    for (const m of h.matchAll(/(?:href|src)="(\/(?!\/)[^"#?]*)/g)) {
      let t = path.join(OUT, BASE && m[1].startsWith(BASE + '/') ? m[1].slice(BASE.length) : m[1]);
      if (m[1].endsWith('/')) t = path.join(t, 'index.html');
      if (!fs.existsSync(t)) { console.error('BROKEN LINK', m[1], 'in', path.relative(OUT, f)); bad++; }
    }
    if (/\sstyle="/.test(h) || /<style[\s>]/.test(h)) { console.error('INLINE STYLE found in', path.relative(OUT, f), '(blocked by the Content-Security-Policy)'); bad++; }
  }
  console.log(bad ? `Link check: ${bad} problem(s)` : 'Link check: all internal links and assets resolve; no inline styles');
  return bad;
}

module.exports = { build };

if (require.main === module) {
  const bad = build();
  if (process.argv.includes('--serve')) {
    const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.xml': 'application/xml', '.woff': 'font/woff' };
    let t; for (const d of ['content', 'assets']) fs.watch(path.join(R, d), { recursive: true }, () => { clearTimeout(t); t = setTimeout(() => { try { build(); } catch (x) { console.error(x.message); } }, 150); });
    http.createServer((q, s) => {
      let p; try { p = decodeURIComponent(q.url.split('?')[0]); } catch { s.statusCode = 400; return s.end('Bad request'); }
      if (p.endsWith('/')) p += 'index.html';
      let f = path.join(OUT, path.normalize(p));
      if (!f.startsWith(OUT + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.statusCode = 404; f = path.join(OUT, '404.html'); }
      s.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream'); s.end(fs.readFileSync(f));
    }).listen(3000, '127.0.0.1', () => console.log('Dev server: http://localhost:3000'));
  } else process.exit(bad ? 1 : 0);
}