# Upskilling for 2027: DAX and modeling are not enough anymore

For years, being good at Power BI meant two things: a good model and good measures. You still need both. A clean star schema and measures you understand are the core of everything below.

But I don't think they're enough anymore. More and more of the DAX that runs against a model isn't a measure, and isn't written by the person who built the model. It's a **DAX query**, written by Copilot, a data agent or a coding agent. And in Fabric apps, the code around your model is TypeScript.

So if you're planning what to learn in 2027, this is my suggestion: two things I think every BI developer should be able to **read**, a DAX query and the bit of TypeScript that sends it. Read, not necessarily write from scratch. That's the skill that lets you check what an AI did with your model.

## A measure is not a query

A measure is a definition: what "Revenue" means. On its own it doesn't return anything. It needs something to say *for which rows, grouped by what, filtered how*.

In a report, the visual does that for you. Microsoft's DAX documentation puts it plainly: reporting clients like Power BI and Excel "execute DAX queries whenever visuals display". Every chart and table you've ever built sends a DAX query. You just never had to look at it.

The same page lists other tools that run DAX queries:

- **DAX query view** in Power BI Desktop and in the service
- **Copilot** writing DAX queries in DAX query view
- **Fabric notebooks** reading a model through semantic link
- the **Execute Queries REST API**, which Power Automate can call too
- tools like SQL Server Management Studio, Power BI Report Builder and DAX Studio

Add to that **Fabric data agents**, which turn a question into a DAX query, and **Fabric apps**, whose semantic model connector takes a DAX query as text. None of them run your measure on its own. They all run a query that should use it.

## One query, read slowly

Here's a real query against the [Contoso sample model](https://github.com/goldlayerdata/gold-layer-examples/tree/main/examples/default_measures) I use for this site (a PBIX you can open in Power BI Desktop): revenue by product category for 2025. The model already has a `[Revenue]` measure, so the query uses it:

```dax
EVALUATE
SUMMARIZECOLUMNS (
    'product'[CategoryName],
    TREATAS ( { 2025 }, 'date'[Year] ),
    "Revenue", [Revenue]
)
ORDER BY [Revenue] DESC
```

Line by line:

- **`EVALUATE`** is the part that returns something. A query always returns a table. Even a single number comes back as a one-row table.
- **`SUMMARIZECOLUMNS`** builds that table, much like a visual does:
  - `'product'[CategoryName]` is the **group-by column**. One row per category that has revenue in 2025, like a field on a chart's axis.
  - `TREATAS ( { 2025 }, 'date'[Year] )` is a **filter**. It applies the value 2025 to the Year column, like a slicer would.
  - `"Revenue", [Revenue]` is the **value**: the model's measure, computed for each row, like a measure in the Values well.
- **`ORDER BY`** sorts the result.

Run it in DAX query view and you get this (rounded):

| product[CategoryName] | [Revenue] |
|---|---:|
| Computers | 24,731,898 |
| Cell phones | 7,530,650 |
| Cameras and camcorders | 5,749,460 |
| Home Appliances | 3,711,953 |
| TV and Video | 3,063,591 |
| Music, Movies and Audio Books | 2,201,558 |
| Audio | 1,512,582 |
| Games and Toys | 518,049 |

The idea that unlocks everything: **for each row, the measure runs in that row's filter context**. Category = Computers and Year = 2025 for the first row, Cell phones and 2025 for the next. That's exactly what happens in a bar chart. A query is a visual written out in full.

Notice what's *not* in the query: the formula. `[Revenue]` is defined once, in the model, as `SUMX ( sales, sales[Quantity] * sales[NetPrice] )`. The query only asks for it. That's how it should be. The day the business changes what revenue means, you change the measure, and every report, agent and app that asks for `[Revenue]` follows.

The other way is to define a measure in the query itself. `DEFINE MEASURE` creates a measure that exists only while the query runs:

```dax
DEFINE
    MEASURE _Measures[Revenue Share] =
        DIVIDE (
            [Revenue],
            CALCULATE ( [Revenue], REMOVEFILTERS ( 'product' ) )
        )
EVALUATE
SUMMARIZECOLUMNS (
    'product'[CategoryName],
    TREATAS ( { 2025 }, 'date'[Year] ),
    "Revenue", [Revenue],
    "Revenue Share", [Revenue Share]
)
ORDER BY [Revenue] DESC
```

That's useful for trying out a new measure, and it's fine in an app for something only that app needs. Notice it still builds on `[Revenue]` instead of repeating the formula. Computers comes out at about 50% of 2025 revenue. If anything else needs the share too, a report, another app or an agent, move it into the model. In DAX query view, **Update model: Add new measure** does that in one click. Then delete the `DEFINE` from the app, because a measure defined in a query overrides the model measure with the same name, and the app would quietly keep its own copy. My rule of thumb is to reuse first, and define only what one app needs.

![Cheat sheet: in your TypeScript, reuse a model measure such as Revenue, or define one in the query with DEFINE MEASURE, then run it in DAX query view and promote it to the model when others need it](./assets/img/posts/dax-and-modeling-are-not-enough/dax-in-typescript-reuse-or-define.png)

## Read an AI-written query like a reviewer

When Copilot or a data agent answers a question, it writes a query like the one above. Microsoft's guidance for data agents is direct about it: "Response accuracy depends on the generated DAX query", so while you test, review the DAX query behind each response.

The mistakes worth catching are the quiet ones, where the query runs and the number looks plausible. Two of them, with real numbers from the same model:

