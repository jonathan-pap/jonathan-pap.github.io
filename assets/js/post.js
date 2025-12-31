(function () {
  const titleEl = document.getElementById("postTitle");
  const dateEl = document.getElementById("postDate");
  const catEl = document.getElementById("postCategory");
  const tagsEl = document.getElementById("postTags");
  const bodyEl = document.getElementById("postBody");

  const errWrap = document.getElementById("postError");
  const errMsg = document.getElementById("postErrorMsg");

  const navSection = document.getElementById("postNavSection");
  const navEl = document.getElementById("postNav");

  const relatedSection = document.getElementById("relatedSection");
  const relatedEl = document.getElementById("relatedPosts");

  const yearEl = document.getElementById("year");

  const fmt = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit" });

  function normalize(s) { return String(s || "").toLowerCase().trim(); }
  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getSlug() {
    const url = new URL(window.location.href);
    return url.searchParams.get("slug") || "";
  }

  function mdPathForPost(p) {
    return p.file || p.path || `./content/posts/${p.slug}.md`;
  }

  function showError(message) {
    errWrap.hidden = false;
    errMsg.textContent = message || "An error occurred.";
  }

  function setMeta(p) {
    document.title = `${p.title || "Post"} • TechBlog`;

    titleEl.textContent = p.title || "Untitled";

    const dt = p.date ? fmt.format(new Date(p.date)) : "";
    dateEl.textContent = dt;

    catEl.innerHTML = p.category ? `<span class="tagpill">${escapeHtml(p.category)}</span>` : "";

    const tags = (p.tags || []).map(t => `<span class="tagpill">#${escapeHtml(t)}</span>`).join(" ");
    tagsEl.innerHTML = tags || "";
  }

  function sortedPosts(posts) {
    return posts.slice().sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });
  }

  function navCard(post, label, dir) {
    const dt = post.date ? fmt.format(new Date(post.date)) : "";
    const cat = post.category || "Article";
    return `
      <a class="navcard ${dir}" href="./post.html?slug=${encodeURIComponent(post.slug)}">
        <div class="navcard-top">
          <div class="navcard-label">${escapeHtml(label)}</div>
          <div class="navcard-pill">${escapeHtml(cat)}</div>
        </div>
        <div class="navcard-title">${escapeHtml(post.title || "Untitled")}</div>
        <div class="navcard-meta">${escapeHtml(dt)}</div>
      </a>
    `;
  }

  function relatedCard(post) {
    const dt = post.date ? fmt.format(new Date(post.date)) : "";
    const cat = post.category || "Article";
    const tags = (post.tags || []).slice(0, 3).map(t => `#${t}`).join("  ");
    return `
      <a class="relcard" href="./post.html?slug=${encodeURIComponent(post.slug)}">
        <div class="relcard-media" aria-hidden="true"></div>
        <div class="relcard-body">
          <div class="relcard-pill">${escapeHtml(cat)}</div>
          <div class="relcard-title">${escapeHtml(post.title || "Untitled")}</div>
          <div class="relcard-excerpt">${escapeHtml(post.excerpt || "")}</div>
          <div class="relcard-foot">
            <span class="relcard-tags">${escapeHtml(tags)}</span>
            <span class="relcard-date">${escapeHtml(dt)}</span>
          </div>
        </div>
      </a>
    `;
  }

  function scoreRelated(current, candidate) {
    if (!candidate || candidate.slug === current.slug) return -1;

    const cTags = (current.tags || []).map(normalize);
    const xTags = (candidate.tags || []).map(normalize);

    let shared = 0;
    if (cTags.length && xTags.length) {
      const set = new Set(cTags);
      for (const t of xTags) if (set.has(t)) shared += 1;
    }

    const catMatch = normalize(candidate.category) && normalize(candidate.category) === normalize(current.category) ? 1 : 0;
    return (shared * 10) + (catMatch * 3);
  }

  async function init() {
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    const slug = getSlug();
    if (!slug) {
      showError("Missing ?slug= parameter in the URL.");
      titleEl.textContent = "Post not found";
      return;
    }

    const res = await fetch("./content/posts.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`posts.json fetch failed: ${res.status}`);

    const data = await res.json();
    const posts = sortedPosts(data.posts || []);

    const current = posts.find(p => p.slug === slug);
    if (!current) {
      showError(`No post found for slug "${slug}".`);
      titleEl.textContent = "Post not found";
      return;
    }

    setMeta(current);

    const mdRes = await fetch(mdPathForPost(current), { cache: "no-store" });
    if (!mdRes.ok) throw new Error(`Markdown fetch failed: ${mdRes.status}`);
    const md = await mdRes.text();

    bodyEl.innerHTML = window.marked ? window.marked.parse(md) : `<pre>${escapeHtml(md)}</pre>`;

    // Prev/Next: previous = newer, next = older (because list is newest first)
    const idx = posts.findIndex(p => p.slug === current.slug);
    const prev = idx > 0 ? posts[idx - 1] : null;
    const next = idx < posts.length - 1 ? posts[idx + 1] : null;

    const navCards = [];
    if (prev) navCards.push(navCard(prev, "← Previous", "prev"));
    if (next) navCards.push(navCard(next, "Next →", "next"));

    if (navCards.length) {
      navEl.innerHTML = navCards.join("");
      navSection.hidden = false;
    }

    // Related
    const scored = posts
      .filter(p => p.slug !== current.slug)
      .map(p => ({ p, s: scoreRelated(current, p) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s);

    const related = scored.slice(0, 3).map(x => x.p);

    // Top up with newest posts if not enough matches
    if (related.length < 3) {
      const used = new Set(related.map(p => p.slug));
      for (const p of posts) {
        if (p.slug === current.slug) continue;
        if (used.has(p.slug)) continue;
        related.push(p);
        used.add(p.slug);
        if (related.length === 3) break;
      }
    }

    if (related.length) {
      relatedEl.innerHTML = related.map(relatedCard).join("");
      relatedSection.hidden = false;
    }
  }

  init().catch((e) => {
    console.error(e);
    titleEl.textContent = "Could not load post";
    showError("Please check the slug and that the Markdown file exists under content/posts/.");
  });
})();
