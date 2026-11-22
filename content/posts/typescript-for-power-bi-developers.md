# TypeScript for Power BI developers: one 16:9 page

In [Fabric apps: do you know what the AI is writing?](./post.html?slug=fabric-apps-can-you-read-what-the-ai-wrote) I argued that if an AI writes your Fabric app, you still own it, and you should be able to read what it wrote. Fair enough. But read it how, if you've never written TypeScript?

This post is the smallest useful answer. We build one page the way a report page works: a 16:9 canvas on a grid, two cards and a bar chart, all fed by one DAX query. Every new idea is mapped to something you already know from Power BI.

You won't be a web developer at the end of it. You will be able to open what an agent wrote and follow it.

![The finished page: a 16:9 canvas on a 12-column grid with two cards, a bar chart and a text panel, drawn with real 2025 numbers from the Contoso model](./assets/img/posts/typescript-for-power-bi-developers/ts-page-preview.png)

## Five ideas, in Power BI terms

| TypeScript / React | What it is | Closest thing in Power BI |
|---|---|---|
| a **type** | the shape of some data: which fields, and what kind each one is | a table's columns and their data types |
| a **component** | a function that returns what to draw | a visual |
| **props** | the values a component is given | what a visual shows, once the fields in its wells have been queried |
| **state** (`useState`) | a value the page remembers, which redraws the page when it changes | a slicer selection, or the data a visual has loaded |
| an **effect** (`useEffect`) | code that runs when something changes, such as fetching data | a visual re-querying the model |

Keep that table open. The rest of the post is those five things.

## 1. The query, and its type

Start where you're strongest: the DAX. Keep each query in its own file, so it sits where you can read it.

```ts
// queries/revenue-by-category.ts
export const revenueByCategoryQuery = `
EVALUATE
SUMMARIZECOLUMNS (
    'product'[CategoryName],
    TREATAS ( { 2025 }, 'date'[Year] ),
    "Revenue", [Revenue]
)
ORDER BY [Revenue] DESC
`;

export type CategoryRevenue = {
  category: string;
  revenue: number;
};
```

`export` means other files can use it. The backticks hold text over several lines. `CategoryRevenue` is a **type**: it says one row has a `category` that is text and a `revenue` that is a number. That's the same promise a table's column types make.

Here's the part that matters most. The connector gives the result back with every value typed as `unknown`. TypeScript doesn't know your model, so turning the result into `CategoryRevenue` is your job:

```ts
export function toCategoryRevenue(
  result: SemanticModelQueryResult,
): CategoryRevenue[] {
  if (result.status !== 'success') return [];
  return result.table.rows.map((row) => ({
    category: String(row[0]),
    revenue: Number(row[1]),
  }));
}
```

Read it as: if the query failed, return no rows. Otherwise, for each row, take the first value as the category and the second as revenue. `CategoryRevenue[]` means "a list of CategoryRevenue". `(row) => ({ ... })` is a small function: given a row, make this. `SemanticModelQueryResult` is the connector's result type; the next block shows it being brought in with `import type`, which imports a type only, no code.

**This is the line to check when an agent writes it.** `row[0]` and `row[1]` are positions. If someone inserts or reorders columns in the DAX, the positions shift, and nothing warns you. The type only describes what you *expect*; it can't see the model. (The result also carries the column names, such as `product[CategoryName]` and `[Revenue]`, so a careful version looks columns up by name.)

## 2. Running the query: an effect

In the app, the query runs through the semantic model connector. Microsoft's documentation shows the call:

```ts
await client.connectors.salesModel.executeQuery({ query: '...' });
```

To use it on a page, wrap it in a small function the page can call. This one runs a query when the page opens, and again if the query changes:

```ts
import { useEffect, useState } from 'react';
import type {
  SemanticModelQueryResult,
} from '@microsoft/rayfin-connector-fabric-semanticmodel';

export type RunDax = (query: string) => Promise<SemanticModelQueryResult>;

export function useDax(runDax: RunDax, query: string) {
  const [result, setResult] = useState<SemanticModelQueryResult | undefined>();

  useEffect(() => {
    let cancelled = false;
    runDax(query)
      .then((r) => {
        if (!cancelled) setResult(r);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setResult({
            status: 'error',
            error: { category: 'unknown', message: String(e) },
            requestId: '',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [runDax, query]);

  return result;
}
```

Two of the five ideas are here:

- **`useState`** is the page's memory. `result` starts empty; `setResult` fills it, and the page redraws, just as picking a slicer value redraws a report.
- **`useEffect`** runs the query. The list at the end, `[runDax, query]`, says *when*: whenever one of those changes. That's the closest thing to a visual re-querying when its filters change.

`Promise` means "an answer that arrives later": the query takes time. `| undefined` means "or nothing yet", because before the answer arrives there's no result.

Two details that are easy to get wrong:

- **`.then` handles the answer, `.catch` handles a crash.** Failures that Power BI or the model report come back as a result with `status: 'error'`. Failures before the query reaches the connector, such as not being signed in or not reaching the app's backend, can be thrown instead. Without `.catch`, the page would sit on "Loading…" forever. Here, a crash is turned into an error result, so the page has one way to show failure.
- **The `cancelled` lines** stop an old answer overwriting a newer one if the query changes while it runs. The old query still runs on the model; its answer is just ignored.

