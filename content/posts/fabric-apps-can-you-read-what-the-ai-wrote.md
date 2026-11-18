# Fabric apps: do you know what the AI is writing?

Microsoft announced Fabric apps as generally available at Ignite this week. You describe an app, a coding agent builds it, and it runs on Fabric next to your data.

That's a big step for BI developers, and it comes with a question. Most of us read DAX and model tables for a living. A Fabric app is a TypeScript project. If we can't read what the agent wrote, "review the code" quietly turns into "generate again until it works".

So this post documents the folder: what's in it, which files you edit, and what each command really does. It describes a new project on Rayfin 2.0, the version I installed in November 2026.

## What a Fabric app is

A new item type in a Fabric workspace, called **App**. It's built with **Rayfin**, Microsoft's TypeScript toolkit and command-line tool. You get a backend (sign-in, hosting, and a database if you want one) and a web frontend.

With data and hosting switched on, the workspace shows one App item with three parts under it: a SQL database, Authentication, and Static Content, which is the web pages. The database is read-only in the portal, and its schema should only ever change in code: a change made by hand, from another tool, can be overwritten or can break the next deployment. The folder on your PC is the source of truth, the same idea as a Power BI project.

## The folder

This is a brand-new project on Rayfin 2.0, the default template, before anyone has added a feature. The note on the right says what each part is for and who owns it. I've left out the licence, code-of-conduct and security files, the small config files inside each package, and some starter, style and test files.

```text
my-app/
│
├── package.json            you edit    the commands, and the workspace
├── package-lock.json       generated   exact versions installed, commit it
├── tsconfig.json           template    TypeScript settings
├── tsconfig.base.json      template    shared TypeScript settings
├── rayfin-template.yml     template    which template this project came from
├── README.md               template    how to run and extend the project
├── AGENTS.md               template,   rules for coding agents
│                           then yours
├── .mcp.json               CLI         lets an agent look up the Rayfin docs
├── .gitignore              template    what stays out of Git
│
├── rayfin/                 THE BACKEND SETTINGS
│   ├── rayfin.yml          you edit    which services run, and where
│   ├── tsconfig.json       template    leave it
│   ├── .lockfile.json      CLI         tracks the agent files, commit it
│   ├── .project.json       CLI         anonymous telemetry marker
│   └── .gitignore          template
│
├── packages/
│   │
│   ├── frontend/           THE WEB APP: what users see
│   │   ├── package.json                 the app's own packages
│   │   ├── index.html                   the page that loads the app
│   │   ├── public/                      static files, such as the icon
│   │   ├── src/
│   │   │   ├── main.tsx                 starts the app
│   │   │   ├── Root.tsx                 sign-in, theme, error handling
│   │   │   ├── App.tsx                  the app itself: start reading here
│   │   │   ├── Welcome.tsx              the starter page
│   │   │   ├── components/              page parts (the sign-in gate)
│   │   │   ├── hooks/                   sign-in and theme state
│   │   │   ├── lib/rayfin-client.ts     THE CONNECTION to the backend
│   │   │   ├── services/                the sign-in service
│   │   │   └── test/                    test setup
│   │   ├── vite.config.ts               how the web app is built
│   │   ├── vitest.config.ts             how tests run
│   │   ├── eslint.config.js             code style rules
│   │   └── components.json              UI component library settings
│   │
│   ├── data/               THE TABLES (empty at the start)
│   │   └── src/index.ts                 the list of tables that exist
│   │
│   └── shared/             THE CONTRACT between the two
│       └── src/index.ts                 the type of every table
│
├── scripts/                template    adds features (packs), template tests
│
└── .agents/skills/         template    24 instruction sets for coding agents
                            + CLI       (6 kept up to date by the CLI)
```

Most of that you never open. What you review sits in five places: `rayfin/rayfin.yml`, `packages/data/src/`, `packages/shared/src/index.ts`, `packages/frontend/src/lib/rayfin-client.ts` and the files that call it, and the `package.json` files.

