# v173 unified security + route cleanup

## Removed/disabled legacy proxy exposure

Disabled `21` legacy `/api/proxy/*` route handlers.

These routes now return `410 LEGACY_PROXY_DISABLED`.

Reason:
- Admin/Super Admin/Built-in storefront should use internal core services.
- Public API should be versioned and credential-protected.

## Public API authentication foundation

Added:
- `src/core/api/api-credentials.ts`
- `src/core/api/public-api-auth.ts`
- `/api/v1/status` requiring:
  - `x-api-key`
  - `x-api-secret`

Existing Owner API Keys should be reused as the future UI surface for creating/managing credentials.
No duplicate Owner API Keys module was created.

## Database Manager route

Added canonical route:

```txt
/database-manager
```

Kept legacy redirect:

```txt
/super-admin/database-manager -> /database-manager
```

## Existing owner modules

Do not duplicate:
- Owner API Keys
- Owner Feature Flags

Use them as the UI surface for:
- public API key management
- rollout/feature control

## Next build

Move catalog admin pages from legacy proxy calls to internal core services.
