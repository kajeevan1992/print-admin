# v218 Pricing Diagnostics Checkpoint

The pricing chain now has these internal stages:

Product configuration
→ pricing quote input
→ production estimate
→ cost breakdown
→ final pricing rules
→ pricing diagnostics

The diagnostic endpoint is designed for admin/testing before exposing pricing to customers.

## Why this matters

A print product can look complete in the UI but still be commercially unsafe if it is missing:

- a quantity role
- source sheet/roll/board dimensions
- material or finish costs
- production units calculation
- minimum charge
- margin/markup rule
- customer selection defaults

v218 reports these as structured checks instead of silent zero/incorrect pricing.

## Endpoint

`/api/internal/catalog/pricing-diagnostics`

It returns:

- status: `ready`, `warnings`, or `blocked`
- final price and unit price
- diagnostic checks
- underlying final-pricing payload

## Next recommended build

v219 should add a simple admin-facing pricing test panel so you can choose a product, quantity, and option selections, then see diagnostics without manually opening API URLs.