### What appears when you add a feature

The template starts small on purpose. The data service is off and there are no tables; the template's own comment says a dashboard over a semantic model "stores nothing". You add a feature with one command, `npm run pack:add -- <pack>`, and it writes new files into the project:

| Pack | Switches on in `rayfin.yml` | What it adds |
|---|---|---|
| `data-modeling` | data | a starter table `packages/data/src/Item.ts`; replaces both `index.ts` files if they're untouched |
| `connectors` | none | `lib/connectors.ts`; replaces `lib/rayfin-client.ts` if it's untouched |
| `analytics` | connectors | a hook to query a semantic model, `hooks/use-semantic-model-query.ts` (apply `connectors` first) |
| `functions` | functions | a new package, `packages/functions/`, with your server-side code in `src/function_app.ts`; replaces `lib/rayfin-client.ts` if untouched |
| `storage` | data and storage | a new package, `packages/storage/`, with its folders declared in `packages/storage/rayfin/storage/`; replaces `lib/rayfin-client.ts` if untouched |
| `visuals` | none | the chart libraries, a data helper in `lib/`, and a check script |

Read "if untouched" carefully. A pack doesn't overwrite a file you, or an agent, have edited (unless you run it with `--force-seeds`). It keeps your version and prints a short notice: "Kept your customized file(s) — merge the pack's version in by hand". The rest of the pack still applies. So you can end up with a feature switched on in `rayfin.yml` and a connection file that doesn't know about it, and that notice is easy to miss.

Connecting to a specific semantic model is a separate command, `rayfin connector add`. It adds a `connectors:` block to `rayfin.yml`, creates `rayfin/connectors/<name>/schema.ts`, a typed description of the connection, and rewrites `lib/connectors.ts` unless you've edited it. It prints the install command it needs but doesn't run it.

### What appears when you run it

These are created by the tools, and none belong in Git:

```text
rayfin/.env                    the active environment: addresses and keys
rayfin/.deployments.json       every place this app has been deployed
rayfin/.temp/                  generated backend files
packages/frontend/.env.local   the same values, in the form the web app reads
packages/*/dist/               built output
node_modules/                  installed packages
```

The template's `.gitignore` already lists all of them, and also `rayfin/.env.secrets`, a file you write yourself if you upload secrets in bulk. Check that it still does after an agent has been at it.

### Some projects look different

Some templates and older apps are "flat": pages in `src/`, tables in `rayfin/data/`, one file `rayfin/data/schema.ts` instead of the two `index.ts` files. Both layouts are valid. Microsoft's advice is the right one: open `rayfin/rayfin.yml` and read the `path` of each service to see which folders your project actually builds.

## File 1: the config, `rayfin/rayfin.yml`

Short, and readable without knowing TypeScript. Trimmed from the default:

```yaml
services:
  auth:
    enabled: true
    fabric:
      enabled: true          # sign in with your work account
    password:
      enabled: false         # email + password: local development only
  data:
    enabled: false           # no database until you ask for one
    path: packages/data
  staticHosting:
    enabled: true
    path: packages/frontend
    assetAccess: protected   # pages are served only after sign-in
```

This is where you see what the app can do at all. If `data`, `storage` or `functions` is enabled and you didn't ask for it, ask why.

## File 2: a table

A table is a class, and each line with an `@` describes a column or a rule. In the style of Microsoft's examples:

```ts
@entity()
@role('authenticated', ['create', 'read', 'update', 'delete'], {
  policy: (claims, item) => claims.sub.eq(item.userId),
})
export class Note {
  @uuid() id!: string;
  @text({ max: 200 }) title!: string;
  @text({ optional: true, max: 2000 }) body?: string;
  @boolean() isPinned!: boolean;
  @one(() => Notebook, { optional: true }) notebook?: Notebook;
  @date() createdAt!: Date;
  @text({ max: 100 }) userId!: string;
}
```

