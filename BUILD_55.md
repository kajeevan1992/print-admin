# Build 55 — Sitemap + Robots + Canonical System

## Rule followed
Before adding new code, the repo was searched for existing sitemap, robots, canonical, no-index and metadata output logic.

Finding:
- No existing public sitemap/robots/canonical system was found in `print-admin`.
- Build 55 therefore extends Build 53/54 SEO records instead of replacing or duplicating another system.

## Changed files — print-admin

- `src/core/seo/seo-public-output.service.ts`
- `app/sitemap.xml/route.ts`
- `app/robots.txt/route.ts`
- `app/api/internal/seo/resolve/route.ts`
- `app/api/internal/seo/sitemap/route.ts`
- `app/api/internal/seo/robots/route.ts`
- `BUILD_55.md`

## Changed files — hosted-theme

- `src/LaunchPages.jsx`

## What Build 55 adds

### Public sitemap.xml
Added:

- `GET /sitemap.xml`

Uses published SEO records from Build 53/54:

- only `status = published`
- only `includeInSitemap = true`
- excludes `noIndex = true`

The XML includes:

- loc
- lastmod
- changefreq
- priority

### Public robots.txt
Added:

- `GET /robots.txt`

Default output:

- allows public pages
- blocks `/api/`
- blocks `/api/internal/`
- blocks admin/customer-private paths like checkout/account/order
- includes sitemap URL

It also dynamically adds `Disallow` lines for SEO records marked:

- `noIndex = true`
- `status = hidden`

### SEO resolve API
Added:

- `GET /api/internal/seo/resolve?path=/your-page`

Returns route metadata:

- title
- metaDescription
- H1
- canonical URL
- robots value
- noIndex/noFollow
- schema types
- keyword
- product/location fields
- intro copy
- FAQ/internal links
- audit info

Also adds response headers:

- `Link: <canonical>; rel="canonical"`
- `X-Robots-Tag`

### Internal previews
Updated/added:

- `GET /api/internal/seo/sitemap`
- `GET /api/internal/seo/robots`

The internal sitemap preview now uses the same builder as public `/sitemap.xml`, so admin preview and live output do not drift apart.

### Hosted theme canonical/meta resolver
Updated `hosted-theme/src/LaunchPages.jsx` so `LaunchSeo` now:

1. Applies local fallback SEO immediately.
2. Calls `/api/internal/seo/resolve?path=/...`.
3. Applies SaaS SEO records when available.
4. Updates:
   - document title
   - meta description
   - meta robots
   - canonical link
   - Open Graph title
   - Open Graph description
   - Open Graph URL

If the resolver fails, the theme keeps the local fallback metadata.

## What was intentionally not changed

- No duplicate SEO table.
- No duplicate sitemap generator.
- No public API changes.
- No checkout changes.
- No VAT changes.
- No location/collection selector yet.
- No schema JSON-LD output yet; that is next build.

## Next recommended build
Build 56 — Schema Generator

This should output JSON-LD for:

- Organization
- LocalBusiness only for real branches
- Product
- BreadcrumbList
- FAQPage
- WebPage
- CollectionPage
- Service

It should reuse the SEO records and protect partner collection points from fake LocalBusiness schema.
