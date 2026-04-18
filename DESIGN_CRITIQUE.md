# Design Critique: BluPulse (jonathan-pap.github.io)

*Stage: early exploration · Scope: index.html, about.html, post.html · Focus: hierarchy & layout, typography, responsive, accessibility*

---

## Overall impression

The blue→purple signature, the layered radial gradients, and the sticky sidebar/TOC rail give this a credible "modern technical writing" feel — it reads as a thoughtful personal site, not a template. The biggest opportunity is **discipline**: the system is 80% there, but it's drifting into too many surface tints, too many border opacities, and too many font sizes/weights. At exploration stage that's normal, but the next pass should lock the system down before adding features — otherwise every new component will keep inventing tokens.

The second-biggest opportunity is **the cards page is flat**. The H1 "Latest Articles" (26px) is *smaller* than the headliner card title (30px), so the eye lands on a card, not on the page. The sidebar's three panels (Categories / Popular Tags / Archive) all look equally weighted, so scanning for filters feels like reading a wall.

---

## Usability

| Finding | Severity | Recommendation |
|---|---|---|
| Headliner card title (30px, weight 800) outweighs the page H1 (26px, weight 750). Visitors land on a card, not the page. | 🟡 Moderate | Bump H1 to 32–36px, or demote the headliner to 24–26px. Page title should always win the first glance. |
| "Popular Tags" panel has no indication of what clicking a tag does (it filters the list above). | 🟡 Moderate | Add a one-line helper: "Click to filter" — or, on first visit, show a subtle hint chip. |
| Sidebar contains three panels with identical visual weight. On a dense articles page the sidebar competes with the grid rather than supporting it. | 🟡 Moderate | Try collapsing Archive and Tags by default (expand on click), or move Archive to the footer. Categories is the primary filter — let it breathe. |
| Top nav links are centered (`flex: 1; justify-content: center`). With only two links on a 1560px-wide header, they float in empty space. | 🟢 Minor | Right-align the nav so the header reads brand → nav the way most blogs do. Frees up center for a future "Subscribe" or search. |
| On the About page, the "Posts feed" link points at `content/posts.json`. Users expecting RSS will open raw JSON. | 🟡 Moderate | Either generate an actual RSS/Atom feed, or label it "Posts index (JSON)" so expectations match. |
| "Back to top" in the index footer is a `#articles` link — fine, but on mobile after scrolling through 20 cards it's the only escape; consider a floating back-to-top button once you scroll past the fold. | 🟢 Minor | Add a small floating button that appears after 800px of scroll. |
| The reading progress bar (post page) sits flush under the fixed nav. On narrow viewports it can be mistaken for a 4th line of the nav's bottom border. | 🟢 Minor | Gap it by 2px, or make the bar 2px thick with higher contrast so it reads as a progress indicator. |

---

## Visual hierarchy

**What draws the eye first (index):** The headliner card — it's the largest, most saturated element on the page. That is probably correct *intent*, but the H1 should still read as the page owner, not the card.

**Reading flow:** On desktop: sidebar → headliner → grid. On mobile (after 1080px collapse): content first, then sidebar below. The inversion on mobile is the right choice.

**Emphasis opportunities:**
- The "Latest Articles" eyebrow + count is very quiet (26px title, 13px count in 0.64 alpha). It doesn't announce the page. Consider a proper title block: "BluPulse" as small wordmark, then a page title like "Articles" + subtitle "Notes on DAX, Power BI, and analytics engineering." This gives the site a voice before the content takes over.
- The headliner card reuses the same blue→purple gradient as the brand badge, the reading progress bar, *and* the load-more button. The gradient is doing too much work. Reserve it for one role (brand), and use a different, quieter treatment for the headliner (e.g. thicker border, darker base, no gradient).
- Card metadata (author + date + read time) competes with the excerpt. Three lines of near-equal typography under each card. Try: move author+date above the title as a single light line, keep read-time on the footer, drop the divider.

---

## Typography & readability

**Font stack.** `ui-sans-serif, system-ui` is a fine default, but "personal writing space" tends to want a distinctive body. Consider pairing a variable sans (Inter, Geist) for UI with a readable serif (Source Serif, iA Writer Quattro) for `.prose` — the shift between UI and reading mode signals "I'm reading now."

**Weight sprawl.** You're using 500, 550, 600, 650, 700, 750, 800. The half-steps (550, 650, 750) only render distinctly with variable fonts, and `system-ui` on most machines will snap them to the nearest 100. Collapse to **400 / 500 / 600 / 700 / 800** and the design will actually get crisper, not coarser.

**Size sprawl.** I counted 17 distinct font sizes (10, 11, 12, 12.5, 13, 13.5, 14, 15, 15.5, 16, 17, 19, 24, 26, 28, 30, 38). That's a big tell at exploration stage. A 7-step modular scale covers everything here — e.g., **11 / 13 / 15 / 17 / 20 / 26 / 34**. You'll make future decisions faster with a locked scale.

