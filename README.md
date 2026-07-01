# alex-huang.dev — built site (public mirror)

Compiled static output of my personal site, **https://alex-huang.dev**. This repository
exists only so GitHub Pages can serve the site publicly while the source stays private.

- **Live site:** https://alex-huang.dev
- **Source:** private repo (Astro + Tailwind CSS) — CI builds and publishes here
- **Served branch:** [`gh-pages`](../../tree/gh-pages), auto-published on every push via
  [`peaceiris/actions-gh-pages`](https://github.com/peaceiris/actions-gh-pages)

## Do not edit this repo

The `gh-pages` branch is **overwritten on every deploy** — any manual change there is lost on
the next push. All changes happen in the private source repo; CI rebuilds and force-publishes
the `dist/` output to `gh-pages`.

This `main` branch holds only this README (it is not served and is not touched by deploys).

## Stack

Astro · Tailwind CSS · GitHub Pages (custom domain via `CNAME`).
