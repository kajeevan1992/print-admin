import { existsSync, readFileSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

export type ArtworkEmailTemplateKey = 'artwork-reupload-request' | 'artwork-approved' | 'artwork-rejected' | 'artwork-pending-review';

export type EmailTemplate = {
  key: ArtworkEmailTemplateKey;
  label: string;
  subject: string;
  body: string;
  enabled: boolean;
};

export type TenantEmailSettings = {
  brandName: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  storefrontUrl: string;
  adminUrl: string;
  autoSendArtworkEmails: boolean;
  smtpHost: string;
  smtpPort: string;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  storageMode?: 'runtime-file';
  storagePath?: string;
  templates: Record<ArtworkEmailTemplateKey, EmailTemplate>;
  updatedAt?: string;
};

export type EmailSettingsValidation = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export const ARTWORK_TEMPLATE_VARIABLES = [
  'brandName',
  'customerName',
  'orderNumber',
  'productName',
  'fileName',
  'note',
  'reuploadLink',
  'storefrontUrl',
  'adminUrl',
];

export const DEFAULT_ARTWORK_EMAIL_TEMPLATES: Record<ArtworkEmailTemplateKey, EmailTemplate> = {
  'artwork-reupload-request': {
    key: 'artwork-reupload-request',
    label: 'Artwork replacement request',
    enabled: true,
    subject: 'New artwork required{{#orderNumber}} for order {{orderNumber}}{{/orderNumber}}',
    body: 'Hello {{customerName}},\n\nWe have checked your artwork{{#fileName}} ({{fileName}}){{/fileName}} and need a replacement file before production can continue.\n\n{{#note}}Reason: {{note}}\n\n{{/note}}Please upload your corrected artwork here:\n{{reuploadLink}}\n\nRecommended artwork: print-ready PDF, correct size, embedded fonts and 3mm bleed where required.\n\nThank you,\n{{brandName}}',
  },
  'artwork-approved': {
    key: 'artwork-approved',
    label: 'Artwork approved',
    enabled: true,
    subject: 'Artwork approved{{#orderNumber}} for order {{orderNumber}}{{/orderNumber}}',
    body: 'Hello {{customerName}},\n\nGood news — your artwork{{#fileName}} ({{fileName}}){{/fileName}} has been approved for production.\n\nOur team will now continue with the next production step.\n\nThank you,\n{{brandName}}',
  },
  'artwork-rejected': {
    key: 'artwork-rejected',
    label: 'Artwork rejected',
    enabled: true,
    subject: 'Artwork rejected{{#orderNumber}} for order {{orderNumber}}{{/orderNumber}}',
    body: 'Hello {{customerName}},\n\nWe have reviewed your artwork{{#fileName}} ({{fileName}}){{/fileName}} and it has been rejected for production.\n\n{{#note}}Reason: {{note}}\n\n{{/note}}Please contact us or wait for a replacement upload link if one has not already been sent.\n\nThank you,\n{{brandName}}',
  },
  'artwork-pending-review': {
    key: 'artwork-pending-review',
    label: 'Artwork received / pending review',
    enabled: true,
    subject: 'Artwork received{{#orderNumber}} for order {{orderNumber}}{{/orderNumber}}',
    body: 'Hello {{customerName}},\n\nYour artwork{{#fileName}} ({{fileName}}){{/fileName}} has been received and is now pending review.\n\nWe will check the file before production continues.\n\nThank you,\n{{brandName}}',
  },
};

function dataDir() {
  return path.join(process.cwd(), '.data');
}

function settingsPath() {
  return path.join(dataDir(), 'tenant-email-settings.json');
}

function isValidEmail(value?: string) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidUrl(value?: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function defaultEmailSettings(): TenantEmailSettings {
  return {
    brandName: process.env.EMAIL_BRAND_NAME || 'HOLO PRINT',
    fromName: process.env.SMTP_FROM_NAME || 'HOLO PRINT',
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'sales@holoprint.co.uk',
    replyTo: process.env.SMTP_REPLY_TO || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || '',
    storefrontUrl: process.env.NEXT_PUBLIC_STOREFRONT_URL || process.env.STOREFRONT_URL || '',
    adminUrl: process.env.NEXT_PUBLIC_ADMIN_URL || process.env.ADMIN_URL || '',
    autoSendArtworkEmails: process.env.ARTWORK_EMAIL_AUTO_SEND === 'true',
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: process.env.SMTP_PORT || '587',
    smtpSecure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    storageMode: 'runtime-file',
    storagePath: '.data/tenant-email-settings.json',
    templates: DEFAULT_ARTWORK_EMAIL_TEMPLATES,
  };
}

function normaliseTemplate(key: ArtworkEmailTemplateKey, template?: Partial<EmailTemplate>): EmailTemplate {
  const fallback = DEFAULT_ARTWORK_EMAIL_TEMPLATES[key];
  return {
    ...fallback,
    ...(template || {}),
    key,
    label: template?.label || fallback.label,
    subject: template?.subject ?? fallback.subject,
    body: template?.body ?? fallback.body,
    enabled: typeof template?.enabled === 'boolean' ? template.enabled : fallback.enabled,
  };
}

function mergeSettings(raw?: Partial<TenantEmailSettings>): TenantEmailSettings {
  const defaults = defaultEmailSettings();
  const templates = Object.fromEntries(
    (Object.keys(DEFAULT_ARTWORK_EMAIL_TEMPLATES) as ArtworkEmailTemplateKey[]).map((key) => [key, normaliseTemplate(key, raw?.templates?.[key])])
  ) as Record<ArtworkEmailTemplateKey, EmailTemplate>;
  return {
    ...defaults,
    ...(raw || {}),
    brandName: cleanString(raw?.brandName) || defaults.brandName,
    fromName: cleanString(raw?.fromName) || defaults.fromName,
    fromEmail: cleanString(raw?.fromEmail) || defaults.fromEmail,
    replyTo: cleanString(raw?.replyTo) || defaults.replyTo,
    storefrontUrl: cleanString(raw?.storefrontUrl) || defaults.storefrontUrl,
    adminUrl: cleanString(raw?.adminUrl) || defaults.adminUrl,
    smtpHost: cleanString(raw?.smtpHost) || defaults.smtpHost,
    smtpPort: cleanString(raw?.smtpPort) || defaults.smtpPort,
    smtpUser: cleanString(raw?.smtpUser) || defaults.smtpUser,
    smtpPass: typeof raw?.smtpPass === 'string' ? raw.smtpPass : defaults.smtpPass,
    storageMode: 'runtime-file',
    storagePath: '.data/tenant-email-settings.json',
    templates,
  };
}

export async function getEmailSettings() {
  await mkdir(dataDir(), { recursive: true });
  try {
    const raw = JSON.parse(await readFile(settingsPath(), 'utf8'));
    return mergeSettings(raw);
  } catch {
    return defaultEmailSettings();
  }
}

export function getEmailSettingsSync() {
  try {
    if (!existsSync(settingsPath())) return defaultEmailSettings();
    const raw = JSON.parse(readFileSync(settingsPath(), 'utf8'));
    return mergeSettings(raw);
  } catch {
    return defaultEmailSettings();
  }
}

export function validateEmailSettings(settings: TenantEmailSettings): EmailSettingsValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const smtpTouched = Boolean(settings.smtpHost || settings.smtpUser || settings.smtpPass || settings.fromEmail || settings.autoSendArtworkEmails);
  const port = Number(settings.smtpPort);

  if (!settings.brandName) errors.push('Brand name is required.');
  if (!settings.fromEmail) errors.push('From email is required.');
  if (!isValidEmail(settings.fromEmail)) errors.push('From email is not a valid email address.');
  if (settings.replyTo && !isValidEmail(settings.replyTo)) errors.push('Reply-to email is not a valid email address.');
  if (settings.storefrontUrl && !isValidUrl(settings.storefrontUrl)) errors.push('Storefront URL must start with http:// or https://.');
  if (settings.adminUrl && !isValidUrl(settings.adminUrl)) errors.push('Admin URL must start with http:// or https://.');

  if (smtpTouched) {
    if (!settings.smtpHost) errors.push('SMTP host is required when SMTP sending is configured.');
    if (!settings.smtpPort) errors.push('SMTP port is required when SMTP sending is configured.');
    if (!Number.isInteger(port) || port < 1 || port > 65535) errors.push('SMTP port must be a number between 1 and 65535.');
    if (!settings.smtpUser) errors.push('SMTP user is required when SMTP sending is configured.');
    if (!settings.smtpPass) errors.push('SMTP password is required when SMTP sending is configured.');
  }

  if (settings.autoSendArtworkEmails && !settings.storefrontUrl) warnings.push('Storefront URL is recommended for automatic artwork re-upload links.');
  if (settings.autoSendArtworkEmails && !settings.adminUrl) warnings.push('Admin URL is recommended so customer re-upload pages know where to submit files.');

  for (const template of Object.values(settings.templates)) {
    if (!template.enabled) continue;
    if (!template.subject.trim()) errors.push(`${template.label} subject is required while template is enabled.`);
    if (!template.body.trim()) errors.push(`${template.label} body is required while template is enabled.`);
  }

  return { ok: errors.length === 0, errors, warnings };
}

function resolvePassword(input: Partial<TenantEmailSettings>, current: TenantEmailSettings) {
  if (input.smtpPass === '__CLEAR__') return '';
  if (input.smtpPass === '__KEEP_EXISTING__' || input.smtpPass === '********') return current.smtpPass;
  if (typeof input.smtpPass === 'string' && input.smtpPass.length > 0) return input.smtpPass;
  if (input.smtpPass === '') return current.smtpPass;
  return current.smtpPass;
}

export async function saveEmailSettings(input: Partial<TenantEmailSettings>) {
  await mkdir(dataDir(), { recursive: true });
  const current = await getEmailSettings();
  const next = mergeSettings({
    ...current,
    ...input,
    smtpPass: resolvePassword(input, current),
    templates: {
      ...current.templates,
      ...(input.templates || {}),
    },
    updatedAt: new Date().toISOString(),
  });
  const validation = validateEmailSettings(next);
  if (!validation.ok) {
    const error = new Error(validation.errors.join(' '));
    (error as Error & { validation?: EmailSettingsValidation }).validation = validation;
    throw error;
  }
  await writeFile(settingsPath(), JSON.stringify(next, null, 2));
  return next;
}

export async function resetEmailTemplate(key: ArtworkEmailTemplateKey) {
  const current = await getEmailSettings();
  const next = await saveEmailSettings({
    ...current,
    templates: {
      ...current.templates,
      [key]: DEFAULT_ARTWORK_EMAIL_TEMPLATES[key],
    },
    smtpPass: '__KEEP_EXISTING__',
  });
  return next;
}

export async function resetAllEmailTemplates() {
  const current = await getEmailSettings();
  const next = await saveEmailSettings({
    ...current,
    templates: DEFAULT_ARTWORK_EMAIL_TEMPLATES,
    smtpPass: '__KEEP_EXISTING__',
  });
  return next;
}

export function maskEmailSettings(settings: TenantEmailSettings) {
  return {
    ...settings,
    smtpPass: settings.smtpPass ? '********' : '',
    smtpPassSet: Boolean(settings.smtpPass),
    validation: validateEmailSettings(settings),
  };
}

function applyConditionals(template: string, vars: Record<string, string>) {
  return template.replace(/{{#([a-zA-Z0-9_]+)}}([\s\S]*?){{\/\1}}/g, (_match, key, body) => {
    return vars[key] ? body : '';
  });
}

export function renderTemplate(template: string, variables: Record<string, unknown>) {
  const vars = Object.fromEntries(Object.entries(variables).map(([key, value]) => [key, String(value ?? '')]));
  return applyConditionals(template, vars).replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key) => vars[key] || '');
}

