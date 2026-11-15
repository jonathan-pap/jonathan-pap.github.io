# Compatibility levels in Power BI: what each one unlocks (as of November 2026)

*As of 15 November 2026. Levels move: four new ones appeared between October and November alone. The change log at the end lists every update to this page.*

Every semantic model carries a number most people never look at: its compatibility level. It decides which features the model is allowed to use. Dynamic format strings, Direct Lake, DAX functions, full-text search: each one needs the model to be at a certain level or higher.

This page is a map, not advice. The right level depends on who opens your model and where it's deployed, so it lists what each level unlocks, what is still in preview, and what changes when the number goes up.

## Where the number lives

In a Power BI project (PBIP) saved with TMDL, it's one line in the model's `definition/database.tmdl`:

```text
database
	compatibilityLevel: 1702
```

In the older `model.bim` format it's the `compatibilityLevel` property near the top of the file. On a model you reach through SQL Server Management Studio, it's under the database's Properties, Compatibility Level. Power BI Desktop has no field that shows it.

Levels drift apart even in one person's work. When I counted in October 2026, my own 45 models sat at five different levels: 29 at 1606, 7 at 1702, 6 at 1600, 2 at 1567 and 1 at 1601.

## What each level unlocks

Microsoft's Tabular Object Model (TOM) reference records the minimum level for each feature, in a sentence like *"only supported when the compatibility level of the database is at 1601 or above"*. These are the levels with a Power BI feature behind them:

