# DEV.COMMIT

### Commit to Innovation. Build Beyond Limits.

**DEV.COMMIT** is an independent digital brand focused on modern web development, creative digital experiences, and custom e-commerce solutions.

---

## ⚠️ COPYRIGHT & INTELLECTUAL PROPERTY NOTICE

**© 2026 DEV.COMMIT. All Rights Reserved.**

This project and its original components are protected by applicable intellectual property and copyright laws.

The following actions are strictly prohibited without prior written authorization from the rightful copyright owner:

- Copying or reproducing the project's original source code, in whole or in substantial part.
- Stealing, duplicating, or redistributing the original project or its proprietary components.
- Modifying, republishing, or presenting this project as your own work.
- Removing copyright notices, ownership information, or developer attribution.
- Commercially exploiting, selling, or sublicensing any protected part of this project.
- Using the project's original designs, assets, or proprietary materials without authorization.

Any unauthorized use, reproduction, distribution, modification, or commercial exploitation of protected materials belonging to DEV.COMMIT may constitute copyright infringement and a violation of applicable intellectual property laws.

DEV.COMMIT reserves the right to:

1. Request the immediate removal of unauthorized copies and publications.
2. Submit copyright infringement and intellectual property complaints to relevant platforms.
3. Pursue appropriate civil or legal action against individuals or entities responsible for infringement.
4. Seek compensation for damages and losses where legally justified.

---

## نموذج التواصل
مفيش باك إند. فورم التواصل بيفتح الواتساب على الرقم اللي في `whatsapp` (داخل `content/site.json`) ومعاه بيانات العميل جاهزة للإرسال. لو الرقم فاضي بيفتح تطبيق الإيميل على `email` بدله.

## الأمان (من غير باك إند)
- كل صفحة فيها Content-Security-Policy صارمة: مفيش سكربتات أو ستايلات inline، ومفيش تحميل من مواقع تانية غير الصور، ومفيش أي اتصال بسيرفرات خارجية من النموذج.
- النموذج: honeypot + موافقة إجبارية، ومفيش بيانات بتتخزن على الموقع (الرسالة بتتبعت من واتساب العميل نفسه).
- GitHub Pages مش بيسمح بإضافة HTTP headers، فـ `frame-ancestors` (منع تضمين الموقع في iframe) مش ممكن من هنا. لو عايزه، حط الموقع ورا Cloudflare.
- الروابط الخارجية كلها `rel="noopener noreferrer"`، وكل النصوص بتتعمل escape، والروابط بتتفلتر (http/https/mailto/tel بس).