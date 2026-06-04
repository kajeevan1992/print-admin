# Build 41

## Scope
Small stability pass for Super Admin owner pages.

## Changed

- `src/services/owner-records-db.service.ts`

## Summary

The shared owner page data service now exposes `listWithMeta()` as well as the existing `list()` method.

When there are no saved rows for a section, the service returns that section's seed rows. This keeps pages useful after a fresh deploy instead of showing an empty screen.

When a seed row is saved, internal helper fields are stripped before saving the business record.

## Existing behaviour preserved

- `list()` still returns rows.
- `save()` still saves one row.
- `delete()` still removes one row.
- `reset()` still saves the section seed rows.

## Not changed

- No new UI.
- No new pages.
- No catalog changes.
- No VAT changes.
- No checkout changes.
- No public API changes.
