# V191 Module DB/API Audit

Purpose: continue the safe DB/API connection phase by wiring shared simple list modules to the existing internal config API.

## Connected before v191
- Products and Categories tenant DB CRUD
- Product option groups/template metadata on Product records
- Materials, Finishes, Option Sets
- Collections, Tags
- Printer Profiles, Shipping Methods
- Artwork Profiles, Production Routing Rules
- ConfigWorkspacePage-based configuration screens through `/api/internal/config/:key`

## Connected in v191
Shared `SimpleListPage` now supports internal API + tenant DB persistence.

Newly connected pages:
- Changelog
- Clean Up Manager
- Country List
- Pricing Rules (record storage only; no pricing engine calculation yet)
- Promotion Codes (record storage only; no discount engine yet)
- Redirects (record storage only; no runtime redirect middleware yet)
- Site Bindings (record storage only; no domain routing enforcement yet)
- Store Clone (record storage only; no clone execution job yet)

## Storage model
- Uses existing internal config route:
  - `GET /api/internal/config/:key`
  - `POST /api/internal/config/:key`
  - `DELETE /api/internal/config/:key`
- Stores records in tenant DB `CoreCatalogRecord` resource `admin-config`.
- Simple list records are stored under `metadataJson.items`.
- Browser localStorage remains only as a fallback when DB/API fails.

## Still later
- Real pricing engine execution.
- Promotion/discount application engine.
- Runtime redirect middleware.
- Store clone execution workflow.
- Customer/order/account DB wiring.
- External `/api/v1` expansion after internal modules are stable.
