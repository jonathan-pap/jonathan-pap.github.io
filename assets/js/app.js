(function () {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const categoriesEl = document.getElementById("categories");
  const tagsEl = document.getElementById("tags");

  const articlesEl = document.getElementById("articles");
  const emptyStateEl = document.getElementById("emptyState");
  const articleCountEl = document.getElementById("articleCount");

  const searchInput = document.getElementById("searchInput");
  const tagSelect = document.getElementById("tagSelect");

  let allPosts = [];
  let state = {
    q: "",
    category: "All Articles",
    tag: ""
  };

  const fmt = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit" });

  function normalize(s) {
    return String(s || "").toLowerCase().trim();
  }

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
    const a = parts[0]?.[0] || "A";
    const b = parts[1]?.[0] || "";
    return (a + b).toUpperCase();
  }

  function iconSvg(kind) {
    // minimal set to match the vibe; you can extend
    const common = `fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"`;
    if (kind === "all") return `<svg viewBox="0 0 24 24"><path ${common} d="M5 4h14v16H5z"/><path ${common} d="M8 8h8M8 12h8M8 16h6"/></svg>`;
    if (kind === "tutorials") return `<svg viewBox="0 0 24 24"><path ${common} d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14"/><path ${common} d="M8 7h8M8 11h8M8 15h6"/></svg>`;
    if (kind === "insights") return `<svg viewBox="0 0 24 24"><path ${common} d="M4 19h16"/><path ${common} d="M7 16V9"/><path ${common} d="M12 16V6"/><path ${common} d="M17 16v-4"/></svg>`;
    return `<svg viewBox="0 0 24 24"><path ${common} d="M7 7h10v10H7z"/><path ${common} d="M9 4h6M9 20h6"/></svg>`;
  }

  function categoryKey(cat) {
    const c = normalize(cat);
    if (c.includes("tutorial")) return "tutorials";
    if (c.includes("insight")) return "insights";
    if (c.includes("all")) return "all";
    return "default";
  }

  function buildSidebar(posts) {
    // categories with counts
    const counts = new Map();
    for (const p of posts) {
      const c = p.category || "Uncategorized";
      counts.set(c, (counts.get(c) || 0) + 1);
    }

    // ensure All Articles on top
    const categories = [
      { name: "All Articles", count: posts.length },
      ...Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }))
    ];

    categoriesEl.innerHTML = "";
    for (const c of categories) {
      const div = document.createElement("div");
      div.className = "cat" + (state.category === c.name ? " active" : "");
      div.setAttribute("role", "button");
      div.setAttribute("tabindex", "0");

      div.innerHTML = `
        <div class="cat-left">
          <span class="cat-icon" aria-hidden="true">${iconSvg(categoryKey(c.name))}</span>
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

    // tags with counts
    const tagCounts = new Map();
    for (const p of posts) {
      for (const t of (p.tags || [])) {
        tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
      }
    }

    const tags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    tagsEl.innerHTML = "";
    for (const [t, n] of tags) {
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.innerHTML = `<span>#${escapeHtml(t)}</span> <strong>(${n})</strong>`;
      chip.addEventListener("click", () => {
        state.tag = t;
        tagSelect.value = t;
        applyAndRender();
      });
      tagsEl.appendChild(chip);
    }

    // tag dropdown
    const allTagNames = Array.from(tagCounts.keys()).sort((a, b) => a.localeCompare(b));
    tagSelect.innerHTML = `<option value="">All</option>` + allTagNames.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
    if (state.tag) tagSelect.value = state.tag;
  }

  function matchesFilters(p) {
    const q = normalize(state.q);
    const tag = normalize(state.tag);
    const cat = normalize(state.category);

    const hay = normalize([p.title, p.excerpt, p.category, ...(p.tags || [])].join(" "));

    const okQ = q ? hay.includes(q) : true;
    const okT = tag ? (p.tags || []).some(t => normalize(t) === tag) : true;
    const okC = (cat && cat !== normalize("All Articles"))
      ? normalize(p.category || "") === cat
      : true;

    return okQ && okT && okC;
  }

  function renderCards(posts) {
    articlesEl.innerHTML = "";

    if (!posts.length) {
      emptyStateEl.hidden = false;
      return;
    }
    emptyStateEl.hidden = true;

    for (const p of posts) {
      const a = document.createElement("a");
      a.className = "card";
      a.href = `./post.html?slug=${encodeURIComponent(p.slug)}`;

      const dateText = p.date ? fmt.format(new Date(p.date)) : "";
      const hashTags = (p.tags || []).slice(0, 3).map(t => `#${t}`).join("  ");
      const authorName = p.author?.name || "Author";
      const authorAvatar = p.author?.avatar || "";
      const time = p.readTime || "";

      a.innerHTML = `
        <div class="card-media">
          <img alt="" src="${escapeHtml(p.cover || "assets/img/cover-fallback.jpg")}" loading="lazy" />
          <div class="pill">${escapeHtml(p.category || "Article")}</div>
        </div>

        <div class="card-body">
          <h3 class="card-title">${escapeHtml(p.title || "Untitled")}</h3>
          <p class="card-excerpt">${escapeHtml(p.excerpt || "")}</p>

          <div class="hashes">${escapeHtml(hashTags)}</div>

          <div class="divider"></div>

          <div class="card-foot">
            <div class="author">
              <div class="avatar">
                ${authorAvatar
                  ? `<img alt="" src="${escapeHtml(authorAvatar)}" loading="lazy" />`
                  : `<span>${escapeHtml(initials(authorName))}</span>`
                }
              </div>
              <div>
                <div style="font-weight:800; color: rgba(255,255,255,0.88); line-height:1.1;">
                  ${escapeHtml(authorName)}
                </div>
                <div style="color: rgba(255,255,255,0.62); font-size:12px;">
                  ${escapeHtml(dateText)}
                </div>
              </div>
            </div>

            <div class="readtime" title="Estimated read time">
              <svg viewBox="0 0 24 24" fill="none"><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10Z" stroke="currentColor" stroke-width="1.6"/></svg>
              <span>${escapeHtml(time)}</span>
            </div>
          </div>
        </div>
      `;

      articlesEl.appendChild(a);
    }
  }

  function applyAndRender() {
    const filtered = allPosts.filter(matchesFilters);
    articleCountEl.textContent = String(filtered.length);
    renderCards(filtered);
  }

  async function init() {
    try {
      const res = await fetch("./content/posts.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`posts.json fetch failed: ${res.status}`);
      const data = await res.json();

      allPosts = (data.posts || []).slice().sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return db - da;
      });

      buildSidebar(allPosts);

      searchInput.addEventListener("input", (e) => {
        state.q = e.target.value || "";
        applyAndRender();
      });

      tagSelect.addEventListener("change", (e) => {
        state.tag = e.target.value || "";
        applyAndRender();
      });

      applyAndRender();
    } catch (e) {
      console.error(e);
      emptyStateEl.hidden = false;
      emptyStateEl.innerHTML = `
        <h3>Site configuration issue</h3>
        <p>Could not load <code>content/posts.json</code>. Ensure it exists and is valid JSON.</p>
      `;
    }
  }

  init();
})();
