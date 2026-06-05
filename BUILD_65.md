# Build 65 — Admin Navigation + Launch Operations Menu

## Rule followed
Build 65 reuses the existing admin navigation source of truth:

- `src/config/admin-navigation.ts`
- `getAdminSidebarNavigation()`
- existing grouped sidebar rendering

No hardcoded sidebar links were added to layout components.
No duplicate sidebar was created.

## Changed files

- `src/config/admin-navigation.ts`
- `src/modules/launch/pages/launch-operations-page.tsx`
- `app/launch-operations/page.tsx`
- `BUILD_65.md`

## What Build 65 adds

### Sidebar group

Added a new grouped sidebar menu after `Print Store`:

- `Launch Operations`

Children:

- `Launch Operations` → `/launch-operations`
- `Location Manager` → `/location-manager`
- `Collection Handover` → `/collection-handover`
- `Ready Collection Automation` → `/ready-collection-automation`
- `Email Send Controls` → `/email-send-controls`

Roles:

- `admin`
- `tenant_admin`
- `owner`

### Registry metadata

Added the same launch links into `ADMIN_NAVIGATION_REGISTRY` for discovery/audit metadata.

### Hub page

Added:

- `/launch-operations`

The hub links to the launch tools above.

## Not changed

- No super-admin sidebar items.
- No sidebar component replacement.
- No checkout changes.
- No order, collection or email logic changes.

## Next recommended build
Build 66 — Launch Readiness Test Runner.
