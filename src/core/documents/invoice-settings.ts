import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';
import type { TenantContext } from '@/core/tenant/types';

export type InvoiceBrandSettings = {
  brandName: string;
  legalName: string;
  tradingName: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  vatNumber: string;
  companyNumber: string;
  bankDetails: string;
  paymentTerms: string;
  footerNote: string;
  accentColour: string;
};

const CONFIG_RESOURCE = 'admin-config' as any;
const SETTINGS_KEY = 'invoice-brand-settings';
function dataDir() { return path.join(process.cwd(), '.data'); }
function settingsPath() { return path.join(dataDir(), 'invoice-settings.json'); }
function clean(value: unknown, fallback = '') { return String(value ?? fallback).trim(); }
function contextFrom(value?: Request | TenantContext | null): TenantContext | null { if (!value) return null; return value instanceof Request ? tenantContextFromRequest(value) : value; }
function normalise(input: Partial<InvoiceBrandSettings>, defaults: InvoiceBrandSettings) { return { ...defaults, ...Object.fromEntries(Object.entries(input || {}).map(([key, value]) => [key, clean(value)])) } as InvoiceBrandSettings; }

export function defaultInvoiceSettings(): InvoiceBrandSettings {
  return {
    brandName: clean(process.env.NEXT_PUBLIC_BRAND_NAME || process.env.BRAND_NAME || process.env.COMPANY_NAME, 'HOLO Print'),
    legalName: clean(process.env.COMPANY_LEGAL_NAME || process.env.COMPANY_NAME, 'HOLO Print'),
    tradingName: clean(process.env.COMPANY_TRADING_NAME, 'HOLO Print'),
    address: clean(process.env.COMPANY_ADDRESS, '54 Sidcup High Street, Sidcup, DA14 6EH'),
    email: clean(process.env.COMPANY_EMAIL, 'sales@holoprint.co.uk'),
    phone: clean(process.env.COMPANY_PHONE, ''),
    website: clean(process.env.COMPANY_WEBSITE || process.env.NEXT_PUBLIC_STOREFRONT_URL, ''),
    vatNumber: clean(process.env.COMPANY_VAT_NUMBER, ''),
    companyNumber: clean(process.env.COMPANY_REGISTRATION_NUMBER || process.env.COMPANY_NUMBER, ''),
    bankDetails: clean(process.env.COMPANY_BANK_DETAILS, ''),
    paymentTerms: clean(process.env.INVOICE_PAYMENT_TERMS, 'Payment due on receipt unless agreed otherwise.'),
    footerNote: clean(process.env.INVOICE_FOOTER_NOTE, 'Thank you for choosing us for your print, design and signage work.'),
    accentColour: clean(process.env.INVOICE_ACCENT_COLOUR, '#18A7D0'),
  };
}

async function fileSettings() {
  await mkdir(dataDir(), { recursive: true });
  const defaults = defaultInvoiceSettings();
  try { const parsed = JSON.parse(await readFile(settingsPath(), 'utf8')); return normalise(parsed && typeof parsed === 'object' ? parsed : {}, defaults); }
  catch { return defaults; }
}

export async function getInvoiceSettings(scope?: Request | TenantContext | null): Promise<InvoiceBrandSettings> {
  const defaults = await fileSettings();
  const ctx = contextFrom(scope);
  if (!ctx?.tenantId) return defaults;
  try {
    const record = await getInternalCatalogRecord(ctx, CONFIG_RESOURCE, SETTINGS_KEY);
    const stored = (record as any)?.metadataJson?.settings;
    return normalise(stored && typeof stored === 'object' ? stored : {}, defaults);
  } catch (error) {
    if (error instanceof Error && error.message.includes('was not found')) return defaults;
    return defaults;
  }
}

export async function saveInvoiceSettings(input: Partial<InvoiceBrandSettings>, scope?: Request | TenantContext | null) {
  const current = await getInvoiceSettings(scope);
  const next = normalise(input, current);
  const ctx = contextFrom(scope);
  if (ctx?.tenantId) {
    await upsertInternalCatalogRecord(ctx, CONFIG_RESOURCE, { id: SETTINGS_KEY, slug: SETTINGS_KEY, name: 'Invoice Brand Settings', description: 'Tenant-specific invoice, receipt and credit-note branding', metadataJson: { settings: next, savedAt: new Date().toISOString(), source: 'invoice-settings' } } as any);
    return next;
  }
  await mkdir(dataDir(), { recursive: true });
  await writeFile(settingsPath(), JSON.stringify(next, null, 2));
  return next;
}
