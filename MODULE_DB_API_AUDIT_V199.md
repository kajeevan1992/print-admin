# Module DB/API Audit — v199

## Newly connected in v199

### Inventory Control
- Page: `/inventory`
- Storage key: `inventory-control-v54`
- Internal API:
  - `GET /api/internal/config/inventory-control-v54/items`
  - `POST /api/internal/config/inventory-control-v54`
- Status: connected to internal DB-backed configuration store.
- Browser localStorage is fallback only.

## Still intentionally pending

- Pricing engine calculation logic.
- Storefront/theme redesign.
- Full order workflow.
- Full artwork upload/preflight workflow.
- External/public API expansion for newly connected admin modules.
