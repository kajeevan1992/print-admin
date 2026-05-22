import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
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
  templates: Record<ArtworkEmailTemplateKey, EmailTemplate>;
  updatedAt?: string;
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

const defaultTemplates: Record<ArtworkEmailTemplateKey, EmailTemplate> = {
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
    templates: defaultTemplates,
  };
}

function mergeSettings(raw?: Partial<TenantEmailSettings>): TenantEmailSettings {
  const defaults = defaultEmailSettings();
  return {
    ...defaults,
    ...(raw || {}),
    templates: {
      ...defaults.templates,
      ...(raw?.templates || {}),
    },
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

export async function saveEmailSettings(input: Partial<TenantEmailSettings>) {
  await mkdir(dataDir(), { recursive: true });
  const current = await getEmailSettings();
  const next = mergeSettings({
    ...current,
    ...input,
    smtpPass: input.smtpPass === '__KEEP_EXISTING__' ? current.smtpPass : (input.smtpPass ?? current.smtpPass),
    templates: {
      ...current.templates,
      ...(input.templates || {}),
    },
    updatedAt: new Date().toISOString(),
  });
  await writeFile(settingsPath(), JSON.stringify(next, null, 2));
  return next;
}

export function maskEmailSettings(settings: TenantEmailSettings) {
  return {
    ...settings,
    smtpPass: settings.smtpPass ? '********' : '',
    smtpPassSet: Boolean(settings.smtpPass),
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
  const template = settings.templates[key] || defaultTemplates[key];
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
  return {
    configured: Boolean(settings.smtpHost && settings.smtpPort && settings.smtpUser && settings.smtpPass),
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure,
    user: settings.smtpUser,
    pass: settings.smtpPass,
    from: settings.fromEmail ? `${settings.fromName || settings.brandName} <${settings.fromEmail}>` : settings.smtpUser,
    replyTo: settings.replyTo,
    autoSendArtworkEmails: settings.autoSendArtworkEmails,
  };
}

export { defaultTemplates as DEFAULT_ARTWORK_EMAIL_TEMPLATES };
