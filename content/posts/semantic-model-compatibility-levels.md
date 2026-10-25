# Compatibility levels in Power BI: what each one unlocks, and what raising it costs

Every semantic model carries a number most people never look at: its compatibility level. It decides which features the model is allowed to use. Dynamic format strings, Direct Lake, DAX functions: each one needs the model to be at a certain level or higher.

Raising the level is a one-way change, and it no longer takes a person to do it. Install a DAX function library, or ask an agent for a chart that needs a dynamic format string, and the level may go up as a side effect. That's worth knowing about before it happens.

## Where the number lives

In a Power BI project (PBIP) saved with TMDL, it's one line in the model's `definition/database.tmdl`:

```text
database
	compatibilityLevel: 1702
```

In the older `model.bim` format it's the `compatibilityLevel` property near the top of the file. On a model you reach through SQL Server Management Studio, it's under the database's Properties, Compatibility Level.

Levels drift apart even in one person's work. Across 45 models in my own projects: 29 sit at 1606, 7 at 1702, 6 at 1600, 2 at 1567 and 1 at 1601.

## What each level unlocks

Microsoft's Tabular Object Model reference records the minimum level for each feature, in a sentence like *"only supported when the compatibility level of the database is at 1601 or above"*. These are the levels that matter for Power BI today:

| Level | What it unlocks | Notes |
|---|---|---|
| 1470 | Calculation groups | Analysis Services needs 1500 for them |
| 1601 | Dynamic format strings on measures | |
| 1604 | Direct Lake | Fabric's Direct Lake docs give the same number |
| 1605 | Calculation group selection expressions | for no selection, and for multiple or empty selections |
| 1606 | Value filter behavior | replaces the older, now unused `DisableAutoExists` setting (1566) |
| 1609 | Selection expression behavior | a model-wide setting for the expressions above |
| 1701 | Calendars, for calendar-based time intelligence | still in preview |
| 1702 | DAX user-defined functions | generally available since the June 2026 release |

The numbers aren't a strict timeline. Microsoft's Analysis Services table lists 1200, 1400, 1500, 1600 and 1700, and still calls 1700 the latest, with Power BI Premium in that row. For Power BI that's out of date: DAX functions need 1702 and are generally available in the Power BI service, so Power BI and Fabric already run models above 1700. The 16xx levels in between don't appear in that table at all. Analysis Services itself does stop at 1700: SQL Server 2025 and Azure Analysis Services go no higher.

If a model only ever lives in Power BI and Fabric, the Analysis Services list is history. If it has to run on Analysis Services too, it's the list that matters:

| Level | Analysis Services that supports it |
|---|---|
| 1700 | SQL Server 2025, Azure Analysis Services |
| 1600 | SQL Server 2022, Azure Analysis Services |
| 1500 | SQL Server 2019 and 2022, Azure Analysis Services |
| 1400 | SQL Server 2017, 2019 and 2022, Azure Analysis Services |
| 1200 | SQL Server 2016 to 2022, Azure Analysis Services |

## When a feature arrives before the level

PBIP made it easy to add a feature as text: a `formatStringDefinition` on a measure, a `function` block in `functions.tmdl`. The text doesn't check the level. Power BI does, when it loads the model, and refuses it with a message like this one from my notes:

> The database compatibility level of 1600 is below the minimal compatibility level of 1601 needed for the … FormatStringDefinition feature.

So the tools that write those features raise the level for you. My variance-chart skill moves a model to 1601 when it adds its dynamic format string, and anything that installs DAX functions has to take the model to 1702. That's the right behaviour, as long as someone knows it happened.

## What raising it costs

**It's one way.** Microsoft's Analysis Services documentation is plain about it: *"upgrading the compatibility level is irreversible."* There's no setting to take a model back down. In a PBIP under Git, your way back is the commit before the raise, so make the raise its own commit.

**It changes the whole model.** The level belongs to the database, not to a measure. One dynamic format string on one measure moves every table, report and colleague onto the new level with it.

**Everything that opens the model has to know the new level.** That includes the Power BI Desktop on every colleague's machine, the tools you edit the model with, and wherever it's deployed. Analysis Services is the hard edge: its table stops at 1700. A model at 1702, which is any model with DAX functions, is beyond what Microsoft lists for SQL Server 2025 and Azure Analysis Services. The 1601 to 1609 levels aren't listed there either. The tenant isn't on the list: no admin setting covers compatibility levels or DAX functions. Deploying through the XMLA endpoint needs the capacity's endpoint set to Read Write, as it does at any level.

**"Automatic" can change meaning.** Some model settings default to Automatic, and the level decides what Automatic means. Microsoft's calculation group documentation says so outright about selection expressions: *"Models above a future compatibility level set to automatic will use visual instead."* A raise can change how a report behaves without anyone touching a measure. After one, check the numbers in reports that lean on calculation groups or filters.

## Before the next raise

For most models today, the next raise is to 1702, for DAX functions. They're generally available, they make repeated DAX far easier to maintain, and libraries of them are growing. That's a good reason to move. A short checklist first:

1. **Name the feature and its level.** Raise only as far as the feature needs, from the table above.
2. **Check who opens the model.** Colleagues' Desktop versions, your editing tools, and every deployment target. If any of them is Analysis Services, stop at its level.
3. **Commit the raise on its own**, with the feature that needed it in the message. The diff is one line in `database.tmdl`, which makes it easy to spot and easy to revert.
4. **Tell your agents.** A line in the project's instructions such as *"never change compatibilityLevel without asking"* turns a silent side effect into a question.
5. **Recheck the reports** that use calculation groups or value filters, in case an Automatic setting now behaves differently.

The level is the smallest file change in a PBIP and one of the hardest to undo. It deserves a review like any other.
