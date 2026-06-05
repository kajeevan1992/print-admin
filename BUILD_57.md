# Build 57 — Location Manager

## Rule followed
Before adding new code, the repo was searched for existing location, branch, store, collection point, service area, shipping pickup and collection selector systems.

Finding:
- No existing dedicated location/branch/collection-point manager was found.
- Build 57 therefore reuses the existing tenant-scoped `CoreCatalogRecord` pattern instead of creating duplicate tables or a separate storage system.

## Changed files

- `src/core/locations/location-manager.service.ts`
- `app/api/internal/locations/route.ts`
- `app/api/internal/storefront/locations/route.ts`
- `src/modules/locations/pages/location-manager-page.tsx`
- `app/location-manager/page.tsx`
- `BUILD_57.md`

## Storage model

Locations are stored in existing `CoreCatalogRecord`:

- `resource = fulfilment-locations`
- `slug = location slug`
- `name = location name`
- `description = customer-facing description`
- `metadataJson = full location record`

No Prisma migration was added.

## Location types

Build 57 supports:

- `main-store`
- `owned-branch`
- `partner-collection-point`
- `service-area`

## Location fields

Each location can store:

- status
- public page enabled
- SEO page enabled
- Google Business eligibility
- address
- contact details
- opening hours
- collection hours
- cutoff time
- drop schedule
- pickup instructions
- customer-facing description
- admin notes
- allowed product slugs
- blocked product slugs
- collection fee
- partner fee
- priority
- SEO path/title/meta/H1/keyword/schema
- metadata
- readiness score/warnings/errors

## Default Holo Print seed locations

Seed action creates:

- Sidcup — main store / production base
- Wimbledon — partner collection point
- Kingston — partner collection point
- Croydon — service area
- Bromley — service area
- Sutton — service area

## SEO integration

When a location is saved or seeded, Build 57 syncs a matching SEO record through the existing Build 53 `saveSeoPage()` function.

This means location records and SEO pages stay connected.

SEO paths generated:

- owned/main store: `/locations/{slug}`
- partner collection point: `/print-collection/{slug}`
- service area: `/printing/{slug}`

## Truth and safety checks

Readiness checks warn/error for:

- missing name
- missing slug
- missing postcode for physical/collection locations
- owned store/branch not marked Google Business eligible
- partner collection point marked Google Business eligible
- service area marked Google Business eligible
- partner/service-area using `LocalBusiness` schema
- missing pickup instructions
- missing cutoff time
- missing opening hours
- weak customer-facing description
- SEO page enabled but SEO path missing

This protects Holo Print from fake branch SEO and incorrect Google Business/profile signals.

## Internal API

Added:

- `GET /api/internal/locations`
- `POST /api/internal/locations`
- `POST /api/internal/locations` with `{ "action": "seed" }`

Filters supported:

- `status`
- `type`
- `search`
- `publicOnly`

## Storefront API

Added:

- `GET /api/internal/storefront/locations`

This returns public-safe active locations for future checkout collection selector use.

It supports product filtering:

- `GET /api/internal/storefront/locations?productSlug=business-cards`

The endpoint respects:

- `allowedProductSlugs`
- `blockedProductSlugs`

## Admin page

Added:

- `/location-manager`

The page includes:

- metrics
- type/status/search filters
- seed locations action
- activate selected action
- selected location detail
- SEO path/schema preview
- pickup instructions
- customer description
- readiness warnings/errors

## What was intentionally not changed

- No duplicate location table.
- No checkout selector yet.
- No QR/PIN collection handover yet.
- No partner dashboard yet.
- No public location page renderer yet.
- No sidebar navigation rewrite because the navigation file has previously been blocked when large updates are attempted.

## Next recommended build
Build 58 — Public Location Pages

This should render real public pages for:

- `/locations`
- `/locations/sidcup`
- `/print-collection/wimbledon`
- `/print-collection/kingston`
- `/printing/croydon`
- `/printing/bromley`
- `/printing/sutton`

The page renderer should reuse the Location Manager records and the SEO Engine metadata/schema.
