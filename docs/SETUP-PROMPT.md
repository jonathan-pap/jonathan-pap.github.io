# Paste this into Claude Code in any workspace you want to publish from

```
Set this workspace up to publish posts to my website (jonathan-pap.github.io).
The site repo lives at E:\git-page\jonathan-pap.github.io and pulls from this
workspace via its sync_posts.py — nothing here needs to run anything.

Do exactly this:

1. Create docs/public/ and docs/public/img/ (add a .gitkeep to img/).

2. Create docs/public/_template.md with this content:
   ---
   title: Replace me
   date: 2026-01-01
   category: Notes
   tags: [Power BI]
   excerpt:
   image:
   draft: true
   ---

   # Replace me

   First paragraph becomes the excerpt if `excerpt:` is empty.

3. Append this section to CLAUDE.md (create the file if missing):

   ## Publishing to jonathan-pap.github.io
   `docs/public/` in this workspace is synced verbatim to my public website.
   Rules for anything written there:
   - No client or employer names, internal hostnames, workspace/tenant IDs, credentials, or local file paths.
   - No content copied from private repos or internal docs — rewrite as a general lesson.
   - Every file needs front matter: title, date (YYYY-MM-DD), category, tags. Use `draft: true` until I say it's ready.
   - Files starting with `_` are ignored by the sync. Slug = file name unless `slug:` is set.
   - Never put anything else from this workspace into docs/public/ without asking.
   - To publish: from the site repo run `python sync_posts.py --dry-run`, then `python sync_posts.py`, commit, push.

4. If .gitignore ignores docs/ or *.md in a way that would hide docs/public/, add `!docs/public/**`.

5. Tell me the absolute path of this workspace root so I can add it to sources.json
   in the site repo as { "id": "<short-id>", "path": "<that path>" }.

Do not create a post yet. Do not touch anything outside docs/public/, CLAUDE.md and .gitignore.
```

## After Claude replies with the path

Add it to `E:\git-page\jonathan-pap.github.io\sources.json` if it isn't already there, then any time you want to publish:

```
cd E:\git-page\jonathan-pap.github.io
python sync_posts.py --dry-run
python sync_posts.py
git add -A && git commit -m "sync posts" && git push
```
