# v143 live tenant/product data path

This build introduces the first usable database-backed seed/read workflow.

## New routes
- `POST /api/dev/seed`
- `GET /api/tenant/:slug`
- existing product routes now work against seeded DB rows

## Suggested first-use flow
1. Set `DATABASE_URL`
2. Deploy
3. Call `POST /api/dev/seed`
4. Call:
   - `GET /api/tenant/demo`
   - `GET /api/products?tenantId=<tenantId>`
   - `GET /api/products/standard-business-cards?tenantId=<tenantId>`

## Why this matters
This is the first step from placeholder backend into real data-backed API usage.
Your custom frontend can start integrating against this after the DB is available.
