# Product Configuration Model v215

v215 starts the first real internal pricing-cost breakdown.

Flow:

```txt
Product option groups
→ customer selections
→ pricing quote input
→ production estimate
→ cost breakdown
→ future final customer price
```

## Cost fields

Each option value can contribute:

- `setupCostMinor` — one-off setup cost in pennies
- `runCostMinor` — repeated cost in pennies
- `minChargeMinor` — minimum charge for that group/value
- `pricingMultiplier` — multiplier for rush/complexity/premium choices
- `pricingBasis` — how to multiply run cost

Supported basis detection now includes:

- per order
- per unit / each / item
- per sheet / board / source unit
- per impression / click / print
- per sqm / m2 / area

## Production link

The production estimate feeds the cost breakdown using:

- `sourceUnitsRequired`
- `impressions`
- selected width/height
- source sheet/roll/board size

This lets products such as business cards, booklets, boards, and banners start using different cost bases.

## Later phases

- VAT
- delivery price
- customer/trade pricing tiers
- promotions
- machine speed and labour time
- full booklet imposition logic
- material inventory cost sync
