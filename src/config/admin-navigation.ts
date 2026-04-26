export type AdminNavigationRegistryItem = {
  label: string;
  href: string;
  iconKey?: string;
  insertAfterLabel?: string;
  parentLabel?: string;
  roles?: Array<'admin' | 'super_admin' | 'tenant_admin' | 'owner'>;
};

// Central place for new admin tools/pages that are added outside the original sidebar.
// Rule going forward: every new admin page must be registered here or directly in the main sidebar list.
export const ADMIN_NAVIGATION_REGISTRY: AdminNavigationRegistryItem[] = [
  {
    label: 'Print Maths Lab',
    href: '/print-maths-lab',
    iconKey: 'Calculator',
    insertAfterLabel: 'Pricing Engine',
    roles: ['admin', 'tenant_admin', 'owner']
  }
];
