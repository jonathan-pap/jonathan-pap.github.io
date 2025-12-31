(function () {
  const archiveEl = document.getElementById("archiveList");
  const categoriesEl = document.getElementById("categoriesList");
  const tagsEl = document.getElementById("tagsList");
  const cardsEl = document.getElementById("cardsGrid");
  const countEl = document.getElementById("articlesCount");
  const yearEl = document.getElementById("year");

  const searchInput = document.getElementById("searchInput");
  const chipsEl = document.getElementById("activeFilters");

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const fmt = new Intl.DateTimeFormat(undefined, { year:"numeric", month:"short", day:"2-digit" });

  const state = {
    posts: [],
    q: "",
    category: "All Articles",
    tag: "All",
    archive: null,            // {year, month}
    openYears: new Set(),
    openMonths: new Set(),    // key `${year}-${month}`
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
    if (p.readTime) return p.readTime;
    const text = `${p.title || ""} ${p.excerpt || ""}`.trim();
    const words = text ? text.split(/\s+/).length : 0;
    return Math.max(1, Math.round(words / 180));
  }

  function enrichPosts(posts){
    return (posts || []).map(p => {
      const dt = parseDateSafe(p.date);
      const year = dt ? dt.getFullYear() : 0;
      const month = dt ? dt.getMonth() : 0;
      return { ...p, _dt: dt, _year: year, _month: month };
    }).sort((a,b) => (b._dt?.getTime()||0) - (a._dt?.getTime()||0));
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
    const years = new Map();
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

  function setCategory(name){ state.category = name; renderAll(); }
  function setTag(name){ state.tag = name || "All"; renderAll(); }

  function setArchive(year, month){
    state.archive = { year, month };
    state.openYears.add(year);
    state.openMonths.add(`${year}-${month}`);
    renderAll();
  }

  function clearArchive(){ state.archive = null; renderAll(); }
  function clearCategory(){ state.category = "All Articles"; renderAll(); }
  function clearTag(){ state.tag = "All"; renderAll(); }
  function clearSearch(){ state.q = ""; searchInput.value = ""; renderAll(); }

  function toggleYear(year){
    if (state.openYears.has(year)) state.openYears.delete(year);
    else state.openYears.add(year);
    renderArchive();
  }

  function toggleMonth(year, month){
    const key = `${year}-${month}`;
    if (state.openMonths.has(key)) state.openMonths.delete(key);
    else state.openMonths.add(key);
    renderArchive();
  }

  function filteredPosts(){
    const q = normalize(state.q);
    const cat = state.category;
    const tag = state.tag;
    const arch = state.archive;

    return state.posts.filter(p => {
      const pCat = p.category || "Uncategorized";
      if (cat !== "All Articles" && pCat !== cat) return false;

      if (tag !== "All") {
        const tags = (p.tags || []).map(String);
        if (!tags.includes(tag)) return false;
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

  function renderCategories(){
    const cats = buildCategories(state.posts);
    categoriesEl.innerHTML = cats.map(c => {
      const active = (state.category === c.name) ? "active" : "";
      return `
        <div class="cat ${active}" role="button" tabindex="0" data-cat="${escapeHtml(c.name)}">
          <div class="cat-left"><span>${escapeHtml(c.name)}</span></div>
          <div class="cat-count">${c.count}</div>
        </div>
      `;
    }).join("");

    categoriesEl.querySelectorAll("[data-cat]").forEach(el => {
      el.addEventListener("click", () => setCategory(el.getAttribute("data-cat")));
      el.addEventListener("keydown", (e) => { if (e.key === "Enter") setCategory(el.getAttribute("data-cat")); });
    });
  }

  function renderSidebarTags(){
    const tags = buildTags(state.posts).slice(0, 12);
    tagsEl.innerHTML = tags.map(t => {
      const active = (state.tag === t.name) ? "active" : "";
      return `
        <button class="sidebar-tagbtn ${active}" type="button" data-tag="${escapeHtml(t.name)}">
          <span>#${escapeHtml(t.name)}</span>
          <span class="sidebar-tagcount">(${t.count})</span>
        </button>
      `;
    }).join("");

    tagsEl.querySelectorAll("[data-tag]").forEach(btn => {
      btn.addEventListener("click", () => setTag(btn.getAttribute("data-tag")));
    });
  }

  function renderArchive(){
    const archive = buildArchive(state.posts);

    if (state.openYears.size === 0 && archive.length){
      state.openYears.add(archive[0].year);
    }

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
              const active = (state.archive && state.archive.year === m.year && state.archive.month === m.month) ? "active" : "";
              return `
                <div class="arch-month ${active}">
                  <button class="arch-month-btn" type="button" data-month="${key}" aria-expanded="${monthOpen}">
                    <span class="arch-left">
                      <span class="arch-chevron">${monthOpen ? "▾" : "▸"}</span>
                      <span class="arch-month-label">${escapeHtml(m.label)}</span>
                      <span class="arch-month-count">(${m.count})</span>
                    </span>
                    <span class="arch-action">View</span>
                  </button>

                  <div class="arch-posts" ${monthOpen ? "" : "hidden"}>
                    ${m.posts.map(p => {
                      const dt = p._dt ? fmt.format(p._dt) : "";
                      return `
                        <a class="arch-post" href="./post.html?slug=${encodeURIComponent(p.slug)}" title="${escapeHtml(p.title||"")}">
                          <span class="arch-post-title">${escapeHtml(p.title || "Untitled")}</span>
                          <span class="arch-post-date">${escapeHtml(dt)}</span>
                        </a>
                      `;
                    }).join("")}
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `;
    }).join("");

    archiveEl.querySelectorAll("[data-year]").forEach(btn => {
      btn.addEventListener("click", () => toggleYear(Number(btn.getAttribute("data-year"))));
    });

    archiveEl.querySelectorAll("[data-month]").forEach(btn => {
      btn.addEventListener("click", () => {
        const [y, m] = btn.getAttribute("data-month").split("-").map(Number);
        toggleMonth(y, m);
        setArchive(y, m);
      });
    });
  }

  function renderCards(){
    const posts = filteredPosts();
    countEl.textContent = `${posts.length} article${posts.length === 1 ? "" : "s"}`;

    if (!posts.length){
      cardsEl.innerHTML = `
        <div class="empty">
          <strong>No matches.</strong>
          <div class="muted" style="margin-top:6px;">Try clearing filters or adjusting search.</div>
        </div>
      `;
      return;
    }

    cardsEl.innerHTML = posts.map(p => {
      const dt = p._dt ? fmt.format(p._dt) : "";
      const cat = p.category || "Article";
      const rt = getReadTimeMinutes(p);
      const tags = (p.tags || []).slice(0, 4).map(t => `#${t}`).join("  ");
      const author = p.author || "Author";
      const avatar = (author[0] || "A").toUpperCase();

      return `
        <a class="card" href="./post.html?slug=${encodeURIComponent(p.slug)}">
          <div class="card-media">
            <div class="placeholder"></div>
            <div class="pill">${escapeHtml(cat)}</div>
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
                  <div style="font-weight:900;">${escapeHtml(author)}</div>
                  <div style="opacity:.75;font-size:12px;">${escapeHtml(dt)}</div>
                </div>
              </div>

              <div class="readtime" title="Estimated reading time">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 7v5l3 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" stroke-width="2"/>
                </svg>
                <span>${rt} min min</span>
              </div>
            </div>
          </div>
        </a>
      `;
    }).join("");
  }

  function renderFilterChips(){
    const chips = [];

    if (state.archive){
      chips.push({
        key: "archive",
        label: `${monthNames[state.archive.month]} ${state.archive.year}`,
        clear: clearArchive
      });
    }
    if (state.category !== "All Articles"){
      chips.push({ key: "category", label: state.category, clear: clearCategory });
    }
    if (state.tag !== "All"){
      chips.push({ key: "tag", label: `#${state.tag}`, clear: clearTag });
    }
    if (state.q){
      chips.push({ key: "search", label: `Search: "${state.q}"`, clear: clearSearch });
    }

    if (!chips.length){
      chipsEl.innerHTML = "";
      return;
    }

    chipsEl.innerHTML = chips.map(c => `
      <button class="filterchip" type="button" data-chip="${escapeHtml(c.key)}">
        <span class="filterchip-label">${escapeHtml(c.label)}</span>
        <span class="filterchip-x">×</span>
      </button>
    `).join("");

    chipsEl.querySelectorAll("[data-chip]").forEach(btn => {
      const key = btn.getAttribute("data-chip");
      btn.addEventListener("click", () => {
        const match = chips.find(x => x.key === key);
        if (match) match.clear();
      });
    });
  }

  function renderAll(){
    if (searchInput.value !== state.q) searchInput.value = state.q;

    renderArchive();
    renderCategories();
    renderSidebarTags();
    renderFilterChips();
    renderCards();
  }

  async function init(){
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    const res = await fetch("./content/posts.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`posts.json fetch failed: ${res.status}`);
    const data = await res.json();

    state.posts = enrichPosts(data.posts || []);

    searchInput.addEventListener("input", (e) => {
      state.q = e.target.value || "";
      renderAll();
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
