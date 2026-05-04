# Designing Power BI with Claude as the build partner

Most teams' Power BI "house style" lives in three places: a deck someone made two years ago, a few unspoken conventions, and the head of whoever built the first model. New reports drift from it because there's no good way to *read* it while you're working. Naming gets inconsistent. Time intelligence gets reinvented. Themes get reinvented. The KPI cards on Page 1 don't quite match the KPI cards on Page 2.

I've been trying a different thing: **put the house style in markdown, hand it to Claude as project knowledge, and let it do the typing**.

The result is [PowerBI-Claude-Design](https://github.com/jonathan-pap/PowerBI-Claude-Design) — a small library of skill packages for authoring Power BI models and reports. Each one is a folder of `SKILL.md` plus references; together they cover TMDL syntax, DAX measures, calculation groups, DAX UDFs, and a visual design system.

## The thing that earns its keep

**Plain text outputs.** Every skill is built around producing TMDL or DAX strings — no build step, no MCP, no plugin. The output is something you paste into Power BI Desktop or Tabular Editor and it just works.

That sounds boring. It's the whole point. The longer the toolchain between "I have a question" and "I have a working measure," the less it gets used. Plain TMDL `createOrReplace` blocks have a toolchain of one operation: paste.

## The skills

Seven self-contained packages. Each is a folder with a `SKILL.md` and any reference markdowns the skill needs.

```
PowerBI-Claude-Design/
├── tmdl-standards/      ← TMDL syntax foundation (start here)
├── measures/            ← DAX measure patterns + naming
├── calc-groups/         ← Calculation groups in TMDL
├── dax-udf/             ← DAX User-Defined Functions
└── design-system/       ← Visual layer
    ├── references/      ← colors / typography / layouts / components
    ├── iconography/     ← 14 Fluent line icons + 3 status dots
    └── wordmark/        ← Light/dark brand wordmark variants
```

Two layers, loosely coupled. The model layer (`tmdl-standards` → `measures` → `calc-groups` + `dax-udf`) handles the data side. The visual layer (`design-system` + `iconography` + `wordmark`) handles how it looks. They can be used independently or together.

The dependency map is simple:

- **`tmdl-standards`** — start here for any model work. Tab indentation, `createOrReplace`, what *not* to emit (`expression:` keyword on measures, `lineageTag`, `formatStringDefinition`). Everything else assumes these rules.
- **`measures`** — DAX patterns plus a naming convention (`#` count, `$` currency, `%` ratio, `Δ` variance, `Δ%` percent variance) and display-folder taxonomy.
- **`calc-groups`** — replace banks of repeated time-intelligence measures with one calc group, with the right TMDL nesting (`calculationItem` at 3 tabs, body at 5).
- **`dax-udf`** — typed reusable functions. The interesting part is parameter modes: `Val` (value substitution), `Expr` (raw expression for `CALCULATE` / `FILTER`), `AnyRef` (column/table refs for time intelligence).
- **`design-system`** — the 3-30-300 rule, KPI design ("is it good or bad? is it getting better or worse?"), theme JSON, "subtract don't add" table styling, anti-patterns (the *Power BI Slop* category).
- **`iconography`** + **`wordmark`** — small, focused. Inline SVG embedded as DAX measures, `currentColor` for semantic theming, accessibility rules (16px minimum render size, `<title>` for standalone icons).

## How a session actually goes

Open a Claude.ai project, drop the `SKILL.md` files in as knowledge, and prompt naturally:

> *"Write a Year-over-Year growth measure for `Sales Amount`, following the TMDL and measures skills."*

Or:

> *"Refactor these 12 individual time-intelligence measures into a single calc group."*

Or, on the visual side:

> *"Audit this report against the design-system checklist and tell me what to fix."*

What comes back is a deployable TMDL block — naming convention applied, display folder set, `createOrReplace` wrapped — ready to paste into TMDL view in Desktop. Not a description of what the measure should do. The measure.

## The flow, end to end

The slide deck in the repo lays out 12 steps; the short version is three phases.

**Phase 1 — set up the project once.** Upload skill MDs as knowledge in a Claude.ai Design Studio project. Every conversation in that project inherits the full design system + TMDL rules. You re-upload only when the MDs themselves change.

**Phase 2 — design.** Share the data model (a Model view screenshot or a paste of the table schema, including relationships and cardinality). Claude reads `layouts.md` for the wireframe templates and `components.md` for component specs, then maps each business question → visual type → zone in the layout. The output is a position table: *Visual | Type | x | y | w | h*. The measure list falls out as a side effect of the layout.

**Phase 3 — build.** Generate the TMDL: measures, calc groups, UDFs, SVG measures for icons and wordmarks. Paste into Desktop's TMDL view, save to validate, apply the theme JSON, position the visuals using the layout table, embed the SVG measures, add alt text, publish.

The whole loop is text in, text out, and the human is in charge of "does this look right" rather than "did I forget a tab somewhere."

## Why a Contoso test bed lives in the repo

`datamodel/` includes a 10k-row Contoso sample, both unpacked CSVs and the original 7z, plus an ERD. There's also a `power-bi-test/` PBIP project. This isn't filler.

The whole point of plain-text outputs is that you can verify them. Having a test bed where you can paste a generated calc group, hit save, and see it work end-to-end — *or fail in a specific way you can fix* — is the difference between a skill that produces plausible-looking TMDL and one that produces TMDL that compiles.

If you change the `measures/SKILL.md` patterns or add a new calc-group recipe, you can regression-test it against the Contoso model in five minutes.

## What this isn't

It isn't a UI generator. It isn't a Power BI MCP. It isn't trying to replace Tabular Editor or DAX Studio. It's a way of putting "the rules of how we build things" into a form Claude can read fluently, so the answers it gives respect those rules without you having to remind it every time.

The unlock isn't AI. The unlock is **the folder being the source of truth**, written in a way that's useful to humans *and* useful to a model. Once that's in place, swapping which model reads it is a much smaller decision.

## Where to find it

[github.com/jonathan-pap/PowerBI-Claude-Design](https://github.com/jonathan-pap/PowerBI-Claude-Design)

Clone it, open a Claude.ai project, drop `tmdl-standards/SKILL.md` and one or two others in as knowledge, and try a single prompt. If you have an internal house-style of your own, the easiest way in is to fork this and replace the `colors.md` / `typography.md` / `components.md` with yours. The skill scaffolding does the rest.