export function renderArtworkEmailTemplate(key: ArtworkEmailTemplateKey, variables: Record<string, unknown>, settings = getEmailSettingsSync()) {
  const template = settings.templates[key] || DEFAULT_ARTWORK_EMAIL_TEMPLATES[key];
  const mergedVars = {
    brandName: settings.brandName,
    storefrontUrl: settings.storefrontUrl,
    adminUrl: settings.adminUrl,
    ...variables,
  };
  return {
    enabled: template.enabled,
    subject: renderTemplate(template.subject, mergedVars).replace(/\s+/g, ' ').trim(),
    body: renderTemplate(template.body, mergedVars).trim(),
    template,
  };
}

export function smtpSettingsFromTenant() {
  const settings = getEmailSettingsSync();
  const validation = validateEmailSettings(settings);
  return {
    configured: Boolean(settings.smtpHost && settings.smtpPort && settings.smtpUser && settings.smtpPass && validation.ok),
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure,
    user: settings.smtpUser,
    pass: settings.smtpPass,
    from: settings.fromEmail ? `${settings.fromName || settings.brandName} <${settings.fromEmail}>` : settings.smtpUser,
    replyTo: settings.replyTo,
    autoSendArtworkEmails: settings.autoSendArtworkEmails,
    validation,
  };
}
