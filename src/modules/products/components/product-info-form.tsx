import { FormGrid } from '@/components/forms/form-grid';
import { FormSection } from '@/components/forms/form-section';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Toggle } from '@/components/forms/toggle';
import { productCategories, productVendors, storefrontOptions } from '@/data/products';
import type { Product } from '@/modules/products/types';

export function ProductInfoForm({ product, onUpdate }: { product: Product; onUpdate: (changes: Partial<Product>) => void }) {
  const isParametric = product.creationMethod === 'parametric_standard';

  return (
    <div className="space-y-4">
      <FormSection title="Basic Information">
        <FormGrid>
          <Input readOnly value={product.cmsPageLink} placeholder="CMS PageLink" />
          <Input value={product.name} onChange={(e) => onUpdate({ name: e.target.value })} placeholder="Name" />
          <Input value={product.description} onChange={(e) => onUpdate({ description: e.target.value })} placeholder="Description" />
          <Select options={[{ value: 'static', label: 'Static' }, { value: 'online', label: 'Online' }]} value={product.productType} onChange={(e) => onUpdate({ productType: e.target.value as Product['productType'] })} />
          {product.productType === 'static' ? <Input value={product.pdfFileName ?? ''} onChange={(e) => onUpdate({ pdfFileName: e.target.value })} placeholder="PDF File" /> : null}
          <Select options={productCategories.map((item) => ({ value: item.id, label: item.name }))} value={product.categoryId} onChange={(e) => onUpdate({ categoryId: e.target.value })} />
          <Select options={productVendors.map((item) => ({ value: item.id, label: item.name }))} value={product.vendorId} onChange={(e) => onUpdate({ vendorId: e.target.value })} />
          <Input value={product.hotFolder} onChange={(e) => onUpdate({ hotFolder: e.target.value })} placeholder="Hot Folder" />
        </FormGrid>

        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">Global Product <Toggle checked={product.isGlobal} onChange={(next) => onUpdate({ isGlobal: next })} /></div>
          {product.isGlobal ? (
            <div className="rounded-lg border border-border p-3 text-sm">
              <p className="mb-2 text-xs uppercase text-textMuted">Storefront assignments</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {storefrontOptions.map((store) => {
                  const checked = product.storefrontAssignments.some((entry) => entry.storefrontId === store.id);
                  return (
                    <label key={store.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...product.storefrontAssignments, { storefrontId: store.id, storefrontName: store.name }]
                            : product.storefrontAssignments.filter((entry) => entry.storefrontId !== store.id);
                          onUpdate({ storefrontAssignments: next });
                        }}
                      />
                      {store.name}
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">Published <Toggle checked={product.published} onChange={(next) => onUpdate({ published: next })} /></div>
        </div>
      </FormSection>

      <FormSection title="Price Mapping">
        <FormGrid>
          <Input value={String(product.priceMapping.basePrice)} onChange={(e) => onUpdate({ priceMapping: { ...product.priceMapping, basePrice: Number(e.target.value) || 0 } })} placeholder="Base Price" />
          <Input value={product.priceMapping.sizeLabel} onChange={(e) => onUpdate({ priceMapping: { ...product.priceMapping, sizeLabel: e.target.value } })} placeholder="Size" />
          <Input value={product.priceMapping.dielineMapping} onChange={(e) => onUpdate({ priceMapping: { ...product.priceMapping, dielineMapping: e.target.value } })} placeholder="Dieline Mapping" />
        </FormGrid>

        {isParametric ? (
          <div className="mt-3 rounded-lg border border-border p-3">
            <p className="mb-2 text-sm font-medium">Parametric Standard</p>
            <FormGrid>
              <Input value={product.priceMapping.parametric?.standard ?? ''} onChange={(e) => onUpdate({ priceMapping: { ...product.priceMapping, parametric: { ...(product.priceMapping.parametric ?? { standard: '', size: '', allowance: '', material: '' }), standard: e.target.value } } })} placeholder="Standard" />
              <Input value={product.priceMapping.parametric?.size ?? ''} onChange={(e) => onUpdate({ priceMapping: { ...product.priceMapping, parametric: { ...(product.priceMapping.parametric ?? { standard: '', size: '', allowance: '', material: '' }), size: e.target.value } } })} placeholder="Size" />
              <Input value={product.priceMapping.parametric?.allowance ?? ''} onChange={(e) => onUpdate({ priceMapping: { ...product.priceMapping, parametric: { ...(product.priceMapping.parametric ?? { standard: '', size: '', allowance: '', material: '' }), allowance: e.target.value } } })} placeholder="Allowance" />
              <Input value={product.priceMapping.parametric?.material ?? ''} onChange={(e) => onUpdate({ priceMapping: { ...product.priceMapping, parametric: { ...(product.priceMapping.parametric ?? { standard: '', size: '', allowance: '', material: '' }), material: e.target.value } } })} placeholder="Material" />
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
