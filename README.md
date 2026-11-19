<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/readme/banner-dark.jpg">
  <img alt="Shruti Priya, over a painted sunset landscape" src=".github/readme/banner-light.jpg">
</picture>

<p align="center">
  <a href="https://pshruti.com"><b>pshruti.com</b></a> ·
  <a href="https://pshruti.com/blog/">Writing</a> ·
  <a href="https://github.com/ipshruti">GitHub</a> ·
  <a href="https://www.linkedin.com/in/ipshruti/">LinkedIn</a>
</p>

Notes on software testing, and what I'm learning. Built with [Astro](https://astro.build).

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # outputs to dist/
```

## Writing a post

Add a Markdown file to `src/content/blog/`. The file name becomes the URL, so `my-post.md` lives at `/blog/my-post/`.

```yaml
---
title: My post
description: One line about it.   # optional
date: 2026-10-16
tags: [design, notes]             # optional; each gets a page at /blog/tags/<tag>/
draft: true                       # optional; drafts only show locally
---
```

## Deploying

Pushing to `main` builds and deploys via `.github/workflows/deploy.yml`.
GitHub Pages source must be set to **GitHub Actions** (Settings → Pages).
