# Build 40 — Super Admin Page Wiring to Persistence Services

## Goal
Wire the actual Super Admin page persistence layer to the Build 39 OwnerControlRecord resources without redesigning pages or creating a second storage system.

## What was found
The batch-2 Super Admin pages already exist through route wrappers and module pages. Example:

- `app/owner-billing-plans/page.tsx`
- `src/modules/super-admin/pages/owner-billing-plans-page.tsx`

Those pages use thin page services such as:

- `src/services/owner-billing-plans.service.ts`
- `src/services/owner-backups.service.ts`
- `src/services/owner-domains.service.ts`
- `src/services/owner-incidents.service.ts`
- `src/services/owner-maintenance-windows.service.ts`
- `src/services/owner-usage-limits.service.ts`
- `src/services/owner-sso-config.service.ts`
- `src/services/owner-compliance-center.service.ts`

Most of these already route through `createOwnerDbBackedService(...)`.

## Changed files

### `src/services/owner-records-db.service.ts`
Improved the shared persistence adapter used by the actual Super Admin pages.

Changes:

- Added canonical resource aliasing:
  - `owner-sso-config` -> `owner-sso-configs`
  - `owner-compliance-center` -> `owner-compliance-controls`
- Keeps the old service file names working while saving to the Build 39 canonical resource names.
- Adds better title extraction for records such as domains and SSO provider records.
- Adds tenant extraction from either `tenantId` or `tenant`.
- Deletes records using `resource + recordId`, matching the hardened API from Build 39.
- Preserves existing service API shape: `list`, `save`, `delete`, `reset`.

### `app/api/internal/platform/owner-control-records/route.ts`
Added legacy alias compatibility to the internal OwnerControlRecord API.

Changes:

- Accepts legacy aliases for reading/deleting:
  - `owner-sso-config`
  - `owner-compliance-center`
- Canonicalises new writes to:
  - `owner-sso-configs`
  - `owner-compliance-controls`
- When reading a canonical resource, it also reads legacy rows so older saved records do not disappear.
- When deleting by `resource + recordId`, it deletes both canonical and legacy matching records.

## Pages now covered by the shared persistence layer

- Owner Billing Plans
- Owner Backups
- Owner Domains
- Owner Incidents
- Owner Maintenance Windows
- Owner Usage Limits
- Owner SSO Config
- Owner Compliance Center

## What was intentionally not changed

- No UI redesign.
- No duplicate persistence table.
- No admin catalog changes.
- No product/pricing/VAT changes.
- No public `/api/v1` changes.
- No new page routes were created.

## Why this matters
Build 39 added stricter canonical resource validation. Build 40 makes the actual existing Super Admin page services compatible with that validation, especially where old service names produced older resource names. This means the real pages can continue using their current services while data saves under the consistent OwnerControlRecord resource model.

## Suggested manual QA

1. Log in as Super Admin.
2. Open Owner Billing Plans.
3. Create or edit a plan.
4. Refresh and confirm it persists.
5. Repeat for:
   - Owner Backups
   - Owner Domains
   - Owner Incidents
   - Owner Maintenance Windows
   - Owner Usage Limits
   - Owner SSO Config
   - Owner Compliance Center
6. On SSO and Compliance pages, confirm old records still show if any were saved before Build 40.
