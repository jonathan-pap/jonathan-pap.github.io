# ALL, ALLEXCEPT, ALLSELECTED: a mental model for filter context removal

Most DAX bugs I've debugged in other people's models come down to picking the
wrong filter-removal function. The three that trip people up look similar in
the function list but do genuinely different things — and the difference only
shows up at the total row, which is exactly where reports get read.

Here's the one-page mental model I've ended up with.

## The one-sentence version

- **ALL** — "pretend no filters exist on this."
- **ALLEXCEPT** — "pretend no filters exist on this *except these*."
- **ALLSELECTED** — "pretend no filters from *inside the visual* exist, but
  keep the filters the user applied *outside* it."

If you only remember one thing: **ALL ignores slicers, ALLSELECTED respects
them.** That single distinction explains about 80% of the "my total doesn't
match my rows" bugs I've seen.

## A worked example

Say you have:

- A `Sales` fact table
- A `Date` dimension
- A page-level slicer on `Date[Year]` set to 2025
- A matrix visual with `Date[Month]` on rows and `[Sales]` in values

You want a measure that gives "sales as a % of total for the visible period."

### With ALL

```dax
Sales % of Total (ALL) :=
DIVIDE(
    [Sales],
    CALCULATE( [Sales], ALL( 'Date' ) )
)
```

The denominator removes **every** filter on `Date`, including the year slicer.
Each month now shows its share of all sales *ever*, not all sales in 2025.
The total row reads `~8%` because 2025 is one year out of many. This is
almost never what a dashboard user expects.

### With ALLEXCEPT

```dax
Sales % of Total (ALLEXCEPT) :=
DIVIDE(
    [Sales],
    CALCULATE( [Sales], ALLEXCEPT( 'Date', 'Date'[Year] ) )
)
```

Removes every filter on `Date` **except** `Year`. The year slicer survives.
Monthly rows sum to 100% at the total. Usually what you want when the base
is "the year the user picked."

### With ALLSELECTED

```dax
Sales % of Total (ALLSELECTED) :=
DIVIDE(
    [Sales],
    CALCULATE( [Sales], ALLSELECTED( 'Date' ) )
)
```

Removes only filters that came from **inside the matrix** (the `Month` row
context) while keeping filters from **outside** (the year slicer, any page
filters, any visual-level filters).

The effect: each month shows its share of *the year the user picked*, and
the total row reads 100%. This is what most users intuitively mean by
"% of total" on a filtered report.

## The mental model

Think of filters as coming from two places:

1. **User filters** — slicers, page filters, report filters. These are
   "what the user asked to look at."
2. **Visual filters** — row / column headers inside the matrix, axis values
   on a chart. These are "what the current cell represents."

Then:

| Function | User filters | Visual filters |
|---|---|---|
| `ALL(table)` | Removed | Removed |
| `ALLEXCEPT(table, cols)` | Removed except listed cols | Removed except listed cols |
| `ALLSELECTED(table)` | **Kept** | Removed |

The "user filters vs. visual filters" distinction is the whole game.
`ALLSELECTED` is the only one that splits them; the other two treat
filters as a single pile.

## When to pick which

**Use ALL when** the denominator is genuinely a grand total — a KPI card
that says "this year, we did X% of lifetime sales." There's no user context
to preserve; you *want* every filter gone.

**Use ALLEXCEPT when** you have a specific filter you need to keep and
you're willing to hard-code it. Fragile to model changes (if the column
gets renamed, the measure silently starts aggregating at the wrong level)
but unambiguous.

**Use ALLSELECTED when** the measure runs inside a visual and you want
"% of what the user is looking at." This is the common case for dashboards.

## A gotcha that bites everyone

`ALLSELECTED` behaves differently at the total row than on data rows.
At data rows it removes the row context. At the total row, since there
*is* no row context to remove, it effectively equals `ALL` of the user-visible
selection.

Concretely: in the matrix above, the row-level `Sales % of Total (ALLSELECTED)`
for March is `March sales / 2025 sales`. The total row is
`2025 sales / 2025 sales = 100%`. That's correct and expected — but it also
means you can't directly use the same measure as a KPI tile outside the visual,
because outside there's no visual to pull "selected" from.

## A cheap test

Put all three versions of the measure on the same matrix, add a total row,
and eyeball whether the total reads 100%, ~8%, or something else. The total
is where the semantics show up. If your measure is labeled "% of total" and
the total row isn't 100%, the measure and the label disagree — and the label
will win in the user's head every time.

## Closing note

None of these functions is wrong. They answer different questions.

The failure mode is picking by muscle memory — reaching for `ALL` because
it's the first one you learned — and shipping a dashboard where the total
row quietly means something different from what the column header promises.

Pick by the question the user is asking, not by the function you typed
last week.
