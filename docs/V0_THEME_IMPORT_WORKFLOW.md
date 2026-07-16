# Controlled v0 Theme Import Workflow

## Goal

Move an approved design-only theme from a v0 workspace into `print-admin` without manually editing the storefront registry or exposing SaaS authority code to the theme.

## Required package shape

The source directory must contain:

- `manifest.ts` at the package root
- exactly one file whose name ends in `HomePage.tsx`
- optionally `RouteViews.tsx`
- package-local components, CSS and approved image assets

`manifest.ts` must export one named manifest constant and its key must match `<theme-slug>-native`.

When `RouteViews.tsx` is present, it must export a named constant ending in `ROUTE_VIEWS`.

## Import command

From the `print-admin` repository:

```bash
pnpm theme:import ../approved-v0-theme modern
```

This performs one controlled transaction:

1. Validates the requested slug.
2. Rejects symbolic links, environment files, build folders, unsupported file types and files larger than 5 MB.
3. Copies the package into `src/v0-themes/modern`.
4. Runs the existing v0 authority scanner.
5. Generates `src/theme-runtime/built-in/generated/modern.ts`.
6. Rebuilds `src/theme-runtime/built-in/generated-v0-themes.ts`.
7. Makes the new theme available to the internal Theme SDK and Themes admin.

If any step fails, the copied package and generated adapter are removed and the generated registry is restored.

## Allowed files

The importer accepts TypeScript, TSX, CSS, JSON, SVG, PNG, JPG, JPEG, WebP and GIF files. It ignores common build and dependency directories.

The existing `pnpm theme:check` scanner remains the authority boundary. A package is rejected when it imports or calls database, API, tenant, pricing, VAT, checkout or server-only code.

## Recommended v0 process

1. Create a starter in a design repository or temporary workspace.
2. Use the safe theme contracts and mock data only.
3. Design homepage and route views in v0.
4. Set manifest content fields, visual settings and protected-widget defaults.
5. Export/copy only the approved package directory.
6. Run `pnpm theme:import <directory> <slug>` inside `print-admin`.
7. Open a pull request and require the Theme SDK check to pass.
8. Preview the theme as a saved draft in the SaaS admin.
9. Publish it to one test storefront before wider use.

## Updating an existing imported theme

The first version intentionally refuses to overwrite an existing package or adapter. Updates should be reviewed as normal code changes in the existing theme directory. This prevents a later import from silently replacing a live theme.

## Security boundary

The generated adapter is owned by the SaaS and only connects approved presentation exports to `renderV0ThemePackage`. The theme does not receive Prisma, tenant identifiers, price rows, VAT inputs, checkout handlers, API credentials or Stripe sessions.
