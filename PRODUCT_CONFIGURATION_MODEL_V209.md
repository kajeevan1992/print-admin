# Product Configuration Model v209 — Compatibility Rules

v209 adds the next layer before pricing: compatibility between customer choices.

## Why this matters

In a real print shop, not every material works with every finish, printer or size.

Examples:

- Soft touch lamination may only work on coated silk card.
- Spot UV may require matte lamination first.
- A roll banner material may only work up to the printer/material roll width.
- A rigid board product must respect the source board size.
- Some materials cannot be creased, folded, laminated, foiled or cut in a specific way.

## New data shape

Each option group can now hold:

```txt
compatibilityMode
compatibilityNotes
```

Each option value can now hold:

```txt
compatibleMaterialIds
incompatibleMaterialIds
compatibleFinishIds
incompatibleFinishIds
compatiblePrinterIds
```

## Intended future flow

```txt
Product
→ Size group
→ Material group
→ Finish group
→ Quantity group
→ Turnaround group
→ Compatibility rules
→ Pricing engine
```

## Example: Business cards

```txt
Material: 350gsm silk
Allowed finishes: matte lamination, gloss lamination, soft touch

Material: 300gsm uncoated
Allowed finishes: none, round corners only

Finish: spot UV
Compatible materials: silk/coated materials only
```

## Example: PVC banner

```txt
Size group:
- preset + custom
- roll mode
- max width: 1200mm
- max length: 10000mm

Material group:
- PVC banner roll
- compatible printer/profile: wide format printer
```

## Not included yet

v209 does not calculate prices.

Pricing still comes later and will use these IDs/rules to decide:

- material cost
- sheet/roll/board usage
- finishing cost
- setup cost
- labour/machine time
- turnaround uplift
