# Unified Core Next Steps

## Completed in v172

- Added Platform DB Prisma model for tenant/site database connections where Prisma schema exists.
- Database Manager now prefers Platform DB persistence.
- File fallback remains for safe deployment.
- Added `/api/internal/platform/status`.

## Next build target

Move Catalog pages off external public/proxy API and onto internal server services.

Target flow:

```txt
Admin catalog pages -> internal core catalog service -> tenant database
```

Public API remains only for external systems:

```txt
External app -> /api/v1/catalog -> internal core catalog service -> tenant database
```
