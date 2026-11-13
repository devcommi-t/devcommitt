// =====================================================================
//  <dev.commit> site generator            مولّد موقع <dev.commit>
//  content/*.json  ->  dist/   (English at "/", Arabic at "/ar/")
//  No dependencies. Node >= 18.            من غير أي مكتبات.
// ---------------------------------------------------------------------
//  WHERE TO EDIT / فين تعدّل:
//   • Texts, links, sections, order of the home page  -> content/site.json (+ site.ar.json)
//   • Projects                                         -> content/projects.json (+ projects.ar.json)
//   • Colours (light + dark)                           -> "theme" / "themeDark" in content/site.json
//   • Look & motion                                    -> assets/css/styles.css, fx.css, assets/js/fx.js
//   • HTML structure of a section                      -> this file (search for the section name, e.g. "SHOWCASE")
//  Full guide: EDIT-GUIDE.md
// =====================================================================
const fs = require('fs'), path = require('path'), http = require('http');
const I = require('./lib/i18n.js'), J = require('./lib/jsonc.js');
const R = __dirname, OUT = path.join(R, 'dist');

// GitHub Pages project sites live under /<repo>/, so every root-relative URL gets this prefix (empty for a custom domain or local dev).
const BASE = (process.env.BASE_PATH || '').replace(/\/+$/, '').replace(/^(?!\/)(.+)/, '/$1');
const rd = f => J.parse(fs.readFileSync(path.join(R, 'content', f), 'utf8'), 'content/' + f);
const rdOpt = (f, d) => { try { return rd(f); } catch (x) { if (x.code === 'ENOENT') return d; throw x; } };

