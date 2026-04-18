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

  // DAX syntax highlighting is delegated to the standalone package at
  // dist/dax-highlight/. Loaded via <script> in post.html — available as
  // window.DaxHighlight. If the script is missing (offline, blocked), we
  // silently degrade to plain <pre><code> rendering.
  function highlightDaxBlocks() {
    if (!bodyEl || typeof window.DaxHighlight === "undefined") return;
    window.DaxHighlight.highlightAll(bodyEl);
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

  function showSkeleton() {
    if (!bodyEl) return;
    bodyEl.innerHTML = `
      <div class="post-skeleton" aria-hidden="true">
        <div class="post-skeleton-line post-skeleton-line--wide"></div>
        <div class="post-skeleton-line post-skeleton-line--med"></div>
        <div class="post-skeleton-line post-skeleton-line--wide"></div>
        <div class="post-skeleton-line post-skeleton-line--short"></div>
        <div class="post-skeleton-gap"></div>
        <div class="post-skeleton-line post-skeleton-line--wide"></div>
        <div class="post-skeleton-line post-skeleton-line--med"></div>
        <div class="post-skeleton-line post-skeleton-line--wide"></div>
      </div>
    `;
  }

  function setMeta(p) {
    const title = p.title || "Untitled";
    const desc = (p.excerpt || `${title} — an article on BluPulse.`).slice(0, 300);
    const canonicalBase = "https://jonathan-pap.github.io/post.html";
    const canonicalUrl = `${canonicalBase}?slug=${encodeURIComponent(p.slug || "")}`;
    const ogImage = p.image
      ? new URL(p.image, "https://jonathan-pap.github.io/").href
      : "https://jonathan-pap.github.io/favicon.svg";

    document.title = `${title} · BluPulse`;

    // Update SEO / social meta tags dynamically.
    const setAttr = (id, attr, value) => {
      const el = document.getElementById(id);
      if (el) el.setAttribute(attr, value);
    };
    setAttr("metaDescription", "content", desc);
    setAttr("metaCanonical", "href", canonicalUrl);
    setAttr("metaOgTitle", "content", `${title} · BluPulse`);
    setAttr("metaOgDesc", "content", desc);
    setAttr("metaOgUrl", "content", canonicalUrl);
    setAttr("metaOgImage", "content", ogImage);

    titleEl.textContent = title;

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
      <a class="post-toc-link post-toc-link--l${item.level}" href="#${item.id}" title="${escapeHtml(item.text)}" data-toc-target="${item.id}">
        ${escapeHtml(item.text)}
      </a>
    `).join("");

    tocSectionEl.hidden = false;
    initTocActiveHighlight(items.map(i => i.id));
    return true;
  }

  // Highlight the nearest heading as the user scrolls.
  function initTocActiveHighlight(ids) {
    if (!ids.length || !("IntersectionObserver" in window)) return;

    const linkFor = new Map();
    tocEl.querySelectorAll("[data-toc-target]").forEach(a => {
      linkFor.set(a.getAttribute("data-toc-target"), a);
    });

    const visible = new Set();

    const setActive = (id) => {
      tocEl.querySelectorAll(".post-toc-link--active")
        .forEach(a => a.classList.remove("post-toc-link--active"));
      if (!id) return;
      const el = linkFor.get(id);
      if (el) el.classList.add("post-toc-link--active");
    };

    const pickActive = () => {
      if (!visible.size) return;
      // Pick whichever visible heading appears first in document order.
      const firstId = ids.find(id => visible.has(id));
      setActive(firstId);
    };

    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const id = entry.target.id;
        if (entry.isIntersecting) visible.add(id);
        else visible.delete(id);
      }
      pickActive();
    }, {
      rootMargin: "-20% 0px -65% 0px",
      threshold: 0,
    });

    ids.forEach(id => {
      const heading = document.getElementById(id);
      if (heading) io.observe(heading);
    });
  }

  // Cached layout metrics — invalidated on resize and by ResizeObserver.
  let cachedArticleTop = 0;
  let cachedArticleHeight = 0;

  function measureArticle() {
    if (!bodyEl) return;
    let top = 0;
    let node = bodyEl;
    while (node) {
      top += node.offsetTop || 0;
      node = node.offsetParent;
    }
    cachedArticleTop = top;
    cachedArticleHeight = Math.max(bodyEl.scrollHeight, bodyEl.getBoundingClientRect().height);
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

    measureArticle();
  }

  function updateReadingProgress() {
    if (!progressBarEl || !bodyEl) return;

    const viewportOffset = 120;
    const progress = (window.scrollY + viewportOffset - cachedArticleTop) / Math.max(1, cachedArticleHeight);
    const clamped = Math.max(0, Math.min(1, progress));

    progressBarEl.style.transform = `scaleX(${clamped})`;
  }

  // rAF-gated scroll handler: reads are cached, only writes happen per frame.
  let rafScheduled = false;
  function onScrollRaf() {
    if (rafScheduled) return;
    rafScheduled = true;
    requestAnimationFrame(() => {
      rafScheduled = false;
      updateReadingProgress();
    });
  }

  function initReadingProgress() {
    if (!progressBarEl) return;

    syncLayoutMetrics();
    updateReadingProgress();

    window.addEventListener("load", syncLayoutMetrics);
    window.addEventListener("resize", syncLayoutMetrics);
    window.addEventListener("scroll", onScrollRaf, { passive: true });

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

    const res = await fetch("./content/posts.json");
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
    showSkeleton();

    const mdRes = await fetch(mdPathForPost(current));
    if (!mdRes.ok) throw new Error(`Markdown fetch failed: ${mdRes.status}`);
    const md = await mdRes.text();

    bodyEl.innerHTML = window.marked ? window.marked.parse(md) : `<pre>${escapeHtml(md)}</pre>`;
    removeDuplicateLeadTitle(current.title || "");
    highlightDaxBlocks();

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


