# v177 Unified Core Catalog

This build starts moving catalog admin usage away from legacy `/api/proxy/*` routes.

## Internal app routes

Admin/Super Admin/Built-in storefront should use:

```txt
/api/internal/catalog/products
/api/internal/catalog/categories
/api/internal/catalog/collections
/api/internal/catalog/tags
/api/internal/catalog/materials
/api/internal/catalog/finishes
/api/internal/catalog/option-sets
```

These routes call the internal catalog service.

## Public external API

External clients should use credential-protected public API routes:

```txt
/api/v1/catalog/products
/api/v1/catalog/categories
/api/v1/catalog/collections
/api/v1/catalog/tags
/api/v1/catalog/materials
/api/v1/catalog/finishes
/api/v1/catalog/option-sets
```

These require `x-api-key` and `x-api-secret`.

## Current phase

Current catalog service uses internal demo/fallback data while tenant DB query routing is enabled in later passes.

Next step:
- resolve tenant/site database connection
- query tenant database from internal catalog service
- remove remaining client-side catalog proxy assumptions
