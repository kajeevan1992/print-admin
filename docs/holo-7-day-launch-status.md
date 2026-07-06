# HOLO Print Native Storefront — 7 Day Launch Status

Last updated: 2026-07-06

## Current launch focus

Yes — the build is still focused on the 7 day launch. The recent work has been on the foundation that must exist before the storefront can launch safely: product option URLs, cart handoff, quote-led products, and quote admin visibility.

## Current progress estimate

Overall launch readiness: about 55%.

This is not 55% of the whole long-term SaaS. It is 55% of a usable first storefront launch for HOLO Print.

## Done

- Native storefront route exists at `/native-stores/holo-print-sidcup/default-store`.
- Existing iframe storefront route `/stores/holo-print-sidcup/default-store` has not been touched.
- Product pages can use SaaS product data instead of hardcoded demo products.
- Product buying mode supports online order vs quote-led products.
- Shareable product option URLs now work for configured products.
- Product options can flow into cart links.
- Cart page can show selected product configuration.
- Cart edit link can return to the configured product URL.
- Quote-led product flow exists.
- Quote form stores selected options with the quote request.
- Existing `/quotes` admin module shows storefront quote metadata and selected options.
- Quote conversion can carry selected options into order and production ticket notes.
- Quote request success state shows on product page with reference ID.

## Partial / needs strengthening

- Cart exists as a handoff page, but full checkout is not complete.
- Product options display if option groups are present in SaaS product metadata; option group shape may still need mapping to every admin product setup variation.
- Quote submit redirect confirms quote ID, but preserving selected option parameters after submit is still not fully patched because connector safety blocked the API redirect change.
- Pricing display is still basic and not yet a full live storefront price calculator.
- Storefront product/category content depends on real SaaS data being configured.

## Main blockers before public launch

1. Real product data for launch products.
   - Business cards.
   - Flyers/leaflets.
   - Posters.
   - Banners/signage.
   - Stickers/labels if launching with them.

2. Cart/checkout decision.
   - Either launch quote-first with no payment.
   - Or finish cart, checkout, payment and order creation.

3. Artwork upload or artwork instruction flow.
   - Required for real print orders.

4. VAT and price display checks.
   - Zero-rated and standard-rated products must not be mixed incorrectly.

5. Launch QA.
   - Home page.
   - Category pages.
   - Product pages.
   - Quote request.
   - Cart handoff.
   - Admin quote visibility.
   - Mobile layout.

## Recommended 7 day launch plan

### Day 1 — Product data

Configure the first launch products in the SaaS product setup. Keep the list small and real.

### Day 2 — Quote-first launch path

Make quote-led flow solid enough for public use. This is safer than trying to force full checkout too early.

### Day 3 — Cart/order path decision

Decide whether online ordering launches now or after the first public quote launch.

### Day 4 — Artwork flow

Add a basic artwork-upload or clear artwork-instruction flow.

### Day 5 — Storefront copy and SEO basics

Check product titles, descriptions, category copy, page metadata, and local HOLO Print positioning.

### Day 6 — QA and mobile fixes

Test the full customer journey on desktop and mobile.

### Day 7 — Soft launch

Launch to a small group first, collect issues, then promote publicly.

## Current recommendation

The safest first launch should be quote-first, not full checkout-first.

Reason: the quote system now connects to the existing admin `/quotes` module, so customers can enquire and staff can handle jobs manually while checkout/payment/order automation is finished properly.

## Next best build

Add a clear storefront launch checklist or status panel inside the admin so the launch blockers can be tracked from the application, not only from this document.
