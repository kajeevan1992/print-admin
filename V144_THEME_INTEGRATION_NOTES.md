# v144 Atlantis theme API integration

## Route
- `/theme/atlantis`

## What was integrated
- Uploaded Atlantis storefront theme embedded into the Next.js app
- Tenant-aware boot flow:
  1. tries `/api/tenant/resolve?hostname=...`
  2. falls back to `/api/tenant/demo`
- Live featured products use `/api/products?tenantId=...` when available
- Business cards / flyers / posters product pages can use live seeded product data
- Theme assets copied to `/public/atlantis-images`

## Suggested live test order
1. Set `DATABASE_URL`
2. Deploy
3. Run `POST /api/dev/seed`
4. Open `/theme/atlantis`
5. Confirm banner says live data connected
6. Browse:
   - `/theme/atlantis/standard-business-cards`
   - `/theme/atlantis/flyers`
   - `/theme/atlantis/posters-large-format-prints`
