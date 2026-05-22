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

// FOREVER RULE:
// This file is the single source of truth for admin/super-admin navigation.
// Do not hardcode sidebar items in layout components. Add or move pages here only.
const ADMIN_SIDEBAR_NAVIGATION: AdminSidebarNavigationItem[] = [
  { label: 'Dashboard', href: '/', iconKey: 'Home', order: 10, roles: ['admin', 'tenant_admin', 'owner'] },
  { label: 'Workspace', href: '/workspace', iconKey: 'Sparkles', order: 20, roles: ['admin', 'tenant_admin', 'owner'] },
  { label: 'Products', href: '/products', iconKey: 'Box', order: 30, roles: ['admin', 'tenant_admin', 'owner'] },
  { label: 'Product Builder', href: '/product-builder-studio', iconKey: 'Box', order: 40, roles: ['admin', 'tenant_admin', 'owner'] },
  { label: 'Config Templates', href: '/config-templates', iconKey: 'SlidersHorizontal', order: 50, roles: ['admin', 'tenant_admin', 'owner'] },
  { label: 'Option Sets', href: '/option-sets', iconKey: 'Layers3', order: 60, roles: ['admin', 'tenant_admin', 'owner'] },
  { label: 'Materials Library', href: '/materials-library', iconKey: 'Archive', order: 70, roles: ['admin', 'tenant_admin', 'owner'] },
  { label: 'Finish Library', href: '/finish-library', iconKey: 'Palette', order: 80, roles: ['admin', 'tenant_admin', 'owner'] },
  { label: 'Printer Profiles', href: '/printer-profiles', iconKey: 'Printer', order: 90, roles: ['admin', 'tenant_admin', 'owner'] },
  { label: 'Product Rules Lab', href: '/product-rules-lab', iconKey: 'GitBranch', order: 100, roles: ['admin', 'tenant_admin', 'owner'] },
  { label: 'Production Routing', href: '/production-routing-lab', iconKey: 'Printer', order: 110, roles: ['admin', 'tenant_admin', 'owner'] },
  { label: 'Artwork Preflight', href: '/artwork-preflight-studio', iconKey: 'Shield', order: 120, roles: ['admin', 'tenant_admin', 'owner'] },
  { label: 'Artwork Uploads', href: '/artwork-uploads', iconKey: 'UploadCloud', order: 125, roles: ['admin', 'tenant_admin', 'owner'] },
  { label: 'Pricing Engine', href: '/pricing-engine-lab', iconKey: 'DollarSign', order: 130, roles: ['admin', 'tenant_admin', 'owner'] },
  { label: 'Categories', href: '/categories', iconKey: 'Tags', order: 140, roles: ['admin', 'tenant_admin', 'owner'] },
  { label: 'Collections', href: '/collections', iconKey: 'FolderTree', order: 150, roles: ['admin', 'tenant_admin', 'owner'] },
  { label: 'Tags', href: '/tags', iconKey: 'Tag', order: 160, roles: ['admin', 'tenant_admin', 'owner'] },
  { label: 'Orders', href: '/orders', iconKey: 'ClipboardList', order: 170, roles: ['admin', 'tenant_admin', 'owner'] },
  { label: 'Artwork Proofing', href: '/artwork-proofing', iconKey: 'PenTool', order: 180, roles: ['admin', 'tenant_admin', 'owner'] },
  { label: 'Artwork Intelligence', href: '/artwork-intelligence', iconKey: 'PenTool', order: 190, roles: ['admin', 'tenant_admin', 'owner'] },
  { label: 'Quotations', href: '/quotes', iconKey: 'FileText', order: 200, roles: ['admin', 'tenant_admin', 'owner'] },
  { label: 'Pricing', href: '/pricing', iconKey: 'DollarSign', order: 210, roles: ['admin', 'tenant_admin', 'owner'] },
  { label: 'Pricing Rules', href: '/pricing-rules', iconKey: 'BadgePoundSterling', order: 220, roles: ['admin', 'tenant_admin', 'owner'] },
  { label: 'Pricing Command', href: '/pricing-command', iconKey: 'BadgePoundSterling', order: 230, roles: ['admin', 'tenant_admin', 'owner'] },
  { label: 'Reports', href: '/reports', iconKey: 'BarChart3', order: 240, roles: ['admin', 'tenant_admin', 'owner', 'super_admin'] },
  { label: 'Activity Log', href: '/activity-log', iconKey: 'Activity', order: 250, roles: ['admin', 'tenant_admin', 'owner'] },
  { label: 'Print Store', href: '/channels', iconKey: 'Store', order: 260, roles: ['admin', 'tenant_admin', 'owner'] },
  { label: 'Users', iconKey: 'Users', order: 270, roles: ['admin', 'tenant_admin', 'owner'], children: [
    { label: 'Users', href: '/users', iconKey: 'Users', order: 10 },
    { label: 'Site Users', href: '/site-users', iconKey: 'UserCircle2', order: 20 },
    { label: 'User Groups', href: '/user-groups', iconKey: 'Users2', order: 30 },
    { label: 'User Roles', href: '/user-roles', iconKey: 'Shield', order: 40 },
    { label: 'User Projects', href: '/user-projects', iconKey: 'FolderKanban', order: 50 },
    { label: 'User Carts', href: '/user-carts', iconKey: 'ShoppingCart', order: 60 }
  ]},
  { label: 'Trade Vendors', href: '/vendors', iconKey: 'Truck', order: 280, roles: ['admin', 'tenant_admin', 'owner'] },
  { label: 'Site Theme', href: '/themes', iconKey: 'Palette', order: 290, roles: ['admin', 'tenant_admin', 'owner'] },
  { label: 'Print Parametric', iconKey: 'SlidersHorizontal', order: 300, roles: ['admin', 'tenant_admin', 'owner'], children: [
    { label: 'Parametric Setup', href: '/parametric-setup', iconKey: 'SlidersHorizontal', order: 10 },
    { label: 'Parametric Products', href: '/parametric-products', iconKey: 'Boxes', order: 20 },
    { label: 'Parametric Rules Engine', href: '/parametric-rules-engine', iconKey: 'Bot', order: 30 },
    { label: 'Parametric Libraries', href: '/parametric-libraries', iconKey: 'Archive', order: 40 }
  ]},
  { label: 'Content', iconKey: 'FileText', order: 310, roles: ['admin', 'tenant_admin', 'owner'], children: [
    { label: 'Content', href: '/content', iconKey: 'FileText', order: 10 },
    { label: 'Blog Content', href: '/blog-content', iconKey: 'ScrollText', order: 20 },
    { label: 'Page Content', href: '/page-content', iconKey: 'LayoutPanelTop', order: 30 },
    { label: 'Product Content', href: '/product-content', iconKey: 'FileText', order: 40 },
    { label: 'Tag Content', href: '/tag-content', iconKey: 'Tag', order: 50 },
    { label: 'Landing Pages', href: '/landing-pages', iconKey: 'LayoutPanelTop', order: 60 },
    { label: 'Category CMS', href: '/category-cms', iconKey: 'Tags', order: 70 },
    { label: 'Extended Content', href: '/extended-content', iconKey: 'FileText', order: 80 },
    { label: 'HTML Snippets', href: '/html-snippets', iconKey: 'FileText', order: 90 }
  ]},
  { label: 'Settings', iconKey: 'Settings', order: 320, roles: ['admin', 'tenant_admin', 'owner'], children: [
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
  { label: 'Advanced', iconKey: 'Wrench', order: 330, roles: ['admin', 'tenant_admin', 'owner'], children: [
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
  { label: 'Production', iconKey: 'Factory', order: 340, roles: ['admin', 'tenant_admin', 'owner'], children: [
    { label: 'Production', href: '/production', iconKey: 'Factory', order: 10 },
    { label: 'Production Planner', href: '/production-planner', iconKey: 'LayoutGrid', order: 20 },
    { label: 'Dispatch Center', href: '/dispatch-center', iconKey: 'Truck', order: 30 },
    { label: 'Printer Management', href: '/printer-management', iconKey: 'Printer', order: 40 },
    { label: 'Production Board', href: '/production-board', iconKey: 'LayoutGrid', order: 50 }
  ]},
  { label: 'Account', iconKey: 'User', order: 350, roles: ['admin', 'tenant_admin', 'owner'], children: [
    { label: 'Admin Theme', href: '/admin-theme', iconKey: 'Palette', order: 10 },
    { label: 'Uptime Report', href: '/uptime-report', iconKey: 'HeartPulse', order: 20 },
    { label: 'Support Tickets', href: '/support-tickets', iconKey: 'LifeBuoy', order: 30 }
  ]},
  { label: 'Support', iconKey: 'LifeBuoy', order: 360, roles: ['admin', 'tenant_admin', 'owner'], children: [
    { label: 'Support', href: '/support', iconKey: 'LifeBuoy', order: 10 },
    { label: 'Knowledge Base', href: '/knowledge-base', iconKey: 'BookOpen', order: 20 }
  ]},
  { label: 'Logout', href: '/logout', iconKey: 'LogOut', order: 999, roles: ['admin', 'tenant_admin', 'owner', 'super_admin'] }
];

const SUPER_ADMIN_SIDEBAR_NAVIGATION: AdminSidebarNavigationItem[] = [
  { label: 'Super Admin', href: '/super-admin', iconKey: 'Shield', order: 10, roles: ['super_admin'] },
  { label: 'Tenant Control', href: '/tenant-control', iconKey: 'Building2', order: 20, roles: ['super_admin'] },
  { label: 'Owner Onboarding', href: '/owner-onboarding', iconKey: 'Sparkles', order: 30, roles: ['super_admin'] },
  { label: 'Owner Invitations', href: '/owner-invitations', iconKey: 'Mail', order: 40, roles: ['super_admin'] },
  { label: 'Launch Checklist', href: '/owner-launch-checklist', iconKey: 'ClipboardCheck', order: 50, roles: ['super_admin'] },
  { label: 'Owner Escalations', href: '/owner-escalations', iconKey: 'AlertTriangle', order: 60, roles: ['super_admin'] },
  { label: 'Owner Audit Log', href: '/owner-audit-log', iconKey: 'History', order: 70, roles: ['super_admin'] },
  { label: 'Owner Notifications', href: '/owner-notifications', iconKey: 'BellRing', order: 80, roles: ['super_admin'] },
  { label: 'Owner Feature Flags', href: '/owner-feature-flags', iconKey: 'Flag', order: 90, roles: ['super_admin'] },
  { label: 'Owner API Keys', href: '/owner-api-keys', iconKey: 'KeyRound', order: 100, roles: ['super_admin'] },
  { label: 'Owner Webhooks', href: '/owner-webhooks', iconKey: 'Webhook', order: 110, roles: ['super_admin'] },
  { label: 'Owner SSO Config', href: '/owner-sso-config', iconKey: 'ShieldEllipsis', order: 120, roles: ['super_admin'] },
  { label: 'Owner Usage Limits', href: '/owner-usage-limits', iconKey: 'Gauge', order: 130, roles: ['super_admin'] },
  { label: 'Owner Billing Plans', href: '/owner-billing-plans', iconKey: 'CreditCard', order: 140, roles: ['super_admin'] },
  { label: 'Owner Environments', href: '/owner-environments', iconKey: 'Globe2', order: 150, roles: ['super_admin'] },
  { label: 'Owner Domains', href: '/owner-domains', iconKey: 'Globe2', order: 160, roles: ['super_admin'] },
  { label: 'Owner Backups', href: '/owner-backups', iconKey: 'DatabaseBackup', order: 170, roles: ['super_admin'] },
  { label: 'Owner Maintenance Windows', href: '/owner-maintenance-windows', iconKey: 'Wrench', order: 180, roles: ['super_admin'] },
  { label: 'Owner Incidents', href: '/owner-incidents', iconKey: 'AlertOctagon', order: 190, roles: ['super_admin'] },
  { label: 'Owner Runbooks', href: '/owner-runbooks', iconKey: 'FileText', order: 200, roles: ['super_admin'] },
  { label: 'Owner Compliance Center', href: '/owner-compliance-center', iconKey: 'ShieldAlert', order: 210, roles: ['super_admin'] },
  { label: 'Owner Release Approvals', href: '/owner-release-approvals', iconKey: 'CheckCheck', order: 220, roles: ['super_admin'] },
  { label: 'Owner Data Retention', href: '/owner-data-retention', iconKey: 'Archive', order: 230, roles: ['super_admin'] },
  { label: 'Owner Customer Health', href: '/owner-customer-health', iconKey: 'Activity', order: 240, roles: ['super_admin'] },
  { label: 'Owner Renewals', href: '/owner-renewals', iconKey: 'CalendarClock', order: 250, roles: ['super_admin'] },
  { label: 'Owner QBRs', href: '/owner-qbrs', iconKey: 'Presentation', order: 260, roles: ['super_admin'] },
  { label: 'Owner Onboarding Pipeline', href: '/owner-onboarding-pipeline', iconKey: 'Rocket', order: 270, roles: ['super_admin'] },
  { label: 'Owner Portfolio Risks', href: '/owner-portfolio-risks', iconKey: 'AlertTriangle', order: 280, roles: ['super_admin'] },
  { label: 'Owner Success Plans', href: '/owner-success-plans', iconKey: 'Target', order: 290, roles: ['super_admin'] },
  { label: 'Owner Customer Journeys', href: '/owner-customer-journeys', iconKey: 'Map', order: 300, roles: ['super_admin'] },
  { label: 'Owner Account Plans', href: '/owner-account-plans', iconKey: 'ClipboardList', order: 310, roles: ['super_admin'] },
  { label: 'Owner Stakeholder Map', href: '/owner-stakeholder-map', iconKey: 'Users', order: 320, roles: ['super_admin'] },
  { label: 'Licensing Center', href: '/licensing-center', iconKey: 'KeyRound', order: 330, roles: ['super_admin'] },
  { label: 'Admin Users', href: '/admin-users', iconKey: 'Users2', order: 340, roles: ['super_admin'] },
  { label: 'Store Activations', href: '/organizations', iconKey: 'Store', order: 350, roles: ['super_admin'] },
  { label: 'Billing Ops', href: '/merchant-accounts', iconKey: 'CreditCard', order: 360, roles: ['super_admin'] },
  { label: 'Owner Deployments', href: '/owner-deployments', iconKey: 'Rocket', order: 370, roles: ['super_admin'] },
  { label: 'Demo Library', href: '/demo-library', iconKey: 'UploadCloud', order: 380, roles: ['super_admin'] },
  { label: 'Reports', href: '/reports', iconKey: 'BarChart3', order: 390, roles: ['super_admin'] },
  { label: 'Support Hub', href: '/support-tickets', iconKey: 'LifeBuoy', order: 400, roles: ['super_admin'] },
  { label: 'Knowledge Base', href: '/knowledge-base', iconKey: 'BookOpen', order: 410, roles: ['super_admin'] },
  { label: 'Logout', href: '/logout', iconKey: 'LogOut', order: 999, roles: ['super_admin'] }
];

export const ADMIN_NAVIGATION_REGISTRY: AdminNavigationRegistryItem[] = [];

export function getAdminSidebarNavigation(role: AdminRole = 'admin') {
  const base = role === 'super_admin' ? SUPER_ADMIN_SIDEBAR_NAVIGATION : ADMIN_SIDEBAR_NAVIGATION;
  return base
    .filter((item) => !item.hidden && (!item.roles || item.roles.includes(role)))
    .sort((a, b) => (a.order || 999) - (b.order || 999));
}

export function getAdminNavigationRegistry() {
  return ADMIN_NAVIGATION_REGISTRY;
}
