(function () {
  const titleEl = document.getElementById("postTitle");
  const dateEl = document.getElementById("postDate");
  const tagsEl = document.getElementById("postTags");
  const bodyEl = document.getElementById("postBody");
  const errorEl = document.getElementById("postError");
  const year = document.getElementById("year");

  if (year) year.textContent = String(new Date().getFullYear());

  const fmt = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "long", day: "2-digit" });

  function getSlug() {
    const u = new URL(window.location.href);
    return u.searchParams.get("slug") || "";
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
    const slug = getSlug();
    if (!slug) {
      errorEl.hidden = false;
      titleEl.textContent = "Missing post slug";
      return;
    }

    try {
      const metaRes = await fetch("./content/posts.json", { cache: "no-store" });
      if (!metaRes.ok) throw new Error(`posts.json fetch failed: ${metaRes.status}`);
      const meta = await metaRes.json();
      const post = (meta.posts || []).find(p => p.slug === slug);

      if (!post) throw new Error(`No post found for slug: ${slug}`);

      document.title = `${post.title} • BluePurple Blog`;
      titleEl.textContent = post.title || "Untitled";
      dateEl.textContent = post.date ? fmt.format(new Date(post.date)) : "";
      tagsEl.innerHTML = (post.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join(" ");

      const mdRes = await fetch(`./content/posts/${encodeURIComponent(slug)}.md`, { cache: "no-store" });
      if (!mdRes.ok) throw new Error(`markdown fetch failed: ${mdRes.status}`);

      const md = await mdRes.text();

      // marked is loaded via CDN in post.html
      const html = window.marked.parse(md, { mangle: false, headerIds: true });
      bodyEl.innerHTML = html;
      errorEl.hidden = true;
    } catch (e) {
      console.error(e);
      errorEl.hidden = false;
      bodyEl.innerHTML = "";
      titleEl.textContent = "Post not available";
    }
  }

  init();
})();
