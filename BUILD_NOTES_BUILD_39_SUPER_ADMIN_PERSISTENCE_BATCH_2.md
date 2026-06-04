# Build 39 — Super Admin Persistence Migration Batch 2

## Goal
Extend the existing OwnerControlRecord persistence system so the next Super Admin sections can save to the database instead of temporary UI/local state.

## What changed

### `src/services/owner-control-records.service.ts`
Extended the existing reusable service. It now supports these batch-2 Super Admin resources:

- `owner-billing-plans`
- `owner-compliance-controls`
- `owner-usage-limits`
- `owner-backups`
- `owner-sso-configs`
- `owner-domains`
- `owner-incidents`
- `owner-maintenance-windows`

Also added helper functions:

- `listOwnerControlRecords(resource)`
- `listOwnerControlRecordGroup(resources)`
- `saveOwnerControlRecord(resource, record)`
- `deleteOwnerControlRecord(resource, id)`

The existing `createOwnerControlRecordsService(resource)` API remains supported.

### `app/api/internal/platform/owner-control-records/route.ts`
Hardened the internal OwnerControlRecord API:

- Validates supported owner resource names.
- Supports `resource=...` single-resource filtering.
- Supports `resources=a,b,c` grouped listing.
- Supports optional `tenantId` and `status` filters.
- Supports safer delete by either:
  - `id`, or
  - `resource + recordId`
- Keeps using the existing Prisma `OwnerControlRecord` table.

### `src/services/super-admin-persistence.service.ts`
Added a convenience service module for Super Admin pages:

- `ownerBillingPlans`
- `ownerComplianceControls`
- `ownerUsageLimits`
- `ownerBackups`
- `ownerSsoConfigs`
- `ownerDomains`
- `ownerIncidents`
- `ownerMaintenanceWindows`
- `listSuperAdminBatch2Records()`

This prevents each page from writing its own fetch logic.

## What was intentionally not changed

- No admin catalog changes.
- No product/pricing/VAT changes.
- No public `/api/v1` changes.
- No duplicate database table was created.
- No duplicate Super Admin persistence system was created.
- No UI redesign.

## Next implementation step
The next build should wire actual Super Admin pages to these services, one group at a time:

1. Billing Plans
2. Backups
3. Domains
4. Incidents
5. Maintenance Windows
6. Usage Limits
7. Compliance Controls
8. SSO Configs

If a page currently stores records in component state or localStorage, replace only that storage layer with the relevant service export. Preserve the UI and page layout.
