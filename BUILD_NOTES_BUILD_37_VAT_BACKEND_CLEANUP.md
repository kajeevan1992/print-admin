# Build 37 — VAT Backend Cleanup + Invoice/Order Consistency

## Goal
Centralise backend VAT/order summary logic so customer order APIs, core order service, and invoice/receipt PDFs all read the same VAT summary shape.

## What changed

### New shared helper
- `src/core/tax/order-vat-summary.ts`
  - Adds `buildOrderVatSummary(order)`.
  - Adds `withOrderVatSummary(order)`.
  - Reads existing order totals, notes JSON, `taxSummary`, `vatBreakdown`, line metadata and minor-unit fields.
  - Derives fallback VAT breakdown from order items where older records only have line metadata.
  - Returns one consistent shape:
    - `netMinor`, `vatMinor`, `deliveryMinor`, `grossMinor`
    - readable `net`, `vat`, `delivery`, `gross`
    - `vatBreakdown`
    - `taxEnforcedAt`
    - `isMixedVat`
    - `hasVatBreakdown`

### Core order service
- `src/core/orders/orders.service.ts`
  - Imports the shared helper.
  - `saveOrder(...)` now stores `taxSummary`, `vatBreakdown`, and `taxEnforcedAt` in order notes.
  - `normalize(...)` now returns `taxSummary` on every order returned by `getOrder(...)` and `listOrders(...)`.
  - Order totals still use the existing VAT enforcement path with `calculateVatLine(...)` and `calculateDeliveryVat(...)`.

### Customer order APIs
- `app/api/internal/storefront/customer/orders/route.ts`
- `app/api/internal/storefront/customer/orders/[id]/route.ts`
  - Removed duplicated local `taxSummary(...)` helpers.
  - Now use `withOrderVatSummary(...)` from the shared helper.

### Invoice/receipt PDFs
- `src/core/documents/order-pdf.ts`
  - Now imports `buildOrderVatSummary(...)`.
  - PDF totals and VAT breakdown now come from the same shared backend VAT summary.
  - Mixed VAT invoices label the section as `Mixed VAT Breakdown`.

## What was intentionally not changed
- No hosted theme redesign.
- No `/api/v1` public API changes.
- No new checkout/order flow.
- No Stripe/payment behaviour changes.
- No database schema change.

## Notes
This build cleans up backend consistency only. It does not replace the existing product VAT rules or checkout VAT enforcement. It makes those existing results easier to reuse safely across customer account, admin order documents, and future admin order screens.
