# Protected Commerce Widget Theming

## Purpose

Approved themes can control the visual treatment of the internal product configurator, quote form and checkout form without receiving their state, API calls, tenant identifiers, pricing rows, VAT inputs, Stripe sessions or form submission handlers.

## Safe appearance contract

A v0 theme manifest may define `widgetAppearance` with approved enum values:

- `surface`: card, soft or flat
- `density`: compact, comfortable or spacious
- `radius`: small, medium or large
- `optionStyle`: automatic, cards, pills or segments
- `fieldStyle`: outline, filled or underline
- `buttonStyle`: pill, rounded or square
- `priceStyle`: panel, highlight or minimal
- `shadow`: none, soft or strong
- `labelStyle`: normal or uppercase

Themes cannot provide event handlers, API URLs, arbitrary class injection, pricing functions or checkout callbacks through this contract.

## Runtime ownership

The following remain internal SaaS responsibilities:

- product option state and dependencies
- price requests and formatted totals
- VAT resolution
- add-to-basket query construction
- contact, fulfilment and billing values
- artwork validation and upload preflight
- quote submission
- checkout verification
- Stripe redirection and order creation

The theme controls only approved visual tokens. The internal widgets sanitise every value before rendering.

## Store-owner editing

Manifest fields under `layout.widgetAppearance.*` are generated automatically in the Themes admin. An empty value means **Theme default**. Store owners can preview the draft before publishing.

## v0 guidance

v0 may edit the manifest defaults and the visual route layouts, but must not edit:

- `src/theme-runtime/protected-widget-appearance.ts`
- `src/themes/atlantis-native/ProductOrderPanel.tsx`
- `src/themes/atlantis-native/CartCheckoutForm.tsx`
- quote or checkout API routes

The existing `pnpm theme:check` boundary scanner continues to reject authority-bearing code inside v0 packages.
