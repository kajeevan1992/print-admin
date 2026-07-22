# Phase 33 — HOLO Print Launch Hardening, Content Setup and End-to-End UAT

## Scope

Phase 33 turns the existing Launch Command Centre into the authoritative launch workspace for the HOLO Print storefront. It extends the existing Storefront Builder, catalogue, pricing, checkout, customer account, artwork, proof, production, dispatch and accounting workflows. It does not add a second CMS, page renderer, product catalogue, order system, payment path, production board or dispatch system.

Default HOLO launch context:

- Tenant: `holo-print-sidcup`
- Storefront: `default-store`
- Representative product: `business-cards`
- Location: `sidcup`
- Representative paths:
  - `/business-cards/sidcup`
  - `/flyers/sidcup`
  - `/banners/sidcup`

## Production hardening

### Development seed

`POST /api/dev/seed` now:

- requires an authenticated super-admin;
- returns a private/no-store response;
- is hidden in production by default;
- requires both `ALLOW_PRODUCTION_DEV_SEED=true` and a matching `x-dev-seed-secret` value when an exceptional production seed is deliberately authorised;
- requires a configured `DEV_SEED_SECRET` of at least 32 characters.

Keep `ALLOW_PRODUCTION_DEV_SEED=false` for normal production operation.

### Database startup

The production `start` command now fails when Prisma generation or `prisma migrate deploy` fails. It no longer starts the application after a failed migration.

Before public traffic:

1. Confirm the production database is backup enabled.
2. Run deployment migrations.
3. Verify the application starts successfully.
4. Restore the latest backup into an isolated database.
5. Record the restore evidence in the Launch Command Centre.

### Runtime

- Node is pinned to 22.13.1 through `.nvmrc`.
- `package.json` accepts Node 22 LTS only.
- GitHub Actions uses Node 22.13.1.
- Set Vercel/Coolify to Node 22 LTS before deploying.

### CORS

Production has no built-in localhost, preview, Vercel or `sslip.io` storefront origins. Set the exact final HTTPS storefront origin through `CORS_ORIGINS`, `ALLOWED_ORIGINS`, `STOREFRONT_URL` and `NEXT_PUBLIC_STOREFRONT_URL`.

### Required production environment categories

Use `.env.example` as the checklist. Public launch requires:

- PostgreSQL `DATABASE_URL`;
- final application/storefront URLs;
- exact production CORS origins;
- Stripe live secret and publishable keys;
- Stripe webhook signing secret;
- dedicated storefront payment-token secret;
- dedicated customer MFA encryption key;
- SMTP host/auth/from details;
- unsigned Stripe webhooks disabled;
- production development seed disabled.

## Storefront content setup

All HOLO content is created through the existing **Storefront Builder**. Do not use retired Landing Pages, Page Content, Site Designer, Block Editor or Menu Builder writers.

### Homepage

Publish a complete HOLO homepage containing:

- hero and primary print-order call to action;
- Business Cards, Flyers, Posters, Banners, Stickers, Booklets and Signage entry points;
- same-day/next-day service explanation where operationally valid;
- Sidcup collection and delivery messaging;
- artwork/design support explanation;
- trust, review or customer-proof sections when genuine content is available;
- FAQs and contact call to action.

### Content pages

Publish and test:

- About;
- Contact;
- Artwork Guide;
- Delivery and Collection;
- Terms and Conditions;
- Privacy;
- Returns, Reprints and Refunds;
- relevant service/campaign pages.

### Global storefront

Confirm:

- HOLO logo, brand colour and typography;
- final favicon and social image;
- desktop and mobile navigation;
- header account/search/collection controls;
- announcement bar and highlights;
- footer contact, address, hours, legal links and social links;
- all image alt text.

Use draft, private preview, publish history and safe restore from the existing Builder workflow.

## Persistent UAT

The Launch Command Centre now stores task results in PostgreSQL per tenant and storefront.

Each UAT task records:

- pending, pass, fail or not-applicable status;
- an evidence note;
- optional internal/HTTPS evidence URL;
- reviewing staff member;
- review timestamp;
- immutable audit event.

Required public-launch tasks cannot be marked not applicable. Passing or failing a task requires an evidence note.

The catalogue covers:

- Storefront Builder content;
- products, search, pricing, custom sizes and VAT;
- fulfilment and domain/SEO;
- guest checkout, customer account, quote and email journeys;
- artwork, proof, production release, packing, dispatch and tracking;
- refunds, credit notes and reconciliation;
- security, runtime, backup/restore, browser and accessibility checks;
- test-data cleanup, final blockers, first-live-order monitoring and aftercare.

## Sign-off

Sign-off records are append-only.

Supported decisions:

- `blocked` — confirmation: `BLOCK HOLO PRINT`
- `soft-launch` — confirmation: `SOFT LAUNCH HOLO PRINT`
- `public-launch` — confirmation: `PUBLIC LAUNCH HOLO PRINT`

Public-launch sign-off is rejected unless every required UAT task has passed and the supplied final-readiness snapshot reports no hard blockers.

A soft launch should remain controlled: limited products, monitored orders, manual fallback available and no large promotional campaign until the first live order and post-launch health review pass.

## CI merge gate

`pnpm launch:hardening:check` verifies that:

- production seed authentication and kill switches remain present;
- production start remains fail-closed on migration errors;
- Node remains pinned to 22 LTS;
- old `sslip.io` CORS defaults do not return;
- required production environment categories stay documented.

The normal storefront safety workflow also runs theme boundaries, registry validation, folder/ZIP installer exercises and the complete Next.js production build.
