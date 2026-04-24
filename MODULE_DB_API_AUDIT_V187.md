# V187 Module DB/API Audit

Purpose: continue the controlled DB/API connection phase without redesigning modules or expanding pricing/orders.

## Connected before this build
- Products: `/api/internal/catalog/products` + tenant DB CRUD
- Categories: `/api/internal/catalog/categories` + tenant DB CRUD
- Product option groups/template metadata: product metadata/CoreCatalogRecord
- Materials Library: `/api/internal/catalog/materials`
- Finish Library: `/api/internal/catalog/finishes`
- Option Sets: `/api/internal/catalog/option-sets`
- Database status/diagnostic messages on connected pages

## Connected in v187
- Collections: `/api/internal/catalog/collections`
  - create/update/delete syncs to internal API
  - selected product/category ids are saved in `metadataJson`
  - collection page now shows DB/API status
  - collection product/category choices are loaded from current database products/categories
- Tags: `/api/internal/catalog/tags`
  - create/update/delete syncs to internal API
  - published/sidebar toggles persist to internal API
  - hierarchy/friendly URL/display flags saved in `metadataJson`
  - tags page now shows DB/API status

## Internal API status
- `/api/internal/catalog/products` connected
- `/api/internal/catalog/products/:id` connected
- `/api/internal/catalog/categories` connected
- `/api/internal/catalog/categories/:id` connected
- `/api/internal/catalog/materials` connected
- `/api/internal/catalog/finishes` connected
- `/api/internal/catalog/option-sets` connected
- `/api/internal/catalog/collections` connected in v187
- `/api/internal/catalog/tags` connected in v187
- `/api/internal/platform/module-audit` updated to v187

## Still mostly local/demo and should be wired in later builds
- Artwork profiles / artwork workflow
- Printers / machines / production planner
- Turnaround rules
- Quantity bands / quantity tables
- Checkout fields
- Shipping methods
- Orders/admin order control
- Customer account modules
- Theme/content modules
- Owner platform modules except already-existing API key/feature flag foundations

## Rule going forward
Admin UI must use:

Admin UI -> internal API -> service layer -> tenant/platform database

Public `/api/v1/*` should only expose stable internal modules after the internal DB path is proven.
