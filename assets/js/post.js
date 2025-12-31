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
  const debugEl = document.getElementById("debug");

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

  function showError(msg, debug) {
    errorEl.hidden = false;
    errorMsgEl.textContent = msg;
    bodyEl.innerHTML = "";
    if (debugEl && debug) {
      debugEl.style.display = "block";
      debugEl.innerHTML = debug;
    }
  }

  async function safeFetchText(url) {
    const res = await fetch(url, { cache: "no-store" });
    return { ok: res.ok, status: res.status, text: res.ok ? await res.text() : "" };
  }

  async function safeFetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    return { ok: res.ok, status: res.status, json: res.ok ? await res.json() : null };
  }

  async function init() {
    const slug = getSlug();
    if (!slug) {
      titleEl.textContent = "Missing post slug";
      showError("No slug provided. Open a post from the home page.", `Expected URL like <code>post.html?slug=your-post</code>`);
      return;
    }

    // If marked did not load, do not hang.
    if (!window.marked || typeof window.marked.parse !== "function") {
      titleEl.textContent = "Markdown renderer not available";
      showError(
        "The Markdown renderer (marked) did not load. Check your network / CSP / ad-blocker.",
        `Missing global <code>marked</code>. Ensure post.html includes the marked CDN script.`
      );
      return;
    }

    try {
      // 1) Load metadata
      const metaUrl = "./content/posts.json";
      const metaRes = await safeFetchJson(metaUrl);

      if (!metaRes.ok) {
        titleEl.textContent = "Post not available";
        showError(
          `Could not load posts index (${metaRes.status}).`,
          `Tried: <code>${escapeHtml(metaUrl)}</code><br/>Common cause: wrong path on GitHub Pages project sites. Use <code>./</code> paths.`
        );
        return;
      }

      const post = (metaRes.json.posts || []).find(p => p.slug === slug);
      if (!post) {
        titleEl.textContent = "Post not found";
        showError(
          `No post entry found for slug: "${slug}".`,
          `Check <code>content/posts.json</code> contains an item with <code>"slug": "${escapeHtml(slug)}"</code>.`
        );
        return;
      }

      // Set header info
      document.title = `${post.title} • TechBlog`;
      titleEl.textContent = post.title || "Untitled";
      dateEl.textContent = post.date ? fmt.format(new Date(post.date)) : "";
      catEl.innerHTML = post.category ? `<span class="tagpill">${escapeHtml(post.category)}</span>` : "";
      tagsEl.innerHTML = (post.tags || []).map(t => `<span class="tagpill">#${escapeHtml(t)}</span>`).join(" ");

      // 2) Load markdown
      const mdUrl = `./content/posts/${encodeURIComponent(slug)}.md`;
      const mdRes = await safeFetchText(mdUrl);

      if (!mdRes.ok) {
        showError(
          `Could not load the Markdown file (${mdRes.status}).`,
          `Tried: <code>${escapeHtml(mdUrl)}</code><br/>Ensure the file exists exactly as: <code>content/posts/${escapeHtml(slug)}.md</code>`
        );
        return;
      }

      // Render markdown
      const html = window.marked.parse(mdRes.text, { mangle: false, headerIds: true });
      bodyEl.innerHTML = html;
      errorEl.hidden = true;

    } catch (e) {
      console.error(e);
      titleEl.textContent = "Error loading post";
      showError("Unexpected error while loading this post.", escapeHtml(String(e)));
    }
  }

  init();
})();