**Prose line-height.** `.prose` is 16px / 1.85. 1.85 is airy — more like marketing copy than a technical read. For long-form DAX / SQL posts with frequent code blocks, drop to **1.65–1.7**. Readers finish articles faster and the rhythm between paragraphs and code gets tighter.

**Heading top margin.** `.prose h1, h2, h3 { margin-top: 1.6em }` stacks onto `line-height: 1.25`, producing ~2em of whitespace above each heading. Combined with `margin: 0 0 1.1em` on paragraphs, the vertical rhythm is uneven. Try `h2 { margin-top: 2.2em }`, `h3 { margin-top: 1.6em }` so level matters.

**Negative letter-spacing.** `-0.3px` to `-0.5px` on headings is fashion-forward but compresses the smaller ones (content-title at 26px) more than they need. Keep it for 32px+ only.

**Muted-text contrast.** Opacities in the 0.56–0.64 range get precarious on translucent panels over the dark gradient. At 13px that's below AA's 4.5:1 threshold in several spots (author-date 0.62, arch-post-date 0.58, arch-count 0.58, sf-meta 0.72 is fine). Audit with a contrast checker against the actual composited backdrop (the panel fill sits over a gradient, so the effective bg shifts).

**Placeholder text.** `.search-input::placeholder { color: rgba(255,255,255,0.46) }` is too faint. Raise to 0.56–0.60.

---

## Mobile / responsive behavior

**Breakpoints.** 1080px (sidebar collapses) and 760px (cards go single-column, footer stacks). Reasonable pair, though mid-range tablets (900–1079 portrait) get the single-column layout plus a full-width sidebar below — that's a lot of scroll.

**Page gutter.** `.page { width: min(1560px, calc(100% - 16px)) }` leaves only 8px on each side at narrow widths. For prose at 16px, you want ≥16px gutter so text doesn't touch the edge. Bump to `calc(100% - 32px)` on mobile.

**About page avatar.** 88×88 "BP" avatar next to an `h1` "About BluPulse" + role text. On a 360px-wide screen, the avatar alone is a quarter of the viewport. Drop to 56–64px under 760px.

**Post TOC on mobile.** The TOC rail moves below the post at ≤ 1080px. A TOC at the *bottom* of an article is not useful — readers don't jump to sections after they've scrolled past them. Options: (a) hide the TOC entirely on mobile; (b) make it a floating "On this page" button that opens a sheet; (c) put it above the prose, collapsed by default.

**Inline styles.** `about.html` uses `style="max-width: 820px; margin: 0 auto"` and `style="margin-top: 24px"`. Minor, but inline styles fight your design system. Move to `.panel--narrow` and `.site-footer--about` utility classes.

**Fixed topnav height.** `--topnav-h: 64px` is hardcoded. If the brand ever wraps on a narrow viewport (e.g. a long blog name), the nav will grow and every `scroll-padding-top` calc will break. Consider measuring via JS or letting it grow and using `sticky` + a spacer.

**Horizontal scroll guard.** `body { overflow-x: hidden }` is present — good, but it's a patch, not a fix. Any element that accidentally pushes width will be silently clipped. Track down root causes instead.

---

## Consistency (design system audit)

This is where the biggest cleanup win lives.

| Token | Current sprawl | Suggested canonical |
|---|---|---|
| Surface tint | `rgba(255,255,255,...)` at 0.03, 0.04, 0.05, 0.06, 0.07 across 14+ components | 3 tokens: `--surface-1: 0.04`, `--surface-2: 0.06`, `--surface-hover: 0.10` |
| Border tint | 0.08, 0.10, 0.12, 0.14, 0.16, 0.18, 0.24 | 3 tokens: `--border-subtle: 0.08`, `--border: 0.12`, `--border-strong: 0.20` |
| Radius | 10, 12, 14, 18, 999px | `--radius-sm: 12`, `--radius: 18`, `--radius-pill: 999` |
| Font size | 17 distinct sizes | 7-step scale: 11 / 13 / 15 / 17 / 20 / 26 / 34 |
| Font weight | 500, 550, 600, 650, 700, 750, 800 | 400 / 500 / 600 / 700 / 800 |
| Brand gradient usage | brand badge, headliner, load-more, progress, active cats, active arch-month, active tag, about-avatar | Reserve for: brand badge + progress bar only. Use a flat mid-blue for interactive "active" states. |

**Hover treatment.** Most interactive elements use `transform: translateY(-1px)` + tint shift. It's consistent, which is good. Consider dropping the transform on larger cards (the headliner lifts feel more like a button than a card).

**Panel label style.** The uppercase 11px eyebrow label appears at least 7 times (panel-title, about-section-title, post-toc-title, post-nav-title, navcard-label, active-filters-label, at slightly different opacities). They should be one token: `.eyebrow`.

---

## Accessibility

