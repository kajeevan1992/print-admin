import { FormGrid } from '@/components/forms/form-grid';
import { FormSection } from '@/components/forms/form-section';
import { Input } from '@/components/forms/input';
import { Select, type SelectOption } from '@/components/forms/select';
import { Toggle } from '@/components/forms/toggle';
import { productCategories, productVendors, storefrontOptions } from '@/data/products';
import type { Product } from '@/modules/products/types';

const productTypeOptions: SelectOption[] = [
  { value: 'online', label: 'Online' },
  { value: 'static', label: 'Static PDF' },
  { value: 'parametric', label: 'Parametric' }
];

export function ProductInfoForm({ product, onUpdate }: { product: Product; onUpdate: (changes: Partial<Product>) => void }) {
  return (
    <div className="space-y-4">
      <FormSection title="Basic Information">
        <FormGrid>
          <Input value={product.cmsPageLink} readOnly placeholder="CMS PageLink" />
          <Input value={product.name} onChange={(e) => onUpdate({ name: e.target.value })} placeholder="Name" />
          <Input value={product.description} onChange={(e) => onUpdate({ description: e.target.value })} placeholder="Description" />
          <Select value={product.productType} options={productTypeOptions} onChange={(e) => onUpdate({ productType: e.target.value as Product['productType'] })} />
          {product.productType === 'static' ? (
            <Input value={product.pdfFileUrl ?? ''} onChange={(e) => onUpdate({ pdfFileUrl: e.target.value })} placeholder="PDF File URL" />
          ) : null}
          <Select value={product.categoryId} options={productCategories.map((item) => ({ value: item.id, label: item.name }))} onChange={(e) => onUpdate({ categoryId: e.target.value })} />
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
