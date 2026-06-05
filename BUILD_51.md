# Build 51

Email outbox sender and email settings test.

Changed files:
- `src/core/email/email-outbox-sender.service.ts`
- `app/api/internal/email/settings/route.ts`
- `app/api/internal/email/outbox/send/route.ts`
- `BUILD_51.md`

Summary:
- Added an SMTP email outbox sender using the existing `TenantEmailSettings` and `TenantEmailOutboxEmail` tables.
- Added email settings API:
  - `GET /api/internal/email/settings`
  - `POST /api/internal/email/settings`
  - `PATCH /api/internal/email/settings` with `{ "action": "verify" }`
- Added email outbox send API:
  - `POST /api/internal/email/outbox/send` with `{ "action": "send" }`
  - `POST /api/internal/email/outbox/send` with `{ "action": "verify" }`
  - `POST /api/internal/email/outbox/send` with `{ "action": "queue-test", "to": "email@example.com" }`
  - `POST /api/internal/email/outbox/send` with `{ "action": "test-send", "to": "email@example.com" }`
- Added env fallback for SMTP settings so launch can use Coolify environment variables without needing a settings UI first.

Supported env variables:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS` or `SMTP_PASSWORD`
- `SMTP_FROM_EMAIL`
- `SMTP_FROM_NAME`
- `SMTP_REPLY_TO`
- `HOLO_PRINT_ADMIN_EMAIL`
- `ORDER_NOTIFICATION_EMAIL`
- `ADMIN_EMAIL`
- `NEXT_PUBLIC_STOREFRONT_URL` or `STOREFRONT_URL`
- `NEXT_PUBLIC_ADMIN_URL` or `ADMIN_URL`

Safe launch test steps:
1. Add Google Workspace SMTP/app-password settings in Coolify env.
2. Deploy.
3. POST `/api/internal/email/outbox/send` with `{ "action": "verify" }`.
4. POST `/api/internal/email/outbox/send` with `{ "action": "test-send", "to": "sales@holoprint.co.uk" }`.
5. Confirm the test email arrives.
6. Process queued launch emails with `{ "action": "send", "limit": 20 }`.

Important:
- This build sends queued emails when the endpoint is called.
- It does not add a background cron worker yet.
- Checkout/payment still does not fail if email queueing/sending fails.

Not changed:
- No duplicate mail system.
- No checkout changes.
- No VAT changes.
- No public API changes.
- No UI redesign.
