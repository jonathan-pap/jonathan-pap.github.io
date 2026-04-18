# Using Claude Code to refactor a Power BI project

Agentic coding tools are mostly pitched at web developers. They can do more
than that. I've been using Claude Code on Power BI projects — specifically
on the `.pbip` format and the TMDL / BIM files inside it — and while it's
not the silver bullet some vendors imply, it's genuinely useful for a
specific shape of task.

Here's what works, what doesn't, and the guardrails I've ended up with.

## Why it works at all

Modern Power BI saves models as text. If you enable the Power BI project
(`.pbip`) format, you get a folder tree with:

- `*.SemanticModel/` — the model as TMDL (tables, measures, relationships)
- `*.Report/` — the report as JSON (pages, visuals, bookmarks)
- `definition/` — various config

All text. All diffable. All something an LLM can read, reason about, and
edit without screen-scraping the Power BI Desktop UI.

That's the unlock. Pre-`.pbip`, AI assistance meant copy-paste roundtrips
out of the Desktop app. With `.pbip`, it's the same workflow as editing
any other codebase.

## What it's genuinely good at

### Bulk measure refactoring

"Rename every measure starting with `Sum of ` to remove the prefix."
"Add descriptions to all measures in the `Financial Ratios` folder based
on their DAX."
"Convert all DIVIDE( a, b ) calls with a literal 0 fallback to use BLANK()."

These are find/replace tasks that are tedious by hand because they need
semantic understanding of DAX, but they're near-trivial with an agent that
can read the TMDL, write a plan, and apply edits across dozens of files.

### Drafting starter measures from a spec

Give it a schema and a list of business questions, get back a TMDL file
with draft measures. Don't trust any of them without review (see the
previous post on AI + DAX), but as a scaffolding step it saves the
typing work.

### Governance and consistency sweeps

"Audit this model for measures that don't have descriptions."
"Find measures whose names don't match our convention (`[Entity] [Metric]
[Qualifier]`)."
"List all measures that directly reference columns instead of going
through existing measures."

Sweeps like this are the kind of thing you'd do with a Tabular Editor
script, except the LLM can also read the surrounding context and explain
why each flagged item is flagged.

### Documentation generation

"Produce a Markdown document describing every table, its business purpose
inferred from the measure names that use it, and which measures depend on
it." You have to review the output — "inferred from" does a lot of work
— but as a starting point for a model dictionary it's faster than writing
it from scratch.

## What it's not good at

### Model design decisions

"Should this be a star schema or a snowflake?" is not a prompt. It's a
conversation with someone who knows the business. An LLM will happily tell
you "star schema" because that's the statistically common answer, not
because it understood your problem.

### Performance tuning

DAX query plans depend on the storage engine's actual behavior — how the
relationships are materialized, what's in the vertipaq cache, column
cardinality. None of which is visible to an LLM looking at TMDL text.
It can spot obvious anti-patterns ("you're iterating a table of 40M rows
inside a CALCULATE"), but for real tuning you still need DAX Studio and
the actual query timings.

### Relationship changes

Changing cardinality or cross-filter direction has ripple effects across
every measure that relies on filter propagation. LLMs don't reliably
predict those effects. I don't let them edit relationships unattended —
too easy to introduce silent breakage.

### The report layer

Report JSON is editable in principle, but in practice the schema is
verbose, version-sensitive, and undocumented. Bulk operations on visuals
work for simple things (rename a visual, change a color) and fall over
on anything complex. This is improving; it isn't there yet.

## Guardrails I've ended up with

**Always work in a branch.** Not optional. The combination of an agent
making confident bulk edits and Power BI's "Save" being somewhat opaque
means you want `git diff` between you and committing.

**Review every DAX change.** Bulk rename? Trust it. Bulk description
generation? Review each one — "plausible-looking fiction" is the failure
mode.

**Don't let it open Power BI Desktop.** Keep the loop text-only: the agent
edits TMDL, you reload in Desktop, you eyeball the result, you iterate.
The moment you let it take screenshots or drive the UI, you've taken on
a different set of reliability problems.

**Keep the agent scoped.** "Refactor the measures folder" is a reasonable
task. "Refactor the model" is not. Scope control is the single biggest
predictor of whether a session produces clean output or tangled output.

## A sample session shape

1. Branch off main: `git checkout -b refactor/measure-descriptions`
2. Prompt: "Read `SemanticModel/tables/Sales.tmdl`. For every measure
   without a description, suggest a one-line description based on the
   DAX and the measure name. Produce a diff; don't write yet."
3. Review the diff. Edit the prompt based on what you see.
4. "Apply."
5. `git diff` — scan for anything weird.
6. Reload the `.pbip` in Power BI Desktop. Spot-check three measures.
7. Commit.
8. Repeat for the next table.

The whole loop is 10–20 minutes per table. Doing the same work by hand in
Desktop is maybe 45 minutes per table if you're fast. The speed-up is
real but not transformative. Where it becomes transformative is the
**consistency** — an agent applies the same rule to every measure, where
a human gets bored on measure 40 and skips the last 10.

## Closing note

Claude Code (and similar tools) slots into the Power BI workflow in
exactly the places you'd expect it to: bulk, text-level, rule-based
changes that don't require understanding the business. For those, it's
a genuine productivity win. For model design, it's a thoughtful pair
programmer on its good days and a confident novice on its bad ones —
same as everywhere else LLMs show up.

The right frame isn't "can AI do my job." It's "which parts of my job
are typing that I shouldn't have to do." Those are the parts worth
automating.
