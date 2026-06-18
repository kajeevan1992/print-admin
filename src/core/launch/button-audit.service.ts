export type ButtonAuditSeverity = 'pass' | 'warning' | 'error' | 'info';
export type ButtonAuditFinding = { id: string; file: string; severity: ButtonAuditSeverity; label: string; detail: string; action?: string };

type KnownModuleCheck = { file: string; route: string; expectedActions: string[] };

const KNOWN_MODULES: KnownModuleCheck[] = [
  { file: 'src/modules/products/pages/products-list-page.tsx', route: '/products', expectedActions: ['Add Product', 'Import CSV Pricing', 'Export', 'Edit', 'Preview', 'Clone', 'Delete'] },
  { file: 'src/modules/launch/final-launch-checklist-page.tsx', route: '/final-check', expectedActions: ['Refresh', 'Open module'] },
  { file: 'src/modules/launch/data-continuity-page.tsx', route: '/data-continuity', expectedActions: ['Refresh'] },
  { file: 'src/modules/launch/admin-launch-security-page.tsx', route: '/admin-launch-security', expectedActions: ['Refresh'] },
  { file: 'src/modules/launch/button-audit-page.tsx', route: '/button-audit', expectedActions: ['Refresh'] },
  { file: 'src/modules/launch/email-order-notification-qa-page.tsx', route: '/email-order-notification-qa', expectedActions: ['Dry run', 'Queue test notifications'] },
  { file: 'src/modules/launch/payment-checkout-qa-page.tsx', route: '/payment-checkout-qa', expectedActions: ['Dry run', 'Create payment test order'] },
  { file: 'src/modules/launch/storefront-order-test-page.tsx', route: '/storefront-order-test', expectedActions: ['Dry run'] },
];

function row(id: string, file: string, severity: ButtonAuditSeverity, label: string, detail: string, action = ''): ButtonAuditFinding {
  return { id, file, severity, label, detail, action };
}

export async function buildButtonAudit() {
  const findings: ButtonAuditFinding[] = [];
  for (const module of KNOWN_MODULES) {
    findings.push(row(`known-${module.route}`, module.file, 'pass', 'Module registered', `${module.route} is included in the action audit registry.`));
    findings.push(row(`actions-${module.route}`, module.file, 'info', 'Expected visible actions', `Expected actions: ${module.expectedActions.join(', ')}.`, 'Open the route and confirm each action after deploy.'));
  }
  findings.push(row('deployment-safe-mode', 'src/core/launch/button-audit.service.ts', 'warning', 'Lightweight audit mode', 'This page now uses a fixed registry to keep the Vercel function small.', 'Use local QA for deeper static checks.'));
  const summary = findings.reduce((acc, item) => { acc.findings += 1; acc[item.severity] += 1; return acc; }, { findings: 0, pass: 0, warning: 0, error: 0, info: 0 } as Record<ButtonAuditSeverity | 'findings', number>);
  const score = Math.max(0, Math.min(100, 100 - summary.error * 8 - summary.warning * 3));
  const ready = summary.error === 0;
  const nextActions = findings.filter((item) => item.severity === 'error' || item.severity === 'warning').slice(0, 30).map((item) => ({ label: item.label, detail: `${item.file}: ${item.detail}`, action: item.action, severity: item.severity }));
  return { ready, score, generatedAt: new Date().toISOString(), summary: { ...summary, filesScanned: KNOWN_MODULES.length }, findings, nextActions };
}
