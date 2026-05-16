'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calculator, FileQuestion, Link2, Shuffle, Truck } from 'lucide-react';
import { Button } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { ProductSectionCard } from './product-section-card';
import { vendorsService, type Vendor } from '@/services/vendors.service';
import type { Product } from '@/modules/products/types';

type ProductPricingMode = 'formula' | 'supplier' | 'quote' | 'hybrid-formula-supplier' | 'hybrid-supplier-quote';
type PricingRoutePriority = 'formula-first' | 'supplier-first' | 'quote-first';
type CostingBasis = 'sheet' | 'area' | 'linear-metre' | 'matrix' | 'supplier-api' | 'manual-quote';

type ProductModeSettings = {
  mode: ProductPricingMode;
  active: boolean;
  customerPriceVisibility: 'show-price' | 'from-price' | 'request-quote' | 'hide-price-until-configured';
  formula: {
    enabled: boolean;
    profileKey: string;
    formulaKey: string;
    costingBasis: CostingBasis;
    matrixKey?: string;
    minimumChargeMinor: number;
    marginPercent: number;
    roundingMinor: number;
    requireResolvedConfig: boolean;
    allowMatrixFallback: boolean;
  };
  supplier: {
    enabled: boolean;
    vendorId: string;
    vendorName: string;
    supplierProductId: string;
    supplierSku: string;
    pricingEndpointKey: string;
    supplierLeadTimeDays: number;
    markupPercent: number;
    cloneSupplierOptions: boolean;
    useSupplierArtworkSpec: boolean;
    blockedOptionKeys: string;
    syncStatus: 'not-connected' | 'ready' | 'needs-mapping' | 'paused';
  };
  quote: {
    enabled: boolean;
    quoteReason: string;
    hideInstantPrice: boolean;
    showRequestQuoteButton: boolean;
    allowArtworkUploadBeforeQuote: boolean;
    requireManualApproval: boolean;
    minimumQuoteQuantity: number;
    quoteSlaHours: number;
    internalOwner: string;
  };
  routing: {
    priority: PricingRoutePriority;
    fallbackToQuote: boolean;
    fallbackMessage: string;
    blockCheckoutWhenUnpriced: boolean;
    notes: string;
  };
};

type ProductWithModeSettings = Product & { productModeSettings?: ProductModeSettings };

const modeOptions: Array<{ value: ProductPricingMode; label: string; description: string }> = [
  { value: 'formula', label: 'Formula mode', description: 'Use internal cost/pricing formulas, option groups and print maths.' },
  { value: 'supplier', label: 'Supplier mode', description: 'Use trade supplier/product API price as the primary price source.' },
  { value: 'quote', label: 'Quote mode', description: 'Hide instant price and send product/customer selections to quotation workflow.' },
  { value: 'hybrid-formula-supplier', label: 'Formula + supplier fallback', description: 'Use internal formula first, then supplier or quote fallback when unsupported.' },
  { value: 'hybrid-supplier-quote', label: 'Supplier + quote fallback', description: 'Use supplier price first, then request quote if API/options fail.' },
];

const defaultSettings: ProductModeSettings = {
  mode: 'formula',
  active: true,
  customerPriceVisibility: 'show-price',
  formula: {
    enabled: true,
    profileKey: 'internal-print-formula',
    formulaKey: 'sheet-or-area-cost-plus-margin',
    costingBasis: 'sheet',
    matrixKey: '',
    minimumChargeMinor: 0,
    marginPercent: 35,
    roundingMinor: 5,
    requireResolvedConfig: true,
    allowMatrixFallback: true,
  },
  supplier: {
    enabled: false,
    vendorId: '',
    vendorName: '',
    supplierProductId: '',
    supplierSku: '',
    pricingEndpointKey: '',
    supplierLeadTimeDays: 3,
    markupPercent: 35,
    cloneSupplierOptions: false,
    useSupplierArtworkSpec: false,
    blockedOptionKeys: '',
    syncStatus: 'not-connected',
  },
  quote: {
    enabled: false,
    quoteReason: 'Custom specification or unsupported option combination needs manual pricing.',
    hideInstantPrice: false,
    showRequestQuoteButton: true,
    allowArtworkUploadBeforeQuote: true,
    requireManualApproval: true,
    minimumQuoteQuantity: 1,
    quoteSlaHours: 4,
    internalOwner: 'sales',
  },
  routing: {
    priority: 'formula-first',
    fallbackToQuote: true,
    fallbackMessage: 'This configuration needs a quick manual quote before checkout.',
    blockCheckoutWhenUnpriced: true,
    notes: 'Stored for hosted storefront resolver. Public /api/v1 is not used for hosted themes.',
  },
};

