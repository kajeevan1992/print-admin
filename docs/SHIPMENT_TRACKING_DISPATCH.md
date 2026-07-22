# Shipment Tracking and Dispatch

## Purpose

This phase replaces the Dispatch Center's browser-local demo batches with one tenant-scoped shipment record and event timeline that is linked to the existing production, proof and payment workflow.

It does not buy postage or claim to be a carrier shipping API. Staff may enter a carrier tracking number and HTTPS tracking URL. Future carrier adapters can update the same shipment and event records.

## Authority and release gate

A shipment enters the Dispatch Center only when existing production work has reached packing/dispatch and both of these are released:

- customer proof/artwork approval;
- captured, authorised or manually confirmed payment.

The shipment keeps the production/planner job identifiers. Dispatching or collecting the shipment updates the existing production job instead of maintaining a second production status.

## Persistent records

Runtime-created PostgreSQL tables:

- `StorefrontShipment`
- `StorefrontShipmentEvent`

Shipment records include tenant/store scope, production linkage, customer/order snapshot, delivery or collection mode, carrier/service, tracking, manifest details, package count, weight, scan status, destination, notes and milestone timestamps.

Events are append-only operational history for creation, edits, manifesting, handover, transit, exceptions, delivery, collection and customer notifications.

## Staff workflow

1. Open **Shipment & Dispatch Center**.
2. Select the storefront.
3. Released production work is synchronised into persistent shipment records.
4. Edit carrier, service, tracking number, optional HTTPS tracking URL, manifest, package count, weight, scan status, address and notes.
5. Print the internal 4 × 6 dispatch label.
6. Manifest the shipment or mark a collection order ready.
7. Complete all package scans.
8. Dispatch/collect only after the proof and payment gates are released.
9. Record in-transit, exception and delivered milestones as needed.
10. Send or resend the customer notification from the same shipment.

## Internal label boundary

The printable label is an internal identification/packing label. It is deliberately marked:

> Internal identification label only — not carrier postage.

It does not contain a carrier-issued barcode or postage. A carrier integration can later store and print the carrier's own label without replacing the shipment record.

## Customer experience

Dispatch, collection and delivery emails use the existing tenant SMTP/outbox service and link to `/track-order` without placing the customer's email address in the URL.

The customer tracker requires:

- order number/order ID;
- matching order email address.

It shows the existing artwork/proof and production status plus:

- shipment/collection status;
- carrier and service;
- tracking number;
- optional carrier tracking URL;
- package count;
- destination town/postcode/country;
- manifest, handover and completion timestamps;
- shipment event timeline.

Responses are private/no-store and the tracking page is noindex/nofollow with a no-referrer policy.

## Security

- All staff shipment and label routes require a tenant admin session.
- The old wildcard-CORS public mutation endpoint is removed.
- Tenant/store ownership is checked for every shipment read or mutation.
- Public tracking requires the matching customer email and is rate limited.
- Tracking URLs must use HTTPS.
- Carrier handover is refused when scans are incomplete, tracking is missing for delivery, or proof/payment release is no longer valid.
- Labels are private/no-store, noindex and protected with a restrictive content security policy.

## Future carrier adapters

A DPD, Royal Mail, DHL, UPS or shipping-aggregator integration should extend this system by:

- buying postage and storing the carrier shipment identifier;
- storing the carrier tracking URL;
- serving the carrier-generated label;
- translating webhook events into `StorefrontShipmentEvent` rows;
- preserving the existing proof/payment release checks and tenant/store ownership.
