/* Post page: renders content/posts/<slug>.md with marked, highlights DAX,
   and builds the contents list, reading progress and newer/older links.
   Needs app.js (window.SiteBlog) and, for DAX, dist/dax-highlight. */
(function () {
  "use strict";

  const { loadPosts, loadMarkdown, formatDate, escapeHtml, postUrl, tagUrl, OPENED_FROM_DISK, FROM_DISK_HELP } = window.SiteBlog;
  const SITE_URL = "https://jonathan-pap.github.io/";
  const SITE_NAME = "Gold Layer";

  const titleEl = document.getElementById("postTitle");
  const metaEl = document.getElementById("postMeta");
  const tagsEl = document.getElementById("postTags");
  const aiNoteEl = document.getElementById("aiNote");
  const bodyEl = document.getElementById("postBody");
  const errorEl = document.getElementById("postError");
  const errorMsgEl = document.getElementById("postErrorMsg");
  const navSectionEl = document.getElementById("postNavSection");
  const navEl = document.getElementById("postNav");
  const tocSectionEl = document.getElementById("postTocSection");
  const tocEl = document.getElementById("postToc");
  const progressBarEl = document.getElementById("readingProgressBar");

  function showError(title, message) {
    document.title = `${title} · ${SITE_NAME}`;
    titleEl.textContent = title;
    bodyEl.innerHTML = "";
    if (OPENED_FROM_DISK) errorMsgEl.innerHTML = FROM_DISK_HELP;
    else errorMsgEl.textContent = message;
    errorEl.hidden = false;
  }

  function showSkeleton() {
    bodyEl.innerHTML = `
      <div class="post-skeleton" aria-hidden="true">
        <span></span><span></span><span></span><span></span><span class="gap"></span>
        <span></span><span></span><span></span><span></span>
      </div>`;
  }

  function setMeta(p) {
    const title = p.title || "Untitled";
    const desc = (p.excerpt || `${title}: an article on ${SITE_NAME}.`).slice(0, 300);
    const url = `${SITE_URL}post.html?slug=${encodeURIComponent(p.slug || "")}`;
    const image = new URL(p.image || "favicon.svg", SITE_URL).href;

    document.title = `${title} · ${SITE_NAME}`;
    const setAttr = (id, attr, value) => {
      const el = document.getElementById(id);
      if (el) el.setAttribute(attr, value);
    };
    setAttr("metaDescription", "content", desc);
    setAttr("metaCanonical", "href", url);
    setAttr("metaOgTitle", "content", title);
    setAttr("metaOgDesc", "content", desc);
    setAttr("metaOgUrl", "content", url);
    setAttr("metaOgImage", "content", image);

    titleEl.textContent = title;
    metaEl.innerHTML = [
      `<span class="cat">${escapeHtml(p.category || "Notes")}</span>`,
      p._dt ? `<time datetime="${escapeHtml(p.date)}">${formatDate(p._dt)}</time>` : "",
      typeof p.readTime === "number" ? `<span>${p.readTime} min read</span>` : "",
    ].join("");
    tagsEl.innerHTML = (p.tags || []).map((t) =>
      `<a href="${escapeHtml(tagUrl(t))}">#${escapeHtml(t)}</a>`).join("");
    aiNoteEl.hidden = !p.drafted_with_ai;
  }

  // Posts often repeat the title as a leading "# Title"; the page header already shows it.
  function removeDuplicateLeadTitle(title) {
    const first = bodyEl.firstElementChild;
    const norm = (s) => String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
    if (first && first.tagName === "H1" && norm(first.textContent) === norm(title)) first.remove();
  }

  // ---- code blocks: DAX highlighting, a language label and a copy button ----

  function enhanceCodeBlocks() {
    // dist/dax-highlight colours every ```dax fence (<pre><code class="language-dax">).
    // If the script didn't load, the code still shows, just uncoloured.
    if (window.DaxHighlight) {
      // Words the bundled list predates: visual calculation and window functions, and DAX query keywords.
      window.DaxHighlight.addFunctions([
        "RUNNINGSUM", "MOVINGAVERAGE", "PREVIOUS", "NEXT", "FIRST", "LAST", "RANGE",
        "COLLAPSE", "COLLAPSEALL", "EXPAND", "EXPANDALL", "LOOKUP", "LOOKUPWITHTOTALS", "ISATLEVEL",
        "ORDERBY", "PARTITIONBY", "MATCHBY", "OFFSET", "INDEX", "WINDOW", "RANK", "ROWNUMBER",
      ]);
      window.DaxHighlight.addKeywords(["ASC", "DESC", "DEFINE", "EVALUATE", "MEASURE", "ORDER", "BY"]);
      window.DaxHighlight.highlightAll(bodyEl);
    }

    bodyEl.querySelectorAll("pre").forEach((pre) => {
      const code = pre.querySelector("code");
      if (!code) return;
      const lang = (/\blang(?:uage)?-([\w#+-]+)/.exec(code.className) || [])[1] || "";
      const block = document.createElement("div");
      block.className = "code-block";
      block.innerHTML = `
        <div class="code-bar">
          <span class="code-lang${lang.toLowerCase() === "dax" ? " code-lang--dax" : ""}">${escapeHtml(lang)}</span>
          <button type="button" class="code-copy">Copy<span class="sr-only"> code</span></button>
        </div>`;
      pre.tabIndex = 0;  // lets keyboard users scroll wide code
      pre.replaceWith(block);
      block.appendChild(pre);
    });
  }

  function flash(btn, text) {
    btn.textContent = text;
    btn.classList.add("is-done");
    clearTimeout(btn._timer);
    btn._timer = setTimeout(() => {
      btn.innerHTML = `Copy<span class="sr-only"> code</span>`;
      btn.classList.remove("is-done");
    }, 1600);
  }

  bodyEl.addEventListener("click", async (e) => {
    const btn = e.target.closest(".code-copy");
    if (!btn) return;
    const code = btn.closest(".code-block").querySelector("code");
    try {
      await navigator.clipboard.writeText(code.textContent);
      flash(btn, "Copied");
    } catch {
      const range = document.createRange();
      range.selectNodeContents(code);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      flash(btn, "Press Ctrl+C");
    }
  });

  // ---- contents list ----

  function slugifyHeading(text) {
    const base = String(text || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return base || "section";
  }

  function buildToc() {
    const headings = Array.from(bodyEl.querySelectorAll("h2, h3"));
    if (headings.length < 2) return;

    const used = new Map();
    const items = headings.map((h) => {
      const text = (h.textContent || "").trim() || "Section";
      const base = slugifyHeading(text);
      const n = (used.get(base) || 0) + 1;
      used.set(base, n);
      h.id = n === 1 ? base : `${base}-${n}`;
      return { id: h.id, level: h.tagName === "H3" ? 3 : 2, text };
    });

    tocEl.innerHTML = items.map((item) => `
      <a class="post-toc-link post-toc-link--l${item.level}" href="#${item.id}" data-toc-target="${item.id}">${escapeHtml(item.text)}</a>`).join("");
    tocSectionEl.hidden = false;
    highlightTocOnScroll(items.map((i) => i.id));
  }

  // The current section is the last heading that has scrolled past 30% of the screen.
  function highlightTocOnScroll(ids) {
    const headings = ids.map((id) => document.getElementById(id));
    const links = Array.from(tocEl.querySelectorAll("[data-toc-target]"));
    let current = -1;
    let queued = false;

    function update() {
      queued = false;
      const line = window.innerHeight * 0.3;
      let idx = 0;
      headings.forEach((h, i) => { if (h.getBoundingClientRect().top <= line) idx = i; });
      if (idx === current) return;
      current = idx;
      links.forEach((a, i) => {
        a.classList.toggle("post-toc-link--active", i === idx);
        if (i === idx) a.setAttribute("aria-current", "location");
        else a.removeAttribute("aria-current");
      });
    }
    function queue() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    }

    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    update();
  }

  // ---- reading progress: 0 at the top of the article, 1 when its end reaches the bottom of the screen ----

  function initReadingProgress() {
    if (!progressBarEl) return;
    let queued = false;

    function update() {
      queued = false;
      const topbar = document.querySelector(".topbar");
      const offset = topbar ? topbar.offsetHeight : 64;
      const rect = bodyEl.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight + offset;
      const progress = scrollable <= 0 ? 1 : (offset - rect.top) / scrollable;
      progressBarEl.style.transform = `scaleX(${Math.min(1, Math.max(0, progress))})`;
    }
    function queue() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    }

    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    window.addEventListener("load", queue);
    update();
  }

  // ---- newer / older ----

  function navCard(p, label, dir) {
    const meta = [escapeHtml(p.category || "Notes"), formatDate(p._dt)].filter(Boolean).join(" · ");
    return `
      <a class="navcard navcard--${dir}" href="${postUrl(p)}">
        <span class="navcard-label">${label}</span>
        <span class="navcard-title">${escapeHtml(p.title || "Untitled")}</span>
        <span class="navcard-meta">${meta}</span>
      </a>`;
  }

  async function init() {
    const slug = new URL(window.location.href).searchParams.get("slug") || "";
    if (!slug) {
      showError("Post not found", "This link is missing the ?slug= part that names the article.");
      return;
    }

    const posts = await loadPosts();  // newest first
    const idx = posts.findIndex((p) => p.slug === slug);
    if (idx === -1) {
      showError("Post not found", `There's no article called "${slug}". It may have been renamed.`);
      return;
    }
    const current = posts[idx];

    setMeta(current);
    showSkeleton();

    const md = await loadMarkdown(current);

    bodyEl.innerHTML = window.marked ? window.marked.parse(md) : `<pre>${escapeHtml(md)}</pre>`;
    removeDuplicateLeadTitle(current.title || "");
    enhanceCodeBlocks();
    buildToc();
    initReadingProgress();

    const newer = idx > 0 ? posts[idx - 1] : null;
    const older = idx < posts.length - 1 ? posts[idx + 1] : null;
    const cards = [];
    if (newer) cards.push(navCard(newer, "← Newer", "newer"));
    if (older) cards.push(navCard(older, "Older →", "older"));
    if (cards.length) {
      navEl.innerHTML = cards.join("");
      navSectionEl.hidden = false;
    }

    // The article wasn't there when the browser tried to jump to #heading, so jump now:
    // instantly (the page sets smooth scrolling) and once web fonts have settled the layout.
    if (window.location.hash) {
      const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
      if (target) {
        const jump = () => target.scrollIntoView({ block: "start", behavior: "instant" });
        (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(jump));
      }
    }
  }

  init().catch((err) => {
    console.error(err);
    showError("Could not load post", "The article file didn't load. Check that it exists under content/posts/.");
  });
})();
