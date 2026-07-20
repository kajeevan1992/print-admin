# Storefront private route hardening

## Purpose

Customer account, checkout state, basket, quote and search pages are operational storefront routes rather than public marketing content. They must not be indexed, cached publicly or leak security tokens through browser referrers and history.

This phase hardens the existing native storefront route. It does not add another account route, authentication service or SEO system.

## Central route policy

`src/theme-runtime/private-route-policy.ts` is the single policy source for private route roots and sensitive token-bearing routes.

Private routes include:

- sign in, registration and two-step verification;
- forgot/reset password and email verification/change confirmation;
- customer account pages;
- basket, quote request and quote status;
- checkout success/cancel state;
- storefront search results.

## Search engine and cache controls

Private routes return:

- `robots` metadata with noindex, nofollow, noarchive, nosnippet and noimageindex;
- no canonical, Open Graph or Twitter URL metadata;
- `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex`;
- `Referrer-Policy: no-referrer`;
- `Cache-Control: private, no-store, max-age=0, must-revalidate`;
- `Pragma: no-cache`.

Public homepages, categories, products, collection points and enabled content pages keep their current canonical and index behaviour.

## Sensitive URL cleanup

Reset-password, email-verification and email-change confirmation URLs still provide their token to the server-rendered page. Once the client has loaded, the token-like query parameters are removed using `history.replaceState`.

The cleanup removes only known sensitive keys. Safe parameters such as `return` are preserved.

## Theme authority boundary

The protection is applied by the SaaS route and middleware before theme rendering. Atlantis, Studio and approved uploaded themes cannot opt out of private-route indexing, referrer or cache controls.
