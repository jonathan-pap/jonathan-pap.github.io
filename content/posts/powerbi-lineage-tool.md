# A small tool for documenting Power BI models

Most Power BI models grow the same way. Someone builds a quick proof of concept, the report lands, more measures get added, a few tables creep in, and a year later nobody can quite remember why a particular column exists or which measure depends on what. The model still works. It's just become a place where changes feel risky.

I wrote **PowerBI-Lineage** to take some of that risk out.

## What it does

Point it at a model and it produces an end-to-end document of what's inside: the tables, the relationships, the measures, and how they all hang together. It's the kind of write-up you'd usually only do when you're handing a model over to someone — except you don't have to write it yourself, and it stays current.

The point isn't to replace anyone's eyes on the model. It's to give those eyes something to read first.

## Why bother

A few situations where this earns its keep:

You inherit a model and need to understand it before changing anything. Instead of clicking through every measure to trace dependencies, you read the document.

You're about to rename a column or change a relationship and want to know what touches it before you push the change. The lineage tells you.

A teammate asks "what does this measure actually do?" and you want a real answer, not a guess.

It's also useful for the slightly less glamorous case: you just want a snapshot of the model written down somewhere, so that when someone leaves the team there's a record of what they built.

## Where to find it

Try it in the browser: [jonathan-pap.github.io/PowerBI-Lineage](https://jonathan-pap.github.io/PowerBI-Lineage/)

Source on GitHub: [github.com/jonathan-pap/PowerBI-Lineage](https://github.com/jonathan-pap/PowerBI-Lineage)

Have a look, kick the tyres, and let me know what's missing.
