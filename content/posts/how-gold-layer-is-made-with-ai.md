# How Gold Layer is made: one AI in charge, a free one on my PC

Almost everything on Gold Layer is made with AI: the articles, the shorts, the anime scenes, the Fabric app playground. People sometimes picture that as one chatbot doing it all. It isn't. It's a small team of models, each with its own job, and a few checks between them and anything you read.

This Lab entry is how that team is set up, and what went wrong while setting it up.

![One AI in charge, a free one on my PC: who does what, and the checks before anything goes out](./assets/img/posts/how-gold-layer-is-made-with-ai/ai-setup-flow.png)

## Who does what

| Model | Runs | Its job here |
|---|---|---|
| **Claude Opus 5.5** | Anthropic, through Claude Code | In charge: plans, writes, builds, and fact-checks everything before it goes out |
| **Claude Sonnet 5.5** | Anthropic | Options to choose from (captions, hooks), mechanical renames |
| **Claude Haiku 5.5** | Anthropic | Cheap reading: long logs and build output, keeping the task board up to date |
| **Claude Fable 5.2** | Anthropic | Rarely: large one-off builds where its extra depth is worth the price |
| **Qwen3, 14B and 8B** | My PC, in LM Studio | Free: summaries, proofreading, first-pass quotes from Microsoft Learn, options |
| **ACE-Step** | My PC | Free: the music for the videos |

And me: ideas, choices, and an explicit OK before anything is posted or pushed.

## Why not one model for everything

Price is part of it. At Anthropic's list prices, Haiku costs $0.10 per million input tokens and Opus $4, forty times more. Reading a 2,000-line render log doesn't need the model that writes the articles.

But the bigger reason is attention. When the lead model reads every log and every web page itself, its working memory fills with noise. Handing the long reading to a helper and getting back a short answer keeps the lead model on the actual work.

The rule we settled on: a cheaper model may *read* and *draft*, but anything that goes out (a fact, a number, a line of code) is checked by the lead.

## The free one on my PC

Qwen3 runs in LM Studio on a mid-range gaming PC (a 12 GB graphics card and 16 GB of memory). It costs nothing per use, which makes it ideal for jobs that are big but simple. A small script gives it a few commands:

- **summarize** a long file in chunks, then merge the notes
- **ask** a question about a few files
- **web**: read a public page and answer with exact quotes
- **proof**: list typos and missing words, never rewrite
- **variants**: draft openings, captions or closing questions to choose from

There are two sizes. In a proofreading test on a real draft post with six typos in it, the 14B model found five in about a minute; the 8B found three in 18 seconds. So the 8B drafts options, where speed matters and a miss costs nothing, and the 14B proofreads.

## It talks back

The local model isn't only something Claude calls. It works the other way too:

- **An inbox.** In LM Studio's chat I can say "send this to Claude: …". LM Studio asks me to approve the call, Qwen saves the request as a note, and the next Claude session sees it and asks me which ones to do. Nothing runs on its own.
- **Read-only access to the workspace.** Qwen can look up which folder holds what, search files and read them. It can't change anything.
- **Skill cards.** Short notes it reads before drafting: our house style, the posting rules, and wording we've already fact-checked (for example, CALCULATE *overwrites* a filter on the same column; KEEPFILTERS *intersects*). It copies checked wording instead of guessing.

## The research pipeline

This is where the free model earns its place. For the Fabric app cost research:

1. **Claude picks the pages**, using a Microsoft Learn search.
2. **Qwen reads each page** and pulls out the facts, with exact quotes.
3. **A script checks every quote word for word** against the live page.
4. **Claude writes** from the quotes that passed, and prices come straight from Microsoft's price list, never from a model.

On the Power BI MCP servers, 78 of Qwen's 80 quotes matched word for word, and the other two were only lightly reworded, with the facts right. Seven pages took about nine minutes and no paid tokens.

## What went wrong

- **It made answers up.** When a page didn't cover the question, Qwen didn't say so. On a connectors page none of its four "quotes" existed. On the trial page it wrote that the Fabric trial lasts "6 than days". It's 60. The word-for-word check caught all of it, which is why that check is now mandatory.
- **Its drafts looked finished.** I let it draft two articles from notes that were already checked. The quotes were right (21 of 22). But 7 of 22 severity ratings were wrong, and Microsoft's "be careful" became "no ambiguity". Nothing looked broken. So Qwen now does quotes and outlines, never whole articles.
- **It said it had sent a note it never sent.** The first time I tried the inbox, the connection was switched off in that chat, so Qwen had no way to send anything. It answered "Sent to Claude", with a title, anyway. Nothing arrived. With the connection on, it worked first time, and now its instructions say it may only report what a tool actually answered. To check the inbox, I look in the folder, not at what Qwen says.
- **It locked the PC.** Running the 14B model with a large context next to a video render used up the memory and froze everything. The script now loads the model lean, and refuses to run, or waits, while a render is going.
- **It kept dropping my chat model.** Each job unloaded the model when it finished, including the one I'd picked in LM Studio's chat. Now jobs share whatever model is already loaded, and only unload one they loaded themselves.

## What it taught us about AI

A small local model is a good reader and a risky author. It's fast and free at pulling quotes from a page, and it fails in the most dangerous way when the answer isn't there: confidently. Its finished-looking drafts were wrong in quiet places, the same kind of mistake I'd look for in an AI-written DAX query.

None of that makes it less useful. It means every model gets the job it's good at, and a check sits between it and anything that goes out. The check matters more than the model.

How do you split work between AI models, or do you keep everything in one?
