# v150 Atlantis artwork linked to submitted orders

## What changed
- Added `/api/proxy/artwork` local proxy route
- Added Atlantis artwork upload page at `/theme/atlantis/artwork-upload`
- Added artwork success page at `/theme/atlantis/artwork-upload/success`
- Checkout success page now routes users into artwork upload
- Artwork payloads include the latest submitted order reference

## What to test
- submit an order
- open artwork upload from success page
- submit artwork metadata
- confirm redirect to artwork success page
