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
  const tocSectionEl = document.getElementById("postTocSection");
  const tocEl = document.getElementById("postToc");
  const progressWrapEl = document.querySelector(".reading-progress");
  const progressBarEl = document.getElementById("readingProgressBar");
  const postColumnEl = document.querySelector(".post-column");
  const topnavEl = document.querySelector(".topnav");

  const yearEl = document.getElementById("year");

  const fmt = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit" });

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
      return db - da; // newest first
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

  function normalizeText(s) {
    return String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function removeDuplicateLeadTitle(title) {
    if (!bodyEl) return;

    const firstH1 = bodyEl.querySelector("h1");
    if (!firstH1) return;

    if (normalizeText(firstH1.textContent) === normalizeText(title)) {
      firstH1.remove();
    }
  }

  function slugifyHeading(text) {
    const base = String(text || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    return base || "section";
  }

  function buildTocFromBody() {
    if (!tocSectionEl || !tocEl || !bodyEl) return false;

    const headings = Array.from(bodyEl.querySelectorAll("h2, h3"));
    if (!headings.length) {
      tocEl.innerHTML = "";
      tocSectionEl.hidden = true;
      return false;
    }

    const used = new Map();

    const items = headings.map((h) => {
      const raw = (h.textContent || "").trim();
      const base = slugifyHeading(raw);
      const count = (used.get(base) || 0) + 1;
      used.set(base, count);

      const id = count === 1 ? base : `${base}-${count}`;
      h.id = id;

      return {
        id,
        level: h.tagName === "H3" ? 3 : 2,
        text: raw || "Section"
      };
    });

    tocEl.innerHTML = items.map((item) => `
      <a class="post-toc-link post-toc-link--l${item.level}" href="#${item.id}" title="${escapeHtml(item.text)}">
        ${escapeHtml(item.text)}
      </a>
    `).join("");

    tocSectionEl.hidden = false;
    return true;
  }

  function getDocumentTop(el) {
    let top = 0;
    let node = el;
    while (node) {
      top += node.offsetTop || 0;
      node = node.offsetParent;
    }
    return top;
  }

  function syncLayoutMetrics() {
    const topnavHeight = topnavEl ? Math.round(topnavEl.getBoundingClientRect().height) : 64;
    document.documentElement.style.setProperty("--topnav-h", `${topnavHeight}px`);

    if (progressWrapEl && postColumnEl) {
      const rect = postColumnEl.getBoundingClientRect();
      progressWrapEl.style.left = `${Math.max(0, rect.left)}px`;
      progressWrapEl.style.width = `${Math.max(0, rect.width)}px`;
      progressWrapEl.style.right = "auto";
    }
  }

  function updateReadingProgress() {
    if (!progressBarEl || !bodyEl) return;

    const articleTop = getDocumentTop(bodyEl);
    const articleHeight = Math.max(bodyEl.scrollHeight, bodyEl.getBoundingClientRect().height);
    const viewportOffset = 120;
    const progress = (window.scrollY + viewportOffset - articleTop) / Math.max(1, articleHeight);
    const clamped = Math.max(0, Math.min(1, progress));

    progressBarEl.style.transform = `scaleX(${clamped})`;
  }

  function initReadingProgress() {
    if (!progressBarEl) return;

    syncLayoutMetrics();
    updateReadingProgress();
    window.addEventListener("load", syncLayoutMetrics);
    window.addEventListener("resize", syncLayoutMetrics);
    window.addEventListener("scroll", updateReadingProgress, { passive: true });
    window.addEventListener("resize", updateReadingProgress);

    if ("ResizeObserver" in window) {
      const ro = new ResizeObserver(() => {
        syncLayoutMetrics();
        updateReadingProgress();
      });
      if (postColumnEl) ro.observe(postColumnEl);
      if (topnavEl) ro.observe(topnavEl);
    }
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
    removeDuplicateLeadTitle(current.title || "");

    // Prev/Next: previous = newer, next = older (newest-first list)
    const idx = posts.findIndex(p => p.slug === current.slug);
    const prev = idx > 0 ? posts[idx - 1] : null;
    const next = idx < posts.length - 1 ? posts[idx + 1] : null;
    buildTocFromBody();
    initReadingProgress();

    const navCards = [];
    if (prev) navCards.push(navCard(prev, "← Previous", "prev"));
    if (next) navCards.push(navCard(next, "Next →", "next"));

    if (navCards.length) {
      navEl.innerHTML = navCards.join("");
      navSection.hidden = false;
    }

    // Ensure progress bar aligns after full layout settles.
    requestAnimationFrame(() => {
      syncLayoutMetrics();
      updateReadingProgress();
    });

    // If loaded with a hash, re-run anchor positioning after metrics are synced.
    if (window.location.hash) {
      requestAnimationFrame(() => {
        const id = decodeURIComponent(window.location.hash.slice(1));
        const target = id ? document.getElementById(id) : null;
        if (target) target.scrollIntoView({ block: "start" });
      });
    }
  }

  init().catch((e) => {
    console.error(e);
    titleEl.textContent = "Could not load post";
    showError("Please check the slug and that the Markdown file exists under content/posts/.");
  });
})();
