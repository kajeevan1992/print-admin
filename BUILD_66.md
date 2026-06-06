# Build 66 — Launch Readiness Test Runner

## Rule followed
Build 66 reuses existing launch systems and does not recreate or duplicate workflows.

Existing pieces reused:

- Location Manager
- SEO public output resolver
- Sitemap output service
- Storefront location data from Location Manager
- Collection handover/pass service
- Collection notification queue
- Ready collection automation status rules
- Tenant email settings/outbox sender configuration
- Existing VAT rule engine and order VAT summary builder
- Existing Launch Operations menu/navigation registry

## Changed files

- `src/core/launch/launch-readiness-runner.service.ts`
- `app/api/internal/launch/readiness/run/route.ts`
- `src/modules/launch/pages/launch-readiness-runner-page.tsx`
- `app/launch-readiness/page.tsx`
- `src/modules/launch/pages/launch-operations-page.tsx`
- `src/config/admin-navigation.ts`
- `BUILD_66.md`

## What Build 66 adds

### Read-only launch runner service

Added:

- `src/core/launch/launch-readiness-runner.service.ts`

The runner checks:

1. tenant/database availability
2. active products/categories
3. fulfilment locations
4. Sidcup main store readiness
5. location readiness warnings/errors
6. homepage SEO output
7. product-location SEO output
8. sitemap output
9. checkout collection selector data
10. collection pass service load
11. collection notification queue load
12. tenant email settings
13. VAT sanity for mixed VAT orders

The runner returns:

- `launchStatus`: `ready`, `review`, or `blocked`
- `score`
- `summary`: pass/warn/fail/skip counts
- `checks`
- `nextActions`

### Safe mode

Build 66 is read-only by default.

It does not:

- create test orders
- generate collection passes
- queue emails
- send emails
- change checkout data
- change SEO records
- change location records

This makes it safe to run before launch and after deployments.

### Internal API

Added:

```txt
GET /api/internal/launch/readiness/run
POST /api/internal/launch/readiness/run
```

Optional inputs:

```json
{
  "productSlug": "business-cards",
  "locationSlug": "sidcup"
}
```

Defaults:

- product: `business-cards`
- location: `sidcup`

### Admin page

Added:

- `/launch-readiness`

The page shows:

- score
- launch status
- pass/warn/fail/skip counts
- filter by check group
- next actions
- detailed check cards

### Navigation

Added `Launch Readiness` into the existing Launch Operations sidebar group using:

- `src/config/admin-navigation.ts`

Also updated the Launch Operations hub page to link to the runner.

## VAT sanity check

Build 66 uses the existing VAT engine to verify:

- leaflets/flyers are zero-rated
- business cards are standard-rated
- design/artwork service remains standard-rated even if the base print product is zero-rated
- delivery is standard-rated by default
- mixed VAT order summary is produced

## What was intentionally not changed

- No new order workflow
- No new checkout flow
- No duplicate email sender
- No duplicate collection system
- No public `/api/v1` changes
- No super-admin sidebar changes
- No database migration

## Next recommended build
Build 67 — Active Launch Test Data + Safe Test Order Generator

This should optionally create a controlled test order for Holo Print that can be used to verify:

1. checkout order creation
2. VAT summary saved on order
3. collection fulfilment saved in order notes
4. ready-for-collection automation queueing
5. collection pass creation
6. customer order view

It must remain opt-in and clearly marked as test data.
