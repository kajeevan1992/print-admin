# Storefront publish history

## Purpose

Storefront Publish History gives each tenant and storefront an immutable record of live theme, homepage, navigation, media references and content-page snapshots.

It replaces the old tenant-facing Theme Version Manager, which controlled hosted theme ZIP package versions rather than the tenant's published storefront content.

## Capture behaviour

A history snapshot is recorded after every successful Storefront Builder publish.

The snapshot contains the complete published storefront theme state:

- selected theme key;
- branding values;
- theme layout settings;
- homepage sections;
- content pages and page sections;
- header and footer navigation;
- uploaded storefront media references;
- publish time, actor and checksum.

When a tenant opens publish history for the first time, the current live version is backfilled as a baseline if no immutable record exists yet. Versions that predate this feature cannot be reconstructed if they were already overwritten.

## Restore behaviour

Restoring never changes the live version number backwards and never edits an old history record.

The selected snapshot is copied and published as the next version. For example, restoring version 3 while version 8 is live creates version 9 with `restoredFromVersion: 3`.

This preserves:

- the version that was live before the restore;
- the original historical snapshot;
- a complete forward-only audit trail;
- the ability to restore again later.

The restore request requires:

- an authenticated tenant admin session;
- exact tenant and storefront ownership;
- a valid historical version;
- the confirmation text `RESTORE VERSION <number>`;
- the current live version observed by the browser.

If another publish occurs after the history page loads, the restore is rejected until the administrator refreshes. This prevents a stale browser from overwriting a newer live storefront.

## Retention

The latest 50 snapshots are retained per storefront. Older snapshots are removed only after a newer immutable snapshot is safely inserted.

## Theme availability

A historical version can be restored only while its theme remains installed in the SaaS theme registry. The history remains visible if the theme is removed, but restore is blocked until that theme is available again.

## Tenant isolation

History records use the canonical tenant scope and exact storefront slug. Tenant administrators cannot list or restore versions belonging to another tenant or storefront.

The API is:

- `GET /api/internal/storefront-publish-history?storeSlug=<slug>`
- `POST /api/internal/storefront-publish-history` with action `restore`

Both responses are private and `no-store`.

## Platform theme packages

Platform hosted-theme ZIP package versions remain a separate super-admin concern. Their existing API now requires a super-admin session and is not used for tenant storefront rollback.

## Theme authority boundary

Uploaded and built-in themes receive only the restored published snapshot through the existing Storefront Builder runtime contract. History capture, tenant resolution, version numbering, restore confirmation, concurrency protection and database writes remain SaaS-owned.
