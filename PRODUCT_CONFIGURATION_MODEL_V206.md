# v206 Product Configuration Model

This build keeps product setup separate from pricing.

## Product option groups

A product can have groups such as:

- size
- material
- finish
- sides
- quantity
- turnaround
- custom-size

Each group needs a stable key, values, storefront display style and pricing key.

## Dependency rules

Dependency rules describe when an option should show, hide or become required.

Example:

```txt
When material = 400gsm silk
Show finish
```

Example:

```txt
When size = custom
Show custom width / height fields
```

The pricing engine later uses the selected option keys and value IDs. This is why manual material/finish values are discouraged; they should be selected from the library.

## Still not included

- Price calculation
- SRA3/SRA2 sheet maths
- cutter/router time calculations
- customer storefront final layout redesign
- order creation
