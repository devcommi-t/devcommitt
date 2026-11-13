# دليل التعديل · Edit Guide

كل نصوص وألوان وروابط الموقع في مجلد `content/`. ماتحتاجش تلمس `build.js` غالبًا.
All text, colours and links live in `content/`. You rarely need to touch `build.js`.

| ملف / File | بيعمل ايه / What it does |
|---|---|
| `content/site.json` | الإنجليزي + كل الإعدادات (ألوان، سوشيال، واتساب، ترتيب الأقسام) · English + all settings |
| `content/site.ar.json` | الترجمة العربية فقط · Arabic translations only |
| `content/projects.json` / `projects.ar.json` | المشاريع · projects |

الملفات دي بتقبل تعليقات `// ...` (VS Code بيعرضها كـ JSONC). · These files allow `// comments`.

## 1) تشغيل · Run
```bash
npm run dev      # http://localhost:3000 — بيتحدث لوحده · auto-reloads
npm run build    # ينتج dist/ · writes dist/
```

## 2) الألوان · Colours
`site.json` → `theme` (فاتح · light) و `themeDark` (داكن · dark). الصيغة `#RRGGBB`.
`background` الصفحة · `surface` الكروت · `primary` الأساسي · `accent` التمييز · `text` النص.

## 3) السوشيال والواتساب · Socials & WhatsApp
```jsonc
"whatsapp": "201001234567",          // كود الدولة + رقم، أرقام بس · country code + digits only
"social": { "instagram": "https://instagram.com/you", "tiktok": "https://tiktok.com/@you", "facebook": "https://facebook.com/you" }
```
الفاضي مش بيظهر (لما `showDemoProjects: false`). رقم الواتساب بيظهر في Contact وزرار عايم.
Empty values are hidden at launch. The WhatsApp number shows in Contact and as a floating button.

## 4) ترتيب الأقسام / إضافة قسم · Reorder / add sections
`site.json` → `homeSections`. امسح اسم لإخفائه، غيّر الترتيب لتحريكه. · Delete a name to hide, reorder to move.
الأسماء · built-in: `hero ticker work statement showcase bigtext services process why love cta`

لإضافة قسم جديد حط object مكان الاسم · To add a section, put an object instead of a name:
```jsonc
{ "type": "text",  "style": "tint",  "eyebrow": "About", "title": "My section", "text": "Words…" }
{ "type": "cards", "style": "light", "title": "Perks", "items": [ { "title": "Fast", "desc": "…", "icon": "bolt" } ] }
{ "type": "split", "style": "dark",  "title": "…", "text": "…", "image": "/assets/img/x.jpg", "reverse": true }
{ "type": "faq",   "items": [ { "q": "…", "a": "…" } ] }
{ "type": "steps", "items": [ { "title": "…", "desc": "…" } ] }
{ "type": "cta",   "title": "…", "label": "Talk", "href": "/contact/" }
```
`style`: `light | tint | dark` · أيقونات · icons: `bag cart tag code layout sparkle search mail rocket arrow check chat phone star shield bolt`
الترجمة العربية لنفس القسم في `site.ar.json` → `homeSections` بنفس الترتيب (الـ title/text/items بس).
Arabic version: same index in `site.ar.json` → `homeSections`.
الصفحات الداخلية · inner pages: `extraSections: { work: [], services: [], about: [], contact: [] }`.

## 5) المشاريع · Projects
```bash
npm run add-project -- "Project name" --cat "Shopify Store Design" --url https://client.com --ar "الاسم بالعربي"
```
حط الصور في `assets/img/projects/<slug>/` : `cover.jpg`, `mobile.jpg`, `before.jpg`+`after.jpg`, `1.jpg 2.jpg …`
Drop images there with those names — they are picked up automatically.

## 6) الإطلاق · Go live
`site.json` → `"showDemoProjects": false` يخفي المشاريع التجريبية والأماكن الفاضية. · hides demos and empty placeholders.
حط `siteUrl` (مثلاً `https://devcommitt.com`) لتفعيل sitemap وروابط canonical. · set `siteUrl` for sitemap/canonical.

## 7) قسم "Why brands choose us" / Showcase
`site.json` → `showcase.items` : كل عنصر له `scene`: `sections | responsive | editor | code` (مشهد متحرك مختلف).

## 8) الأمان · Security
- CSP صارم بدون inline script/style (البناء بيفشل لو حطيت `style="…"`) · strict CSP; build fails on inline styles.
- الروابط بتتفلتر (`https/http/mailto/tel` بس) · URLs are sanitised.
- فورم التواصل: honeypot + مؤقت ضد البوتات · form honeypot + timing trap.
- حماية clickjacking داخل `boot.js` (GitHub Pages مش بيسمح بـ headers) · frame-busting in `boot.js`.
- ماتحطش أسرار (API keys) في الملفات؛ Formspree endpoint عام بطبيعته · never put secrets in files.

## 9) الأنيميشن · Animation
`assets/css/fx.css` + `assets/js/fx.js` (من غير مكتبات · no libraries). بتتقفل تلقائيًا مع `prefers-reduced-motion`.
