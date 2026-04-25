# v213 Product Configuration Model - Pricing Engine Foundation

v213 adds the first safe bridge from product configuration to pricing calculation.

## What v213 does

Product setup can now be tested through:

```txt
/api/internal/catalog/pricing-calculate
```

This endpoint takes:

- product id or slug
- customer selections
- quantity

It returns:

- quote input payload
- pricing lines
- setup/run/min-charge totals
- calculated preview total
- warnings if setup is incomplete

## What it does not do yet

This is not the final print pricing engine.

The final engine still needs:

- SRA3/SRA2 imposition
- ups per sheet
- sheet count
- roll/board yield
- printer width/bed limits
- machine speed
- finishing time
- labour cost
- waste allowance
- VAT/tax
- delivery
- profit margin
- discounts/promotions

## Why this step matters

Before adding real print formulas, every product must produce clean pricing inputs.

Example:

```txt
Business Card
- size -> width/height
- material -> material pricing key
- finish -> finish pricing key
- quantity -> quantity number
- turnaround -> production/rush multiplier
```

v213 lets us test that structure safely before building the full engine.
