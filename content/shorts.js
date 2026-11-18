// Script copy of shorts.json, for pages opened straight from disk.
window.GOLD_LAYER_SHORTS = {
  "_comment": "Gold Layer Shorts. One entry per clip; files live in assets/shorts/<file>.mp4 and assets/shorts/posters/<file>.jpg. \"post\" names the slug of the article behind a short, if there is one: the short then appears inside that article. \"summary\" is the text version of the clip. \"youtube\" is the YouTube id; from \"youtubeFrom\" on, the short plays on YouTube (click-to-load) instead of our MP4.",
  "shorts": [
    {
      "id": "visual-rule-colour-only",
      "file": "visual-rule-colour-only",
      "title": "Power BI: don't rely on colour alone",
      "topic": "Power BI",
      "duration": 37,
      "summary": "Two lines told apart only by colour. In a simulated colour-blind view they look the same. The fix: markers, a dashed line and direct labels, in blue and gold. Microsoft Learn: \"Avoid using color... as the only way of conveying information. Instead, use markers to convey different series.\" Same rule whether a person or an AI agent built the report.",
      "youtube": "LH06kNmuLHY"
    },
    {
      "id": "visual-rule-zero-axis",
      "file": "visual-rule-zero-axis",
      "title": "Power BI: be careful with axes not at zero",
      "topic": "Power BI",
      "duration": 34,
      "summary": "On-time delivery, 97.0% vs 98.5%, on an axis that starts at 96%: it looks like a huge jump. From zero, the same data shows a 1.5 point gap. Microsoft Learn: \"Be careful when you use charts that distort reality, such as 3-D charts and charts that don't start at zero.\" Same rule whether a person or an AI agent built the report.",
      "youtube": "_0UOpzeXoYE"
    },
    {
      "id": "visual-rule-numerals",
      "file": "visual-rule-numerals",
      "title": "Power BI: show 3.4M, not 3,400,000",
      "topic": "Power BI",
      "duration": 31,
      "summary": "A report with every number in full (3,412,876). Cards on Display units Auto with one decimal read 3.4M and 48.2K; data labels on Millions with one decimal read 1.3M. Microsoft Learn: \"Don't exceed three or four numerals when displaying numbers... use 3.4 million instead of 3,400,000.\" Same rule whether a person or an AI agent built the report.",
      "youtube": "usVt9EkoyZQ"
    },
    {
      "id": "anime-teachers",
      "file": "anime-teachers",
      "title": "14 tests, 2 days: what broke making an AI anime teacher",
      "topic": "Lab",
      "duration": 50,
      "post": "anime-characters-for-our-videos",
      "summary": "We tried giving our videos anime characters, starting with a teacher for a quiz short. The AI wrote every line of motion code. Each mistake next to its fix: a hologram that just stood there, stand-in school uniforms, the same wave every line, bikes that weren't bikes. And one thing that's still broken: the hair goes through the arm. Narrated by an AI voice.",
      "youtube": "xdhMjFtxpwY"
    },
    {
      "id": "report-folder",
      "file": "report-folder",
      "title": "Every visual is its own file: the report folder",
      "topic": "Power BI",
      "duration": 50,
      "post": "pbip-folder-structure",
      "summary": "Save a Power BI report as a project (PBIP) and the report becomes a folder of JSON files in PBIR: one folder per page, one per visual, a file per bookmark, and your themes in StaticResources. Watch out: filter values like 'Contoso' can land in visual.json.",
      "youtube": "SAzyPnTr9qM"
    },
    {
      "id": "model-folder",
      "file": "model-folder",
      "title": "One table, one file: the semantic model folder",
      "topic": "Power BI",
      "duration": 50,
      "post": "pbip-folder-structure",
      "summary": "Save a Power BI report as a project (PBIP) and the semantic model becomes a folder of text files in TMDL: one file per table, plus relationships, expressions, roles and the settings. Two files never go in Git: .pbi/localSettings.json (just you) and .pbi/cache.abf (your data).",
      "youtube": "OORGHwoscv4"
    },
    {
      "id": "pareto-city",
      "file": "pareto-city",
      "title": "Pareto chart in Power BI in 4 steps",
      "topic": "Power BI",
      "duration": 31,
      "post": "pareto-in-power-bi-dax-vs-visual-calculations",
      "summary": "Sort the bars biggest first, add the cumulative %, draw the 80% cutoff and read the vital few. On Contoso sample data, 4 of 8 product categories make 83% of revenue. In Power BI the cumulative % is one visual calculation: RUNNINGSUM ( [Percent of grand total], ORDERBY ( [Revenue], DESC ) ).",
      "youtube": "Lf9yYJ2yCX8"
    },
    {
      "id": "agent-safe-files",
      "file": "agent-safe-files",
      "title": "Which PBIP files can your AI agent touch?",
      "topic": "Power BI",
      "duration": 36,
      "post": "pbip-folder-structure",
      "summary": "Hand an AI agent the definition/ folders: PBIR for the report, TMDL for the model. Keep it away from .pbi/cache.abf (your data) and .pbi/localSettings.json (just you), and leave mobileState.json and diagramLayout.json alone: no edits outside Desktop. Validate PBIR against its schemas; filter values can still sit in the report files.",
      "youtube": "aihd1GCSbzE"
    },
    {
      "id": "data-in-report-files",
      "file": "data-in-report-files",
      "title": "The data hiding in your report files",
      "topic": "Power BI",
      "duration": 33,
      "post": "pbip-explained",
      "summary": "A .pbix carries your imported data inside it. Save as PBIP and the definition becomes plain text, but the data sits in .pbi/cache.abf. Keep it out of Git with .gitignore, and check visual.json: filter values can still land there.",
      "youtube": "Et9_XYKqhjU"
    }
  ]
};
