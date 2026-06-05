# Build 54 — Powerful SEO Templates

## Rule followed
Build 54 extends Build 53. It does not create a duplicate SEO system.

Existing Build 53 foundation reused:
- `CoreCatalogRecord` storage
- `resource = seo-pages`
- `saveSeoPage()`
- SEO audit scoring
- sitemap inclusion rules
- canonical/no-index/no-follow controls

Build 54 adds a template generation layer on top of that foundation.

## Changed files

- `src/core/seo/seo-template-engine.service.ts`
- `app/api/internal/seo/templates/route.ts`
- `src/modules/seo/pages/seo-templates-page.tsx`
- `app/seo-templates/page.tsx`
- `BUILD_54.md`

## What Build 54 adds

### SEO template engine
Added reusable powerful templates for:

- product pages
- product + location pages
- owned store location pages
- partner collection point pages
- service area pages
- guide pages

### Template examples

Product-location template:

`{Product} in {Location} | Order Online & Collect Locally | Holo Print`

Collection point template:

`Print Collection {Location} | Order Online, Collect Locally | Holo Print`

Service-area template:

`Printing for {Location} | Online Print & Delivery | Holo Print`

### Honest local SEO rules
Partner collection points are generated with honest wording:

- collection point
- not fake branch
- not fake Holo Print store
- no LocalBusiness schema unless it is a real owned/staffed branch

The metadata includes:

- `googleBusinessEligible`
- `locationType`
- `collectionTruth`

### Product source reuse
The generator tries live tenant products first:

- `Product` table for the active tenant

If no live products exist, it falls back to Build 46 Holo Print launch products:

- Business Cards
- Flyers & Leaflets
- Posters
- PVC Banners
- Stickers & Labels
- Booklets
- Shop Boards & Signage
- Design Service / Artwork Help

### Default launch locations
Included foundation locations:

- Sidcup — owned store / real branch
- Wimbledon — partner collection
- Kingston — partner collection
- Croydon — service area
- Bromley — service area
- Sutton — service area

### Generated SEO content includes

- title
- meta description
- H1
- canonical URL
- path
- target keyword
- intro copy
- schema types
- FAQs
- internal links
- sitemap flag
- no-index/no-follow controls through Build 53
- SEO audit score through Build 53

### Internal API
Added:

- `GET /api/internal/seo/templates`
- `GET /api/internal/seo/templates?action=preview&key=product-location`
- `POST /api/internal/seo/templates` with `{ "action": "seed" }`
- `POST /api/internal/seo/templates` with `{ "action": "preview" }`
- `POST /api/internal/seo/templates` with `{ "action": "generate" }`

Generation options:

```json
{
  "action": "generate",
  "productLimit": 8,
  "locationLimit": 6,
  "publish": false
}
```

Recommended: generate as draft first, review in `/seo-engine`, then publish selected pages.

### Admin page
Added:

- `/seo-templates`

The page supports:

- seed templates
- preview product-location output
- product limit
- location limit
- generate draft/published pages
- template list cards

## What was intentionally not changed

- No new SEO table.
- No duplicated SEO storage.
- No checkout changes.
- No VAT changes.
- No public sitemap.xml replacement yet.
- No location/collection checkout selector yet.
- No sidebar navigation rewrite, because the large navigation file was blocked in Build 53.

## Next recommended build
Build 55 — Sitemap + Robots + Canonical System

This should connect the SEO records to public sitemap/robots/canonical output for the hosted storefront/admin runtime.
