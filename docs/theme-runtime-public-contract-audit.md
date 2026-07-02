# Public Theme Runtime Contract Audit

Date: 2026-07-02

## Purpose

This audit maps the existing SaaS/admin/catalog capabilities into what uploaded storefront themes should receive as public, storefront-safe data.

The theme should act as the skin. The SaaS remains the brain. Uploaded themes should receive a clean public runtime contract and should not receive raw internal SaaS records, cost data, admin-only fields, API secrets, or production-only data.

## Current runtime foundation already covered

The uploaded theme runtime currently exposes the following public-facing areas:

- Store identity
- Store routes
- Menu/nav items
- Products
- Categories derived from products
- Selected category
- Selected product
- Selected category products
- Breadcrumbs
- Page metadata
- Collection points
- Storefront-safe data mapping helpers

## Existing SaaS data found in code

### Tenant/store identity

`prisma/schema.prisma` includes tenant fields that can safely power public store identity when filtered correctly:

- `Tenant.name`
- `Tenant.slug`
- `Tenant.defaultSubdomain`
- `Tenant.primaryDomain`
- `Tenant.themeKey`

Theme-safe output should expose display names and public URLs only. Plan/account limits/status should not be exposed to the theme unless converted into public behaviour.

### Product/catalog core

The internal catalog service already has product/category concepts beyond the simple native theme card:

- Product id
- Product slug
- Product title/name
- Product subtitle/description
- Product type
- Active/draft status
- Global flag
- Price from minor
- Currency
- Category id/name/slug
- Product option config
- Product system/template rules

The current theme catalog adapter only reduces products to:

- slug
- category
- title
- text
- image
- price

This means the runtime is currently missing several public storefront product fields.

### Product options and pricing matrix

The admin product route already summarises:

- option groups
- option values
- storefront display type
- required flag
- sort order
- pricing source
- CSV import summary
- pricing matrix type/currency/row count

The theme contract should expose only storefront-safe option and pricing outputs, not internal pricing rows, cost calculations, margin, supplier cost, or machine cost.

### Catalog resource types

The SaaS catalog store includes these resources:

- products
- categories
- collections
- tags
- materials
- finishes
- option sets
- product option groups
- printer profiles
- shipping methods
- artwork profiles
- production routing rules

Public themes should receive some of these resources, but only after filtering.

## Public theme coverage map

| SaaS area | Existing source | Current theme coverage | Theme-safe output needed | Status |
| --- | --- | --- | --- | --- |
| Store identity | Tenant + route runtime | Partial | store name, public domain, store base, logo/brand fields | Partially covered |
| Theme selection | Tenant.themeKey + uploaded manifests | Partial | active theme manifest and asset base path | Missing DB connection |
| Products | Product/CoreCatalogRecord | Partial | id/slug/title/description/type/status/category/image/priceFrom/currency | Needs stronger mapper |
| Categories | Category/CoreCatalogRecord | Derived only | category slug/name/description/productCount/sort order/image/SEO | Missing direct loader |
| Product options | product-option-groups metadata | Not covered | option groups, values, required flags, storefront display type | Missing |
| Pricing | priceFromMinor + pricing matrix metadata | Basic price string only | priceFrom, currency, customer price labels, matrix summary, pricing action config | Missing |
| VAT/tax display | pricing/product metadata expected | Not covered | VAT label, tax inclusive/exclusive label, zero-rated/standard-rated public label | Missing |
| Materials | materials catalog resource | Not covered | public material choices and labels | Missing |
| Finishes | finishes catalog resource | Not covered | public finish/add-on choices and labels | Missing |
| Collections/tags | collections/tags resources | Not covered | homepage sections, featured collections, tag landing pages | Missing |
| Shipping/delivery | shipping-methods resource | Not covered | public delivery methods, collection/delivery labels, estimate text | Missing |
| Collection points | collection-points loader | Covered | slug/name/address/note/status/href | Covered v1 |
| Artwork/preflight | artwork-profiles resource/status enum | Not covered | upload requirements, accepted file types, proofing status labels | Missing |
| Cart/quote/order | route links only | Route links only | cart summary/actions, quote/order start actions, checkout handoff | Missing |
| Customer account/auth | routes only | Route links only | login/account links only for theme v1 | Partially covered |
| SEO/page builder | not directly mapped yet | Basic page metadata | custom title/meta/hero/content/location pages | Missing |
| Internal production | printer profiles/routing rules/order status | Not exposed | should not expose raw internal routing, machine data, staff notes | Keep private |

## Storefront-safe data boundary rules

Uploaded themes may receive:

- customer-visible product and category fields
- customer-visible price labels
- customer-visible option choices
- public routes and hrefs
- public collection/delivery choices
- public store branding and contact fields
- public SEO/page content
- public artwork upload requirements

Uploaded themes must not receive:

- cost price
- profit margin
- supplier cost
- machine cost
- internal production routing
- admin notes
- staff-only order notes
- internal job status transitions unless converted into customer-safe labels
- API keys/secrets
- webhook secrets
- tenant billing and subscription limits
- raw pricing matrix rows if they reveal business logic

## Recommended next builds

### Build 1: Direct category loader

Create a storefront-safe category loader from actual Category/CoreCatalogRecord records instead of deriving categories only from products.

Expose:

- slug
- title/name
- description
- productCount
- sortOrder
- image/hero image if available
- href

### Build 2: Product public mapper upgrade

Upgrade product mapping to use Product table style fields where available:

- id or publicId
- productType
- status/published flag
- categoryName/categorySlug
- priceFromMinor
- currency
- image/thumbnail/hero image
- short description

Keep internal metadata out unless mapped safely.

### Build 3: Product options public mapper

Expose storefront-safe product options:

- option group key/name/label
- type/input type
- storefront display type
- required flag
- sort order
- public values only

Do not expose internal dependency rules until filtered.

### Build 4: Pricing public summary

Expose public price information:

- priceFromMinor
- currency
- priceLabel
- priceMode: fixed/from/quote/matrix
- pricingMatrix summary only
- quoteRequired boolean

Do not expose cost, margin, supplier or full matrix rows if commercially sensitive.

### Build 5: VAT/tax public labels

Expose customer-safe VAT labels:

- vatLabel
- taxMode
- isZeroRated
- customerTaxNote

### Build 6: Materials and finishes public options

Expose public choices from materials/finishes/option sets.

### Build 7: Delivery/shipping methods

Expose public delivery/collection method choices and estimated labels from shipping-methods.

### Build 8: Artwork/preflight public requirements

Expose file upload requirements and proofing messages from artwork profiles.

### Build 9: SEO/page builder mapping

Expose public SEO/page-builder fields for home, category, product and location pages.

### Build 10: Runtime contract type

Create an explicit `StorefrontThemeRuntimeContract` type so future themes have a stable contract.

## Conclusion

The current runtime is a good foundation, but the next builds should map existing SaaS data into the public theme contract instead of inventing new theme-only data. The most important missing areas are product options, public pricing, VAT labels, materials/finishes, delivery/shipping, artwork/preflight requirements and direct category/SEO loaders.
