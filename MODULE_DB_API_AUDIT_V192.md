# V192 Module DB/API Audit

Purpose: continue connecting existing admin modules to tenant DB/internal API in safe chunks.

## Connected before v192
- Products and Categories tenant DB CRUD
- Product option groups/template metadata on Product records
- Materials, Finishes, Option Sets
- Collections, Tags
- Printer Profiles, Shipping Methods
- Artwork Profiles, Production Routing Rules
- ConfigWorkspacePage-based configuration screens through `/api/internal/config/:key`
- SimpleListPage-based screens through `/api/internal/config/:key`

## Connected in v192
LocalRecordsPage now has a DB-backed generic internal item API.

New route:
- `/api/internal/config/:key/items`

Supported operations:
- `GET` list items
- `POST` create/upsert item
- `PATCH` update/upsert item
- `DELETE ?id=` remove item

This connects many existing workspace/list modules that previously stayed browser-local unless a custom endpoint was provided.

Examples:
- Attribute Sets
- Config Templates
- Email Notifications
- Error Log
- FTP Accounts
- Landing Pages
- Order Statuses
- Parametric Libraries
- Parametric Products
- Parametric Rules Engine
- Product Content
- Product Rules Lab
- Tag Content
- Productivity Command Center / Notifications / Saved Views

## Storage model
- Uses tenant DB `CoreCatalogRecord` resource `admin-config`.
- Each page storage key becomes the config record id/slug.
- Items are stored under `metadataJson.items`.
- Browser localStorage remains fallback only if DB/API is unavailable.

## Still later
- Runtime behaviour for these records, such as:
  - email notification sending
  - redirect middleware
  - parametric pricing execution
  - content publishing/rendering
  - FTP account provisioning
  - real workflow/job execution
- Public `/api/v1` expansion after internal modules are stable.
