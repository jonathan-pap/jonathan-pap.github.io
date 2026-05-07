# Secret Hitler online, with bots to fill the seats

A small departure from the usual data work on this site. Same broad theme — *what's the smallest amount of code that does the job?* — but applied to a board game.

[Secret Hitler](https://www.secrethitler.com/) is a social-deduction game for 5–10 players. You're either a Liberal trying to keep the government honest, a Fascist trying to take it over, or — exactly one player — Hitler, working with the Fascists but with a special win condition. There are roles, hidden hands, votes, executive powers, and a lot of *"why did you nominate them?"*.

The friction is gathering five friends at the same time. So I wrote a browser version that runs over WebSockets, with optional bots to fill the empty seats.

## What it does

[secret-hitler-tt29.onrender.com](https://secret-hitler-tt29.onrender.com/) — open the link, click *Create Game*, share the four-letter room code. Players join from any device, see only their own role and hand, and play through the same rule-set as the physical game: investigate, peek, special election, execution, veto, term limits, the chaos policy. Everything in the rulebook.

When you don't have enough humans, the host can click *Add AI Player* in the lobby and the game seats a bot. They take votes, draw and discard policy cards, accept and refuse executive powers, and play their assigned role to the end of the game.

## What kind of "AI" is in the bots

It's worth being honest about this part because there's a way to oversell it that I want to avoid.

The bots are **heuristic, not LLM-driven**. No model is being prompted. No language is being generated. Each bot is a small bundle of role-aware decision functions that look at the public game state, look at their own hidden hand, and return an action.

A few examples of what that looks like in `bots.js`:

- A **Liberal bot** votes randomly in the early rounds and turns more conservative as fascist policies pile up. As President, it discards Fascist policies 65–90% of the time. As Chancellor, it enacts the Liberal one if it has it.
- A **Fascist bot** uses a `teammates()` helper to identify allies based on game state, supports them in nominations 70% of the time, and uses the Investigate power to target uninvestigated players (*looks productive, reveals nothing*).
- A **Hitler bot** plays Liberal policies ~30% of the time when fewer than three Fascist policies have passed, to keep up appearances. Once three pass and election-by-Hitler becomes a win condition, it changes mode.

The whole `bots.js` is something like 300 lines of conditional logic. Probability-weighted, role-aware, plays a believable game.

## Why heuristic was the right call

Two reasons.

**The game is small enough that heuristics are sufficient.** Secret Hitler has a constrained action space — vote yes/no, pick one of three policies to discard, pick one of three policies to enact, pick a target for an executive power. The hidden information is meaningful but bounded. You don't need a model to play passably; you need the right *if/then* skeleton with sensible probability weights.

**The reason to add bots is to fill seats, not to be challenging.** The "fun" of Secret Hitler is the conversation between the human players. The bot's job is to be a competent body in a chair, not to outwit anyone. A perfectly-strategic bot would actually be worse — it would make the round-to-round play less surprising, not more.

If I were writing a Secret Hitler engine to *play* the game well — say, for self-play research — I'd reach for an LLM or a model trained on game logs. For *fill these seats so the four humans we have can play*, this is the right amount of cleverness.

## What's actually interesting in the build

Two parts are worth mentioning.

**The architecture is the simplest one that works.** Single Node process, single dependency (`ws`). Game state in memory plus a debounced JSON snapshot to disk so a redeploy or free-tier sleep doesn't lose your room. Client receives state from the server, never computes it. Each player gets a *filtered view* of the same canonical state — your role plus the public game plus your private hand when you're active.

**The client has no build step.** Vanilla HTML, CSS, JavaScript. Inline SVG icons, CSS-only tooltips, art-deco styling that mirrors the physical game's visual language. You could open `public/client.js` in any text editor and edit it. There is no `dist/`, no transpiler, no bundler. The code that runs in your browser is the code in the repo.

This is on purpose. The whole project lives at maybe 1,500 lines including the bots. A build step would have doubled the moving parts to support exactly zero new functionality.

## Where Claude fit in

I'll mention it because the site's been talking about [Claude Design](./post.html?slug=power-bi-claude-design-skills) for analytics work, and the same approach applies here in a much smaller way: *Claude wrote a lot of the boring scaffolding while I made the design decisions.*

WebSocket message handling, role-distribution math for the 5–10 player counts, art-deco CSS, mobile breakpoints, the timeline modal — all sketched faster than I'd have done by hand. The interesting parts — the bot heuristics, the rule-set fidelity, what the game actually feels like — were mine to nail down.

That's roughly the right division of labor: *AI does the typing, human owns the design*.

## Where to play / fork

- **Live**: [secret-hitler-tt29.onrender.com](https://secret-hitler-tt29.onrender.com/)
- **Source**: [github.com/jonathan-pap/secret-hitler](https://github.com/jonathan-pap/secret-hitler)
- **Self-host**: included `render.yaml` makes it a one-click Render deployment. Works equally well on Railway, Fly.io, or anything that runs Node and respects `process.env.PORT`.

If you find a rule edge case I got wrong, or the bots do something dumb that's *not* the right kind of dumb, open an issue. Five-player rounds especially welcome bug reports — that's where role distribution and Hitler's knowledge of the Fascists gets fiddly.
