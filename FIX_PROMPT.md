# Fix Prompt: BluPulse Design Cleanup

Copy the block below into a fresh Claude Code / coding-agent session. It's self-contained and assumes the agent can read and edit files in `jonathan-pap.github.io/`.

---

## The Prompt

You're fixing design-system drift and a handful of accessibility issues in a static GitHub Pages blog called **BluPulse**. The site is three HTML files (`index.html`, `about.html`, `post.html`) sharing one stylesheet (`assets/css/styles.css`, ~1,440 lines). A prior design review produced `DESIGN_CRITIQUE.md` in the repo root — read it first for full context, but the concrete work to execute is below.

**Do not redesign.** The visual identity (dark navy + blue→purple gradient, sticky sidebar, TOC rail) should be preserved. Your job is consolidation, hierarchy, and a11y — not aesthetics.

Work in this order. Commit (or stop for review) after each numbered block.

### 1. Introduce canonical design tokens in `:root`

Add these custom properties to the existing `:root` block in `assets/css/styles.css`. Keep the existing `--blue`, `--purple`, `--radius`, `--shadow2`, `--max`, `--topnav-h`, `--bg0`, `--bg1`:

```css
/* Surfaces (translucent white over the dark gradient) */
--surface-1: rgba(255,255,255,0.04);
--surface-2: rgba(255,255,255,0.06);
--surface-hover: rgba(255,255,255,0.10);

/* Borders */
--border-subtle: rgba(255,255,255,0.08);
--border: rgba(255,255,255,0.12);
--border-strong: rgba(255,255,255,0.20);

/* Radii */
--radius-sm: 12px;
/* --radius: 18px already exists */
--radius-pill: 999px;

/* Type scale (7 steps) */
--fs-xs: 11px;
--fs-sm: 13px;
--fs-md: 15px;
--fs-lg: 17px;
--fs-xl: 20px;
--fs-2xl: 26px;
--fs-3xl: 34px;

/* Focus ring (accessibility fix) */
--focus-ring: 0 0 0 3px rgba(139,92,246,0.70);
```

Then migrate the stylesheet to these tokens. Mapping rules:

- Background `rgba(255,255,255,0.03|0.04|0.05)` → `var(--surface-1)`
- Background `rgba(255,255,255,0.06|0.07)` → `var(--surface-2)`
- Hover background `rgba(255,255,255,0.08|0.10)` → `var(--surface-hover)`
- Border `rgba(255,255,255,0.08|0.10)` → `var(--border-subtle)`
- Border `rgba(255,255,255,0.12|0.14)` → `var(--border)`
- Border `rgba(255,255,255,0.16|0.18|0.24)` → `var(--border-strong)`
- `border-radius: 10px|12px|14px` → `var(--radius-sm)`
- `border-radius: 999px` → `var(--radius-pill)`

**Do not** touch the brand gradients (`var(--blue)`→`var(--purple)`), the body `::before` radial gradients, the card-media placeholder gradient, the scrim colors (`rgba(9,12,32,...)`), or the DAX code colors.

### 2. Collapse font weights

Find all `font-weight: 550`, `650`, `750` in `styles.css` and round them:

- `550` → `500`
- `650` → `600`
- `750` → `700`

`800` stays. This is a global replace; verify nothing breaks visually.

### 3. Collapse font sizes (partial — safe renames only)

Do **not** global-replace sizes yet (that risks the hierarchy). Instead, make these specific swaps:

- `.content-title` → `font-size: 32px` (was 26px) — fixes the H1-loses-to-headliner bug.
- `.card--headliner .card-title` → `font-size: 26px` (was 30px).
- Every occurrence of `font-size: 12.5px`, `13.5px`, `15.5px` → round to `13px`, `14px`, `15px` respectively.
- `.card-title` stays at 19px — later pass can normalize to `var(--fs-lg)` (17px) if desired.

### 4. Fix the `:focus-visible` ring

The consolidated rule at the bottom of the stylesheet currently uses `box-shadow: 0 0 0 3px rgba(139,92,246,0.22)`. Replace with:

```css
outline: 2px solid rgba(139,92,246,0.95);
outline-offset: 2px;
box-shadow: var(--focus-ring);
```

This is critical for keyboard users. The outline is the fallback if `box-shadow` is disabled.

### 5. Fix touch-target sizes on coarse pointers

Append this block at the end of `styles.css`:

```css
@media (pointer: coarse) {
  .sf-link,
  .sidebar-tagbtn,
  .filterchip,
  .arch-post,
  .arch-month-btn,
  .navlink {
    min-height: 40px;
  }
  .sidebar-tagbtn,
  .filterchip {
    padding-top: 10px;
    padding-bottom: 10px;
  }
}
```

### 6. Raise placeholder and muted-text contrast

- `.search-input::placeholder` → change `rgba(255,255,255,0.46)` to `rgba(255,255,255,0.60)`.
- `.author-date`, `.arch-post-date`, `.arch-count`, `.arch-month-count` → raise any alpha under 0.60 to `0.66`.
- Do not touch `.muted` (already 0.72).

### 7. Tighten prose line-height

In `.prose`, change `line-height: 1.85` to `1.65`. In `.prose h2`, add `margin-top: 2.2em`. In `.prose h3`, change `margin-top: 1.6em` (already in the combined rule — split it so `h1/h2` get 2.2em and `h3` gets 1.6em).

### 8. Remove inline styles in `about.html`

Replace `style="max-width: 820px; margin: 0 auto;"` on the About panel and `style="margin-top: 24px"` on the footer with a new utility class. Add to `styles.css`:

```css
.panel--narrow { max-width: 820px; margin: 0 auto; }
.site-footer--about { margin-top: 24px; }
```

### 9. Mobile page gutter

Append to `styles.css`:

```css
@media (max-width: 760px) {
  .page { width: min(var(--max), calc(100% - 32px)); }
}
```

### 10. Verify

After all edits:
1. Open each page in a browser (or render with headless Chromium) at 360px, 768px, 1280px, and 1600px widths. Take screenshots to `/tmp/screenshots/` and visually confirm nothing broke.
2. Run a WCAG contrast check on: body text, `.muted`, `.author-date`, `.arch-post-date`, `.search-input::placeholder`, pill text over card media. Each must hit 4.5:1 against its effective composited background.
3. Tab through every page — every interactive element must show a clearly visible focus ring.
4. Diff the stylesheet — line count should be roughly similar or slightly smaller, not larger.

### Out of scope (do not do)

- Do not swap the font stack (that's a separate pass).
- Do not collapse the sidebar panels or change the articles-page layout.
- Do not touch `assets/js/`.
- Do not rewrite the HTML structure beyond the two inline-style removals in step 8.
- Do not add new dependencies, bundlers, or build steps — this is a no-build static site and must stay that way.

### Deliverable

A single commit (or PR) titled **"Design system consolidation + a11y fixes"** with:
- The modified `styles.css`, `about.html`.
- A brief summary in the commit body listing what changed per numbered step.
- If any step was skipped, note why.

Report back with the commit hash / PR link and any screenshots from step 10.
