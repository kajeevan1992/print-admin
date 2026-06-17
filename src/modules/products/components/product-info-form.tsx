import Link from 'next/link';
import { FormGrid } from '@/components/forms/form-grid';
import { FormSection } from '@/components/forms/form-section';
import { Input } from '@/components/forms/input';
import { Select, type SelectOption } from '@/components/forms/select';
import { Toggle } from '@/components/forms/toggle';
import { calculateProductEstimate, printerProfiles, productFinishes, productMaterials, productTemplates } from '@/lib/product-system';
import { productVendors, storefrontOptions } from '@/data/products';
import type { Product, ProductSystemConfig } from '@/modules/products/types';

type CategoryOption = SelectOption & { slug?: string; friendlyUrl?: string };

const productTypeOptions: SelectOption[] = [
  { value: 'online', label: 'Online' },
  { value: 'static', label: 'Static PDF' },
  { value: 'parametric', label: 'Parametric' }
];

function slugify(value: string) {
  return String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function cleanSlug(value: string) {
  return slugify(String(value || '').replace(/^\/+/, '').replace(/\/+$/, ''));
}

function storefrontBaseUrl() {
  return (process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://hosted-theme.vercel.app').replace(/\/$/, '');
}

export function ProductInfoForm({ product, onUpdate, categoryOptions = [] }: { product: Product; onUpdate: (changes: Partial<Product>) => void; categoryOptions?: CategoryOption[] }) {
  const selectedCategory = categoryOptions.find((item) => String(item.value) === String(product.categoryId));
  const categorySlug = cleanSlug(selectedCategory?.slug || selectedCategory?.friendlyUrl || selectedCategory?.label || 'uncategorized');
  const productSlug = cleanSlug(product.slug || product.name);
  const storefrontPath = categorySlug && productSlug ? `/${categorySlug}/${productSlug}` : productSlug ? `/${productSlug}` : '';
  const fullStorefrontUrl = `${storefrontBaseUrl()}${storefrontPath}`;

  return (
    <div className="space-y-4">
      <FormSection title="Storefront URL & Slugs">
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm text-cyan-100">
          <div className="text-xs uppercase tracking-[0.18em] text-cyan-200">Generated storefront URL</div>
          <div className="mt-2 break-all font-semibold text-white">{fullStorefrontUrl}</div>
          <div className="mt-2 text-xs text-cyan-100/80">Rule: /category-slug/product-slug. The category slug is picked from the selected category below.</div>
        </div>
        <FormGrid>
          <Input value={categorySlug} readOnly placeholder="Category Slug" />
          <Input value={productSlug} onChange={(e) => onUpdate({ slug: cleanSlug(e.target.value) })} placeholder="Product Slug" />
        </FormGrid>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => navigator.clipboard?.writeText(storefrontPath)} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-text">Copy Path</button>
          <button type="button" onClick={() => navigator.clipboard?.writeText(fullStorefrontUrl)} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-text">Copy Full URL</button>
          <a href={fullStorefrontUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-cyan-500/30 px-3 py-2 text-xs text-cyan-200">Open Frontend</a>
        </div>
      </FormSection>

      <FormSection title="Basic Information">
        <FormGrid>
          <Input value={product.cmsPageLink} readOnly placeholder="CMS PageLink" />
          <Input value={product.name} onChange={(e) => onUpdate({ name: e.target.value })} placeholder="Name" />
          <Input value={product.description} onChange={(e) => onUpdate({ description: e.target.value })} placeholder="Description" />
          <Select value={product.productType} options={productTypeOptions} onChange={(e) => onUpdate({ productType: e.target.value as Product['productType'] })} />
          {product.productType === 'static' ? (
            <Input value={product.pdfFileUrl ?? ''} onChange={(e) => onUpdate({ pdfFileUrl: e.target.value })} placeholder="PDF File URL" />
          ) : null}
          <Select value={product.categoryId} options={[{ value: '', label: 'Uncategorized' }, ...categoryOptions]} onChange={(e) => onUpdate({ categoryId: e.target.value })} />
          <Select value={product.vendorId} options={productVendors.map((item) => ({ value: item.id, label: item.name }))} onChange={(e) => onUpdate({ vendorId: e.target.value })} />
          <Input value={product.hotFolder} onChange={(e) => onUpdate({ hotFolder: e.target.value })} placeholder="Hot Folder" />
        </FormGrid>
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">
            Global Product <Toggle checked={product.isGlobal} onChange={(value) => onUpdate({ isGlobal: value })} />
          </div>
          {product.isGlobal ? (
            <div className="rounded-lg border border-border p-3 text-sm">
              <p className="mb-2 text-xs uppercase text-textMuted">Storefront assignment</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {storefrontOptions.map((store) => {
                  const checked = product.storefrontIds.includes(store.id);
                  return (
                    <label key={store.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = new Set(product.storefrontIds);
                          if (e.target.checked) next.add(store.id); else next.delete(store.id);
                          onUpdate({ storefrontIds: Array.from(next) });
                        }}
                      />
                      {store.name}
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">
            Published <Toggle checked={product.published} onChange={(value) => onUpdate({ published: value })} />
          </div>
        </div>
      </FormSection>

      <FormSection title="Price Mapping">
        <FormGrid>
          <Input value={String(product.priceMapping.basePrice)} onChange={(e) => onUpdate({ priceMapping: { ...product.priceMapping, basePrice: Number(e.target.value) || 0 } })} placeholder="Base Price" />
          <Input value={product.priceMapping.sizeLabel} onChange={(e) => onUpdate({ priceMapping: { ...product.priceMapping, sizeLabel: e.target.value } })} placeholder="Size" />
          <Input value={product.priceMapping.dielineMapping} onChange={(e) => onUpdate({ priceMapping: { ...product.priceMapping, dielineMapping: e.target.value } })} placeholder="Dieline Mapping" />
        </FormGrid>
        {product.productType === 'parametric' ? (
          <div className="mt-3 rounded-lg border border-border p-3 text-sm">
            <p className="mb-2 font-medium">Parametric Standard</p>
            <FormGrid>
              <Input value={product.priceMapping.parametricStandard?.standard ?? ''} onChange={(e) => onUpdate({ priceMapping: { ...product.priceMapping, parametricStandard: { ...(product.priceMapping.parametricStandard ?? { standard: '', size: '', allowance: '', material: '' }), standard: e.target.value } } })} placeholder="Standard" />
              <Input value={product.priceMapping.parametricStandard?.size ?? ''} onChange={(e) => onUpdate({ priceMapping: { ...product.priceMapping, parametricStandard: { ...(product.priceMapping.parametricStandard ?? { standard: '', size: '', allowance: '', material: '' }), size: e.target.value } } })} placeholder="Size" />
              <Input value={product.priceMapping.parametricStandard?.allowance ?? ''} onChange={(e) => onUpdate({ priceMapping: { ...product.priceMapping, parametricStandard: { ...(product.priceMapping.parametricStandard ?? { standard: '', size: '', allowance: '', material: '' }), allowance: e.target.value } } })} placeholder="Allowance" />
              <Input value={product.priceMapping.parametricStandard?.material ?? ''} onChange={(e) => onUpdate({ priceMapping: { ...product.priceMapping, parametricStandard: { ...(product.priceMapping.parametricStandard ?? { standard: '', size: '', allowance: '', material: '' }), material: e.target.value } } })} placeholder="Material" />
            </FormGrid>
          </div>
        ) : null}
      </FormSection>

      <FormSection title="Product System">
        <FormGrid>
          <Select value={product.productSystem?.templateId ?? 'business-cards'} options={productTemplates.map((item) => ({ value: item.id, label: item.name }))} onChange={(e) => onUpdate({ productSystem: { ...(product.productSystem ?? { templateId: 'business-cards', materialId: 'silk-350', finishId: 'matt-lam', printerId: 'hp-indigo-7k', quantity: 250, turnaround: 'standard', fieldValues: {} }), templateId: e.target.value } })} />
          <Select value={product.productSystem?.materialId ?? 'silk-350'} options={productMaterials.map((item) => ({ value: item.id, label: item.name }))} onChange={(e) => onUpdate({ productSystem: { ...(product.productSystem ?? { templateId: 'business-cards', materialId: 'silk-350', finishId: 'matt-lam', printerId: 'hp-indigo-7k', quantity: 250, turnaround: 'standard', fieldValues: {} }), materialId: e.target.value } })} />
          <Select value={product.productSystem?.finishId ?? 'matt-lam'} options={productFinishes.map((item) => ({ value: item.id, label: item.name }))} onChange={(e) => onUpdate({ productSystem: { ...(product.productSystem ?? { templateId: 'business-cards', materialId: 'silk-350', finishId: 'matt-lam', printerId: 'hp-indigo-7k', quantity: 250, turnaround: 'standard', fieldValues: {} }), finishId: e.target.value } })} />
          <Select value={product.productSystem?.printerId ?? 'hp-indigo-7k'} options={printerProfiles.map((item) => ({ value: item.id, label: item.name }))} onChange={(e) => onUpdate({ productSystem: { ...(product.productSystem ?? { templateId: 'business-cards', materialId: 'silk-350', finishId: 'matt-lam', printerId: 'hp-indigo-7k', quantity: 250, turnaround: 'standard', fieldValues: {} }), printerId: e.target.value } })} />
          <Input value={String(product.productSystem?.quantity ?? 250)} onChange={(e) => onUpdate({ productSystem: { ...(product.productSystem ?? { templateId: 'business-cards', materialId: 'silk-350', finishId: 'matt-lam', printerId: 'hp-indigo-7k', quantity: 250, turnaround: 'standard', fieldValues: {} }), quantity: Number(e.target.value) || 250 } })} placeholder="Quantity" />
          <Select value={product.productSystem?.turnaround ?? 'standard'} options={[{ value: 'standard', label: 'Standard' }, { value: 'priority', label: 'Priority' }, { value: 'rush', label: 'Rush' }]} onChange={(e) => onUpdate({ productSystem: { ...(product.productSystem ?? { templateId: 'business-cards', materialId: 'silk-350', finishId: 'matt-lam', printerId: 'hp-indigo-7k', quantity: 250, turnaround: 'standard', fieldValues: {} }), turnaround: e.target.value as ProductSystemConfig['turnaround'] } })} />
        </FormGrid>
        <div className="mt-3 rounded-lg border border-border p-3 text-sm">
          <p className="mb-2 text-xs uppercase text-textMuted">System links</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/product-builder-studio" className="inline-flex items-center rounded-xl border border-white/7 bg-white/[0.018] px-3 py-2 text-[12px] text-text">Open Builder Studio</Link>
            <Link href="/pricing-engine-lab" className="inline-flex items-center rounded-xl border border-white/7 bg-white/[0.018] px-3 py-2 text-[12px] text-text">Pricing Engine</Link>
            <Link href="/materials-library" className="inline-flex items-center rounded-xl border border-white/7 bg-white/[0.018] px-3 py-2 text-[12px] text-text">Materials</Link>
            <Link href="/printer-profiles" className="inline-flex items-center rounded-xl border border-white/7 bg-white/[0.018] px-3 py-2 text-[12px] text-text">Printers</Link>
          </div>
          <div className="mt-3 rounded-xl border border-white/7 bg-white/[0.02] p-3">
            {(() => {
              const estimate = calculateProductEstimate(product.productSystem?.quantity ?? 250, product.productSystem?.materialId ?? 'silk-350', product.productSystem?.finishId ?? 'matt-lam', product.productSystem?.printerId ?? 'hp-indigo-7k', product.productSystem?.turnaround ?? 'standard');
              return <><p className="font-medium text-white">Live estimate: ${estimate.total}</p><p className="mt-1 text-textMuted">{estimate.tierLabel} · {estimate.turnaroundDays} day lead time</p></>;
            })()}
          </div>
        </div>
      </FormSection>

      <FormSection title="Product Numbers">
        <FormGrid>
          <Input value={product.productNumbers.itemNumber} onChange={(e) => onUpdate({ productNumbers: { ...product.productNumbers, itemNumber: e.target.value } })} placeholder="Item Number" />
          <Input value={product.productNumbers.modelNumber} onChange={(e) => onUpdate({ productNumbers: { ...product.productNumbers, modelNumber: e.target.value } })} placeholder="Model Number" />
          <Input value={product.productNumbers.integrationId} onChange={(e) => onUpdate({ productNumbers: { ...product.productNumbers, integrationId: e.target.value } })} placeholder="Integration" />
        </FormGrid>
      </FormSection>
    </div>
  );
}
