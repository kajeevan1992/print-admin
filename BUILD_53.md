# Build 53 — SEO Engine Foundation

## Rule followed
Before adding new code, the repo was scanned for existing SEO/sitemap/canonical/schema systems and existing storage patterns.

Findings:
- No existing dedicated SEO engine was found.
- Existing reusable tenant storage patterns already exist:
  - `CoreCatalogRecord`
  - `OwnerControlRecord`
  - tenant context via `tenantContextFromRequest`
- Build 53 uses `CoreCatalogRecord` with resource `seo-pages` instead of creating a duplicate SEO table.

## Changed files

- `src/core/seo/seo-engine.service.ts`
- `app/api/internal/seo/pages/route.ts`
- `app/api/internal/seo/sitemap/route.ts`
- `src/modules/seo/pages/seo-engine-page.tsx`
- `app/seo-engine/page.tsx`
- `BUILD_53.md`

## What Build 53 adds

### SEO storage foundation
Uses existing `CoreCatalogRecord` table:

- `resource = seo-pages`
- `slug = SEO record slug`
- `name = SEO title`
- `description = meta description`
- `metadataJson = full SEO payload`

No new Prisma table was created.

### SEO page record fields
Each SEO page supports:

- page type
- status
- path
- SEO title
- meta description
- H1
- canonical URL
- no-index
- no-follow
- include/exclude sitemap
- schema types
- target keyword
- product name
- location name
- template key
- intro copy
- FAQ items
- internal links
- metadata

### Supported page types

- home
- product
- category
- location
- collection-point
- product-location
- guide
- static
- service-area

### Supported schema types

- Organization
- LocalBusiness
- Product
- BreadcrumbList
- FAQPage
- WebPage
- CollectionPage
- Service
- None

### SEO audit checks
Build 53 includes foundation SEO audit checks for:

- missing SEO title
- title length
- missing meta description
- meta description length
- missing H1
- missing canonical
- no-index + sitemap conflict
- missing target keyword
- missing schema
- location page missing location name
- product-location page missing product name
- partner collection point using fake LocalBusiness schema
- weak intro copy
- missing internal links
- missing FAQ block

### Seed SEO pages
Seed action creates initial Holo Print records:

- `/`
- `/contact`
- `/business-cards/sidcup`
- `/flyers/sidcup`
- `/print-collection/wimbledon`

### Internal API
Added:

- `GET /api/internal/seo/pages`
- `POST /api/internal/seo/pages`
- `POST /api/internal/seo/pages` with `{ "action": "seed" }`
- `GET /api/internal/seo/sitemap`

### Admin page
Added:

- `/seo-engine`

The page shows:

- total SEO records
- published/draft/hidden counts
- indexable count
- error count
- sitemap URL count
- SEO record list
- selected record detail
- SEO score
- audit warnings/errors
- seed action
- publish selected action

## Important note
I attempted to add `SEO Engine` into the existing admin sidebar navigation file, but the connector blocked the full-file update because that file is large. The route `/seo-engine` exists and works; the sidebar link can be added in a later small navigation-only patch or manually under the existing Content section.

## What was intentionally not changed

- No duplicate SEO table.
- No duplicate content system.
- No checkout changes.
- No payment changes.
- No VAT changes.
- No location/collection checkout selector yet.
- No public sitemap.xml replacement yet.

## Next recommended build
Build 54 — Powerful SEO Templates

This should add template generation for:

- product pages
- location pages
- collection point pages
- product-location pages
- local service-area pages

Example template:
`{Product} in {Location} | Order Online & Collect Locally | Holo Print`
