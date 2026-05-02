export type AdminRole = 'admin' | 'super_admin' | 'tenant_admin' | 'owner';

export type AdminNavigationSurface = 'sidebar' | 'topbar' | 'both';

export type AdminNavigationRegistryItem = {
  label: string;
  href: string;
  iconKey?: string;
  insertAfterLabel?: string;
  parentLabel?: string;
  groupLabel?: string;
  order?: number;
  roles?: AdminRole[];
  ownerOnly?: boolean;
  tenantOnly?: boolean;
  hidden?: boolean;
  featureFlagKey?: string;
  surface?: AdminNavigationSurface;
  description?: string;
};

// Central place for new admin tools/pages that are added outside the original sidebar.
// Rule going forward: every new admin page must be registered here or directly in the main sidebar list.
export const ADMIN_NAVIGATION_REGISTRY: AdminNavigationRegistryItem[] = [
  {
    label: 'Pricing Engine Lab',
    href: '/pricing-engine-lab',
    iconKey: 'Calculator',
    insertAfterLabel: 'Pricing Engine',
    groupLabel: 'Pricing',
    order: 10,
    roles: ['admin', 'tenant_admin', 'owner', 'super_admin'],
    surface: 'both',
    description: 'Interactive pricing diagnostics and option-selection test bench.'
  },
  {
    label: 'Print Maths Lab',
    href: '/print-maths-lab',
    iconKey: 'Calculator',
    insertAfterLabel: 'Pricing Engine Lab',
    groupLabel: 'Pricing',
    order: 20,
    roles: ['admin', 'tenant_admin', 'owner', 'super_admin'],
    surface: 'both',
    description: 'Internal print maths, sheet fit, cost, quote, and draft-order test bench.'
  },
  {
    label: 'Product Rules Builder',
    href: '/product-rules-builder',
    iconKey: 'GitBranch',
    insertAfterLabel: 'Product Rules Lab',
    groupLabel: 'Catalog',
    order: 30,
    roles: ['admin', 'tenant_admin', 'owner', 'super_admin'],
    surface: 'sidebar',
    description: 'Advanced JSON rules editor for product option conditions and actions.'
  },
  {
    label: 'Visual Rules Builder',
    href: '/product-rules-visual',
    iconKey: 'GitBranch',
    insertAfterLabel: 'Product Rules Builder',
    groupLabel: 'Catalog',
    order: 31,
    roles: ['admin', 'tenant_admin', 'owner', 'super_admin'],
    surface: 'sidebar',
    description: 'No-code IF/THEN visual rule builder for product configurator logic.'
  },
  {
    label: 'Storefront Content Builder',
    href: '/product-storefront-content',
    iconKey: 'FileText',
    insertAfterLabel: 'Product Builder',
    groupLabel: 'Catalog',
    order: 32,
    roles: ['admin', 'tenant_admin', 'owner', 'super_admin'],
    surface: 'sidebar',
    description: 'Product-specific storefront images, descriptions, delivery, artwork files, FAQs and related products.'
  },
  {
    label: 'Admin Hardening',
    href: '/admin-hardening',
    iconKey: 'ShieldCheck',
    parentLabel: 'Advanced',
    groupLabel: 'System',
    order: 80,
    roles: ['admin', 'tenant_admin', 'owner', 'super_admin'],
    surface: 'sidebar',
    description: 'Admin and super-admin readiness dashboard for catalog, storefront, checkout and order workflow.'
  },
  {
    label: 'Navigation Registry',
    href: '/navigation-registry',
    iconKey: 'Map',
    parentLabel: 'Advanced',
    groupLabel: 'System',
    order: 90,
    roles: ['admin', 'tenant_admin', 'owner', 'super_admin'],
    surface: 'sidebar',
    description: 'Checks registered admin pages, role visibility, and missing menu/page issues.'
  },
  {
    label: 'System QA Audit',
    href: '/system-qa-audit',
    iconKey: 'ClipboardCheck',
    parentLabel: 'Advanced',
    groupLabel: 'System',
    order: 100,
    roles: ['admin', 'tenant_admin', 'owner', 'super_admin'],
    surface: 'sidebar',
    description: 'System QA audit, repair tracker, and post-deploy smoke checklist.'
  },
  {
    label: 'Live Readiness',
    href: '/live-readiness',
    iconKey: 'ShieldCheck',
    parentLabel: 'Advanced',
    groupLabel: 'System',
    order: 105,
    roles: ['admin', 'tenant_admin', 'owner', 'super_admin'],
    surface: 'sidebar',
    description: 'Pre-live checklist for environment, API boundaries, demo data, pricing, and customer flow.'
  }
];

export function normalizeAdminRole(role?: string | null): AdminRole {
  return role === 'super_admin' || role === 'owner' || role === 'tenant_admin' || role === 'admin'
    ? role
    : 'admin';
}

export function isRegistryItemVisible(
  item: AdminNavigationRegistryItem,
  role?: string | null,
  enabledFeatureFlags: string[] = [],
  surface: AdminNavigationSurface | 'any' = 'any'
) {
  if (item.hidden) return false;

  const normalizedRole = normalizeAdminRole(role);

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

  if (surface !== 'any') {
    const itemSurface = item.surface ?? 'sidebar';
    if (itemSurface !== surface && itemSurface !== 'both') return false;
  }

  return true;
}

export function sortAdminNavigationRegistry(items: AdminNavigationRegistryItem[]) {
  return [...items].sort((a, b) => {
    const groupCompare = (a.groupLabel ?? '').localeCompare(b.groupLabel ?? '');
    if (groupCompare !== 0) return groupCompare;
    return (a.order ?? 999) - (b.order ?? 999) || a.label.localeCompare(b.label);
  });
}

export function getVisibleAdminNavigationRegistry(
  role?: string | null,
  enabledFeatureFlags: string[] = [],
  surface: AdminNavigationSurface | 'any' = 'any'
) {
  return sortAdminNavigationRegistry(
    ADMIN_NAVIGATION_REGISTRY.filter((item) => isRegistryItemVisible(item, role, enabledFeatureFlags, surface))
  );
}

export function validateAdminNavigationRegistry(items: AdminNavigationRegistryItem[] = ADMIN_NAVIGATION_REGISTRY) {
  const seenHref = new Set<string>();
  const seenLabel = new Set<string>();
  const warnings: string[] = [];
  const errors: string[] = [];

  for (const item of items) {
    if (!item.label?.trim()) errors.push('A registry item is missing label.');
    if (!item.href?.startsWith('/')) errors.push(`${item.label || 'Unknown item'} must use an absolute href.`);

    const hrefKey = item.href.toLowerCase();
    if (seenHref.has(hrefKey)) errors.push(`Duplicate navigation href: ${item.href}`);
    seenHref.add(hrefKey);

    const labelKey = item.label.toLowerCase();
    if (seenLabel.has(labelKey)) warnings.push(`Duplicate navigation label: ${item.label}`);
    seenLabel.add(labelKey);

    if (item.parentLabel && item.insertAfterLabel) {
      warnings.push(`${item.label} has both parentLabel and insertAfterLabel; parentLabel wins.`);
    }

    if (!item.groupLabel) warnings.push(`${item.label} is missing groupLabel.`);
    if (!item.description) warnings.push(`${item.label} is missing description.`);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings
  };
}
