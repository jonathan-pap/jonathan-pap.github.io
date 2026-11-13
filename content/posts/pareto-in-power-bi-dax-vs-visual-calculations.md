# Pareto in Power BI: DAX measures or visual calculations?

A Pareto chart answers one question: which few things make up most of the total? You need bars sorted largest first, a running percentage line, and a cutoff where the vital few end, usually 80%.

Power BI has no Pareto visual, so you build one. Since visual calculations arrived there are two ways to do it: calculations that live on the chart, or classic DAX measures in the model. I built both on the same data, side by side, to see where they differ. The numbers match. Almost everything else differs.

## The data

Contoso sample data: $150.6M of revenue across 138,491 sales lines, grouped into 8 product categories. The finished report is free to download, data included: [examples/pareto on GitHub](https://github.com/goldlayerdata/gold-layer-examples/tree/main/examples/pareto) has the PBIX, every formula in one `.dax` file, and every chart shown here.

| Category | Revenue | Share | Running total |
|---|---:|---:|---:|
| Computers | $69.4M | 46.1% | 46.1% |
| Cell phones | $22.5M | 14.9% | 61.0% |
| Home Appliances | $17.2M | 11.4% | 72.4% |
| Cameras and camcorders | $16.0M | 10.6% | 83.0% |
| TV and Video | $13.3M | 8.8% | 91.8% |
| Music, Movies and Audio Books | $6.9M | 4.6% | 96.4% |
| Audio | $4.2M | 2.8% | 99.2% |
| Games and Toys | $1.2M | 0.8% | 100% |

Computers alone bring in almost half. It takes 4 of the 8 categories to reach 80%, with Cameras and camcorders taking the total past it at 83.0%.

![The same Pareto twice: visual calculations on the left, DAX measures on the right, and a card with the count of categories that reach 80%](./assets/img/posts/pareto-in-power-bi-dax-vs-visual-calculations/pareto-in-power-bi-two-ways.png)

## Build 1: visual calculations

A visual calculation is DAX that runs on the visual, over the rows the visual already shows. Nothing goes into the model. The whole Pareto takes two calculations:

```dax
Percent of grand total = DIVIDE ( [Revenue], COLLAPSEALL ( [Revenue], ROWS ) )

Cumulative % = RUNNINGSUM ( [Percent of grand total], ORDERBY ( [Revenue], DESC ) )
```

`COLLAPSEALL` evaluates Revenue at the total level of the axis, so the first line is each category's share. `RUNNINGSUM` adds the shares up, and `ORDERBY` tells it to add them largest first. That last argument is the one that matters.

## The trap: RUNNINGSUM without ORDERBY

Leave `ORDERBY` out and the running sum still returns numbers, but they are the wrong ones. Without it, `RUNNINGSUM` sorts by the grouping columns on the axis, ascending ([RUNNINGSUM on Learn](https://learn.microsoft.com/dax/runningsum-function-dax)). On this chart that means category names, A to Z. Sorting the bars by revenue doesn't change that.

I tested it to be sure. The red line below is `RUNNINGSUM ( [Percent of grand total] )` on a chart sorted by revenue. It adds Audio, then Cameras, then Cell phones, then Computers, so Computers shows 74% and Cell phones 28%, and the line zig-zags across the bars. The white and grey line is the `ORDERBY` version.

![A plain RUNNINGSUM in red zig-zags because it adds the categories alphabetically, while the ORDERBY version in white climbs smoothly](./assets/img/posts/pareto-in-power-bi-dax-vs-visual-calculations/pareto-in-power-bi-trap.png)

With `ORDERBY ( [Revenue], DESC )` each category gets its true Pareto value, whatever order the bars are displayed in.

## Build 2: DAX measures

The classic build puts three measures in the model:

```dax
Revenue = SUMX ( sales, sales[Quantity] * sales[NetPrice] )

Revenue Share % =
DIVIDE ( [Revenue], CALCULATE ( [Revenue], ALLSELECTED ( 'product'[CategoryName] ) ) )

Revenue Cumulative % =
VAR _cur = [Revenue]
VAR _grand = CALCULATE ( [Revenue], ALLSELECTED ( 'product'[CategoryName] ) )
VAR _cum =
    CALCULATE (
        [Revenue],
        FILTER (
            ALLSELECTED ( 'product'[CategoryName] ),
            CALCULATE ( [Revenue] ) >= _cur
        )
    )
RETURN
    IF ( NOT ISBLANK ( _cur ), DIVIDE ( _cum, _grand ) )
```

The cumulative adds up every category whose revenue is at least the current one. `ALLSELECTED` keeps slicers and page filters working, so the shares still add up to 100% of what is on screen. One difference shows up only with ties: if two categories have exactly the same revenue, the measure gives both the same cumulative, while the visual calculation still puts them one after the other.

Note the column name in there. These measures only work with `'product'[CategoryName]` on the axis. Put subcategories on the axis and the cumulative is wrong until you rewrite it. The visual calculation doesn't name a column, so it works on whatever axis the chart has.

## Colouring at the cutoff

Both charts colour the bars gold up to the category that crosses 80%, and the line white up to the same point. The test is the same in both builds: was the running total still below the cutoff *before* this category?

```dax
Bar Color = IF ( [Cumulative %] - [Percent of grand total] < 0.8, "#F2C811", "#4A5C8C" )
```

Set its data type to Text, hide it on the visual, and the bars use it through conditional formatting (*Columns > Color > fx > Field value*). A visual calculation returning a hex code is a pattern Learn documents ([Create visual calculations](https://learn.microsoft.com/power-bi/transform-model/desktop-visual-calculations-create)); in the DAX build the same logic is a measure.

The line is two series rather than one. The first keeps the values while the running total before the category is below 80%. The second keeps them once the running total is above 80%. Both include the crossing category, Cameras at 83%, so the two halves meet there and the line has no gap.

## Where they differ

| | Visual calculations | DAX measures |
|---|---|---|
| Lives in | the visual | the model |
| Reuse in a card, table or another chart | no, another visual can't reference or reuse it | yes |
| Axis | any field you put on the chart | the column the measure names |
| Publish to web | not supported | works |
| Export data | results not included | included |
| Sort the chart by it | no | yes |

The middle rows come from the [visual calculations limitations](https://learn.microsoft.com/power-bi/transform-model/desktop-visual-calculations-overview#considerations-and-limitations) on Learn. That page also says visual calculations often perform better than the equivalent measures, because they work on data the visual has already aggregated.

The card on the first screenshot shows why you sometimes need the model anyway. "How many categories make up 80%?" is a number outside the chart, so a visual calculation can't feed it:

```dax
# Categories to 80% =
COUNTROWS (
    FILTER (
        VALUES ( 'product'[CategoryName] ),
        NOT ISBLANK ( [Revenue] )
            && [Revenue Cumulative %] - [Revenue Share %] < 0.8
    )
)
```

## Shaded zones: the same chart, read by band

A shaded background makes the vital few, or A/B/C classes, readable at a glance. The obvious tool, an X-axis constant line in the Analytics pane, isn't offered on the combo charts a Pareto is built on ([Analytics pane on Learn](https://learn.microsoft.com/power-bi/transform-model/desktop-analytics-pane)).

So the shading is a second chart behind the first. The back chart draws a full-height column for every category, with no gaps between them, coloured by band. The band comes from one visual calculation:

```dax
Band =
VAR _before = [Cumulative %] - [Percent of grand total]
RETURN IF ( _before < 0.8, 1, IF ( _before < 0.95, 2, 3 ) )
```

The front chart is the normal Pareto on a transparent background. Both sort by revenue and share the same axes, so each zone sits behind its bars.

![Two shaded versions: a vital-few zone up to 80%, and A, B and C bands at 80% and 95%](./assets/img/posts/pareto-in-power-bi-dax-vs-visual-calculations/pareto-in-power-bi-shaded.png)

One catch comes with the layering. The two charts are separate visuals, so if a reader re-sorts only the front one, the zones no longer line up with the bars. Hide the front chart's header, which holds the sort options (the change shows in reading view), or accept that the shading belongs to the default sort.

## Move the cutoff: 80/20 is a choice

The 80 in 80/20 isn't a law. It's a threshold someone picked. This data shows it: 4 of 8 categories is half of them, not a fifth. At product level the top 20% of products (503 of 2,516) bring in 73.4% of revenue, and it takes 642 products, about a quarter, to reach 80%.

So the last page lets the reader pick the cutoff. It needs a small table with no relationships, and a measure that reads the selection:

```dax
Pareto Cutoff = SELECTCOLUMNS ( { 0.5, 0.6, 0.7, 0.8, 0.9, 0.95 }, "Threshold", [Value] )

Selected Threshold = SELECTEDVALUE ( 'Pareto Cutoff'[Threshold], 0.8 )
```

Every `0.8` in the visual calculations becomes `[Selected Threshold]`. One detail: a visual calculation can only refer to fields on the visual, so the measure has to be on the chart. Add it and hide it, or do what I did and put it in the Tooltips well, where it stays out of sight.

![The cutoff page: a slicer from 50% to 95%, the chart re-colours at the selected cutoff, and a card and sentence report the count](./assets/img/posts/pareto-in-power-bi-dax-vs-visual-calculations/pareto-in-power-bi-cutoff.png)

| Cutoff | 50% | 60% | 70% | 80% | 90% | 95% |
|---|---:|---:|---:|---:|---:|---:|
| Categories to reach it | 2 | 2 | 3 | 4 | 5 | 6 |

The card and the sentence ("It takes 4 of 8 categories to reach 80% of revenue") are DAX measures reading the same slicer, so the chart and the numbers next to it always agree.

## Which one to use

Build the chart with visual calculations. It's shorter, adds nothing to the model, works on any axis, and the `ORDERBY` version gives the right values whatever the bars' order.

Add DAX measures when the number has to leave the chart: a card, a headline, a table, an export, or a report shown through Publish to web. The cutoff page uses both, a visual-calculation chart and measure-driven cards, and they agree because both read the same `[Selected Threshold]`.

## Build it yourself

The visual-calculation version, from a blank page. It needs one measure, Revenue, and one category column. To compare with a finished one, open the PBIX from [examples/pareto](https://github.com/goldlayerdata/gold-layer-examples/tree/main/examples/pareto).

1. Add a **Line and stacked column chart**. Put the category on **X-axis** and Revenue on **Column y-axis**.
2. Sort it largest first: **More options (...) > Sort axis > Revenue**, then **Sort axis > Sort descending**.
3. With the chart selected, choose **Home > New visual calculation** and enter the share. Select the hide icon next to it, because it is only an input:

    ```dax
    Percent of grand total = DIVIDE ( [Revenue], COLLAPSEALL ( [Revenue], ROWS ) )
    ```

4. Add the running total the same way, with the `ORDERBY`, and hide it too. The line is drawn from the two halves in the next step:

    ```dax
    Cumulative % = RUNNINGSUM ( [Percent of grand total], ORDERBY ( [Revenue], DESC ) )
    ```

5. Add the two halves of the line and the cutoff, and give all three a percentage format in the **Data format** settings. Both halves include the category that crosses 80%, so they join without a gap:

    ```dax
    Vital line = IF ( [Cumulative %] - [Percent of grand total] < 0.8, [Cumulative %] )
    Rest line = IF ( [Cumulative %] > 0.8, [Cumulative %] )
    Cutoff = 0.8
    ```

6. Add the bar colour, set its data type and format to **Text**, and hide it:

    ```dax
    Bar Color =
    IF ( [Cumulative %] - [Percent of grand total] < 0.8,
        "#F2C811",   -- gold: the vital few
        "#4A5C8C"    -- muted: the rest
    )
    ```

7. Select **Back to report**. Vital line, Rest line and Cutoff belong in **Line y-axis**; drag any that landed in Column y-axis across. Then in **Format visual**:
    - **Columns > Color > fx**: Format style **Field value**, based on Bar Color.
    - **Secondary y-axis > Range**: Minimum 0, Maximum 1, so 100% sits at the top.
    - **Lines**: pick each series under *Apply settings to*. Vital line in a strong colour, Rest line in a muted one, Cutoff dashed.
    - **Data labels**: on for the two halves, off for Cutoff.
8. Test the trap: sort the axis by category name. The bars move, and each category keeps its value. Sort back by Revenue.

To make the cutoff movable, replace each `0.8` with `[Selected Threshold]` and add that measure to the chart, as in the section above.
