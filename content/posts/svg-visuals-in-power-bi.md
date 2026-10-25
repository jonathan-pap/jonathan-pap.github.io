# SVG visuals in Power BI, built from reusable parts

A table cell in Power BI can show an image, and a measure can return one. Write a measure whose text is an SVG drawing and every row of the table gets its own small chart: a progress bar, a coloured pill, a year of monthly bars. No custom visual, nothing to install, and it filters with the rest of the report.

The examples run on Realm Chronicle, the fantasy-economy model behind my demos. Each of its eight realms trades gold at an exchange and has a monthly target for it, and the question is the one every target raises: who is on track?

![A Power BI table of eight realms where three columns are SVG measures: progress to the exchange-gold target written in variable sections, the same bar built from functions, and a variance pill](./assets/img/posts/svg-visuals-in-power-bi/svg-visuals-realms.png)

The catch is that an SVG measure is a long string, and long strings get copied, tweaked and copied again until nobody can read them. This post is about writing them so that doesn't happen: in named sections first, then with the parts you repeat moved into DAX functions.

## The minimum that works

```dax
Hello SVG =
"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 20'>"
    & "<rect x='0' y='4' width='60' height='12' fill='#1B7F4A'/>"
    & "</svg>"
```

Four things make it an image rather than text:

- The string starts with `data:image/svg+xml;utf8,`.
- The `<svg>` tag has the `xmlns` attribute and a **`viewBox`**. Without a viewBox the drawing has no size of its own; in a wide column it can render as a flat grey box.
- The measure's **data category is Image URL** (Measure tools, Data category). Without it the table shows the text.
- The SVG attributes use **single quotes**, so nothing inside the DAX string needs escaping.

In a table, set the image size under Grid, Image size, to match the viewBox's proportions.

## Two plain measures feed every example

```dax
Exchange Gold = SUM ( FactExchangeTrades[Gold] )

Exchange Gold Target = CALCULATE ( SUM ( FactRealmTargets[TargetValue] ), DimTargetMetric[Metric] = "Exchange Gold" )
```

## Write it in sections

Here is a progress bar: how far each realm's exchange got toward its gold target in 2025, green on a beat and red on a miss, with a light marker at 100%. It is written the way I now write every SVG measure, in five labelled blocks of variables:

```dax
Progress Bar =
-- 1. Settings: size and colours, in one place
VAR _W = 120
VAR _H = 20
VAR _Track = "#2B3A55"
VAR _Fill = IF ( [Exchange Gold] >= [Exchange Gold Target], "#3FAE74", "#E2564A" )
VAR _MarkerColor = "#E8ECF5"

-- 2. Data
VAR _Share = DIVIDE ( [Exchange Gold], [Exchange Gold Target] )

-- 3. Scale: the target sits at 80% of the width, so a beat has room to show
VAR _TargetX = _W * 0.8
VAR _BarW = MIN ( _Share, 1.25 ) * _TargetX

-- 4. Shapes, one per variable
VAR _Background = "<rect x='0' y='6' width='" & _W & "' height='8' fill='" & _Track & "'/>"
VAR _Bar = "<rect x='0' y='6' width='" & FORMAT ( ROUND ( _BarW, 1 ), "General Number", "en-US" ) & "' height='8' fill='" & _Fill & "'/>"
VAR _Marker = "<rect x='" & _TargetX & "' y='2' width='2' height='16' fill='" & _MarkerColor & "'/>"

-- 5. Assembly
RETURN
    IF (
        NOT ISBLANK ( _Share ),
        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " & _W & " " & _H & "'>"
            & _Background & _Bar & _Marker
            & "</svg>"
    )
```

![The five sections as a picture being built. Settings fix a 120 by 20 canvas and the colours. Data gives a share of 1.10, a beat. Scale puts the target at 96 and makes the bar 105.6 wide. Shapes draws the track, the bar and the marker separately. Assembly stacks them into the final image, shown for a beat and for a miss](./assets/img/posts/svg-visuals-in-power-bi/svg-visuals-steps.svg)

Each section has one job, and that pays off quickly:

