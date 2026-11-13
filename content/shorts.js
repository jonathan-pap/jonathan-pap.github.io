// Script copy of shorts.json, for pages opened straight from disk.
window.GOLD_LAYER_SHORTS = {
  "_comment": "Gold Layer Shorts. One entry per clip; files live in assets/shorts/<file>.mp4 and assets/shorts/posters/<file>.jpg. \"post\" names the slug of the article behind a short, if there is one: the short then appears inside that article. \"summary\" is the text version of the clip. \"youtube\" is the YouTube id; from \"youtubeFrom\" on, the short plays on YouTube (click-to-load) instead of our MP4.",
  "shorts": [
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
