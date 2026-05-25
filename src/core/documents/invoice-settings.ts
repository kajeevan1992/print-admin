import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

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

function dataDir() { return path.join(process.cwd(), '.data'); }
function settingsPath() { return path.join(dataDir(), 'invoice-settings.json'); }
function clean(value: unknown, fallback = '') { return String(value ?? fallback).trim(); }

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

export async function getInvoiceSettings(): Promise<InvoiceBrandSettings> {
  await mkdir(dataDir(), { recursive: true });
  const defaults = defaultInvoiceSettings();
  try {
    const parsed = JSON.parse(await readFile(settingsPath(), 'utf8'));
    return { ...defaults, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch {
    return defaults;
  }
}

export async function saveInvoiceSettings(input: Partial<InvoiceBrandSettings>) {
  await mkdir(dataDir(), { recursive: true });
  const current = await getInvoiceSettings();
  const next: InvoiceBrandSettings = {
    ...current,
    ...Object.fromEntries(Object.entries(input || {}).map(([key, value]) => [key, clean(value)])),
  };
  await writeFile(settingsPath(), JSON.stringify(next, null, 2));
  return next;
}
