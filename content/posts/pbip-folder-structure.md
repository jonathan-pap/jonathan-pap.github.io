# Know your PBIP: what every file in a Power BI project is for

Save a report as a Power BI project (PBIP) and the single `.pbix` splits into a folder of plain text files. That's what makes Git, code review and CI/CD possible. It's also what lets an AI agent open your model and change it.

Agents are fast. They'll edit any file you point them at, and a few of those files will break Power BI Desktop, leak data, or be silently overwritten the next time someone clicks Save. The answer isn't to slow the agent down. It's knowing the folder well enough to point it at the right files, and to read what it changed.

This is the map I wish I'd had.

## The whole project at a glance

```text
Sales/
├── Sales.pbip                      open this in Power BI Desktop
├── .gitignore                      keeps cache + personal files out
│
├── Sales.SemanticModel/            the model
│   ├── definition.pbism            model settings, format version
│   ├── definition/                 the model itself, in TMDL
│   │   ├── database.tmdl
│   │   ├── model.tmdl
│   │   ├── relationships.tmdl
│   │   ├── expressions.tmdl
│   │   ├── functions.tmdl
│   │   ├── tables/<Table>.tmdl
│   │   └── roles/ perspectives/ cultures/
│   ├── diagramLayout.json          model view diagrams
│   ├── DAXQueries/                 saved DAX query tabs
│   ├── TMDLScripts/                saved TMDL view tabs
│   ├── .platform                   Fabric Git identity
│   └── .pbi/
│       ├── editorSettings.json     shared editor settings
│       ├── localSettings.json      you + this machine only
│       ├── unappliedChanges.json   Power Query edits not applied
│       └── cache.abf               a copy of the DATA
│
└── Sales.Report/                   the report
    ├── definition.pbir             which model it uses
    ├── definition/                 the report itself, in PBIR
    │   ├── report.json
    │   ├── version.json
    │   ├── reportExtensions.json
    │   ├── pages/pages.json
    │   ├── pages/<page>/page.json
    │   ├── pages/<page>/visuals/<visual>/visual.json
    │   └── bookmarks/
    ├── StaticResources/            themes, images, visuals
    ├── .platform
    └── .pbi/localSettings.json
```

Not every project has every file. Most appear only once you use the feature behind them, and a thin report connected to a published model has no `.SemanticModel` folder at all.

## The two files at the top

**`Sales.pbip`** is only a pointer: it names the report folder, and opening it opens the report and, through the report, its model. It's optional. Fabric Git integration doesn't create one, and you can open `definition.pbir` in the report folder instead.

**`.gitignore`** is written by Desktop the first time you save, if the folder or repo doesn't already have one:

```text
**/.pbi/localSettings.json
**/.pbi/cache.abf
```

Those two lines matter more than anything else in this post. Keep them.

## The semantic model folder

| File | What it holds | Let an agent edit it? | In Git? |
|---|---|---|---|
| `definition.pbism` | Model-level settings. A `version` of 4.0 or higher means the model can be stored as TMDL | Rarely | Yes |
| `definition/` | The model in TMDL: every table, column, measure, relationship and role | Yes, this is the target | Yes |
| `model.bim` | The older single-file format (TMSL, one big JSON file), used instead of `definition/` | Convert to TMDL first | Yes |
| `diagramLayout.json` | Diagram positions in model view | Never: not supported outside Desktop | Yes |
| `DAXQueries/*.dax` | One file per DAX query view tab | Yes | By default |
| `TMDLScripts/*.tmdl` | One file per TMDL view script tab | Yes | By default |
| `.platform` | Item type, display name and a `logicalId` that Fabric Git integration uses to match items | No | Yes |
| `.pbi/editorSettings.json` | Editor settings shared by everyone, like type detection and relationship auto-detect | Rarely | Yes |
| `.pbi/localSettings.json` | Settings for you on this machine only | No | **Never** |
| `.pbi/unappliedChanges.json` | Power Query edits saved with *Apply later* | With care (see rule 3) | By default |
| `.pbi/cache.abf` | A backup of the model **with its data** | **Never** | **Never** |

