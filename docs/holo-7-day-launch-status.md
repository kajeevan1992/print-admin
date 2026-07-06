# HOLO Print Native Storefront — 7 Day Launch Status

Last updated: 2026-07-06

## Current launch focus

Yes — the build is still focused on the 7 day launch. The current target is no longer quote-only. The HOLO launch target is:

- Real SaaS admin product data entered by the store owner.
- Online-order products where customers can configure product options.
- Artwork upload or artwork attachment/instruction flow.
- Stripe card payment.
- Internal order creation inside the existing SaaS admin.
- VAT disabled for HOLO because HOLO is not VAT registered yet.

## Current progress estimate

Overall launch readiness: about 65% for a controlled HOLO soft launch.

This is not 65% of the full long-term SaaS. It is the readiness of a first public HOLO storefront using existing SaaS admin systems.

## Code scan findings

### Product data

Product data will be entered through the SaaS admin. This is not a code blocker.

### Stripe / payments

Stripe is already present in the codebase.

- `stripe` package is installed.
- Internal orders support Stripe fields:
  - `stripeCheckoutSessionId`
  - `stripePaymentIntentId`
  - payment provider/reference/status fields.
- Internal order payment API supports `create-payment-link`.
- Stripe service can create Checkout Sessions.
- Stripe service can apply Checkout Session payment results to orders.
- Stripe refund service exists.

Launch bridge still needed:

- Native storefront cart/order page must create an internal order.
- Native storefront must request/create a Stripe Checkout Session for that order.
- Native storefront needs payment success/cancel return screens.
- Stripe webhook route still needs to be confirmed or added if not present.

### Artwork

Artwork support exists in the order system, but storefront upload connection still needs confirming/building.

Found:

- Internal order save flow can extract artwork upload IDs.
- Orders store `artworkUploadIds` in order notes metadata.
- Catalogue has `artwork-profiles` for artwork/preflight rules.
- Order save flow supports `artworkPreflight` metadata.

Still needed:

- Confirm exact admin artwork upload route/module name.
- Connect native storefront order flow to artwork upload ID or artwork instructions.
- Decide whether payment happens before or after artwork upload.

### VAT

VAT engine exists and can be disabled.

For HOLO launch:

- VAT should be turned off because HOLO is not VAT registered yet.
- Storefront order payload should either use global VAT disabled or force zero VAT/tax for HOLO orders.
- Public price wording should avoid VAT-inclusive language until registration status changes.

## Done

- Native storefront route exists at `/native-stores/holo-print-sidcup/default-store`.
- Existing iframe storefront route `/stores/holo-print-sidcup/default-store` has not been touched.
- Product pages can use SaaS product data instead of hardcoded demo products.
- Product buying mode supports online order vs quote-led products.
- Shareable product option URLs work for configured products.
- Product option links are now cleaned so unrelated params like quote refs do not pollute share URLs.
- Product options can flow into cart links.
- Cart page can show selected product configuration.
- Cart edit link can return to the configured product URL.
- Quote-led product flow exists.
- Quote form stores selected options with the quote request.
- Existing `/quotes` admin module shows storefront quote metadata and selected options.
- Quote conversion can carry selected options into order and production ticket notes.
- Quote request success state shows on product page with reference ID.
- Quote form has an Edit options link back to the configured product URL.

## Partial / needs strengthening

- Cart exists as a handoff page, but full checkout/order/payment is not connected yet.
- Stripe exists in internal order admin, but native storefront does not yet create Stripe sessions directly.
- Product options display if option groups are present in SaaS product metadata; option group shape may still need mapping to every admin product setup variation.
- Pricing display is still basic and not yet a full live storefront price calculator.
- Storefront product/category content depends on real SaaS admin configuration.
- Artwork IDs are supported by orders, but native storefront upload/attachment step still needs confirming/building.

## Main blockers before public launch

1. Native storefront online order bridge.
   - Cart/configured product -> internal order.
   - Internal order -> Stripe Checkout Session.
   - Stripe return -> success/cancel page.

2. Artwork upload or artwork instruction bridge.
   - Either upload artwork before payment.
   - Or let customer pay first and upload later.
   - Or allow “artwork ready / send later / need design help” for launch.

3. HOLO VAT-off configuration.
   - Disable VAT for HOLO launch.
   - Remove VAT wording from public prices.

4. Launch product setup by store owner.
   - Business cards.
   - Flyers/leaflets.
   - Posters.
   - Banners/signage.
   - Stickers/labels if launching with them.

5. Mobile and journey QA.
   - Home page.
   - Category pages.
   - Product pages.
   - Cart.
   - Order creation.
   - Artwork step.
   - Stripe payment.
   - Admin order visibility.

## Checkout/cart decision needed

The main decision is:

### Option A — Upload artwork before payment

Best when artwork quality affects price or approval.

Flow:

1. Customer configures product.
2. Customer uploads artwork or chooses send later/design help.
3. System creates order.
4. Customer pays by Stripe if order is fixed-price and not blocked.
5. Admin receives order with artwork reference.

### Option B — Pay first, upload later

Fastest checkout.

Flow:

1. Customer configures product.
2. System creates order.
3. Customer pays by Stripe.
4. Success page asks customer to upload artwork or email it.

### Option C — Hybrid launch

Recommended for HOLO first public launch.

- Fixed-price products: allow pay now with Stripe.
- Risky/custom products: route to quote/review first.
- Artwork can be ready/send later/need design help at launch.

## Recommended 7 day launch plan

### Day 1 — Product data

Store owner configures the first real launch products in SaaS admin.

### Day 2 — Native order bridge

Build configured product cart -> internal order creation.

### Day 3 — Stripe bridge

Connect native order -> Stripe Checkout Session -> success/cancel return.

### Day 4 — Artwork bridge

Connect storefront artwork upload/instruction to internal order artwork fields.

### Day 5 — HOLO VAT-off and price wording

Disable VAT for HOLO launch and remove VAT-inclusive wording from storefront prices.

### Day 6 — QA and mobile fixes

Test the full customer journey on desktop and mobile.

### Day 7 — Soft launch

Launch to a small group first, collect issues, then promote publicly.

## Current recommendation

Launch with Hybrid checkout:

- Standard fixed-price products can take online payment through Stripe.
- Products that need approval stay quote-led.
- Artwork can be uploaded/attached or marked as send later/need design help.

## Next best build

Build the native storefront online order bridge:

`configured cart product -> internal order -> Stripe checkout session`
