# v167 endpoint planning snapshot

## Catalog group
- GET /products
- GET /products/:id
- POST /products
- PATCH /products/:id
- GET /categories
- POST /categories
- PATCH /categories/:id
- GET /collections
- POST /collections
- PATCH /collections/:id
- GET /tags
- POST /tags
- PATCH /tags/:id
- GET /materials
- POST /materials
- PATCH /materials/:id
- GET /finishes
- POST /finishes
- PATCH /finishes/:id
- GET /option-sets
- POST /option-sets
- PATCH /option-sets/:id

## Orders / artwork
- GET /orders
- GET /orders/:id
- PATCH /orders/:id/status
- POST /orders
- GET /artwork
- GET /artwork/:id
- POST /artwork
- PATCH /artwork/:id/status

## Next target
Implement remaining write endpoints in bundled groups instead of page-by-page.