- **Settings** at the top. These colours suit Realm Chronicle's dark navy theme; on a white report, change the track and the marker here, once, not in three tags.
- **Data** is the only part tied to your model. Point the same bar at other measures by changing two lines.
- **Scale** turns values into pixels, so the shapes never contain arithmetic you have to decode.
- **Shapes**, one variable each. When the image breaks, return a single shape from a test measure to see which one is wrong.
- **Assembly** is a plain concatenation you can read.

## Move the repeated parts into functions

After the third SVG measure, the same pieces keep coming back: the opening tag, a rectangle, a label. DAX user-defined functions, generally available since the June 2026 release of Power BI (they need compatibility level 1702), let you write each piece once. Define them in DAX query view or TMDL view; Microsoft's documentation walks through both:

```dax
DEFINE
    FUNCTION Svg.Num = ( number : NUMERIC ) => FORMAT ( ROUND ( number, 2 ), "General Number", "en-US" )
    FUNCTION Svg.Image = ( width : NUMERIC, height : NUMERIC, shapes : STRING ) =>
        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 "
            & Svg.Num ( width ) & " " & Svg.Num ( height )
            & "' preserveAspectRatio='xMinYMid meet'>"
            & shapes
            & "</svg>"
    FUNCTION Svg.Rect = ( x : NUMERIC, y : NUMERIC, width : NUMERIC, height : NUMERIC, radius : NUMERIC, fill : STRING ) =>
        "<rect x='" & Svg.Num ( x ) & "' y='" & Svg.Num ( y )
            & "' width='" & Svg.Num ( MAX ( width, 0 ) ) & "' height='" & Svg.Num ( MAX ( height, 0 ) )
            & "' rx='" & Svg.Num ( radius ) & "' fill='" & fill & "'/>"
    FUNCTION Svg.Label = ( x : NUMERIC, y : NUMERIC, label : STRING, color : STRING ) =>
        "<text x='" & Svg.Num ( x ) & "' y='" & Svg.Num ( y ) & "' fill='" & color
            & "' font-family='Segoe UI' font-size='11' font-weight='600' text-anchor='middle'>"
            & SUBSTITUTE ( SUBSTITUTE ( label, "&", "&amp;" ), "<", "&lt;" )
            & "</text>"
```

The dot in `Svg.Rect` is just part of the name, a convention that keeps a family of functions together. With them, the progress bar shrinks to this, and renders exactly the same picture as the sectioned version (the two bar columns in the table above):

```dax
Progress Bar =
VAR _Share = DIVIDE ( [Exchange Gold], [Exchange Gold Target] )
VAR _Fill = IF ( [Exchange Gold] >= [Exchange Gold Target], "#3FAE74", "#E2564A" )
RETURN
    IF (
        NOT ISBLANK ( _Share ),
        Svg.Image (
            120, 20,
            Svg.Rect ( 0, 6, 120, 8, 0, "#2B3A55" )
                & Svg.Rect ( 0, 6, MIN ( _Share, 1.25 ) * 96, 8, 0, _Fill )
                & Svg.Rect ( 96, 2, 2, 16, 0, "#E8ECF5" )
        )
    )
```

And the next measure costs almost nothing. The variance pill reuses the same three functions:

```dax
Variance Pill =
VAR _Delta = DIVIDE ( [Exchange Gold] - [Exchange Gold Target], [Exchange Gold Target] )
VAR _Fill = IF ( _Delta >= 0, "#3FAE74", "#E2564A" )
RETURN
    IF (
        NOT ISBLANK ( _Delta ),
        Svg.Image (
            64, 20,
            Svg.Rect ( 2, 2, 60, 16, 8, _Fill )
                & Svg.Label ( 32, 14, FORMAT ( _Delta, "+0%;-0%;0%" ), "#FFFFFF" )
        )
    )
```

Fix a bug in `Svg.Rect` and every measure that draws a rectangle is fixed with it.

## Repeat a shape for every row of a table

The functions earn their keep when the same shape repeats inside one image. `CONCATENATEX` builds one rectangle per row of a table and joins them. Here each realm's cell holds its twelve months of 2025, a bar per month and a tick at that month's target:

