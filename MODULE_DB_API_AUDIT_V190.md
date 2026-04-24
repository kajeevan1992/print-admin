# V190 Module DB/API Audit

Purpose: continue controlled DB/API connection without redesigning modules or starting pricing/orders/storefront work.

## Connected before v190
- Products and Categories tenant DB CRUD
- Product option groups/template metadata on Product records
- Materials, Finishes, Option Sets
- Collections, Tags
- Printer Profiles, Shipping Methods
- Artwork Profiles, Production Routing Rules

## Connected in v190
- Generic admin configuration workspaces that use `ConfigWorkspacePage` now save through internal API + tenant DB.
- New internal API:
  - `GET /api/internal/config/:key`
  - `POST /api/internal/config/:key`
  - `DELETE /api/internal/config/:key`
- Records are stored in tenant DB `CoreCatalogRecord` using resource `admin-config`.
- Existing browser localStorage remains only as a visible fallback if DB/API is unavailable.

## Pages improved by this foundation
Any existing page built with `ConfigWorkspacePage`, including examples:
- Checkout Fields
- Tax / VAT Settings
- General/Settings-derived config pages
- Other operational config screens using the same shared component

## Still later
- Pricing engine logic
- Orders/admin order workflow DB wiring
- Customer/account modules
- Theme/content modules
- Public `/api/v1` expansion after internal modules are stable
