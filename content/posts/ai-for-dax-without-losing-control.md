# Using AI to write DAX without losing control of your model

LLMs write passable DAX. They write *bad* DAX at the same rate, confidently,
with the same tone of voice. If you're using an AI assistant to speed up
measure authoring, the risk isn't that it refuses to help — it's that it
gives you something plausible that silently violates your model's semantics.

This is the workflow I've settled on. It's not about prompting tricks.
It's about keeping the human decision points where they belong.

## The core problem

DAX is unusual among languages because its correctness depends on **context
you can't see in the code**. The same `SUM( 'Sales'[Amount] )` will return
different numbers depending on:

- The current filter context (slicers, page filters, row headers)
- Whether there's an active relationship on `Date`
- Whether the current filter context came from the fact or the dimension
- Whether cross-filtering is set to "both" on a relationship

An LLM sees the DAX. It doesn't see your model. It will happily produce code
that's syntactically valid, looks well-formatted, passes all the obvious
sniff tests — and computes the wrong number because the relationship between
`Sales` and `Date` is inactive.

## What works

### 1. Give the model the schema, not just the task

Before asking for a measure, paste:

- The relevant tables and their key columns.
- Which relationships exist, their cardinality, and which are **active**.
- The existing measures it might depend on (names + one-line purpose).

A 15-line schema block cuts hallucination rate dramatically. The LLM stops
inventing `[Customer Key]` columns that don't exist because it can see the
ones that do.

### 2. Ask for the explanation first, code second

Good prompt shape:

> "I want a measure that shows X. Before writing DAX, tell me what filter
> context it needs to run in, which columns it will reference, and whether
> it needs time intelligence. Then write the measure."

When the model has to articulate the semantics in English first, two things
happen: it catches its own misunderstandings, and you get a decision point
before you have code to evaluate.

### 3. Review the generated DAX against a checklist, every time

A short checklist catches most of the common failure modes:

- [ ] Does it use the right filter-removal function? (ALL vs ALLEXCEPT vs ALLSELECTED — see the dedicated post.)
- [ ] Does it reference columns that actually exist in the schema you provided?
- [ ] If there's a time dimension, does it use the marked date table, not `Sales[Date]`?
- [ ] Does it handle the empty / BLANK case explicitly?
- [ ] At the total row of a typical visual, will it return what the name promises?

The last one is the big one. If the measure is named `Sales % of Total` and
at the total row it reads 8%, either the name or the code is wrong.

### 4. Test on real data before trusting it

An LLM-written measure that works on sample data can break on production data
because of things the model never saw: duplicate keys, inactive relationships
being used elsewhere, role-playing dimensions, security filters.

Minimum viable test:

- One known value (total of a year you've reconciled elsewhere)
- One edge case (filter to a date range with no sales)
- One total row (does it sum to 100% / the grand total / etc.)

If all three match, the measure is probably fine. If one doesn't, don't
ship it.

## What doesn't work

**"Write me 30 measures for a sales model."**
You'll get 30 measures. Three will be right. Six will be subtly wrong.
The rest will be variations on a theme that's already wrong. You'll spend
longer vetting them than writing them.

**Iterating without running the code.**
Don't refine the measure by asking the LLM if it looks right. It will always
say yes. Run it, see the number, then iterate.

**Trusting generated time intelligence blindly.**
Time intelligence functions (`SAMEPERIODLASTYEAR`, `DATESYTD`, etc.) depend
on a properly marked date table with contiguous dates. LLMs assume this;
many models don't have it. Verify once per model that `FIRSTDATE('Date'[Date])`
returns what you expect with no filters, then you can trust subsequent time
intelligence.

**Letting it name your measures.**
Naming is a model-design decision. The LLM doesn't know your team's
conventions. If you let it pick names, you'll end up with `Total Sales`,
`Sum of Sales`, `Sales Amount`, and `Sales Revenue` all meaning the same
thing across your model.

## A workable loop

1. Describe the question in plain English.
2. Paste schema + relevant existing measures.
3. Ask for explanation + code.
4. Rename the measure to fit your convention.
5. Run it against a known value.
6. Check the total row.
7. Commit.

Five of those seven steps are you. The AI saves you the typing in step 3.
That's the whole value proposition — and it's enough, if you don't let the
typing saved in step 3 convince you to skip steps 5 and 6.

## Closing note

The mistake isn't using AI for DAX. It's treating the AI's output as a
finished artifact instead of a draft. A draft needs review; a finished
artifact doesn't. Getting that boundary right is the difference between
shipping faster and shipping wrong.
