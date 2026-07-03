# HOLO Print 7-Day Launch Audit

Date: 2026-07-03

## Rule from now on

Do not build new systems unless this audit proves the needed feature is missing.

Every future build must reference this checklist and should be a connection/fix to existing SaaS features wherever possible.

## Evidence checked

- `prisma/schema.prisma`
- `src/core/catalog/internal-catalog.service.ts`
- `src/core/catalog/internal-catalog-http.ts`
- `src/core/catalog/catalog-store.ts`
- `app/api/internal/catalog/products/route.ts`
- `app/api/internal/catalog/categories/route.ts`
- `app/api/native-storefront/quote-requests/route.ts`
- `src/themes/atlantis-native/QuoteRequestPage.tsx`
- `src/theme-runtime/atlantis-renderer.tsx`
- Admin pattern audit attempted paths/searches:
  - `app/admin/page.tsx` not found
  - `app/dashboard/page.tsx` not found
  - `app/admin/catalog/products/page.tsx` not found
  - `app/(admin)/catalog/products/page.tsx` not found
  - repository searches for admin table/list patterns returned no reliable results through the connector

## Current database / SaaS foundation

### Verified existing platform models

The Prisma schema has:

- Tenant
- User
- TenantMembership
- AdminInvitation
- AdminSession
- Domain
- AuditLog
- CoreCatalogRecord

The schema also already defines launch-relevant enums:

- `ProductType`: STANDARD, QUOTE_LED, TEMPLATE_LED, UPLOAD_LED
- `OrderStatus`: DRAFT, AWAITING_PAYMENT, ARTWORK_CHECK, AWAITING_APPROVAL, APPROVED, IN_PRODUCTION, QUALITY_CHECK, DISPATCHED, DELIVERED, CANCELLED
- `ArtworkStatus`: UPLOADED, CHECKING, APPROVED, CHANGES_REQUESTED

Important finding: the enums for orders and artwork exist, but the schema file checked does not currently show dedicated `Order`, `OrderItem`, `Cart`, `Payment`, or `Artwork` models. This means order concepts exist in naming/status, but not yet as full verified DB tables in the checked schema.

## Existing catalog/admin capability

### Products

Status: **exists**

Evidence:

- `app/api/internal/catalog/products/route.ts` exposes GET, POST, PUT, PATCH, DELETE.
- It uses `listInternalCatalog`, `handleCatalogWrite`, and `handleCatalogDelete`.
- Product list response already summarises option groups, pricing source, CSV import summary and pricing matrix row count.

Launch decision:

- Reuse existing product admin API.
- Do not create a new product API.
- Storefront/theme should read public-safe product data from existing catalog/product layer.

### Categories

Status: **exists**

Evidence:

- `app/api/internal/catalog/categories/route.ts` exposes GET, POST, PUT, PATCH, DELETE.
- It uses the shared internal catalog handler.

Launch decision:

- Reuse existing category admin API.
- Storefront/theme should read real categories only.

### Product options

Status: **partially exists**

Evidence:

- `src/core/catalog/internal-catalog.service.ts` defines `PRODUCT_OPTION_GROUPS_RESOURCE = 'product-option-groups'`.
- Products can attach option configuration from `CoreCatalogRecord` resource `product-option-groups` using product ID as slug.
- Product list summary exposes compact option group fields such as key, name, label, inputType, storefrontDisplayType, required, sortOrder, and values.

Launch decision:

- Do not build a new product option system.
- Next product-order work should expose existing product option groups to the storefront contract.
- If option records are missing for a product, product should remain quote/enquiry mode.

### Pricing matrix / pricing metadata

Status: **partially exists**

Evidence:

- Product route summarises `pricingSource`, `csvImport`, and `pricingMatrix` metadata.
- Product list summary exposes `pricingMatrixRowCount` and pricing matrix currency/type without returning full rows.
- Product DB query includes `priceFromMinor` and `currency`.

Launch decision:

- Reuse existing pricing metadata and price-from fields.
- Do not expose full internal pricing rows to uploaded themes until explicitly filtered.
- For 7-day launch, use price-from/quote mode first, then add reliable payment product-by-product.

### Materials, finishes, option sets, shipping methods, artwork profiles

Status: **resource types exist**

Evidence:

- `src/core/catalog/catalog-store.ts` lists CatalogResource values:
  - products
  - categories
  - collections
  - tags
  - materials
  - finishes
  - option-sets
  - product-option-groups
  - printer-profiles
  - shipping-methods
  - artwork-profiles
  - production-routing-rules

Launch decision:

- Do not create new tables/systems for these until we verify actual production data usage.
- Storefront should map these existing resources where data exists.

### SEO / redirects

Status: **partially exists**

Evidence:

- `src/core/catalog/internal-catalog-http.ts` imports `saveSeoRedirect`.
- It auto-creates slug redirects for products/categories when slugs change.

Launch decision:

- Reuse existing SEO redirect logic.
- Need further audit for sitemap, robots, page SEO fields, and location/service-area SEO.

## Existing storefront/theme capability

### Native theme runtime

Status: **exists and connected**

Evidence:

- `src/theme-runtime/atlantis-renderer.tsx` routes home, collection-points, quote route, product page and category page.
- It routes `/quote/[category]/[product]` to `QuoteRequestPage`.

Launch decision:

- Continue using native storefront route for HOLO launch while uploaded theme system matures.
- Keep all runtime data public-safe.

### Quote request page

Status: **exists, newly added**

Evidence:

- `src/themes/atlantis-native/QuoteRequestPage.tsx` renders a quote form.
- It collects name, email, phone, quantity, deadline, artwork status and notes.
- It posts to `/api/native-storefront/quote-requests`.

