# V189 Module DB/API Audit

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
- Printer Management: `/api/internal/catalog/printer-profiles`
- Shipping Methods: `/api/internal/catalog/shipping-methods`

## Connected in v189
- Artwork Preflight Studio: `/api/internal/catalog/artwork-profiles`
  - create/update/delete syncs to internal API
  - risk/audience/checklist/proof mode data is stored in `metadataJson`
  - this is profile/config data only; upload/preflight processing is still later
- Production Routing Lab: `/api/internal/catalog/production-routing-rules`
  - create/update/delete syncs to internal API
  - family/stock/primary route/fallback/state saved in `metadataJson`
  - this prepares production constraints for later pricing/routing logic

## Internal API status
- `/api/internal/catalog/artwork-profiles` added in v189
- `/api/internal/catalog/production-routing-rules` added in v189
- `/api/internal/platform/module-audit` updated to v189

## Still mostly local/demo and should be wired later
- Full artwork upload/preflight/proofing workflow
- Production planner board / dispatch center
- Quantity bands / quantity tables
- Turnaround rules
- Checkout fields
- Orders/admin order control
- Customer account modules
- Theme/content modules
- Owner platform modules except already-existing API key/feature flag foundations

## Rule going forward
Admin UI must use:

Admin UI -> internal API -> service layer -> tenant/platform database

Public `/api/v1/*` should only expose stable internal modules after the internal DB path is proven.
