# Build 49

Admin order management polish.

Changed files:
- `src/modules/orders/pages/orders-list-page.tsx`
- `BUILD_49.md`

Summary:
- Turned the existing Orders page into a clearer daily shop workflow board.
- Added workflow filter:
  - All workflows
  - Quote review
  - Payment needed
  - Artwork / production
  - Dispatch / collection
- Added workflow metric cards:
  - Visible Orders
  - Quote Review
  - Payment Needed
  - Artwork / Production
  - Dispatch
  - Order Value
- Added a shop workflow guidance panel for the daily Holo Print process.
- Added due-soon order shortcuts.
- Improved table columns with clearer workflow, payment, item and action context.
- Production ticket automation now runs against the currently visible workflow-filtered orders.

Intended shop workflow:
1. Open Orders page.
2. Check Quote Review orders first.
3. Approve quote and create payment link from order detail.
4. Check Payment Needed orders.
5. Move paid jobs into artwork/production.
6. Finish with dispatch/collection orders.

Not changed:
- No duplicate order page.
- No checkout changes.
- No VAT changes.
- No payment backend changes.
- No public API changes.
