# Power BI Performance Optimization Playbook

Power BI performance is rarely a single-issue problem. In most enterprise models, delays come from a combination of model shape, DAX patterns, visual design, and refresh strategy. This playbook gives a practical framework to improve report speed while keeping the model maintainable.

## Executive Summary

If you need to improve performance quickly:

- Reduce model size first (column pruning, correct data types, lower cardinality).
- Move heavy transformations upstream to dataflows or the warehouse.
- Simplify DAX by using clear base measures and limiting iterator-heavy logic.
- Limit visual density on pages that rely on complex measures.
- Validate each change with Performance Analyzer and DAX Studio before moving on.

## 1. Start with the Semantic Model

### Keep only what the report needs

Large models increase scan cost and memory usage. Remove unused columns and tables, and avoid importing descriptive text fields unless they are required for filtering or display.

### Optimize data types and cardinality

- Use whole number or fixed decimal where possible.
- Avoid high-cardinality string keys in fact tables.
- Split date-time into separate Date and Time only when analytically required.

Lower cardinality usually improves compression and query speed.

### Use a clean star schema

A proper star schema with one-direction relationships from dimensions to facts gives the VertiPaq engine the best chance to optimize scans and joins.

## 2. Improve DAX Measure Patterns

### Build reusable base measures

Define base measures once, then compose business logic from those measures. This avoids repeated expressions and improves maintainability.

```DAX
Sales Amount = SUM ( 'Sales'[SalesAmount] )

Gross Margin = [Sales Amount] - [Total Cost]

Gross Margin % = DIVIDE ( [Gross Margin], [Sales Amount] )
```

### Prefer variables for readability and stability

Variables make logic easier to evaluate and reduce repeated computation in complex measures.

```DAX
YoY Sales % =
VAR SalesCY = [Sales Amount]
VAR SalesPY = CALCULATE ( [Sales Amount], DATEADD ( 'Date'[Date], -1, YEAR ) )
RETURN
    DIVIDE ( SalesCY - SalesPY, SalesPY )
```

### Watch iterator-heavy expressions

Functions like SUMX, FILTER, and nested row-context logic are useful, but expensive at scale. Use them intentionally and test with realistic slicer states.

## 3. Design Pages for Query Efficiency

### Limit visual count per page

Each visual can trigger one or more queries. Highly interactive pages with many visuals amplify latency. Prioritize a clear visual hierarchy and move secondary analysis to drill-through pages.

### Use interactions intentionally

Disable unnecessary cross-highlighting and cross-filtering. This reduces query fan-out and improves perceived responsiveness.

### Handle detail views with drill-through

Do not place granular tables beside heavy KPIs on the same page. Use drill-through to isolate detailed exploration.

## 4. Tune Refresh and Incremental Strategy

### Partition large fact tables

For large datasets, incremental refresh reduces processing time and operational risk. Keep historical partitions stable and refresh only recent windows.

### Separate hot and cold data

Use hybrid or near-real-time strategies only where business value is clear. Most analytical pages perform best when real-time requirements are scoped narrowly.

## 5. Validation Workflow

Use a repeatable validation loop:

1. Capture baseline timings (page load, visual query duration).
2. Apply one optimization change.
3. Retest with the same filter context.
4. Document impact and keep only improvements.

Recommended tooling:

- Power BI Performance Analyzer
- DAX Studio (server timings, query plan)
- VertiPaq Analyzer for model composition

## Implementation Checklist

- [ ] Remove unused columns/tables
- [ ] Confirm star schema relationships
- [ ] Standardize base measures
- [ ] Refactor expensive measures with variables
- [ ] Reduce visual density on heavy pages
- [ ] Implement incremental refresh for large tables
- [ ] Validate before/after with timing evidence

## Closing Recommendation

Treat performance as a product feature, not a one-time cleanup. Establish modeling standards, DAX review practices, and a release checklist that includes timing benchmarks. Teams that operationalize this process consistently deliver faster, more reliable Power BI experiences.