## 3. The visuals: components and props

A **component** is a function that returns what to draw. The part that looks like HTML is called JSX. A card:

```tsx
type KpiCardProps = {
  title: string;
  value: number;
};

export function KpiCard({ title, value }: KpiCardProps) {
  return (
    <div className="h-full rounded-lg border p-4">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-3xl font-bold">{Math.round(value).toLocaleString()}</p>
    </div>
  );
}
```

`KpiCardProps` is what the card is given: a title and a value, already worked out. Anything in `{ }` inside the JSX is a value, not text. `Math.round(value).toLocaleString()` rounds the number and adds thousands separators: the connector returns raw values, such as `24731898.0253`, and each column carries only a name and a data type, no format string, so the page formats them itself. Two things to know: `toLocaleString()` follows the viewer's language settings, so a German browser shows `49.019.740`, and the page doesn't use the measure's own format string, so if the model shows `$49,019,740`, the page won't add the dollar sign. That's a second place where formatting is decided, so keep it in mind. The `className` words are styling from Tailwind, the styling kit the templates use: `h-full` fills the cell's height, `rounded-lg` rounds the corners, `p-4` adds padding, `text-3xl` makes the number big.

A simple bar chart is the same idea, with a list:

```tsx
type BarListProps = {
  rows: CategoryRevenue[];
};

export function BarList({ rows }: BarListProps) {
  const max = Math.max(...rows.map((r) => r.revenue), 1);
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.category}>
          <div className="flex justify-between text-sm">
            <span>{r.category}</span>
            <span>{Math.round(r.revenue).toLocaleString()}</span>
          </div>
          <div
            className="h-2 rounded bg-yellow-400"
            style={{ width: `${(r.revenue / max) * 100}%` }}
          />
        </li>
      ))}
    </ul>
  );
}
```

`rows.map(...)` means "for each row, draw this", which is how a visual draws one bar per category. Each bar's width is its share of the biggest value. The `...` in `Math.max(...rows.map(...))` hands the list of values to `Math.max` one by one, because it wants separate numbers, not a list. `key={r.category}` tells React which bar is which, like a key column.

For real charts you wouldn't hand-draw bars. Microsoft's data app template comes with chart components. But a hand-drawn one shows there's no magic: a chart is a list of shapes sized by numbers.

## 4. The page: a 16:9 canvas on a grid

Now the canvas. Report pages are 16:9 by default, and you lay visuals out on it. Here the canvas is one `div` with nine Tailwind words. Five do the layout:

- `aspect-video`: aim for 16:9
- `grid`: lay out what's inside on a grid
- `grid-cols-12`: twelve columns
- `grid-rows-6`: six rows
- `gap-4`: space between cells

The other four size and centre the canvas: `w-full` and `max-w-6xl` make it as wide as the space it sits in, up to a limit, `mx-auto` centres it, and `p-4` adds space inside its edge. One catch: the grid keeps the canvas 16:9, but nothing keeps a visual inside its cell. With 30 categories, the bar list runs out of its box and past the bottom of the page. Add `overflow-auto` to the bar chart's `section` so it scrolls inside its cell, like a visual with a scroll bar.

Each visual then says how many columns and rows it takes, with `col-span-…` and `row-span-…`. That's your visual's width and height, in grid cells instead of pixels.

```tsx
export function RevenuePage({ runDax }: { runDax: RunDax }) {
  const result = useDax(runDax, revenueByCategoryQuery);

  if (!result) return <p>Loading…</p>;
  if (result.status === 'error') {
    return <p>Query failed: {result.error.message}</p>;
  }

  const rows = toCategoryRevenue(result);
  if (rows.length === 0) return <p>No data for this page.</p>;
  const total = rows.reduce((sum, r) => sum + r.revenue, 0);

  return (
    <div
      className="mx-auto aspect-video w-full max-w-6xl
                 grid grid-cols-12 grid-rows-6 gap-4 p-4"
    >
      <header className="col-span-12 row-span-1">
        <h1 className="text-2xl font-bold">Revenue by category, 2025</h1>
      </header>
      <div className="col-span-3 row-span-2">
        <KpiCard title="Total revenue" value={total} />
      </div>
      <div className="col-span-3 row-span-2">
        <KpiCard title="Categories" value={rows.length} />
      </div>
      <section className="col-span-6 row-span-5 rounded-lg border p-4">
        <h2 className="mb-2 font-semibold">Revenue by category</h2>
        <BarList rows={rows} />
      </section>
      <section className="col-span-6 row-span-3 rounded-lg border p-4 text-sm">
        <h2 className="mb-2 font-semibold">About this page</h2>
        <p>Source: Contoso model, measure [Revenue], one row per category.</p>
      </section>
    </div>
  );
}
```

Read it top to bottom:

