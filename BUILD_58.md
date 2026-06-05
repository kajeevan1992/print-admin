# Build 58 — Public Location Pages

## Rule followed
Build 58 reuses Build 57 Location Manager records and Build 53–56 SEO system.

Existing pieces reused:
- `CoreCatalogRecord` location storage from Build 57
- `resource = fulfilment-locations`
- `/api/internal/storefront/locations`
- SEO records synced from `saveSeoPage()`
- hosted-theme `LaunchSeo` for canonical/meta/schema output

No duplicate location table or SEO system was created.

## Changed files — print-admin

- `app/api/internal/storefront/locations/[slug]/route.ts`
- `BUILD_58.md`

## Changed files — hosted-theme

- `src/LocationPages.jsx`
- `src/ConnectedApp.jsx`
- `BUILD_58.md`

## What Build 58 adds

### Public location detail API
Added:

- `GET /api/internal/storefront/locations/[slug]`

Returns a single public-safe location record for storefront rendering.

The API keeps sensitive/admin-only details out of the storefront response.

### Hosted theme public location pages
Added public page renderer for:

- `/locations`
- `/locations/sidcup`
- `/print-collection/wimbledon`
- `/print-collection/kingston`
- `/printing/croydon`
- `/printing/bromley`
- `/printing/sutton`

### Page types rendered

- Holo Print main store / owned branch pages
- partner collection point pages
- service area pages
- location index page

### Honest local SEO wording
Partner collection and service-area pages clearly state:

- this is not a fake Holo Print branch
- collection is through approved partner point where available
- service areas are online/delivery/future collection areas
- checkout will confirm available collection/delivery options

### Live data + fallback behaviour
The hosted theme tries to load live Location Manager records first.

If the API is unavailable or locations are not seeded/activated yet, it falls back to safe launch content for:

- Sidcup
- Wimbledon
- Kingston
- Croydon
- Bromley
- Sutton

This prevents blank pages during launch testing while still allowing the SaaS data to take over after seed/activation.

### Route wiring
`ConnectedApp.jsx` now detects location routes before product routes.

Build fingerprint updated to:

`HOSTED-THEME-BUILD-58-PUBLIC-LOCATION-PAGES-v2026-06-05`

## What was intentionally not changed

- No checkout collection selector yet.
- No QR/PIN handover yet.
- No partner dashboard yet.
- No location sidebar navigation patch.
- No VAT changes.
- No payment changes.

## Next recommended build
Build 59 — Product + Location SEO Pages

This should render useful public pages for high-value product/location URLs such as:

- `/business-cards/wimbledon`
- `/flyers/wimbledon`
- `/banners/wimbledon`
- `/business-cards/kingston`
- `/flyers/kingston`
- `/banners/kingston`
- `/business-cards/sidcup`
- `/flyers/sidcup`
- `/banners/sidcup`

These pages should reuse SEO Engine records and Location Manager truth rules.
