import { getEmailSettings, renderArtworkEmailTemplate, validateEmailSettings } from '@/core/email/email-settings.service';
import { emailOutboxStorageStatus, listInternalEmails, smtpStatusForRequest } from '@/core/email/internal-email.service';
import { queueOrderPlacedEmails } from '@/core/email/order-notifications.service';

export type EmailOrderNotificationQaSeverity = 'pass' | 'warning' | 'error' | 'info';
export type EmailOrderNotificationQaMode = 'dry-run' | 'queue-test-notifications';
export type EmailOrderNotificationQaCheck = {
  id: string;
  category: 'email-settings' | 'smtp' | 'outbox' | 'order-notifications' | 'artwork-templates' | 'vercel';
  severity: EmailOrderNotificationQaSeverity;
  label: string;
  detail: string;
  action?: string;
};

function item(id: string, category: EmailOrderNotificationQaCheck['category'], severity: EmailOrderNotificationQaSeverity, label: string, detail: string, action = ''): EmailOrderNotificationQaCheck {
  return { id, category, severity, label, detail, action };
}
function pass(id: string, category: EmailOrderNotificationQaCheck['category'], label: string, detail: string, action = '') { return item(id, category, 'pass', label, detail, action); }
function warn(id: string, category: EmailOrderNotificationQaCheck['category'], label: string, detail: string, action = '') { return item(id, category, 'warning', label, detail, action); }
function fail(id: string, category: EmailOrderNotificationQaCheck['category'], label: string, detail: string, action = '') { return item(id, category, 'error', label, detail, action); }
function info(id: string, category: EmailOrderNotificationQaCheck['category'], label: string, detail: string, action = '') { return item(id, category, 'info', label, detail, action); }
function env(name: string) { return String(process.env[name] || '').trim(); }
function adminEmail() { return env('HOLO_PRINT_ADMIN_EMAIL') || env('ORDER_NOTIFICATION_EMAIL') || env('ADMIN_EMAIL') || env('SMTP_FROM_EMAIL') || env('SMTP_USER') || ''; }

function qaOrder() {
  const number = `EMAILQA-${Date.now()}`;
  return {
    id: number.toLowerCase(),
    orderNumber: number,
    quoteReference: number,
    customerName: 'Email QA Customer',
    customerEmail: env('EMAIL_QA_TEST_RECIPIENT') || 'qa@example.com',
    customerCompany: 'HOLO Print QA',
    currency: 'GBP',
    totalMinor: 2500,
    status: 'APPROVED',
    paymentStatus: 'unpaid',
    items: [{ id: 'email-qa-business-card', productName: 'Business Cards', quantity: 500 }],
  };
}

function settingsChecks(settings: Awaited<ReturnType<typeof getEmailSettings>>) {
  const validation = validateEmailSettings(settings);
  const checks: EmailOrderNotificationQaCheck[] = [];
  if (settings.brandName) checks.push(pass('email-brand', 'email-settings', 'Brand name configured', `Brand: ${settings.brandName}.`));
  else checks.push(fail('email-brand', 'email-settings', 'Brand name missing', 'Brand name is required for outgoing email.', 'Set Brand Name in Email Settings.'));
  if (settings.fromEmail) checks.push(pass('email-from', 'email-settings', 'From email configured', `From: ${settings.fromEmail}.`));
  else checks.push(fail('email-from', 'email-settings', 'From email missing', 'From email is required for outgoing email.', 'Set From Email in Email Settings.'));
  if (validation.errors.length) checks.push(fail('email-validation', 'email-settings', 'Email settings validation failed', validation.errors.join(' '), 'Fix Email Settings validation errors.'));
  else checks.push(pass('email-validation', 'email-settings', 'Email settings validate', validation.warnings.length ? `Valid with warnings: ${validation.warnings.join(' ')}` : 'No blocking validation errors.'));
  if (validation.warnings.length) checks.push(warn('email-warnings', 'email-settings', 'Email settings warnings', validation.warnings.join(' '), 'Review recommended settings before launch.'));
  return checks;
}

async function smtpChecks(request: Request) {
  const smtp = await smtpStatusForRequest(request);
  const checks: EmailOrderNotificationQaCheck[] = [];
  if (smtp.configured) checks.push(pass('smtp-configured', 'smtp', 'SMTP configured', `SMTP host ${smtp.host}:${smtp.port}; from ${smtp.from}.`));
  else checks.push(warn('smtp-configured', 'smtp', 'SMTP not configured', 'Emails can be queued, but sending will not work until SMTP is configured.', 'Add SMTP host, port, user and password.'));
  if (smtp.storageMode === 'db-primary') checks.push(pass('email-settings-storage', 'email-settings', 'Email settings use database storage', `Tenant: ${smtp.storageTenantId || 'unknown'}.`));
  else checks.push(warn('email-settings-storage', 'email-settings', 'Email settings not confirmed as database-backed', `Storage mode: ${smtp.storageMode || 'unknown'}.`, 'On Vercel, database-backed email settings are preferred.'));
  return { smtp, checks };
}