Read it like a model:

- **The lines above the class are the security.** Here: a signed-in user can create, read, update and delete, but only rows where `userId` is their own. That is row-level security, written on the table. The app has to fill in `userId` itself.
- **`@one(() => Notebook, ...)`** is a many-to-one relationship to another table. `Notebook` is a table of its own, and has to be imported and registered too.
- **`@text({ max: 200 })`** is text with a length. **`optional: true`** makes a column nullable.

The things that go wrong here without an error:

- **Leave the permission lines off, and nobody agrees on what happens.** The agent rules that ship with the tool say a missing one "silently grants full CRUD to any signed-in user". The template's own starter table says a table with no access control "is refused at validation time". Microsoft's permissions page says neither. In the 2.0 code that writes the permission settings, a table without them falls back to full access for any signed-in user, and nothing in the installed tools refuses it. Don't leave it to find out: every table gets its permission lines.
- **A decimal is `DECIMAL(18,2)` unless you say otherwise.** SQL Server stores a share of 0.536 as 0.54. Set precision and scale together.
- **Text without a `max`** becomes unlimited text. Microsoft's troubleshooting page says the deployment then succeeds while the data API can return a server error.
- **A `?` on its own does not make a column nullable.** Only `optional: true` does.

A new table is registered in two places: the list in `packages/data` and the type in `packages/shared`. Miss the second and, in the words of the template's own instructions, the table is "reachable at runtime and invisible to the compiler".

## File 3: where the data is read

A read looks like this:

```ts
const notes = await client.data.Note
  .select(['id', 'title'])
  .where({ isPinned: { eq: true } })
  .orderBy({ createdAt: 'desc' })
  .execute();
```

Close enough to a query that you can follow it. Three things to check:

- **`execute()` returns one page, 100 rows by default.** A total added up in the browser over that result is a total of the first 100. Nothing tells you the rest is missing.
- **Totals belong on the server.** There are `aggregate()` and `groupBy()` for that, and no simple `count()`.
- **You get the columns you ask for.** The shortcut `findById()` returns only the id. To get the rest, select the fields and filter on the id.

## File 4: the commands, `package.json`

This is the one to read first:

| Command | What it runs | Touches the Fabric tenant? |
|---|---|---|
| `npm run dev` | `rayfin dev` | **Yes**, by default. See below. |
| `npm run dev:frontend` | the local web server only | Creates nothing, but the page talks to your Fabric backend if there is one |
| `npm run rayfin:up` | `rayfin up` | **Yes.** Full deployment. |
| `npm run build`, `typecheck`, `test` | compile and check | No |
| `npm run pack:add -- <pack>` | adds a feature to the project | No, but it rewrites project files |

"dev" sounds harmless. The command-line documentation says `rayfin dev` uses the Fabric backend by default and creates one if it's missing; only the frontend (and Functions, if you added them) runs on your PC. The template's README describes the same command as starting "local services". Check what "dev" means in your version before an agent runs it for you.

Three more things worth knowing:

- **Name the workspace when you deploy.** Microsoft Learn says `rayfin up` without one defaults to "My workspace". The 2.0 deployment guide says a first deploy asks you to pick a new or existing workspace, and creates a new one when it runs unattended. The two don't agree, so don't rely on either.
- **`rayfin up --dry-run`** checks your inputs and shows which workspace it would deploy to, without changing anything. It doesn't build or apply anything, and a clean dry run is no promise the deployment will work.
- **`--force`** allows changes that destroy data: dropping a table or a column, changing a type. Without it the tool refuses.

## Reading from a semantic model

Once deployed, an app can query a semantic model through a connector. The frontend sends DAX:

```ts
await client.connectors.salesModel.executeQuery({
  query: 'EVALUATE TOPN(10, Sales)',
});
```

The DAX is a string in the code, and it's the part a BI developer is best placed to review. From Microsoft's documentation:

