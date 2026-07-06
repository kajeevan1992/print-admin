# Print Admin SaaS module ownership map

_Last updated: 2026-07-06_

This document freezes the rule for the print SaaS architecture: admin/backend modules own business logic; storefront themes render backend contracts and submit customer selections back to the backend.

## Source module map

The supplied SaaS module list covers these platform areas:

- Dashboard and workspace
- Product setup: Products, Product Builder, Config Templates, Option Sets, Materials Library, Finish Library, Printer Profiles, Product Rules Lab, Production Routing
- Commerce data: Categories, Collections, Tags, Orders, Quotations, Pricing, Pricing Rules, Pricing Command
- Artwork: Artwork Preflight, Artwork Uploads, Artwork Proofing, Artwork Intelligence
- Storefront and launch: Print Store, Launch Readiness, Storefront Order Test, Payment Checkout QA, Live Flow Check, Launch Guard, Data Check, Final Check, Button Audit
- Theme system: Theme Library, Design Bundles, Theme Versions, Theme Marketplace, Store Domains, Store Allowances, Store Theme Selector, Store Design Live, Block Editor
- Users and trade: Users, Site Users, User Groups, User Roles, User Projects, User Carts, Trade Vendors
- Content and SEO: Content, Blog Content, Page Content, Product Content, Tag Content, Landing Pages, Category CMS / SEO, Menu Builder, Extended Content, SEO Engine, SEO Templates, SEO Analytics, Search Console, Tracking Settings, SEO Live Readiness, Internal Linking, Content Queue, HTML Snippets
- Settings and platform: General Settings, Payment Accounts, API Access, API Keys, Admin Users, Licensing Center, Tenant Control, Database Manager, Organizations, Merchant Accounts, Shipping Methods, Tax / VAT Settings, Invoice Settings, Email Account, Email Settings, Email Outbox, Email Notifications, Checkout Fields, Checkout Styles, Promotion Codes, Country List, Translations
- Advanced and production: Attribute Sets, Inventory, Order Status, Packaging Studio, Redirects, Robots.txt, Site Bindings, Store Clone, FTP Accounts, Clean Up Manager, Error Log, Production Planner, Dispatch Center, Printer Management, Production Board

## Non-negotiable ownership rules

1. Product Builder owns product configuration.
2. Pricing Engine owns price calculation.
3. Tax / VAT Settings and the VAT engine own tax treatment.
4. Artwork modules own upload, preflight, proofing and artwork readiness.
5. Orders own saved commercial totals and lifecycle state.
6. Stripe charges the saved backend order total.
7. Storefront themes must not calculate print prices, infer VAT, invent product types, or duplicate production rules.

## Correct storefront contract

A product page must load a backend-owned product contract:

```txt
Product Builder / Catalog
  -> backend storefront product contract
  -> theme renders fields
  -> customer selections
  -> backend storefront price endpoint
  -> basket snapshot
  -> checkout validation
  -> order
  -> Stripe from order.totalMinor
```

## Required API contracts

### Storefront product contract

Endpoint:

```txt
GET /api/internal/storefront/product?tenantSlug=<tenant>&productSlug=<slug>
```

Returns:

```ts
{
  product: {
    id: string;
    slug: string;
    title: string;
    buyingMode: 'cart' | 'quote';
    images: string[];
  };
  content: {
    shortDescription: string;
    longDescription: string;
    specifications: unknown[];
    designGuidelines: unknown[];
    faqs: unknown[];
    orderingProcess: unknown[];
  };
  configurator: {
    groups: unknown[];
    customerGroups: unknown[];
    quantityGroup: unknown;
    quantityRows: unknown[];
    deliveryGroup: unknown;
    deliveryRows: unknown[];
    hiddenGroups: unknown[];
    initialSelections: Record<string, unknown>;
  };
  artwork: Record<string, unknown>;
  tax: Record<string, unknown>;
  initialPrice: Record<string, unknown> | null;
}
```

### Storefront price contract

Endpoint:

```txt
POST /api/internal/storefront/price
```

Input:

```ts
{
  tenantSlug: string;
  productSlug: string;
  selections?: Record<string, unknown>;
  selectedOptions?: Array<{ key: string; value: string; slug?: string }>;
  quantity?: number | string;
  delivery?: string;
  customSize?: Record<string, unknown>;
}
```

Returns backend-calculated price and tax summary. No frontend VAT defaults are allowed.

## Known dangerous areas to remove or reduce

- Hardcoded product catalogues inside themes.
- Hardcoded quantity/price blocks in themes.
- Frontend VAT wording or VAT defaults.
- Fallback storefront products used for real checkout.
- Cart bridges that infer VAT by product name instead of using backend tax settings.
- Any product-page code that treats custom size, quantity, delivery or artwork as a frontend-only concept.

## Safe build order

1. Backend product read contract returns complete product configuration.
2. Backend storefront product endpoint returns render-ready schema.
3. Backend storefront price endpoint resolves selected configuration and VAT using backend services.
4. Storefront product page renders returned schema.
5. Basket stores backend-resolved item snapshots.
6. Checkout recalculates and validates basket before order creation.
7. Stripe charges the saved order total.
8. Launch QA modules test the full customer journey.

## Current fix direction

The first live fix is to move native storefront pricing off a separate frontend/native assumption and onto backend-owned internal storefront endpoints:

- `/api/internal/storefront/product`
- `/api/internal/storefront/price`

The theme can call these, but it cannot own pricing or VAT logic.
