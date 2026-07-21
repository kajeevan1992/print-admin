# Storefront media library

## Purpose

The Storefront Builder now includes a tenant- and storefront-scoped media library. Administrators can upload an image once and reuse its generated URL across the existing theme draft and publish workflow.

The feature does not introduce a second CMS, theme renderer or publishing system. Image references remain normal values inside the existing `hosted-theme-settings` draft and published snapshots.

## Supported editor locations

The shared picker is available for:

- theme manifest image fields;
- homepage section image fields;
- image fields inside repeaters;
- customer-facing content-page sections;
- content-page social sharing images;
- navigation and mega-menu feature images.

Administrators may still paste an internal or HTTPS image URL when an externally hosted asset is preferred.

## Storage

Uploaded bytes and metadata are stored in the runtime-created `StorefrontMediaAsset` PostgreSQL table.

Each record is scoped by:

- canonical tenant ID;
- tenant slug;
- storefront slug;
- unguessable media ID.

This avoids requiring an unconfigured third-party object-storage account. The implementation can later be migrated behind the same service/API contract if dedicated object storage is introduced.

## Upload validation

The server enforces the file type from magic bytes rather than trusting the browser-provided MIME type.

Accepted formats:

- JPEG;
- PNG;
- WebP;
- GIF;
- AVIF.

SVG and other active file formats are rejected. Current limits are:

- 8 MB per image;
- 80 assets per storefront;
- 100 MB total per storefront.

Exact duplicate uploads are deduplicated by SHA-256 checksum within the same tenant and storefront.

## Public delivery

Images are delivered from:

`/api/native-storefront/media/{tenantSlug}/{storeSlug}/{assetId}`

Responses include:

- the verified image MIME type;
- immutable public caching;
- a checksum ETag;
- `X-Content-Type-Options: nosniff`;
- an inline, sanitised filename.

The route verifies the tenant and storefront relationship before returning bytes.

## Deletion safety

An administrator cannot delete an image while its generated URL is still present in either:

- the storefront record; or
- the tenant/store `hosted-theme-settings` draft or published data.

The image must first be removed from the draft, published state and any remaining storefront content references. This prevents accidental broken images.

## Theme boundary

Built-in and uploaded themes receive only the resulting image URL through the existing approved theme settings. Themes do not receive:

- database access;
- upload authority;
- deletion authority;
- tenant resolution;
- media bytes through the admin API.

All upload and management actions require the existing authenticated tenant admin session.
