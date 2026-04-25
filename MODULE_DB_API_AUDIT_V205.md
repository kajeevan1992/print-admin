# v205 Module DB/API Audit Update

v205 does not add more modules. It starts the validation and data-integrity phase.

## New safety endpoint

```txt
GET /api/internal/catalog/validation-report
```

Returns product/category configuration issues:

- missing product/category names
- missing friendly URLs
- unresolved product category references
- missing option groups
- duplicate option keys
- missing storefront display types
- manually typed material/finish values that should be linked to libraries

## Data integrity rules added

- Product create requires name/title and slug.
- Category create requires name and slug.
- Slugs are normalised to lowercase hyphen format.
- Product category IDs must exist before saving.
- Price cannot be negative.
- Currency must be a 3-letter code.
- Option group keys must be unique.

## Next recommended build

v206 should add UI display of validation issues in product/category/product-builder screens instead of only exposing them from the API.
