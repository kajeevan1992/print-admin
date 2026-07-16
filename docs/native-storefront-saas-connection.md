# Native storefront SaaS connection

## Connected in this phase

- Store identity, selected theme and published status from `storefront-stores`
- Published brand name, logo and colours from `hosted-theme-settings`
- Published homepage sections from the hosted block editor
- Header and footer navigation from SaaS navigation records
- Tenant products, categories, options, quantities and turnaround choices
- Live server-side pricing and VAT
- Collection points in the homepage and fulfilment selector
- Real all-products catalog route
- Store-aware SEO metadata
- Existing quote, artwork, order and Stripe Checkout connections remain active

## Remaining phases

1. Persistent multi-line basket and basket totals
2. Customer registration, login, account dashboard and order history
3. Product/category search with filters and suggestions
4. Fulfilment pricing, postcode eligibility and cut-off rules
5. Stripe webhook/payment-success verification audit
6. Newsletter, contact forms and policy pages
7. Repeat ordering, saved artwork and customer-specific pricing

The native theme must continue to use authoritative tenant data and must not introduce demo catalog, local price formulas or order fallbacks.
