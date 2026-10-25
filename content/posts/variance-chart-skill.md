# Actual vs target in Power BI, with the variance in green and red

Put actual and target side by side as two bars and the reader still has to do the subtraction. Which months beat target, and by how much? The chart knows; it just doesn't say.

A variance chart says it. The target is a pale bar, the actual a darker bar overlapping it, and a short connector between the two tops shows the gap: green where the month beat target, red where it missed. A ▲ or ▼ percentage sits above each pair. Power BI has no such visual, but it has everything needed to draw one.

![The variance chart in Power BI Desktop: Saltreach's exchange gold against target by month in 2025, green connectors where a month beat target, red where it missed, and a one-line summary as the subtitle](./assets/img/posts/variance-chart-skill/variance-chart-skill-chart.png)

The data is Realm Chronicle, the fantasy trading model I use for demos: gold traded at the Saltreach exchange in 2025 against the realm's monthly target. The skill's scripts wrote the measures and the chart; nothing was touched by hand afterwards.

## Error bars as connectors

Error bars normally show uncertainty around a value. Bind their upper bound to a measure, though, and they draw a line from the bar to wherever that measure points. Two measures, each blank unless the variance has its sign, turn them into connectors:

```dax
GREEN MAX = IF ( [Delta] > 0, [MAX VALUE] )
RED MAX   = IF ( [Delta] < 0, [MAX VALUE] )
```

`MAX VALUE` is the taller of actual and target. The target series gets `GREEN MAX` as its upper error bar and the actual series gets `RED MAX`. In any month only one of them is filled in, so exactly one connector appears, always from the lower bar up to the higher one. An invisible third series carries the label above the taller bar.

## The arrow label

The ▲/▼ label is a dynamic format string on the `% Delta` measure, one section for positive values, one for negative, one for zero:

```dax
"▲0%;▼0%;0%"
```

The sign becomes the arrow, and the colour comes from a small colour measure. Dynamic format strings need compatibility level 1601, so the skill raises the model's level when it is lower. Raising a level is a one-way change.

## A sentence instead of a legend

The subtitle can be a sentence the model writes for you:

> In 2025, we beat the target in 7 months, with the strongest overperformance in December and the longest winning streak of 3 months.

That is Saltreach's year, read off the chart above: July to September is the streak, and December's 26% is the best month.

Four measures count the winning months, find the best one, and measure the longest run of consecutive wins over an integer `YYYYMM` month key. Filter the page and the sentence follows.

## Packaging it as a skill

A Claude Code skill is a folder with a `SKILL.md` that the agent reads when your request matches its description, plus the templates and scripts it needs. This one adds six measures to your measure table, in one display folder with a description on each, plus four for the sentence if you want it. It writes the chart as one `visual.json` and comes with variants:

- against last year instead of a target, where the sentence talks about growth
- a ±tolerance band, where months within, say, 5% show grey with no connector
- a horizontal version ranked by product or region
- a minimal one without the sentence

It asks before choosing between two measure tables, creates `_Measures` only when there is none, lists everything it added, and never writes while Power BI Desktop has the project open.

## Testing it blind

I tested it the same way as the [Pareto skill](./post.html?slug=pareto-chart-skill): a sandbox outside my workspace, a plain sales fixture instead of the realm model, a fresh Claude Code session with no memory, the same prompt with and without the skill, the files graded, every chart opened in Power BI Desktop.

| | With the skill | Without |
|---|---|---|
| Checks passed | 100% | 48% |
| Average time to finish | 58 s | 350 s |

The checks test for this recipe, so they measure how closely the agent followed it. What the agent did without the skill is still telling. In the first test it drew plain variance bars, actual minus target, instead of the overlay, and its green and red conditional colour didn't apply, so every bar came out green, misses included. In another run it wrote a schema version that Power BI Desktop refused when the report opened.

![The same prompt without the skill (plain variance bars, all green) and with it](./assets/img/posts/variance-chart-skill/variance-chart-skill-comparison.png)

## Get it

The skill is on Agensi: [Actual vs Target Variance Chart for Power BI](AGENSI_URL). You need a Power BI project saved as PBIP with the PBIR report format and its model's TMDL on disk, Power BI Desktop, and Python 3.11 or newer for the scripts (standard library only, no network). The [Power BI Desktop Bridge CLI](https://learn.microsoft.com/en-us/power-bi/developer/agentic/power-bi-desktop-bridge-overview) and the [Power BI Modeling MCP](https://github.com/microsoft/powerbi-modeling-mcp) are good to have, not required.
