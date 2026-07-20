# Storefront Section Builder v1

## Purpose

The Storefront Section Builder replaces the raw homepage-sections JSON textarea in the existing Theme SDK admin with a structured block editor.

It does **not** introduce a second landing-page database, public resolver API or storefront renderer. Homepage blocks continue to use the existing tenant/store-scoped `hosted-theme-settings` record, saved-draft preview route and publish workflow.

## Existing architecture reused

The builder extends the current flow:

1. A registered theme manifest exposes the `sections` field.
2. The manifest supplies the section types and editable field definitions supported by that theme.
3. The Themes admin edits the current storefront draft.
4. **Save draft** writes the private draft revision.
5. `/theme-preview/{tenant}/{store}` renders the saved draft behind the authenticated admin session.
6. **Publish** copies the validated draft into the existing live storefront runtime.
7. `/native-stores/{tenant}/{store}` renders the published sections.

Pricing, products, option dependencies, VAT, basket, quotes, customer accounts, checkout, payment and orders remain owned by the SaaS services. Sections can present links and catalogue selections but cannot execute business logic.

## Builder controls

For every homepage section the admin can:

- add a block from the theme's approved block library;
- edit its text, images, links and structured items;
- drag it into a new position;
- use accessible up/down controls as an alternative to dragging;
- duplicate it;
- hide it without deleting it;
- expand or collapse its editing controls;
- delete it;
- save, preview, discard or publish through the existing revision workflow.

The first shared block library includes:

- hero banner;
- promotional banner;
- image and text;
- text block;
- custom card grid;
- product grid;
- category tiles;
- testimonials;
- trust badges;
- frequently asked questions;
- collection points;
- call to action.

Atlantis and Studio reference the same block definitions. Each theme remains responsible for its own visual rendering, so switching theme changes presentation without creating a second copy of the page content.

## Compatibility

Existing published section arrays are loaded without a migration. Known section types open in the structured editor. Older or custom section types retain their original object fields and receive a compatibility editor for common content fields.

Themes that do not declare structured `sectionTypes` keep the previous JSON textarea. This preserves compatibility for uploaded or installed themes until their manifests opt into the structured builder.

## Validation and limits

The internal theme API validates section payloads before the existing theme admin service stores them:

- maximum 30 homepage blocks;
- maximum 256 KiB of section JSON;
- bounded nested objects, arrays and strings;
- plain JSON objects only;
- safe section type format;
- prototype-pollution keys removed;
- invalid or non-finite values normalised or rejected.

Only authenticated tenant or super-admin sessions can save or publish theme revisions. Store resolution and mutations continue to require an exact storefront inside the authenticated tenant.

## Deliberate v1 scope

This phase covers the storefront homepage only. It does not add arbitrary HTML, JavaScript, third-party embeds or Builder.io. Product, category, cart, account and checkout pages continue to use their current theme route-view contracts.

Future phases can use the same manifest-driven system for reusable saved sections and structured content pages without introducing a parallel page-storage architecture.
