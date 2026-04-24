# Auth/RBAC foundation

This is the security direction for the unified SaaS core.

## Internal app routes

Admin and Super Admin pages should be protected by authentication and role checks.

Required roles:

- Owner / Super Admin:
  - tenant control
  - database manager
  - owner API keys
  - owner feature flags
  - system settings
  - platform backups

- Tenant Admin:
  - catalog
  - orders
  - artwork
  - pricing
  - storefront settings

## Public API

Public API routes must require API credentials:

- `x-api-key`
- `x-api-secret`

Later this should support:

- scoped credentials
- rate limits
- per-tenant/site permissions
- audit logging
- key rotation
