# v211 Product Configuration Model — Pricing Input Preparation

v211 prepares product configuration for the future pricing engine.

## Main idea

Product options must store stable pricing inputs before the engine can calculate jobs.

Example for business cards:

- Size → pricing role: size, basis: per-sheet
- Material → pricing role: material, basis: per-sheet
- Finish → pricing role: finish, basis: per-side or fixed
- Quantity → pricing role: quantity, basis: per-item
- Sides → pricing role: sides, basis: per-side
- Turnaround → pricing role: turnaround, basis: percentage or fixed

## New fields

### Option group

- pricingInputRole
- pricingBasis
- pricingUnit
- pricingFormulaHint

### Option value

- pricingInputRole
- pricingBasis
- setupCostMinor
- runCostMinor
- minChargeMinor
- pricingMultiplier
- pricingFormulaHint

## Why this matters

The pricing engine should not depend on customer labels like "Premium silk card".
It should use stable keys, roles and source IDs.

Correct:

```txt
material sourceId = mat-350gsm-silk
pricingInputRole = material
pricingBasis = per-sheet
```

Wrong:

```txt
Customer label = nice thick paper
```

## Endpoint

```txt
GET /api/internal/catalog/pricing-input-report
```

This reports which products are ready to be mapped into the pricing engine.
