import { FormGrid } from '@/components/forms/form-grid';
import { FormSection } from '@/components/forms/form-section';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Toggle } from '@/components/forms/toggle';
import { categoryOptions, vendorOptions } from '@/data/products';
import type { Product } from '@/modules/products/types';

export function ProductInfoForm({ product, onUpdate }: { product: Product; onUpdate: (changes: Partial<Product>) => void }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <FormSection title="Basic Information">
        <FormGrid>
          <Input value={product.name} onChange={(e) => onUpdate({ name: e.target.value })} />
          <Select value={product.category} options={categoryOptions} onChange={(e) => onUpdate({ category: e.target.value })} />
          <Select value={product.vendor} options={vendorOptions} onChange={(e) => onUpdate({ vendor: e.target.value })} />
          <Input value={product.sku} onChange={(e) => onUpdate({ sku: e.target.value })} />
          <div className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">
            Published
            <Toggle checked={product.published} onChange={(value) => onUpdate({ published: value })} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">
            Global Product
            <Toggle checked={product.global} onChange={(value) => onUpdate({ global: value })} />
          </div>
        </FormGrid>
      </FormSection>

      <FormSection title="Template Setup">
        <div className="space-y-2 text-sm text-textMuted">
          <p>Thumbnail: Placeholder image</p>
          <p>Product Number: {product.sku}</p>
          <p>Default Front Template: Enabled</p>
          <p>Default Back Template: Enabled</p>
          <p>Allow Customer Artwork Upload: Enabled</p>
          <p>Auto Generate Proof: Disabled</p>
        </div>
      </FormSection>
    </div>
  );
}
