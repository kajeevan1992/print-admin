# Super Admin DB/API Audit

Purpose: verify every owner/super-admin page is backed by real internal DB/API services before launch.

Architecture rule:
- Super Admin and Admin must use internal services only.
- Do not use `/api/proxy/*`.
- Do not use `/api/v1/*` for hosted platform/admin flows.
- Config-style records are acceptable only for prototype state, not launch-critical operational data.

## Confirmed DB/internal backing

### Tenants
Status: connected.
Expected internal backing:
- tenant database models
- tenant CRUD/internal routes
- domain metadata where applicable

### Deployments
Status: connected.
Expected backing:
- `PlatformDeployment`
- internal deployment routes/services

### Demo uploads
Status: connected.
Expected backing:
- `PlatformDemoUpload`
- internal demo upload routes/services

### Orders
Status: upgraded.
Backing:
- `Order`
- `OrderItem`
- `OrderStatusHistory`
- `/api/internal/orders`
- `/api/internal/storefront/orders`

### Quotes
Status: upgraded.
Backing:
- internal quotes service/API added
- `/api/internal/quotes`

### Artwork proofs
Status: upgraded.
Backing:
- `Artwork`
- `ArtworkVersion`
- `/api/internal/artwork-proofs`

### Production jobs
Status: upgraded.
Backing:
- internal production jobs service/API added
- `/api/internal/production-jobs`

### Customers
Status: upgraded.
Backing:
- `User` with `CUSTOMER` role
- `/api/internal/customers`

### Inventory and purchasing
Status: table foundation added.
Backing:
- `InventoryItem`
- `StockMovement`
- `StockReservation`
- `PurchaseOrder`
- `PurchaseOrderLine`
- `ConsumptionPlan`
- `/api/internal/inventory`

### Notifications
Status: delivery layer added.
Backing:
- communication logs/queue states should feed into delivery service
- `/api/internal/notifications/deliver`
- `/api/internal/notifications/worker`

## Owner/Super Admin pages needing one-by-one verification

### Owner API Keys
Check:
- list/create/revoke keys use DB/internal services
- no duplicate key modules
- public API key usage is restricted to `/api/v1/*`
- hosted admin flows do not require API keys

### Owner Feature Flags
Check:
- flags are DB-backed by tenant/platform scope
- flag reads are cached safely
- no browser-only/local config persistence for launch flags

### Database Manager
Check:
- connection list/test/update uses DB/internal services
- password handling is encrypted or protected
- SSL mode and certificate handling are clear
- no UI-only fake status

### Backups UI
Check:
- backup records are DB-backed
- backup execution/status logs are persisted
- download/restore flows are guarded
- no placeholder-only backup state remains

### Billing and Plans
Check:
- plans, subscriptions, invoices and payments use platform billing tables
- manual/provider state transitions are persisted
- tenant limits are enforced from plan data

### Domain Manager
Check:
- domains use `Domain` model
- verification and SSL status are persisted
- primary domain switching updates tenant state safely

### Theme Manager / Hosted Themes
Check:
- theme records are DB-backed
- uploaded theme packages are versioned
- active theme assignment is tenant scoped
- hosted themes use internal storefront services, not `/api/v1`

### Storefront Settings
Check:
- branding/settings are tenant scoped
- launch-critical settings are not stored only as config records
- published vs draft state is explicit

### Supplier Integrations
Check:
- supplier credentials are encrypted/protected
- sync jobs and product clone state are persisted
- supplier pricing/material option rules are DB-backed

### Audit Logs
Check:
- admin actions create immutable audit records
- actor, tenant, action, target and timestamp are stored
- sensitive data is redacted

### QA / Readiness Dashboard
Check:
- readiness checks call real internal endpoints
- stale placeholder metrics are removed
- errors expose actionable source details

## Next audit process

For each Super Admin nav page:
1. Identify page/component file.
2. Identify internal route/service it calls.
3. Confirm persistence model/table.
4. Remove `/api/proxy/*` usage.
5. Remove localStorage or config-only launch data.
6. Add missing internal service/API where needed.
7. Record status in this document.

## Current priority order

1. Owner API Keys
2. Feature Flags
3. Database Manager
4. Backups
5. Billing/Plans
6. Domain Manager
7. Theme Manager
8. Supplier Integrations
9. Audit Logs
10. QA/Readiness Dashboard
