# `<dev.commit>` — نسخة Frontend فقط (جاهزة لـ GitHub Pages)

نفس الموقع بنفس الألوان والتصميم والأنيميشن والأزرار واللغتين (عربي/إنجليزي)، لكن **بدون باك إند**: مفيش سيرفر ولا لوحة أدمن ولا قاعدة بيانات. الموقع بيتبني ملفات HTML/CSS/JS ثابتة.

## النشر على GitHub Pages (تلقائي)
1. اعمل Repository جديد على GitHub وارفع كل محتويات المجلد ده (بما فيه `.github`).
2. من **Settings → Pages** اختار **Source: GitHub Actions**.
3. أي push على فرع `main` هيبني الموقع وينشره تلقائيًا على `https://USERNAME.github.io/REPO/`.
   (لو اسم الـ repo هو `USERNAME.github.io` هيشتغل على الجذر مباشرة.)

## تشغيل محلي
```bash
npm run dev     # http://localhost:3000  (بيعيد البناء تلقائيًا عند تعديل content أو assets)
npm run build   # بيطلّع المجلد dist/
```
محتاج Node 18+ فقط، ومفيش `npm install`.

## إضافة مشروع جديد (3 خطوات)
1. شغّل الأمر ده (بيعمل المشروع ومجلد صوره):
   ```bash
   npm run add-project -- "اسم المشروع بالإنجليزي" --cat "Shopify Store Design" --url https://موقع-العميل.com --ar "الاسم بالعربي"
   ```
2. حط الصور في المجلد `assets/img/projects/<slug>/` بالأسماء دي وهتتعرف عليها لوحدها (من غير ما تكتب مسارات):
   - `cover.jpg` الصورة الرئيسية، و`mobile.jpg` صورة الموبايل (اختياري)
   - `before.jpg` + `after.jpg` بيظهروا كسلايدر "قبل / بعد" (اختياري)
   - `1.jpg` و`2.jpg` و`3.jpg` … بتظهر كمعرض أفقي بالسحب، وبالضغط على أي صورة بتتكبّر (اختياري)
3. املأ النصوص (`overview`, `goals`, `challenges`, `approach`, `tech`, `outcomes`) في `content/projects.json`، والترجمة العربية في `content/projects.ar.json` تحت نفس الـ slug، وبعدين `npm run build`.

ملاحظات:
- التصنيف (`category`) الجديد بيظهر تلقائيًا كزر فلتر في صفحة الأعمال.
- المشاريع التجريبية (`demo: true`) بتختفي لما تخلّي `showDemoProjects` = `false` في `content/site.json`. وامسح مشروع `test` لو مش عايزه يظهر.
- تقدر برضه تكتب `image` و`mobileImage` و`gallery` و`beforeAfter` يدويًا في `projects.json` لو الصور في مكان تاني.

## السوشيال (لوجو انستجرام وغيره)
حط الرابط في `content/site.json` تحت `social` (`instagram`, `linkedin`, `facebook`, `youtube`, `x`, `github`). كل رابط بيظهر كأيقونة دايرية في الفوتر وصفحة التواصل، والفاضي مبيظهرش.

## الأنيميشنز
- الكود في `assets/js/fx.js` و`assets/css/fx.css` (من غير مكتبات). كله بيتقفل تلقائيًا لمن عنده `prefers-reduced-motion`، والكيرسر والـ tilt والـ magnetic بيشتغلوا على الماوس بس.
- الوضع الداكن بيتفعّل من الزر في الهيدر، وألوانه مشتقة من نفس ألوان `theme`.
- نصوص الـ typed (`hero.typed`) والكلمات المتغيّرة (`cta.swap`) والنص الكبير (`bigText`) كلها من `content/site.json` و`site.ar.json`.

## نموذج التواصل
مفيش باك إند، فالنموذج بيفتح تطبيق الإيميل عند الزائر بالرسالة جاهزة على `email` المكتوب في `site.json`.
لو عايز إرسال مباشر من غير فتح الإيميل، اعمل فورم مجاني على Formspree وحط رابطه في `formEndpoint` داخل `content/site.json`.

## قسم "Why brands choose us" (بدل الأرقام القديمة)
قسم بنفس ألوان البراند: قايمة نقاط بتتبدّل لوحدها مع خط تقدّم، ولوجو البراند في النص وكارت صغير بيتنقل حواليه (بيقف لما الماوس يبقى فوق القايمة، وبيتقفل مع `prefers-reduced-motion`).
كل نصوصه في `content/site.json` تحت `spotlight` (`eyebrow`, `title`, `text`, `items[]` وكل item فيه `value` و`label` و`desc`)، والعربي في `site.ar.json` بنفس الترتيب. اكتب فيه حاجات حقيقية بس.

## قسم "More love from our clients"
بيظهر في آخر الصفحة الرئيسية قبل شريط الـ CTA. كل كارت من `testimonials` في `content/site.json`:
```json
"testimonials": [
  { "approved": true, "quote": "كلام العميل هنا", "name": "اسم العميل", "role": "Founder", "company": "اسم البراند", "rating": 5, "image": "/assets/img/clients/ahmed.jpg" }
]
```
- لازم `approved: true` و`quote` عشان الكارت يظهر. `rating` (من 1 لـ 5) و`image` و`role`/`company` اختياريين.
- لو مفيش ولا كارت: بيظهروا 3 كروت فاضية "مكان رأي العميل" طول ما `showDemoProjects` = `true`، ولما تخليه `false` القسم بيختفي لحد ما تضيف أول رأي حقيقي.
- النصوص (العنوان وغيره) تتغير من `ui` في `site.json` (`loveEyebrow`, `loveTitle`).

## الانتقال بين الصفحات
الكورتن بيظهر عليه لوجو البراند (`assets/img/logo-light.png`، نسخة فاتحة من اللوجو).

## الأمان (من غير باك إند)
- كل صفحة فيها Content-Security-Policy صارمة: مفيش سكربتات أو ستايلات inline، ومفيش تحميل من مواقع تانية غير الصور، والنموذج مسموح له يبعت بس لـ `formEndpoint`.
- النموذج: honeypot + timeout 15 ثانية + بدون cookies/referrer + قفل الزر 20 ثانية بعد الإرسال الناجح. الحماية الحقيقية من السبام بتتظبط من إعدادات Formspree نفسها (reCAPTCHA / الحد من الإرسال).
- GitHub Pages مش بيسمح بإضافة HTTP headers، فـ `frame-ancestors` (منع تضمين الموقع في iframe) مش ممكن من هنا. لو عايزه، حط الموقع ورا Cloudflare.
- الروابط الخارجية كلها `rel="noopener noreferrer"`، وكل النصوص بتتعمل escape، والروابط بتتفلتر (http/https/mailto/tel بس).
