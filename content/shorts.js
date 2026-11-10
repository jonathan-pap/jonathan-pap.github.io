// Script copy of shorts.json, for pages opened straight from disk.
window.GOLD_LAYER_SHORTS = {
  "_comment": "Gold Layer Shorts. One entry per clip; files live in assets/shorts/<file>.mp4 and assets/shorts/posters/<file>.jpg. \"post\" names the slug of the article behind a short, if there is one: the short then appears inside that article. \"summary\" is the text version of the clip. \"youtube\" is the YouTube id; from \"youtubeFrom\" on, the short plays on YouTube (click-to-load) instead of our MP4.",
  "shorts": [
    {
      "id": "data-in-report-files",
      "file": "data-in-report-files",
      "title": "The data hiding in your report files",
      "topic": "PBIP",
      "duration": 33,
      "post": "pbip-explained",
      "summary": "A .pbix carries your imported data inside it. Save as PBIP and the definition becomes plain text, but the data sits in .pbi/cache.abf. Keep it out of Git with .gitignore, and check visual.json: filter values can still land there.",
      "youtube": "Et9_XYKqhjU",
      "youtubeFrom": "2026-11-12T00:00:00Z"
    }
  ]
};
