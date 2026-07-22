# HOLO V2 — v0 handoff

Give v0 only this folder and the shared presentation contract:

```text
src/v0-themes/holo-v2/
src/v0-themes/contracts.ts
```

Recommended v0 instruction:

```text
Redesign this HOLO Print storefront theme package.

You may change only files inside src/v0-themes/holo-v2.
Keep the V0 theme contracts unchanged.
Do not add fetch, API routes, database access, environment variables,
pricing formulas, VAT calculations, checkout logic, Stripe logic,
tenant logic, server actions or imports from outside the approved theme contract.
Use only the safe brand, content, navigation, product, category and
protected React slot props supplied by the SaaS.

Create a polished modern UK print-shop storefront with strong mobile layouts,
editable banners, promotional sections, information boxes and reusable page sections.
```

Before returning the design, keep these files and exports intact:

- `ThemeHomePage.tsx`
- `RouteViews.tsx`
- `manifest.ts`
- `index.ts`
- `ThemeHomePage`
- `themeRouteViews`
- `themeManifest`

This package is intentionally not registered as a live theme yet. It must return through the controlled theme installer, safety checks, GitHub review and deployment before it can appear in the Storefront Builder.
