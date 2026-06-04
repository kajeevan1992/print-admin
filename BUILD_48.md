# Build 48

Admin quote approval flow.

Changed files:
- order payment admin route
- orders service
- order detail page

Summary:
- Added admin action to approve quote orders.
- Added admin action to create a Stripe checkout URL for an approved order.
- Quote orders can be approved from the existing order detail Payment panel.
- The Payment panel now shows buttons for approval and Stripe URL creation.
- The returned Stripe URL is shown in the admin screen with copy and open actions.
- Existing manual payment and refund actions remain available.

Not changed:
- No duplicate order flow.
- No checkout redesign.
- No VAT changes.
- No public API changes.
