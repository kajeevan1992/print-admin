# v212 Product Configuration Model — Pricing Quote Input Bridge

v211 prepared product option groups with pricing roles and basic cost hooks.
v212 converts those saved product options into a normalized payload that the future pricing engine can consume.

Important distinction:

- Product Builder decides what the customer is allowed to choose.
- Pricing Quote Input maps those choices into clean pricing inputs.
- Pricing Engine later turns those inputs into the final price.

## Required pricing roles

A product should normally include at least:

- size
- material
- quantity

Optional roles include:

- finish
- sides
- turnaround
- artwork
- custom-size
- delivery
- production

## Why this matters

The pricing engine must never guess from display labels. It should receive stable keys such as:

- material id
- finish id
- quantity
- width/height
- sides
- setup cost
- run cost
- multiplier
- production code

## New bridge endpoint

`/api/internal/catalog/pricing-quote-input`

This endpoint validates and normalizes product selections, but it does not calculate sell price yet.
