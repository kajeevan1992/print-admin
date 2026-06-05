# Build 56 — Schema Generator

## Rule followed
Before adding new code, both repos were searched for existing JSON-LD/schema.org/structured data logic.

Finding:
- No existing JSON-LD/schema generator was found.
- Build 56 therefore extends the Build 53/54/55 SEO system and does not create duplicate SEO storage.

## Changed files — print-admin

- `src/core/seo/seo-schema-generator.service.ts`
- `src/core/seo/seo-public-output.service.ts`
- `app/api/internal/seo/schema/route.ts`
- `BUILD_56.md`

## Changed files — hosted-theme

- `src/LaunchPages.jsx`

## What Build 56 adds

### Shared schema generator
Added `seo-schema-generator.service.ts`.

It generates JSON-LD from the existing SEO resolver metadata.

Supported schema types:

- Organization
- LocalBusiness
- Product
- BreadcrumbList
- FAQPage
- WebPage
- CollectionPage
- Service
- WebSite for home page

### Local SEO safety rules
The generator protects Google/local SEO accuracy:

- partner collection points do not output `LocalBusiness`
- service-area pages do not output `LocalBusiness`
- pages with `googleBusinessEligible = false` do not output `LocalBusiness`
- warning is returned if a fake LocalBusiness schema is attempted

### SEO resolver now includes schema
Updated `resolveSeoForPath()` output to include:

- `schemaJsonLd`
- `schemaNodes`
- `schemaWarnings`

This means `/api/internal/seo/resolve?path=/...` now returns metadata + structured data in one response.

### Internal schema preview API
Added:

- `GET /api/internal/seo/schema?path=/your-page`

Returns:

- page path
- page type
- status
- requested schema types
- JSON-LD graph
- schema nodes
- warnings

### Hosted theme JSON-LD injection
Updated `hosted-theme/src/LaunchPages.jsx` so `LaunchSeo` now:

1. Applies fallback SEO metadata.
2. Injects fallback WebPage JSON-LD.
3. Calls SaaS SEO resolver.
4. Replaces fallback with SaaS-generated JSON-LD when available.
5. Keeps one script tag only:

`<script id="holo-print-seo-jsonld" type="application/ld+json">...</script>`

## Environment variables supported

- `SEO_ORGANIZATION_NAME`
- `SEO_ORGANIZATION_LOGO`
- `SEO_ORGANIZATION_PHONE`
- `SEO_ORGANIZATION_EMAIL`
- `NEXT_PUBLIC_STOREFRONT_URL` or `STOREFRONT_URL`

Defaults are Holo Print values if env vars are not set.

## What was intentionally not changed

- No new SEO table.
- No duplicate schema storage.
- No checkout changes.
- No payment changes.
- No VAT changes.
- No location manager yet.
- No collection checkout selector yet.

## Next recommended build
Build 57 — Location Manager

This should add the full location model for:

- main production store
- owned branch
- partner collection point
- service area / virtual area

And fields for address, opening hours, cutoff time, collection instructions, product restrictions, SEO page flags and Google Business eligibility.
