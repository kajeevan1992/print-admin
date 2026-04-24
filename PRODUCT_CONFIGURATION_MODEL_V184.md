# Product configuration model v184

This model converts the WordPress plugin research into the unified SaaS product builder without copying plugin code.

## Product setup layers

Product = basic catalog record.

Template Rules = reusable print-shop setup pattern, for example business cards, booklets, banners or boards.

Option Groups = the choices shown to the customer, for example size, material, finish, quantity and turnaround.

Option Values = allowed choices, ideally linked from material/finish/option libraries so pricing later uses real IDs.

Artwork Rules = what the customer must upload and what the artwork checker should expect.

Pricing Hooks = stable keys and production profile names that the pricing engine can consume later.

## Merge / override modes

- template-only: product follows the template.
- merge-overrides: product uses template but overrides selected fields/options.
- product-only: product is fully custom.

## Why this matters

A business card, booklet, banner and board should not all share the same setup assumptions.

Business cards may price by SRA3 imposition, material, finish, sides and quantity.
Booklets may price by inner sheets, optional cover material, page count, binding and finishing.
Banners may price by roll-fed area and max printable width.
Boards may price by board nesting and cutting/routing time.

v184 stores the structure for these rules. The pricing engine will use it later.
