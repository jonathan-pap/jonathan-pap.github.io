(function () {
  const postsGrid = document.getElementById("postsGrid");
  const emptyState = document.getElementById("emptyState");
  const searchInput = document.getElementById("searchInput");
  const tagSelect = document.getElementById("tagSelect");
  const year = document.getElementById("year");

  if (year) year.textContent = String(new Date().getFullYear());

  const fmt = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit" });

  let allPosts = [];

  function normalize(str) {
    return String(str || "").toLowerCase().trim();
  }

  function uniqueSorted(arr) {
    return Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));
  }

  function buildTags(posts) {
    const tags = uniqueSorted(posts.flatMap(p => (p.tags || [])));
    // reset
    tagSelect.innerHTML = `<option value="">All</option>`;
    for (const t of tags) {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      tagSelect.appendChild(opt);
    }
  }

  function render(posts) {
    postsGrid.innerHTML = "";

    if (!posts.length) {
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    for (const p of posts) {
      const a = document.createElement("a");
      a.className = "card";
      a.href = `./post.html?slug=${encodeURIComponent(p.slug)}`;

      const dateText = p.date ? fmt.format(new Date(p.date)) : "";
      const tags = (p.tags || []).slice(0, 3);

      a.innerHTML = `
        <h3 class="card-title">${escapeHtml(p.title || "Untitled")}</h3>
        <div class="card-meta">
          ${dateText ? `<span>${escapeHtml(dateText)}</span>` : ""}
          ${tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
        </div>
        <p class="card-excerpt">${escapeHtml(p.excerpt || "")}</p>
      `;

      postsGrid.appendChild(a);
    }
  }

  function applyFilters() {
    const q = normalize(searchInput.value);
    const tag = normalize(tagSelect.value);

    const filtered = allPosts.filter(p => {
      const hay = normalize([p.title, p.excerpt, ...(p.tags || [])].join(" "));
      const okQ = q ? hay.includes(q) : true;
      const okT = tag ? (p.tags || []).some(t => normalize(t) === tag) : true;
      return okQ && okT;
    });

    render(filtered);
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function init() {
    try {
      const res = await fetch("./content/posts.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`posts.json fetch failed: ${res.status}`);
      const data = await res.json();

      // newest first
      allPosts = (data.posts || []).slice().sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return db - da;
      });

      buildTags(allPosts);
      render(allPosts);

      searchInput.addEventListener("input", applyFilters);
      tagSelect.addEventListener("change", applyFilters);
    } catch (e) {
      console.error(e);
      emptyState.hidden = false;
      emptyState.innerHTML = `
        <h3>Site configuration issue</h3>
        <p>Could not load <code>content/posts.json</code>. Ensure it exists and is valid JSON.</p>
      `;
    }
  }

  init();
})();
