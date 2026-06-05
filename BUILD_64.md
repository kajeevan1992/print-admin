# Build 64 — Ready-for-Collection Automation

## Rule followed
Build 64 reuses the existing order update flow, Build 61 collection pass system, Build 62 collection notification queue and Build 63 email outbox sender.

No duplicate order workflow was created.
No duplicate notification system was created.
No database migration was added.
No checkout changes were made.

## Changed files

- `src/core/collection/ready-collection-automation.service.ts`
- `app/api/internal/orders/[id]/route.ts`
- `app/api/internal/collection/automation/route.ts`
- `src/modules/collection/pages/ready-collection-automation-page.tsx`
- `app/ready-collection-automation/page.tsx`
- `BUILD_64.md`

## What Build 64 adds

### Ready-for-collection automation service

Added:

- `src/core/collection/ready-collection-automation.service.ts`

The service checks existing orders and only processes orders that are:

- collection orders
- moved into a ready status

Ready statuses:

- `QUALITY_CHECK`
- `DISPATCHED`
- `DELIVERED`

It reuses:

- `queueCollectionNotification()` from Build 62
- `sendQueuedTenantEmails()` from Build 63

### Automatic hook on order update

Updated:

- `app/api/internal/orders/[id]/route.ts`

When an order is updated through the existing internal order route, the route now:

1. Reads the previous order status.
2. Updates the order using the existing `updateOrder()` service.
3. Runs ready-for-collection automation.
4. Returns `collectionAutomation` in the response.

This keeps the current order update route as the source of truth.

### Duplicate protection

Build 64 relies on Build 62 duplicate protection.

If a `collection-ready` email for the same order is already queued or sent, the automation does not create another one.

### Queue-only by default

By default, automation queues the ready-for-collection email.

It does not send immediately unless either:

- the API/body passes `sendNow: true`
- env `COLLECTION_READY_AUTO_SEND=true`
- env `AUTO_SEND_COLLECTION_READY_EMAILS=true`

This protects launch testing from accidental live emails.

### Manual automation API

Added:

- `GET /api/internal/collection/automation?orderId=ORD-123`
- `POST /api/internal/collection/automation`

POST one order:

```json
{
  "orderId": "ORD-123",
  "force": true,
  "sendNow": false
}
```

POST batch:

```json
{
  "limit": 50,
  "force": true,
  "sendNow": false
}
```

### Admin page

Added:

- `/ready-collection-automation`

The page supports:

- run automation for one order
- run automation for ready-status orders in batch
- force re-check already-ready orders
- send immediately after queueing
- queue-only mode
- view queued/skipped/duplicate/sent results

## Important behaviour

Collection detection supports both raw checkout payloads and normalized order objects.

This means automation can work from:

- existing DB order notes with Build 60 fulfilment data
- normalized order responses with `shippingMethod` labels such as `Collect from Holo Print Sidcup`

## What was intentionally not changed

- No checkout pricing/VAT changes.
- No customer account changes.
- No SMS sending provider.
- No cron/background worker.
- No sidebar navigation patch.
- No duplicate email sender.

## Next recommended build
Build 65 — Admin Navigation + Launch Operations Menu

This should safely add the recent launch tools to the sidebar/navigation registry:

- Location Manager
- Collection Handover
- Ready Collection Automation
- Email Send Controls

It must reuse the existing navigation registry and avoid hardcoded duplicate sidebars.
