import { existsSync, mkdirSync, readFileSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

export type GlobalVatSettings = {
  enabled: boolean;
  pricesIncludeVat: boolean;
  standardVatRate: number;
  defaultVatClass: 'standard' | 'zero' | 'exempt';
  defaultFallbackVatRate: number;
  deliveryVatClass: 'standard' | 'zero' | 'exempt' | 'custom';
  deliveryVatRate: number;
  designServiceVatRate: number;
  forceDesignServicesStandardVat: boolean;
  zeroRatedProductTerms: string;
  standardRatedProductTerms: string;
  standardRatedServiceTerms: string;
  requireLineVatMetadata: boolean;
  invoiceShowVatBreakdown: boolean;
  adminNote: string;
};

function dataDir() { return path.join(process.cwd(), '.data'); }
function settingsPath() { return path.join(dataDir(), 'global-vat-settings.json'); }
function numberValue(value: unknown, fallback: number) { const next = Number(value); return Number.isFinite(next) && next >= 0 ? next : fallback; }
function boolValue(value: unknown, fallback: boolean) { return typeof value === 'boolean' ? value : fallback; }
function stringValue(value: unknown, fallback = '') { return String(value ?? fallback).trim(); }
function classValue(value: unknown, fallback: GlobalVatSettings['defaultVatClass']) { return ['standard', 'zero', 'exempt'].includes(String(value)) ? value as GlobalVatSettings['defaultVatClass'] : fallback; }
function deliveryClassValue(value: unknown, fallback: GlobalVatSettings['deliveryVatClass']) { return ['standard', 'zero', 'exempt', 'custom'].includes(String(value)) ? value as GlobalVatSettings['deliveryVatClass'] : fallback; }

export function defaultGlobalVatSettings(): GlobalVatSettings {
  return {
    enabled: true,
    pricesIncludeVat: true,
    standardVatRate: numberValue(process.env.DEFAULT_STANDARD_VAT_RATE, 20),
    defaultVatClass: classValue(process.env.DEFAULT_PRODUCT_VAT_CLASS, 'standard'),
    defaultFallbackVatRate: numberValue(process.env.DEFAULT_FALLBACK_VAT_RATE, 20),
    deliveryVatClass: deliveryClassValue(process.env.DEFAULT_DELIVERY_VAT_CLASS, 'standard'),
    deliveryVatRate: numberValue(process.env.DEFAULT_DELIVERY_VAT_RATE, 20),
    designServiceVatRate: numberValue(process.env.DEFAULT_DESIGN_SERVICE_VAT_RATE, 20),
    forceDesignServicesStandardVat: true,
    zeroRatedProductTerms: 'leaflet, leaflets, flyer, flyers, booklet, booklets, brochure, brochures',
    standardRatedProductTerms: 'business card, business cards, board, boards, sign, signage, banner, banners, sticker, stickers, label, labels, ncr, pvc, poster, posters',
    standardRatedServiceTerms: 'design, artwork service, artwork check, proof, proofing, setup, installation, fitting, file fix, file setup, consultation',
    requireLineVatMetadata: true,
    invoiceShowVatBreakdown: true,
    adminNote: 'Product-level VAT settings override these global defaults. Design/artwork services should remain standard-rated even when the base print product is zero-rated.',
  };
}

export function normaliseGlobalVatSettings(input: Partial<GlobalVatSettings> = {}, base = defaultGlobalVatSettings()): GlobalVatSettings {
  return {
    enabled: boolValue(input.enabled, base.enabled),
    pricesIncludeVat: boolValue(input.pricesIncludeVat, base.pricesIncludeVat),
    standardVatRate: numberValue(input.standardVatRate, base.standardVatRate),
    defaultVatClass: classValue(input.defaultVatClass, base.defaultVatClass),
    defaultFallbackVatRate: numberValue(input.defaultFallbackVatRate, base.defaultFallbackVatRate),
    deliveryVatClass: deliveryClassValue(input.deliveryVatClass, base.deliveryVatClass),
    deliveryVatRate: numberValue(input.deliveryVatRate, base.deliveryVatRate),
    designServiceVatRate: numberValue(input.designServiceVatRate, base.designServiceVatRate),
    forceDesignServicesStandardVat: boolValue(input.forceDesignServicesStandardVat, base.forceDesignServicesStandardVat),
    zeroRatedProductTerms: stringValue(input.zeroRatedProductTerms, base.zeroRatedProductTerms),
    standardRatedProductTerms: stringValue(input.standardRatedProductTerms, base.standardRatedProductTerms),
    standardRatedServiceTerms: stringValue(input.standardRatedServiceTerms, base.standardRatedServiceTerms),
    requireLineVatMetadata: boolValue(input.requireLineVatMetadata, base.requireLineVatMetadata),
    invoiceShowVatBreakdown: boolValue(input.invoiceShowVatBreakdown, base.invoiceShowVatBreakdown),
    adminNote: stringValue(input.adminNote, base.adminNote),
  };
}

export function getGlobalVatSettingsSync(): GlobalVatSettings {
  const defaults = defaultGlobalVatSettings();
  try {
    const file = settingsPath();
    if (!existsSync(file)) return defaults;
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    return normaliseGlobalVatSettings(parsed, defaults);
  } catch {
    return defaults;
  }
}

export async function getGlobalVatSettings(): Promise<GlobalVatSettings> {
  await mkdir(dataDir(), { recursive: true });
  const defaults = defaultGlobalVatSettings();
  try {
    const parsed = JSON.parse(await readFile(settingsPath(), 'utf8'));
    return normaliseGlobalVatSettings(parsed, defaults);
  } catch {
    return defaults;
  }
}

export async function saveGlobalVatSettings(input: Partial<GlobalVatSettings>) {
  mkdirSync(dataDir(), { recursive: true });
  const current = await getGlobalVatSettings();
  const next = normaliseGlobalVatSettings(input, current);
  await writeFile(settingsPath(), JSON.stringify(next, null, 2));
  return next;
}

export function termsList(value: string) {
  return String(value || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
}
