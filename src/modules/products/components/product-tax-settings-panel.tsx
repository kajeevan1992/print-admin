'use client';

import { useMemo } from 'react';
import { AlertTriangle, BadgePoundSterling, Receipt, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { ProductSectionCard } from '@/modules/products/components/product-section-card';
import type { Product, ProductTaxSettings } from '@/modules/products/types';

const taxClassOptions = [
  { value: 'auto', label: 'Auto-detect from product/category' },
  { value: 'zero', label: 'Zero-rated printed matter — 0%' },
  { value: 'standard', label: 'Standard-rated goods/services — 20%' },
  { value: 'exempt', label: 'Exempt / outside scope — 0%' },
  { value: 'custom', label: 'Custom VAT rate' },
];

const commonPresetOptions = [
  { value: 'auto', label: 'Auto' },
  { value: 'leaflets-flyers', label: 'Leaflets / flyers — usually 0%' },
  { value: 'booklets-brochures', label: 'Booklets / brochures — usually 0%' },
  { value: 'business-cards', label: 'Business cards — usually 20%' },
  { value: 'signage-banners', label: 'Signage / banners / boards — usually 20%' },
  { value: 'stickers-labels', label: 'Stickers / labels — usually 20%' },
  { value: 'design-service', label: 'Design / artwork service — 20%' },
];

function defaultTaxSettings(product: Product): ProductTaxSettings {
  const existing = product.taxSettings || {};
  return {
    taxClass: existing.taxClass || 'auto',
    vatRate: existing.vatRate ?? undefined,
    vatLabel: existing.vatLabel || '',
    preset: existing.preset || 'auto',
    appliesToAddons: existing.appliesToAddons ?? false,
    forceVatOnDesignServices: existing.forceVatOnDesignServices ?? true,
    invoiceDescription: existing.invoiceDescription || '',
    internalNote: existing.internalNote || '',
  };
}

function inferredRate(settings: ProductTaxSettings) {
  if (settings.taxClass === 'zero' || settings.taxClass === 'exempt') return 0;
  if (settings.taxClass === 'standard') return 20;
  if (settings.taxClass === 'custom') return Number(settings.vatRate || 0);
  if (settings.preset === 'leaflets-flyers' || settings.preset === 'booklets-brochures') return 0;
  if (settings.preset && settings.preset !== 'auto') return 20;
  return null;
}

function presetExplanation(settings: ProductTaxSettings) {
  const rate = inferredRate(settings);
  if (rate === null) return 'Auto mode lets the VAT rules service detect the VAT class from explicit product metadata first, then print-specific fallback terms.';
  if (rate === 0) return 'This product will be treated as zero-rated unless an explicit line/add-on override says otherwise.';
  return 'This product will be treated as standard-rated unless an explicit line/add-on override says otherwise.';
}

export function ProductTaxSettingsPanel({ product, onUpdate }: { product: Product; onUpdate: (changes: Partial<Product>) => void }) {
  const settings = useMemo(() => defaultTaxSettings(product), [product]);
  const rate = inferredRate(settings);
  const updateTax = (changes: Partial<ProductTaxSettings>) => onUpdate({ taxSettings: { ...settings, ...changes } });

  return (
    <div className="space-y-4">
      <ProductSectionCard title="Product VAT Settings">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-white">VAT preset</span>
                <Select options={commonPresetOptions} value={settings.preset || 'auto'} onChange={(e) => updateTax({ preset: e.target.value as ProductTaxSettings['preset'] })} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-white">Tax class</span>
                <Select options={taxClassOptions} value={settings.taxClass || 'auto'} onChange={(e) => updateTax({ taxClass: e.target.value as ProductTaxSettings['taxClass'] })} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-white">Custom VAT rate %</span>
                <Input type="number" min="0" step="0.01" value={settings.vatRate === undefined ? '' : String(settings.vatRate)} onChange={(e) => updateTax({ vatRate: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="20" />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-white">Invoice VAT label</span>
                <Input value={settings.vatLabel || ''} onChange={(e) => updateTax({ vatLabel: e.target.value })} placeholder="Zero-rated printed matter" />
              </label>
            </div>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-white">Invoice line description override</span>
              <Input value={settings.invoiceDescription || ''} onChange={(e) => updateTax({ invoiceDescription: e.target.value })} placeholder="Optional invoice wording for this product" />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-white">Internal VAT note</span>
              <textarea value={settings.internalNote || ''} onChange={(e) => updateTax({ internalNote: e.target.value })} placeholder="Example: Leaflets are zero-rated, but design service add-ons remain standard VAT." className="min-h-[96px] w-full rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 py-3 text-[13px] text-text outline-none" />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm text-textMuted">
                <input type="checkbox" checked={Boolean(settings.appliesToAddons)} onChange={(e) => updateTax({ appliesToAddons: e.target.checked })} />
                <span><b className="block text-white">Apply same VAT to add-ons</b>Only enable this for true product add-ons that share the same VAT treatment.</span>
              </label>
              <label className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm text-textMuted">
                <input type="checkbox" checked={settings.forceVatOnDesignServices !== false} onChange={(e) => updateTax({ forceVatOnDesignServices: e.target.checked })} />
                <span><b className="block text-white">Design services always 20%</b>Keeps artwork/design support standard-rated even when product is zero-rated.</span>
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
              <div className="flex items-start gap-3">
                <BadgePoundSterling className="mt-0.5 text-emerald-300" size={18} />
                <div>
                  <p className="font-medium text-white">Resolved VAT preview</p>
                  <p className="mt-1 text-sm text-emerald-100/85">{rate === null ? 'Auto / fallback' : `${rate}% VAT`}</p>
                  <p className="mt-2 text-sm leading-6 text-textMuted">{presetExplanation(settings)}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-textMuted">
              <div className="mb-2 flex items-center gap-2 text-white"><Receipt size={16} /> Invoice impact</div>
              <p>Checkout/order-save will store line-level VAT metadata. Invoice PDFs use those saved values for mixed VAT breakdown.</p>
            </div>
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-50/90">
              <div className="mb-2 flex items-center gap-2 text-white"><AlertTriangle size={16} /> VAT responsibility</div>
              <p>These controls enforce software logic, but product VAT treatment should still be checked against HMRC/accountant advice for edge cases.</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-textMuted">
              <div className="mb-2 flex items-center gap-2 text-white"><ShieldCheck size={16} /> Reuse note</div>
              <p>This panel saves to the existing product metadata record used by option groups, product modes and resolver data. No duplicate product table/module was created.</p>
            </div>
          </div>
        </div>
      </ProductSectionCard>
    </div>
  );
}