- **A semantic model query runs as the person using the app.** They need Read and Build permission on the model.
- **There is no default row limit.** Set one. `TOPN`, as in the example, is right when you want a ranked top ten. As a safety cap, the connector's docs prefer its own limit, `resultSetRowCountLimit`, and warn that `TOPN` "returns a complete-looking partial answer". The template's own DAX instructions add that the cap "silently truncates", so treat a result with exactly that many rows as incomplete.
- **SQL connectors are different.** By default they run as the app's owner, so a user can see data they have no access to at the source, unless the app's own rules restrict it.
- **A semantic model query doesn't run under `rayfin dev`.** You can test the DAX with `rayfin connector invoke`, then deploy.

There's no write path into the model: the semantic model connector only runs DAX queries. Writes go into the app's own tables or files, or into a warehouse or SQL database through a connector.

## What the agent has been told

A new project ships with 24 instruction sets for coding agents, plus an `AGENTS.md`. Some of the rules are good ones:

> "Every entity must carry an explicit permission decorator."
>
> "`--force` permits destructive changes (drop table, drop column, alter type) — never use without review."

But they don't all fit the project they ship in. The main Rayfin instruction set, the one the command-line tool keeps up to date, says tables live in `rayfin/data/`. In this template they don't: they're in `packages/data/`, as the template's own `AGENTS.md` says.

They also pull in different directions on deploying:

- `AGENTS.md` says: "Never publish automatically or add `--force` on the user's behalf."
- The Rayfin instruction set says that when you ask to deploy, the agent should "execute the full workflow — do not present steps as instructions for the user to run manually."

My reading: both can be followed, as long as you only ask to deploy when you mean it. `AGENTS.md` also asks the agent to preview the deployment and wait until you've confirmed the target workspace.

And Microsoft's own guidance says it plainly:

> "Templates, prompts, and skills aren't security boundaries or proof of compliance."

The instructions help. They don't check anything, and they can be out of date on the day you get them.

## Local and deployed are not the same

From the documentation:

- **Email and password sign-in is for local development only**, and this template switches it off. Deployed, sign-in is your work account.
- **File storage has no local version.** It runs on Fabric even during development.
- **By default, every member of the workspace can open and use the app.**
- **Deploying again is not a restore.** Rolling the code back does not roll the data back.

## So: do you know what it's writing?

You don't need to become a web developer. Before an app ships, you should be able to answer five questions and point at the file that answers each:

1. **Where does the data come from?** The DAX queries and the code that reads data.
2. **Where do writes go?** The table files. Know what one row means.
3. **What type and precision is each column?** The table files again.
4. **Who may read, change and delete each table?** The lines above each class.
5. **What does each command do?** `package.json`.

If the answer to any of them is "the agent handled that", it isn't an answer yet.

The AI makes the edit. You still own it.

Have you opened the folder of a Fabric app yet? What did you find that you didn't expect?

*Sources: a new project created with Rayfin 2.0 and the documentation and agent instructions that ship inside it, and Microsoft Learn's Fabric apps pages ([overview](https://learn.microsoft.com/fabric/apps/overview), [project structure](https://learn.microsoft.com/fabric/apps/project-structure), [data models](https://learn.microsoft.com/fabric/apps/data-models), [permissions](https://learn.microsoft.com/fabric/apps/data-permissions), [connectors](https://learn.microsoft.com/fabric/apps/connectors), [command reference](https://learn.microsoft.com/fabric/apps/cli-reference), [deploy](https://learn.microsoft.com/fabric/apps/deploy-app), [troubleshooting](https://learn.microsoft.com/fabric/apps/troubleshooting), [AI agent development](https://learn.microsoft.com/fabric/apps/ai-agent-development-for-apps)), read in November 2026. The `TOPN` warning is from the semantic model connector's own documentation. General availability is from the Ignite 2026 Book of News; the same day, Learn's "what's new" page still listed the Rayfin backend as preview. Check the current pages before relying on a detail.*