function mergeSettings(input?: Partial<ProductModeSettings>): ProductModeSettings {
  return {
    ...defaultSettings,
    ...(input || {}),
    formula: { ...defaultSettings.formula, ...(input?.formula || {}) },
    supplier: { ...defaultSettings.supplier, ...(input?.supplier || {}) },
    quote: { ...defaultSettings.quote, ...(input?.quote || {}) },
    routing: { ...defaultSettings.routing, ...(input?.routing || {}) },
  };
}

function price(value: number) {
  return `£${((value || 0) / 100).toFixed(2)}`;
}

function minorFromPounds(value: string) {
  return Math.round((Number(value) || 0) * 100);
}

function poundsFromMinor(value: number) {
  return ((Number(value || 0)) / 100).toFixed(2);
}

function modeTone(mode: ProductPricingMode) {
  if (mode === 'formula') return 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100';
  if (mode === 'supplier') return 'border-violet-400/30 bg-violet-400/10 text-violet-100';
  if (mode === 'quote') return 'border-amber-400/30 bg-amber-400/10 text-amber-100';
  return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100';
}

function readiness(settings: ProductModeSettings) {
  const issues: string[] = [];
  if (!settings.active) issues.push('mode inactive');
  if (settings.formula.enabled && !settings.formula.profileKey.trim()) issues.push('formula profile missing');
  if (settings.supplier.enabled && !settings.supplier.vendorId && !settings.supplier.vendorName.trim()) issues.push('supplier missing');
  if (settings.supplier.enabled && !settings.supplier.supplierProductId.trim() && !settings.supplier.supplierSku.trim()) issues.push('supplier product mapping missing');
  if (settings.quote.enabled && !settings.quote.showRequestQuoteButton && settings.quote.hideInstantPrice) issues.push('quote button hidden while price hidden');
  if (!settings.formula.enabled && !settings.supplier.enabled && !settings.quote.enabled) issues.push('no pricing route enabled');
  if (settings.routing.blockCheckoutWhenUnpriced && !settings.routing.fallbackToQuote && !settings.quote.enabled) issues.push('unpriced checkout blocks without quote fallback');
  return issues;
}

