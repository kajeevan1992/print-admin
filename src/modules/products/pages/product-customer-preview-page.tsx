'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/buttons';
import { ProductSectionCard } from '@/modules/products/components/product-section-card';
import { productsService } from '@/services/products.service';
import { calculateProductEstimate, getArtworkProfile, getCompatibleFinishes, getCompatibleMaterials, getTemplateById } from '@/lib/product-system';
import type { Product } from '@/modules/products/types';
import { productConfigurationReadinessLabel, validateProductConfiguration } from '@/modules/products/lib/product-configuration-readiness';

export function ProductCustomerPreviewPage({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    productsService.getProduct(productId)
      .then((response) => setProduct(response.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load product preview'))
      .finally(() => setLoading(false));
  }, [productId]);

  useEffect(() => {
    if (!product?.optionGroups?.length) return;
    const defaults: Record<string, string> = {};
    product.optionGroups.forEach((group) => {
      const visibleValues = group.values.filter((value) => !value.isHidden);
      const defaultValue = visibleValues.find((value) => value.id === group.defaultValueId || value.isDefault) || visibleValues[0];
      if (defaultValue) defaults[group.key] = defaultValue.id;
    });
    setSelectedOptions(defaults);
  }, [product?.id]);

  const previewData = useMemo(() => {
    if (!product) return null;
    const system = product.productSystem ?? { templateId: 'business-cards', materialId: 'silk-350', finishId: 'matt-lam', printerId: 'hp-indigo-7k', quantity: 250, turnaround: 'standard' as const, fieldValues: {} };
    const template = getTemplateById(system.templateId);
    const materials = getCompatibleMaterials(system.templateId);
    const material = materials.find((item) => item.id === system.materialId) ?? materials[0];
    const finishes = getCompatibleFinishes(system.templateId, material?.id ?? system.materialId);
    const finish = finishes.find((item) => item.id === system.finishId) ?? finishes[0];
    const estimate = calculateProductEstimate(system.quantity, material?.id ?? system.materialId, finish?.id ?? system.finishId, system.printerId, system.turnaround, system.fieldValues);
    const artwork = getArtworkProfile(system.templateId);
    const templateRules = product.templateRules;
    const readinessIssues = validateProductConfiguration(product);
    return { system, template, material, finish, estimate, artwork, templateRules, readinessIssues, readinessLabel: productConfigurationReadinessLabel(readinessIssues) };
  }, [product]);

  if (loading) return <ProductSectionCard title="Loading preview">Loading customer-facing product preview...</ProductSectionCard>;
  if (error) return <ProductSectionCard title="Preview error"><p className="text-red-300">{error}</p></ProductSectionCard>;
  if (!product || !previewData) return <ProductSectionCard title="Preview unavailable">Product not found.</ProductSectionCard>;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100">
        Customer preview mode. This is not the editable admin screen. It shows the current product as a buyer would start to see it.
      </div>
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-textMuted">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.22em]">Product configuration readiness</p>
            <p className="mt-1 font-medium text-white">{previewData.readinessLabel}</p>
          </div>
          <span className="rounded-full border border-border px-3 py-1 text-xs">{previewData.readinessIssues.length} check{previewData.readinessIssues.length === 1 ? '' : 's'}</span>
        </div>
        {previewData.readinessIssues.length > 0 && (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {previewData.readinessIssues.slice(0, 4).map((issue) => (
              <div key={issue.id} className="rounded-lg border border-border p-2">
                <p className="font-medium text-white">{issue.title}</p>
                <p className="mt-1 text-xs">{issue.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-border bg-panel p-5">
          <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03]">
            {product.thumbnail ? <img src={product.thumbnail} alt={product.name} className="max-h-[320px] rounded-2xl object-contain" /> : <span className="text-textMuted">Product artwork preview</span>}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-panel p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-textMuted">{previewData.templateRules?.templateName || previewData.template.name}</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">{product.name}</h1>
          <p className="mt-3 text-sm leading-6 text-textMuted">{product.description || 'Product description will appear here for the customer.'}</p>

          {product.optionGroups?.length ? (
            <div className="mt-5 space-y-4">
              {product.optionGroups.filter((group) => {
                const rules = product.optionGroups?.flatMap((item) => item.dependencyRules || []) || [];
                const hideRule = rules.find((rule) => (rule.targetGroupKey || '') === group.key && rule.action === 'hide' && selectedOptions[rule.whenGroupKey] === rule.whenValueId);
                const showRules = rules.filter((rule) => (rule.targetGroupKey || '') === group.key && rule.action === 'show');
                return !hideRule && (showRules.length === 0 || showRules.some((rule) => selectedOptions[rule.whenGroupKey] === rule.whenValueId));
              }).map((group) => {
                const values = [...group.values].filter((value) => !value.isHidden).sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
                const requiredByRule = (product.optionGroups?.flatMap((item) => item.dependencyRules || []) || []).some((rule) => (rule.targetGroupKey || '') === group.key && rule.action === 'require' && selectedOptions[rule.whenGroupKey] === rule.whenValueId);
                const selected = selectedOptions[group.key] || group.defaultValueId || values.find((value) => value.isDefault)?.id || values[0]?.id;
                const gridCols = group.displayColumns === 1 ? 'sm:grid-cols-1' : group.displayColumns === 3 ? 'sm:grid-cols-3' : group.displayColumns === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-2';
                return (
                <div key={group.id}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-white">{group.name} {(group.required || requiredByRule) && <span className="text-red-300">*</span>}</p>
                    <span className="rounded-full border border-border px-2 py-1 text-[11px] text-textMuted">{group.displayType}</span>
                  </div>
                  {group.helpText && <p className="mb-2 text-xs text-textMuted">{group.helpText}</p>}
                  <div className={group.displayType === 'dropdown' ? '' : `grid gap-2 ${gridCols}`}>
                    {group.displayType === 'dropdown' ? (
                      <select value={selected || ''} onChange={(event) => setSelectedOptions((current) => ({ ...current, [group.key]: event.target.value }))} className="w-full rounded-xl border border-border bg-panelMuted px-3 py-3 text-sm text-white">
                        {values.map((value) => <option key={value.id} value={value.id}>{value.label}</option>)}
                      </select>
                    ) : group.displayType === 'custom-size' || group.allowCustomSize ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input className="rounded-xl border border-border bg-panelMuted px-3 py-3 text-sm text-white" placeholder={`Width max ${group.maxWidth || previewData.templateRules?.maxPrintableWidth || 'not set'} ${group.unit || 'mm'}`} />
                        <input className="rounded-xl border border-border bg-panelMuted px-3 py-3 text-sm text-white" placeholder={`Height/length max ${group.maxHeight || previewData.templateRules?.maxPrintableLength || 'not set'} ${group.unit || 'mm'}`} />
                      </div>
                    ) : values.map((value) => {
                      const active = selected === value.id;
                      const isCheckbox = group.displayType === 'checkboxes' || group.allowMultiple;
                      return (
                      <button type="button" key={value.id} onClick={() => setSelectedOptions((current) => ({ ...current, [group.key]: value.id }))} className={`rounded-2xl border p-3 text-left transition ${active ? 'border-emerald-400 bg-emerald-500/10' : 'border-white/8 bg-white/[0.03]'}`}>
                        {value.imageUrl && <img src={value.imageUrl} alt={value.label} className="mb-2 h-20 w-full rounded-xl object-cover" />}
                        {group.displayType === 'swatches' && <span className="mb-2 block h-8 w-8 rounded-full border border-white/20" style={{ background: value.swatchColor || value.label }} />}
                        <div className="flex items-start gap-2">
                          <span className={`mt-1 h-3 w-3 shrink-0 border border-white/30 ${isCheckbox ? 'rounded' : 'rounded-full'} ${active ? 'bg-emerald-300' : ''}`} />
                          <div>
                            <p className="font-medium text-white">{value.label}</p>
                            {!group.hideDescriptions && value.description && <p className="mt-1 text-xs text-textMuted">{value.description}</p>}
                            {(value.width && value.height) && <p className="mt-1 text-[11px] text-textMuted">{value.width} × {value.height} {value.unit || group.unit || 'mm'}</p>}
                            {value.leadTimeDays && <p className="mt-1 text-[11px] text-textMuted">{value.leadTimeDays} day lead time</p>}
                          </div>
                        </div>
                      </button>
                    )})}
                  </div>
                  {group.allowCustomSize && group.displayType !== 'custom-size' && <p className="mt-2 text-xs text-textMuted">Custom size enabled. Max width {group.maxWidth || previewData.templateRules?.maxPrintableWidth || 'not set'} {group.unit || previewData.templateRules?.sourceSheetUnit || 'mm'}.</p>}
                </div>
              )})}
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><p className="text-xs text-textMuted">Material</p><p className="mt-1 font-medium text-white">{previewData.material?.name ?? 'Not configured'}</p></div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><p className="text-xs text-textMuted">Finish</p><p className="mt-1 font-medium text-white">{previewData.finish?.name ?? 'Not configured'}</p></div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><p className="text-xs text-textMuted">Quantity</p><p className="mt-1 font-medium text-white">{previewData.system.quantity}</p></div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><p className="text-xs text-textMuted">Turnaround</p><p className="mt-1 font-medium text-white">{previewData.system.turnaround}</p></div>
            </div>
          )}

          <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-emerald-100/75">Estimated price</p>
            <p className="mt-2 text-3xl font-semibold text-white">£{previewData.estimate.total}</p>
            <p className="mt-1 text-sm text-emerald-100/75">{previewData.estimate.tierLabel} · {previewData.estimate.turnaroundDays} day lead</p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button>Upload artwork</Button>
            <Button>Start from template</Button>
            <Button>Add to basket</Button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-panel p-5">
        <p className="text-sm font-medium text-white">Artwork checks shown to customer</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(previewData.templateRules ? [
            'Allowed files: ' + (previewData.templateRules.artworkRules.allowedFileTypes.join(', ') || 'not set'),
            'Files required: ' + previewData.templateRules.artworkRules.minFiles + '-' + previewData.templateRules.artworkRules.maxFiles,
            'Bleed: ' + (previewData.templateRules.artworkRules.bleedMm ?? 'not set') + ' mm',
            previewData.templateRules.artworkRules.customerInstructions || 'Customer artwork instructions not set'
          ] : previewData.artwork.checklist).map((item) => <div key={item} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-textMuted">{item}</div>)}
        </div>
      </div>
    </div>
  );
}
