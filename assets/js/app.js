(function () {
  const archiveEl = document.getElementById("archiveList");
  const categoriesEl = document.getElementById("categoriesList");
  const tagsEl = document.getElementById("tagsList");
  const cardsEl = document.getElementById("cardsGrid");
  const countEl = document.getElementById("articlesCount");
  const yearEl = document.getElementById("year");

  const searchInput = document.getElementById("searchInput");

  // Tag dropdown
  const tagBtn = document.getElementById("tagBtn");
  const tagValue = document.getElementById("tagValue");
  const tagMenu = document.getElementById("tagMenu");

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
    tagOpen: false,
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

  // ---------------- Renders ----------------

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
    const tags = buildTags(state.posts).slice(0, 10);
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

  function renderTagDropdown(){
    const tags = buildTags(state.posts);
    const opts = [{ name:"All", count: state.posts.length }, ...tags.map(t => ({ name:t.name, count:t.count }))];

    tagValue.textContent = state.tag;

    tagMenu.innerHTML = opts.map(o => {
      const selected = (state.tag === o.name) ? `aria-selected="true"` : `aria-selected="false"`;
      return `
        <div class="dd-item" role="opt
