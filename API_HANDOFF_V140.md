# v140 API contract + route foundation handoff

This build adds the first backend-facing route skeletons and shared helpers.

## Routes added
- `POST /api/auth/login`
- `GET /api/tenant/resolve?hostname=...`
- `GET /api/products?tenantId=...`
- `GET /api/products/:slug?tenantId=...`
- `POST /api/orders`
- `GET /api/orders/:orderNumber`
- `POST /api/artwork`
- `GET /api/admin/orders?tenantId=...`
- `GET /api/superadmin/tenants`

## Important rule
Any custom frontend, uploaded theme, or separately developed storefront should call these routes only.
Do not connect the frontend directly to Prisma or the database.

## Best next move for your custom frontend
After you share the frontend ZIP, I can:
1. map its pages/components to these routes
2. add API client helpers
3. replace static demo data with live API calls
4. keep it tenant-aware using `/api/tenant/resolve`

## Recommended frontend boot flow
1. Read hostname
2. Call `/api/tenant/resolve`
3. Load theme + tenant config
4. Fetch products and storefront data
5. Use `POST /api/orders` and `POST /api/artwork` for checkout/upload flows
