# Build 44

Payment-ready checkout rules.

Changed files:
- payment rules helper
- storefront checkout route
- quote request route
- Stripe service

Summary:
- Fixed-price checkout can go to online card payment.
- Quote/manual review checkout is saved as an order waiting for approval.
- Quote requests now create real customer orders.
- Card session creation is blocked for unapproved, cancelled, paid or zero-total orders.
- Approved quote orders can receive a payment link later.

No UI redesign, no public API change, no VAT rule change.
