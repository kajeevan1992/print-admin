export type AdminRole = 'admin' | 'super_admin' | 'tenant_admin' | 'owner';

export type AdminNavigationRegistryItem = {
  label: string;
  href: string;
  iconKey?: string;
  insertAfterLabel?: string;
  parentLabel?: string;
  roles?: AdminRole[];
  ownerOnly?: boolean;
  tenantOnly?: boolean;
  hidden?: boolean;
  featureFlagKey?: string;
  description?: string;
};

// Central place for new admin tools/pages that are added outside the original sidebar.
// Rule going forward: every new admin page must be registered here or directly in the main sidebar list.
// v235 adds role/visibility metadata so labs/tools do not leak into the wrong console.
export const ADMIN_NAVIGATION_REGISTRY: AdminNavigationRegistryItem[] = [
  {
    label: 'Print Maths Lab',
    href: '/print-maths-lab',
    iconKey: 'Calculator',
    insertAfterLabel: 'Pricing Engine',
    roles: ['admin', 'tenant_admin', 'owner', 'super_admin'],
    description: 'Internal print maths and cost test bench for pricing validation.'
  }
];

export function isRegistryItemVisible(
  item: AdminNavigationRegistryItem,
  role?: string | null,
  enabledFeatureFlags: string[] = []
) {
  if (item.hidden) return false;

  const normalizedRole = role === 'super_admin' || role === 'owner' || role === 'tenant_admin' || role === 'admin'
    ? role
    : 'admin';

  if (item.roles?.length && !item.roles.includes(normalizedRole)) {
    return false;
  }

  if (item.ownerOnly && normalizedRole !== 'owner' && normalizedRole !== 'super_admin') {
    return false;
  }

  if (item.tenantOnly && (normalizedRole === 'owner' || normalizedRole === 'super_admin')) {
    return false;
  }

  if (item.featureFlagKey && !enabledFeatureFlags.includes(item.featureFlagKey)) {
    return false;
  }

  return true;
}

export function getVisibleAdminNavigationRegistry(role?: string | null, enabledFeatureFlags: string[] = []) {
  return ADMIN_NAVIGATION_REGISTRY.filter((item) => isRegistryItemVisible(item, role, enabledFeatureFlags));
}
