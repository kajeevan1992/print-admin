# V188 Module DB/API Audit

Purpose: continue the controlled DB/API connection phase without redesigning modules or expanding pricing/orders.

## Connected before this build
- Products: `/api/internal/catalog/products` + tenant DB CRUD
- Categories: `/api/internal/catalog/categories` + tenant DB CRUD
- Product option groups/template metadata: product metadata/CoreCatalogRecord
- Materials Library: `/api/internal/catalog/materials`
- Finish Library: `/api/internal/catalog/finishes`
- Option Sets: `/api/internal/catalog/option-sets`
- Collections: `/api/internal/catalog/collections`
- Tags: `/api/internal/catalog/tags`

## Connected in v188
- Printer Management: `/api/internal/catalog/printer-profiles`
  - create/update/delete syncs to internal API
  - status/risk/technology/plant/operator/service/model notes saved in `metadataJson`
  - duplicate/status changes persist in tenant DB
- Shipping Methods: `/api/internal/catalog/shipping-methods`
  - create/update/delete syncs to internal API
  - pause/activate persists in tenant DB
  - carrier/service/cutoff/transit/surcharge/eligible plants saved in `metadataJson`

## Internal API status
- `/api/internal/catalog/printer-profiles` connected in v188
- `/api/internal/catalog/shipping-methods` connected in v188
- `/api/internal/platform/module-audit` updated to v188

## Still mostly local/demo and should be wired in later builds
- Artwork profiles / artwork workflow
- Production planner / routing boards
- Turnaround rules
- Quantity bands / quantity tables
- Checkout fields
- Orders/admin order control
- Customer account modules
- Theme/content modules
- Owner platform modules except already-existing API key/feature flag foundations

## Rule going forward
Admin UI must use:

Admin UI -> internal API -> service layer -> tenant/platform database

Public `/api/v1/*` should only expose stable internal modules after the internal DB path is proven.
