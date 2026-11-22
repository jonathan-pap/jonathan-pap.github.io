/* Gold Layer Tools: search and Topics for the tool cards on tools.html, the same rail as Articles
   (chips on phones). The cards are plain HTML in the page; a card's topic is the text of its
   .tools-kind label. The state lives in the address (?topic=Checker&q=rules) so a view can be shared.
   Without JavaScript every card simply shows. */
(function () {
  "use strict";

  const grid = document.getElementById("toolsGrid");
  if (!grid) return;
  // Pinned cards (data-pinned) always come first, in their own order, whatever is added above them.
  [...grid.querySelectorAll(".tool-card[data-pinned]")].reverse().forEach((el) => grid.prepend(el));
  const cards = [...grid.querySelectorAll(".tool-card")].map((el) => ({
    el,
    topic: (el.querySelector(".tools-kind") || {}).textContent ? el.querySelector(".tools-kind").textContent.trim() : "",
    hay: el.textContent.toLowerCase(),
  }));
  const topicNav = document.getElementById("toolsTopicNav");
  const formEl = document.getElementById("toolsSearchForm");
  const searchEl = document.getElementById("toolsSearch");
  const clearEl = document.getElementById("toolsClear");
  const countEl = document.getElementById("toolsCount");
  const emptyEl = document.getElementById("toolsEmpty");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const params = new URLSearchParams(location.search);
  const state = { topic: params.get("topic") || "", q: params.get("q") || "" };
  const topics = [...new Set(cards.map((c) => c.topic).filter(Boolean))].sort();
  if (!topics.includes(state.topic)) state.topic = "";

  const matchesText = (c) => state.q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => c.hay.includes(w));
  function url(change) {
    const next = { ...state, ...change };
    const q = new URLSearchParams();
    if (next.topic) q.set("topic", next.topic);
    if (next.q.trim()) q.set("q", next.q.trim());
    const qs = q.toString();
    return `./tools.html${qs ? "?" + qs : ""}`;
  }
  const navItem = (key, label, n, active) => `
    <li><a href="${esc(url({ topic: key }))}" data-topic="${esc(key)}"${active ? ' aria-current="page"' : ""}>
      <span>${esc(label)}</span><span class="side-count">${n}</span></a></li>`;
  const noun = (n) => `${n} tool${n === 1 ? "" : "s"}`;

  function render() {
    const byText = cards.filter(matchesText);
    if (topicNav) {
      topicNav.innerHTML = [["", "All tools", byText.length], ...topics.map((t) => [t, t, byText.filter((c) => c.topic === t).length])]
        .map(([k, label, n]) => navItem(k, label, n, k === state.topic)).join("");
    }
    if (searchEl && searchEl.value !== state.q) searchEl.value = state.q;
    const shown = byText.filter((c) => !state.topic || c.topic === state.topic);
    cards.forEach((c) => { c.el.hidden = !shown.includes(c); });
    const filtering = state.topic || state.q.trim();
    if (clearEl) clearEl.hidden = !filtering;
    if (emptyEl) emptyEl.hidden = shown.length > 0;
    if (countEl) countEl.textContent = filtering ? `${shown.length} of ${noun(cards.length)}` : noun(cards.length);
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
  if (emptyEl) emptyEl.addEventListener("click", (e) => { if (e.target.closest("[data-clear]")) clearAll(); });

  render();

  // Reference sheets (a card link with data-sheet) open over the page, not as a bare picture in the tab.
  // Without JavaScript, or with a modified click, the link still opens the picture itself.
  let dlg = null, opener = null;
  function sheetDialog() {
    if (dlg) return dlg;
    dlg = document.createElement("dialog");
    dlg.className = "sheet-dlg";
    dlg.innerHTML = `
      <div class="sheet-bar">
        <span class="sheet-title"></span>
        <span class="sheet-actions">
          <a class="sheet-more" hidden></a>
          <a class="sheet-save" download>Save the picture</a>
          <button type="button" class="sheet-close" aria-label="Close">Close</button>
        </span>
      </div>
      <div class="sheet-scroll"><img alt=""></div>`;
    document.body.appendChild(dlg);
    dlg.querySelector(".sheet-close").addEventListener("click", () => dlg.close());
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });  // a click on the backdrop
    dlg.addEventListener("close", () => { if (opener) opener.focus(); });
    return dlg;
  }
  grid.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-sheet]");
    if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (typeof HTMLDialogElement === "undefined") return;  // very old browser: just follow the link
    e.preventDefault();
    const d = sheetDialog();
    opener = a;
    d.querySelector(".sheet-title").textContent = a.textContent.trim();
    d.setAttribute("aria-label", a.textContent.trim());
    const img = d.querySelector("img");
    img.src = a.href;
    img.alt = a.dataset.sheetAlt || a.textContent.trim();
    d.querySelector(".sheet-save").href = a.href;
    const more = d.querySelector(".sheet-more");
    more.hidden = !a.dataset.sheetMore;
    if (a.dataset.sheetMore) { more.href = a.dataset.sheetMore; more.textContent = (a.dataset.sheetMoreLabel || "Read more") + " →"; }
    d.querySelector(".sheet-scroll").scrollTop = 0;
    d.showModal();
  });
})();
