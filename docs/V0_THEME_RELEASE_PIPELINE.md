# v0 Theme Release Pipeline

## Purpose

Finished v0 themes are installed at build time, reviewed in Git and deployed with the SaaS. React theme code is never executed directly from an admin upload or a customer-controlled ZIP.

This keeps tenant resolution, pricing, VAT, checkout, artwork and order authority inside `print-admin` while still making it fast to add five, ten or more visual themes.

## Required package structure

A released theme folder or ZIP must contain one package root with:

```text
manifest.ts
index.ts
ThemeHomePage.tsx or another *HomePage.tsx
RouteViews.tsx
optional components/
optional assets/
```

`index.ts` must export these generic names:

```ts
export { default as ThemeHomePage } from './ThemeHomePage';
export { MY_THEME_ROUTE_VIEWS as themeRouteViews } from './RouteViews';
export { MY_THEME_V0_MANIFEST as themeManifest } from './manifest';
```

The manifest key must match the package folder:

```text
folder: modern
key: modern-native
```

The manifest version must use semantic versioning such as `1.0.0` or `1.2.0`.

## Create a new package

```bash
pnpm theme:create modern "Modern"
```

Design only files under `src/v0-themes/modern` in v0. Do not add API calls, environment variables, database access, pricing logic, tenant logic or checkout handlers.

## Validate a finished v0 package

Folder dry run:

```bash
pnpm theme:install ./exports/modern --dry-run
```

ZIP dry run:

```bash
pnpm theme:install ./exports/modern.zip --dry-run
```

The installer checks:

- ZIP path traversal
- symbolic links
- unsupported files
- environment and project configuration files
- maximum 400 files
- maximum 5 MB per file
- maximum 25 MB uncompressed
- required package exports
- approved imports
- forbidden API, database, tenant, pricing and checkout access
- manifest key and semantic version
- upgrade and downgrade rules

## Install or upgrade

```bash
pnpm theme:install ./exports/modern.zip
```

A newer semantic version upgrades the installed theme. Downgrades are rejected. Replacing the same version requires an explicit review decision:

```bash
pnpm theme:install ./exports/modern.zip --replace
```

The installer stages the package, validates it, replaces the previous version, regenerates the installed-theme registry and runs the full v0 boundary scan. If any step fails, it restores the previous package automatically.

## Generated files

Do not edit these manually:

```text
src/theme-runtime/built-in/v0-installed.generated.ts
src/v0-themes/installed-themes.generated.json
```

Refresh them with:

```bash
pnpm theme:registry
```

Verify they are current with:

```bash
pnpm theme:registry:check
```

## Release review

After installation:

```bash
pnpm theme:check
pnpm theme:registry:check
pnpm build
```

Commit the new or upgraded package and generated files on a branch. Open a pull request. The Theme SDK workflow repeats the boundary scan, registry check, installer dry run, Prisma generation and complete Next.js production build.

After the pull request is merged and deployed, the new theme appears automatically in the SaaS Themes admin. Store owners can select it, edit permitted text/images/settings, preview a draft and publish it.

## Why deployment is required

A v0 theme contains React components. Allowing an uploaded ZIP to execute immediately would permit unreviewed code inside the SaaS process. The release pipeline therefore treats an upload as source code: validate, review, build and deploy first.

Store-owner text, images, colours, layout settings and protected-widget appearance remain database-driven and can still be previewed and published without a new deployment.
