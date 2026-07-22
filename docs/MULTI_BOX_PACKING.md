# Multi-Box Packing

## Purpose

The multi-box packing phase extends the existing tenant shipment record. It does not create a second dispatch, order, production or customer-tracking system.

Each shipment owns one or more persistent box records. Shipment package count, packed weight and scan release status are calculated from those child records.

## Staff workflow

1. Open **Shipment & Dispatch Center**.
2. Open **Boxes** on a released shipment.
3. Add or remove boxes before carrier handover.
4. Record each box's contents, packed weight, optional dimensions, optional box-level tracking number and internal notes.
5. Save the box.
6. Print its 4 × 6 or A6 internal packing label.
7. Scan or enter the Code 39 box code shown on the label.
8. Repeat until every box is verified.
9. Manifest and dispatch the existing shipment.

Changing a verified box's contents, weight, dimensions, tracking number, label or notes resets that box to pending verification.

## Dispatch gate

Carrier handover and collection completion require:

- the existing proof release;
- the existing payment release;
- at least one persistent box;
- every box to contain a contents description;
- every box to have a packed weight;
- every box code to be verified.

The dispatch API reloads the package records at the moment of handover. A stale parent shipment scan value cannot bypass the box gate.

## Persistence

Runtime-created PostgreSQL table:

- `StorefrontShipmentPackage`

Each row is scoped by tenant, storefront and shipment and stores:

- stable package number and label;
- contents lines;
- packed weight;
- optional dimensions;
- random internal box code;
- verification state, actor and time;
- optional box-level tracking number;
- internal packing notes.

Package changes append to the existing immutable `StorefrontShipmentEvent` timeline with source `packing`.

## Parent shipment authority

The existing `StorefrontShipment` remains authoritative for dispatch. After every package mutation the service recalculates:

- `packageCount` from box rows;
- `weightGrams` from the sum of packed box weights;
- `scanStatus` as `missing`, `partial` or `complete`.

## Labels

Each box can print an internal 4 × 6 or A6 identification label containing:

- order number;
- box number;
- destination;
- contents;
- packed weight and dimensions;
- optional box tracking number;
- a Code 39 barcode and human-readable box code.

The label is explicitly marked as internal identification and is not carrier postage.

## Customer tracking

The existing order tracker shows a privacy-safe package summary:

- box label/number;
- packed/preparing state;
- weight and dimensions;
- optional box-level tracking number.

Internal barcodes, contents and staff packing notes are not returned to customers.

## Limits and safety

- Maximum 20 boxes per shipment.
- Maximum 20 contents lines per box.
- Maximum 100 kg per box.
- Maximum 3,000 mm per dimension.
- Boxes cannot be changed after carrier handover or collection.
- A shipment must keep at least one box.
- All staff endpoints require the existing tenant admin session and return private, no-store responses.
