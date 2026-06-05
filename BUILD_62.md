# Build 62 — Collection Notifications

## Rule followed
Build 62 reuses the existing email/outbox database model instead of creating a duplicate notification system.

Existing pieces reused:

- Build 61 collection pass service
- Build 61 collection handover page
- `TenantEmailOutboxEmail`
- `TenantEmailSettings`
- collection PIN/QR URL
- existing order/customer/fulfilment data

No new Prisma migration was added.
No duplicate email table was created.
No checkout changes were made.

## Changed files

- `src/core/collection/collection-notifications.service.ts`
- `app/api/internal/collection/notifications/route.ts`
- `src/modules/collection/pages/collection-handover-page.tsx`
- `BUILD_62.md`

## What Build 62 adds

### Collection notification service

Added `collection-notifications.service.ts`.

It builds ready-for-collection messages from the existing collection pass:

- customer name
- order number
- 6-digit PIN
- QR pass link
- collection location
- address
- pickup instructions
- collection truth note

It generates:

- email subject
- plain text body
- HTML body
- SMS-ready short text

### Outbox integration

Collection emails are queued in the existing `TenantEmailOutboxEmail` table.

Stored values include:

- `type = collection-ready`
- `status = queued`
- customer email
- subject
- plain body
- HTML body
- QR/pass URL
- order ID
- collection pass metadata
- SMS-ready text

### Duplicate protection

The service does not queue duplicate ready-for-collection messages if an email for the same order is already queued or sent.

### Readiness protection

By default, it only queues the email when the collection pass status is `ready`.

If the order is still not ready, the API returns `order-not-ready`.

### API

Added:

- `GET /api/internal/collection/notifications`
- `GET /api/internal/collection/notifications?orderId=ORDER_NUMBER`
- `POST /api/internal/collection/notifications`

GET with no order ID lists recent collection notifications.

GET with order ID previews the notification.

POST queues the notification.

### Admin UI integration

Updated `/collection-handover`.

Added:

- preview email button
- queue ready email button
- notification preview panel
- SMS-ready text preview
- queued/sent/failed email metrics
- recent collection notification list

## What was intentionally not changed

- No SMTP sending worker was added in this build.
- No SMS provider was added.
- No checkout pricing or VAT changes.
- No duplicate order status system.
- No sidebar navigation patch.

## Next recommended build
Build 63 — Email Outbox Sender / SMTP Send Controls.
