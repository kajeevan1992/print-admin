# Build 47

Artwork upload and order/payment linking.

Changed files:
- `src/core/storefront/artwork-order-linking.ts`
- `app/api/internal/storefront/checkout/route.ts`
- `app/api/internal/storefront/quote/request/route.ts`

Summary:
- Added a shared backend helper to collect artwork upload IDs from checkout payloads, quote payloads, artwork references, upload objects and line-item metadata.
- Normal hosted checkout now links uploaded artwork to the saved order immediately after order creation.
- Quote checkout now links uploaded artwork to the saved quote/order immediately after the real `AWAITING_APPROVAL` order is created.
- Saved order notes now include the artwork upload IDs and internal notes show what was linked.
- The API response now includes an `artworkLink` result so frontend/admin QA can confirm linking happened.

Why this matters:
- Artwork uploaded before checkout is no longer dependent only on a frontend after-submit attach call.
- Pay-now orders keep artwork attached before Stripe redirect.
- Quote-first orders keep artwork attached while waiting for approval/payment link.
- Customer account/admin order APIs can match uploads by order ID, order number or stored artwork IDs.

Not changed:
- No redesign.
- No payment rule changes.
- No VAT changes.
- No public API changes.

Note:
- The existing hosted theme single-upload attach flow remains in place as an extra fallback.