// ---------- small helpers ----------
const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// SECURITY: only http(s), mailto, tel, in-site paths and anchors. Rejects "//host", "/\host" (browsers treat \ as /), spaces and control characters.
const safeUrl = s => { s = String(s ?? ''); if (/[\u0000-\u001f\u007f\s\\]/.test(s)) return false; return /^(https?:\/\/[^/]|mailto:.|tel:.|\/(?![/\\])|#)/i.test(s); };
const HEX = /^#[0-9a-fA-F]{6}$/;
const NO_PREFIX = /^\/(assets|api|admin|\.well-known)(\/|$)/;
const IMG = /\.(jpe?g|png|webp|avif|gif)$/i;
const slugify = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const nat = (a, b) => a.localeCompare(b, undefined, { numeric: true });
const pad = n => String(n).padStart(2, '0');
const host = s => { try { return new URL(s).hostname.replace(/^www\./, ''); } catch (x) { return ''; } };

// ---------- colour maths (used to build the light + dark palettes) ----------
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const toHex = a => '#' + a.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return toHex(x.map((v, i) => v * (1 - t) + y[i] * t)); }; // t = share of b

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

// =====================================================================
//  ICONS (stroke style). Every shape gets pathLength="1" so CSS can "draw" it.
//  الأيقونات: كل شكل بياخد pathLength عشان الـ CSS يرسمه.
// =====================================================================
const svg = (inner, size = 22, sw = 1.8) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner.replace(/<(path|circle|rect|line|polyline|polygon)\b/g, '<$1 pathLength="1"')}</svg>`;
// Service icons (picked by position in the list) / أيقونات الخدمات (بترتيبها في القائمة)
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
// Named icons: use them in custom sections ("icon": "bag") / أيقونات بالاسم لاستخدامها في الأقسام المخصصة
const ICON = {
  bag: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/>',
  tag: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
  code: PATHS[1],
  layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
  sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 16v4M17 18h4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  rocket: '<path d="M12 15l-3-3a22 22 0 0 1 2-4 12 12 0 0 1 11-5c0 3-1 8-5 11a22 22 0 0 1-4 2z"/><path d="M9 12H4s.6-3 2-4c1.6-1 5 0 5 0M12 15v5s3-.6 4-2c1-1.6 0-5 0-5"/><path d="M5 19c-.5 1-1 2-1 2s1-.5 2-1"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.7 7.1L3 21l1.9-6.3A8 8 0 1 1 21 12z"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>'
};
// Social logos / لوجوهات السوشيال
const SOC = {
  instagram: '<rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>',
  tiktok: '<path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/>',
  facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
  whatsapp: '<path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"/>',
  linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
  youtube: '<path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>',
  x: '<path d="M4 4l11.7 16H20L8.3 4z"/><path d="M4 20l6.8-6.8M13.2 10.8L20 4"/>',
  github: '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>'
};
// Order of the social icons in the footer + contact page / ترتيب أيقونات السوشيال
const SOC_ORDER = ['instagram', 'tiktok', 'facebook', 'whatsapp', 'linkedin', 'youtube', 'x', 'github'];
const SOC_MAIN = ['instagram', 'tiktok', 'facebook', 'whatsapp']; // always shown as placeholders while showDemoProjects = true
const SUN = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
const MOON = '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';

// =====================================================================
//  THEME: light + dark palettes -> dist/assets/css/theme.css
//  الألوان: بنطلّع ملف theme.css فيه ألوان الوضع الفاتح والداكن.
//  Change colours in content/site.json ("theme" = light, "themeDark" = dark). Must be #RRGGBB.
// =====================================================================
const LIGHT = { background: '#FAF3E8', primary: '#2F5D50', accent: '#C8674A', surface: '#F1E6D3', text: '#2F5D50' };
const DARK = { background: '#101916', surface: '#182522', text: '#E9E3D6', primary: '#356B5B', accent: '#E58E70' };
const pick = (def, src) => { const o = { ...def }; for (const k of Object.keys(def)) if (src && HEX.test(src[k])) o[k] = src[k]; return o; };
function themeCss(S) {
  const L = pick(LIGHT, S.theme), D = pick(DARK, S.themeDark);
  const light = {
    bg: L.background, 'bg-2': mix(L.background, L.surface, .55), surface: L.surface, 'surface-2': mix(L.surface, '#ffffff', .55),
    ink: L.text, brand: L.primary, 'on-brand': L.background, accent: L.accent, 'accent-ink': mix(L.accent, '#000000', .2),
    btn: mix(L.accent, '#000000', .2), 'on-btn': L.background, 'btn-hover': L.primary,
    band: L.primary, 'band-2': mix(L.primary, '#000000', .4), 'on-band': L.background, 'band-accent': mix(L.accent, '#ffffff', .55),
    'sh-1': mix(L.primary, '#000000', .5), 'sh-2': L.primary, 'sh-3': L.accent, 'shadow-rgb': rgb(mix(L.primary, '#000000', .35)).join(','), 'glow': .22
  };
  const dark = {
    bg: D.background, 'bg-2': mix(D.background, D.surface, .5), surface: D.surface, 'surface-2': mix(D.surface, '#ffffff', .06),
    ink: D.text, brand: D.primary, 'on-brand': '#F4EFE4', accent: D.accent, 'accent-ink': mix(D.accent, '#ffffff', .1),
    btn: D.accent, 'on-btn': mix(D.background, '#000000', .55), 'btn-hover': mix(D.accent, '#ffffff', .28),
    band: mix(D.background, D.primary, .3), 'band-2': mix(D.background, D.primary, .12), 'on-band': D.text, 'band-accent': mix(D.accent, '#ffffff', .05),
    'sh-1': mix(D.background, D.primary, .1), 'sh-2': mix(D.background, D.primary, .32), 'sh-3': mix(D.background, D.accent, .5), 'shadow-rgb': '0,0,0', 'glow': .13
  };
  const decl = o => Object.entries(o).map(([k, v]) => `--${k}:${v}`).join(';');
  return `/* Generated by build.js from content/site.json ("theme" / "themeDark"). Do not edit by hand. */\n:root{${decl(light)};color-scheme:light}\n:root[data-theme=dark]{${decl(dark)};color-scheme:dark}\n`;
}

// =====================================================================
//  BUILD
// =====================================================================
function build() {
  const S_en = rd('site.json');
  const P_en = rd('projects.json');
  P_en.forEach(p => { if (!p.slug) p.slug = slugify(p.title); if (!/^[a-z0-9-]+$/.test(p.slug || '')) throw new Error('Invalid project slug: ' + p.slug); autoAssets(p); });
  const arabicOn = S_en.arabic !== false;
  const S_ar = I.resolveSite(S_en, rdOpt('site.ar.json', {}), 'ar');
  const P_ar = I.mergeProjects(P_en, rdOpt('projects.ar.json', {}));
  const S_enR = I.resolveSite(S_en, null, 'en');
  const SITE = (process.env.SITE_URL || S_en.siteUrl || '').replace(/\/$/, '');
  const ENDPOINT = process.env.FORM_ENDPOINT || S_en.formEndpoint || '';
  if (process.env.NODE_ENV === 'production' && P_en.some(p => p.demo) && S_en.showDemoProjects) console.warn('WARNING: demo projects/placeholders are included in a production build (set showDemoProjects to false).');

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
  // Colours live in a generated stylesheet so pages need no inline <style> (strict CSP).
  fs.writeFileSync(path.join(OUT, 'assets/css/theme.css'), themeCss(S_en));

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

// =====================================================================
//  RENDER one language
// =====================================================================
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
  const demo = !!S.showDemoProjects;                 // "demo mode": placeholders are visible (set false before launch)
  if (!demo) P = P.filter(p => !p.demo);
  const feat = P.find(p => p.featured) || P[0];
  const list = a => (a && a.length ? `<ul class="list">${a.map(x => `<li>${e(x)}</li>`).join('')}</ul>` : '');
  const eb = s => e(s).split(e(S.name)).join(`<span class="brand">${e(S.name)}</span>`);
  const fmt = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (o[k] ?? m));

  // ---------- social + WhatsApp ----------
  // WhatsApp: put the number with country code in site.json -> "whatsapp" (e.g. "201001234567"). Digits only is fine; "+" and spaces are removed.
  const waNum = String(S.whatsapp || '').replace(/\D/g, '');
  const waOk = /^\d{8,15}$/.test(waNum);
  const waLink = waOk ? `https://wa.me/${waNum}${S.whatsappMessage ? '?text=' + encodeURIComponent(S.whatsappMessage) : ''}` : '';
  const socList = SOC_ORDER.map(k => {
    if (k === 'whatsapp') return waLink ? { k, href: waLink } : demo ? { k, href: '' } : null;
    const v = (S.social || {})[k];
    return v && safeUrl(v) ? { k, href: v } : (demo && SOC_MAIN.includes(k) ? { k, href: '' } : null);
  }).filter(Boolean);
  const socName = k => T['soc_' + k] || k[0].toUpperCase() + k.slice(1);
  // small round icon (footer)
  const soc = ({ k, href }) => href
    ? `<a class="soc soc-${e(k)}" href="${u(href)}" target="_blank" rel="noopener noreferrer" aria-label="${e(socName(k))}" title="${e(socName(k))}">${svg(SOC[k], 20)}<span class="sr"> ${e(T.newTab)}</span></a>`
    : `<span class="soc soc-${e(k)} is-empty" role="img" aria-label="${e(socName(k))}" title="${e(fmt(T.socEmpty, { name: socName(k) }))}">${svg(SOC[k], 20)}</span>`;
  // bigger pill with a name (contact page)
  const socBig = ({ k, href }) => href
    ? `<a class="socb soc-${e(k)}" href="${u(href)}" target="_blank" rel="noopener noreferrer"><span class="socb-i">${svg(SOC[k], 22)}</span><span>${e(socName(k))}</span><span class="sr"> ${e(T.newTab)}</span></a>`
    : `<span class="socb soc-${e(k)} is-empty" title="${e(fmt(T.socEmpty, { name: socName(k) }))}"><span class="socb-i">${svg(SOC[k], 22)}</span><span>${e(socName(k))}</span></span>`;
  const socials = socList.filter(x => x.k !== 'whatsapp');       // everything except WhatsApp (it has its own card)
  const realSocials = Object.entries(S.social || {}).filter(([, v]) => v && safeUrl(v)).map(([, v]) => v);

  // ---------- contact page copy ----------
  const CP = { title: 'Get in Touch', text: 'Have a project in mind? Fill out the form and we will get back to you.', submitLabel: 'Send inquiry', successMessage: 'Thank you. Your inquiry was sent and we will reply by email.', ...(S.contactPage || {}) };
  const contactChannels = Array.isArray(CP.channels) ? CP.channels : [];
  const CL = CP.labels, FT = S.footer;
  const extraFields = Array.isArray(CP.extraFields) ? CP.extraFields : [];
  const txt = key => { const v = nm(S.copy[key]); return v || (key === 'aboutPageText' ? S.description : ''); };
  const year = new Date().getFullYear();

  // SECURITY: strict CSP: no inline scripts/styles, nothing loaded from other sites except images; forms may only go to the configured endpoint.
  const epOrigin = (() => { try { return new URL(ENDPOINT).origin; } catch (x) { return ''; } })();
  const CSP = `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'${epOrigin ? ' ' + epOrigin : ''}; form-action 'self'${epOrigin ? ' ' + epOrigin : ''}; base-uri 'self'; object-src 'none'; manifest-src 'self'`;

  // Logo: two copies, CSS shows the right one for light / dark. (assets/img/logo.png = dark ink, logo-light.png = cream)
  const logo = h => `<img src="/assets/img/logo.png" alt="${e(S.name)}" width="913" height="134" class="logo logo-l ${h}"><img src="/assets/img/logo-light.png" alt="" width="913" height="134" class="logo logo-d ${h}" aria-hidden="true">`;

  // ---------- storefront mock-up (shown when a project has no screenshot yet) ----------
  // مجسّم متجر مرسوم بالـ CSS بيظهر لو المشروع ملوش صورة.
  const mock = (v = 0) => `<div class="mk v${v % 3}" aria-hidden="true"><div class="mk-nav"><i class="mk-logo"></i><span></span><span></span><span></span><i class="mk-cart"></i></div><div class="mk-hero"><div class="mk-t"><b></b><b></b><u></u></div><div class="mk-img"></div></div><div class="mk-grid">${[0, 1, 2].map(() => '<div class="mk-card"><i></i><b></b><u></u></div>').join('')}</div></div>`;
  const media = (p, o = {}) => `<div class="media"${o.zoom && p.image ? ' data-zoom data-cursor="+"' : ''}>${mock(o.v || 0)}${p.image ? `<img src="${u(p.image)}" alt="${e(p.title)}${AR ? '' : ' storefront'}" ${o.eager ? '' : 'loading="lazy"'} decoding="async">` : ''}</div>`;

  // ---------- PROJECT CARD ----------
  const card = (p, i = 0) => `<article class="card" data-cat="${e(p.category)}" data-text="${e([p.title, p.client, p.summary, p.category].join(' ').toLowerCase())}">
<a class="card-link" data-cursor="${e(T.cursorView)}" href="${u('/work/' + p.slug + '/')}"><div class="shot"><div class="shot-bar" aria-hidden="true"><i></i><i></i><i></i><span class="shot-url" dir="ltr">${e(host(p.url) || p.slug)}</span></div>${media(p, { v: i })}<span class="shot-idx" aria-hidden="true">${pad(i + 1)}</span><span class="shot-go" aria-hidden="true">${arrowUp}</span></div>
<div class="card-body"><p class="meta"><span class="cat">${e(p.category)}</span>${p.demo ? `<span class="badge">${e(T.demo)}</span>` : ''}</p><h3>${e(p.title)}</h3><p class="card-sum">${e(p.summary)}</p><span class="more">${e(T.viewProject)} <span class="arr" aria-hidden="true">${arrow}</span></span></div></a>${p.url ? `<a class="live" href="${u(p.url)}" target="_blank" rel="noopener noreferrer">${e(T.visitLive)} <span aria-hidden="true">${arrowUp}</span><span class="sr"> ${e(T.newTab)}</span></a>` : ''}</article>`;
  // "Your brand could be next" tile at the end of the work grid / كارت دعوة في آخر شبكة الأعمال
  const cardNext = () => `<article class="card card-next"><a class="card-link" href="${u('/contact/')}"><div class="shot shot-plus" aria-hidden="true"><span>+</span></div><div class="card-body"><h3>${e(T.yourNext)}</h3><p class="card-sum">${e(T.yourNextText)}</p><span class="more">${e(T.startProject)} <span class="arr" aria-hidden="true">${arrow}</span></span></div></a></article>`;
  const btn = (b, cls) => `<a class="btn ${cls || ''}" href="${u(b.href)}"><span>${e(b.label)}</span></a>`;
  const head = (t, sub) => `<div class="sec-head"><h2>${e(t)}</h2>${sub ? `<p class="lead">${e(sub)}</p>` : ''}</div>`;
  const pageHero = (t, sub) => `<section class="wrap phero"><h1>${e(t)}</h1>${sub ? `<p class="lead">${e(sub)}</p>` : ''}</section>`;
  const ico = i => `<span class="ico" aria-hidden="true">${svg(PATHS[i % PATHS.length])}</span>`;
  const iconOf = (v, i) => (typeof v === 'string' && ICON[v]) ? ICON[v] : PATHS[(Number.isInteger(v) ? v : i) % PATHS.length];

  // ---------- PROCESS steps (used on the home page [stacked cards] and the services page [row]) ----------
  const STEP_ICONS = [ICON.search, PATHS[2], PATHS[1], PATHS[5], ICON.rocket];
  const steps = cls => `<ol class="steps${cls ? ' ' + cls : ''}">${S.process.map((s, i) => `<li><div class="step"><span class="num">${pad(i + 1)}</span><span class="step-ico" aria-hidden="true">${svg(STEP_ICONS[i % STEP_ICONS.length], 26)}</span><h3>${e(s.title)}</h3><p>${e(s.desc)}</p></div></li>`).join('')}</ol>`;

  // ---------- CALL TO ACTION band ----------
  const CTA_TILES = [ICON.bag, ICON.code, ICON.cart, ICON.layout, ICON.tag, ICON.sparkle];
  const FL = ['f1', 'f2 c', 'f3 c', 'f4', 'f5', 'f6 c'];
  const floaters = () => `<div class="floaters" aria-hidden="true">${FL.map((c, i) => `<i class="tile ${c}">${svg(CTA_TILES[i % CTA_TILES.length])}</i>`).join('')}</div>`;
  const swapWords = (S.cta.swap && Array.isArray(S.cta.swap.words) ? S.cta.swap.words : []).filter(w => typeof w === 'string' && w.trim());
  const swap = swapWords.length ? `<p class="swap"><span>${e(S.cta.swap.prefix || '')}</span> <span class="swapw" data-words="${e(JSON.stringify(swapWords))}"><b>${e(swapWords[0])}</b></span></p>` : '';
  const cta = () => `<section class="band dark cta"><canvas class="liquid" aria-hidden="true"></canvas>${floaters()}<div class="wrap center"><h2 class="wave">${e(S.cta.title)}</h2>${swap}<p class="lead">${e(S.cta.text)}</p>${btn(S.cta, 'inv')}</div></section>`;

  // =====================================================================
  //  CUSTOM SECTIONS  (add your own sections from content/site.json — no HTML needed)
  //  أقسام مخصصة: تضيفها من site.json من غير ما تكتب HTML.
  //  types: text | cards | split | faq | steps | cta     style: "light" | "tint" | "dark"
  // =====================================================================
  const bHead = b => `${b.eyebrow ? `<p class="eyebrow">${e(b.eyebrow)}</p>` : ''}${b.title ? `<h2>${e(b.title)}</h2>` : ''}${b.text ? `<p class="lead">${e(b.text)}</p>` : ''}`;
  const bBtn = b => (b.button && b.button.label ? `<p class="xbtn">${btn(b.button, b.style === 'dark' ? 'inv' : '')}</p>` : '');
  function block(b) {
    if (!b || typeof b !== 'object') return '';
    const idAttr = b.id && /^[a-z0-9-]+$/i.test(b.id) ? ` id="${e(b.id)}"` : '';
    const items = Array.isArray(b.items) ? b.items : [];
    const shell = (cls, inner) => (b.style === 'dark' || b.style === 'tint')
      ? `<section${idAttr} class="band ${b.style} xblock ${cls}"><div class="wrap">${inner}</div></section>`
      : `<section${idAttr} class="wrap sec xblock ${cls}">${inner}</section>`;
    switch (b.type) {
      case 'text':
        return shell('x-text' + (b.align === 'start' ? ' x-start' : ''), `<div class="sec-head">${bHead(b)}</div>${bBtn(b)}`);
      case 'cards': {
        const cols = [2, 3, 4].includes(+b.columns) ? +b.columns : 3;
        const cards = items.map((x, i) => { const inner = `<span class="ico" aria-hidden="true">${svg(iconOf(x.icon, i))}</span><div><h3>${e(x.title)}</h3><p>${e(x.desc)}</p></div>`; return x.href ? `<a class="xcard" href="${u(x.href)}">${inner}</a>` : `<div class="xcard">${inner}</div>`; }).join('');
        return shell('x-cards', `<div class="sec-head">${bHead(b)}</div><div class="xgrid cols-${cols}">${cards}</div>${bBtn(b)}`);
      }
      case 'split': {
        const img = b.image && safeUrl(b.image) ? `<div class="media xs-img" data-zoom>${mock(1)}<img src="${u(b.image)}" alt="${e(b.imageAlt || b.title || '')}" loading="lazy" decoding="async"></div>` : `<div class="media xs-img">${mock(1)}</div>`;
        const bullets = Array.isArray(b.bullets) && b.bullets.length ? `<ul class="checks">${b.bullets.map(x => `<li><span aria-hidden="true">${svg(ICON.check, 18, 2.4)}</span>${e(x)}</li>`).join('')}</ul>` : '';
        return shell('x-split' + (b.reverse ? ' rev' : ''), `<div class="xs-grid"><div class="xs-txt">${bHead(b)}${bullets}${bBtn(b)}</div>${img}</div>`);
      }
      case 'faq':
        return shell('x-faq narrow', `<div class="sec-head">${bHead(b)}</div>${items.map(f => `<details><summary>${e(f.q)}</summary><p>${e(f.a)}</p></details>`).join('')}`);
      case 'steps':
        return shell('x-steps', `<div class="sec-head">${bHead(b)}</div><ol class="steps">${items.map((s, i) => `<li><div class="step"><span class="num">${pad(i + 1)}</span><h3>${e(s.title)}</h3><p>${e(s.desc)}</p></div></li>`).join('')}</ol>`);
      case 'cta':
        return `<section${idAttr} class="wrap sec xblock"><div class="banner"><div><h2>${e(b.title || '')}</h2>${b.text ? `<p class="lead">${e(b.text)}</p>` : ''}</div>${b.button && b.button.label ? btn(b.button, 'inv') : ''}</div></section>`;
      default: return '';
    }
  }
  const extra = key => (S.extraSections && Array.isArray(S.extraSections[key]) ? S.extraSections[key] : []).map(block).join('\n');

  // ---------- page shell: <head>, header, footer, scripts ----------
  function page({ key, url, title, desc, body, img, ld, noindex, trail }) {
    const full = title ? `${title} — ${NAME}` : iso(S.title);
    const d = desc || S.description;
    const full_url = SITE + pre + url;
    const canon = SITE ? `<link rel="canonical" href="${e(full_url)}">` : '';
    const neutral = url === '/404.html' ? '/' : url;
    const alts = SITE && arabicOn && !noindex ? `<link rel="alternate" hreflang="en" href="${e(SITE + neutral)}"><link rel="alternate" hreflang="ar" href="${e(SITE + '/ar' + neutral)}"><link rel="alternate" hreflang="x-default" href="${e(SITE + neutral)}">` : '';
    const og = `<meta property="og:title" content="${e(full)}"><meta property="og:description" content="${e(d)}"><meta property="og:type" content="website"><meta property="og:locale" content="${AR ? 'ar_AR' : 'en_US'}">${SITE ? `<meta property="og:url" content="${e(full_url)}"><meta property="og:image" content="${e(SITE + (img || '/assets/img/logo-original.jpg'))}">` : ''}<meta name="twitter:card" content="summary_large_image">`;
    const nav = S.nav.map(n => `<a href="${u(n.href)}"${n.href === url || (n.href !== '/' && url.startsWith(n.href)) ? ' aria-current="page"' : ''}>${e(n.label)}</a>`).join('');
    const switcher = arabicOn ? `<a class="lang" href="${e(AR ? neutral : '/ar' + neutral)}" hreflang="${AR ? 'en' : 'ar'}" lang="${AR ? 'en' : 'ar'}" aria-label="${e(T.switchAria)}">${e(T.switchLabel)}</a>` : '';
    const foot = `<footer class="foot"><div class="wrap foot-grid"><div class="foot-brand"><a href="${u('/')}" aria-label="${e(nm(T.homeAria))}">${logo('foot-logo')}</a><p class="muted">${e(S.description)}</p>${socList.length ? `<p class="follow">${e(T.followUs)}</p><div class="socs">${socList.map(soc).join('')}</div>` : ''}</div>
<nav aria-label="${e(T.ariaFooter)}"><h2 class="fh">${e(FT.navigationTitle)}</h2>${S.nav.map(n => `<a href="${u(n.href)}">${e(n.label)}</a>`).join('')}</nav>
<nav aria-label="${e(T.ariaServices)}"><h2 class="fh">${e(FT.servicesTitle)}</h2>${S.services.slice(0, 5).map(s => `<a href="${u('/services/')}">${e(s.title)}</a>`).join('')}</nav>
<div class="foot-contact"><h2 class="fh">${e(FT.contactTitle)}</h2>${S.email ? `<a href="mailto:${e(S.email)}" class="ltr">${e(S.email)}</a>` : `<a href="${u('/contact/')}">${e(T.sendInquiryLink)}</a>`}${waLink ? `<a href="${e(waLink)}" class="ltr" target="_blank" rel="noopener noreferrer">+${e(waNum)}</a>` : ''}<a class="btn sm" href="${u('/contact/')}"><span>${e(S.headerCta.label)}</span></a></div></div>
<div class="wrap sub"><span>&copy; ${year} <span dir="auto">${e(S.name)}</span>. ${e(FT.copyright)}</span>${(S.legal || []).map(l => `<a href="${u(l.href)}">${e(l.label)}</a>`).join('')}<button class="totop" type="button" aria-label="${e(T.backToTop)}">${svg(ICON.up, 18, 2.2)}</button></div></footer>`;
    const waFloat = waLink ? `<a class="wa-float" href="${e(waLink)}" target="_blank" rel="noopener noreferrer" aria-label="${e(T.waFloatAria)}">${svg(SOC.whatsapp, 28)}</a>` : '';
    return `<!doctype html><html lang="${lang}" dir="${AR ? 'rtl' : 'ltr'}"${arabicOn ? ' data-ar' : ''} data-base="${e(BASE)}" data-close="${e(T.closeZoom)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${e(CSP)}"><meta name="referrer" content="strict-origin-when-cross-origin"><meta name="color-scheme" content="light dark">
<title>${e(full)}</title><meta name="description" content="${e(d)}">${noindex ? '<meta name="robots" content="noindex">' : ''}${canon}${alts}${og}
<meta name="theme-color" content="${e(HEX.test(S_en.theme && S_en.theme.background) ? S_en.theme.background : LIGHT.background)}"><link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml"><script src="/assets/js/boot.js"></script><link rel="preload" href="/assets/fonts/cairo-latin.woff" as="font" type="font/woff" crossorigin>${AR ? '<link rel="preload" href="/assets/fonts/cairo-arabic.woff" as="font" type="font/woff" crossorigin>' : ''}<link rel="stylesheet" href="/assets/css/styles.css"><link rel="stylesheet" href="/assets/css/fx.css"><link rel="stylesheet" href="/assets/css/theme.css">${ld ? `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>` : ''}</head>
<body data-page="${e(key)}"><div class="curtain" aria-hidden="true"><i></i><i></i><img src="/assets/img/logo-light.png" alt="" width="913" height="134" decoding="async"></div><a class="skip" href="#main">${e(T.skip)}</a>
<svg class="defs" width="0" height="0" aria-hidden="true" focusable="false"><filter id="ripple" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter></svg>
<div class="grain" aria-hidden="true"></div>
<header class="head"><div class="wrap bar"><a class="bar-logo" href="${u('/')}" aria-label="${e(nm(T.homeAria))}">${logo('head-logo')}</a>
<div class="bar-end"><nav id="nav" class="nav" aria-label="${e(T.ariaMain)}">${nav}${switcher}${btn(S.headerCta, 'sm')}</nav>
<button class="theme" type="button" aria-label="${e(T.themeAria)}"><span class="i-sun">${svg(SUN, 20)}</span><span class="i-moon">${svg(MOON, 20)}</span></button>
<button class="menu" aria-expanded="false" aria-controls="nav"><span class="sr">${e(T.menu)}</span><i></i></button></div></div></header>
<main id="main"${trail ? ' data-trail' : ''}>${body}</main>${foot}${waFloat}<script src="/assets/js/main.js" defer></script><script src="/assets/js/fx.js" defer></script></body></html>`;
  }

  const out = {};
  const K = url => pre + url;

  // =====================================================================
  //  HOME SECTIONS  — each key below is one section of the home page.
  //  Order + which ones show = "homeSections" in content/site.json.
  //  أقسام الصفحة الرئيسية: الترتيب والإخفاء من "homeSections" في site.json.
  // =====================================================================
  const H = S.hero;
  const HOME = {};

  // ---- HERO ----
  HOME.hero = () => {
    const heroDesktopImage = H.image || (feat && feat.image) || '';
    const heroMobileImage = H.mobileImage || (feat && feat.mobileImage) || heroDesktopImage;
    const chips = (Array.isArray(H.chips) ? H.chips : []).filter(x => typeof x === 'string' && x.trim()).slice(0, 3);
    const CHIP_ICONS = [ICON.layout, ICON.phone, ICON.sparkle];
    const tw = (H.typed && Array.isArray(H.typed.words) ? H.typed.words : []).filter(w => typeof w === 'string' && w.trim());
    const typed = tw.length ? `<p class="typed"><span class="tp">${e(H.typed.prefix || '')}</span> <span class="tw" data-words="${e(JSON.stringify(tw))}">${e(tw[0])}</span><i class="caret" aria-hidden="true"></i></p>` : '';
    const visual = `<div class="visual"><i class="shape s1"></i><i class="shape s2"></i><div class="laptop"><div class="screen">${media({ title: S.name, image: heroDesktopImage }, { eager: true, v: 0 })}</div><div class="base"></div></div><div class="phone">${media({ title: S.name, image: heroMobileImage }, { eager: true, v: 1 })}</div>${chips.map((c, i) => `<div class="hchip hc${i + 1}"><span class="hc-i">${svg(CHIP_ICONS[i], 18)}</span><span>${e(c)}</span></div>`).join('')}</div>`;
    return `<div class="herowrap"><div class="hero-bg" aria-hidden="true"><canvas class="dots"></canvas><i class="aurora a1"></i><i class="aurora a2"></i></div><section class="wrap hero"><div class="hero-copy"><p class="eyebrow">${e(H.eyebrow)}</p><h1>${e(H.title).replace(/(\S+)$/, '<span class="acc">$1</span>')}</h1>${typed}<p class="lead">${e(H.text)}</p><div class="row">${btn({ label: H.primary.label + ' ' + arrow, href: H.primary.href })}${btn(H.secondary, 'ghost')}</div></div>${visual}</section></div>`;
  };

  // ---- TICKER (scrolling strip). Items: "marquee.items" or, if empty, your service names ----
  HOME.ticker = () => {
    const M = S.marquee || {};
    if (M.enabled === false) return '';
    const items = (Array.isArray(M.items) && M.items.length ? M.items : S.services.map(s => s.title)).filter(x => typeof x === 'string' && x.trim());
    if (!items.length) return '';
    const reps = Math.ceil(8 / items.length), set = Array.from({ length: reps }, () => items.map(t => `<span>${e(t)}</span>`).join('')).join('');
    return `<section class="ticker${M.speed === 'slow' ? ' speed-slow' : M.speed === 'fast' ? ' speed-fast' : ''}" aria-hidden="true"><div class="tk-track"><div class="tk-set">${set}</div><div class="tk-set">${set}</div></div></section>`;
  };

  // ---- WORK (featured projects) ----
  HOME.work = () => (P.length ? `<section class="wrap sec work-sec"><div class="sec-head split"><div><p class="eyebrow">${eb(txt('featuredEyebrow'))}</p><h2>${e(txt('featuredTitle'))}</h2></div><a class="link" href="${u('/work/')}">${e(T.viewAll)} <span aria-hidden="true">${arrow}</span></a></div><div class="grid">${P.slice(0, 3).map(card).join('')}${P.length < 3 ? cardNext() : ''}</div></section>` : '');

  // ---- STATEMENT (words light up while you scroll) ----
  HOME.statement = () => (S.statement ? `<section class="wrap statement"><p class="reveal-words">${S.statement.split(' ').map(w => `<span>${e(w)}</span>`).join(' ')}</p></section>` : '');

  // ---- SHOWCASE (replaces the old "planet" section): selling points + an animated editor window ----
  // Edit the points in site.json -> "showcase.items" ("scene": sections | responsive | editor | code).
  const SP = S.showcase || S.spotlight || {};
  const SCENE_KEYS = ['sections', 'responsive', 'editor', 'code'];
  const CODE = [
    [['k', '{% schema %}']],
    [['p', '{']],
    [['s', '  "name"'], ['p', ': '], ['v', '"Hero banner"'], ['p', ',']],
    [['s', '  "settings"'], ['p', ': [']],
    [['p', '    { '], ['s', '"type"'], ['p', ': '], ['v', '"text"'], ['p', ', '], ['s', '"id"'], ['p', ': '], ['v', '"title"'], ['p', ' }']],
    [['p', '  ]']],
    [['p', '}']],
    [['k', '{% endschema %}']]
  ];
  const wf = n => Array.from({ length: n }, () => '<span class="wfc"><i></i><b></b></span>').join('');
  const SCENES = {
    // 1) sections can be added / re-ordered  2) one design, every screen  3) edit without code  4) clean code
    sections: () => `<div class="sc sc-sections">${['a', 'b', 'c', 'd'].map(k => `<div class="bl bl-${k}"><i class="grip"></i><span class="bl-th"></span><span class="bl-l"><b></b><u></u></span><span class="bl-eye"></span></div>`).join('')}<div class="bl-add"><span>+</span></div><i class="ptr"></i></div>`,
    responsive: () => `<div class="sc sc-resp"><div class="dv dv-d"><i class="dv-bar"></i><div class="dv-g">${wf(6)}</div></div><div class="dv dv-t"><i class="dv-bar"></i><div class="dv-g">${wf(4)}</div></div><div class="dv dv-p"><i class="dv-bar"></i><div class="dv-g">${wf(2)}</div></div></div>`,
    editor: () => `<div class="sc sc-edit"><div class="ed-side">${[0, 1, 2].map(() => '<div class="ed-row"><span></span><i class="tg"></i></div>').join('')}<div class="ed-sw"><i></i><i></i><i></i></div></div><div class="ed-prev"><div class="ed-h"><b></b><u></u></div><div class="ed-p"><i></i><i></i><i></i></div><span class="ed-btn"></span></div></div>`,
    code: () => `<div class="sc sc-code" dir="ltr">${CODE.map((ln, i) => `<div class="ln"><span class="no">${i + 1}</span><span class="tx">${ln.map(([c, t]) => `<span class="c-${c}">${e(t)}</span>`).join('')}</span></div>`).join('')}<i class="cur-bar"></i></div>`
  };
  HOME.showcase = () => {
    const items = (Array.isArray(SP.items) ? SP.items : []).filter(x => x && x.value && x.label);
    if (!items.length) return '';
    const sceneOf = (x, i) => (SCENES[x.scene] ? x.scene : SCENE_KEYS[i % SCENE_KEYS.length]);
    return `<section class="band dark showcase" aria-label="${e(T.spotAria)}"><div class="wrap sc-grid"><div class="sc-txt">${SP.eyebrow ? `<p class="eyebrow lt">${e(SP.eyebrow)}</p>` : ''}${SP.title ? `<h2>${e(SP.title)}</h2>` : ''}${SP.text ? `<p class="lead">${e(SP.text)}</p>` : ''}<ul class="sc-list">${items.map((x, i) => `<li class="sc-it${i === 0 ? ' on' : ''}" data-scene="${e(sceneOf(x, i))}"><button type="button" class="sc-b" aria-pressed="${i === 0}"><span class="sc-n" aria-hidden="true">${pad(i + 1)}</span><span class="sc-t"><b>${e(x.value)}</b><small class="sc-l">${e(x.label)}</small></span><span class="sc-d">${e(x.desc || '')}</span></button><i class="sc-bar" aria-hidden="true"></i></li>`).join('')}</ul></div>
<div class="sc-vis" aria-hidden="true"><div class="win"><div class="win-bar"><i></i><i></i><i></i><span class="win-url" dir="ltr">${e(items[0].label)}</span></div><div class="win-body">${items.map((x, i) => { const k = sceneOf(x, i); return SCENES[k]().replace('class="sc ', i === 0 ? 'class="sc on ' : 'class="sc '); }).join('')}</div></div><i class="sc-orb o1"></i><i class="sc-orb o2"></i></div></div></section>`;
  };

  // ---- BIG TEXT (huge sliding words) ----
  HOME.bigtext = () => {
    const big = S.bigText ? (e(S.bigText) + ' ').repeat(6) : '';
    return big ? `<section class="bigtext" aria-hidden="true"><div class="bt bt-a"><span>${big}</span></div><div class="bt bt-b"><span>${big}</span></div></section>` : '';
  };

  // ---- SERVICES (dark band) ----
  HOME.services = () => `<section class="band dark services"><div class="wrap"><div class="two"><div><p class="eyebrow lt">${eb(txt('servicesEyebrow'))}</p><h2>${e(S.servicesIntro.title)}</h2></div><p class="lead">${e(S.servicesIntro.text)}</p></div><div class="svc-grid">${S.services.map((s, i) => `<div class="svc">${ico(i)}<div><h3>${e(s.title)}</h3><p>${e(s.desc)}</p></div></div>`).join('')}</div></div></section>`;

  // ---- PROCESS (stacked cards + ring counter) ----
  HOME.process = () => `<section class="wrap sec pinsec" aria-label="${e(T.processAria)}"><div class="pin-l"><div class="pin-sticky"><p class="eyebrow">${eb(txt('processEyebrow'))}</p><h2>${e(S.processIntro.title)}</h2><p class="lead">${e(S.processIntro.text)}</p><div class="pin-count" dir="ltr" aria-hidden="true"><svg class="pc-ring" viewBox="0 0 100 100"><circle class="pc-bg" cx="50" cy="50" r="44"/><circle class="pc-fg" cx="50" cy="50" r="44" pathLength="1"/></svg><div class="pc-n"><b>01</b><span>/${pad(S.process.length)}</span></div></div></div></div>${steps('steps-v')}</section>`;

  // ---- WHY US (small feature grid) ----
  HOME.why = () => (S.sections.why ? `<section class="wrap sec"><p class="eyebrow">${eb(txt('whyEyebrow'))}</p><h2>${e(S.whyTitle)}</h2><div class="feats">${S.why.map((w, i) => `<div>${ico(i + 2)}<div><h3>${e(w.title)}</h3><p>${e(w.desc)}</p></div></div>`).join('')}</div></section>` : '');

  // ---- LOVE (client testimonials). Cards come from site.json -> testimonials (approved ones with a quote) ----
  const tests = (S.testimonials || []).filter(t => t.approved && t.quote);
  const initials = n => e([...String(n || '').replace(/[^\p{L}\p{N} ]/gu, '').split(' ').filter(Boolean).map(w => [...w][0]).join('')].slice(0, 2).join('').toUpperCase());
  const loveCard = t => { const r = Math.round(Number(t.rating)); const stars = r >= 1 && r <= 5 ? `<div class="stars" role="img" aria-label="${r} / 5">${'★'.repeat(r)}<span>${'★'.repeat(5 - r)}</span></div>` : ''; const who = [t.role, t.company].filter(Boolean).join(AR ? ' – ' : ' · '); const av = t.image && safeUrl(t.image) && IMG.test(t.image) ? `<img class="av" src="${u(t.image)}" alt="" width="44" height="44" loading="lazy" decoding="async">` : `<span class="av" aria-hidden="true">${initials(t.name)}</span>`; return `<figure class="love-c">${stars}<blockquote>${e(t.quote)}</blockquote><figcaption>${av}<span><b>${e(t.name)}</b>${who ? `<small>${e(who)}</small>` : ''}</span></figcaption></figure>`; };
  const loveDemo = [0, 1, 2].map(() => `<figure class="love-c is-demo"><div class="stars" aria-hidden="true">★★★★★</div><blockquote>${e(T.loveEmpty)}</blockquote><figcaption><span class="av" aria-hidden="true">+</span><span><b>${e(T.loveEmptyName)}</b><small>${e(T.loveEmptyRole)}</small></span></figcaption></figure>`).join('');
  HOME.love = () => (S.sections.testimonials !== false && (tests.length || demo) ? `<section class="wrap sec love" aria-labelledby="love-h"><div class="sec-head"><p class="eyebrow">${e(T.loveEyebrow)}</p><h2 id="love-h">${e(T.loveTitle)}</h2></div><div class="love-grid">${tests.length ? tests.map(loveCard).join('') : loveDemo}</div></section>` : '');

  HOME.cta = cta;

  // ---- HOME PAGE: put the sections in the order given by "homeSections" ----
  const DEFAULT_HOME = ['hero', 'ticker', 'work', 'statement', 'showcase', 'bigtext', 'services', 'process', 'why', 'love', 'cta'];
  const order = Array.isArray(S.homeSections) && S.homeSections.length ? S.homeSections : DEFAULT_HOME;
  const homeBody = order.map(x => (typeof x === 'string' ? (HOME[x] ? HOME[x]() : '') : block(x))).join('\n');
  out[K('/')] = page({
    key: 'home', url: '/', trail: false, ld: SITE ? { '@context': 'https://schema.org', '@type': 'Organization', name: S.name, url: SITE, logo: SITE + '/assets/img/logo.png', ...(realSocials.length ? { sameAs: realSocials } : {}) } : null,
    body: homeBody
  });

  // =====================================================================
  //  WORK page + project pages
  // =====================================================================
  const cats = [...new Set([...(S.categories || []), ...P.map(p => p.category)])].filter(c => c && P.some(p => p.category === c));
  out[K('/work/')] = page({
    key: 'work', url: '/work/', title: T.pageWork, desc: nm(T.descWork),
    body: `${pageHero(txt('workPageTitle'), txt('workPageText'))}<section class="wrap sec work-sec">
${P.length ? `<div class="filters"><div class="fsearch"><label class="sr" for="q">${e(T.searchProjects)}</label><span class="fs-i" aria-hidden="true">${svg(ICON.search, 20)}</span><input id="q" type="search" placeholder="${e(T.searchProjects)}" autocomplete="off"></div><div class="fgroup" role="group" aria-label="${e(T.ariaFilter)}"><button type="button" class="fchip on" data-f="">${e(T.all)}</button>${cats.map(c => `<button type="button" class="fchip" data-f="${e(c)}">${e(c)}</button>`).join('')}</div></div>
<p class="sr" id="count" role="status" aria-live="polite" data-tpl="${e(T.projectsShown)}"></p>
<div class="grid" id="grid">${P.map(card).join('')}${cardNext()}</div><p id="empty" class="muted" hidden>${e(T.noMatch)}</p>` : `<p class="muted">${e(T.noProjects)} <a class="link" href="${u('/contact/')}">${e(T.getInTouch)}</a>.</p>`}</section>${extra('work')}${cta()}`
  });
  P.forEach(p => {
    const rel = P.filter(x => x !== p && x.category === p.category).slice(0, 2);
    const blk = (t, c) => (c ? `<section><h2>${e(t)}</h2>${c}</section>` : '');
    const ba = p.beforeAfter && p.beforeAfter.before && p.beforeAfter.after ? p.beforeAfter : null;
    const baHtml = ba ? `<section class="wrap ba-sec"><h2>${e(T.beforeAfter)}</h2><div class="ba" dir="ltr" data-ba><div class="media ba-b"><img src="${u(ba.before)}" alt="${e(T.before)}" loading="lazy" decoding="async"></div><div class="media ba-a"><img src="${u(ba.after)}" alt="${e(T.after)}" loading="lazy" decoding="async"></div><span class="tag t-b">${e(T.before)}</span><span class="tag t-a">${e(T.after)}</span><i class="ba-line" aria-hidden="true"></i><i class="ba-knob" aria-hidden="true"></i><input type="range" min="0" max="100" value="50" aria-label="${e(T.compareAria)}"></div></section>` : '';
    const gal = (Array.isArray(p.gallery) ? p.gallery : []).map(g => (typeof g === 'string' ? { src: g } : g)).filter(g => g && g.src && safeUrl(g.src));
    const galHtml = gal.length ? `<section class="wrap gal-sec"><h2>${e(T.gallery)}</h2><div class="gal" data-drag tabindex="0" role="group" aria-label="${e(T.gallery)}">${gal.map((g, i) => `<figure class="gal-item"><div class="media" data-zoom data-cursor="+"><img src="${u(g.src)}" alt="${e(g.alt || p.title + ' ' + (i + 1))}" loading="lazy" decoding="async" draggable="false"></div></figure>`).join('')}</div><p class="hint muted">${e(T.dragHint)}</p></section>` : '';
    out[K(`/work/${p.slug}/`)] = page({
      key: 'project', url: `/work/${p.slug}/`, title: p.title, desc: p.summary, img: p.image || undefined,
      body: `<section class="wrap phero"><nav class="crumb" aria-label="${e(T.ariaBreadcrumb)}"><a href="${u('/work/')}">${e(T.crumbWork)}</a> / ${e(p.title)}</nav><p class="eyebrow">${e(p.category)}${p.demo ? ' · ' + e(T.demo) : ''}</p><h1>${e(p.title)}</h1><p class="lead">${e(p.summary)}</p>${p.url ? `<p><a class="btn" href="${u(p.url)}" target="_blank" rel="noopener noreferrer"><span>${e(T.visitLive)} ${arrowUp}</span><span class="sr"> ${e(T.newTab)}</span></a></p>` : ''}</section>
<div class="wrap"><div class="shot shot-hero"><div class="shot-bar" aria-hidden="true"><i></i><i></i><i></i><span class="shot-url" dir="ltr">${e(host(p.url) || p.slug)}</span></div>${media(p, { eager: true, zoom: true })}</div></div>
<div class="wrap case">${blk(T.overview, p.overview ? `<p>${e(p.overview)}</p>` : '')}
<aside class="facts">${p.client ? `<h3>${e(T.client)}</h3><p>${e(p.client)}</p>` : ''}${p.services?.length ? `<h3>${e(T.servicesH)}</h3>${list(p.services)}` : ''}${p.tech?.length ? `<h3>${e(T.builtWith)}</h3>${list(p.tech)}` : ''}</aside>
${blk(T.goals, list(p.goals))}${blk(T.challenges, list(p.challenges))}${blk(T.approach, p.approach ? `<p>${e(p.approach)}</p>` : '')}${blk(T.outcomes, list(p.outcomes))}
${p.mobileImage ? `<section><h2>${e(T.onMobile)}</h2><div class="shot-m">${media({ ...p, image: p.mobileImage }, { zoom: true, v: 1 })}</div></section>` : ''}</div>
${baHtml}${galHtml}
${rel.length ? `<section class="wrap sec">${head(T.related)}<div class="grid">${rel.map(card).join('')}</div></section>` : ''}${cta()}`
    });
  });

  // =====================================================================
  //  SERVICES page
  // =====================================================================
  out[K('/services/')] = page({
    key: 'services', url: '/services/', title: T.pageServices, desc: nm(T.descServices),
    body: `${pageHero(txt('servicesPageTitle'), txt('servicesPageText'))}<section class="wrap sec split-svc"><div class="tabs" role="tablist" aria-label="${e(T.ariaServices)}">${S.services.map((s, i) => `<button type="button" role="tab" id="t${i}" aria-controls="p${i}" aria-selected="${i === 0}" class="tab${i === 0 ? ' on' : ''}">${ico(i)}<span>${e(s.title)}</span></button>`).join('')}</div><div>${S.services.map((s, i) => `<article class="panel" id="p${i}" role="tabpanel" aria-labelledby="t${i}"><h2>${e(s.title)}</h2><p>${e(s.desc)}</p><p class="val">${e(s.value)}</p><h3>${e(T.included)}</h3>${list(s.deliverables)}${btn({ label: T.startProject, href: '/contact/' })}</article>`).join('')}</div></section>
<section class="band tint"><div class="wrap">${head(T.workflow)}${steps()}</div></section>
<section class="wrap sec">${head(T.waysToWork)}<div class="why light">${S.engagements.map(g => `<div><h3>${e(g.title)}</h3><p>${e(g.desc)}</p></div>`).join('')}</div></section>
${S.sections.faq ? `<section class="wrap sec narrow">${head(T.faqTitle)}${S.faq.map(f => `<details><summary>${e(f.q)}</summary><p>${e(f.a)}</p></details>`).join('')}</section>` : ''}${extra('services')}${cta()}`
  });

  // =====================================================================
  //  ABOUT page
  // =====================================================================
  const A = S.about;
  const blk2 = (t, c) => `<section><h2>${e(t)}</h2><p>${e(c)}</p></section>`;
  out[K('/about/')] = page({
    key: 'about', url: '/about/', title: T.pageAbout, desc: nm(T.descAbout),
    body: `<section class="wrap phero phero-split"><div><h1>${e(txt('aboutPageTitle'))}</h1>${txt('aboutPageText') ? `<p class="lead">${e(txt('aboutPageText'))}</p>` : ''}</div><div class="scene" aria-hidden="true"><svg class="blob" viewBox="0 0 200 200"><path d="M100,20 C150,18 182,58 180,102 C178,150 140,182 98,180 C54,178 20,146 20,100 C20,56 56,22 100,20 Z"><animate attributeName="d" dur="11s" repeatCount="indefinite" values="M100,20 C150,18 182,58 180,102 C178,150 140,182 98,180 C54,178 20,146 20,100 C20,56 56,22 100,20 Z;M104,16 C158,30 186,70 172,116 C160,160 126,186 86,178 C40,170 14,128 26,84 C36,44 70,10 104,16 Z;M96,24 C140,12 190,50 182,100 C176,146 150,170 104,184 C58,196 18,150 18,104 C18,60 58,34 96,24 Z;M100,20 C150,18 182,58 180,102 C178,150 140,182 98,180 C54,178 20,146 20,100 C20,56 56,22 100,20 Z"/></path></svg><div class="cube">${[0, 1, 2, 3, 4, 5].map(i => `<i class="face f${i}">${svg(PATHS[i], 38)}</i>`).join('')}</div></div></section><section class="wrap sec"><div class="cols3">${[[T.aboutMission, A.mission], [T.aboutPhilosophy, A.design + ' ' + A.development], [T.aboutApproach, A.approach]].map(([t, c]) => blk2(t, c)).join('')}</div></section>
${(S.team || []).length ? `<section class="wrap sec">${head(T.team)}<div class="why light">${S.team.map(m => `<div><h3>${e(m.name)}</h3><p>${e(m.role)}</p></div>`).join('')}</div></section>` : ''}${extra('about')}
<section class="wrap sec"><div class="banner"><h2>${e(T.letsBuild)}</h2><a class="btn inv" href="${u('/work/')}"><span>${e(T.exploreWork)}</span></a></div></section>`
  });

  // =====================================================================
  //  CONTACT page
  // =====================================================================
  // Labels are shown in the page language; the submitted value is always the English one (what you read in your inbox).
  const opt = (a, vals) => a.map((x, i) => `<option${vals && vals[i] != null ? ` value="${e(vals[i])}"` : ''}>${e(x)}</option>`).join('');
  const enCP = S_en.contactPage || {};
  const fld = (id, label, extraHtml = '', req) => `<div class="f"><label for="${id}">${label}${req ? ' <span aria-hidden="true">*</span>' : ` <span class="muted">${e(T.optional)}</span>`}</label>${extraHtml}</div>`;
  // Contact cards: Email, WhatsApp (logo), social logos. / كروت التواصل: الإيميل، الواتساب (باللوجو)، السوشيال.
  const cEmail = S.email ? `<a class="ccard" href="mailto:${e(S.email)}"><span class="ccard-ico">${svg(ICON.mail, 24)}</span><span class="ccard-t"><b>${e(CP.emailHeading || T.emailTitle)}</b><small class="ltr">${e(S.email)}</small></span><span class="ccard-go" aria-hidden="true">${arrowUp}</span></a>` : `<div class="ccard"><span class="ccard-ico">${svg(ICON.mail, 24)}</span><span class="ccard-t"><b>${e(CP.emailHeading || T.emailTitle)}</b><small>${e(T.useFormReply)}</small></span></div>`;
  const cWa = waLink
    ? `<a class="ccard wa" href="${e(waLink)}" target="_blank" rel="noopener noreferrer"><span class="ccard-ico wa-logo">${svg(SOC.whatsapp, 28)}</span><span class="ccard-t"><b>${e(T.waTitle)}</b><small class="ltr">+${e(waNum)}</small></span><span class="ccard-go" aria-hidden="true">${arrowUp}</span><span class="sr"> ${e(T.newTab)}</span></a>`
    : demo ? `<div class="ccard wa is-empty"><span class="ccard-ico wa-logo">${svg(SOC.whatsapp, 28)}</span><span class="ccard-t"><b>${e(T.waEmptyTitle)}</b><small>${e(T.waEmptyText)}</small></span></div>` : '';
  const cSoc = socials.length ? `<div class="ccard social"><div class="ccard-t"><b>${e(T.followTitle)}</b><small>${e(T.followText)}</small></div><div class="socbs">${socials.map(socBig).join('')}</div></div>` : '';
  const cMore = contactChannels.map(c => `<a class="ccard" href="${u(c.href || '#')}" ${/^https?:/.test(c.href || '') ? 'target="_blank" rel="noopener noreferrer"' : ''}><span class="ccard-ico">${svg(ICON.chat, 24)}</span><span class="ccard-t"><b>${e(c.label)}</b>${c.value ? `<small>${e(c.value)}</small>` : ''}</span><span class="ccard-go" aria-hidden="true">${arrowUp}</span></a>`).join('');
  out[K('/contact/')] = page({
    key: 'contact', url: '/contact/', title: T.pageContact, desc: T.descContact,
    body: `${pageHero(CP.title, CP.text)}<section class="wrap sec contact"><aside class="cinfo">${cEmail}${cWa}${cMore}${cSoc}</aside><form id="inquiry" method="post" action="${ENDPOINT ? u(ENDPOINT) : '#'}" ${ENDPOINT || !S.email ? '' : `data-mailto="${e(S.email)}"`} ${ENDPOINT || S.email ? '' : 'data-off'} data-m-mailto="${e(T.msgMailto)}" data-m-required="${e(T.msgRequired)}" data-m-sending="${e(T.msgSending)}" data-m-error="${e(T.msgError)}" novalidate>
<h2 class="form-t">${e(T.formTitle)}</h2>
${ENDPOINT ? '' : S.email ? `<p class="note">${e(T.formMailto)}</p>` : `<p class="note">${e(T.formOff)} ${S.email ? `${e(T.emailUsPrefix)} <a class="link ltr" href="mailto:${e(S.email)}">${e(S.email)}</a> ${e(T.emailUsSuffix)}` : e(T.formAddEndpoint)}</p>`}
<input type="hidden" name="lang" value="${lang}">
<div class="frow">${fld('name', e(CL.name), '<input id="name" name="name" autocomplete="name" maxlength="120" required>', 1)}${fld('email', e(CL.email), '<input id="email" name="email" type="email" autocomplete="email" maxlength="200" required>', 1)}</div>
<div class="frow">${fld('company', e(CL.company), '<input id="company" name="company" autocomplete="organization" maxlength="200" required>', 1)}${fld('site', e(CL.website), '<input id="site" name="website" type="url" placeholder="https://" maxlength="300">')}</div>
${fld('service', e(CL.service), `<select id="service" name="service" required><option value="">${e(T.selectService)}</option>${opt(S.services.map(s => s.title), S_en.services.map(s => s.title))}</select>`, 1)}
${(S.budgets || []).length ? fld('budget', e(CL.budget), `<select id="budget" name="budget"><option value="">${e(T.preferNot)}</option>${opt(S.budgets, S_en.budgets)}</select>`) : ''}
${fld('msg', e(CL.message), '<textarea id="msg" name="message" rows="6" required minlength="20" maxlength="5000"></textarea>', 1)}
${fld('pref', e(CL.contactMethod), `<select id="pref" name="contact_method"><option value="Email">${e(T.contactEmail)}</option><option value="Video call">${e(T.videoCall)}</option>${waLink ? `<option value="WhatsApp">${e(T.waTitle)}</option>` : ''}</select>`)}
${extraFields.map((x, i) => { const n = 'custom_' + i, label = e(x.label || (T.extraField + ' ' + (i + 1))), req = x.required ? ' required' : ''; if (x.type === 'textarea') return fld(n, label, `<textarea id="${n}" name="${n}" rows="4" maxlength="2000"${req}></textarea>`, x.required); if (x.type === 'select') return fld(n, label, `<select id="${n}" name="${n}"${req}><option value="">${e(T.chooseOption)}</option>${opt(x.options || [], ((enCP.extraFields || [])[i] || {}).options)}</select>`, x.required); const typ = ['text', 'email', 'tel', 'url', 'number'].includes(x.type) ? x.type : 'text'; return fld(n, label, `<input id="${n}" name="${n}" type="${typ}" maxlength="2000"${req}>`, x.required); }).join('')}
<div class="f hp" aria-hidden="true"><label for="_g">${e(T.leaveEmpty)}</label><input id="_g" name="_gotcha" tabindex="-1" autocomplete="off"></div>
<div class="f check"><input id="consent" name="consent" type="checkbox" required><label for="consent">${e(CL.consent)} <span aria-hidden="true">*</span></label></div>
<button class="btn" type="submit" ${ENDPOINT || S.email ? '' : 'disabled'}><span>${e(CP.submitLabel || 'Send inquiry')}</span></button><p id="status" data-success="${e(CP.successMessage)}" role="status" aria-live="polite"></p></form></section>${extra('contact')}`
  });
  out[K('/404.html')] = page({ key: 'notfound', url: '/404.html', title: T.notFoundTitle, noindex: true, body: `${pageHero(T.notFoundTitle, T.notFoundText)}<p class="wrap sec"><a class="btn" href="${u('/')}"><span>${e(T.backHome)}</span></a></p>` });
  return out;
}

