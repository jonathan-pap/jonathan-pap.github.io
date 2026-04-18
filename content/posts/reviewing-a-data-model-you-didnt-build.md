# Reviewing a data model you didn't build

At some point, every analytics engineer inherits someone else's model.
Maybe a contractor rotated off. Maybe a colleague moved teams. Maybe the
"quick MVP" from 18 months ago is suddenly the production source of truth.

The first hour with an unfamiliar Power BI or tabular model is the most
important hour. It sets your expectation for everything that follows.

Here's the order I go in, and the things I look for.

## 1. Read before you edit

Do nothing for the first 20 minutes except read.

- Open the Fields pane. Scan every table name. Say each one out loud —
  if a name doesn't describe what's in the table, that's signal.
- Open the Model view. Look at the relationships. Count the fact tables.
  Count the dimensions. Note any snowflakes.
- Expand one table and one folder of measures. Read 10 measure names.

You're building a model of the model. Don't edit anything yet — if you
edit before you've read, you'll be explaining ghost decisions to yourself
for the next week.

## 2. Measure the obvious proxies

Some things give away maturity fast:

- **Number of measures vs. number of tables.** Healthy ratio is roughly
  5–15 measures per fact table. Below that, the model is under-expressed
  (too much logic lives in visuals). Above it, measures are probably
  duplicated or the model is doing someone else's job.
- **Measures at the table root vs. in folders.** 0 at the root is a very
  good sign. 200 at the root means no one has organized in a while.
- **Count of inactive relationships.** Zero is fine. One or two with
  comments is fine. Seven is a model that's been patched and never
  refactored.
- **Tables with `dim_` / `fact_` / `_temp` / `Table2` / `Query1` prefixes.**
  Naming hygiene is a proxy for overall hygiene. You'll almost never find
  a model with neat names and terrible DAX, or vice versa.

## 3. The five smells I treat as red flags

**Columns used directly in visuals instead of measures.** Drag-and-drop
from column to chart works fine until the aggregation rule needs to
change. Then you have 40 visuals to update.

**Calculated columns doing measure work.** A calculated column that
aggregates other columns ("order total = SUMX( related lines )") is
usually a measure written by someone who didn't know measures existed
yet. Performance and model size both suffer.

**Bidirectional cross-filtering outside of specific known patterns.**
Many-to-many with a bridge table? Fine. Bidirectional on a normal
dimension? Almost always wrong — it works until it doesn't, and when
it breaks the bug is subtle and wide-ranging.

**A date table that isn't marked as a date table.** Time intelligence
will silently produce wrong numbers. This is the single easiest fix to
make early and the single easiest bug to miss late.

**Measures named with implementation words.** `Sum_Revenue_Calc_Final_v2`
is a scream for help. Expect more of the same downstream.

## 4. The five green flags I trust

**Descriptions on every measure.** Not universal, but when present,
signals that someone cared. Someone who cares will also have named
things well and not left landmines.

**A `Diagnostics` or `Test` folder of measures.** Means the author has
been burned before and brought tools.

**Consistent naming across tables.** If every dimension has `ID` as its
key and every fact has `_FK` suffix, someone had a standard and enforced
it. That person also probably knew what they were doing elsewhere.

**Relationship cardinalities explicitly noted, not default.** Defaults
in Power BI are usually right. Explicit overrides are a sign the author
understood the model well enough to deviate from defaults on purpose.

**A one-page README somewhere — in the About page of the report, in a
`/docs` folder, in the model description.** Existence of documentation
at all is a lagging indicator of a thoughtful model.

## 5. What to do before you change anything

Before editing, do three things:

1. **Put it in source control.** If the file is `.pbix`, convert it to
   `.pbip` first so you have something diffable.
2. **Screenshot the current report.** Pages, key cards, the first page
   of any dashboard. You're going to change things and want a reference
   for "did I break this?"
3. **Snapshot the known-good numbers.** Pick 3–5 summary values you can
   reconcile (last quarter revenue, top customer, whatever). Write them
   down. These are your "did I silently break totals" sentinels.

That's 30 minutes of work and it saves you from the single worst failure
mode in inherited models: making a change, deploying it, and only finding
out three days later that a downstream report now reads 8% lower because
of a filter-context bug you introduced.

## 6. The review report I write

If I'm reviewing for a team rather than just inheriting it, I write up
findings using this shape:

- **Verdict** — one sentence. "Ship it," "fixable in a day," "needs a
  real refactor," "start over."
- **Top 3 risks** — specific measures or relationships I don't trust.
- **Top 3 wins** — things I'd keep and copy into other models.
- **Effort estimate** — hours to fix the risks, in a range.

Not a 40-page audit. A one-pager someone can act on. The goal of the
review is a decision, not a document.

## Closing note

The best signal about a model you didn't build is **how confident you
feel after an hour of reading it.** If you could explain the schema and
three key measures to a teammate from memory, it's a decent model.
If your notes are "I think this one does... something with dates?"
after 60 minutes, the model isn't clear enough to be trusted as a source
of truth, and the first investment isn't improvements — it's
comprehension.
