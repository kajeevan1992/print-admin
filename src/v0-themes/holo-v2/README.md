# v0 Theme Starter

This directory is copied by:

```bash
pnpm theme:create modern "Modern"
```

The generated package is presentation-only. It may edit layout, typography, colours, images, sections, cards and animations.

It must not import or call:

- tenant resolution
- database or Prisma code
- internal or public APIs
- pricing and VAT engines
- basket or checkout services
- environment variables or credentials

The package receives safe display props from `src/v0-themes/contracts.ts`. A reviewed adapter under `src/theme-runtime/built-in/` connects it to the SaaS.

Before creating a pull request, run:

```bash
pnpm theme:check
pnpm build
```
