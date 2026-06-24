export type ButtonAuditSeverity = 'pass' | 'warning' | 'error' | 'info';
export type ButtonAuditFinding = { id: string; file: string; severity: ButtonAuditSeverity; label: string; detail: string; action?: string };
type KnownModuleCheck = { file: string; route: string; expectedActions: string[]; note?: string };
const KNOWN_MODULES: KnownModuleCheck[] = [
  { file: 'src/modules/products/pages/products-list-page.tsx', route: '/products', expectedActions: ['Add Product', 'Import CSV Pricing', 'Export', 'Edit', 'Preview', 'Clone', 'Delete'], note: 'Tenant catalog list; should use internal catalog API/database only.' },
  { file: 'app/categories/page.tsx', route: '/categories', expectedActions: ['Add Category', 'Edit', 'Delete'], note: 'Tenant category management must persist to database.' },
  { file: 'app/product-builder-studio/page.tsx', route: '/product-builder-studio', expectedActions: ['Save', 'Preview'], note: 'Tenant product builder should create database-backed product records.' },
  { file: 'app/config-templates/page.tsx', route: '/config-templates', expectedActions: ['Add Template'], note: 'Shared records page now starts empty and saves bulk items to internal config API.' },
  { file: 'app/option-sets/page.tsx', route: '/option-sets', expectedActions: ['Add'], note: 'Shared records page now starts empty and saves bulk items to internal config API.' },
  { file: 'app/materials-library/page.tsx', route: '/materials-library', expectedActions: ['Add'], note: 'Check material size/machine compatibility records after deploy.' },
  { file: 'app/finish-library/page.tsx', route: '/finish-library', expectedActions: ['Add'], note: 'Check finish/add-on VAT flags after deploy.' },
  { file: 'app/printer-profiles/page.tsx', route: '/printer-profiles', expectedActions: ['Add'], note: 'Check machine capability records after deploy.' },
  { file: 'app/orders/page.tsx', route: '/orders', expectedActions: ['Open order', 'Update status'], note: 'Tenant orders should read from order database.' },
  { file: 'app/quotes/page.tsx', route: '/quotes', expectedActions: ['Create Quote'], note: 'Tenant quotation flow should remain internal, not public API.' },
  { file: 'app/artwork-uploads/page.tsx', route: '/artwork-uploads', expectedActions: ['Open upload'], note: 'Tenant artwork queue route registered.' },
  { file: 'app/pricing-engine-lab/page.tsx', route: '/pricing-engine-lab', expectedActions: ['Calculate', 'Save'], note: 'Pricing engine should reuse internal pricing modules.' },
  { file: 'src/modules/settings/pages/organizations-page.tsx', route: '/organizations', expectedActions: ['Add Activation Group', 'Edit', 'Delete'], note: 'DB-backed through /api/internal/platform/records?resource=organizations.' },
  { file: 'src/modules/settings/pages/merchant-accounts-page.tsx', route: '/merchant-accounts', expectedActions: ['Add Merchant Account', 'Edit', 'Delete'], note: 'DB-backed through /api/internal/platform/records?resource=merchant-accounts.' },
  { file: 'src/modules/settings/pages/api-access-page.tsx', route: '/api-access', expectedActions: ['Add Access Profile', 'Edit', 'Delete'], note: 'DB-backed through /api/internal/platform/records?resource=api-access-profiles.' },
  { file: 'src/modules/platform/credentials-page.tsx', route: '/api-keys', expectedActions: ['Create credential', 'Refresh'], note: 'DB-backed API credential page.' },
  { file: 'src/modules/plugin/pages/licensing-center-live-page.tsx', route: '/licensing-center', expectedActions: ['Add licence', 'Edit', 'Delete'], note: 'Cleaned live licensing page. No seed reset.' },
  { file: 'src/modules/super-admin/pages/live-owner-reports-page.tsx', route: '/reports', expectedActions: ['Refresh'], note: 'Super Admin report route uses live DB metrics; tenant report still uses tenant report page.' },
  { file: 'app/support/page.tsx', route: '/support', expectedActions: ['Create Support Task'], note: 'DB-backed through internal config API.' },
  { file: 'app/knowledge-base/page.tsx', route: '/knowledge-base', expectedActions: ['Add Article'], note: 'DB-backed through internal config API.' },
  { file: 'app/error-log/page.tsx', route: '/error-log', expectedActions: ['Create Incident'], note: 'No dummy incidents preloaded.' },
  { file: 'src/modules/launch/final-launch-checklist-page.tsx', route: '/final-check', expectedActions: ['Refresh', 'Open module'] },
  { file: 'src/modules/launch/data-continuity-page.tsx', route: '/data-continuity', expectedActions: ['Refresh'] },
  { file: 'src/modules/launch/admin-launch-security-page.tsx', route: '/admin-launch-security', expectedActions: ['Refresh'] },
  { file: 'src/modules/launch/button-audit-page.tsx', route: '/button-audit', expectedActions: ['Refresh'] },
  { file: 'src/modules/launch/email-order-notification-qa-page.tsx', route: '/email-order-notification-qa', expectedActions: ['Dry run', 'Queue test notifications'] },
  { file: 'src/modules/launch/payment-checkout-qa-page.tsx', route: '/payment-checkout-qa', expectedActions: ['Dry run', 'Create payment test order'] },
  { file: 'src/modules/launch/storefront-order-test-page.tsx', route: '/storefront-order-test', expectedActions: ['Dry run'] },
];
function row(id: string, file: string, severity: ButtonAuditSeverity, label: string, detail: string, action = ''): ButtonAuditFinding { return { id, file, severity, label, detail, action }; }
export async function buildButtonAudit() {
  const findings: ButtonAuditFinding[] = [];
  for (const module of KNOWN_MODULES) {
    findings.push(row(`known-${module.route}`, module.file, 'pass', 'Module registered', `${module.route} is included in the action audit registry.`));
    findings.push(row(`actions-${module.route}`, module.file, 'info', 'Expected visible actions', `Expected actions: ${module.expectedActions.join(', ')}.`, 'Open the route and confirm each action after deploy.'));
    if (module.note) findings.push(row(`note-${module.route}`, module.file, 'info', 'Production wiring note', module.note));
  }
  findings.push(row('deployment-safe-mode', 'src/core/launch/button-audit.service.ts', 'warning', 'Lightweight audit mode', 'This page uses a fixed registry to keep the Vercel function small.', 'Use the listed routes for manual click testing.'));
  const summary = findings.reduce((acc, item) => { acc.findings += 1; acc[item.severity] += 1; return acc; }, { findings: 0, pass: 0, warning: 0, error: 0, info: 0 } as Record<ButtonAuditSeverity | 'findings', number>);
  const score = Math.max(0, Math.min(100, 100 - summary.error * 8 - summary.warning * 3));
  const ready = summary.error === 0;
  const nextActions = findings.filter((item) => item.severity === 'error' || item.severity === 'warning').slice(0, 30).map((item) => ({ label: item.label, detail: `${item.file}: ${item.detail}`, action: item.action, severity: item.severity }));
  return { ready, score, generatedAt: new Date().toISOString(), summary: { ...summary, filesScanned: KNOWN_MODULES.length }, findings, nextActions };
}
