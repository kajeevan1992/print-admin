# v139 database schema foundation handoff

This build starts the backend phase with a tenant-aware Prisma schema.

## What was added
- `prisma/schema.prisma`
- `src/lib/prisma.ts`
- `src/types/api-contracts.ts`

## Core backend order
1. Auth
2. Tenant/domain resolution
3. Products
4. Orders
5. Artwork
6. Admin + superadmin controls

## How to use your custom frontend
If you have a separately designed frontend theme or ZIP, there are two good paths:

### Path A — you provide the frontend ZIP here
I can adapt it to your API shape after v140, which is the safest route.

### Path B — you ask another ChatGPT/session to wire the frontend
Use the API contracts and route plan from v140 as the source of truth, then have it connect:
- auth
- tenant lookup by hostname
- products
- cart/checkout
- orders
- artwork uploads

## Recommended API pattern
- `GET /api/tenant/resolve?hostname=...`
- `POST /api/auth/login`
- `GET /api/products`
- `GET /api/products/:slug`
- `POST /api/orders`
- `GET /api/orders/:orderNumber`
- `POST /api/artwork`
- `GET /api/admin/orders`
- `GET /api/superadmin/tenants`

## Frontend integration rule
Whether it is your current app frontend or a custom uploaded theme, the frontend should never query the database directly.
It should only use the API layer.

That means your custom frontend can still work perfectly, as long as it is wired to the same API contracts.
