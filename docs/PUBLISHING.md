# Publishing from a workspace to the site

```
<workspace>/docs/public/*.md   ──▶  python sync_posts.py  ──▶  content/posts/*.md + posts.json + feed.xml + sitemap.xml
```

## 1. Register the workspace (once)

Add a line to `sources.json`:

```json
{ "id": "my-workspace", "path": "E:/my-workspace" }
```

## 2. In that workspace

Create `docs/public/` and drop in a copy of `docs/_post-template.md` and `docs/_CLAUDE-snippet.md` (paste the snippet into the workspace's `CLAUDE.md`).

One post = one `.md` file with front matter:

```md
---
title: Short, specific title
date: 2026-09-12
category: Tooling
tags: [Power BI, DAX, MCP]
excerpt: One or two sentences for the list. Optional — defaults to first paragraph.
image: ./img/cover.svg
draft: false
---

# Title again is fine — the site de-duplicates a leading H1

Body in normal markdown. DAX in ```dax fences gets highlighted.
```

- `category` becomes a topic in the site's sidebar (AI, Tooling, Side Projects, Notes, ...).
- `image` is optional, relative to the `.md` file; it's used as the preview picture when a post is shared.
- `draft: true` means never published.
- Keep comments on their own line starting with `#`; a `# comment` after a value becomes part of the value.

Files starting with `_` are ignored. Slug = file name unless `slug:` is set.

## 3. Publish

From the site repo:

```
python sync_posts.py --dry-run    # see what would change
python sync_posts.py              # write
git add -A && git commit -m "sync posts" && git push
```

`--only <id>` syncs one workspace. `--prune` removes site posts whose source file was deleted.

## Parked posts

Posts taken off the site but kept ready live in this repo's own `docs/public/` (registered in `sources.json` as `site`), each with `draft: true`. To put one back:

1. In `docs/public/<slug>.md`, change `draft: true` to `draft: false`.
2. `python sync_posts.py --only site --dry-run`, then `python sync_posts.py --only site`.
3. Commit and push.

To park a published post again, set `draft: true` and run `python sync_posts.py --only site --prune`.

## Guardrails

- Only `docs/public/` is read. Nothing else in a workspace is touched.
- A post is refused (not published) if it looks like it contains an API key, token, JWT, or a `C:\Users\...` path. Fix and re-run.
- Hand-written posts in `posts.json` (no `source` field) are never overwritten.
- A sourced slug that collides with a hand-written one is skipped and reported.
