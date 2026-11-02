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

## إضافة شغلك
- عدّل `content/projects.json` (الإنجليزي) و`content/projects.ar.json` (العربي).
- حط صور المشاريع في `assets/img/projects/` واكتب مسارها في `image` و`mobileImage`، مثال: `"/assets/img/projects/store1.jpg"`.
- المشاريع التجريبية (`demo: true`) بتختفي لما تخلّي `showDemoProjects` = `false` في `content/site.json`.
- باقي النصوص والألوان (`theme`) والخدمات في `content/site.json` و`content/site.ar.json`.

## نموذج التواصل
مفيش باك إند، فالنموذج بيفتح تطبيق الإيميل عند الزائر بالرسالة جاهزة على `email` المكتوب في `site.json`.
لو عايز إرسال مباشر من غير فتح الإيميل، اعمل فورم مجاني على Formspree وحط رابطه في `formEndpoint` داخل `content/site.json`.
