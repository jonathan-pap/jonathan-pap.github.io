# Design System Audit: BluPulse

*Post-consolidation audit. 3 pages (index, about, post) sharing `assets/css/styles.css` — 1,503 lines, 132 unique classes, 250 rules.*

---

## Summary

| | |
|---|---|
| **Components reviewed** | 22 (cards, panels, nav, chips, sidebar filters, post TOC, footer, reading progress, about hero, etc.) |
| **Tokens defined** | 21 across 7 categories |
| **Critical drift remaining** | Text color scale (24 distinct alpha values), spacing scale (0 tokens) |
| **Overall score** | **68 / 100** — solid bones, two big gaps |

The consolidation pass we just did locked down surfaces, borders, radii, focus ring, and the worst of the type sprawl. But two categories are still ad-hoc: **text color opacities** (24 distinct values across `color:` declarations) and **spacing** (no tokens at all — every padding/gap/margin is hardcoded). The defined **type scale is never actually referenced** in the stylesheet — it exists in `:root` but every `font-size` still uses raw px. Addressing these three gaps would move the score into the mid-80s.

---

## Token coverage

| Category | Tokens defined | Applied? | Drift remaining | Status |
|---|---|---|---|---|
| Brand color | `--blue`, `--purple` | Yes | Used consistently for gradients, accents | ✅ |
| Surfaces | `--surface-1`, `--surface-2`, `--surface-hover` | Yes (post-consolidation) | 2 leftover raw `rgba(255,255,255,0.02\|0.04\|0.06)` in gradient stops (intentional) | ✅ |
| Borders | `--border-subtle`, `--border`, `--border-strong` | Yes | None | ✅ |
| Radii | `--radius-sm`, `--radius`, `--radius-pill` | Yes | 2 intentional outliers (6px inline code, 20px avatar) | ✅ |
| Focus ring | `--focus-ring` | Yes | Applied to all 3 focus-visible rules | ✅ |
| Shadow | `--shadow2` | Yes, but the **"2"** suffix implies a scale that doesn't exist | Only one elevation | 🟡 |
| Text color | `--text`, `--muted` | **Partial** | **24 distinct raw alpha values** in `color:` declarations | 🔴 |
| Type scale | `--fs-xs`…`--fs-3xl` (7 tokens) | **Never referenced** | All `font-size` declarations still raw px | 🔴 |
| Type weight | — | — | 5 values (500/600/700/800/850), all standard — fine without tokens | 🟢 |
| Spacing (padding/gap/margin) | **None** | — | 20+ distinct padding values, 11 distinct gap values | 🔴 |
| Motion | — | — | 3 durations (160/180/200ms) — close to needing tokens | 🟡 |

### Text color drift — the biggest remaining issue

Count of `color: rgba(255,255,255,X)` by alpha value, from your stylesheet right now:

```
0.52 ×2   0.56 ×2   0.60 ×3   0.62 ×5   0.64 ×2   0.66 ×2   0.68 ×1
0.72 ×7   0.74 ×2   0.75 ×1   0.78 ×4   0.80 ×1   0.82 ×7   0.84 ×1
0.85 ×1   0.86 ×4   0.88 ×3   0.90 ×3   0.92 ×2   0.94 ×4   0.96 ×1
0.98 ×1   0.16 ×1   0.20 ×1
```

24 distinct alphas where **5 would cover every case**:

| Token | Alpha | Use for |
|---|---|---|
| `--text-strong` | 0.96 | Hover highlights, emphasis within body |
| `--text` | 0.92 (existing) | Default body text |
| `--text-secondary` | 0.82 | Card excerpts, subheadings |
| `--text-muted` | 0.72 (existing `--muted`) | Supporting meta (dates, counts) |
| `--text-subtle` | 0.60 | Placeholders, eyebrow labels, tertiary meta |

Migration rule of thumb:
- 0.84–1.00 → `--text-strong`
- 0.88–0.94 → `--text`
- 0.78–0.86 → `--text-secondary`
- 0.66–0.76 → `--text-muted`
- 0.52–0.64 → `--text-subtle`