1. Run the query.
2. **No result yet?** Show "Loading…".
3. **Query failed?** Show the error. Not sample numbers, not an empty chart: the error.
4. **No rows?** Say so, rather than showing a total of 0 and a blank chart.
5. Otherwise, add up the total and draw the canvas: a title across all 12 columns, two cards of 3 columns each, the bar chart in the 6 columns on the right, and a text panel under the cards.

The picture at the top of this post is that layout, drawn with the real 2025 numbers from the Contoso sample model, with the grid shown dashed.

**One BI trap is hiding in step 5.** The total is added up in the page, from the rows the query returned. That's only right because `[Revenue]` adds up. For a distinct count, an average or a ratio, adding up the rows gives the wrong total, and nothing on screen tells you. Query the total from the model instead: the measure is the single version of the truth, and a sum in the page is a second one.

## 5. Plugging it in, and a trap

In the real app, you give the page the connector's query function. Define it once, at the top of the file, outside any component:

```ts
const runDax: RunDax = (query) =>
  client.connectors.salesModel.executeQuery({ query });
```

and then use the page with `<RevenuePage runDax={runDax} />`.

Why outside? Remember the effect's list, `[runDax, query]`: the query runs again whenever one of those changes, and a function written inside a component is a new function every time that component draws.

- **Inside the same component that runs the query:** the answer arrives, the component redraws, a new function is made, the query runs again, the answer arrives, and round it goes, without end. It looks perfectly fine on screen, and every loop is another query against your model.
- **Inside a parent component:** it re-queries every time the parent redraws, which can be often.

Defining it outside, or wrapping it in `useCallback` (React's way of keeping the same function between redraws, which you'll see in agent code), avoids both.

That's a good example of why reading matters: the page works, and it's still wrong.

`client` is the app's connector client. How you create it depends on your Rayfin version: Rayfin 2.0 replaced the setup that Microsoft's Fabric Apps pages still show, so follow the setup your project's template uses. The client also has to be set up with the semantic model runtime, or the results won't have the shape the types promise.

## TypeScript catches some mistakes for you

The page code in this post was type-checked with the versions the default Rayfin 2.0 template installs (TypeScript 6.0.3, React 19 types), against the connector's own result types, including the line that plugs the connector in. Then two deliberate mistakes went in, to see what it would do:

- **Passing text where a number belongs:** `<KpiCard title="Categories" value="eight" />` was rejected: a string isn't a number.
- **Reading the result without checking the status first:** reading `result.table` before testing `result.status` was rejected, because a failed result has no table.

That second one is the best thing about TypeScript for a BI developer: it won't let you read the table until you've checked the query succeeded. It won't make you *show* the failure, though. `toCategoryRevenue` quietly returns an empty list on failure, and that compiles fine.

One more catch: you see these errors as red lines in your editor, or when you run `npx tsc -b`. The templates' build skips the check (`tsc -b --noCheck`), so a type error won't stop a build or a deploy. Look at the red lines before you ship.

What it can't catch: the wrong column in `row[1]`, the wrong measure in the DAX, a sum that should have been a measure, or a number that's correct TypeScript and wrong for the business. That's still your part.

## What to read when an agent writes this

1. **The DAX.** Same as always: right measures, right filters, row limit.
2. **The type and the conversion.** Do the fields match the DAX columns, in the same order?
3. **The error path.** On failure, including a thrown error, does the page say so, or show something that looks like data? Is there an empty state?
4. **The effect's list.** Does a query run once, or on every redraw?
5. **Sums in the page.** Does the measure add up? If not, query the total from the model.

## Try it

- The [Fabric app playground](https://goldlayerdata.github.io/fabric-app-playground/) builds a page like this one step by step, in your browser, on the same Contoso model and its `[Revenue]` measure. No Fabric needed: the data is simulated.
- To run the query yourself, open the [Contoso model with base measures](https://github.com/goldlayerdata/gold-layer-examples/tree/main/examples/default_measures) in Power BI Desktop, paste the query into DAX query view and run it.
- For why reading DAX queries matters in the first place, see [Upskilling for 2027: DAX and modeling are not enough anymore](./post.html?slug=dax-and-modeling-are-not-enough).

## A note on templates

Microsoft's data app template comes with its own query helper, `useSemanticModelQuery`, built on a different client from the connector shown on Microsoft's page. Microsoft's guidance says to use the connector, and to replace another semantic model client if the template includes one, rather than keep two ways to reach the model. The template keeps each DAX query in its own `.dax` file, read in as text. This post uses a `.ts` file so all the code stays in one language. Whichever client your project uses, the ideas here are the same: a query, a type, an effect, components and a grid.

*Sources: Microsoft Learn, [Create an app connected to a semantic model](https://learn.microsoft.com/fabric/apps/data-apps-template), [Connect Fabric Apps to Fabric data](https://learn.microsoft.com/fabric/apps/connectors) and Power BI's page size settings (16:9 default); the semantic model connector's documentation and result types, and the client migration notes, in Rayfin 2.0; and the Rayfin 2.0 data app template, read in November 2026. The code was type-checked with TypeScript 6.0.3 and the React types installed by the default Rayfin 2.0 template.*
