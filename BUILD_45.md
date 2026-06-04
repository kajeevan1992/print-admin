# Build 45

Stripe payment flow hardening.

Changed:
- Stripe service
- hosted theme payment helpers
- customer account payment retry UI

Summary:
- Stripe session creation now clears old payment failure reason when retrying.
- Payment confirmation treats expired sessions as failed.
- Added backend helper to mark a Stripe checkout as customer-cancelled.
- Customer account now shows payment state more clearly.
- Eligible unpaid orders now show a Pay now retry action.

Not changed:
- No new checkout flow.
- No public API changes.
- No VAT rule changes.
- No redesign.