| Level | What it unlocks | Preview? |
|---|---|---|
| 1470 | Calculation groups | No. 1470 is TOM's minimum; Learn's calculation groups page says 1500 for Analysis Services and Power BI |
| 1601 | Dynamic format strings on measures | No |
| 1604 | Direct Lake | Fabric's Direct Lake docs give the same number |
| 1605 | Calculation group selection expressions, for no selection and for multiple or empty selections | Not labelled |
| 1606 | Value filter behavior, replacing the older, now unused `DisableAutoExists` setting (1566) | Preview |
| 1609 | Selection expression behavior, a model-wide setting for the expressions above | Not labelled |
| 1701 | Calendars, for calendar-based time intelligence | Preview |
| 1702 | DAX user-defined functions | GA since the June 2026 release |
| 1705 | User-context calculated columns (`USERPRINCIPALNAME`, `USERCULTURE` and similar, set through the column's Expression Context) | Preview since April 2026 |
| 1706 or 1707 | String indexing | Preview. Learn disagrees with itself: the TOM reference says 1706, the string indexing article says 1707 |
| 1708 | Full-text indexing, which the new `TEXTCONTAINS` and `TEXTSIMILARITY` DAX functions need | Preview |

The TOM reference also lists two properties without a Power BI feature page yet: a binding-info collection at 1608 and a metadata access policy at 1703, which hides sensitive metadata such as measure definitions from read-only users.

"Preview" means Learn labels the feature as preview; "not labelled" means Learn shows no preview label, which isn't the same as a stated release. Everything from 1705 up is preview, so "the latest level" today mostly unlocks features that can still change.

## Analysis Services stops at 1700

The numbers aren't a strict timeline across products. Microsoft's Analysis Services table lists 1200, 1400, 1500, 1600 and 1700, calls 1700 the latest, and puts Power BI Premium in that row. For Power BI that's out of date: DAX functions need 1702 and are generally available, so Power BI and Fabric already run models well above 1700. The 16xx levels in between don't appear in that table at all.

Analysis Services itself does stop at 1700:

| Level | Analysis Services that supports it |
|---|---|
| 1700 | SQL Server 2025, Azure Analysis Services |
| 1600 | SQL Server 2022, Azure Analysis Services |
| 1500 | SQL Server 2019 and 2022, Azure Analysis Services |
| 1400 | SQL Server 2017, 2019 and 2022, Azure Analysis Services |
| 1200 | SQL Server 2016 to 2022, Azure Analysis Services |

A model that only lives in Power BI and Fabric can go past 1700. A model that also has to run on Analysis Services can't.

## How the level goes up

PBIP made it easy to add a feature as text: a `formatStringDefinition` on a measure, a `function` block in `functions.tmdl`, a `fullTextIndexingBehavior` on a column. The text doesn't check the level. Power BI does, when it loads the model, and refuses it with a message like this one from my notes:

> The database compatibility level of 1600 is below the minimal compatibility level of 1601 needed for the … FormatStringDefinition feature.

The level can go up in several ways:

- **TMDL view asks first.** Microsoft documents it: when a change needs a higher level, TMDL view in Desktop and on the web shows a prompt naming the objects that need the upgrade. The full-text indexing article says the same for the web.
- **Tools raise it as part of a job.** My variance-chart skill moves a model to 1601 when it adds its dynamic format string, and anything that installs DAX functions has to take the model to 1702.
- **Tabular Editor 3 has its own defaults.** Since its September 2026 release it creates new Power BI models at 1706, and it doesn't upgrade existing models automatically. Its built-in Best Practice Analyzer rule "Use Latest Compatibility Level for Power BI Models" flags anything below 1706.
- **By hand**, by editing the one line in `database.tmdl` or the property in Tabular Editor or SSMS.

Tabular Editor also has a separate setting, the compatibility *mode*: Power BI or Analysis Services. It decides which features the tool offers, independent of the number.

## What changes when the number goes up

**It's one way.** Microsoft's Analysis Services documentation: *"upgrading the compatibility level is irreversible."* Tabular Editor's docs say downgrades aren't supported. In a PBIP under Git, the way back is the commit before the raise.

**It changes the whole model.** The level belongs to the database, not to a measure. One dynamic format string on one measure moves every table and report on that model with it.

**Everything that opens the model has to know the new level.** That includes the Power BI Desktop on every colleague's machine, the tools that edit the model, and every deployment target. Microsoft's full-text indexing article lists it as a prerequisite: a client tool version that recognises level 1708. Analysis Services stops at 1700, as above. Tabular Editor blocks a deploy to a target that doesn't support the level. Deploying through the XMLA endpoint needs the capacity's endpoint set to Read Write, as it does at any level. I found no tenant setting that covers compatibility levels or DAX functions.

## "Automatic" settings and the level

Two model settings default to Automatic, and Microsoft has said Automatic will change meaning. Neither has changed yet.

- **Selection expression behavior.** Microsoft's calculation group documentation: *"Models above a future compatibility level set to automatic will use visual instead."* No level has been named. Microsoft says there will be an announcement.
- **Value filter behavior.** Automatic currently means Coalesced, the old behaviour. Learn: *"When we wrap up this preview, new models set to Automatic will use Independent."* That's tied to new models, not to a level number. SQLBI's article on the setting shows what the difference does: totals of measures that remove the filter on one column can change between Coalesced and Independent.

When either change lands, a report's numbers can move without anyone touching a measure. That's the part of this page most likely to need an update.

## Sources

- Microsoft Learn: [compatibility levels for tabular models](https://learn.microsoft.com/analysis-services/tabular-models/compatibility-level-for-tabular-models-in-analysis-services), the TOM reference for each property, [calculation groups](https://learn.microsoft.com/analysis-services/tabular-models/calculation-groups), [Direct Lake development](https://learn.microsoft.com/fabric/fundamentals/direct-lake-develop), [calendar-based time intelligence](https://learn.microsoft.com/power-bi/transform-model/desktop-time-intelligence), [DAX user-defined functions](https://learn.microsoft.com/dax/best-practices/dax-user-defined-functions), [calculated columns and Expression Context](https://learn.microsoft.com/power-bi/transform-model/desktop-calculated-columns), [full-text indexing](https://learn.microsoft.com/analysis-services/azure-analysis-services/full-text-indexing), [TMDL view](https://learn.microsoft.com/power-bi/transform-model/desktop-tmdl-view), [XMLA endpoint](https://learn.microsoft.com/fabric/enterprise/powerbi/service-premium-connect-tools)
- Tabular Editor: [change compatibility mode](https://docs.tabulareditor.com/en/how-tos/change-compatibility-mode.html), the compatibility level how-to and the September 2026 release notes
- SQLBI: [Understanding value filter behavior in SUMMARIZECOLUMNS](https://www.sqlbi.com/articles/understanding-value-filter-behavior-in-summarizecolumns)

## Change log

- **15 November 2026:** rewritten as a dated map. Added 1705, 1706/1707 and 1708, preview labels for 1606 and 1701, the TMDL view prompt, Tabular Editor 3's defaults, and a corrected section on Automatic settings (neither change has landed yet).
- **25 October 2026:** first draft, levels up to 1702.
