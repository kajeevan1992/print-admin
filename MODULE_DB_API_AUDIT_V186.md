# V186 Module DB/API Audit

Purpose: make the next phase controlled by showing which admin modules are connected to tenant database/internal API, which still use local/fallback state, and which should wait.

## Connected and tested
- Products: internal API + tenant DB CRUD
- Categories: internal API + tenant DB CRUD
- Product option groups: saved in product metadata/CoreCatalogRecord
- Product template/rules metadata: saved through product metadata/CoreCatalogRecord
- Database status badge: connected/issue feedback

## Connected in this build
- Materials Library: `/api/internal/catalog/materials`
- Finish Library: `/api/internal/catalog/finishes`
- Option Sets: `/api/internal/catalog/option-sets`

These now use the existing generic catalog record table through internal core services:
`CoreCatalogRecord(resource, slug, name, description, metadataJson)`.

## Internal APIs already present
- `/api/internal/catalog/products`
- `/api/internal/catalog/products/:id`
- `/api/internal/catalog/categories`
- `/api/internal/catalog/categories/:id`
- `/api/internal/catalog/materials`
- `/api/internal/catalog/finishes`
- `/api/internal/catalog/option-sets`
- `/api/internal/catalog/collections`
- `/api/internal/catalog/tags`
- `/api/internal/catalog/collections`
- `/api/internal/platform/module-audit`

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
