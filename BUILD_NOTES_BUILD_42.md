# Build 42

## Scope
Added visible persistence status for Super Admin owner pages.

## Changed files

- `src/modules/super-admin/components/owner-persistence-status-banner.tsx`
- `src/modules/super-admin/components/owner-persistence-route-banner.tsx`
- `src/modules/super-admin/pages/owner-billing-plans-page.tsx`
- `src/components/layout/admin-shell.tsx`

## Summary

A shared persistence banner now shows whether owner page rows are saved database rows or seed rows.

Billing Plans is wired directly to `listWithMeta()` and shows a page-level banner with a persist seed action.

Other mapped owner pages get a route-level banner from `AdminShell`.

Covered route banner pages include backups, domains, incidents, maintenance windows, usage limits, SSO config, compliance center, webhooks, notifications and environments.

## Not changed

- No new storage system.
- No new routes.
- No UI redesign.
- No catalog changes.
- No VAT changes.
- No checkout changes.
- No public API changes.
