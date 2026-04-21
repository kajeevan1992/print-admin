# v149 Atlantis checkout order submit

## What changed
- Added `/api/proxy/orders` local proxy route
- Atlantis checkout now submits order payloads through the local proxy to the external API
- Added checkout success page at `/theme/atlantis/checkout/success`
- Stores last submitted order summary in localStorage for confirmation rendering

## What to test
- add products to cart
- go to checkout
- submit order
- confirm redirect to success page
- inspect `/api/proxy/orders` response if the external API rejects the payload
