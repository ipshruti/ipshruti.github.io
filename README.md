# pshruti.com

Personal site built with [Astro](https://astro.build).

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
draft: true                       # optional; drafts only show locally
---
```

## Deploying

Pushing to `main` builds and deploys via `.github/workflows/deploy.yml`.
GitHub Pages source must be set to **GitHub Actions** (Settings → Pages).
