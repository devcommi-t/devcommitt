# `<dev.commit>` — Static Portfolio Website

A bilingual (English / Arabic) portfolio site for a Shopify design and development studio. It is a **front-end only** site: no server, no admin panel, no database. A small Node script turns the content files into plain HTML, CSS and JS, ready for GitHub Pages.

## Quick start

Requires **Node 18+**. There is no `npm install` step.

```bash
npm run dev     # http://localhost:3000, rebuilds on changes to content/ or assets/
npm run build   # outputs the finished site to dist/
```

## Project structure

```
content/
  site.json           # English site content, theme colors, contact settings
  site.ar.json        # Arabic site content
  projects.json       # English projects
  projects.ar.json    # Arabic projects
assets/
  css/  js/  fonts/  img/
lib/i18n.js           # UI strings for both languages
build.js              # static site generator
CNAME                 # custom domain (see below)
.github/workflows/deploy.yml   # automatic deployment
```

## Editing content

All text lives in the `content/` folder. Edit the JSON, commit, and the site rebuilds.

| What | Where |
| --- | --- |
| Hero, services, process, FAQ, about, call to action | `content/site.json` (English) and `content/site.ar.json` (Arabic) |
| Brand colors | `theme` block in `content/site.json` |
| Contact email | `email` in `content/site.json` |
| Instagram / LinkedIn links | `social` block in `content/site.json` (empty values are hidden) |
| Scrolling text strip | `marquee.enabled` in `content/site.json` (`false` hides it) |
| Projects | `content/projects.json` and `content/projects.ar.json` |

Keep the English and Arabic files in step: a change to one is not copied to the other.

### Brand colors

| Color | Hex |
| --- | --- |
| Cream (background) | `#FAF3E8` |
| Terracotta (accent) | `#C8674A` |
| Forest green (primary / text) | `#2F5D50` |

### Adding a project

1. Put the screenshots in `assets/img/projects/`.
2. Add an entry to `content/projects.json` and the matching one to `content/projects.ar.json`, with the same `slug`.
3. Point `image` and `mobileImage` at the files, for example `"/assets/img/projects/store1.jpg"`.

Entries with `"demo": true` are placeholders. Set `showDemoProjects` to `false` in `content/site.json` to hide them.

## Contact form

The form posts to the Formspree endpoint set in `formEndpoint` in `content/site.json`. If that value is empty, the form falls back to opening the visitor's email app, addressed to the `email` value.

## Deploying to GitHub Pages

1. Create a repository and push the whole folder, including `.github/`.
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Every push to `main` builds and publishes the site automatically. Progress is visible in the **Actions** tab, and updates usually appear within a couple of minutes.

The site address is chosen automatically:

- If the `CNAME` file is present and not empty, the site is served from that custom domain.
- Otherwise, if the repository is named `USERNAME.github.io`, it is served from the root of that address.
- Otherwise it is served from `https://USERNAME.github.io/REPO/`.

### Custom domain

The `CNAME` file currently contains `devcommitt.com`. Only keep it if you own that domain and its DNS points to GitHub Pages. If not, delete the file and the site will deploy to the `github.io` address instead.

## Notes

- Canonical URLs, Open Graph URLs and `sitemap.xml` are generated only when a site URL is known. The deploy workflow supplies it automatically, so they are skipped on local builds.
- Animations are turned off for visitors who prefer reduced motion.
- The build checks that all internal links and assets resolve, and fails if the JSON files are invalid.
