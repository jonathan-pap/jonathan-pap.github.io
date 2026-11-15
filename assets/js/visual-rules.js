/* Visual rules page (visual-rules.html): renders content/visual-rules.json with filters in the left column.
   The data is a copy of tooling/visual-rules/rules.json (the single source of truth); copy it again after editing rules there.
   Filters work like Topics on the home page: one choice per group, "All" resets it. State lives in the URL (?cat=&sev=&chk=&q=). */
(function () {
  "use strict";

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const SEV_ORDER = { error: 0, warning: 1, info: 2 };
  const SEV_LABEL = { error: "Error", warning: "Warning", info: "Info" };
  const CHK_LABEL = { yes: "Yes", partly: "Partly", no: "No" };
  const STRENGTH = { explicit: "Learn says it outright", recommendation: "Learn recommends it" };
  const SOURCE_NAME = {
    "tips": "Tips for creating reports",
    "dashboard-tips": "Dashboard design tips",
    "accessibility": "Creating accessible reports",
    "optimization": "Optimization guide for Power BI",
    "visualizations": "Visualizations in Power BI reports",
    "mobile": "Mobile-optimized reports",
    "report-skill": "Power BI report skill for agents",
  };

  const el = (id) => document.getElementById(id);
  const listEl = el("vrList"), countEl = el("vrCount"), clearEl = el("vrClear"), searchEl = el("vrSearch");
  const params = new URLSearchParams(location.search);
  const state = { cat: params.get("cat") || "", sev: params.get("sev") || "", chk: params.get("chk") || "", q: params.get("q") || "" };
  let DATA = null;

  function syncUrl() {
    const p = new URLSearchParams();
    for (const k of ["cat", "sev", "chk", "q"]) if (state[k]) p.set(k, state[k]);
    const qs = p.toString();
    history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
  }

  function filterList(ulId, key, values, label, field) {
    const ul = el(ulId);
    const n = (v) => DATA.rules.filter((r) => r[field] === v).length;
    ul.innerHTML = [["", DATA.rules.length], ...values.map((v) => [v, n(v)])].map(([v, c]) => `
      <li><a href="#" data-k="${key}" data-v="${esc(v)}"${state[key] === v ? ' aria-current="true"' : ""}>
        <span>${esc(v ? label(v) : "All")}</span><span class="side-count">${c}</span></a></li>`).join("");
  }

  function renderFilters() {
    filterList("vrCat", "cat", DATA.categories, (v) => v, "category");
    filterList("vrSev", "sev", Object.keys(DATA.severities), (v) => SEV_LABEL[v] || v, "severity");
    filterList("vrChk", "chk", ["yes", "partly", "no"], (v) => CHK_LABEL[v], "check");
  }

  function ruleHtml(r) {
    const src = DATA.sources[r.source];
    return `
      <article class="vr-rule vr-rule--${esc(r.severity)}" id="${esc(r.id)}">
        <div class="vr-top"><span class="vr-sev vr-sev--${esc(r.severity)}">${esc(SEV_LABEL[r.severity] || r.severity)}</span><span class="vr-cat">${esc(r.category)}</span><a class="vr-id" href="#${esc(r.id)}">${esc(r.id)}</a></div>
        <h3>${esc(r.rule)}</h3>
        <blockquote>&ldquo;${esc(r.quote)}&rdquo;</blockquote>
        <dl class="vr-facts">
          <div><dt>Source</dt><dd>${src ? `<a href="${esc(src)}" rel="noopener">${esc(SOURCE_NAME[r.source] || r.source)}</a>` : esc(r.source)} · ${esc(STRENGTH[r.learnStrength] || r.learnStrength)}</dd></div>
          <div><dt>Script can check it</dt><dd>${esc(CHK_LABEL[r.check] || r.check)}${r.checkHint ? ` · looks at ${esc(r.checkHint)}` : ""}</dd></div>
        </dl>
      </article>`;
  }

  function render() {
    const q = state.q.toLowerCase();
    const rows = DATA.rules
      .filter((r) => !state.cat || r.category === state.cat)
      .filter((r) => !state.sev || r.severity === state.sev)
      .filter((r) => !state.chk || r.check === state.chk)
      .filter((r) => !q || [r.id, r.rule, r.quote, r.checkHint, r.category].join(" ").toLowerCase().includes(q))
      .sort((a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9) || a.id.localeCompare(b.id));
    const filtered = state.cat || state.sev || state.chk || state.q;
    countEl.textContent = filtered ? `${rows.length} of ${DATA.rules.length} rules` : `${DATA.rules.length} rules`;
    clearEl.hidden = !filtered;
    listEl.innerHTML = rows.length ? rows.map(ruleHtml).join("") : '<p class="empty">No rules match these filters.</p>';
    renderFilters();
    syncUrl();
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest(".vr-filters a[data-k]");
    if (!a) return;
    e.preventDefault();
    state[a.dataset.k] = a.dataset.v;
    render();
  });
  clearEl.addEventListener("click", () => { state.cat = state.sev = state.chk = state.q = ""; searchEl.value = ""; render(); });
  searchEl.value = state.q;
  searchEl.addEventListener("input", () => { state.q = searchEl.value.trim(); render(); });

  fetch("./content/visual-rules.json", { cache: "no-cache" })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((data) => {
      DATA = data;
      el("vrAsOf").textContent = `Rules checked against Learn on ${data.asOf}.`;
      render();
      if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
    })
    .catch((err) => { console.error(err); countEl.textContent = "The rules could not be loaded."; });
})();
