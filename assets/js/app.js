(function () {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const categoriesEl = document.getElementById("categories");
  const tagsEl = document.getElementById("tags");
  const cardsEl = document.getElementById("cards");
  const emptyEl = document.getElementById("emptyState");
  const countEl = document.getElementById("articleCount");

  const searchInput = document.getElementById("searchInput");

  // Custom dropdown elements
  const tagDD = document.getElementById("tagDD");
  const tagDDButton = document.getElementById("tagDDButton");
  const tagDDValue = document.getElementById("tagDDValue");
  const tagDDMenu = document.getElementById("tagDDMenu");

  let allPosts = [];
  let state = { q: "", category: "All Articles", tag: "" };

  const fmt = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit" });

  function normalize(s){ return String(s || "").toLowerCase().trim(); }
  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  function initials(name) {
    const parts = String(name || "").split(" ").filter(Boolean);
    return ((parts[0]?.[0] || "A") + (parts[1]?.[0] || "")).toUpperCase();
  }

  function setTag(tag) {
    state.tag = tag || "";
    tagDDValue.textContent = state.tag || "All";
    applyAndRender();
    closeDD();
  }

  function openDD() {
    tagDDMenu.hidden = false;
    tagDDButton.setAttribute("aria-expanded", "true");
    // Focus first selected item or first item
    const selected = tagDDMenu.querySelector('.dd-item[aria-selected="true"]');
    (selected || tagDDMenu.querySelector(".dd-item"))?.focus();
  }

  function closeDD() {
    tagDDMenu.hidden = true;
    tagDDButton.setAttribute("aria-expanded", "false");
  }

  function toggleDD() {
    if (tagDDMenu.hidden) openDD();
    else closeDD();
  }

  function buildTagDropdown(posts) {
    const tagCounts = new Map();
    for (const p of posts) for (const t of (p.tags || [])) tagCounts.set(t, (tagCounts.get(t) || 0) + 1);

    const allTagNames = Array.from(tagCounts.keys()).sort((a,b)=>a.localeCompare(b));

    // Build listbox items
    tagDDMenu.innerHTML = "";

    // All option
    const allItem = document.createElement("div");
    allItem.className = "dd-item";
    allItem.setAttribute("role", "option");
    allItem.setAttribute("tabindex", "0");
    allItem.dataset.value = "";
    allItem.setAttribute("aria-selected", state.tag === "" ? "true" : "false");
    allItem.innerHTML = `
      <div class="dd-item-left">
        <div class="dd-item-label">All</div>
      </div>
      <div class="dd-item-count">${posts.length}</div>
    `;
    allItem.addEventListener("click", () => setTag(""));
    tagDDMenu.appendChild(allItem);

    for (const t of allTagNames) {
      const item = document.createElement("div");
      item.className = "dd-item";
      item.setAttribute("role", "option");
      item.setAttribute("tabindex", "0");
      item.dataset.value = t;
      item.setAttribute("aria-selected", state.tag === t ? "true" : "false");

      item.innerHTML = `
        <div class="dd-item-left">
          <div class="dd-item-label">${escapeHtml(t)}</div>
        </div>
        <div class="dd-item-count">${tagCounts.get(t)}</div>
      `;

      item.addEventListener("click", () => setTag(t));
      tagDDMenu.appendChild(item);
    }
  }

  function syncDropdownSelection() {
    const items = tagDDMenu.querySelectorAll(".dd-item");
    items.forEach(el => {
      const v = el.dataset.value || "";
      el.setAttribute("aria-selected", v === state.tag ? "true" : "false");
    });
    tagDDValue.textContent = state.tag || "All";
  }

  function buildSidebar(posts) {
    const counts = new Map();
    for (const p of posts) {
      const c = p.category || "Uncategorized";
      counts.set(c, (counts.get(c) || 0) + 1);
    }

    const categories = [
      { name: "All Articles", count: posts.length },
      ...Array.from(counts.entries())
        .sort((a,b) => b[1] - a[1])
        .map(([name,count]) => ({ name, count }))
    ];

    categoriesEl.innerHTML = "";
    for (const c of categories) {
      const div = document.createElement("div");
      div.className = "cat" + (state.category === c.name ? " active" : "");
      div.setAttribute("role", "button");
      div.setAttribute("tabindex", "0");

      div.innerHTML = `
        <div class="cat-left">
          <span>${escapeHtml(c.name)}</span>
        </div>
        <div class="cat-count">${c.count}</div>
      `;

      div.addEventListener("click", () => {
        state.category = c.name;
        applyAndRender();
        buildSidebar(allPosts);
      });

      div.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") div.click();
      });

      categoriesEl.appendChild(div);
    }

    // Popular tags chips
    const tagCounts = new Map();
    for (const p of posts) for (const t of (p.tags || [])) tagCounts.set(t, (tagCounts.get(t) || 0) + 1);

    const popular = Array.from(tagCounts.entries()).sort((a,b)=>b[1]-a[1]).slice(0, 10);
    tagsEl.innerHTML = "";
    for (const [t, n] of popular) {
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.innerHTML = `<span>#${escapeHtml(t)}</span> <strong>(${n})</strong>`;
      chip.addEventListener("click", () => { setTag(t); syncDropdownSelection(); });
      tagsEl.appendChild(chip);
    }
  }

  function matchesFilters(p) {
    const q = normalize(state.q);
    const tag = normalize(state.tag);
    const cat = normalize(state.category);

    const hay = normalize([p.title, p.excerpt, p.category, ...(p.tags || [])].join(" "));
    const okQ = q ? hay.includes(q) : true;
    const okT = tag ? (p.tags || []).some(t => normalize(t) === tag) : true;
    const okC = (cat && cat !== normalize("All Articles")) ? normalize(p.category || "") === cat : true;

    return okQ && okT && okC;
  }

  function renderCards(posts) {
    cardsEl.innerHTML = "";
    if (!posts.length) { emptyEl.hidden = false; return; }
    emptyEl.hidden = true;

    for (const p of posts) {
      const a = document.createElement("a");
      a.className = "card";
      a.href = `./post.html?slug=${encodeURIComponent(p.slug)}`;

      const dateText = p.date ? fmt.format(new Date(p.date)) : "";
      const hashTags = (p.tags || []).slice(0, 3).map(t => `#${t}`).join("  ");
      const authorName = p.author?.name || "Author";
      const time = p.readTime || "";

      a.innerHTML = `
        <div class="card-media">
          <div class="placeholder" aria-hidden="true"></div>
          <div class="pill">${escapeHtml(p.category || "Article")}</div>
        </div>

        <div class="card-body">
          <h3 class="card-title">${escapeHtml(p.title || "Untitled")}</h3>
          <p class="card-excerpt">${escapeHtml(p.excerpt || "")}</p>
          <div class="hashes">${escapeHtml(hashTags)}</div>
          <div class="divider"></div>

          <div class="card-foot">
            <div class="author">
              <div class="avatar"><span>${escapeHtml(initials(authorName))}</span></div>
              <div>
                <div style="font-weight:950; color: rgba(255,255,255,0.88); line-height:1.1;">${escapeHtml(authorName)}</div>
                <div style="color: rgba(255,255,255,0.62); font-size:12px;">${escapeHtml(dateText)}</div>
              </div>
            </div>

            <div class="readtime" title="Estimated read time">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                <path d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10Z" stroke="currentColor" stroke-width="1.6"/>
              </svg>
              <span>${escapeHtml(time)}</span>
            </div>
          </div>
        </div>
      `;

      cardsEl.appendChild(a);
    }
  }

  function applyAndRender() {
    const filtered = allPosts.filter(matchesFilters);
    countEl.textContent = String(filtered.length);
    renderCards(filtered);
  }

  // ---- Dropdown interactions ----
  tagDDButton.addEventListener("click", toggleDD);

  // Close when clicking outside
  document.addEventListener("click", (e) => {
    if (!tagDD.contains(e.target) && !tagDDMenu.hidden) closeDD();
  });

  // Keyboard: button
  tagDDButton.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openDD();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      closeDD();
    }
  });

  // Keyboard: menu navigation
  tagDDMenu.addEventListener("keydown", (e) => {
    const items = Array.from(tagDDMenu.querySelectorAll(".dd-item"));
    const idx = items.indexOf(document.activeElement);

    if (e.key === "Escape") {
      e.preventDefault();
      closeDD();
      tagDDButton.focus();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = items[Math.min(idx + 1, items.length - 1)] || items[0];
      next?.focus();
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = items[Math.max(idx - 1, 0)] || items[0];
      prev?.focus();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const v = document.activeElement?.dataset?.value;
      setTag(v || "");
      syncDropdownSelection();
      tagDDButton.focus();
    }
  });

  async function init() {
    const res = await fetch("./content/posts.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`posts.json fetch failed: ${res.status}`);
    const data = await res.json();

    allPosts = (data.posts || []).slice().sort((a,b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });

    buildSidebar(allPosts);
    buildTagDropdown(allPosts);
    syncDropdownSelection();

    searchInput.addEventListener("input", (e) => {
      state.q = e.target.value || "";
      applyAndRender();
    });

    applyAndRender();
  }

  init().catch((e) => {
    console.error(e);
    emptyEl.hidden = false;
    emptyEl.innerHTML = `<h3>Load error</h3><p>Could not load <code>content/posts.json</code>.</p>`;
  });
})();
