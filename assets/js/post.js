(function () {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const titleEl = document.getElementById("postTitle");
  const dateEl = document.getElementById("postDate");
  const catEl = document.getElementById("postCategory");
  const tagsEl = document.getElementById("postTags");
  const bodyEl = document.getElementById("postBody");
  const errorEl = document.getElementById("postError");
  const errorMsgEl = document.getElementById("postErrorMsg");

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

  function showError(msg) {
    errorEl.hidden = false;
    errorMsgEl.textContent = msg;
    bodyEl.innerHTML = "";
  }

  async function init() {
    const slug = getSlug();
    if (!slug) {
      titleEl.textContent = "Missing post slug";
      showError("Open a post from the Articles page.");
      return;
    }

    if (!window.marked || typeof window.marked.parse !== "function") {
      titleEl.textContent = "Renderer missing";
      showError("Markdown renderer did not load (marked).");
      return;
    }

    try {
      const metaRes = await fetch("./content/posts.json", { cache: "no-store" });
      if (!metaRes.ok) throw new Error(`posts.json ${metaRes.status}`);
      const meta = await metaRes.json();

      const post = (meta.posts || []).find(p => p.slug === slug);
      if (!post) {
        titleEl.textContent = "Post not found";
        showError(`No post for slug: ${slug}`);
        return;
      }

      document.title = `${post.title} • TechBlog`;
      titleEl.textContent = post.title || "Untitled";
      dateEl.textContent = post.date ? fmt.format(new Date(post.date)) : "";
      catEl.innerHTML = post.category ? `<span class="tagpill">${escapeHtml(post.category)}</span>` : "";
      tagsEl.innerHTML = (post.tags || []).map(t => `<span class="tagpill">#${escapeHtml(t)}</span>`).join(" ");

      const mdUrl = `./content/posts/${encodeURIComponent(slug)}.md`;
      const mdRes = await fetch(mdUrl, { cache: "no-store" });
      if (!mdRes.ok) throw new Error(`markdown ${mdRes.status}`);

      const md = await mdRes.text();
      bodyEl.innerHTML = window.marked.parse(md, { mangle: false, headerIds: true });
      errorEl.hidden = true;

    } catch (e) {
      console.error(e);
      titleEl.textContent = "Error loading post";
      showError(String(e));
    }
  }

  init();
})();
