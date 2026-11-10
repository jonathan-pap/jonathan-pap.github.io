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
      gridEl.innerHTML = list.map((s) => cardHtml(s, s.articleUrl)).join("");
      countEl.textContent = `${list.length} ${list.length === 1 ? "short" : "shorts"}`;
      wireShortFrames(gridEl, list, { updateHash: true });

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
