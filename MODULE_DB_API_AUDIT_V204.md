# Module DB/API Audit — v204

v204 adds the central system health diagnostics endpoint:

```txt
GET /api/internal/platform/system-health
```

It reports runtime/environment readiness for the DB/API wiring phase and is intentionally lightweight.

Connected in this build:
- System health diagnostics endpoint
- Module audit updated to include diagnostics

Not touched:
- Pricing engine
- Orders workflow
- Storefront/theme rendering
- Artwork production workflow