async function outboxChecks(request: Request) {
  const storage = await emailOutboxStorageStatus(request);
  const emails = await listInternalEmails(request);
  const checks: EmailOrderNotificationQaCheck[] = [];
  if (storage.mode === 'db-primary') checks.push(pass('outbox-storage', 'outbox', 'Email outbox uses database storage', `Tenant ${storage.tenantId || 'unknown'}; ${emails.length} emails found.`));
  else checks.push(warn('outbox-storage', 'outbox', 'Email outbox is using file fallback', 'File fallback is not durable on Vercel serverless functions.', 'Run/update DB schema so tenant email outbox storage is available.'));
  checks.push(info('outbox-count', 'outbox', 'Outbox count', `${emails.length} email records are visible.`));
  return { storage, emails, checks };
}

function orderNotificationChecks() {
  const order = qaOrder();
  const checks: EmailOrderNotificationQaCheck[] = [];
  if (String(order.customerEmail).includes('@')) checks.push(pass('order-customer-email', 'order-notifications', 'Customer recipient resolves', `Customer test recipient: ${order.customerEmail}.`));
  else checks.push(fail('order-customer-email', 'order-notifications', 'Customer recipient missing', 'Checkout needs a valid customer email.', 'Ensure customer email is required at checkout.'));
  const admin = adminEmail();
  if (admin.includes('@')) checks.push(pass('order-admin-email', 'order-notifications', 'Admin recipient resolves', `Admin recipient is configured.`));
  else checks.push(warn('order-admin-email', 'order-notifications', 'Admin recipient missing', 'No admin order notification email env was found.', 'Set HOLO_PRINT_ADMIN_EMAIL or ORDER_NOTIFICATION_EMAIL.'));
  return { order, checks };
}

function templateChecks() {
  const checks: EmailOrderNotificationQaCheck[] = [];
  const vars = { customerName: 'Email QA Customer', orderNumber: 'EMAILQA-123', productName: 'Business Cards', fileName: 'artwork.pdf', note: 'Low resolution image detected.', reuploadLink: 'https://example.com/reupload' };
  for (const key of ['artwork-reupload-request', 'artwork-approved', 'artwork-rejected', 'artwork-pending-review'] as const) {
    const rendered = renderArtworkEmailTemplate(key, vars);
    if (!rendered.enabled) checks.push(warn(`template-${key}`, 'artwork-templates', `${rendered.template.label} disabled`, 'Template is disabled.', 'Enable if you want this notification sent.'));
    else if (rendered.subject && rendered.body) checks.push(pass(`template-${key}`, 'artwork-templates', `${rendered.template.label} renders`, `Subject: ${rendered.subject}`));
    else checks.push(fail(`template-${key}`, 'artwork-templates', `${rendered.template.label} is blank`, 'Enabled template needs subject and body.', 'Restore or edit the template in Email Settings.'));
  }
  return checks;
}

async function queueTestNotifications(request: Request) {
  const order = qaOrder();
  const results = await queueOrderPlacedEmails(request, order);
  return { order, results };
}

export async function buildEmailOrderNotificationQa(request: Request, options: { mode?: EmailOrderNotificationQaMode } = {}) {
  const mode = options.mode === 'queue-test-notifications' ? 'queue-test-notifications' : 'dry-run';
  const settings = await getEmailSettings(request);
  const smtp = await smtpChecks(request);
  const outbox = await outboxChecks(request);
  const order = orderNotificationChecks();
  const checks: EmailOrderNotificationQaCheck[] = [...settingsChecks(settings), ...smtp.checks, ...outbox.checks, ...order.checks, ...templateChecks()];
  let queuedNotifications: any[] = [];

  if (mode === 'queue-test-notifications') {
    const queued = await queueTestNotifications(request);
    queuedNotifications = queued.results;
    const failures = queued.results.filter((result: any) => result?.ok === false);
    if (failures.length) checks.push(fail('queue-test-notifications', 'order-notifications', 'Test order notifications failed to queue', failures.map((result: any) => result.error || result.reason || 'Unknown failure').join(' '), 'Fix outbox storage/order notification queue path.'));
    else checks.push(pass('queue-test-notifications', 'order-notifications', 'Test order notifications queued', `Queued ${queued.results.length} notification records for ${queued.order.orderNumber}.`));
  }

  if (process.env.VERCEL) checks.push(info('vercel-email-note', 'vercel', 'Vercel email storage note', 'On Vercel, queued email records should be stored in database, not runtime files.'));

  const summary = checks.reduce((acc, check) => {
    acc.checks += 1;
    acc[check.severity] += 1;
    return acc;
  }, { checks: 0, pass: 0, warning: 0, error: 0, info: 0 } as Record<EmailOrderNotificationQaSeverity | 'checks', number>);
  const score = Math.max(0, Math.min(100, 100 - summary.error * 25 - summary.warning * 8));
  const ready = summary.error === 0;
  const nextActions = checks.filter((check) => check.severity === 'error' || check.severity === 'warning').slice(0, 8).map((check) => ({ label: check.label, detail: check.detail, action: check.action, severity: check.severity, category: check.category }));

  return {
    mode,
    ready,
    score,
    generatedAt: new Date().toISOString(),
    summary,
    emailSettings: { brandName: settings.brandName, fromName: settings.fromName, fromEmail: settings.fromEmail, replyTo: settings.replyTo, autoSendArtworkEmails: settings.autoSendArtworkEmails, storageMode: settings.storageMode, storageTenantId: settings.storageTenantId },
    smtp: smtp.smtp,
    outbox: { ...outbox.storage, count: outbox.emails.length },
    queuedNotifications,
    checks,
    nextActions,
  };
}