// =====================================================================
//  CHECK: broken internal links + inline styles (blocked by the CSP)
// =====================================================================
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

// =====================================================================
//  CLI:  node build.js            -> build once
//        node build.js --serve    -> build + local server on http://localhost:3000 with auto-reload
// =====================================================================
if (require.main === module) {
  const bad = (() => { try { return build(); } catch (x) { console.error('\nBUILD ERROR:', x.message); return process.argv.includes('--serve') ? 0 : 1; } })();
  if (process.argv.includes('--serve')) {
    const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.xml': 'application/xml', '.woff': 'font/woff', '.json': 'application/json' };
    const clients = new Set();
    let t;
    for (const d of ['content', 'assets']) fs.watch(path.join(R, d), { recursive: true }, () => {
      clearTimeout(t);
      t = setTimeout(() => { try { build(); clients.forEach(c => c.write('data: reload\n\n')); } catch (x) { console.error('\nBUILD ERROR:', x.message); } }, 200);
    });
    http.createServer((q, s) => {
      if (q.url === '/__events') { s.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }); s.write('retry: 1000\n\n'); clients.add(s); q.on('close', () => clients.delete(s)); return; }
      if (q.url === '/__reload.js') { s.setHeader('Content-Type', 'text/javascript'); return s.end("new EventSource('/__events').onmessage=function(){location.reload()};"); }
      let p; try { p = decodeURIComponent(q.url.split('?')[0]); } catch { s.statusCode = 400; return s.end('Bad request'); }
      if (p.endsWith('/')) p += 'index.html';
      let f = path.join(OUT, path.normalize(p));
      if (!f.startsWith(OUT + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.statusCode = 404; f = path.join(OUT, '404.html'); }
      if (!fs.existsSync(f)) { s.statusCode = 500; return s.end('The build failed. Read the error in the terminal, fix the file, and save again.'); }
      s.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream'); s.setHeader('Cache-Control', 'no-store');
      let body = fs.readFileSync(f);
      if (path.extname(f) === '.html') body = body.toString('utf8').replace('</body>', '<script src="/__reload.js"></script></body>');
      s.end(body);
    }).listen(3000, '127.0.0.1', () => console.log('Dev server: http://localhost:3000  (the page reloads by itself when you save)'));
  } else process.exit(bad ? 1 : 0);
}
