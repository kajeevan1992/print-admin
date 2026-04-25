# Product configuration model v220

v220 adds admin-side pricing selection testing.

The product configuration flow is now:

```txt
Product option groups
→ Admin pricing test selector
→ Selection JSON
→ Pricing diagnostics
→ Resolved pricing inputs
→ Production estimate
→ Cost breakdown
→ Final pricing rules
```

The selector uses the same keys expected by the pricing input bridge:

- group key
- role
- pricing key
- selected option value id

This is still internal/admin-only. The storefront should later generate the same selection payload from the customer product page.
