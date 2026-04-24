'use client';

import { Button } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { ProductSectionCard } from './product-section-card';
import type { Product, ProductTemplateRuleConfig } from '@/modules/products/types';

const templatePresets: Record<string, ProductTemplateRuleConfig> = {
  'business-cards': {
    templateKey: 'business-cards',
    templateName: 'Business Cards',
    mergeMode: 'merge-overrides',
    pricingProfileKey: 'sheet-fed-cards',
    productionMethod: 'sra3-sheet-fed',
    sourceSheetWidth: 320,
    sourceSheetHeight: 450,
    sourceSheetUnit: 'mm',
    maxPrintableWidth: 320,
    maxPrintableLength: 450,
    notes: 'Use option groups for size, sides, material, finish, quantity and turnaround. Pricing can later calculate ups per SRA3 sheet.',
    artworkRules: { allowedFileTypes: ['pdf'], minFiles: 1, maxFiles: 2, bleedMm: 3, requirePdf: true, allowDesignFromTemplate: true, customerInstructions: 'Upload print-ready PDF artwork with bleed, or start from a template when templates are enabled.' },
  },
  booklets: {
    templateKey: 'booklets',
    templateName: 'Booklets',
    mergeMode: 'merge-overrides',
    pricingProfileKey: 'booklet-sheet-count',
    productionMethod: 'sra3-booklet',
    sourceSheetWidth: 320,
    sourceSheetHeight: 450,
    sourceSheetUnit: 'mm',
    maxPrintableWidth: 320,
    maxPrintableLength: 450,
    notes: 'Later pricing should calculate inner sheets, optional cover card, page count, imposition and binding/finishing time.',
    artworkRules: { allowedFileTypes: ['pdf'], minFiles: 1, maxFiles: 2, bleedMm: 3, requirePdf: true, allowDesignFromTemplate: false, customerInstructions: 'Upload one combined booklet PDF, or separate cover and inner PDFs when this product allows cover options.' },
  },
  banners: {
    templateKey: 'banners',
    templateName: 'PVC Banners',
    mergeMode: 'merge-overrides',
    pricingProfileKey: 'roll-fed-area',
    productionMethod: 'large-format-roll',
    sourceSheetWidth: 1300,
    sourceSheetHeight: 50000,
    sourceSheetUnit: 'mm',
    maxPrintableWidth: 1200,
    maxPrintableLength: 50000,
    notes: 'Use preset size values plus custom width/height. Max width should come from the smaller of material roll width and printer width.',
    artworkRules: { allowedFileTypes: ['pdf', 'jpg', 'png'], minFiles: 1, maxFiles: 1, bleedMm: 0, requirePdf: false, allowDesignFromTemplate: false, customerInstructions: 'Upload artwork at the selected banner size. Large files may be supplied as PDF, JPG or PNG.' },
  },
  boards: {
    templateKey: 'boards',
    templateName: 'Boards / Rigid Media',
    mergeMode: 'merge-overrides',
    pricingProfileKey: 'board-nesting-cutting',
    productionMethod: 'flatbed-board',
    sourceSheetWidth: 1220,
    sourceSheetHeight: 2440,
    sourceSheetUnit: 'mm',
    maxPrintableWidth: 1220,
    maxPrintableLength: 2440,
    notes: 'Later pricing should calculate how many pieces fit on a board plus cutting/routing time for custom shapes.',
    artworkRules: { allowedFileTypes: ['pdf'], minFiles: 1, maxFiles: 1, bleedMm: 3, requirePdf: true, allowDesignFromTemplate: false, customerInstructions: 'Upload print-ready artwork. Custom-cut products may need a cutline layer later.' },
  },
};

function defaultRules(product: Product): ProductTemplateRuleConfig {
  return product.templateRules || templatePresets[product.productSystem?.templateId || 'business-cards'] || templatePresets['business-cards'];
}

function csvToList(value: string) {
  return value.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
}