### Type scale — defined but unused

You added `--fs-xs: 11px` through `--fs-3xl: 34px` but zero declarations reference them. Every `font-size` is raw px. The inventory:

```
13px ×16   12px ×14   11px ×10   14px ×7   15px ×4
10px ×2    32px ×2    17px ×1    19px ×1   24px ×1   26px ×1   28px ×1
```

14 distinct sizes. Mapping to the existing 7-step scale:

| Raw | → Token | Uses |
|---|---|---|
| 10, 11px | `--fs-xs` (11px) | Eyebrow labels, headliner-flag (currently 10px — promote) |
| 12, 13px | `--fs-sm` (13px) | Meta, author name, tags |
| 14, 15px | `--fs-md` (15px) | Card excerpts, about-body |
| 17, 19px | `--fs-lg` (17px) | Card titles (19 → 17) |
| 20, 24px | `--fs-xl` (20px) | Backlink, misc |
| 26, 28px | `--fs-2xl` (26px) | Section headings, headliner card title |
| 32, 34px | `--fs-3xl` (34px) | Page H1 |

A global swap won't work safely; do it per-family (cards, post, sidebar, about) in 4 commits.

### Spacing — no tokens at all

A spacing scale would dramatically reduce noise. Your actual usage clusters around:

| Suggested token | Value | Current use count |
|---|---|---|
| `--space-1` | 4px | 3 |
| `--space-2` | 8px | ~15 |
| `--space-3` | 12px | ~12 |
| `--space-4` | 16px | ~18 |
| `--space-5` | 20px | 3 |
| `--space-6` | 24px | 2 |

6 tokens would cover ~95% of paddings and gaps. The remaining 5% (asymmetric paddings like `padding: 6px 12px 6px 10px`) can stay as-is or snap to the scale.

---

## Naming consistency

**Overall verdict: good.** 132 classes across ~20 prefix families, mostly kebab-case with a sensible `prefix-child-element` rhythm.

### What's working

- **Prefix families** — each component has a clear namespace: `card-`, `post-`, `arch-`, `sidebar-`, `sf-` (site-footer), `navcard-`, `filterchip-`, `cat-`, `about-`, `prose`, etc. Makes grep discoverable.
- **Proper BEM modifiers** — we now have 6 classes using the `--modifier` convention: `.card--headliner`, `.panel--narrow`, `.post-toc--rail`, `.post-toc-link--l2`, `.post-toc-link--l3`, `.site-footer--about`. Consistent.
- **State classes** — `.active` appears uniformly for selected states (cat, arch-month, navlink, sidebar-tagbtn).

### Inconsistencies to address

| Issue | Components | Recommendation |
|---|---|---|
| Same visual pattern, 8 different classnames: an 11px uppercase eyebrow label | `.panel-title`, `.active-filters-label`, `.post-toc-title`, `.post-nav-title`, `.navcard-label`, `.about-section-title`, `.pill`, `.headliner-flag` | Consolidate into one `.eyebrow` utility with modifiers `.eyebrow--on-media` and `.eyebrow--sm` (10px variant). Cuts ~40 lines of CSS. |
| Abbreviation style inconsistent: `sf-` for site-footer but full `navcard-`, `filterchip-` | Site footer classes (`.sf-brand`, `.sf-badge`, `.sf-name`, `.sf-link`, etc.) | Either rename to `.site-footer-brand` etc. for consistency, or accept `.sf-` as an established exception. Pick one and document. |
| `.avatar` (card author) vs `.about-avatar` (about page) — same concept, different namespaces | both | Promote to generic `.avatar` with `.avatar--lg` for about. |
| `.brand-*` (topnav) vs `.sf-brand-*` (footer) — near-duplicate component | both | Promote to shared `.brand` with `.brand--sm` for footer (smaller badge). |
| No prefix on `.list` — ambiguous name; owned by the categories panel | `.list` | Rename `.categories-list` or merge into a generic pattern. |
| `.pill` (on card media) and `.tagpill` (post meta) and `.filterchip` and `.sidebar-tagbtn` — four near-identical rounded-pill patterns | all | Consolidate to `.chip` with variants `--filter`, `--tag`, `--on-media`. Biggest single cleanup. |
| `.navcard` vs `.card` — both card components but different patterns | both | Document when to use which, or rename `.navcard` → `.post-nav-card` for clarity. |
| Transform style: mostly `translateY(-1px)` on hover, but `.card:hover` uses `-2px` and `.backlink:hover` uses `translateX(-2px)` | all hover states | Current pattern is *"interactive items lift 1px, feature items lift 2px, nav-back slides left"*. It's intentional — document it. |

