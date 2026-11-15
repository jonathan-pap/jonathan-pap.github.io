/* Gold Layer Lab: the experiment cards on lab.html and the "From the Lab" block on the home page.
   Both come from the Lab entries in content/posts.json (lane "lab"). Needs app.js (window.SiteBlog).
   With no Lab entries published, the static "coming soon" text in the page stays as it is. */
(function () {
  "use strict";

  const { loadLab, formatDate, escapeHtml, postUrl, siteUrl } = window.SiteBlog;
  const STATUS = { "works": "works", "in progress": "wip", "parked": "parked", "didn't work": "failed", "didn’t work": "failed" };
  const statusHtml = (p) => p.status
    ? `<span class="st st--${STATUS[String(p.status).toLowerCase()] || "wip"}">${escapeHtml(p.status)}</span>` : "";
  const shortDate = (p) => (p._dt ? formatDate(p._dt) : "");

  function cardHtml(p) {
    const img = p.image
      ? `<div class="lab-thumb"><img src="${escapeHtml(siteUrl(p.image))}" alt="" loading="lazy"></div>` : "";
    const lesson = p.lesson
      ? `<div class="lab-lesson"><b>WHAT IT TAUGHT US</b>${escapeHtml(p.lesson)}</div>` : "";
    return `
      <article class="lab-card">
        ${img}
        <div class="lab-body">
          <div class="lab-top">${p.kind ? `<span class="lab-kind lab-kind--accent">${escapeHtml(p.kind)}</span>` : ""}</div>
          <h3><a class="cover-link" href="${postUrl(p)}">${escapeHtml(p.title || "Untitled")}</a></h3>
          ${p.excerpt ? `<p>${escapeHtml(p.excerpt)}</p>` : ""}
          ${lesson}
          <div class="lab-foot">${statusHtml(p)}<span>${shortDate(p)}</span></div>
        </div>
      </article>`;
  }

  const grid = document.getElementById("labGrid");
  const count = document.getElementById("labCount");
  const soon = document.getElementById("labSoon");
  const fromLab = document.getElementById("fromLabList");

  loadLab()
    .then((entries) => {
      if (!entries.length) return;  // keep the "coming soon" text
      if (grid) {
        grid.innerHTML = entries.map(cardHtml).join("");
        grid.hidden = false;
        if (soon) soon.hidden = true;
        if (count) count.textContent = `${entries.length} experiment${entries.length === 1 ? "" : "s"}`;
      }
      if (fromLab) {
        fromLab.innerHTML = `<ul>${entries.slice(0, 2).map((p) =>
          `<li><a href="${postUrl(p)}">${escapeHtml(p.title)}</a><span>${[p.kind, p.status].filter(Boolean).map(escapeHtml).join(" · ")}</span></li>`).join("")}</ul>`;
      }
    })
    .catch((err) => console.error(err));  // the static text stays
})();
