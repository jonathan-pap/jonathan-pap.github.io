/* Shorts page: the Gold Layer Shorts gallery, from content/shorts.json.
   Each card is a poster that plays when clicked; a short with an article behind it links to it.
   Needs app.js (window.SiteBlog). */
(function () {
  "use strict";

  const { loadShorts, loadPosts, shortDuration, shortFrameHtml, wireShortFrames, openShortPlayer, ytActive, ytWatchUrl, escapeHtml, postUrl,
    OPENED_FROM_DISK, FROM_DISK_HELP } = window.SiteBlog;

  const gridEl = document.getElementById("shortsGrid");
  const countEl = document.getElementById("shortsCount");

  function cardHtml(s, articleUrl) {
    return `
      <article class="short-card" id="short-${escapeHtml(s.id)}">
        ${shortFrameHtml(s)}
        <p class="short-kicker">${escapeHtml(s.topic || "Short")} · ${shortDuration(s)}</p>
        <h2 class="short-title">${escapeHtml(s.title)}</h2>
        <p class="short-summary">${escapeHtml(s.summary || "")}</p>
        <p class="short-links">
          ${articleUrl ? `<a class="short-link" href="${escapeHtml(articleUrl)}">Read the article →</a>` : ""}
          ${ytActive(s) ? `<a class="short-link" href="${escapeHtml(ytWatchUrl(s))}" rel="noopener">Watch on YouTube ↗</a>` : ""}
        </p>
      </article>`;
  }

  // ---- filters, laid out like the Articles page: search, Show and Topics in the left rail ----
  // The state lives in the address (?show=article&topic=Power+BI&q=cache) so a filtered view can be shared.
  // Each control appears only once it has something to filter: Show when shorts differ (some with an
  // article, some without), Topics always (like Articles), search from SEARCH_FROM shorts up.
  const SHOWS = [
    ["", "All", () => true],
    ["article", "With an article", (s) => !!s.articleUrl],
    ["solo", "Shorts only", (s) => !s.articleUrl],
  ];
  const SEARCH_FROM = 8;

  function setUpFilters(all) {
    const showBlock = document.getElementById("showBlock");
    const showNav = document.getElementById("showNav");
    const topicNav = document.getElementById("topicNav");
    const formEl = document.getElementById("shortsSearchForm");
    const searchEl = document.getElementById("shortsSearch");
    const clearEl = document.getElementById("shortsClear");

    const params = new URLSearchParams(location.search);
    const state = { show: params.get("show") || "", topic: params.get("topic") || "", q: params.get("q") || "" };
    const showFn = (key) => (SHOWS.find(([k]) => k === key) || SHOWS[0])[2];
    const topics = [...new Set(all.map((s) => s.topic).filter(Boolean))].sort();
    if (!SHOWS.some(([k]) => k === state.show)) state.show = "";
    if (!topics.includes(state.topic)) state.topic = "";

    const showUseful = SHOWS.slice(1).every(([, , fn]) => all.some(fn));  // both kinds exist
    showBlock.hidden = !showUseful;
    if (!showUseful) state.show = "";
    formEl.hidden = all.length < SEARCH_FROM && !state.q;

    const matchesText = (s) => {
      const words = state.q.toLowerCase().split(/\s+/).filter(Boolean);
      const hay = `${s.title} ${s.summary || ""} ${s.topic || ""}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    };

    function url(change) {
      const next = { ...state, ...change };
      const p = new URLSearchParams();
      if (next.show) p.set("show", next.show);
      if (next.topic) p.set("topic", next.topic);
      if (next.q.trim()) p.set("q", next.q.trim());
      const qs = p.toString();
      return `./shorts.html${qs ? "?" + qs : ""}`;
    }
    const navItem = (attr, key, label, n, active) => `
      <li><a href="${escapeHtml(url({ [attr]: key }))}" data-${attr}="${escapeHtml(key)}"${active ? ' aria-current="page"' : ""}>
        <span>${escapeHtml(label)}</span><span class="side-count">${n}</span></a></li>`;

    function render() {
      // Counts in each list follow the other filters, so a number is what you get when you click it.
      const byText = all.filter(matchesText);
      const inTopic = byText.filter((s) => !state.topic || s.topic === state.topic);
      const inShow = byText.filter(showFn(state.show));

      if (showUseful) {
        showNav.innerHTML = SHOWS.map(([k, label, fn]) => [k, label, inTopic.filter(fn).length])
          .filter(([k, , n]) => n > 0 || k === "" || k === state.show)
          .map(([k, label, n]) => navItem("show", k, label, n, k === state.show)).join("");
      }
      topicNav.innerHTML = [["", "All shorts", inShow.length], ...topics.map((t) => [t, t, inShow.filter((s) => s.topic === t).length])]
        .map(([k, label, n]) => navItem("topic", k, label, n, k === state.topic)).join("");
      if (searchEl.value !== state.q) searchEl.value = state.q;

      const list = inTopic.filter(showFn(state.show));
      const filtering = state.show || state.topic || state.q.trim();
      clearEl.hidden = !filtering;
      const noun = (n) => `${n} ${n === 1 ? "short" : "shorts"}`;
      countEl.textContent = filtering ? `${list.length} of ${noun(all.length)}` : noun(all.length);
      gridEl.innerHTML = list.length
        ? list.map((s) => cardHtml(s, s.articleUrl)).join("")
        : `<div class="empty"><strong>No shorts match.</strong>
             <p style="margin-top:6px">Try another search, or <button type="button" class="linkbtn" data-clear>clear the filters</button>.</p></div>`;
      wireShortFrames(gridEl, list, { updateHash: true });
    }

    function update() {
      try { history.replaceState(null, "", url({}) + location.hash); } catch (e) { /* opened from disk */ }
      render();
    }
    function clearAll() { state.show = ""; state.topic = ""; state.q = ""; update(); }

    // The rail links work as plain links too; with JavaScript they filter in place.
    const onNavClick = (attr) => (e) => {
      const a = e.target.closest(`a[data-${attr}]`);
      if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      state[attr] = a.dataset[attr];
      update();
    };
    showNav.addEventListener("click", onNavClick("show"));
    topicNav.addEventListener("click", onNavClick("topic"));
    let timer = null;
    searchEl.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => { state.q = searchEl.value; update(); }, 150);
    });
    formEl.addEventListener("submit", (e) => { e.preventDefault(); state.q = searchEl.value; update(); });
    clearEl.addEventListener("click", clearAll);
    gridEl.addEventListener("click", (e) => { if (e.target.closest("[data-clear]")) clearAll(); });

    render();
  }

  // An article link only for posts that are actually published.
  Promise.all([loadShorts(), loadPosts().catch(() => [])])
    .then(([shorts, posts]) => {
      const bySlug = new Map(posts.map((p) => [p.slug, p]));
      const list = shorts.map((s) => {
        const post = s.post ? bySlug.get(s.post) : null;
        return post ? { ...s, articleUrl: postUrl(post) } : s;
      });
      if (!list.length) {
        countEl.textContent = "";
        gridEl.innerHTML = `<div class="empty"><strong>No shorts yet.</strong>
          <p style="margin-top:6px">New shorts will show up here, and in the articles they go with.</p></div>`;
        return;
      }
      setUpFilters(list);

      // A link to one short (shorts.html#short-017) opens the player on it, paused:
      // browsers only allow sound after a click.
      const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) {
        target.scrollIntoView({ block: "center", behavior: "instant" });
        const i = list.findIndex((s) => `short-${s.id}` === target.id);
        if (i !== -1 && !ytActive(list[i])) openShortPlayer(list, i, target.querySelector(".short-play"), { updateHash: true, autoplay: false });
        else if (i !== -1) target.classList.add("is-target");  // a YouTube short: show it, the reader clicks play
      }
    })
    .catch((err) => {
      console.error(err);
      countEl.textContent = "";
      gridEl.innerHTML = `<div class="empty"><strong>Could not load the shorts.</strong>
        <p style="margin-top:6px">${OPENED_FROM_DISK ? FROM_DISK_HELP
          : "Check that <code>content/shorts.json</code> exists and is valid JSON."}</p></div>`;
    });
})();
