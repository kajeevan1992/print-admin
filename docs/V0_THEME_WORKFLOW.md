# Safe v0 Theme Workflow

## Goal

Use v0 to design multiple storefront themes without giving v0 access to tenant resolution, database records, pricing, VAT, basket, checkout, artwork or orders.

## Repository boundary

v0-editable code lives only in:

```text
src/v0-themes/<theme-name>/
```

The stable display contract lives in:

```text
src/v0-themes/contracts.ts
```

SaaS adapters and registration remain outside the v0 package:

```text
src/theme-runtime/v0-package-adapter.tsx
src/theme-runtime/built-in/<theme-name>.ts
src/theme-runtime/registry.ts
```

## Create a theme

```bash
pnpm theme:create modern "Modern"
```

This creates:

```text
src/v0-themes/modern/
├── manifest.ts
└── ThemeHomePage.tsx
```

Open only that package and the contract in v0. Do not ask v0 to edit the runtime adapter or registry.

## Recommended v0 instruction

```text
Redesign this storefront theme package.

You may change only files inside src/v0-themes/modern.
Keep the V0ThemeHomeProps contract unchanged.
Do not add fetch, API routes, database access, environment variables,
pricing formulas, VAT calculations, checkout logic or tenant logic.
Use only the product, category, navigation, content, layout and brand
props supplied to the component.
```

## Validation

```bash
pnpm theme:check
pnpm build
```

The boundary check rejects forbidden imports and authority-bearing code inside v0 packages. GitHub Actions runs the same check before the production build.

## Registering an approved package

After design review, create a small adapter under `src/theme-runtime/built-in/`. The adapter imports the package homepage and calls `renderV0ThemePackage`. Then add that definition to `src/theme-runtime/registry.ts`.

The adapter is the only place that connects the visual package to the internal storefront runtime. It must be reviewed manually.

## Current proof

`Canvas` is the first registered theme using this restricted package flow. Its homepage is supplied only safe view props. Product, quote, pricing, VAT, basket and checkout routes continue to use the internal SaaS controllers.

## Future phase

The next structural improvement is separating shared category, product, quote, basket and checkout page views from their controllers. Once completed, v0 packages can own the full visual shell for every storefront route while the controllers remain internal.