---

## Component completeness

Scoring: 2pts for default state, 2 for hover, 2 for active/selected, 2 for focus-visible, 2 for documentation/comments.

| Component | Default | Hover | Active | Focus | Docs | Score |
|---|---|---|---|---|---|---|
| Card (`.card`) | ✅ | ✅ `-2px` lift | ✅ `--headliner` variant | ✅ | ⚠️ no section comment | **8/10** |
| Panel (`.panel`) | ✅ | — | — | n/a | ⚠️ | **6/10** (no interactive states, but none needed) |
| Category item (`.cat`) | ✅ | ✅ | ✅ brand-gradient bg | ✅ | ⚠️ | **9/10** |
| Nav link (`.navlink`) | ✅ | ✅ | ✅ | ✅ | ⚠️ | **9/10** |
| Filter chip (`.filterchip`) | ✅ | ✅ | — | ✅ | ✅ section comment | **9/10** |
| Sidebar tag (`.sidebar-tagbtn`) | ✅ | ✅ | ✅ | ✅ | ✅ section comment | **10/10** |
| Archive tree (`.arch-*`) | ✅ | ✅ | ✅ `.active` | ✅ | ✅ | **10/10** |
| Search input (`.search-input`) | ✅ | ✅ | — | ✅ (now 2-layer) | ⚠️ | **8/10** |
| Load-more button (`.loadmore-btn`) | ✅ | ✅ | — | ✅ (now 2-layer) | ⚠️ | **8/10** |
| Backlink (`.backlink`) | ✅ | ✅ `translateX(-2px)` | — | ✅ | ⚠️ | **8/10** |
| Post TOC link (`.post-toc-link`) | ✅ | ✅ border-color shift | ⚠️ no scroll-spy active state | ✅ | ⚠️ | **7/10** |
| Post nav card (`.navcard`) | ✅ | ✅ | — | ✅ | ⚠️ | **8/10** |
| Footer link (`.sf-link`) | ✅ | ✅ | — | ✅ | ⚠️ | **8/10** |
| Avatar (`.avatar` / `.about-avatar`) | ✅ | — | — | n/a | ⚠️ duplicated | **6/10** |
| Pill / tag-pill (`.pill`, `.tagpill`) | ✅ | — | — | n/a | ⚠️ duplicated | **6/10** |
| Reading progress bar | ✅ | — | — | n/a | ✅ section comment | **9/10** |
| Empty state (`.empty`) | ✅ | — | — | n/a | ⚠️ | **7/10** |
| Brand (`.brand` / `.sf-brand`) | ✅ | — | — | ✅ | ⚠️ duplicated | **7/10** |
| Skip link | ✅ | — | — | ✅ (moves into view) | ✅ section comment | **10/10** |
| Eyebrow label (8 inconsistent versions) | ✅ | — | — | n/a | ❌ | **4/10** |
| Prose body (`.prose`) | ✅ | ✅ (link underline) | — | n/a | ✅ section comment | **9/10** |
| Active-filters bar (`.active-filters`) | ✅ | — | — | n/a | ⚠️ | **7/10** |

**Average: 7.7 / 10.** Solid — weakness is almost entirely documentation (no section comments on ~70% of components) and the duplicated patterns (eyebrow, avatar, pill, brand).

---

## Accessibility scorecard

