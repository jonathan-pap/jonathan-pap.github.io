# A candlestick chart in Power BI, no custom visual

A candlestick shows four prices per period in one mark: a body from the open to the close, green when the period closed up and red when it closed down, and a thin wick from the low to the high. Traders read a month of them at a glance.

Power BI has no candlestick visual. The usual answers are a custom visual from AppSource, a Deneb spec, or an SVG measure. Each brings a dependency or gives up the things a native chart does for free: tooltips, cross-filtering, slicers. Power BI's own line-and-column chart can draw one, though.

![Daily candles for the Crownsplitter at the Cinder Bourse, first quarter of 2025, in Power BI Desktop: green and red bodies, thin wicks and a dotted 20-day average](./assets/img/posts/candlestick-chart-skill/candlestick-chart-skill-chart.png)

The prices come from Realm Chronicle, the fantasy trading model I use for demos: the daily price of one item, the Crownsplitter, at Emberwaste's exchange, the Cinder Bourse. The skill's scripts wrote the measures and the chart, with the item fixed by a filter instead of a slicer. The realm and quarter filters on the page are mine.

## Three tricks make the chart

- **The body floats.** A stacked column starts at zero, so a transparent series sits underneath, as tall as the lower of open and close. The visible body sits on top of it. The body is split into an up series and a down series so each gets one solid colour.
- **The wicks are error bars.** The high and the low go on the secondary axis as invisible lines. Each carries an error bar, relative to itself: the high's reaches down to the top of the body, the low's up to the bottom. What you see is a thin line from low to high that touches the body.
- **Both axes share one range.** The bodies are on the primary axis and the wicks on the secondary. Pin both to the same minimum and maximum, or the wicks float off their candles.

## Where the usual build goes wrong

I had built this chart before, on one dataset, and it worked. Turning it into a skill meant testing it on new data, and that turned up four bugs that only a different shape of data shows:

- **Weekly candles were wrong.** The open measure was `SUM ( Prices[Open] )`. On a date axis each candle sees one row, so that is fine. On a week axis it adds five opens together.
- **Two tickers added up.** With no ticker selected, the chart drew the sum of both price series, a price nobody ever traded.
- **The wicks were clipped.** The axis was fitted to the closing prices, and every high above the highest close ran off the chart.
- **The moving average read low.** It divided a sum of closes by a count of calendar days. On a market that closes at weekends, that is two days too many in every week.

The fix for the first is to say what a candle is: the period's first open, highest high, lowest low and last close.

```dax
Candle Open =
    VAR _first = MIN ( 'Prices'[Date] )
    RETURN
        IF (
            HASONEVALUE ( 'Prices'[Ticker] ),
            CALCULATE ( SUM ( 'Prices'[Open] ), 'Prices'[Date] = _first )
        )
```

The same `HASONEVALUE` guard fixes the second: the prices are blank unless one ticker is in context, and a slicer set to force a selection always opens on a ticker. The axis now spans the lowest low to the highest high, plus 5% of the range. The average takes the last 20 dates that have a close, and drops any date filter first, so the window still reaches back past a date slicer.

![Monthly candles for the Crownsplitter from 2023 to 2026, built from the same daily rows: each one is the month's first open, highest high, lowest low and last close](./assets/img/posts/candlestick-chart-skill/candlestick-chart-skill-monthly.png)

The same measures on a month axis, with no change to the DAX: four years of the Crownsplitter, one candle per month.

## Packaging it as a skill

A Claude Code skill is a folder with a `SKILL.md` that the agent reads when your request matches its description, plus the templates and scripts it needs. This one adds thirteen measures and the moving average to your measure table, in one display folder with a description on each. It writes the chart as `visual.json` files, and on request:

- a volume pane under the candles, lined up candle for candle
- a ticker slicer that opens on a ticker, or a fixed filter when you name one
- a hover panel with the period's open, high, low, close and change
- hollow up-candles, and notes for Heikin-Ashi candles, OHLC bars and a small candle chart per table row

It asks before choosing between two measure tables, creates `_Measures` only when there is none, refuses a measure name your model already has, and never writes while Power BI Desktop has the project open.

## Testing it blind

Same method as the [Pareto](./post.html?slug=pareto-chart-skill) and [variance](./post.html?slug=variance-chart-skill) skills: a sandbox outside my workspace, a small two-ticker market fixture instead of the realm model, a fresh Claude Code session with no memory, the same prompt with and without the skill, the files graded, every chart opened in Power BI Desktop. The three prompts asked for daily candles with a ticker slicer, a "classic trading chart" with volume that never says candlestick, and weekly candles from daily rows.

| | With the skill | Without |
|---|---|---|
| Checks passed | 100% | 44% |
| Average time to finish | 89 s | 629 s |

Without the skill the agent got the arithmetic right: it took the first open and the last close, and its average counted trading days. Where it struggled was the drawing. It built the wicks as wide pale column segments on a white base, and typed the axis range in by hand. In the first test every candle came out red, up days included. The other two failed in Desktop: one used a schema version the validator rejects, and Desktop could not capture its page; the other showed "Something's wrong with one or more fields" where the chart should be.

![The same prompt without the skill (red bars with pale wick blocks, squashed into the top of a hand-typed axis) and with it](./assets/img/posts/candlestick-chart-skill/candlestick-chart-skill-comparison.png)

Separately, I checked the measures number by number on the two-ticker test model: every daily candle of one ticker against its row, every weekly candle of the other against its week, the average against the last 20 closes, and both tickers in context returning blank.

## Get it

The skill is on Agensi: [Candlestick Chart for Power BI](AGENSI_URL). You need a Power BI project saved as PBIP with the PBIR report format and its model's TMDL on disk, a price table with a row per ticker and period, Power BI Desktop, and Python 3.11 or newer for the scripts (standard library only, no network). The [Power BI Desktop Bridge CLI](https://learn.microsoft.com/en-us/power-bi/developer/agentic/power-bi-desktop-bridge-overview) and the [Power BI Modeling MCP](https://github.com/microsoft/powerbi-modeling-mcp) are good to have, not required.