export function ProductTemplateRulesBuilder({ product, onUpdate }: { product: Product; onUpdate: (changes: Partial<Product>) => void }) {
  const rules = defaultRules(product);
  const setRules = (patch: Partial<ProductTemplateRuleConfig>) => onUpdate({ templateRules: { ...rules, ...patch, artworkRules: { ...rules.artworkRules, ...(patch.artworkRules || {}) } } });
  const applyPreset = (key: string) => onUpdate({ templateRules: templatePresets[key] });

  return (
    <div className="space-y-4">
      <ProductSectionCard title="Product template and override mode">
        <p className="text-sm leading-6 text-textMuted">Choose the reusable product setup pattern, then decide whether this product follows it exactly, merges custom overrides, or uses its own custom setup. This stores structure for pricing and storefront behaviour later; it does not run pricing yet.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {Object.values(templatePresets).map((preset) => <Button key={preset.templateKey} onClick={() => applyPreset(preset.templateKey)}>{preset.templateName}</Button>)}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-sm"><span className="text-textMuted">Template key</span><Input value={rules.templateKey} onChange={(e) => setRules({ templateKey: e.target.value })} /></label>
          <label className="space-y-1 text-sm"><span className="text-textMuted">Template name</span><Input value={rules.templateName} onChange={(e) => setRules({ templateName: e.target.value })} /></label>
          <label className="space-y-1 text-sm"><span className="text-textMuted">Merge / override mode</span><select value={rules.mergeMode} onChange={(e) => setRules({ mergeMode: e.target.value as ProductTemplateRuleConfig['mergeMode'] })} className="w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm"><option value="template-only">Use template only</option><option value="merge-overrides">Merge template + product overrides</option><option value="product-only">Product custom setup only</option></select></label>
        </div>
      </ProductSectionCard>

      <ProductSectionCard title="Pricing and production hooks for later">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-sm"><span className="text-textMuted">Pricing profile key</span><Input value={rules.pricingProfileKey || ''} placeholder="sheet-fed-cards" onChange={(e) => setRules({ pricingProfileKey: e.target.value })} /></label>
          <label className="space-y-1 text-sm"><span className="text-textMuted">Production method</span><Input value={rules.productionMethod || ''} placeholder="sra3-sheet-fed" onChange={(e) => setRules({ productionMethod: e.target.value })} /></label>
          <label className="space-y-1 text-sm"><span className="text-textMuted">Unit</span><Input value={rules.sourceSheetUnit || 'mm'} onChange={(e) => setRules({ sourceSheetUnit: e.target.value })} /></label>
          <label className="space-y-1 text-sm"><span className="text-textMuted">Source sheet / roll width</span><Input type="number" value={String(rules.sourceSheetWidth || '')} onChange={(e) => setRules({ sourceSheetWidth: Number(e.target.value) || undefined })} /></label>
          <label className="space-y-1 text-sm"><span className="text-textMuted">Source sheet / roll length</span><Input type="number" value={String(rules.sourceSheetHeight || '')} onChange={(e) => setRules({ sourceSheetHeight: Number(e.target.value) || undefined })} /></label>
          <label className="space-y-1 text-sm"><span className="text-textMuted">Max printable width</span><Input type="number" value={String(rules.maxPrintableWidth || '')} onChange={(e) => setRules({ maxPrintableWidth: Number(e.target.value) || undefined })} /></label>
          <label className="space-y-1 text-sm"><span className="text-textMuted">Max printable length/height</span><Input type="number" value={String(rules.maxPrintableLength || '')} onChange={(e) => setRules({ maxPrintableLength: Number(e.target.value) || undefined })} /></label>
        </div>
        <label className="mt-3 block space-y-1 text-sm"><span className="text-textMuted">Admin notes for pricing/production</span><textarea value={rules.notes || ''} onChange={(e) => setRules({ notes: e.target.value })} className="min-h-[92px] w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm" /></label>
      </ProductSectionCard>

      <ProductSectionCard title="Artwork rules shown to customer later">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-sm"><span className="text-textMuted">Allowed file types</span><Input value={rules.artworkRules.allowedFileTypes.join(', ')} placeholder="pdf, jpg, png" onChange={(e) => setRules({ artworkRules: { ...rules.artworkRules, allowedFileTypes: csvToList(e.target.value) } })} /></label>
          <label className="space-y-1 text-sm"><span className="text-textMuted">Minimum files</span><Input type="number" value={String(rules.artworkRules.minFiles)} onChange={(e) => setRules({ artworkRules: { ...rules.artworkRules, minFiles: Number(e.target.value) || 0 } })} /></label>
          <label className="space-y-1 text-sm"><span className="text-textMuted">Maximum files</span><Input type="number" value={String(rules.artworkRules.maxFiles)} onChange={(e) => setRules({ artworkRules: { ...rules.artworkRules, maxFiles: Number(e.target.value) || 0 } })} /></label>
          <label className="space-y-1 text-sm"><span className="text-textMuted">Required page count</span><Input type="number" value={String(rules.artworkRules.requiredPageCount || '')} onChange={(e) => setRules({ artworkRules: { ...rules.artworkRules, requiredPageCount: Number(e.target.value) || undefined } })} /></label>
          <label className="space-y-1 text-sm"><span className="text-textMuted">Bleed mm</span><Input type="number" value={String(rules.artworkRules.bleedMm || '')} onChange={(e) => setRules({ artworkRules: { ...rules.artworkRules, bleedMm: Number(e.target.value) || undefined } })} /></label>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-textMuted">
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!rules.artworkRules.requirePdf} onChange={(e) => setRules({ artworkRules: { ...rules.artworkRules, requirePdf: e.target.checked } })} /> Require PDF</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!rules.artworkRules.allowDesignFromTemplate} onChange={(e) => setRules({ artworkRules: { ...rules.artworkRules, allowDesignFromTemplate: e.target.checked } })} /> Allow design from template</label>
        </div>
        <label className="mt-3 block space-y-1 text-sm"><span className="text-textMuted">Customer artwork instructions</span><textarea value={rules.artworkRules.customerInstructions || ''} onChange={(e) => setRules({ artworkRules: { ...rules.artworkRules, customerInstructions: e.target.value } })} className="min-h-[92px] w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm" /></label>
      </ProductSectionCard>
    </div>
  );
}
