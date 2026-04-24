# Product configuration model note for v182

The current add-product wizard saves the basic product, creation method, blank canvas values, and one selected material/finish/printer/quantity/turnaround into the catalog database.

For real storefront selling, a product must support option sets instead of single values. Example: a business card needs multiple sizes, multiple materials, one-sided/two-sided choices, corner options, lamination options, quantity breaks, and turnaround choices.

Recommended next build after this UI stabilisation:

- Product option groups: Size, Sides, Material, Finish, Corners, Quantity, Turnaround.
- Each option group can have many options.
- Options can affect price, artwork rules, production route, and lead time.
- Booklets use different option groups from business cards, including page count, binding, cover stock, inner stock, and finished size.
- Keep printer route as internal production/pricing information, not a customer-facing dropdown unless needed.

Do not force these multi-choice selling options into the single material/finish/quantity fields. Those fields are only the current starter configuration.
