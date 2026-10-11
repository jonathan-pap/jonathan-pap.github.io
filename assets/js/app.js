/* Shared blog script for the home page and post pages. From content/posts.json it
   fills the sidebar's topic list (#topicNav) and archive (#archiveNav), and on the
   home page it runs the article list (#blogApp). Also exposes window.SiteBlog for post.js. */
(function () {
  "use strict";

  // The site root, worked out from this script's own address, so links resolve
  // the same from any page.
  const ROOT = new URL("../../", document.currentScript.src);
  const siteUrl = (path) => new URL(path, ROOT).href;
  const HOME = siteUrl("index.html");
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const PAGE_STEP = 10;

  const page = document.body.dataset.page || "";
  const topbarEl = document.querySelector(".topbar");
  const topicNavEl = document.getElementById("topicNav");
  const archiveNavEl = document.getElementById("archiveNav");

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Sticky offsets (reading progress, sidebar, anchor jumps) follow the real bar height.
  function syncTopbarHeight() {
    if (topbarEl) document.documentElement.style.setProperty("--topbar-h", `${topbarEl.offsetHeight}px`);
  }
  syncTopbarHeight();
  window.addEventListener("resize", syncTopbarHeight);

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // "2026-05-05" read as a calendar date. new Date("2026-05-05") is UTC midnight,
  // which shows as the previous day for readers west of Greenwich.
  function parseDate(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || "");
    if (!m) return null;
    const y = Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3]);
    return { y, m: mo, d, t: Date.UTC(y, mo, d) };
  }

  function formatDate(dt) {
    return dt ? `${dt.d} ${MONTHS[dt.m]} ${dt.y}` : "";
  }

  const postUrl = (p) => siteUrl(`post.html?slug=${encodeURIComponent(p.slug)}`);
  const topicUrl = (cat) => (cat ? `${HOME}?category=${encodeURIComponent(cat)}` : HOME);
  const tagUrl = (tag) => `${HOME}?tag=${encodeURIComponent(tag)}`;

  let postsPromise = null;
  function loadPosts() {
    if (!postsPromise) {
      postsPromise = fetch(siteUrl("content/posts.json"))
        .then((res) => {
          if (!res.ok) throw new Error(`posts.json fetch failed: ${res.status}`);
          return res.json();
        })
        .then((data) => (data.posts || [])
          .map((p) => ({ ...p, _dt: parseDate(p.date) }))
          .sort((a, b) => (b._dt?.t || 0) - (a._dt?.t || 0)));
    }
    return postsPromise;
  }

  // Opened straight from disk (file://), the browser won't let the page read
  // content/posts.json or the post files, so say so instead of a vague error.
  const OPENED_FROM_DISK = location.protocol === "file:";
  const FROM_DISK_HELP = "This page was opened straight from disk, and browsers block it from reading the post files. "
    + "To preview the site, run <code>python -m http.server 8000</code> in the site folder and open "
    + "<code>http://localhost:8000</code>. On GitHub Pages it works as is.";

  function countBy(values) {
    const map = new Map();
    for (const v of values) map.set(v, (map.get(v) || 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }

  // ---------------------------------------------------------------- sidebar

  // "All articles" plus one link per category, busiest first.
  // `active` is the category to mark ("" for All, null for none).
  function renderTopics(posts, active, current = "page") {
    if (!topicNavEl) return;
    const cats = countBy(posts.map((p) => p.category || "Notes"));
    topicNavEl.innerHTML = [["", posts.length], ...cats].map(([cat, n]) => `
      <li><a href="${escapeHtml(topicUrl(cat))}" data-topic="${escapeHtml(cat)}"${active === cat ? ` aria-current="${current}"` : ""}>
        <span>${escapeHtml(cat || "All articles")}</span><span class="side-count">${n}</span>
      </a></li>`).join("");
  }

  // Every post by year and month, newest first. The latest year is open,
  // and so is the year of the post being read.
  function renderArchive(posts, currentSlug) {
    if (!archiveNavEl) return;
    const years = new Map();
    for (const p of posts) {
      if (!p._dt) continue;
      if (!years.has(p._dt.y)) years.set(p._dt.y, new Map());
      const months = years.get(p._dt.y);
      if (!months.has(p._dt.m)) months.set(p._dt.m, []);
      months.get(p._dt.m).push(p);
    }
    const currentYear = posts.find((p) => p.slug === currentSlug)?._dt?.y;

    archiveNavEl.innerHTML = Array.from(years, ([year, months], i) => {
      const count = Array.from(months.values()).reduce((n, list) => n + list.length, 0);
      const open = i === 0 || year === currentYear;
      return `
        <details${open ? " open" : ""}>
          <summary>${year}<span class="side-count">${count}</span></summary>
          ${Array.from(months, ([m, list]) => `
            <div class="archive-month">${MONTHS[m]}</div>
            <ul class="side-list">${list.map((p) => `
              <li><a href="${escapeHtml(postUrl(p))}"${p.slug === currentSlug ? ' aria-current="page"' : ""}>${escapeHtml(p.title || "Untitled")}</a></li>`).join("")}
            </ul>`).join("")}
        </details>`;
    }).join("");
  }

  // ---------------------------------------------------------------- article list items

  // One entry: DATE · TOPIC · READ TIME, the title, a short summary and the tags.
  // The newest post leads, a size up, with a longer summary.
  function itemHtml(p, lead = false) {
    const meta = [
      lead ? `<span class="flag">Latest</span>` : "",
      p._dt ? `<time datetime="${escapeHtml(p.date)}">${formatDate(p._dt)}</time>` : "",
      `<span class="cat">${escapeHtml(p.category || "Notes")}</span>`,
      typeof p.readTime === "number" ? `<span>${p.readTime} min read</span>` : "",
      p.drafted_with_ai ? `<span class="ai" title="Drafted with AI, reviewed by the author">AI-drafted</span>` : "",
    ].join("");
    const tags = (p.tags || []).map((t) => `#${t}`).join("  ");

    return `
      <article class="post-item${lead ? " post-item--lead" : ""}">
        <div class="post-meta">${meta}</div>
        <h3 class="post-item-title"><a href="${escapeHtml(postUrl(p))}">${escapeHtml(p.title || "Untitled")}</a></h3>
        ${p.excerpt ? `<p class="post-item-excerpt">${escapeHtml(p.excerpt)}</p>` : ""}
        ${tags || lead ? `<div class="post-item-foot">
          ${tags ? `<span class="post-item-tags">${escapeHtml(tags)}</span>` : ""}
          ${lead ? `<span class="read-more" aria-hidden="true">Read the article →</span>` : ""}
        </div>` : ""}
      </article>`;
  }

  window.SiteBlog = { loadPosts, parseDate, formatDate, escapeHtml, postUrl, tagUrl, siteUrl, OPENED_FROM_DISK, FROM_DISK_HELP };

  // ---------------------------------------------------------------- home: the article list

  function initBlog(root) {
    const searchForm = document.getElementById("searchForm");
    const searchInput = document.getElementById("searchInput");
    const countEl = document.getElementById("resultsCount");
    const clearBtn = document.getElementById("clearFilters");
    const listEl = document.getElementById("postList");
    const moreWrap = document.getElementById("loadMoreWrap");
    const moreBtn = document.getElementById("loadMoreBtn");

    const state = { posts: [], category: "", tags: new Set(), q: "", visible: PAGE_STEP };

    const hasFilters = () => Boolean(state.category || state.tags.size || state.q.trim());

    // ---- URL state (?category=AI, ?tag=DAX&tag=TMDL, ?q=lineage) ----

    function readUrl() {
      const params = new URLSearchParams(location.search);
      state.category = params.get("category") || "";
      state.tags = new Set(params.getAll("tag").filter(Boolean));
      state.q = params.get("q") || "";
      state.visible = PAGE_STEP;
    }

    function writeUrl(push) {
      const params = new URLSearchParams();
      if (state.category) params.set("category", state.category);
      for (const t of state.tags) params.append("tag", t);
      if (state.q.trim()) params.set("q", state.q.trim());
      const qs = params.toString();
      if (qs === location.search.slice(1)) return;
      history[push ? "pushState" : "replaceState"](null, "", qs ? `?${qs}` : location.pathname);
    }

    // ---- filtering ----

    function filtered() {
      const q = state.q.trim().toLowerCase();
      return state.posts.filter((p) => {
        const cat = p.category || "Notes";
        if (state.category && cat !== state.category) return false;
        // Tags are OR-combined: a post passes if it has any selected tag.
        if (state.tags.size && !(p.tags || []).some((t) => state.tags.has(String(t)))) return false;
        if (q) {
          const hay = `${p.title || ""} ${p.excerpt || ""} ${(p.tags || []).join(" ")} ${cat}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
    }

    // "3 articles in Tooling tagged #DAX matching "icons""
    function describe(n) {
      let s = `${n} article${n === 1 ? "" : "s"}`;
      if (state.category) s += ` in ${state.category}`;
      if (state.tags.size) s += ` tagged ${Array.from(state.tags, (t) => `#${t}`).join(" or ")}`;
      if (state.q.trim()) s += ` matching “${state.q.trim()}”`;
      return s;
    }

    function render() {
      if (!state.posts.length) {
        listEl.innerHTML = `<div class="empty"><strong>No articles yet.</strong>
          <p style="margin-top:6px">New posts will show up here, and in the <a href="./feed.xml">RSS feed</a>.</p></div>`;
        moreWrap.hidden = true;
        return;
      }
      const list = filtered();
      const lead = hasFilters() ? null : list[0] || null;
      const rest = lead ? list.slice(1) : list;
      const shown = rest.slice(0, state.visible);
      const visibleCount = shown.length + (lead ? 1 : 0);

      if (searchInput.value !== state.q) searchInput.value = state.q;
      countEl.textContent = list.length > visibleCount
        ? `Showing ${visibleCount} of ${describe(list.length)}`
        : describe(list.length);
      clearBtn.hidden = !hasFilters();

      listEl.innerHTML = list.length
        ? (lead ? itemHtml(lead, true) : "") + shown.map((p) => itemHtml(p)).join("")
        : `<div class="empty"><strong>No articles match.</strong>
             <p style="margin-top:6px">Try another search, or <button type="button" class="linkbtn" data-clear>clear the filters</button>.</p></div>`;

      const remaining = rest.length - shown.length;
      moreWrap.hidden = remaining <= 0;
      if (remaining > 0) {
        const next = Math.min(PAGE_STEP, remaining);
        moreBtn.textContent = `Show ${next} more article${next === 1 ? "" : "s"}`;
      }

      renderTopics(state.posts, state.tags.size || state.q.trim() ? null : state.category);
    }

    function update(push) {
      state.visible = PAGE_STEP;
      writeUrl(push);
      render();
    }

    function clearAll() {
      state.category = "";
      state.tags.clear();
      state.q = "";
      update(true);
    }

    // ---- events ----

    // Topic links filter in place instead of reloading the page.
    topicNavEl?.addEventListener("click", (e) => {
      const link = e.target.closest("a[data-topic]");
      if (!link || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      state.category = link.dataset.topic;
      state.tags.clear();
      state.q = "";
      update(true);
      if (root.getBoundingClientRect().top < 0) root.scrollIntoView({ block: "start" });
    });

    let searchTimer = null;
    searchInput.addEventListener("input", () => {
      state.q = searchInput.value;
      state.visible = PAGE_STEP;
      render();
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => writeUrl(false), 400);
    });
    // Enter filters in place too (the form only submits for real on post pages).
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      clearTimeout(searchTimer);
      writeUrl(false);
    });

    clearBtn.addEventListener("click", clearAll);
    listEl.addEventListener("click", (e) => {
      if (e.target.closest("[data-clear]")) clearAll();
    });

    moreBtn.addEventListener("click", () => {
      state.visible += PAGE_STEP;
      render();
    });

    window.addEventListener("popstate", () => {
      readUrl();
      render();
    });

    loadPosts()
      .then((posts) => {
        state.posts = posts;
        // With nothing published, search, topics and archive have nothing to offer.
        document.body.classList.toggle("no-posts", !posts.length);
        readUrl();
        render();
        renderArchive(posts, null);
      })
      .catch((err) => {
        console.error(err);
        countEl.textContent = "";
        listEl.innerHTML = `<div class="empty"><strong>Could not load the articles.</strong>
          <p style="margin-top:6px">${OPENED_FROM_DISK ? FROM_DISK_HELP
            : "Check that <code>content/posts.json</code> exists and is valid JSON."}</p></div>`;
      });
  }

  // ---------------------------------------------------------------- start

  const blogEl = document.getElementById("blogApp");
  if (blogEl) {
    initBlog(blogEl);
  } else {
    // Post pages: mark the topic and archive entry of the post being read.
    const slug = page === "post" ? new URLSearchParams(location.search).get("slug") : null;
    loadPosts()
      .then((posts) => {
        document.body.classList.toggle("no-posts", !posts.length);
        const current = slug ? posts.find((p) => p.slug === slug) : null;
        renderTopics(posts, current ? current.category || "Notes" : null, "true");
        renderArchive(posts, slug);
      })
      .catch((err) => console.error(err));  // the sidebar keeps its plain "All articles" link
  }
})();
