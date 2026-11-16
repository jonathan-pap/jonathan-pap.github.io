/* Gold Layer Lab: the experiment cards on lab.html and the "From the Lab" block on the home page.
   Both come from the Lab entries in content/posts.json (lane "lab"). Needs app.js (window.SiteBlog).
   With no Lab entries published, the static "coming soon" text in the page stays as it is.
   lab.html has the same rail as Articles: a search box and Topics (the entries' "kind"), which turn into
   a row of chips on phones. The state lives in the address (?topic=Anime&q=voice) so a view can be shared. */
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

  function setUpLabPage(entries) {
    const topicNav = document.getElementById("labTopicNav");
    const formEl = document.getElementById("labSearchForm");
    const searchEl = document.getElementById("labSearch");
    const clearEl = document.getElementById("labClear");
    const params = new URLSearchParams(location.search);
    const state = { topic: params.get("topic") || "", q: params.get("q") || "" };
    const topics = [...new Set(entries.map((p) => p.kind).filter(Boolean))].sort();
    if (!topics.includes(state.topic)) state.topic = "";

    const matchesText = (p) => {
      const words = state.q.toLowerCase().split(/\s+/).filter(Boolean);
      const hay = [p.title, p.excerpt, p.kind, p.status, p.question, p.tools, p.lesson, ...(p.tags || [])]
        .filter(Boolean).join(" ").toLowerCase();
      return words.every((w) => hay.includes(w));
    };
    function url(change) {
      const next = { ...state, ...change };
      const q = new URLSearchParams();
      if (next.topic) q.set("topic", next.topic);
      if (next.q.trim()) q.set("q", next.q.trim());
      const qs = q.toString();
      return `./lab.html${qs ? "?" + qs : ""}`;
    }
    const navItem = (key, label, n, active) => `
      <li><a href="${escapeHtml(url({ topic: key }))}" data-topic="${escapeHtml(key)}"${active ? ' aria-current="page"' : ""}>
        <span>${escapeHtml(label)}</span><span class="side-count">${n}</span></a></li>`;
    const noun = (n) => `${n} experiment${n === 1 ? "" : "s"}`;

    function render() {
      const byText = entries.filter(matchesText);
      if (topicNav) {
        topicNav.innerHTML = [["", "All experiments", byText.length], ...topics.map((t) => [t, t, byText.filter((p) => p.kind === t).length])]
          .map(([k, label, n]) => navItem(k, label, n, k === state.topic)).join("");
      }
      if (searchEl && searchEl.value !== state.q) searchEl.value = state.q;
      const list = byText.filter((p) => !state.topic || p.kind === state.topic);
      const filtering = state.topic || state.q.trim();
      if (clearEl) clearEl.hidden = !filtering;
      if (count) count.textContent = filtering ? `${list.length} of ${noun(entries.length)}` : noun(entries.length);
      grid.innerHTML = list.length ? list.map(cardHtml).join("")
        : `<div class="empty"><strong>No experiments match.</strong>
             <p style="margin-top:6px">Try another search, or <button type="button" class="linkbtn" data-clear>clear the filters</button>.</p></div>`;
    }
    function update() {
      try { history.replaceState(null, "", url({}) + location.hash); } catch (e) { /* opened from disk */ }
      render();
    }
    function clearAll() { state.topic = ""; state.q = ""; update(); }

    if (topicNav) topicNav.addEventListener("click", (e) => {
      const a = e.target.closest("a[data-topic]");
      if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      state.topic = a.dataset.topic;
      update();
    });
    if (searchEl) {
      let timer = null;
      searchEl.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(() => { state.q = searchEl.value; update(); }, 150);
      });
    }
    if (formEl) formEl.addEventListener("submit", (e) => { e.preventDefault(); state.q = searchEl.value; update(); });
    if (clearEl) clearEl.addEventListener("click", clearAll);
    grid.addEventListener("click", (e) => { if (e.target.closest("[data-clear]")) clearAll(); });

    grid.hidden = false;
    if (soon) soon.hidden = true;
    render();
  }

  loadLab()
    .then((entries) => {
      if (!entries.length) return;  // keep the "coming soon" text
      if (grid) setUpLabPage(entries);
      if (fromLab) {
        fromLab.innerHTML = `<ul>${entries.slice(0, 2).map((p) =>
          `<li><a href="${postUrl(p)}">${escapeHtml(p.title)}</a><span>${[p.kind, p.status].filter(Boolean).map(escapeHtml).join(" · ")}</span></li>`).join("")}</ul>`;
      }
    })
    .catch((err) => console.error(err));  // the static text stays
})();
