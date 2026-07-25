# Inside DOSBox-X: Understanding the IBM PC Emulation

A production-quality online book website exploring the internals of DOSBox-X, IBM PC architecture, CPU emulation, graphics, sound, memory management, BIOS/DOS interaction, and emulator design.

[![Live demo](https://img.shields.io/badge/Live_demo-%E2%86%97-1a1a1a?style=for-the-badge)](https://everythingiscode.github.io/dosbox-x-internals/)
[![Deploy](https://img.shields.io/github/actions/workflow/status/everythingiscode/dosbox-x-internals/deploy.yml?branch=master&style=flat-square&label=deploy)](https://github.com/everythingiscode/dosbox-x-internals/actions/workflows/deploy.yml)
[![Astro](https://img.shields.io/badge/Astro-7-BC52EE?style=flat-square&logo=astro&logoColor=white)](https://astro.build)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)

## Features

- **Continuous reader** — scroll through all chapters at `/read` with sticky table of contents, IntersectionObserver-based chapter tracking, and reading progress indicator
- **Individual chapter pages** — each chapter accessible at `/read/[slug]` for sharing
- **Technical book components** — reusable MDX components for diagrams, code walkthroughs, register tables, memory maps, exercises, and key concept callouts
- **Architecture diagrams** — Mermaid-based diagrams rendered client-side with theme-aware styling
- **Full-text search** — Pagefind-powered search across all chapters
- **Dark/light mode** — respects system preference with manual toggle (no flash on load)
- **Syntax highlighting** — Shiki dual themes (light/dark) wired to the active color scheme
- **SEO-ready** — canonical URLs, Open Graph, Twitter cards, and sitemap

## Versioning

Releases follow **semantic versioning**. Each release is tagged in git and corresponds to a published set of chapters:

- **v0.1.0** — Initial release (chapters 0–6)

To create a new release:

```sh
# Bump version in package.json
npm version minor          # or patch / major
# This creates a git tag automatically.
# Push the tag to trigger a GitHub release:
git push origin master --tags
```

The version shown in the site footer is read automatically from `package.json` at build time. The changelog at `/changelog/` is maintained manually.

## Tech stack

Astro 7 · TypeScript · MDX · Content Collections (Content Layer API) · `@astrojs/mdx` · `@astrojs/sitemap` · `@astrojs/react` · `@astrojs/rss` · Shiki · Mermaid · Pagefind · Requires **Node.js 22+**.

## Quick start

```sh
npm install
npm run dev       # start the dev server at http://localhost:4321
npm run build     # build the static site to ./dist
npm run preview   # preview the production build
```

## Project structure

```
src/
  consts.ts           # site name, description, nav, book structure
  content.config.ts   # collection schemas (Content Layer API)
  content/book/       # MDX chapter files
  layouts/            # BaseLayout, BookLayout, ReaderLayout
  components/book/    # reusable technical book MDX components
  pages/              # routes: /, /read, /read/[slug], /search, /changelog
  styles/             # global.css + book.css design tokens
  lib/build.ts        # build-time constants (version, commit hash)
astro.config.mjs      # site URL, base, integrations, Shiki config
```

## License

All Rights Reserved. See [LICENSE](./LICENSE).