**1. A raw column instead of the measure.** Ask for "revenue by category" and a query might skip `[Revenue]` and sum the price column directly:

```dax
"Sum of NetPrice", SUM ( sales[NetPrice] )
```

For Computers in 2025 that gives **7,930,483** instead of **24,731,898**. `NetPrice` is a price per unit, so the sum ignores `Quantity`. The query runs fine and the bars even sort in the same order. Someone who knows the measure will notice; a reader of the chart probably won't.

**2. A filter that replaces the one you meant to keep.** Asked for "Audio revenue", a query might add this value next to the category column:

```dax
"Audio Revenue",
    CALCULATE ( [Revenue], 'product'[CategoryName] = "Audio" )
```

Every row now shows **1,512,582**, Computers and Games and Toys included. A filter argument in `CALCULATE` overwrites the existing filter on the same column, so each row's own category is replaced by Audio. With `KEEPFILTERS` around the condition the two filters intersect, and only the Audio row has a value.

There's a third one I always check: a time comparison. Classic time intelligence needs a proper date table: one row per day, full years, no gaps, marked as a date table. Run `SAMEPERIODLASTYEAR` on the date table and 2025 shows **34,958,423**, the revenue of 2024. Run it on the fact table's date column, `sales[OrderDate]`, and last year's revenue comes back blank for every year. In a busy report, a blank column is easy to miss.

None of these are exotic. They're the mistakes we'd catch in a colleague's measure. The difference is that now they show up in queries nobody on the team wrote.

## The other end of the query: a little TypeScript

When the query runs inside a Fabric app, the code around it is TypeScript. You don't need to be a web developer to follow it. What you need to see is the hand-over: the query goes in as text, and a table comes back.

The Fabric apps semantic model connector returns that table as a list of **columns**, each with a name such as `product[CategoryName]`, and a list of **rows**, each an array of values in the same order. Every value is typed `unknown`, because TypeScript knows nothing about your model. Turning the rows into something a page can show is the app's job:

```ts
import type {
  SemanticModelQueryResult,
} from '@microsoft/rayfin-connector-fabric-semanticmodel';

type CategoryRevenue = { category: string; revenue: number };

export function toCategoryRevenue(
  result: SemanticModelQueryResult,
): CategoryRevenue[] {
  if (result.status !== 'success') {
    throw new Error(`The query failed: ${result.error.message}`);
  }
  const { columns, rows } = result.table;

  // Find each column by the name the query gives it, not by position.
  const category = columns.findIndex(
    (c) => c.name === 'product[CategoryName]',
  );
  const revenue = columns.findIndex((c) => c.name === '[Revenue]');
  if (category < 0 || revenue < 0) {
    throw new Error('The query no longer has the expected columns.');
  }

  return rows.map((row) => ({
    category: String(row[category]),
    revenue: Number(row[revenue]),
  }));
}
```

This is where the two skills meet. **The query is the contract.** Rename `"Revenue"` in the DAX and this code has to change with it, and it tells you by stopping with an error. Swap the columns or add one, and it still reads the right values. Code that reads `row[0]` and `row[1]` would quietly put the wrong values on the page instead. And code that returns an empty list when the query fails would quietly show a blank page; this version stops with an error there too. TypeScript checks that `columns` and `name` exist, but it can't check your DAX. That part is still you.

If you want to see a whole page built this way, I wrote one up step by step: [TypeScript for Power BI developers: one 16:9 page](./post.html?slug=typescript-for-power-bi-developers). To try it without a Fabric tenant, the [Fabric app playground](https://goldlayerdata.github.io/fabric-app-playground/) lets you build a page like it in your browser, with saved results from the same model and its `[Revenue]` measure. And for why reading what an agent wrote matters at all, see [Fabric apps: do you know what the AI is writing?](./post.html?slug=fabric-apps-can-you-read-what-the-ai-wrote)

## What hasn't changed

The basics matter more, not less:

- **A star schema** is what makes queries simple, whoever writes them.
- **Your measures** are the definitions every query should use. A good measure is the best defence against mistake number one.
- **Names and descriptions** are what an AI reads before it writes a query. I wrote about that reader in [Conversational BI: an alternative to reports, not a replacement](./post.html?slug=conversational-bi-next-to-reports).

## What I'd learn first in 2027

Five steps, in this order. Most of them fit in Power BI Desktop, on a model you already know:

1. **Let Desktop write a query for you.** In DAX query view, right-click a measure and pick **Quick queries > Evaluate**. Read what it wrote, then add one column to group by.
2. **Look at a visual's query.** In Report view, open **Performance Analyzer**, start recording, refresh the visuals, and choose **Run in DAX query view** on one of them. Microsoft notes these visual queries are more verbose than they need to be, so try simplifying one by hand.
3. **Write the query above against your own model.** One group-by column, one filter, one measure from your model. Then change the year in the filter, or swap the group-by column, and watch the result change.
4. **Check an AI's query on a question you know the answer to.** Ask Copilot in DAX query view, or a data agent, and read the DAX before you look at the number. Both need Fabric capacity and Copilot switched on; in Desktop, Copilot in DAX query view is a preview option you turn on first.
5. **Read one TypeScript file that runs a query.** Find where the query text goes in and where the rows come out. That's enough to start.

## What still sets people apart

An AI can write a query in seconds. It won't necessarily notice that 7.9 million is the wrong number for Computers, and it can't decide what "Revenue" should mean in your business, or explain to a room why a figure moved. Reading the query is how you keep doing those things when you didn't write the query yourself.

What would you add to the list?