**What's done well**
- Skip link present and styled correctly (top: -120px → top: 12px on focus). ✓
- `prefers-reduced-motion` honored. ✓
- Unified `:focus-visible` rule across interactive components. This is rare and correct. ✓
- `aria-label` on the topnav (Primary), sidebar (Filters), search, footer. ✓
- Decorative SVGs marked `aria-hidden="true"`. ✓
- Skip target `#articles` has `scroll-margin-top` for the fixed header. ✓

**Issues to address**

| Issue | Severity | Fix |
|---|---|---|
| Focus ring is purple `rgba(139,92,246,0.22)` at 22% alpha. Against the dark background it's barely visible for keyboard users. | 🔴 Critical | Raise to 0.55+ and/or add a 2px solid outline at `rgba(139,92,246,0.95)` behind the glow. WCAG 2.4.7 requires clearly visible focus. |
| Touch targets too small: `.sf-link` ~30px, `.sidebar-tagbtn` ~26px, `.filterchip` ~24px, `.arch-post` ~30px. | 🔴 Critical | WCAG 2.5.5 (AAA) asks for 44×44; WCAG 2.5.8 (AA) requires 24×24. You're right at the edge. Bump to 36–40px min height on touch devices via `@media (pointer: coarse)`. |
| Muted meta text at 0.56–0.64 opacity on translucent panels, small sizes (12–13px). | 🟡 Moderate | Audit actual composited contrast. `author-date` at 0.62 on a panel over the dark gradient is probably 3.5:1 — below AA's 4.5:1 for text under 18px. |
| Placeholder text at 0.46 alpha. | 🟡 Moderate | Raise to ≥ 0.56. |
| Pill labels over card media (`.pill`) sit on `rgba(9,12,32,0.55)` with backdrop-blur. Media underneath can be any color (future covers), so contrast is variable. | 🟡 Moderate | Add a solid scrim `rgba(9,12,32,0.85)` or a min-size text-shadow to guarantee legibility. |
| No visible label for the search input — only `aria-label` via the wrapping `<label>`. Screen readers get it, sighted users don't have a "Search" label above. | 🟢 Minor | Acceptable, but consider a visible "Search" label above for consistency with the "CATEGORIES" / "POPULAR TAGS" sidebar eyebrows. |
| `lang="en"` on `<html>` — good. But `<code>` blocks and DAX snippets likely benefit from `lang` attributes when rendering technical content for screen reader pronunciation. | 🟢 Minor | `<pre lang="dax">` or `<code lang="sql">` when applicable. |
| Reading progress bar is decorative and `aria-hidden` — correct. No further change. | ✅ | — |

---

## What works well

- **Brand signature is coherent.** The blue→purple gradient reads across pages without feeling overapplied *within* any one page. If you dial it back in a couple of places (headliner, load-more), it'll feel tighter rather than absent.
- **Layered ambient gradient.** The fixed `body::before` with three radial gradients adds depth without being busy. It's a genuinely nice piece of mood-setting.
- **Sticky sidebar + TOC rail.** Proper blog ergonomics — your readers will feel this.
- **Focus management.** Unified `:focus-visible` across all interactive elements is rare for a personal site and something most production sites get wrong.
- **Reduced-motion handling.** Present and correct.
- **Post page structure.** Reading progress + TOC rail + "continue reading" + prev/next cards is a mature post layout — more thoughtful than most blog templates.

---

## Priority recommendations

1. **Lock the design system before adding features.** The three tokens that matter most right now are surface tints, border tints, and font sizes. You're carrying 14+ surface variants, 7 border variants, and 17 font sizes. Consolidate to 3 / 3 / 7. This will do more for perceived polish than any new component.

2. **Fix the headliner/H1 hierarchy.** The page title should out-weigh any card title. Either promote H1 to 32–36px/800 or demote the headliner to 24px/700. Also consider killing the gradient on the headliner — its role is "this is the latest," not "this is a call to action."

3. **Accessibility pass: focus ring + touch targets.** Raise focus-ring alpha to ≥ 0.55 or add a solid outline. Enforce a 36px minimum height on all chips/links via `@media (pointer: coarse)`. These are two 15-minute fixes that materially change keyboard and touch users' experience.

4. **Rethink the sidebar on articles.** Three equally-weighted panels is more cognitive load than the page needs. Try: Categories primary (always visible), Tags and Archive collapsed by default. Or: move Archive to a dedicated `/archive` page and keep the sidebar to Categories + Tags only.

5. **Tighten prose typography.** Drop `.prose` line-height from 1.85 → 1.65, consolidate heading margins into a proper vertical rhythm, and consider introducing a serif for body copy to signal reading mode.

---

## Suggested next steps

- If you want, I can produce a follow-up pass that:
  - Writes the consolidated design tokens as CSS custom properties, with a migration map from current values to new ones.
  - Does a WCAG 2.1 AA contrast audit with specific pass/fail calls on every muted-text/background combo (use the `/design:accessibility-review` skill).
  - Drafts a tighter sidebar pattern (mockup + CSS) for Categories-primary with collapsible Archive.
