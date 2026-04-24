# v148 Atlantis cart foundation

## What changed
- Added persistent Atlantis cart using localStorage
- Added quantity update controls in cart
- Added computed cart subtotal
- Product pages now add richer line items into cart
- Added checkout foundation route at `/theme/atlantis/checkout`
- Cart now routes toward checkout instead of bespoke quote

## What to test
- add products from Atlantis product pages
- refresh and confirm cart persists
- update quantity in cart
- open `/theme/atlantis/checkout`
