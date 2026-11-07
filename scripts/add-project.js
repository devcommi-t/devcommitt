#!/usr/bin/env node
// npm run add-project -- "Project title" [options]
// Creates the project in content/projects.json (+ Arabic text in projects.ar.json) and a folder for its images.
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..');
const args = process.argv.slice(2), opt = {}, rest = [];
for (let i = 0; i < args.length; i++) { if (args[i].startsWith('--')) opt[args[i].slice(2)] = args[++i]; else rest.push(args[i]); }
const title = rest.join(' ').trim();
if (!title || opt.help) {
  console.log(`Usage: npm run add-project -- "Project title" [options]
  --cat "Shopify Store Design"   category (must match one in site.json, or a new one is created)
  --client "Client name"         --url https://live-site.com
  --summary "One-line description"
  --ar "العنوان بالعربي"          --summary-ar "وصف قصير بالعربي"
  --demo true                    mark as a demo project (hidden when showDemoProjects is false)
  --featured false               do not show on the home page`);
  process.exit(title ? 0 : 1);
}
const slug = (opt.slug || title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
if (!slug) { console.error('Could not make a slug from that title: pass --slug my-project (letters, numbers and dashes).'); process.exit(1); }
const rd = f => JSON.parse(fs.readFileSync(path.join(R, 'content', f), 'utf8')), wr = (f, j) => fs.writeFileSync(path.join(R, 'content', f), JSON.stringify(j, null, 2) + '\n');
const P = rd('projects.json');
if (P.some(p => p.slug === slug)) { console.error('A project with slug "' + slug + '" already exists.'); process.exit(1); }
const site = rd('site.json');
P.unshift({
  slug, demo: opt.demo === 'true', featured: opt.featured !== 'false', title, client: opt.client || '',
  category: opt.cat || (site.categories || [])[0] || '', summary: opt.summary || '', services: [], url: opt.url || '',
  image: '', mobileImage: '', overview: '', goals: [], challenges: [], approach: '', tech: [], outcomes: []
});
wr('projects.json', P);
if (opt.ar || opt['summary-ar']) { const A = rd('projects.ar.json'); A[slug] = { title: opt.ar || title, summary: opt['summary-ar'] || '' }; wr('projects.ar.json', A); }
const dir = path.join(R, 'assets/img/projects', slug); fs.mkdirSync(dir, { recursive: true });
console.log(`Created "${title}" (${slug}).
Now drop your images in assets/img/projects/${slug}/ :
  cover.jpg      main image          mobile.jpg   phone screenshot (optional)
  before.jpg + after.jpg  before/after slider (optional)
  1.jpg 2.jpg 3.jpg ...   draggable gallery (optional)
Then fill in the text in content/projects.json (overview, goals, challenges, approach, tech, outcomes) and run: npm run build`);
