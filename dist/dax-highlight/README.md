# dax-highlight

A tiny, dependency-free syntax highlighter for **DAX** (Power BI / Analysis Services).
One `.js` file (~8 KB minified), one `.css` file, no build step, no framework, no runtime.

## Files in this folder

| File | Purpose |
|---|---|
| `dax-highlight.js` | The highlighter. UMD: works as `<script>`, ESM, or CommonJS. |
| `dax-highlight.css` | Theme (dark by default). All colors are CSS custom properties, so you can retheme without editing the file. |
| `example.html` | Standalone demo — open in a browser. |

## Quick start — any site

```html
<link rel="stylesheet" href="./dax-highlight.css" />
<script src="./dax-highlight.js"></script>

<pre><code class="language-dax">
Total Sales :=
VAR _rows = COUNTROWS( 'Sales' )
RETURN IF ( _rows = 0, BLANK(), SUMX( 'Sales', 'Sales'[Quantity] * 'Sales'[Unit Price] ) )
</code></pre>

<script>
  DaxHighlight.highlightAll();
</script>
```

That's it. Every `<pre><code class="language-dax">` (or `lang-dax`) in the page gets colorized.

## Usage with Markdown

Works out of the box with the standard markdown pipeline — just use a `dax` fence:

~~~markdown
```dax
CALCULATE( [Total Sales], ALL( 'Date' ) )
```
~~~

Then run `DaxHighlight.highlightAll()` after the Markdown parser has produced the DOM.

### With `marked`

```js
import { marked } from "marked";
import { highlightAll } from "./dax-highlight.js";

document.getElementById("post").innerHTML = marked.parse(md);
highlightAll();
```

### With `markdown-it`

```js
import MarkdownIt from "markdown-it";
import { highlightAll } from "./dax-highlight.js";

const md = new MarkdownIt();
document.getElementById("post").innerHTML = md.render(source);
highlightAll();
```

### With `showdown`

```js
const conv = new showdown.Converter();
document.getElementById("post").innerHTML = conv.makeHtml(source);
DaxHighlight.highlightAll();
```

## API

```js
// Highlight every matching block in the document (or a scoped root)
DaxHighlight.highlightAll();
DaxHighlight.highlightAll(document.getElementById("article"));
DaxHighlight.highlightAll(document, "pre code.language-dax");

// Highlight one element in-place (idempotent — safe to call twice)
DaxHighlight.highlightElement(document.querySelector("pre code"));

// Get highlighted HTML from a raw DAX string
const html = DaxHighlight.highlightDax(`SUM( 'Sales'[Amount] )`);

// Extend the vocabulary
DaxHighlight.addFunctions(["MYCOMPANY_KPI", "FORECAST_V2"]);
DaxHighlight.addKeywords(["DEFINE", "EVALUATE"]);  // e.g. DAX Studio dialect
```

## Module systems

```js
// ES Module
import { highlightDax, highlightAll, highlightElement, addFunctions } from "./dax-highlight.js";

// CommonJS
const { highlightDax, highlightAll } = require("./dax-highlight.js");

// <script> global
DaxHighlight.highlightAll();
```

## Theming

All colors are CSS custom properties declared on `.code-dax`. Override them wherever you want:

```css
/* Retheme the whole site */
.code-dax {
  --dax-keyword:  #b794f4;
  --dax-function: #63b3ed;
  --dax-variable: #f6ad55;
  --dax-measure:  #d6bcfa;
  --dax-ref:      #9ae6b4;
  --dax-string:   #fbb6ce;
  --dax-number:   #faf089;
  --dax-comment:  rgba(255,255,255,0.50);
}

/* Retheme a single block */
.brand-accent-code.code-dax {
  --dax-keyword: tomato;
}
```

A commented-out light-theme override (using `prefers-color-scheme: light`) is included at the bottom of `dax-highlight.css`.

## What gets tokenized

| Class | What it matches | Example |
|---|---|---|
| `.dax-k` | Keywords | `VAR` `RETURN` `IF` `SWITCH` `TRUE` `FALSE` `IN` `AND` `OR` `NOT` `BLANK` |
| `.dax-f` | Known function calls (identifier followed by `(`) | `SUM(` `CALCULATE(` `FILTER(` |
| `.dax-v` | Variable names | The identifier after `VAR`, plus anything starting with `_` |
| `.dax-m` | Bare measure / column refs | `[Sales Amount]` |
| `.dax-r` | Table-qualified refs | `'Sales'[Amount]` |
| `.dax-s` | String literals (with doubled-quote escape) | `"hello ""world"""` |
| `.dax-c` | Comments | `// line` and `/* block */` |
| `.dax-n` | Numeric literals | `123`, `12.5` |

The function list ships with **~120 common DAX functions** covering date/time, time intelligence, information, math/statistics, filter, relationship, table manipulation, and text. Unknown identifiers followed by `(` render as plain text, not as functions — this is deliberate, so typos don't get silently validated.

## Limitations & design choices

- **Regex-free tokenizer.** Written as a single-pass character scanner (~200 lines). Predictable, no catastrophic backtracking.
- **No AST.** It's a highlighter, not a parser. Malformed DAX still renders; it just won't colorize past the broken token.
- **No auto-injection.** The script doesn't run on load — you call `highlightAll()` when your DOM is ready. This matters for SPAs and Markdown-rendered content.
- **Idempotent.** `highlightElement` no-ops on an already-highlighted element (`__daxHighlighted` flag).
- **Tiny.** No dependencies, no transpilation, works in any browser from the last ~5 years (uses `Set`, template literals, `querySelectorAll`).

## License

MIT — do whatever.