export function ProductModeSettingsBuilder({ product, onUpdate }: { product: ProductWithModeSettings; onUpdate: (changes: Partial<ProductWithModeSettings>) => void }) {
  const settings = mergeSettings(product.productModeSettings);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const issues = readiness(settings);
  const selectedMode = modeOptions.find((item) => item.value === settings.mode) || modeOptions[0];

  useEffect(() => {
    vendorsService.listVendors()
      .then((response) => setVendors(response.data.items))
      .catch(() => setVendors([]));
  }, []);

  const vendorOptions = useMemo(() => [{ value: '', label: 'Select supplier / trade vendor' }, ...vendors.map((vendor) => ({ value: vendor.id, label: vendor.name }))], [vendors]);

  const setSettings = (next: ProductModeSettings) => onUpdate({ productModeSettings: next });
  const patchSettings = (patch: Partial<ProductModeSettings>) => setSettings(mergeSettings({ ...settings, ...patch }));
  const patchFormula = (patch: Partial<ProductModeSettings['formula']>) => setSettings(mergeSettings({ ...settings, formula: { ...settings.formula, ...patch } }));
  const patchSupplier = (patch: Partial<ProductModeSettings['supplier']>) => setSettings(mergeSettings({ ...settings, supplier: { ...settings.supplier, ...patch } }));
  const patchQuote = (patch: Partial<ProductModeSettings['quote']>) => setSettings(mergeSettings({ ...settings, quote: { ...settings.quote, ...patch } }));
  const patchRouting = (patch: Partial<ProductModeSettings['routing']>) => setSettings(mergeSettings({ ...settings, routing: { ...settings.routing, ...patch } }));

  const applyMode = (mode: ProductPricingMode) => {
    const next = mergeSettings({ ...settings, mode });
    if (mode === 'formula') {
      next.formula.enabled = true;
      next.supplier.enabled = false;
      next.quote.enabled = false;
      next.customerPriceVisibility = 'show-price';
      next.routing.priority = 'formula-first';
    }
    if (mode === 'supplier') {
      next.formula.enabled = false;
      next.supplier.enabled = true;
      next.quote.enabled = false;
      next.customerPriceVisibility = 'show-price';
      next.routing.priority = 'supplier-first';
    }
    if (mode === 'quote') {
      next.formula.enabled = false;
      next.supplier.enabled = false;
      next.quote.enabled = true;
      next.quote.hideInstantPrice = true;
      next.customerPriceVisibility = 'request-quote';
      next.routing.priority = 'quote-first';
      next.routing.fallbackToQuote = true;
    }
    if (mode === 'hybrid-formula-supplier') {
      next.formula.enabled = true;
      next.supplier.enabled = true;
      next.quote.enabled = true;
      next.customerPriceVisibility = 'show-price';
      next.routing.priority = 'formula-first';
      next.routing.fallbackToQuote = true;
    }
    if (mode === 'hybrid-supplier-quote') {
      next.formula.enabled = false;
      next.supplier.enabled = true;
      next.quote.enabled = true;
      next.customerPriceVisibility = 'from-price';
      next.routing.priority = 'supplier-first';
      next.routing.fallbackToQuote = true;
    }
    setSettings(next);
  };

  const selectedVendor = vendors.find((vendor) => vendor.id === settings.supplier.vendorId);

  return (
    <div className="space-y-4">
      <ProductSectionCard title="Formula / Supplier / Quote Product Modes">
        <p className="text-sm leading-6 text-textMuted">
          Choose how this product gets priced and ordered. This stores resolver-ready mode metadata with the product so hosted storefront checkout can later decide whether to use internal formula pricing, supplier API pricing, or request-a-quote flow.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-5">
          {modeOptions.map((mode) => (
            <button key={mode.value} type="button" onClick={() => applyMode(mode.value)} className={`rounded-2xl border p-4 text-left transition ${settings.mode === mode.value ? modeTone(mode.value) : 'border-white/8 bg-white/[0.02] text-textMuted hover:border-white/18'}`}>
              <p className="text-sm font-semibold text-white">{mode.label}</p>
              <p className="mt-2 text-xs leading-5 opacity-80">{mode.description}</p>
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Active mode</p>
            <p className="mt-2 text-sm font-semibold text-white">{selectedMode.label}</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Formula</p>
            <p className="mt-2 text-sm font-semibold text-white">{settings.formula.enabled ? settings.formula.costingBasis : 'Off'}</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Supplier</p>
            <p className="mt-2 text-sm font-semibold text-white">{settings.supplier.enabled ? selectedVendor?.name || settings.supplier.vendorName || 'Needs mapping' : 'Off'}</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Readiness</p>
            <p className="mt-2 text-sm font-semibold text-white">{issues.length ? `${issues.length} issue${issues.length === 1 ? '' : 's'}` : 'Resolver ready'}</p>
          </div>
        </div>

        {issues.length ? (
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {issues.map((issue) => <div key={issue} className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">{issue}</div>)}
          </div>
        ) : <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">This product has a usable pricing route for the hosted storefront resolver.</div>}
      </ProductSectionCard>

      <ProductSectionCard title="Resolver behaviour">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-sm"><span className="text-textMuted">Price visibility</span><Select options={[{ value: 'show-price', label: 'Show instant price' }, { value: 'from-price', label: 'Show from price' }, { value: 'request-quote', label: 'Request quote' }, { value: 'hide-price-until-configured', label: 'Hide until configured' }]} value={settings.customerPriceVisibility} onChange={(e) => patchSettings({ customerPriceVisibility: e.target.value as ProductModeSettings['customerPriceVisibility'] })} /></label>
          <label className="space-y-1 text-sm"><span className="text-textMuted">Route priority</span><Select options={[{ value: 'formula-first', label: 'Formula first' }, { value: 'supplier-first', label: 'Supplier first' }, { value: 'quote-first', label: 'Quote first' }]} value={settings.routing.priority} onChange={(e) => patchRouting({ priority: e.target.value as PricingRoutePriority })} /></label>
          <label className="flex items-end gap-2 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm text-textMuted"><input type="checkbox" checked={settings.active} onChange={(e) => patchSettings({ active: e.target.checked })} /> Product mode active</label>
          <label className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm text-textMuted"><input type="checkbox" checked={settings.routing.fallbackToQuote} onChange={(e) => patchRouting({ fallbackToQuote: e.target.checked })} /> Fallback to quote when unpriced</label>
          <label className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm text-textMuted"><input type="checkbox" checked={settings.routing.blockCheckoutWhenUnpriced} onChange={(e) => patchRouting({ blockCheckoutWhenUnpriced: e.target.checked })} /> Block checkout when unpriced</label>
          <Input value={settings.routing.fallbackMessage} placeholder="Fallback message" onChange={(e) => patchRouting({ fallbackMessage: e.target.value })} />
        </div>
        <label className="mt-3 block space-y-1 text-sm"><span className="text-textMuted">Internal resolver notes</span><textarea value={settings.routing.notes} onChange={(e) => patchRouting({ notes: e.target.value })} className="min-h-[90px] w-full rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 py-3 text-[13px] text-text outline-none" /></label>
      </ProductSectionCard>

      <div className="grid gap-4 xl:grid-cols-3">
        <ProductSectionCard title="Formula pricing mode">
          <div className="mb-3 flex items-center gap-2 text-sm text-textMuted"><Calculator size={16} /> Internal print maths / matrix / formula pricing</div>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-textMuted"><input type="checkbox" checked={settings.formula.enabled} onChange={(e) => patchFormula({ enabled: e.target.checked })} /> Enable formula pricing</label>
            <label className="space-y-1 text-sm"><span className="text-textMuted">Formula profile key</span><Input value={settings.formula.profileKey} onChange={(e) => patchFormula({ profileKey: e.target.value })} /></label>
            <label className="space-y-1 text-sm"><span className="text-textMuted">Formula key</span><Input value={settings.formula.formulaKey} onChange={(e) => patchFormula({ formulaKey: e.target.value })} /></label>
            <label className="space-y-1 text-sm"><span className="text-textMuted">Costing basis</span><Select options={[{ value: 'sheet', label: 'Sheet / SRA logic' }, { value: 'area', label: 'Area / sqm' }, { value: 'linear-metre', label: 'Linear metre / roll' }, { value: 'matrix', label: 'Matrix upload' }, { value: 'supplier-api', label: 'Supplier API' }, { value: 'manual-quote', label: 'Manual quote' }]} value={settings.formula.costingBasis} onChange={(e) => patchFormula({ costingBasis: e.target.value as CostingBasis })} /></label>
            <label className="space-y-1 text-sm"><span className="text-textMuted">Matrix key</span><Input value={settings.formula.matrixKey || ''} placeholder="route1-style-matrix-key" onChange={(e) => patchFormula({ matrixKey: e.target.value })} /></label>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="space-y-1 text-sm"><span className="text-textMuted">Min charge</span><Input type="number" step="0.01" value={poundsFromMinor(settings.formula.minimumChargeMinor)} onChange={(e) => patchFormula({ minimumChargeMinor: minorFromPounds(e.target.value) })} /></label>
              <label className="space-y-1 text-sm"><span className="text-textMuted">Margin %</span><Input type="number" value={String(settings.formula.marginPercent)} onChange={(e) => patchFormula({ marginPercent: Number(e.target.value) || 0 })} /></label>
              <label className="space-y-1 text-sm"><span className="text-textMuted">Round pence</span><Input type="number" value={String(settings.formula.roundingMinor)} onChange={(e) => patchFormula({ roundingMinor: Number(e.target.value) || 0 })} /></label>
            </div>
            <label className="flex items-center gap-2 text-sm text-textMuted"><input type="checkbox" checked={settings.formula.requireResolvedConfig} onChange={(e) => patchFormula({ requireResolvedConfig: e.target.checked })} /> Require resolved config</label>
            <label className="flex items-center gap-2 text-sm text-textMuted"><input type="checkbox" checked={settings.formula.allowMatrixFallback} onChange={(e) => patchFormula({ allowMatrixFallback: e.target.checked })} /> Allow matrix fallback</label>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-xs text-textMuted">Minimum charge preview: {price(settings.formula.minimumChargeMinor)} · Margin {settings.formula.marginPercent}%</div>
          </div>
        </ProductSectionCard>

        <ProductSectionCard title="Supplier pricing mode">
          <div className="mb-3 flex items-center gap-2 text-sm text-textMuted"><Truck size={16} /> Trade supplier API/product mapping</div>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-textMuted"><input type="checkbox" checked={settings.supplier.enabled} onChange={(e) => patchSupplier({ enabled: e.target.checked })} /> Enable supplier pricing</label>
            <label className="space-y-1 text-sm"><span className="text-textMuted">Supplier / vendor</span><Select options={vendorOptions} value={settings.supplier.vendorId} onChange={(e) => {
              const vendor = vendors.find((item) => item.id === e.target.value);
              patchSupplier({ vendorId: e.target.value, vendorName: vendor?.name || settings.supplier.vendorName, syncStatus: e.target.value ? 'needs-mapping' : 'not-connected' });
            }} /></label>
            <label className="space-y-1 text-sm"><span className="text-textMuted">Supplier name override</span><Input value={settings.supplier.vendorName} placeholder="Tradeprint / Route 1 / manual supplier" onChange={(e) => patchSupplier({ vendorName: e.target.value })} /></label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="space-y-1 text-sm"><span className="text-textMuted">Supplier product ID</span><Input value={settings.supplier.supplierProductId} onChange={(e) => patchSupplier({ supplierProductId: e.target.value })} /></label>
              <label className="space-y-1 text-sm"><span className="text-textMuted">Supplier SKU</span><Input value={settings.supplier.supplierSku} onChange={(e) => patchSupplier({ supplierSku: e.target.value })} /></label>
            </div>
            <label className="space-y-1 text-sm"><span className="text-textMuted">Pricing endpoint key</span><Input value={settings.supplier.pricingEndpointKey} placeholder="supplier-products/prices" onChange={(e) => patchSupplier({ pricingEndpointKey: e.target.value })} /></label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="space-y-1 text-sm"><span className="text-textMuted">Lead days</span><Input type="number" value={String(settings.supplier.supplierLeadTimeDays)} onChange={(e) => patchSupplier({ supplierLeadTimeDays: Number(e.target.value) || 0 })} /></label>
              <label className="space-y-1 text-sm"><span className="text-textMuted">Markup %</span><Input type="number" value={String(settings.supplier.markupPercent)} onChange={(e) => patchSupplier({ markupPercent: Number(e.target.value) || 0 })} /></label>
            </div>
            <label className="space-y-1 text-sm"><span className="text-textMuted">Sync status</span><Select options={[{ value: 'not-connected', label: 'Not connected' }, { value: 'ready', label: 'Ready' }, { value: 'needs-mapping', label: 'Needs mapping' }, { value: 'paused', label: 'Paused' }]} value={settings.supplier.syncStatus} onChange={(e) => patchSupplier({ syncStatus: e.target.value as ProductModeSettings['supplier']['syncStatus'] })} /></label>
            <label className="space-y-1 text-sm"><span className="text-textMuted">Blocked supplier option/material keys</span><Input value={settings.supplier.blockedOptionKeys} placeholder="comma separated" onChange={(e) => patchSupplier({ blockedOptionKeys: e.target.value })} /></label>
            <label className="flex items-center gap-2 text-sm text-textMuted"><input type="checkbox" checked={settings.supplier.cloneSupplierOptions} onChange={(e) => patchSupplier({ cloneSupplierOptions: e.target.checked })} /> Clone supplier options into storefront</label>
            <label className="flex items-center gap-2 text-sm text-textMuted"><input type="checkbox" checked={settings.supplier.useSupplierArtworkSpec} onChange={(e) => patchSupplier({ useSupplierArtworkSpec: e.target.checked })} /> Use supplier artwork spec</label>
          </div>
        </ProductSectionCard>

        <ProductSectionCard title="Quote product mode">
          <div className="mb-3 flex items-center gap-2 text-sm text-textMuted"><FileQuestion size={16} /> Manual quote and custom product flow</div>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-textMuted"><input type="checkbox" checked={settings.quote.enabled} onChange={(e) => patchQuote({ enabled: e.target.checked })} /> Enable quote mode</label>
            <label className="space-y-1 text-sm"><span className="text-textMuted">Quote reason</span><textarea value={settings.quote.quoteReason} onChange={(e) => patchQuote({ quoteReason: e.target.value })} className="min-h-[92px] w-full rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 py-3 text-[13px] text-text outline-none" /></label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="space-y-1 text-sm"><span className="text-textMuted">Minimum quote quantity</span><Input type="number" value={String(settings.quote.minimumQuoteQuantity)} onChange={(e) => patchQuote({ minimumQuoteQuantity: Number(e.target.value) || 1 })} /></label>
              <label className="space-y-1 text-sm"><span className="text-textMuted">SLA hours</span><Input type="number" value={String(settings.quote.quoteSlaHours)} onChange={(e) => patchQuote({ quoteSlaHours: Number(e.target.value) || 0 })} /></label>
            </div>
            <label className="space-y-1 text-sm"><span className="text-textMuted">Internal owner</span><Input value={settings.quote.internalOwner} onChange={(e) => patchQuote({ internalOwner: e.target.value })} /></label>
            <label className="flex items-center gap-2 text-sm text-textMuted"><input type="checkbox" checked={settings.quote.hideInstantPrice} onChange={(e) => patchQuote({ hideInstantPrice: e.target.checked })} /> Hide instant price</label>
            <label className="flex items-center gap-2 text-sm text-textMuted"><input type="checkbox" checked={settings.quote.showRequestQuoteButton} onChange={(e) => patchQuote({ showRequestQuoteButton: e.target.checked })} /> Show request quote button</label>
            <label className="flex items-center gap-2 text-sm text-textMuted"><input type="checkbox" checked={settings.quote.allowArtworkUploadBeforeQuote} onChange={(e) => patchQuote({ allowArtworkUploadBeforeQuote: e.target.checked })} /> Allow artwork upload before quote</label>
            <label className="flex items-center gap-2 text-sm text-textMuted"><input type="checkbox" checked={settings.quote.requireManualApproval} onChange={(e) => patchQuote({ requireManualApproval: e.target.checked })} /> Require manual approval</label>
          </div>
        </ProductSectionCard>
      </div>

      <ProductSectionCard title="Resolver handoff preview">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><div className="flex items-center gap-2 text-sm font-medium text-white"><Calculator size={15} /> Formula route</div><p className="mt-2 text-xs leading-5 text-textMuted">{settings.formula.enabled ? `${settings.formula.profileKey} · ${settings.formula.costingBasis} · min ${price(settings.formula.minimumChargeMinor)}` : 'Disabled'}</p></div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><div className="flex items-center gap-2 text-sm font-medium text-white"><Link2 size={15} /> Supplier route</div><p className="mt-2 text-xs leading-5 text-textMuted">{settings.supplier.enabled ? `${settings.supplier.vendorName || selectedVendor?.name || 'Supplier'} · ${settings.supplier.supplierProductId || settings.supplier.supplierSku || 'needs mapping'} · ${settings.supplier.markupPercent}% markup` : 'Disabled'}</p></div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><div className="flex items-center gap-2 text-sm font-medium text-white"><Shuffle size={15} /> Fallback</div><p className="mt-2 text-xs leading-5 text-textMuted">{settings.routing.fallbackToQuote ? settings.routing.fallbackMessage : 'No quote fallback. Checkout may block if unpriced.'}</p></div>
        </div>
      </ProductSectionCard>
    </div>
  );
}
