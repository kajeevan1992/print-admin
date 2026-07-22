# HOLO V2 v0 Theme Starter

This generated package is presentation-only. It may edit layout, typography, colours, images, sections, cards and animations.

It must not import or call:

- tenant resolution
- database or Prisma code
- internal or public APIs
- pricing and VAT engines
- basket or checkout services
- environment variables or credentials

The package receives safe display props from `src/v0-themes/contracts.ts`. A reviewed adapter under `src/theme-runtime/built-in/` connects it to the SaaS only after the finished design passes validation and deployment.

For v0, share only:

```text
src/v0-themes/holo-v2/
src/v0-themes/contracts.ts
```

Before release, run:

```bash
pnpm theme:check
pnpm theme:registry:check
pnpm build
```
