# Unified Core Architecture

This build starts the move to one SaaS core.

## Internal flow

Admin, Super Admin and built-in storefront should use:

```txt
UI -> internal server services -> tenant database
```

## External flow

Headless storefronts, accounting software, MIS, shipping and other third parties should use:

```txt
External system -> public API v1/v2 -> internal services -> tenant database
```

## Database rule

- Platform DB is configured by deployment environment variables.
- Tenant/site DB connections are managed from Super Admin.
- Tenant/site DB passwords must be encrypted before storage.
- Admin and Super Admin should never use the public API as their normal internal data path.

## Next pass

The next unified core pass should add persistent encrypted tenant DB storage and a migration/setup runner.
