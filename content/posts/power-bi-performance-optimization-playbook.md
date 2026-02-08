# Power BI Measure Standards Playbook

Readable logic, meaningful names, and disciplined formatting are not cosmetic choices. They are operating standards that make Power BI models easier to maintain, easier to govern, and easier for business users to trust.

This playbook turns those standards into a practical framework you can apply across your model today.

## Executive Summary

Adopt three pillars for every new or refactored measure:

- Documentation and readability
- Naming and nomenclature
- Formatting and organization

When these three are enforced consistently, teams onboard faster, debugging is simpler, and model quality stays stable as complexity grows.

## 1. Documentation and Readability

### Clear business meaning

Measure descriptions should explain functional purpose and business logic in plain language. A developer should know how the measure works, and a business analyst should know when to use it.

Good description checklist:

- What business question this measure answers
- Any non-obvious filters or assumptions
- Known limits or exclusions

### Effective commenting

Prefer comment blocks around business logic sections instead of commenting every line. This keeps code readable while still documenting intent.

```M
Gross Margin % =

//Purpose:
//Returns gross margin ratio at current filter context.

VAR _SalesAmount = [Sales Amount]
VAR _GrossMargin = [Gross Margin]
RETURN
    DIVIDE ( GrossMargin, SalesAmount,0 )
```

### Use variables

Variables improve readability, reduce repeated expressions, and make debugging easier.

```DAX
YoY Sales % =
VAR SalesCY = [Sales Amount]
VAR SalesPY =
    CALCULATE ( [Sales Amount], DATEADD ( 'Date'[Date], -1, YEAR ) )
RETURN
    DIVIDE ( SalesCY - SalesPY, SalesPY )
```

## 2. Naming and Nomenclature

### Result-oriented naming

Measure names should describe the outcome, not the implementation.

- Better: `Gross Margin %`
- Worse: `Calc Margin Ratio`

### Visible vs. technical

Keep end-user measures clean and readable. Prefix technical helper measures with an underscore so developers can distinguish them quickly.

- User-facing: `Revenue YTD`
- Technical: `_Revenue Base`

### Standardized acronyms

Use common acronyms (YTD, MTD, YoY, QoQ) consistently as suffixes. Avoid team-specific abbreviations that reduce searchability and clarity.

## 3. Formatting and Organization

### Precise data formatting

Every measure should have intentional formatting:

- Percent for ratio KPIs
- Whole number for counts
- Decimal or currency for financial values

Incorrect formats reduce trust and can lead to bad decisions.

### Logical grouping

Organize measures into clear display folders such as:

- Key Measures
- Time Intelligence
- Margin and Profitability
- Operational KPIs

Consistent grouping improves discoverability and reduces model friction for self-service teams.

## Team Implementation Standard

Use this review checklist before publishing:

- [ ] Description is present and business-focused
- [ ] Naming follows result-oriented conventions
- [ ] Helper measures use technical prefix (`_`)
- [ ] Measure formatting is explicitly set
- [ ] Measure is placed in the correct display folder
- [ ] Comments explain intent, not obvious syntax

## Closing Principle

If you want scalable Power BI development, treat measure quality as a governance practice, not a personal preference.

Readable logic, meaningful names, disciplined formatting.
