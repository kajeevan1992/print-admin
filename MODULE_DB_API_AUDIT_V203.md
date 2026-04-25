# Module DB/API Audit — v203

## Newly connected in v203

### Productivity workspaces

Pages:
- `/notifications`
- `/saved-views`
- `/command-center`

Internal APIs:
- `/api/internal/config/productivity-notifications/items`
- `/api/internal/config/productivity-saved-views/items`
- `/api/internal/config/productivity-command-center/items`

Storage:
- tenant DB via the existing internal config item API.
- browser storage is fallback only when the internal API/DB is unavailable.

## Still intentionally not started

- Pricing engine calculations
- Orders workflow rewrite
- Storefront redesign
- Artwork upload/preflight workflow rewrite
- Sidebar/nav changes

## Smoke test

1. Open `/notifications`, add a notification, refresh, confirm it remains.
2. Open `/saved-views`, add a view, refresh, confirm it remains.
3. Open `/command-center`, add a task, refresh, confirm it remains.
4. Open each internal API route and confirm saved rows are returned.
