# Storefront navigation and chrome builder

## Purpose

The Storefront Builder is the single admin surface for theme choice, branding, homepage sections, content pages, header navigation and footer presentation.

This phase consolidates the previous standalone Menu Builder into the existing tenant/store-scoped `hosted-theme-settings` draft and publishing records. It does not add another menu table, content API, storefront renderer or versioning system.

## Migration and authority

Older tenants may already have menu items in the legacy `admin-config / storefront-menu-builder` record.

- When a storefront has no theme-managed navigation, those items are loaded into the Storefront Builder as the initial value.
- The first saved draft marks navigation as managed by the theme draft.
- Publishing copies the same navigation into the live storefront snapshot.
- An intentionally empty managed menu remains empty; the legacy fallback does not return.
- The old `/menu-builder` route redirects to Storefront Builder.
- The obsolete standalone client writer and service have been removed.
- The legacy record remains read-only as a compatibility source for tenants that have not yet saved the consolidated editor.

## Admin controls

The navigation editor supports:

- up to 10 top-level links;
- up to 12 dropdown links per top-level item;
- up to 60 total navigation records;
- internal storefront paths;
- enable and disable controls;
- ordering controls;
- duplication and deletion;
- dropdown column titles;
- top-level feature descriptions and images.

Header and footer controls also include:

- announcement text and highlights;
- search, fulfilment selector and customer-account visibility;
- footer description and copyright text;
- newsletter strip text and optional HTTPS/internal form action;
- footer statistics using `Label | Value` lines;
- visibility controls for the announcement bar, footer, newsletter and statistics.

## Runtime behaviour

The published navigation snapshot is used by both Atlantis and Studio.

- Header desktop and mobile navigation use the same data.
- Dropdown links are grouped into columns by their configured column title.
- Top-level feature images and descriptions feed the mega-menu presentation.
- Footer columns are derived from the same navigation, preventing header/footer drift.
- Content pages marked for navigation continue to be appended only when their path is not already present.
- Product, category, account, basket, checkout, quote and other SaaS-controlled routes retain precedence.

## Validation

Server-side validation enforces:

- internal paths only;
- HTTPS or internal feature images;
- bounded labels, descriptions and total payload size;
- unique top-level paths;
- valid top-level parent references;
- one navigation level only;
- item and child limits;
- prototype-pollution key removal.

The Theme and storefront safety workflow remains the merge gate.
