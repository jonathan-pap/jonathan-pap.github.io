# Display folders vs. naming conventions: organizing a growing measure model

When a Power BI model has 20 measures, no one cares how they're organized.
When it has 200, every five-minute question becomes "where did we put that one?"

Two tools address this, and teams usually pick one and neglect the other:
**display folders** (the folder tree in the Fields pane) and **naming conventions**
(the text of the measure name itself). They're not interchangeable. They solve
different problems, and they're strongest when you use both.

## What each one is actually for

**Display folders** answer: *where do I go to find a measure?*

They're a browsing affordance. A folder tree works the way an IDE's project tree
works — you don't have to memorize filenames, you scan a shape.

**Naming conventions** answer: *what does this measure mean once I'm looking at it?*

A name is a contract. A measure called `Sales Revenue YoY %` promises a specific
result type (percentage), a specific comparison (year-over-year), and a specific
base (sales revenue). If any of those are wrong in the DAX, that's a bug.

If your folders are organized but the names inside them are `Measure 7`, you've
built a filing cabinet with blank labels. If the names are perfect but there are
200 of them dumped at the root, you've built a glossary without a table of contents.

## A folder structure that scales

The structure that holds up best on mid-size models groups **by audience**,
not by calculation type:

```
Key Measures/
  Sales
  Margin
  Units
Time Related/
  YoY
  YTD
  MoM
Financial Ratios/
  Profitability
  Liquidity
Diagnostics/
  Counts
  Tests
```

Three principles behind that shape:

1. **Top level = what a business user would pick from.** `Key Measures` is the
   default. `Diagnostics` is intentionally last — it's for the modeler, not the
   consumer.
2. **Second level = one axis of variation.** Inside `Time Related` the axis is
   the comparison period. Inside `Key Measures` it's the business entity.
3. **No folder has fewer than 3 measures or more than ~12.** Fewer and it's not
   pulling its weight; more and you need a third level.

## A naming convention that matches

Three parts, read left-to-right as a sentence:

```
[Entity] [Metric] [Qualifier]?
```

- `Sales Revenue`
- `Sales Revenue YoY %`
- `Customer Churn %`
- `Order Count`
- `Inventory Days`

The qualifier is optional and strictly for time or statistical modifiers
(`YoY`, `YTD`, `MoM`, `Avg`, `Median`). It goes at the end so the main
measure sorts next to its variants alphabetically.

Two rules that do a lot of work:

- **No implementation words in names.** Not `Calc`, not `Divide`, not `Result`.
  The name describes the output.
- **Units live in the name.** `%`, `$`, `Days`, `Hours`. If someone copies a
  measure into a table without a header, they should still know what they're
  looking at.

## Where they collide

The main tension is **redundancy**. If the folder is already called `Time Related`
and inside it is a measure called `Sales Revenue YoY %`, the `YoY` feels repetitive.

Resolve it by treating the name as the source of truth. Folders move; names
propagate into reports, bookmarks, and Excel files. Repetition in the name is a
feature, not a bug — it lets the measure survive being lifted out of the folder
and dropped into a card visual on a dashboard.

The other collision: **measures that belong in two folders.** "Is `Gross Margin %`
a Key Measure or a Financial Ratio?" Answer: **one folder, chosen by who uses it
most.** Copying a measure into two folders via hidden measures is clever and it
bites you every time the definition changes.

## The 20-minute audit

Every quarter, or when the measure count crosses 50 / 100 / 200:

- [ ] Sort the full measure list alphabetically. Read it once. Flag anything
      ambiguous.
- [ ] Open the Fields pane. Every folder should have 3–12 entries.
- [ ] Spot-check 5 measures. Ask: "Could a new analyst find this in under 10
      seconds?" If no, the folder is wrong, the name is wrong, or both.
- [ ] Check for near-duplicates — `Sales` vs `Total Sales` vs `Sales Total`
      usually means one canonical measure plus two forgotten experiments.

## Closing note

Folders and names solve different halves of the same problem. A team that treats
them as interchangeable always ends up with a model that's either well-browsed
but inscrutable, or well-labeled but unfindable.

The fix is cheap — it's mostly renaming — but the decision to invest in it is
the hard part. Do it at 50 measures and it takes an afternoon. Do it at 500 and
it's a project.
