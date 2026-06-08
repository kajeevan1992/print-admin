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

export type AdminSidebarNavigationItem = {
  label: string;
  href?: string;
  iconKey: string;
  order?: number;
  roles?: AdminRole[];
  ownerOnly?: boolean;
  tenantOnly?: boolean;
  hidden?: boolean;
  featureFlagKey?: string;
  surface?: AdminNavigationSurface;
  children?: Array<{
    label: string;
    href: string;
    iconKey?: string;
    order?: number;
    roles?: AdminRole[];
    ownerOnly?: boolean;
    tenantOnly?: boolean;
    hidden?: boolean;
    featureFlagKey?: string;
    surface?: AdminNavigationSurface;
  }>;
};

const TENANT_ROLES: AdminRole[] = ['admin', 'tenant_admin', 'owner'];

// FOREVER RULE:
// This file is the single source of truth for admin/super-admin navigation.
// Do not hardcode sidebar items in layout components. Add or move pages here only.
const ADMIN_SIDEBAR_NAVIGATION: AdminSidebarNavigationItem[] = [
  { label: 'Dashboard', href: '/', iconKey: 'Home', order: 10, roles: TENANT_ROLES },
  { label: 'Workspace', href: '/workspace', iconKey: 'Sparkles', order: 20, roles: TENANT_ROLES },
  { label: 'Products', href: '/products', iconKey: 'Box', order: 30, roles: TENANT_ROLES },
  { label: 'Product Builder', href: '/product-builder-studio', iconKey: 'Box', order: 40, roles: TENANT_ROLES },
  { label: 'Config Templates', href: '/config-templates', iconKey: 'SlidersHorizontal', order: 50, roles: TENANT_ROLES },
  { label: 'Option Sets', href: '/option-sets', iconKey: 'Layers3', order: 60, roles: TENANT_ROLES },
  { label: 'Materials Library', href: '/materials-library', iconKey: 'Archive', order: 70, roles: TENANT_ROLES },
  { label: 'Finish Library', href: '/finish-library', iconKey: 'Palette', order: 80, roles: TENANT_ROLES },
  { label: 'Printer Profiles', href: '/printer-profiles', iconKey: 'Printer', order: 90, roles: TENANT_ROLES },
  { label: 'Product Rules Lab', href: '/product-rules-lab', iconKey: 'GitBranch', order: 100, roles: TENANT_ROLES },
  { label: 'Production Routing', href: '/production-routing-lab', iconKey: 'Printer', order: 110, roles: TENANT_ROLES },
  { label: 'Artwork Preflight', href: '/artwork-preflight-studio', iconKey: 'Shield', order: 120, roles: TENANT_ROLES },
  { label: 'Artwork Uploads', href: '/artwork-uploads', iconKey: 'UploadCloud', order: 125, roles: TENANT_ROLES },
  { label: 'Pricing Engine', href: '/pricing-engine-lab', iconKey: 'DollarSign', order: 130, roles: TENANT_ROLES },
  { label: 'Categories', href: '/categories', iconKey: 'Tags', order: 140, roles: TENANT_ROLES },
  { label: 'Collections', href: '/collections', iconKey: 'FolderTree', order: 150, roles: TENANT_ROLES },
  { label: 'Tags', href: '/tags', iconKey: 'Tag', order: 160, roles: TENANT_ROLES },
  { label: 'Orders', href: '/orders', iconKey: 'ClipboardList', order: 170, roles: TENANT_ROLES },
  { label: 'Artwork Proofing', href: '/artwork-proofing', iconKey: 'PenTool', order: 180, roles: TENANT_ROLES },
  { label: 'Artwork Intelligence', href: '/artwork-intelligence', iconKey: 'PenTool', order: 190, roles: TENANT_ROLES },
  { label: 'Quotations', href: '/quotes', iconKey: 'FileText', order: 200, roles: TENANT_ROLES },
  { label: 'Pricing', href: '/pricing', iconKey: 'DollarSign', order: 210, roles: TENANT_ROLES },
  { label: 'Pricing Rules', href: '/pricing-rules', iconKey: 'BadgePoundSterling', order: 220, roles: TENANT_ROLES },
  { label: 'Pricing Command', href: '/pricing-command', iconKey: 'BadgePoundSterling', order: 230, roles: TENANT_ROLES },
  { label: 'Reports', href: '/reports', iconKey: 'BarChart3', order: 240, roles: [...TENANT_ROLES, 'super_admin'] },
  { label: 'Activity Log', href: '/activity-log', iconKey: 'Activity', order: 250, roles: TENANT_ROLES },
  { label: 'Print Store', href: '/channels', iconKey: 'Store', order: 260, roles: TENANT_ROLES },
  { label: 'Launch Operations', iconKey: 'Rocket', order: 265, roles: TENANT_ROLES, children: [
    { label: 'Launch Operations', href: '/launch-operations', iconKey: 'Rocket', order: 10 },
    { label: 'Launch Readiness', href: '/launch-readiness', iconKey: 'ShieldCheck', order: 15 },
    { label: 'Location Manager', href: '/location-manager', iconKey: 'Map', order: 20 },
    { label: 'Collection Handover', href: '/collection-handover', iconKey: 'ClipboardCheck', order: 30 },
    { label: 'Ready Collection Automation', href: '/ready-collection-automation', iconKey: 'Activity', order: 40 },
    { label: 'Email Send Controls', href: '/email-send-controls', iconKey: 'Mail', order: 50 }
  ]},
  { label: 'Users', iconKey: 'Users', order: 270, roles: TENANT_ROLES, children: [
    { label: 'Users', href: '/users', iconKey: 'Users', order: 10 },
    { label: 'Site Users', href: '/site-users', iconKey: 'UserCircle2', order: 20 },
    { label: 'User Groups', href: '/user-groups', iconKey: 'Users2', order: 30 },
    { label: 'User Roles', href: '/user-roles', iconKey: 'Shield', order: 40 },
    { label: 'User Projects', href: '/user-projects', iconKey: 'FolderKanban', order: 50 },
    { label: 'User Carts', href: '/user-carts', iconKey: 'ShoppingCart', order: 60 }
  ]},
  { label: 'Trade Vendors', href: '/vendors', iconKey: 'Truck', order: 280, roles: TENANT_ROLES },
  { label: 'Site Theme', href: '/themes', iconKey: 'Palette', order: 290, roles: TENANT_ROLES },
  { label: 'Print Parametric', iconKey: 'SlidersHorizontal', order: 300, roles: TENANT_ROLES, children: [
    { label: 'Parametric Setup', href: '/parametric-setup', iconKey: 'SlidersHorizontal', order: 10 },
    { label: 'Parametric Products', href: '/parametric-products', iconKey: 'Boxes', order: 20 },
    { label: 'Parametric Rules Engine', href: '/parametric-rules-engine', iconKey: 'Bot', order: 30 },
    { label: 'Parametric Libraries', href: '/parametric-libraries', iconKey: 'Archive', order: 40 }
  ]},
  { label: 'Content', iconKey: 'FileText', order: 310, roles: TENANT_ROLES, children: [
    { label: 'Content', href: '/content', iconKey: 'FileText', order: 10 },
    { label: 'Blog Content', href: '/blog-content', iconKey: 'ScrollText', order: 20 },
    { label: 'Page Content', href: '/page-content', iconKey: 'LayoutPanelTop', order: 30 },
    { label: 'Product Content', href: '/product-content', iconKey: 'FileText', order: 40 },
    { label: 'Tag Content', href: '/tag-content', iconKey: 'Tag', order: 50 },
    { label: 'Landing Pages', href: '/landing-pages', iconKey: 'LayoutPanelTop', order: 60 },
    { label: 'Category CMS', href: '/category-cms', iconKey: 'Tags', order: 70 },
    { label: 'Extended Content', href: '/extended-content', iconKey: 'FileText', order: 80 },
    { label: 'SEO Engine', href: '/seo-engine', iconKey: 'Target', order: 90 },
    { label: 'SEO Templates', href: '/seo-templates', iconKey: 'Sparkles', order: 95 },
    { label: 'SEO Analytics', href: '/seo-analytics', iconKey: 'BarChart3', order: 96 },
    { label: 'Search Console', href: '/seo-search-console', iconKey: 'Search', order: 97 },
    { label: 'HTML Snippets', href: '/html-snippets', iconKey: 'FileText', order: 100 }
  ]},
  { label: 'Settings', iconKey: 'Settings', order: 320, roles: TENANT_ROLES, children: [
    { label: 'General Settings', href: '/settings', iconKey: 'Settings', order: 10 },
    { label: 'Changelog', href: '/changelog', iconKey: 'ScrollText', order: 20 },
    { label: 'API Access', href: '/api-access', iconKey: 'KeyRound', order: 30 },
    { label: 'API Keys', href: '/api-keys', iconKey: 'KeyRound', order: 40 },
    { label: 'Admin Users', href: '/admin-users', iconKey: 'Shield', order: 50 },
    { label: 'Licensing Center', href: '/licensing-center', iconKey: 'KeyRound', order: 60 },
    { label: 'Tenant Control', href: '/tenant-control', iconKey: 'Building2', order: 70 },
    { label: 'Database Manager', href: '/database-manager', iconKey: 'DatabaseBackup', order: 80 },
    { label: 'Organizations', href: '/organizations', iconKey: 'Building2', order: 90 },
    { label: 'Merchant Accounts', href: '/merchant-accounts', iconKey: 'CreditCard', order: 100 },
    { label: 'Shipping Methods', href: '/shipping-methods', iconKey: 'Package', order: 110 },
    { label: 'Tax / VAT Settings', href: '/tax-vat-settings', iconKey: 'Receipt', order: 120 },
    { label: 'Invoice Settings', href: '/settings/invoice', iconKey: 'FileText', order: 125 },
    { label: 'Email Account', href: '/email-account', iconKey: 'Mail', order: 130 },
    { label: 'Email Settings', href: '/email-settings', iconKey: 'Mail', order: 135 },
    { label: 'Email Outbox', href: '/email-outbox', iconKey: 'Mail', order: 136 },
    { label: 'Email Notifications', href: '/email-notifications', iconKey: 'Bell', order: 140 },
    { label: 'Checkout Fields', href: '/checkout-fields', iconKey: 'FormInput', order: 150 },
    { label: 'Checkout Styles', href: '/checkout-styles', iconKey: 'LayoutPanelTop', order: 160 },
    { label: 'Promotion Codes', href: '/promotion-codes', iconKey: 'TicketPercent', order: 170 },
    { label: 'Country List', href: '/country-list', iconKey: 'Globe2', order: 180 },
    { label: 'Translations', href: '/translations', iconKey: 'Languages', order: 190 }
  ]},
  { label: 'Advanced', iconKey: 'Wrench', order: 330, roles: TENANT_ROLES, children: [
    { label: 'Attribute Sets', href: '/attribute-sets', iconKey: 'Tags', order: 10 },
    { label: 'Inventory', href: '/inventory', iconKey: 'Archive', order: 20 },
    { label: 'Order Status', href: '/order-status', iconKey: 'ClipboardList', order: 30 },
    { label: 'Packaging Studio', href: '/packaging-studio', iconKey: 'Package', order: 40 },
    { label: 'Redirects', href: '/redirects', iconKey: 'GitBranch', order: 50 },
    { label: 'Robots.txt', href: '/robots-txt', iconKey: 'Bot', order: 60 },
    { label: 'Site Bindings', href: '/site-bindings', iconKey: 'Globe2', order: 70 },
    { label: 'Store Clone', href: '/store-clone', iconKey: 'Store', order: 80 },
    { label: 'FTP Accounts', href: '/ftp-accounts', iconKey: 'HardDrive', order: 90 },
    { label: 'Clean Up Manager', href: '/clean-up-manager', iconKey: 'Trash2', order: 100 },
    { label: 'Error Log', href: '/error-log', iconKey: 'AlertTriangle', order: 110 }
  ]},
  { label: 'Production', iconKey: 'Factory', order: 340, roles: TENANT_ROLES, children: [
    { label: 'Production', href: '/production', iconKey: 'Factory', order: 10 },
    { label: 'Production Planner', href: '/production-planner', iconKey: 'LayoutGrid', order: 20 },
    { label: 'Dispatch Center', href: '/dispatch-center', iconKey: 'Truck', order: 30 },
    { label: 'Printer Management', href: '/printer-management', iconKey: 'Printer', order: 40 },
    { label: 'Production Board', href: '/production-board', iconKey: 'LayoutGrid', order: 50 }
  ]},
  { label: 'Account', iconKey: 'User', order: 350, roles: TENANT_ROLES, children: [
    { label: 'Admin Theme', href: '/admin-theme', iconKey: 'Palette', order: 10 },
    { label: 'Uptime Report', href: '/uptime-report', iconKey: 'HeartPulse', order: 20 },
    { label: 'Support Tickets', href: '/support-tickets', iconKey: 'LifeBuoy', order: 30 }
  ]},
  { label: 'Support', iconKey: 'LifeBuoy', order: 360, roles: TENANT_ROLES, children: [
    { label: 'Support', href: '/support', iconKey: 'LifeBuoy', order: 10 },
    { label: 'Knowledge Base', href: '/knowledge-base', iconKey: 'BookOpen', order: 20 }
  ]},
];

export const adminSidebarNavigation = ADMIN_SIDEBAR_NAVIGATION;

export const adminNavigationRegistry: AdminNavigationRegistryItem[] = ADMIN_SIDEBAR_NAVIGATION.flatMap((item) => {
  if (!item.children?.length) return item.href ? [{ label: item.label, href: item.href, iconKey: item.iconKey, order: item.order, roles: item.roles, ownerOnly: item.ownerOnly, tenantOnly: item.tenantOnly, hidden: item.hidden, featureFlagKey: item.featureFlagKey, surface: item.surface }] : [];
  return item.children.map((child) => ({ ...child, parentLabel: item.label, groupLabel: item.label, roles: child.roles || item.roles, ownerOnly: child.ownerOnly ?? item.ownerOnly, tenantOnly: child.tenantOnly ?? item.tenantOnly, hidden: child.hidden ?? item.hidden, featureFlagKey: child.featureFlagKey || item.featureFlagKey, surface: child.surface || item.surface }));
});
