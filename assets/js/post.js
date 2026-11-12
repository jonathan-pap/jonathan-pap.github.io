/* Post page: renders content/posts/<slug>.md with marked, highlights DAX,
   and builds the contents list, reading progress and newer/older links.
   Needs app.js (window.SiteBlog) and, for DAX, dist/dax-highlight. */
(function () {
  "use strict";

  const { loadPosts, loadMarkdown, loadShorts, shortUrl, shortDuration, shortFrameHtml, wireShortFrames, openShortPlayer,
    formatDate, escapeHtml, postUrl, tagUrl, OPENED_FROM_DISK, FROM_DISK_HELP } = window.SiteBlog;
  const SITE_URL = "https://goldlayerdata.com/";
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

  // ---- diagrams: ```mermaid fences become brand-styled SVG diagrams ----
  // Mermaid only loads on posts that have a diagram. If it fails, the fence stays a plain code block.

  const MERMAID_URL = "https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs";
  const MERMAID_THEME = {
    theme: "base",
    themeVariables: {
      darkMode: true,
      background: "#0A1328",
      fontFamily: "Figtree, system-ui, sans-serif",
      fontSize: "14px",
      primaryColor: "#1B3466",
      primaryTextColor: "#E8ECF5",
      primaryBorderColor: "#3A5AA0",
      secondaryColor: "#132654",
      tertiaryColor: "#0D1A3C",
      lineColor: "#8A9BC4",
      textColor: "#E8ECF5",
      clusterBkg: "#0B1631",
      clusterBorder: "#22335F",
      titleColor: "#A3AEC8",
      edgeLabelBackground: "#0A1328",
      nodeTextColor: "#E8ECF5",
      attributeBackgroundColorOdd: "#132654",
      attributeBackgroundColorEven: "#10204A",
    },
    flowchart: { curve: "basis", padding: 10, nodeSpacing: 26, rankSpacing: 34, htmlLabels: true, wrappingWidth: 260 },
  };

  async function renderDiagrams() {
    const fences = Array.from(bodyEl.querySelectorAll("pre > code.language-mermaid"));
    if (!fences.length) return;
    const figs = fences.map((code) => {
      const fig = document.createElement("figure");
      fig.className = "diagram";
      const src = document.createElement("pre");
      src.className = "mermaid";
      src.textContent = code.textContent;
      fig.appendChild(src);
      code.parentElement.replaceWith(fig);
      return { fig, src: code.textContent };
    });
    let mermaid;
    try {
      ({ default: mermaid } = await import(MERMAID_URL));
      mermaid.initialize(Object.assign({ startOnLoad: false, securityLevel: "strict" }, MERMAID_THEME));
    } catch (err) {
      console.error(err);
      mermaid = null;
    }
    // one at a time, each with its own id (rendering them together can mix up their contents)
    const failed = [];
    for (let i = 0; i < figs.length; i++) {
      const f = figs[i];
      try {
        if (!mermaid) throw new Error("mermaid did not load");
        const { svg } = await mermaid.render("gl-diagram-" + i, f.src);
        f.fig.innerHTML = svg;
      } catch (err) {
        console.error(err);
        failed.push(f);
      }
    }
    if (failed.length) {
      failed.forEach(({ fig, src }) => {  // fall back to the source, as a normal code block
        const pre = document.createElement("pre");
        const code = document.createElement("code");
        code.className = "language-mermaid";
        code.textContent = src;
        pre.appendChild(code);
        fig.replaceWith(pre);
      });
      enhanceCodeBlocks();
    }
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
      if (!code || pre.parentElement.classList.contains("code-block")) return;  // already enhanced
      const lang = (/\blang(?:uage)?-([\w#+-]+)/.exec(code.className) || [])[1] || "";
      const block = document.createElement("div");
      block.className = "code-block";
      block.innerHTML = `
        <div class="code-bar">
          <span class="code-lang${lang.toLowerCase() === "dax" ? " code-lang--dax" : ""}">${escapeHtml(lang)}</span>
          <button type="button" class="code-copy">Copy<span class="sr-only"> code</span></button>
        </div>`;
      if (lang.toLowerCase() === "diff") {  // colour added and removed lines, as a pull request does
        const lines = code.textContent.replace(/\n$/, "").split("\n");
        code.innerHTML = lines.map((l) => {
          const cls = l.startsWith("+") ? "d-add" : l.startsWith("-") ? "d-del" : "d-ctx";
          return `<span class="${cls}">${escapeHtml(l) || " "}</span>`;
        }).join("\n");
      }
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

  // The short behind an article: a small card at the end. Clicking it plays the short, on YouTube in place
  // (a 9:16 player, at most 80% of the screen tall), or in our own player while it isn't on YouTube yet.
  // Once it is, the card also links to it on YouTube (the embed doesn't always show like/subscribe).
  async function insertShort(slug) {
    const list = (await loadShorts()).filter((s) => s.post === slug);
    list.forEach((short) => bodyEl.appendChild(shortCard(short, list.length)));
  }

  // One small card per short at the end of the article. A single short is "the N-second version" of the post;
  // with several, each card says "Short" and its length.
  function shortCard(short, count) {
    const poster = `./assets/shorts/posters/${encodeURIComponent(short.file)}.jpg`;
    const card = document.createElement("aside");

    function play() {
      if (window.SiteBlog.ytActive(short)) {
        const player = document.createElement("div");
        player.className = "post-short-player";
        player.innerHTML = window.SiteBlog.ytIframeHtml(short);
        card.replaceWith(player);
      } else {
        openShortPlayer([short], 0, card);
      }
    }

    const yt = window.SiteBlog.ytActive(short)
      ? `<a href="${window.SiteBlog.ytWatchUrl(short)}" rel="noopener">Watch on YouTube ↗</a> · ` : "";
    const kicker = count === 1 ? `The ${Math.round(short.duration || 0)}-second version` : `Short · ${shortDuration(short)}`;
    card.className = "post-short-end";
    card.setAttribute("aria-label", "Short: " + short.title);
    card.innerHTML = `
      <button type="button" class="post-short-end-thumb" aria-label="Play the short: ${escapeHtml(short.title)}">
        <img src="${poster}" alt="" width="90" height="160" loading="lazy"><span aria-hidden="true">▶</span>
      </button>
      <div>
        <p class="post-short-kicker">${kicker}</p>
        <p class="post-short-end-title">${escapeHtml(short.title)}</p>
        <p class="post-short-end-links">${yt}<a href="./shorts.html#short-${encodeURIComponent(short.id)}">All shorts →</a></p>
      </div>`;
    card.querySelector(".post-short-end-thumb").addEventListener("click", play);
    return card;
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
    const diagrams = renderDiagrams();  // before the code blocks, so mermaid fences don't get a Copy bar
    enhanceCodeBlocks();
    diagrams.catch((err) => console.error(err));
    buildToc();
    initReadingProgress();
    insertShort(current.slug).catch((err) => console.error(err));  // the article stands without it

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
