# Internal Theme SDK v1

## Purpose

The live storefront remains inside `print-admin` and uses internal SaaS services directly. Themes control presentation only. Tenant resolution, catalogue records, product configuration, pricing, VAT, basket, checkout, artwork and orders remain owned by the SaaS runtime.

## Theme registration

Built-in themes are registered as `StorefrontThemeDefinition` records. Each definition contains:

- a stable theme key
- optional legacy aliases
- display name and version
- editable content/settings schema
- one renderer that receives the common `StorefrontRuntimeContext`

Atlantis is the first registered definition. The old `atlantis-print-hosted` key remains a legacy alias for `atlantis-native`, so existing store records continue to resolve without exposing two Atlantis choices to users.

## Runtime flow

1. Resolve tenant identifiers once.
2. Load the exact store record and exact store theme settings.
3. Reject unknown, unpublished or inactive stores.
4. Load catalogue, navigation, categories and collection points from internal SaaS data.
5. Build one `StorefrontRuntimeContext`.
6. Resolve the selected approved theme definition.
7. Render the theme inside the SaaS process.

No API key/secret round trip is used between the theme and the SaaS.

## Content rules

The production internal theme does not use demo products, generated stores or a `default-store` record as a fallback for another store. When homepage content has not been published, Atlantis displays a neutral unavailable state instead of demo homepage sections.

## v0 workflow

v0 should edit a design-only theme package using mock props that match the Theme SDK. Approved UI components can then be moved into a built-in theme definition. v0 must not own or modify tenant resolution, Prisma access, pricing, VAT, checkout or order services.

## Next phases

1. Pass the resolved runtime settings into every Atlantis page component so no page performs a duplicate settings load.
2. Split product configurator presentation from the existing internal pricing/controller logic.
3. Add draft/published theme revisions and generate the admin editor from the manifest field schema.
4. Register a second built-in theme to prove the contract.
5. Add automated import-boundary checks for future design-only theme packages.
