# Product Configuration Model v185

This build adds readiness checks around the product option model.

## Product setup direction

A product should be configured like this:

```txt
Product
→ Template/rules
→ Option groups
→ Values from libraries
→ Storefront display style
→ Validation/readiness checks
→ Pricing hooks for later
```

## Important rule

Materials and finishes should come from their libraries, not manual text.

This keeps future pricing safe because pricing can resolve stable IDs such as:

```txt
material.sourceId
finish.sourceId
size.width / size.height
quantity.quantity
turnaround.leadTimeDays
```

## Readiness checks added

The admin now warns if:

- no option groups exist
- size/material/quantity groups are missing
- group keys are missing
- required groups have no values
- material/finish values are manually typed
- size values have no dimensions
- custom size is enabled without max width/height limits
- artwork min/max file rules are invalid

## Examples

### Business cards

```txt
Size: 85x55, 55x55, folded
Material: selected from material library
Sides: single/double sided
Finish: selected from finish library
Quantity: 25, 50, 100, 250, 500...
Turnaround: standard, priority, rush
```

### PVC banner

```txt
Size: preset sizes + custom size
Custom max width: based on printer/material roll width
Custom max length: based on roll/material rules
Material: selected from material library
Finish/options: eyelets, hems, pole pockets
Quantity: usually 1+
```

### Board/signage

```txt
Size: preset sizes + custom size
Max dimensions: based on board sheet size and printer bed/roll limit
Material: foam board, correx, dibond, acrylic etc.
Finish/options: cut to size, contour cut, drilled holes
```

## Not included yet

- real pricing calculation
- sheet imposition calculation
- production routing
- artwork preflight enforcement
- customer storefront redesign

Those should come after product configuration is stable.