```dax
Months Chart =
-- one bar per month, a target tick on each: the same two shapes, repeated by CONCATENATEX
VAR _Months =
    ADDCOLUMNS ( VALUES ( DimDate[YearMonth] ), "@actual", [Exchange Gold], "@target", [Exchange Gold Target] )
VAR _Max = MAXX ( _Months, MAX ( [@actual], [@target] ) )
VAR _Step = 240 / COUNTROWS ( _Months )
VAR _Bars =
    CONCATENATEX (
        _Months,
        VAR _i = RANKX ( _Months, DimDate[YearMonth], , ASC )
        VAR _x = ( _i - 1 ) * _Step + 2
        VAR _h = DIVIDE ( [@actual], _Max ) * 50
        VAR _t = 56 - DIVIDE ( [@target], _Max ) * 50
        RETURN
            Svg.Rect ( _x, 56 - _h, _Step - 4, _h, 1, IF ( [@actual] >= [@target], "#3FAE74", "#E2564A" ) )
                & IF ( NOT ISBLANK ( [@target] ), Svg.Rect ( _x - 1, _t - 1, _Step - 2, 2, 0, "#E8ECF5" ) ),
        "",
        DimDate[YearMonth], ASC
    )
RETURN
    IF ( NOT ISBLANK ( [Exchange Gold] ), Svg.Image ( 240, 60, _Bars ) )
```

![Eight realms, each with twelve monthly bars of exchange gold in 2025, green where the month beat its target and red where it missed, each with a light target tick](./assets/img/posts/svg-visuals-in-power-bi/svg-visuals-months.png)

`RANKX` gives each month its position, the sort argument of `CONCATENATEX` keeps them in order, and the two calls to `Svg.Rect` are the only drawing code. The guard on the last line matters: without it, a realm with no exchange still gets an image, an empty row of ticks. The Sunder Maw, a maelstrom with no trading post, showed up exactly like that until the guard went in.

## What broke while I tested this

Every block above ran in Power BI Desktop before I wrote it up. These are the traps I hit on the way, so you don't have to:

- **A trailing point breaks the whole image.** `FORMAT ( 88, "0.##" )` returns `"88."`, which is not a valid SVG number. In my first test one bar went missing because its width came out as a whole number, and a version of `Svg.Num` that used the same format string blanked every image at once, since its viewBox read `0 0 120. 20.`. `FORMAT ( ROUND ( n, 2 ), "General Number", "en-US" )` gives `88`, `99.84`, `-3.5`.
- **Force the decimal point.** The `"en-US"` argument keeps decimals as `99.84` on machines and models set to a comma-decimal locale. A comma inside an SVG number breaks the shape.
- **Reserved words are not allowed as names.** A parameter called `value`, `content` or `caption` is a syntax error, and so is a function named `Svg.Text`, `Svg.Open`, `Svg.Close`, `Svg.Start` or `Svg.Begin`. `Svg.Label`, `Svg.Image`, `width`, `fill` and `label` are fine. If a definition fails on a name, rename it before you look anywhere else.
- **Escape text.** An `&` or `<` in a label makes the SVG invalid XML. `Svg.Label` replaces them with `&amp;` and `&lt;`. Named HTML entities such as `&nbsp;` blank the image too; use the character itself or a numeric entity such as `&#160;`.
- **Write colours with `#`.** `fill='#3FAE74'` works; URL-encoding it as `%23` breaks the image visual.
- **Totals get an image too.** The measure is evaluated on the total row. Here the total progress bar means something; where it doesn't, return BLANK unless `HASONEVALUE` on the row's column.
- **Keep it small.** Power BI caps how long an image measure's text can be, at roughly 32,000 characters. The largest image here is under 2,000.

## Where to go from here

For a complete library rather than four functions, [DAX Lib](https://daxlib.org) has an SVG package, DaxLib.SVG, with the building blocks and ready-made charts such as sparklines, heatmaps and violin plots. Microsoft's [guidance on DAX user-defined functions](https://learn.microsoft.com/en-us/dax/best-practices/dax-user-defined-functions) covers parameter types and naming rules.

And know when to stop. An SVG image is a picture: no tooltip on a single bar, no click to cross-filter. When people need to interact with the chart, a native visual is the better tool.
