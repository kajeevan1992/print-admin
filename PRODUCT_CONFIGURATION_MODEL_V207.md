# Product Configuration Model v207

v207 improves the admin-to-customer bridge for option groups.

Each option group can now define:
- display type
- display columns
- default selected value
- whether descriptions should be hidden
- dependency rules

Each option value can now define:
- label
- description
- image URL
- swatch colour
- sort order
- hidden flag
- pricing key
- library source ID

This lets the admin decide whether a product option appears as:
- dropdown
- radio/card grid
- image cards
- swatches
- quantity grid
- custom-size inputs

The customer preview now reads these settings and behaves closer to the final storefront configuration UI.
