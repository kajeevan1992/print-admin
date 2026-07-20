# Storefront content pages

## Purpose

Storefront content pages extend the existing Theme SDK section builder beyond the homepage. A tenant can create About, Contact, service and campaign pages without introducing a separate landing-page database, renderer or publishing system.

## Canonical storage and publishing

Pages are stored in `content.pages` inside the existing tenant/store-scoped `hosted-theme-settings` draft and published snapshots.

The existing Storefront Builder controls remain authoritative:

1. edit homepage, pages, brand and theme settings;
2. save one private draft;
3. open the authenticated draft preview;
4. discard the draft or publish one storefront revision.

No new database table, public resolver API, API key round trip or independent page version was added.

## Page controls

Each page supports:

- a clean path with up to three segments;
- title and summary;
- visible or hidden state;
- optional automatic storefront navigation entry;
- navigation label and ordering;
- SEO title and description;
- social sharing image;
- optional `noindex, nofollow` metadata;
- the same approved section library used by the homepage.

The editor includes blank, About, Contact and Campaign templates. Templates only provide starting content; they use the same section records as manually built pages.

## Route safety

The SaaS reserves account, search, basket, checkout, quotation, verification and other protected storefront roots. Custom pages cannot publish over those routes.

Catalogue routes also retain precedence:

- a one-segment category path remains a category;
- an existing category/product path remains a product;
- protected account and checkout routes are handled before content-page resolution.

Hidden pages return not found on the public storefront. Authenticated draft preview can still render them for review.

## Theme rendering

Atlantis and Studio render page sections through their existing theme-specific homepage block renderers. The content page changes the section collection only; it does not duplicate block components or storefront chrome.

Uploaded themes remain backward compatible because `pages` is optional in the runtime contract. A future uploaded theme may opt into the same manifest field and data model.

## Navigation

Pages marked for navigation are appended to the resolved storefront menu unless that path already exists. The menu builder and explicit theme navigation continue to take precedence.

## Legacy consolidation

The following older editing surfaces redirect to Storefront Builder:

- `/landing-pages`
- `/page-content`
- `/site-block-editor`
- `/site-designer`

The old `/api/internal/hosted-theme-editor` writer returns HTTP 410 after admin authentication. The active internal mutation route is `/api/internal/storefront-themes`.

Admin navigation exposes one Storefront Builder destination and removes the duplicate page/editor entries.

## Commerce authority

Content pages cannot alter tenant resolution, products, product options, pricing, VAT, quotations, baskets, customer sessions, checkout, payments, artwork or orders. Those remain owned by SaaS services and protected route controllers.
