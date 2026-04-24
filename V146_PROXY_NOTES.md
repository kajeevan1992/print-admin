# v146 external API proxy compatibility fix

## What changed
- Added same-origin proxy routes:
  - `/api/proxy/health`
  - `/api/proxy/products`
- Proxy routes call the external Express API server internally
- Normalized old Express API product payloads into the Atlantis theme shape
- Atlantis storefront now calls local proxy routes instead of cross-origin browser fetches

## Why
The external API was healthy, but the browser-facing theme still could not use it reliably due to cross-origin/runtime compatibility issues.

## Result
The storefront theme now uses:
- browser -> same-origin Next proxy
- proxy -> external API