### Inside the model's `definition/`

TMDL splits the model into readable files, which is what makes diffs and merges manageable:

- **`database.tmdl`**: the compatibility level.
- **`model.tmdl`**: model-wide settings such as culture and data access options, plus references to the tables, roles and cultures.
- **`tables/<Table>.tmdl`**: one file per table, with its columns, measures, hierarchies and partitions, including the Power Query (M) that loads it.
- **`relationships.tmdl`**: every relationship.
- **`expressions.tmdl`**: shared queries and parameters.
- **`functions.tmdl`**: DAX user-defined functions.
- **`roles/`, `perspectives/`, `cultures/`**: security roles, perspectives, and translations and linguistic metadata.

Tables, columns and measures carry a `lineageTag`, a GUID that acts as the object's identity. Agents like to copy a measure block and change the name. Make sure they don't copy the tag with it.

Direct Lake and composite models have one more rule. Their tables are synced from a source, so an edit to a synced object needs `changedProperties` set, and a removed one needs a `PBI_RemovedChildren` annotation. Without them, the next sync with the source quietly undoes the change.

## The report folder

| File | What it holds | Let an agent edit it? | In Git? |
|---|---|---|---|
| `definition.pbir` | Which model the report uses: `byPath` (a model folder next to it) or `byConnection` (a published model, opened read-only) | Only with Desktop closed | Yes |
| `definition/` | The report in PBIR: one file per page, visual and bookmark | Yes, this is the target | Yes |
| `report.json` *(in the folder root)* | The older single-file report format, PBIR-Legacy | Never: not supported outside Desktop | Yes |
| `StaticResources/RegisteredResources/` | Your custom themes, images and custom visual packages. Edits work for files the report already uses; Desktop picks them up after a restart | Yes, themes especially | Yes |
| `StaticResources/SharedResources/` | Built-in base themes | No | Yes |
| `CustomVisuals/` | Private custom visuals | No | Yes |
| `mobileState.json` | The report's phone layout | Never: not supported outside Desktop | Yes |
| `semanticModelDiagramLayout.json` | Diagrams of the model the report uses | Never: not supported outside Desktop | Yes |
| `.platform` | Identity for Fabric Git integration | No | Yes |
| `.pbi/localSettings.json` | You and this machine only | No | **Never** |

PBIR is now Power BI's default report format. Edit and save an older report and it's converted for you, with a backup kept for 30 days.

### Inside the report's `definition/`

- **`report.json`**: report-wide settings: theme, report-level filters and options.
- **`version.json`**: the PBIR version.
- **`reportExtensions.json`**: report-level measures, the ones that live in the report rather than the model.
- **`pages/pages.json`**: page order, and the page that opens first.
- **`pages/<page>/page.json`**: one page: name, size, page filters, background.
- **`pages/<page>/visuals/<visual>/visual.json`**: one visual: its type, position, the fields it queries and its formatting. A `mobile.json` beside it holds the visual's phone layout.
- **`bookmarks/`**: one file per bookmark, plus `bookmarks.json` for their order and groups.

Page, visual and bookmark folders are named with 20-character IDs by default. To find one, turn on *Copy object names when right clicking on report objects* in Desktop (Options and settings › Report settings), right-click a visual, copy its name and search for it. You can rename the folders to something readable (letters, digits, `_` and `-` only), but restart Desktop afterwards and expect anything that pointed at the old name to break. Get the characters wrong and Desktop doesn't complain: it ignores the folder as one of your private files, and the page or visual simply disappears.

## Five rules for working with AI on a PBIP

