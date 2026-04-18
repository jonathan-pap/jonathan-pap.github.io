/**
 * back-to-top.js — tiny, framework-free back-to-top button.
 *
 * Reveals the button after 800px of scroll, hides it otherwise.
 * On click, smoothly scrolls to the top (or instantly if the user
 * has prefers-reduced-motion).
 */
(function () {
  const btn = document.getElementById("backToTop");
  if (!btn) return;

  const REVEAL_AFTER = 800;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let scheduled = false;
  function update() {
    scheduled = false;
    const show = window.scrollY > REVEAL_AFTER;
    btn.classList.toggle("is-visible", show);
  }
  function onScroll() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  }

  btn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  });

  window.addEventListener("scroll", onScroll, { passive: true });
  update();
})();