| Area | Status | Notes |
|---|---|---|
| Focus indicators | ✅ | 2-layer (outline + box-shadow) on all focus-visible. 18 rules cover every interactive component. |
| Reduced motion | ✅ | `prefers-reduced-motion` disables all transitions/animations. |
| Skip link | ✅ | Present, styled, moves into view on focus. |
| Touch targets | ✅ | `@media (pointer: coarse)` enforces 40px min-height on 6 small-target components. |
| Color contrast (body) | ✅ | `--text` (0.92 white) on composited dark bg ≈ 17:1. |
| Color contrast (muted meta) | 🟡 | After our raises, all `author-date`/`arch-*` now at 0.72 ≈ 11:1. ✓ for 13px. Placeholder at 0.60 ≈ 7:1 ✓. |
| Color contrast (0.52 and 0.56 instances) | 🟡 | `.active-filters-label` (0.52) at 11px ≈ 4.8:1 — just above 4.5 AA. `.sidebar-tagcount` / `.arch-action` at 0.66 — fine. |
| Keyboard nav | ✅ | All interactive elements have focus-visible and reachable via Tab. |
| Semantic HTML | ✅ | `<nav aria-label>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>` used correctly. |
| Heading hierarchy | ✅ | Single H1 per page, no skipped levels observed in prose. |

---

## Priority actions

### P0 — 1 hour

1. **Add text-color tokens and migrate**. 5 tokens, ~60 declarations to update. Reduces 24 distinct alphas to 5 and makes future contrast audits trivial.
2. **Apply the existing type-scale tokens**. They're defined but never used. Global find-and-replace of the 8 most common sizes → token references.

### P1 — 2–3 hours

3. **Consolidate the 8 eyebrow-label classes into `.eyebrow`**. Promote to a first-class utility. Add `.eyebrow--sm` (10px) and `.eyebrow--on-media` (with scrim) variants. Cuts ~40 lines.
4. **Consolidate pill/chip patterns** — `.pill`, `.tagpill`, `.filterchip`, `.sidebar-tagbtn` share ~70% of their rules. Collapse to `.chip` with 4 modifier variants.
5. **Add a spacing scale** (`--space-1` through `--space-6`) and migrate the most common padding/gap values.

### P2 — polish, 1–2 hours

6. **Promote `.avatar` to a shared component** with `.avatar--lg` for the about page. Remove `.about-avatar`.
7. **Add section comments** to every component in the stylesheet (~20 missing). Follow the pattern that already exists for Archive, Sidebar tags, Filter chips.
8. **Rename `--shadow2` → `--shadow` or add a scale** (`--shadow-sm`, `--shadow-md`). The `2` suffix implies a non-existent scale.
9. **Motion tokens** — `--motion-fast: 160ms`, `--motion: 180ms`. Migrate the 47 transitions.

### P3 — optional

10. **Post TOC active state** — add `.post-toc-link.active` with a scroll-spy JS hook so the current section is highlighted.
11. **Document when to use `.card` vs `.navcard`**. Either rename or add a comment.

---

## What we have vs. what's missing (system inventory)

**We have:**
- 21 tokens across brand, surface, border, radius, focus, shadow, text (partial), type (partial)
- 22 distinct components with consistent naming families
- Unified focus-visible treatment
- Reduced-motion + touch-target + mobile-gutter responsive patches
- 3 pages rendering from one stylesheet with no duplication

**We're missing:**
- Text-color scale (5 tokens)
- Spacing scale (6 tokens)
- Motion scale (2 tokens)
- A `TOKENS.md` reference doc so future contributors (or future-you in 6 months) know what exists
- Section comments in ~70% of component blocks
- A primitive chip component that other chips compose from
- A primitive eyebrow component that other eyebrows compose from

---

## Recommended next skill invocation

If you want to keep momentum: **`/design-system extend chip`** would design the consolidated chip primitive with variants, which knocks out two priority items (eyebrow-label cleanup is a similar exercise). Or **`/design-system document [component]`** if you'd rather lock down the doc for what already exists before changing more. Or we can just work through the P0s directly — the text-color migration is the highest-leverage change and the most mechanical.
