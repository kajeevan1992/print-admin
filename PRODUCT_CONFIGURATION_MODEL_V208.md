# Product Configuration Model v208

v208 adds print-production constraints to option groups.

## Size group examples

### Business cards
- dimensionMode: preset-only
- sheetFitMode: sra3
- sourceSheetWidth: 320
- sourceSheetHeight: 450
- values:
  - 85 × 55 mm
  - 55 × 55 mm
  - folded cards

### PVC banner
- dimensionMode: preset-and-custom or custom-only
- sheetFitMode: roll
- maxWidth: printer/material safe width, e.g. 1200 mm
- maxHeight: roll length/order limit, e.g. 10000 mm
- sourceSheetWidth: roll width, e.g. 1300 mm
- sourceSheetHeight: roll length, e.g. 50000 mm

### Rigid board
- dimensionMode: preset-and-custom
- sheetFitMode: board
- sourceSheetWidth: 1220
- sourceSheetHeight: 2440
- maxWidth/maxHeight: printer/board limits

## Quantity groups

Two modes now exist:

- fixed-list: 25, 50, 100, 250, 500...
- range-with-step: min 25, max 20000, step 25

Pricing engine later decides whether a range is valid/profitable.

## Production code

Each option value can store a production code. This is separate from display label.

Example:
- customer label: 350gsm Silk
- sourceId: material library id
- productionCode: silk-350
- pricingKey: material

## Still not included

v208 does not calculate prices. It stores the data the pricing engine will need later.