**1. Point the agent at the right layer.** Model changes go in `SemanticModel/definition/`. Report changes go in `Report/definition/pages/`. Themes go in `StaticResources/RegisteredResources/`. Name the folder in your prompt, not just "the project".

**2. Keep the data out of the conversation.** `cache.abf` is your model *with its data*: in one of my sample projects it was 49 MB. Never let an agent read it, upload it or commit it. The less obvious one: **report files can hold data values too.** A visual filtered to `Company = 'Contoso'` saves `'Contoso'` in its `visual.json`, and slicer selections and bookmarks do the same. Check what's in there before you hand a project to a tool or push it somewhere public.

**3. Save, edit, apply, in that order.** Save in Desktop before the agent touches the files: Desktop doesn't write its latest changes to disk until you do. Since the August 2026 release, Desktop can notice files changing underneath it and offer **Apply external changes**. It's a preview feature, so turn on *Detect and reload external PBIP changes* (Options › Preview features) and restart. Accepting reloads the model or report and discards anything you hadn't saved. Cancelling leaves the agent's edits on disk but unapplied, and your next save in Desktop writes over them. An agent can also trigger the reload itself through the Power BI Desktop Bridge, which is in preview too. Without either, close the project while the agent works and reopen it afterwards.

One trap: if `.pbi/unappliedChanges.json` exists, apply those pending changes before anyone edits Power Query outside Desktop. Otherwise Desktop discards the outside edits, the agent's included.

**4. Hands off the four unsupported files.** `diagramLayout.json`, `semanticModelDiagramLayout.json`, `mobileState.json` and a root-level `report.json` aren't documented for outside editing. An agent that "tidies" them can stop the project from opening.

**5. Review the diff, not the summary.** The whole point of PBIP is that every change is a readable line in a file, so read it. A new measure is a few lines in one table file. A "formatting tweak" that touches forty `visual.json` files deserves a closer look. Automated checks help too: Microsoft's Azure DevOps build-pipeline guide runs Tabular Editor's Best Practice Analyzer on models and PBI Inspector on reports for every pull request. Both are community tools Microsoft doesn't support, but they make a good safety net for agent changes.

## Small things that bite

- **Schemas catch mistakes.** Every PBIR and project JSON file starts with a `$schema` link. VS Code validates against it, and an agent can too. A file that breaks its schema stops Desktop loading the report, and the error names the file to fix.
- **Encoding and line endings.** Save edited files as UTF-8 *without* a byte-order mark. Desktop writes Windows (CRLF) line endings; set Git's `autocrlf` so diffs don't light up on every line.
- **Path length.** Windows limits paths to 260 characters by default, and PBIP nests deeply. Keep projects near the root of a drive: `C:\pbi\Sales`, not five folders down.
- **OneDrive and SharePoint.** Desktop can't save a PBIP straight to them, and a synced folder can make saves fail. Use a local folder and Git.
- **Publishing.** Fabric Git integration and the Fabric APIs deploy definitions only. Desktop's Publish button builds a temporary `.pbix` and *includes the cached data*.
- **Sensitivity labels.** Power BI projects don't support them. If a model carries a label, check with whoever owns that policy before saving it as a folder of plain text.
- **Copilot settings belong to the model.** AI instructions, the AI data schema and verified answers are part of the semantic model, not the report. After changing them, look at which files changed before you commit.

## The short version

| Hand it to an agent | Edit with care | Hands off | Never commit |
|---|---|---|---|
| `definition/` in both folders, themes in `RegisteredResources/`, DAX query and TMDL script tabs | `definition.pbism`, `definition.pbir` (Desktop closed), `editorSettings.json`, `unappliedChanges.json`, `reportExtensions.json` | `diagramLayout.json`, `semanticModelDiagramLayout.json`, `mobileState.json`, root `report.json`, `.platform` | `cache.abf`, `localSettings.json` |

Knowing the folder is what lets you move fast without breaking things. The agent writes the change; you know where it should land, and what it must never touch.
