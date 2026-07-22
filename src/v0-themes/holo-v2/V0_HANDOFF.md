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

The starter is registered in the generated theme catalogue so the safety workflow can validate it, but it is not selected or published for HOLO Print. Atlantis and the current live storefront remain unchanged until HOLO V2 is deliberately chosen, previewed and published from the Storefront Builder after the finished design is reviewed and deployed.
