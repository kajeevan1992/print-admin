# Build 60

Checkout Collection Selector integration note.

No backend code changes were required in this repo for Build 60.

Existing backend pieces reused:
- Build 57 Location Manager.
- `GET /api/internal/storefront/locations`.
- Checkout endpoint already stores extra checkout payload fields.
- Quote checkout endpoint already stores extra checkout payload fields.

The hosted theme now sends fulfilment details in the checkout payload:
- `fulfilmentMode`
- `fulfilmentChoice`
- `fulfilmentSelection`
- `delivery`

Next recommended build:
- Build 61 — QR/PIN Collection System.
