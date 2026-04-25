# Product Configuration Model v217

v217 connects the pricing layers into a final internal pricing result:

```txt
Product options
→ Pricing quote input
→ Production estimate
→ Cost breakdown
→ Final pricing rules
→ Sell price preview
```

## Final pricing rules now supported

- markupPercent
- marginPercent / pricingMarginPercent
- minimumChargeMinor / minChargeMinor
- roundingIncrementMinor
- turnaroundMultipliers
- quantityBreaks / pricingTiers

## Recommended product metadata shape

```json
{
  "pricingMarginPercent": 35,
  "markupPercent": 0,
  "minimumChargeMinor": 2500,
  "roundingIncrementMinor": 5,
  "turnaroundMultipliers": {
    "standard": 1,
    "priority": 1.25,
    "rush": 1.5
  },
  "quantityBreaks": [
    { "minQuantity": 1, "maxQuantity": 99, "multiplier": 1 },
    { "minQuantity": 100, "maxQuantity": 499, "discountPercent": 5 },
    { "minQuantity": 500, "discountPercent": 10 }
  ]
}
```

## Important

The pricing engine can only produce useful numbers when product option values have real setup/run/minimum costs and pricing basis configured.
