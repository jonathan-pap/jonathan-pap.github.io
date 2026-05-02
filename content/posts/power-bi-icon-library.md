# A Power BI icon picker, powered by Iconify

If you've built a Power BI report with custom iconography, you know the loop. Open an icon pack, scroll, copy the SVG, paste it into PowerPoint, change the colour, save, drop it into the model as a measure, render it, decide the colour isn't quite right, undo, repeat.

It isn't hard. It's just slow, and it's slow every time.

I built a small notebook plus `.pbix` that turns that loop into one step.

## What it does

It pulls from [Iconify](https://iconify.design) — a registry of over 60,000 icons across families like Lucide, Material, Carbon, Phosphor, Boxicons, Clarity, and a couple of Power BI-specific sets — and gives you, inside a Power BI report:

- **Search** across the whole library. Type "chart" and get every chart icon from every set.
- **A colour picker and a variant picker.** Solid, outline, filled — flip until it sits right.
- **Live preview** on white, black, and grey backgrounds — the three you'll actually drop the icon onto.
- **A one-click DAX measure string.** Copy, paste into a measure, done.

That last part is the bit that earns its keep. Power BI accepts SVGs as base64 strings inside a measure, the form `"data:image/svg+xml;utf-8," & ...`. Building that string by hand is fiddly. Building it with the right colour baked in is more fiddly. The picker just hands you the finished measure.

## Why bother

Two situations where this is worth the setup:

**You're styling a dashboard and want consistent iconography.** Icon packs from different vendors don't always sit well together — different stroke weights, different padding. Iconify normalises a lot of that, and being able to flip through variants in seconds means you actually pick what fits, not what was easy to find.

**You're updating an existing report and need to recolour a set of icons.** Find them by name, repick the colour, regenerate the measure strings. Faster than re-exporting from Figma or PowerPoint each time.

## Where to find it

Source, notebook, and `.pbix` on GitHub:
[github.com/jonathan-pap/PowerBI/tree/main/icons](https://github.com/jonathan-pap/PowerBI/tree/main/icons)

Have a look, kick the tyres. If you've got a different way of doing this, tell me — there are probably ten of us solving the same problem with private hacks and nobody's compared notes.
