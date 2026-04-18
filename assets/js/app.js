(function () {
  const archiveEl = document.getElementById("archiveList");
  const categoriesEl = document.getElementById("categoriesList");
  const tagsEl = document.getElementById("tagsList");
  const cardsEl = document.getElementById("cardsGrid");
  const countEl = document.getElementById("articlesCount");
  const yearEl = document.getElementById("year");

  const searchInput = document.getElementById("searchInput");
  const filtersPanelEl = document.getElementById("filtersPanel");
  const chipsEl = document.getElementById("activeFilters");
  const loadMoreWrapEl = document.getElementById("loadMoreWrap");
  const loadMoreBtnEl = document.getElementById("loadMoreBtn");

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const LOAD_MORE_STEP = 6;
  const fmt = new Intl.DateTimeFormat(undefined, { year:"numeric", month:"short", day:"2-digit" });

  const state = {
    posts: [],
    q: "",
    category: "All Articles",
    tags: new Set(),          // multi-select: posts match if they have ANY selected tag
    archive: null,            // {year, month} or null
    openYears: new Set(),     // we enforce only 1 open year
    openMonths: new Set(),    // we enforce only 1 open month: key `${year}-${month}`
    visibleBelowCount: LOAD_MORE_STEP,
  };

  function normalize(s){ return String(s || "").toLowerCase().trim(); }

  function escapeHtml(str){
    return String(str)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function parseDateSafe(d){
    const dt = d ? new Date(d) : null;
    return (dt && !Number.isNaN(dt.getTime())) ? dt : null;
  }

  function getReadTimeMinutes(p){
    if (typeof p.readTime === "number") return p.readTime;

    // lightweight estimate
    const text = `${p.title || ""} ${p.excerpt || ""}`.trim();
    const words = text ? text.split(/\s+/).length : 0;
    return Math.max(1, Math.round(words / 180));
  }

  function getCardImageSrc(p){
    const candidate = p?.image || p?.coverImage || p?.cover || p?.thumbnail || "";
    return typeof candidate === "string" ? candidate.trim() : "";
  }

  function enrichPosts(posts){
    return (posts || [])
      .map(p => {
        const dt = parseDateSafe(p.date);
        return {
          ...p,
          _dt: dt,
          _year: dt ? dt.getFullYear() : 0,
          _month: dt ? dt.getMonth() : 0
        };
      })
      .sort((a,b) => (b._dt?.getTime()||0) - (a._dt?.getTime()||0));
  }

  function buildCategories(posts){
    const map = new Map();
    for (const p of posts){
      const c = p.category || "Uncategorized";
      map.set(c, (map.get(c) || 0) + 1);
    }
    const items = Array.from(map.entries())
      .sort((a,b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return [{ name:"All Articles", count: posts.length }, ...items.map(([name,count]) => ({name,count}))];
  }

  function buildTags(posts){
    const map = new Map();
    for (const p of posts){
      for (const t of (p.tags || [])){
        const key = String(t);
        map.set(key, (map.get(key) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .sort((a,b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name,count]) => ({ name, count }));
  }

  function buildArchive(posts){
    const years = new Map(); // year -> { total, months: Map(month -> {count, posts:[]}) }

    for (const p of posts){
      const y = p._year || 0;
      const m = p._month || 0;

      if (!years.has(y)) years.set(y, { total: 0, months: new Map() });
      const yObj = years.get(y);
      yObj.total += 1;

      if (!yObj.months.has(m)) yObj.months.set(m, { count: 0, posts: [] });
      const mObj = yObj.months.get(m);
      mObj.count += 1;
      mObj.posts.push(p);
    }

    return Array.from(years.entries())
      .sort((a,b) => b[0] - a[0])
      .map(([year, obj]) => ({
        year,
        total: obj.total,
        months: Array.from(obj.months.entries())
          .sort((a,b) => b[0] - a[0])
          .map(([month, mObj]) => ({
            year,
            month,
            label: monthNames[month] || "—",
            count: mObj.count,
            posts: mObj.posts.sort((a,b) => (b._dt?.getTime()||0) - (a._dt?.getTime()||0)),
          }))
      }));
  }

  // ---- URL state sync (filters live in ?query) ----

  let syncingFromUrl = false;

  function serializeStateToUrl(){
    if (syncingFromUrl) return;
    const params = new URLSearchParams();
    if (state.category && state.category !== "All Articles") params.set("category", state.category);
    // Multiple tags serialize as repeated ?tag=foo&tag=bar for standard getAll() parsing.
    for (const t of state.tags) params.append("tag", t);
    if (state.archive) params.set("archive", `${state.archive.year}-${state.archive.month}`);
    if (state.q) params.set("q", state.q);

    const qs = params.toString();
    const next = qs ? `?${qs}${window.location.hash || ""}` : window.location.pathname + (window.location.hash || "");
    const currentQs = window.location.search.slice(1);
    if (currentQs === qs) return;
    history.pushState(null, "", next || window.location.pathname);
  }

  function readStateFromUrl(){
    const params = new URLSearchParams(window.location.search);

    const cat = params.get("category");
    state.category = cat || "All Articles";

    // getAll handles both ?tag=a&tag=b AND a single ?tag=a.
    state.tags = new Set(params.getAll("tag").filter(Boolean));

    const arch = params.get("archive");
    if (arch && /^\d+-\d+$/.test(arch)) {
      const [y, m] = arch.split("-").map(Number);
      state.archive = { year: y, month: m };
      state.openYears = new Set([y]);
      state.openMonths = new Set([`${y}-${m}`]);
    } else {
      state.archive = null;
    }

    state.q = params.get("q") || "";
    resetVisibleBelow();
  }

  // ---- setters / clearers ----

  function resetVisibleBelow(){ state.visibleBelowCount = LOAD_MORE_STEP; }

  function setCategory(name){
    state.category = name;
    resetVisibleBelow();
    serializeStateToUrl();
    renderAll();
  }
  function toggleTag(name){
    if (!name) return;
    if (state.tags.has(name)) state.tags.delete(name);
    else state.tags.add(name);
    resetVisibleBelow();
    serializeStateToUrl();
    renderAll();
  }

  function setArchive(year, month){
    state.archive = { year, month };
    resetVisibleBelow();
    serializeStateToUrl();
    renderAll();
  }

  function clearArchive(){
    state.archive = null;
    resetVisibleBelow();
    serializeStateToUrl();
    renderAll();
  }
  function clearCategory(){
    state.category = "All Articles";
    resetVisibleBelow();
    serializeStateToUrl();
    renderAll();
  }
  // Clears a specific tag; clearTag() with no arg clears them all.
  function clearTag(name){
    if (name) state.tags.delete(name);
    else state.tags.clear();
    resetVisibleBelow();
    serializeStateToUrl();
    renderAll();
  }
  function clearSearch(){
    state.q = "";
    if (searchInput) searchInput.value = "";
    resetVisibleBelow();
    serializeStateToUrl();
    renderAll();
  }

  // ---- archive open/close (auto-close others) ----

  function openOnlyYear(year){
    state.openYears = new Set([year]);
    state.openMonths = new Set(); // reset open month when switching years
  }

  function toggleYear(year){
    const isOpen = state.openYears.has(year);

    if (isOpen){
      state.openYears.delete(year);
      state.openMonths = new Set();
    } else {
      openOnlyYear(year);
    }

    renderArchive();
  }

  function toggleMonth(year, month){
    const key = `${year}-${month}`;
    const isOpen = state.openYears.has(year) && state.openMonths.has(key);

    state.openYears = new Set([year]);
    state.openMonths = isOpen ? new Set() : new Set([key]);

    // open month -> apply archive filter, close same month -> clear it
    if (isOpen){
      if (state.archive && state.archive.year === year && state.archive.month === month){
        state.archive = null;
      }
    } else {
      state.archive = { year, month };
    }

    resetVisibleBelow();
    renderAll();
  }

  // ---- filtering ----

  function filteredPosts(){
    const q = normalize(state.q);
    const cat = state.category;
    const tags = state.tags;
    const arch = state.archive;

    return state.posts.filter(p => {
      const pCat = p.category || "Uncategorized";
      if (cat !== "All Articles" && pCat !== cat) return false;

      // Tags are OR-combined: post passes if it has AT LEAST ONE selected tag.
      if (tags.size > 0) {
        const postTags = (p.tags || []).map(String);
        const hit = postTags.some(t => tags.has(t));
        if (!hit) return false;
      }

      if (arch) {
        if (p._year !== arch.year) return false;
        if (p._month !== arch.month) return false;
      }

      if (q) {
        const hay = normalize(`${p.title||""} ${p.excerpt||""} ${(p.tags||[]).join(" ")} ${pCat}`);
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }

  // ---- renders ----

  function renderCategories(){
    const cats = buildCategories(state.posts);

    categoriesEl.innerHTML = cats.map(c => {
      const isActive = state.category === c.name;
      return `
        <button class="cat ${isActive ? "active" : ""}" type="button"
                aria-pressed="${isActive}" data-cat="${escapeHtml(c.name)}">
          <span class="cat-left"><span>${escapeHtml(c.name)}</span></span>
          <span class="cat-count">${c.count}</span>
        </button>
      `;
    }).join("");
    // Handlers attached once via setupEventDelegation().
  }

  function renderSidebarTags(){
    const all = buildTags(state.posts);
    // De-noise: on small-ish blogs every post drops new unique tags; the panel
    // fills with count=1 chips that add little signal. Prefer tags with
    // count >= 2, but keep a minimum of 6 entries so the panel always
    // feels populated. Always keep currently-selected tags visible even if
    // count=1 (so users can see and un-select them).
    const repeated = all.filter(t => t.count >= 2);
    const base = repeated.length >= 6 ? repeated : all.slice(0, 10);
    const visible = new Map(base.map(t => [t.name, t]));
    for (const t of state.tags) {
      if (!visible.has(t)) {
        const found = all.find(x => x.name === t);
        if (found) visible.set(t, found);
      }
    }
    const tags = Array.from(visible.values()).slice(0, 12);

    tagsEl.innerHTML = tags.map(t => {
      const isActive = state.tags.has(t.name);
      return `
        <button class="sidebar-tagbtn ${isActive ? "active" : ""}" type="button"
                aria-pressed="${isActive}" data-tag="${escapeHtml(t.name)}">
          <span>#${escapeHtml(t.name)}</span>
          <span class="sidebar-tagcount">${t.count}</span>
        </button>
      `;
    }).join("");
    // Handlers attached once via setupEventDelegation().
  }

  function renderArchive(){
    const archive = buildArchive(state.posts);
    // Archive starts fully collapsed — Categories and Tags are the primary
    // filter affordances, Archive is for occasional deep-drilling. If a user
    // deep-links via ?archive=YYYY-M, readStateFromUrl() has already
    // populated openYears/openMonths to expose that month.

    archiveEl.innerHTML = archive.map(y => {
      const yearOpen = state.openYears.has(y.year);

      return `
        <div class="arch-year">
          <button class="arch-year-btn" type="button" data-year="${y.year}" aria-expanded="${yearOpen}">
            <span class="arch-left">
              <span class="arch-chevron">${yearOpen ? "▾" : "▸"}</span>
              <span class="arch-year-label">${y.year}</span>
            </span>
            <span class="arch-count">${y.total}</span>
          </button>

          <div class="arch-months" ${yearOpen ? "" : "hidden"}>
            ${y.months.map(m => {
              const key = `${m.year}-${m.month}`;
              const monthOpen = state.openMonths.has(key);

              const isActive =
                state.archive &&
                state.archive.year === m.year &&
                state.archive.month === m.month;

              return `
                <div class="arch-month ${isActive ? "active" : ""}">
                  <button class="arch-month-btn" type="button" data-month="${key}" aria-expanded="${monthOpen}">
                    <span class="arch-left">
                      <span class="arch-chevron">${monthOpen ? "▾" : "▸"}</span>
                      <span class="arch-month-label">${escapeHtml(m.label)}</span>
                      <span class="arch-month-count">(${m.count})</span>
                    </span>
                  </button>

                  <div class="arch-posts arch-posts--clean" ${monthOpen ? "" : "hidden"}>
                    ${m.posts.map(p => `
                      <a class="arch-post arch-post--clean"
                         href="./post.html?slug=${encodeURIComponent(p.slug)}"
                         title="${escapeHtml(p.title||"")}">
                        <span class="arch-post-title arch-post-title--clean">${escapeHtml(p.title || "Untitled")}</span>
                      </a>
                    `).join("")}
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `;
    }).join("");

    // Handlers attached once via setupEventDelegation().
  }

  function renderCards(){
    const posts = filteredPosts();
    const [headliner, ...restPosts] = posts;
    const belowPosts = restPosts.slice(0, state.visibleBelowCount);
    const visibleCount = (headliner ? 1 : 0) + belowPosts.length;

    if (countEl){
      if (posts.length > visibleCount){
        countEl.textContent = `Showing ${visibleCount} of ${posts.length} articles`;
      } else {
        countEl.textContent = `${visibleCount} article${visibleCount === 1 ? "" : "s"}`;
      }
    }

    if (!headliner){
      if (loadMoreWrapEl) loadMoreWrapEl.hidden = true;
      cardsEl.innerHTML = `
        <div class="empty">
          <strong>No matches.</strong>
          <div class="muted" style="margin-top:6px;">Try clearing filters and browse the latest posts.</div>
        </div>
      `;
      return;
    }

    const renderCard = (p, isHeadliner) => {
      const dt = p._dt ? fmt.format(p._dt) : "";
      const cat = p.category || "Article";
      const rt = getReadTimeMinutes(p);
      const tags = (p.tags || []).slice(0, 4).map(t => `#${t}`).join("  ");
      const imgSrc = getCardImageSrc(p);

      // author can be string OR object in some inputs; guard it
      let author = "Author";
      if (typeof p.author === "string" && p.author.trim()) author = p.author.trim();
      else if (p.author && typeof p.author === "object") {
        if (typeof p.author.name === "string" && p.author.name.trim()) author = p.author.name.trim();
      }
      const avatar = (author[0] || "A").toUpperCase();
      const headlinerFlag = isHeadliner
        ? `<div class="headliner-flag" aria-label="Featured article">Featured</div>`
        : "";
      const aiFlag = p.drafted_with_ai
        ? `<div class="ai-flag" title="Drafted with AI, reviewed by the author" aria-label="Drafted with AI">AI-drafted</div>`
        : "";
      const classes = isHeadliner ? "card card--headliner" : "card";
      // If a .png/.jpg/.jpeg cover is listed, assume a sibling .webp variant
      // exists and offer it via <picture>. Falls back to the original format
      // if the browser or the file isn't available. A solo .webp in posts.json
      // is used directly.
      const webpSibling = imgSrc.replace(/\.(png|jpg|jpeg)$/i, ".webp");
      const hasWebpSibling = imgSrc && webpSibling !== imgSrc;
      const mediaImage = imgSrc
        ? (hasWebpSibling
            ? `<picture>
                 <source srcset="${escapeHtml(webpSibling)}" type="image/webp">
                 <img class="card-cover" src="${escapeHtml(imgSrc)}" alt=""
                      loading="${isHeadliner ? "eager" : "lazy"}" decoding="async"
                      onerror="this.closest('picture').remove()">
               </picture>`
            : `<img class="card-cover" src="${escapeHtml(imgSrc)}" alt=""
                    loading="${isHeadliner ? "eager" : "lazy"}" decoding="async"
                    onerror="this.remove()">`)
        : "";

      return `
        <a class="${classes}" href="./post.html?slug=${encodeURIComponent(p.slug)}">
          <div class="card-media">
            ${mediaImage}
            <div class="placeholder"></div>
            <div class="pill">${escapeHtml(cat)}</div>
            ${headlinerFlag}
            ${aiFlag}
          </div>

          <div class="card-body">
            <div class="card-title">${escapeHtml(p.title || "Untitled")}</div>
            <div class="card-excerpt">${escapeHtml(p.excerpt || "")}</div>
            <div class="hashes">${escapeHtml(tags)}</div>

            <div class="divider"></div>

            <div class="card-foot">
              <div class="author">
                <div class="avatar"><span>${escapeHtml(avatar)}</span></div>
                <div>
                  <div class="author-name">${escapeHtml(author)}</div>
                  <div class="author-date">${escapeHtml(dt)}</div>
                </div>
              </div>

              <div class="readtime" title="Estimated reading time">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 7v5l3 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" stroke-width="2"/>
                </svg>
                <span>${rt} min</span>
              </div>
            </div>
          </div>
        </a>
      `;
    };

    cardsEl.innerHTML = [
      headliner ? renderCard(headliner, true) : "",
      ...belowPosts.map(p => renderCard(p, false))
    ].join("");

    if (loadMoreWrapEl && loadMoreBtnEl){
      const remaining = Math.max(0, restPosts.length - belowPosts.length);
      if (remaining > 0){
        const nextCount = Math.min(LOAD_MORE_STEP, remaining);
        loadMoreBtnEl.textContent = `Show ${nextCount} more article${nextCount === 1 ? "" : "s"}`;
        loadMoreWrapEl.hidden = false;
      } else {
        loadMoreWrapEl.hidden = true;
      }
    }
  }

  function renderFilterChips(){
    if (!chipsEl) return;

    const chips = [];

    if (state.archive){
      chips.push({
        key: "archive",
        label: `${monthNames[state.archive.month]} ${state.archive.year}`,
        clear: clearArchive
      });
    }
    if (state.category !== "All Articles"){
      chips.push({ key: "category", label: state.category });
    }
    // One chip per active tag, each independently clearable.
    for (const t of state.tags) {
      chips.push({ key: "tag", value: t, label: `#${t}` });
    }
    if (state.q){
      chips.push({ key: "search", label: `Search: "${state.q}"` });
    }

    if (!chips.length){
      chipsEl.innerHTML = "";
      if (filtersPanelEl) filtersPanelEl.hidden = true;
      return;
    }

    if (filtersPanelEl) filtersPanelEl.hidden = false;

    chipsEl.innerHTML = chips.map(c => `
      <button class="filterchip" type="button"
              data-chip="${escapeHtml(c.key)}"${c.value ? ` data-chip-value="${escapeHtml(c.value)}"` : ""}>
        <span class="filterchip-label">${escapeHtml(c.label)}</span>
        <span class="filterchip-x">×</span>
      </button>
    `).join("");
    // Handlers attached once via setupEventDelegation().
  }

  // Chip-key → clear function (used by the delegated click handler).
  // Each clearer accepts an optional value (used for per-tag chips).
  const chipClearers = {
    archive: () => clearArchive(),
    category: () => clearCategory(),
    tag: (value) => clearTag(value),
    search: () => clearSearch(),
  };

  // Attach one click handler per list container instead of one per button.
  // Saves re-wiring on every render and keeps handler count bounded.
  function setupEventDelegation(){
    if (categoriesEl){
      categoriesEl.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-cat]");
        if (btn && categoriesEl.contains(btn)) {
          setCategory(btn.getAttribute("data-cat"));
        }
      });
    }
    if (tagsEl){
      tagsEl.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-tag]");
        if (btn && tagsEl.contains(btn)) {
          toggleTag(btn.getAttribute("data-tag"));
        }
      });
    }
    if (archiveEl){
      archiveEl.addEventListener("click", (e) => {
        const monthBtn = e.target.closest("[data-month]");
        if (monthBtn && archiveEl.contains(monthBtn)) {
          const [yy, mm] = monthBtn.getAttribute("data-month").split("-").map(Number);
          toggleMonth(yy, mm);
          return;
        }
        const yearBtn = e.target.closest("[data-year]");
        if (yearBtn && archiveEl.contains(yearBtn)) {
          toggleYear(Number(yearBtn.getAttribute("data-year")));
        }
      });
    }
    if (chipsEl){
      chipsEl.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-chip]");
        if (!btn || !chipsEl.contains(btn)) return;
        const fn = chipClearers[btn.getAttribute("data-chip")];
        if (fn) fn(btn.getAttribute("data-chip-value") || undefined);
      });
    }
  }

  function renderAll(){
    if (searchInput && searchInput.value !== state.q) searchInput.value = state.q;

    renderCategories();
    renderSidebarTags();
    renderArchive();
    renderFilterChips();
    renderCards();
  }

  async function init(){
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    const res = await fetch("./content/posts.json");
    if (!res.ok) throw new Error(`posts.json fetch failed: ${res.status}`);
    const data = await res.json();

    state.posts = enrichPosts(data.posts || []);

    // One-time event delegation setup (handlers stay bound across re-renders).
    setupEventDelegation();

    // Hydrate initial state from URL (deep-link support).
    readStateFromUrl();

    if (searchInput){
      // Debounce URL writes so typing doesn't flood history.
      let searchTimer = null;
      searchInput.addEventListener("input", (e) => {
        state.q = e.target.value || "";
        resetVisibleBelow();
        renderAll();
        clearTimeout(searchTimer);
        searchTimer = setTimeout(serializeStateToUrl, 400);
      });
    }

    if (loadMoreBtnEl){
      loadMoreBtnEl.addEventListener("click", () => {
        state.visibleBelowCount += LOAD_MORE_STEP;
        renderCards();
      });
    }

    // Back/forward navigation re-reads URL state.
    window.addEventListener("popstate", () => {
      syncingFromUrl = true;
      readStateFromUrl();
      renderAll();
      syncingFromUrl = false;
    });

    renderAll();
  }

  init().catch((e) => {
    console.error(e);
    cardsEl.innerHTML = `
      <div class="empty">
        <strong>Could not load posts.</strong>
        <div class="muted" style="margin-top:6px;">Check that <code>content/posts.json</code> exists and is valid JSON.</div>
      </div>
    `;
  });
})();
