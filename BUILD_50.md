# Build 50

Email notification outbox wiring.

Changed files:
- `src/core/email/order-notifications.service.ts`
- `app/api/internal/storefront/checkout/route.ts`
- `app/api/internal/storefront/quote/request/route.ts`
- `app/api/internal/orders/[id]/payment/route.ts`
- `app/api/internal/storefront/payments/card/confirm/route.ts`
- `BUILD_50.md`

Summary:
- Added order email notification service using the existing `TenantEmailOutboxEmail` table.
- Checkout now queues:
  - customer order confirmation
  - admin new-order alert
- Quote checkout now queues:
  - customer quote/order confirmation
  - admin new-order alert
- Admin payment link creation now queues:
  - customer payment link email
- Admin mark-paid now queues:
  - customer payment received email
- Stripe payment return confirmation now queues:
  - customer payment received email

Email types:
- `customer-order-confirmation`
- `admin-new-order`
- `customer-payment-link`
- `customer-payment-received`

Launch behaviour:
- Emails are queued into outbox and do not block checkout/order/payment if queueing fails.
- Actual SMTP sending can be handled by the existing or next outbox sender/worker.
- Admin recipient defaults to `HOLO_PRINT_ADMIN_EMAIL`, `ORDER_NOTIFICATION_EMAIL`, `ADMIN_EMAIL`, `SMTP_FROM_EMAIL`, or `sales@holoprint.co.uk`.

Not changed:
- No external mail provider was added.
- No duplicate email system.
- No checkout redesign.
- No VAT changes.
- No public API changes.