Launch decision:

- This should be treated as the storefront quote intake MVP.
- It should be improved only by connecting to existing product options and admin visibility.

### Quote request storage endpoint

Status: **exists, newly added but needs review**

Evidence:

- `app/api/native-storefront/quote-requests/route.ts` creates `CoreCatalogRecord` records with resource `storefront-quote-requests`.
- It stores metadataJson including customer, product, store and status.

Concern:

- It writes into `platformPrisma.coreCatalogRecord` using tenantSlug as tenantId. Existing catalog writes normally use tenant context and tenant database helpers.

Launch decision:

- Before building admin quote inbox, decide whether quote requests should live in platform CoreCatalogRecord or tenant DB using existing catalog service pattern.
- Do not build a second quote system until this is decided.

## L3A Admin pattern audit findings

Status: **admin quote inbox pattern not verified yet**

What was checked:

- Direct fetch attempts for common admin page paths did not find:
  - `app/admin/page.tsx`
  - `app/dashboard/page.tsx`
  - `app/admin/catalog/products/page.tsx`
  - `app/(admin)/catalog/products/page.tsx`
- Code search attempts for generic admin table/list terms did not return reliable results via the connector.

Finding:

- Existing admin APIs for catalog resources are verified.
- Existing reusable admin UI/table/list component is **not yet verified** from available connector results.
- Therefore we should not assume an admin table pattern exists, but also should not build a large new admin system.

Launch decision:

- Next build should be minimal and reversible.
- Preferred path is to reuse the existing internal catalog CRUD/API pattern for a new resource view, not create a new quote database model.
- If no reusable admin UI is found, build the smallest possible quote inbox page that reads the same `CoreCatalogRecord` resource used by the quote endpoint.

## 7-day launch checklist matrix

| Feature | Status | Reuse existing? | Next action |
| --- | --- | --- | --- |
| Tenant/store identity | Exists | Yes | Continue using tenant context and runtime context |
| Product catalogue | Exists | Yes | Connect storefront to real products only |
| Categories | Exists | Yes | Connect storefront to real categories only |
| Product options | Partial | Yes | Expose public-safe optionGroups in storefront contract |
| Price-from/pricing metadata | Partial | Yes | Use priceFromMinor/currency/pricingMatrix summary only |
| VAT/tax labels | Unknown | Unknown | Audit metadata fields before building |
| Materials/finishes | Resource exists | Yes | Map existing resources if records exist |
| Shipping/collection methods | Resource exists | Yes | Map shipping-methods and collection-points if records exist |
| Artwork requirements | Resource exists | Yes | Map artwork-profiles into quote/order form |
| Quote intake | Partial/new | Maybe | Review storage location and connect admin visibility |
| Admin quote inbox | Not verified | Unknown | Build minimal inbox only after storage alignment decision |
| Dedicated order system | Not verified in schema | Unknown | Search/fetch before any order build |
| Cart | Not verified | Unknown | Search/fetch before any cart build |
| Checkout/payment | Not verified | Unknown | Search/fetch before any payment build |
| Customer accounts | User model exists | Partial | Audit public auth/customer flows |
| Email notifications | Not verified | Unknown | Search/fetch before building email service |
| SEO metadata | Partial | Yes | Use existing redirect logic, add sitemap/robots only if missing |

## Critical architecture decisions before next build

### Decision 1: Where should quote requests live?

Options:

1. Platform CoreCatalogRecord resource `storefront-quote-requests`
2. Tenant DB CoreCatalogRecord resource `storefront-quote-requests`
3. Future dedicated quote/order table

Current code uses option 1. Existing product/category catalog logic uses tenant DB where configured.

Recommendation for 7-day launch:

- Use the existing catalog service pattern where possible.
- If we keep quote requests in CoreCatalogRecord, create admin UI around that same resource and do not create a second quote table.

### Decision 2: Is quote request an order or enquiry?

For launch, treat it as enquiry/quote request, not paid order.

Reason:

- Dedicated Order model was not verified in checked schema.
- Product options/pricing are partial.
- Safer launch is quote-first for print jobs.

### Decision 3: What should the next build be?

Next build should **not** create a new system.

Correct next build:

1. Align quote request storage with existing catalog/tenant pattern, or document keeping platform storage for launch.
2. Then reuse that same storage for a minimal quote inbox.
3. Do not create an Order model, quote model, or new payment flow until the existing system audit proves it is missing.

## Next verified build plan

### Build L3B: Quote request storage alignment

Goal:

- Fix the biggest risk before admin inbox: quote request storage location.
- Current endpoint stores quote requests in platform CoreCatalogRecord using tenantSlug as tenantId.
- Existing catalog CRUD prefers tenant context and tenant DB where configured.

Preferred launch-safe approach:

- For quote requests, use a single resource name: `storefront-quote-requests`.
- Store and read from one place only.
- If we keep platform storage for speed, the admin inbox must read platform storage using the same tenantSlug/tenantId convention.
- If we move to tenant DB storage, update endpoint and future inbox to use existing catalog service pattern.

### Build L3C: Minimal Quote Inbox UI/API

Only after L3B.

Minimum UI:

- list new quote requests
- customer name/contact
- product/category
- quantity/deadline/artwork status
- notes
- status badge

### Build L4: Quote status update

Only after inbox exists.

Statuses:

- new
- contacted
- quoted
- converted
- closed

### Build L5: Notification

Only after quote inbox works.

Add email/notification using existing email infrastructure if found. Do not build new email system before audit.

## Conclusion

The SaaS already contains strong catalog, tenant, option, pricing metadata and SEO redirect foundations. The remaining 7-day launch work should focus on connecting quote/order flow to these foundations, not creating duplicate APIs or data models.
