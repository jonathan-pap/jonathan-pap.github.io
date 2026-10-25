#!/usr/bin/env python3
"""
sync_posts.py — pull publishable posts from sibling VS Code workspaces into this site.

Contract (per source workspace, listed in sources.json):
    <workspace>/docs/public/<anything>.md      one post per file
    (a source can name another folder with "dir", e.g. "dir": "." for the drafts folder;
     README.md, CLAUDE.md and files starting with _ are never posts)
    front matter (YAML-ish, flat keys only):
        title:     required
        date:      required, YYYY-MM-DD
        slug:      optional, defaults to file stem
        category:  optional, defaults to "Notes"
        tags:      optional, [a, b, c] or a, b, c
        excerpt:   optional, defaults to first paragraph
        image:     optional, path relative to the .md file -> copied to assets/img/posts/<slug>.<ext>
        draft:     optional, true = skip

What it writes (idempotent, safe to re-run):
    content/posts/<slug>.md          body with front matter stripped
    assets/img/posts/<slug>.<ext>    image, if given
    assets/img/posts/<slug>/<file>   pictures the body links to (![alt](./img/x.png)), links rewritten
    content/posts.json               merged: hand-made posts kept, sourced posts replaced by "source" id
    content/posts.js, posts/<slug>.js  the same as scripts, so the site also works opened from disk
    feed.xml, sitemap.xml            regenerated from posts.json

Usage:
    python sync_posts.py            # sync everything in sources.json
    python sync_posts.py --dry-run  # report only
    python sync_posts.py --only bi-ai
    python sync_posts.py --prune    # also drop sourced posts whose .md disappeared

No third-party dependencies.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent
SITE_URL = "https://jonathan-pap.github.io"
SITE_TITLE = "Gold Layer"
SITE_SUBTITLE = "Notes on DAX, Power BI, Fabric and AI: standards, patterns, and the reasoning behind them."
AUTHOR = "Jonathan Pap"
FEED_AUTHOR = "Jonathan Papworth"

POSTS_DIR = ROOT / "content" / "posts"
IMG_DIR = ROOT / "assets" / "img" / "posts"
POSTS_JSON = ROOT / "content" / "posts.json"
POSTS_JS = ROOT / "content" / "posts.js"  # the same list as a script, for pages opened straight from disk
SOURCES_JSON = ROOT / "sources.json"

WORDS_PER_MIN = 200

# Cheap guardrail: refuse to publish a post that looks like it carries a secret.
SECRET_PATTERNS = [
    re.compile(r"(?i)\b(api[_-]?key|secret|token|password|pwd)\s*[:=]\s*['\"]?[A-Za-z0-9_\-/+]{12,}"),
    re.compile(r"\b(sk|ghp|gho|xox[abp])-[A-Za-z0-9_\-]{16,}"),
    re.compile(r"(?i)\b(eyJ[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,})"),  # JWT-ish
    re.compile(r"\b[A-Z]:\\Users\\[^\\\s]+"),                          # local Windows user path
]

FM_RE = re.compile(r"\A---\s*\n(.*?)\n---\s*\n?", re.DOTALL)
# ![alt](path) or ![alt](path "title"): captures the path
BODY_IMAGE_RE = re.compile(r'!\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)')


# ---------------------------------------------------------------- front matter
def parse_front_matter(text: str) -> tuple[dict, str]:
    """Flat YAML subset: key: value, lists as [a, b] or comma-separated. Enough for posts."""
    m = FM_RE.match(text)
    if not m:
        return {}, text
    meta: dict = {}
    for line in m.group(1).splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if ":" not in line:
            continue
        key, _, val = line.partition(":")
        key = key.strip().lower()
        val = val.strip()
        if val.startswith("[") and val.endswith("]"):
            val = val[1:-1]
            meta[key] = [v.strip().strip("'\"") for v in val.split(",") if v.strip()]
        elif key == "tags" and "," in val:
            meta[key] = [v.strip().strip("'\"") for v in val.split(",") if v.strip()]
        else:
            v = val.strip("'\"")
            if v.lower() in ("true", "false"):
                meta[key] = v.lower() == "true"
            else:
                meta[key] = v
    return meta, text[m.end():]


def slugify(s: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return re.sub(r"-{2,}", "-", s)


def first_paragraph(body: str) -> str:
    for block in re.split(r"\n\s*\n", body.strip()):
        b = block.strip()
        if not b or b.startswith("#") or b.startswith("```") or b.startswith("!["):
            continue
        b = re.sub(r"[*_`>\[\]]", "", b)
        b = re.sub(r"\(https?://[^)]+\)", "", b)
        return re.sub(r"\s+", " ", b)[:240].rstrip(" ,;:") + ("…" if len(b) > 240 else "")
    return ""


def read_time(body: str) -> int:
    words = len(re.findall(r"\w+", body))
    return max(1, round(words / WORDS_PER_MIN))


def scan_secrets(body: str, where: str) -> list[str]:
    hits = []
    for pat in SECRET_PATTERNS:
        for m in pat.finditer(body):
            hits.append(f"{where}: suspicious content near '{m.group(0)[:40]}…'")
    return hits


# ---------------------------------------------------------------- collection
def collect(source: dict, problems: list[str]) -> list[dict]:
    sid = source["id"]
    base = Path(source["path"])
    if not base.is_absolute():
        base = (ROOT / base).resolve()
    pub = (base / source.get("dir", "docs/public")).resolve()
    if not pub.is_dir():
        problems.append(f"[{sid}] no {source.get('dir', 'docs/public')} in {base} — skipped")
        return []

    posts = []
    for md in sorted(pub.rglob("*.md")):
        if md.name.startswith("_") or md.name.lower() in ("readme.md", "claude.md"):
            continue  # _template.md, and notes for people or Claude
        text = md.read_text(encoding="utf-8")
        meta, body = parse_front_matter(text)
        if meta.get("draft") is True:
            continue
        if not meta.get("title") or not meta.get("date"):
            problems.append(f"[{sid}] {md.relative_to(base)}: missing title or date — skipped")
            continue
        try:
            datetime.strptime(meta["date"], "%Y-%m-%d")
        except ValueError:
            problems.append(f"[{sid}] {md.relative_to(base)}: date must be YYYY-MM-DD — skipped")
            continue

        leaks = scan_secrets(body, f"[{sid}] {md.relative_to(base)}")
        if leaks:
            problems.extend(leaks)
            problems.append(f"[{sid}] {md.relative_to(base)}: NOT published until the above is cleaned")
            continue

        slug = slugify(meta.get("slug") or md.stem)
        tags = meta.get("tags") or []
        if isinstance(tags, str):
            tags = [tags]

        image_src = None
        if meta.get("image"):
            cand = (md.parent / meta["image"]).resolve()
            if cand.is_file():
                image_src = cand
            else:
                problems.append(f"[{sid}] {md.relative_to(base)}: image not found: {meta['image']}")

        # Pictures in the body (![alt](./img/chart.png)) are copied too; their links are rewritten on write.
        body_images: dict[str, Path] = {}
        for ref in BODY_IMAGE_RE.findall(body):
            if re.match(r"(?i)(https?:|data:|/|#)", ref):
                continue
            cand = (md.parent / ref).resolve()
            if cand.is_file():
                body_images[ref] = cand
            else:
                problems.append(f"[{sid}] {md.relative_to(base)}: body image not found: {ref}")

        post = {
            "slug": slug,
            "title": meta["title"],
            "date": meta["date"],
            "category": meta.get("category") or "Notes",
            "tags": tags,
            "excerpt": meta.get("excerpt") or first_paragraph(body),
            "readTime": read_time(body),
            "author": {"name": AUTHOR},
            "image": None,  # set on write
            "source": sid,
            "_body": body.lstrip("\n"),
            "_image_src": image_src,
            "_body_images": body_images,
            "_origin": str(md),
        }
        if meta.get("drafted_with_ai") is True:
            post["drafted_with_ai"] = True  # the site shows an "AI-drafted" label
        posts.append(post)
    return posts


# ---------------------------------------------------------------- output
def write_post(p: dict, dry: bool) -> None:
    md_out = POSTS_DIR / f"{p['slug']}.md"
    if p["_image_src"]:
        img_out = IMG_DIR / f"{p['slug']}{p['_image_src'].suffix.lower()}"
        p["image"] = f"./assets/img/posts/{img_out.name}"
        if not dry:
            IMG_DIR.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(p["_image_src"], img_out)
    # Body images go to assets/img/posts/<slug>/, one folder per post, so --prune can remove them cleanly.
    body = p["_body"]
    for ref, src in p["_body_images"].items():
        if not dry:
            (IMG_DIR / p["slug"]).mkdir(parents=True, exist_ok=True)
            shutil.copyfile(src, IMG_DIR / p["slug"] / src.name)
        body = body.replace(f"]({ref}", f"](./assets/img/posts/{p['slug']}/{src.name}")
    if not dry:
        POSTS_DIR.mkdir(parents=True, exist_ok=True)
        md_out.write_text(body, encoding="utf-8")
        # A page opened from disk (file://) can't fetch() the .md, but it can load a script.
        (POSTS_DIR / f"{p['slug']}.js").write_text(
            f"(window.GOLD_LAYER_MD = window.GOLD_LAYER_MD || {{}})[{json.dumps(p['slug'])}] = "
            f"{json.dumps(body, ensure_ascii=False)};\n",
            encoding="utf-8")


def public_entry(p: dict) -> dict:
    e = {k: v for k, v in p.items() if not k.startswith("_")}
    if e.get("image") is None:
        e.pop("image", None)
    return e


def render_feed(posts: list[dict]) -> str:
    updated = (posts[0]["date"] if posts else datetime.now(timezone.utc).strftime("%Y-%m-%d")) + "T00:00:00Z"
    out = [
        '<?xml version="1.0" encoding="utf-8"?>',
        '<feed xmlns="http://www.w3.org/2005/Atom">',
        f"  <title>{escape(SITE_TITLE)}</title>",
        f"  <subtitle>{escape(SITE_SUBTITLE)}</subtitle>",
        f'  <link href="{SITE_URL}/feed.xml" rel="self" />',
        f'  <link href="{SITE_URL}/" />',
        f"  <updated>{updated}</updated>",
        f"  <id>{SITE_URL}/</id>",
        "  <author>",
        f"    <name>{escape(FEED_AUTHOR)}</name>",
        "  </author>",
        "",
    ]
    for p in posts:
        url = f"{SITE_URL}/post.html?slug={p['slug']}"
        out += [
            "  <entry>",
            f"    <title>{escape(p['title'])}</title>",
            f'    <link href="{url}" />',
            f"    <id>{url}</id>",
            f"    <updated>{p['date']}T00:00:00Z</updated>",
            f"    <summary>{escape(p.get('excerpt', ''))}</summary>",
            f'    <category term="{escape(p.get("category", ""), {chr(34): "&quot;"})}" />',
            "  </entry>",
            "",
        ]
    out.append("</feed>")
    return "\n".join(out) + "\n"


def render_sitemap(posts: list[dict]) -> str:
    out = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        "  <url>",
        f"    <loc>{SITE_URL}/</loc>",
        "    <changefreq>weekly</changefreq>",
        "    <priority>1.0</priority>",
        "  </url>",
    ]
    for p in posts:
        out += [
            "  <url>",
            f"    <loc>{SITE_URL}/post.html?slug={p['slug']}</loc>",
            f"    <lastmod>{p['date']}</lastmod>",
            "    <priority>0.8</priority>",
            "  </url>",
        ]
    out.append("</urlset>")
    return "\n".join(out) + "\n"


# ---------------------------------------------------------------- main
def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true", help="report what would change, write nothing")
    ap.add_argument("--only", metavar="ID", help="sync a single source id")
    ap.add_argument("--prune", action="store_true", help="remove sourced posts whose origin .md no longer exists")
    args = ap.parse_args()

    if not SOURCES_JSON.is_file():
        print(f"missing {SOURCES_JSON}", file=sys.stderr)
        return 2
    sources = json.loads(SOURCES_JSON.read_text(encoding="utf-8"))["sources"]
    if args.only:
        sources = [s for s in sources if s["id"] == args.only]
        if not sources:
            print(f"no source with id '{args.only}'", file=sys.stderr)
            return 2

    existing = json.loads(POSTS_JSON.read_text(encoding="utf-8"))["posts"] if POSTS_JSON.is_file() else []
    problems: list[str] = []
    incoming: list[dict] = []
    for s in sources:
        incoming += collect(s, problems)

    # slug collisions across sources
    seen: dict[str, str] = {}
    for p in incoming:
        if p["slug"] in seen and seen[p["slug"]] != p["source"]:
            problems.append(f"slug '{p['slug']}' claimed by both {seen[p['slug']]} and {p['source']}")
        seen[p["slug"]] = p["source"]

    touched_sources = {s["id"] for s in sources}
    incoming_slugs = {p["slug"] for p in incoming}

    kept: list[dict] = []
    removed: list[str] = []
    for e in existing:
        src = e.get("source")
        if src in touched_sources and e["slug"] in incoming_slugs:
            continue  # replaced by fresh copy
        if src in touched_sources and e["slug"] not in incoming_slugs and args.prune:
            removed.append(e["slug"])
            continue
        if src is None and e["slug"] in incoming_slugs:
            problems.append(f"slug '{e['slug']}' already exists as a hand-made post — sourced copy skipped")
            incoming = [p for p in incoming if p["slug"] != e["slug"]]
            continue
        kept.append(e)

    for p in incoming:
        write_post(p, args.dry_run)

    merged = kept + [public_entry(p) for p in incoming]
    merged.sort(key=lambda e: (e["date"], e["slug"]), reverse=True)

    if not args.dry_run:
        POSTS_JSON.write_text(json.dumps({"posts": merged}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        POSTS_JS.write_text("window.GOLD_LAYER_POSTS = " + json.dumps({"posts": merged}, ensure_ascii=False) + ";\n",
                            encoding="utf-8")
        (ROOT / "feed.xml").write_text(render_feed(merged), encoding="utf-8")
        (ROOT / "sitemap.xml").write_text(render_sitemap(merged), encoding="utf-8")
        if args.prune:
            for slug in removed:
                (POSTS_DIR / f"{slug}.md").unlink(missing_ok=True)
                (POSTS_DIR / f"{slug}.js").unlink(missing_ok=True)
                for img in IMG_DIR.glob(f"{slug}.*"):
                    img.unlink()
                shutil.rmtree(IMG_DIR / slug, ignore_errors=True)  # body images

    # report
    tag = "[dry-run] " if args.dry_run else ""
    for p in incoming:
        print(f"{tag}+ {p['source']:<14} {p['date']}  {p['slug']}")
    for slug in removed:
        print(f"{tag}- pruned        {slug}")
    print(f"{tag}{len(incoming)} synced, {len(kept)} kept, {len(removed)} pruned, {len(merged)} total")
    if problems:
        print("\nproblems:")
        for pr in problems:
            print("  ! " + pr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
