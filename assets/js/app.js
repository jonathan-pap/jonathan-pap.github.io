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

  // Opened straight from disk (file://), the browser blocks fetch() of the post files. sync_posts.py
  // also writes them as small scripts (content/posts.js, content/posts/<slug>.js), which a page
  // opened from disk is allowed to load, so double-clicking index.html works too.
  const OPENED_FROM_DISK = location.protocol === "file:";
  const FROM_DISK_HELP = "This page was opened straight from disk and the post files it needs there are missing. "
    + "Run <code>python sync_posts.py</code> in the site folder to create them, or preview through a local server: "
    + "<code>python -m http.server 8000</code>, then open <code>http://localhost:8000</code>.";

  function loadScript(path) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = siteUrl(path);
      s.onload = resolve;
      s.onerror = () => reject(new Error(`${path} didn't load`));
      document.head.appendChild(s);
    });
  }

  let postsPromise = null;
  function loadPosts() {
    if (!postsPromise) {
      const data = OPENED_FROM_DISK
        ? loadScript("content/posts.js").then(() => window.GOLD_LAYER_POSTS || { posts: [] })
        : fetch(siteUrl("content/posts.json")).then((res) => {
          if (!res.ok) throw new Error(`posts.json fetch failed: ${res.status}`);
          return res.json();
        });
      postsPromise = data.then((d) => (d.posts || [])
        .map((p) => ({ ...p, _dt: parseDate(p.date) }))
        .sort((a, b) => (b._dt?.t || 0) - (a._dt?.t || 0)));
    }
    return postsPromise;
  }

  // A post's Markdown, from content/posts/<slug>.md (or its script copy when opened from disk).
  function loadMarkdown(p) {
    if (OPENED_FROM_DISK) {
      return loadScript(`content/posts/${encodeURIComponent(p.slug)}.js`).then(() => {
        const md = (window.GOLD_LAYER_MD || {})[p.slug];
        if (typeof md !== "string") throw new Error(`no Markdown for ${p.slug}`);
        return md;
      });
    }
    return fetch(siteUrl(p.file || p.path || `content/posts/${p.slug}.md`)).then((res) => {
      if (!res.ok) throw new Error(`Markdown fetch failed: ${res.status}`);
      return res.text();
    });
  }

  // ---------------------------------------------------------------- Gold Layer Shorts

  // The shorts, from content/shorts.json (or its script copy when opened from disk), newest first.
  let shortsPromise = null;
  function loadShorts() {
    if (!shortsPromise) {
      const data = OPENED_FROM_DISK
        ? loadScript("content/shorts.js").then(() => window.GOLD_LAYER_SHORTS || { shorts: [] })
        : fetch(siteUrl("content/shorts.json")).then((res) => {
          if (!res.ok) throw new Error(`shorts.json fetch failed: ${res.status}`);
          return res.json();
        });
      shortsPromise = data.then((d) => d.shorts || []);
    }
    return shortsPromise;
  }

  const shortUrl = (s) => siteUrl(`shorts.html#short-${s.id}`);
  const shortDuration = (s) => `0:${String(Math.round(s.duration || 0)).padStart(2, "0")}`;

  // A short as a poster with a play button. Nothing loads until the reader clicks it.
  function shortFrameHtml(s) {
    const poster = siteUrl(`assets/shorts/posters/${s.file}.jpg`);
    return `
      <div class="short-frame" data-id="${escapeHtml(s.id)}">
        <img src="${escapeHtml(poster)}" alt="" loading="lazy" width="540" height="960">
        <button class="short-play" type="button" aria-label="Play the short: ${escapeHtml(s.title)}">
          <span class="short-play-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5Z"/></svg></span>
        </button>
        <span class="short-dur" aria-hidden="true">${shortDuration(s)}</span>
      </div>`;
  }

  // Clicking a poster opens the player on that short. `list` is what Previous/Next walk through.
  function wireShortFrames(root, list, options) {
    root.querySelectorAll(".short-frame").forEach((frame) => {
      const btn = frame.querySelector(".short-play");
      const index = list.findIndex((s) => s.id === frame.dataset.id);
      if (btn && index !== -1) btn.addEventListener("click", () => openShortPlayer(list, index, btn, options));
    });
  }

  // The player: one <dialog>, built the first time it's needed and sized to the window's height,
  // so the text in a 1080x1920 clip is big enough to read. Its controls sit under the clip, not on it.
  const ICONS = {
    play: '<path d="M8 5.5v13l10.5-6.5Z" fill="currentColor" stroke="none"/>',
    pause: '<path d="M8.5 5v14M15.5 5v14"/>',
    replay: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/>',
    sound: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4Z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    muted: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4Z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>',
    full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    prev: '<path d="m15 5-7 7 7 7"/>',
    next: '<path d="m9 5 7 7-7 7"/>',
  };
  const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
  const clock = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

  let player = null;
  let preferMuted = false;
  try { preferMuted = localStorage.getItem("gl-shorts-muted") === "1"; } catch (e) { /* storage blocked */ }

  function ensurePlayer() {
    if (player) return player;
    const dlg = document.createElement("dialog");
    dlg.className = "short-player";
    dlg.setAttribute("aria-labelledby", "spTitle");
    dlg.innerHTML = `
      <button class="sp-btn sp-close" type="button" aria-label="Close">${icon("close")}</button>
      <button class="sp-btn sp-nav sp-prev" type="button" aria-label="Previous short">${icon("prev")}</button>
      <div class="sp-main">
        <div class="sp-frame">
          <video playsinline preload="auto"></video>
          <button class="sp-big" type="button" aria-label="Play">${icon("play")}</button>
        </div>
        <div class="sp-bar">
          <button class="sp-btn sp-toggle" type="button" aria-label="Play">${icon("play")}</button>
          <input class="sp-seek" type="range" min="0" max="1000" step="1" value="0" aria-label="Position in the short">
          <span class="sp-time" aria-hidden="true">0:00</span>
          <button class="sp-btn sp-mute" type="button" aria-label="Mute" aria-pressed="false">${icon("sound")}</button>
          <button class="sp-btn sp-full" type="button" aria-label="Full screen">${icon("full")}</button>
        </div>
      </div>
      <div class="sp-info">
        <p class="short-kicker" id="spKicker"></p>
        <h2 class="sp-title" id="spTitle"></h2>
        <p class="short-summary" id="spSummary"></p>
        <a class="short-link" id="spArticle" hidden>Read the article →</a>
        <p class="sp-keys" aria-hidden="true">Space play · M sound · ← → previous / next · Esc close</p>
      </div>
      <button class="sp-btn sp-nav sp-next" type="button" aria-label="Next short">${icon("next")}</button>`;
    document.body.appendChild(dlg);

    const $ = (sel) => dlg.querySelector(sel);
    const video = $("video"), big = $(".sp-big"), toggle = $(".sp-toggle"), seek = $(".sp-seek");
    const time = $(".sp-time"), mute = $(".sp-mute"), prev = $(".sp-prev"), next = $(".sp-next");
    const state = { list: [], index: 0, opener: null, options: {} };

    function setPlaying(on) {
      toggle.innerHTML = icon(on ? "pause" : "play");
      toggle.setAttribute("aria-label", on ? "Pause" : "Play");
      big.hidden = on;
    }
    function setMuted(on) {
      video.muted = on;
      preferMuted = on;
      try { localStorage.setItem("gl-shorts-muted", on ? "1" : "0"); } catch (e) { /* storage blocked */ }
      mute.innerHTML = icon(on ? "muted" : "sound");
      mute.setAttribute("aria-pressed", String(on));
      mute.setAttribute("aria-label", on ? "Turn sound on" : "Mute");
    }
    const togglePlay = () => (video.paused || video.ended ? video.play().catch(() => {}) : video.pause());

    function show(i, autoplay) {
      const s = state.list[i];
      state.index = i;
      video.src = siteUrl(`assets/shorts/${s.file}.mp4`);
      video.poster = siteUrl(`assets/shorts/posters/${s.file}.jpg`);
      setMuted(preferMuted);
      seek.value = 0;
      time.textContent = `0:00 / ${shortDuration(s)}`;
      big.innerHTML = icon("play");
      $("#spKicker").textContent = `Gold Layer Short · ${s.topic || "Short"} · ${shortDuration(s)}`;
      $("#spTitle").textContent = s.title;
      $("#spSummary").textContent = s.summary || "";
      const article = $("#spArticle");
      article.hidden = !s.articleUrl;
      if (s.articleUrl) article.href = s.articleUrl;
      const many = state.list.length > 1;
      prev.hidden = next.hidden = !many;
      prev.disabled = i === 0;
      next.disabled = i === state.list.length - 1;
      if (state.options.updateHash) {
        try { history.replaceState(null, "", `#short-${s.id}`); } catch (e) { /* file:// in some browsers */ }
      }
      setPlaying(false);
      if (autoplay) video.play().catch(() => setPlaying(false));  // blocked: the big play button stays
    }

    video.addEventListener("play", () => setPlaying(true));
    video.addEventListener("pause", () => setPlaying(false));
    video.addEventListener("ended", () => { setPlaying(false); big.innerHTML = icon("replay"); big.setAttribute("aria-label", "Play again"); });
    video.addEventListener("timeupdate", () => {
      const d = video.duration || 0;
      if (!d) return;
      seek.value = Math.round((video.currentTime / d) * 1000);
      seek.setAttribute("aria-valuetext", `${clock(video.currentTime)} of ${clock(d)}`);
      time.textContent = `${clock(video.currentTime)} / ${clock(d)}`;
    });
    seek.addEventListener("input", () => { if (video.duration) video.currentTime = (seek.value / 1000) * video.duration; });
    video.addEventListener("click", togglePlay);
    big.addEventListener("click", togglePlay);
    toggle.addEventListener("click", togglePlay);
    mute.addEventListener("click", () => setMuted(!video.muted));
    $(".sp-full").addEventListener("click", () => {
      if (video.requestFullscreen) video.requestFullscreen().catch(() => {});
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();  // iOS Safari
    });
    prev.addEventListener("click", () => { if (state.index > 0) show(state.index - 1, true); });
    next.addEventListener("click", () => { if (state.index < state.list.length - 1) show(state.index + 1, true); });
    $(".sp-close").addEventListener("click", () => dlg.close());
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });  // the dimmed backdrop

    dlg.addEventListener("keydown", (e) => {
      const onControl = e.target.matches("button, input, a");
      if ((e.key === " " && !onControl) || e.key === "k") { e.preventDefault(); togglePlay(); }
      else if (e.key === "m") setMuted(!video.muted);
      else if (e.key === "ArrowLeft" && !e.target.matches("input")) prev.click();
      else if (e.key === "ArrowRight" && !e.target.matches("input")) next.click();
    });

    dlg.addEventListener("close", () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
      if (state.options.updateHash) {
        try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* ignore */ }
      }
      if (state.opener && state.opener.isConnected) state.opener.focus();
    });

    player = { dlg, state, show };
    return player;
  }

  // options: { autoplay (default true), updateHash (keep #short-NNN in the address) }
  function openShortPlayer(list, index, opener, options = {}) {
    const p = ensurePlayer();
    Object.assign(p.state, { list, opener, options });
    if (!p.dlg.open) p.dlg.showModal();
    p.show(index, options.autoplay !== false);
    p.dlg.querySelector(".sp-toggle").focus();
  }

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

  window.SiteBlog = { loadPosts, loadMarkdown, loadShorts, shortUrl, shortDuration, shortFrameHtml, wireShortFrames, openShortPlayer,
    parseDate, formatDate, escapeHtml, postUrl, tagUrl, siteUrl, OPENED_FROM_DISK, FROM_DISK_HELP };

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
      // Some browsers refuse to rewrite the address of a page opened from disk; filtering still works.
      try {
        history[push ? "pushState" : "replaceState"](null, "", qs ? `?${qs}` : location.pathname);
      } catch { /* the address bar just doesn't follow */ }
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
  } else if (page === "post") {
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
