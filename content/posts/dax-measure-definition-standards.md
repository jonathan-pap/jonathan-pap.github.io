# DAX Measure Definition Standards

Most DAX models become hard to maintain for one simple reason: measures are created quickly but not defined consistently.

When naming, formatting, and grouping rules are clear, teams spend less time decoding logic and more time validating business outcomes.

## Why This Matters

- Faster onboarding for new developers and analysts.
- Fewer misunderstandings in self-service reporting.
- Easier model reviews before release.
- Better long-term maintainability as the model grows.

## The 5 Standards Every Measure Should Follow

### 1. Clear Business Meaning

Descriptions must convey the functional purpose and business logic of a measure to ensure quick understanding for self-service users and developers.

Use names and descriptions that answer: "What business question does this measure answer?"

```dax
-- Good: business intent is explicit
Sales Revenue YoY Growth % = ...
```

### 2. Result-Oriented Naming

Measure names should explicitly describe the result they produce rather than the technical process used to calculate them.

Prefer business outcomes over implementation terms:

- Better: `Gross Margin %`
- Avoid: `Margin Divide Calc`

### 3. Standardized Acronyms

Use widely recognized acronyms as suffixes only to ensure they do not hinder the searchability or clarity of the measure name.

If an acronym is not common across the team, write the full phrase.

- Better: `Customer Churn %`
- Acceptable suffix: `YoY`
- Avoid: unclear custom shortcuts

### 4. Precise Data Formatting

Ensure every measure is assigned the correct format, specifically defining whether it is a Percent, Whole Number, or Decimal.

Formatting is not cosmetic; it changes how users interpret business meaning.

- `%` for rates and shares
- `Whole Number` for counts
- `Decimal` for ratios not presented as percentages
- Currency format for monetary values

### 5. Logical Grouping

Organize the model by grouping measures into specific categories such as "Key Measures" (base metrics) and "Time Related" calculations.

A simple structure makes navigation predictable:

- `Key Measures`
- `Time Related`
- `Financial Ratios`
- `Operational KPIs`

## Quick Quality Check (Before Publish)

- [ ] Name expresses a business result.
- [ ] Description explains business purpose and rule context.
- [ ] Acronyms are standard and easy to understand.
- [ ] Format matches the metric type (Percent, Whole Number, Decimal, Currency).
- [ ] Measure is in the correct display folder/group.

## Closing Note

Readable, standardized measures are a model quality control practice, not just a formatting preference.  
If every new measure follows these five rules, your DAX layer stays scalable and audit-friendly.
