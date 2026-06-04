# Build 46

Holo Print real launch catalogue.

Changed:
- catalog product type mapping
- Holo Print launch catalogue data
- Holo Print launch catalogue seed route

Files:
- `src/core/catalog/internal-catalog.service.ts`
- `src/data/holo-print-launch-catalogue.ts`
- `app/api/internal/catalog/holo-print-launch/seed/route.ts`

Launch categories:
- Print Products
- Large Format & Signage
- Stickers & Labels
- Design Services

Launch products:
- Business Cards
- Flyers & Leaflets
- Posters
- PVC Banners
- Stickers & Labels
- Booklets
- Shop Boards & Signage
- Design Service / Artwork Help

Each product includes:
- VAT/tax settings
- fixed price or quote/payment mode
- artwork rules
- option groups
- launch metadata

Important fix:
The catalog writer now maps storefront product types such as `standard`, `online`, and `quote` to the Prisma enum values used by the database.

Seed endpoint:
- `GET /api/internal/catalog/holo-print-launch/seed` previews the catalogue.
- `POST /api/internal/catalog/holo-print-launch/seed` seeds the catalogue into the tenant database.

Not changed:
- No checkout flow redesign.
- No public API changes.
- No payment rule changes.
- No VAT engine rewrite.
