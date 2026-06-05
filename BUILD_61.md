# Build 61 — QR/PIN Collection System

## Rule followed
Build 61 reuses the existing order system, Build 60 fulfilment payload, Build 57 Location Manager and `CoreCatalogRecord` storage.

No duplicate order table was created.
No checkout rewrite was created.
No new Prisma migration was added.

## Changed files

- `src/core/collection/collection-handover.service.ts`
- `app/api/internal/storefront/customer/orders/[id]/collection-pass/route.ts`
- `app/api/internal/collection/verify/route.ts`
- `app/api/internal/collection/passes/route.ts`
- `src/modules/collection/pages/collection-handover-page.tsx`
- `app/collection-handover/page.tsx`
- `BUILD_61.md`

## Storage model

Collection passes are stored in existing `CoreCatalogRecord`:

- `resource = collection-handover-passes`
- `slug = order + token slug`
- `metadataJson = collection pass data`

## Customer collection pass API

Added:

- `GET /api/internal/storefront/customer/orders/[id]/collection-pass`

It creates/returns a collection pass only when the order uses collection fulfilment.

The pass includes:

- collection token
- 6-digit PIN
- QR URL
- order number
- customer details
- location label
- location address
- pickup instructions
- collection truth text
- status: `not-ready`, `ready`, `collected`, `cancelled`

## Verification API

Added:

- `GET /api/internal/collection/verify?token=...`
- `POST /api/internal/collection/verify`

POST can verify only or mark collected:

```json
{
  "pin": "123456",
  "orderId": "ORD-123",
  "markCollected": true,
  "collectedBy": "admin-counter"
}
```

## Admin list API

Added:

- `GET /api/internal/collection/passes`

Filters:

- `status`
- `search`

## Admin page

Added:

- `/collection-handover`

The page supports:

- entering/scanning token
- entering PIN + order number
- verifying a pass
- marking the pass as collected
- viewing recent collection passes
- summary counts

## Readiness behaviour

Pass status is derived from the order unless already collected/cancelled:

- `QUALITY_CHECK`, `DISPATCHED`, `DELIVERED` => ready
- other statuses => not-ready

## What was intentionally not changed

- No order schema migration.
- No duplicate order status system.
- No partner dashboard yet.
- No automated email/SMS pass sending yet.
- No self-hosted QR image renderer yet.
- No sidebar navigation patch.

## Next recommended build
Build 62 — Collection Notifications

This should send email/SMS-ready notifications when an order is ready for collection, including PIN, QR link and pickup instructions.
