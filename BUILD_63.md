# Build 63 — Email Outbox Sender / SMTP Send Controls

## Rule followed
Build 63 reuses the existing email/outbox system instead of creating a duplicate sender.

Existing pieces reused:

- `TenantEmailSettings`
- `TenantEmailOutboxEmail`
- `src/core/email/email-outbox-sender.service.ts`
- existing nodemailer dependency
- Build 62 `collection-ready` queued emails

No new Prisma migration was added.
No checkout changes were made.
No duplicate email table was created.

## Changed files

- `app/api/internal/email/outbox/route.ts`
- `src/modules/email/pages/email-send-controls-page.tsx`
- `app/email-send-controls/page.tsx`
- `BUILD_63.md`

## Important existing code found

An existing sender service already existed from an earlier build:

- `src/core/email/email-outbox-sender.service.ts`

It already supported:

- tenant email settings
- SMTP verification
- test email queueing
- queued outbox sending
- nodemailer transport creation
- outbox status updates

Build 63 exposes this existing service through a clearer API and admin control page.

## Internal API added

Added:

- `GET /api/internal/email/outbox`
- `POST /api/internal/email/outbox`

GET supports:

- `type`
- `status`
- `search`
- `limit`

POST actions:

- `verify-smtp`
- `queue-test`
- `send-test`
- `send-queued`

Example send queued collection emails:

```json
{
  "action": "send-queued",
  "type": "collection-ready",
  "limit": 20,
  "dryRun": false
}
```

## Admin page added

Added route:

- `/email-send-controls`

The page supports:

- viewing SMTP status summary
- filtering by email type
- filtering by status
- default type `collection-ready`
- dry-run processing
- processing queued emails
- queue/process test email
- outbox status cards
- failed email error display

## Why a new page was added

An older `/email-outbox` page already exists for the artwork email workflow.

The connector blocked a large full replacement of that old page, so Build 63 adds a focused sender-control page instead of risking the older workflow.

## What was intentionally not changed

- The old `/email-outbox` page was not removed.
- No checkout changes.
- No collection pass changes.
- No SMS provider integration.
- No automatic cron/background worker.
- No sidebar navigation patch.

## Next recommended build
Build 64 — Ready-for-Collection Automation

This should automatically queue/send collection-ready emails when orders move to `QUALITY_CHECK` or `DISPATCHED`, using safe settings and duplicate protection.
