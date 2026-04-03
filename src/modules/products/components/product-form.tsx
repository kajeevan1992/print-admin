import { FormGrid } from '@/components/forms/form-grid';
import { FormSection } from '@/components/forms/form-section';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { ProductFormValues } from '@/modules/products/types';

export function ProductForm({ values, categoryOptions, vendorOptions, onChange, onCancel, onSubmit }: {
  values: ProductFormValues;
  categoryOptions: string[];
  vendorOptions: string[];
  onChange: (key: keyof ProductFormValues, value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-4">
      <FormSection title="Step 1 · Product Source">
        <div className="grid gap-2 sm:grid-cols-2">
          <button onClick={() => onChange('creationMode', 'templated')} className={`rounded-lg border p-4 text-left ${values.creationMode === 'templated' ? 'border-accent bg-panelMuted' : 'border-border bg-panelMuted'}`}>
            Upload DMI / template-based sample
          </button>
          <button onClick={() => onChange('creationMode', 'blank')} className={`rounded-lg border p-4 text-left ${values.creationMode === 'blank' ? 'border-accent bg-panelMuted' : 'border-border bg-panelMuted'}`}>
            Create blank product
          </button>
        </div>
      </FormSection>

      <FormSection title="Step 2 · Product Basics">
        <FormGrid>
          <Input placeholder="Product Name" value={values.name} onChange={(e) => onChange('name', e.target.value)} />
          <Input placeholder="Slug" value={values.slug} onChange={(e) => onChange('slug', e.target.value)} />
          <Select value={values.productType} options={['templated', 'blank', 'hybrid']} onChange={(e) => onChange('productType', e.target.value)} />
          <Input placeholder="Description" value={values.description} onChange={(e) => onChange('description', e.target.value)} />
        </FormGrid>
      </FormSection>

      <FormSection title="Size & Setup">
        <FormGrid>
          <Input placeholder="Pages" value={values.pages} onChange={(e) => onChange('pages', e.target.value)} />
          <Input placeholder="Units" value={values.units} onChange={(e) => onChange('units', e.target.value)} />
          <Input placeholder="Width" value={values.width} onChange={(e) => onChange('width', e.target.value)} />
          <Input placeholder="Height" value={values.height} onChange={(e) => onChange('height', e.target.value)} />
          <Input placeholder="Bleed" value={values.bleed} onChange={(e) => onChange('bleed', e.target.value)} />
        </FormGrid>
      </FormSection>

      <FormSection title="Classification">
        <FormGrid>
          <Select value={values.categoryId} options={categoryOptions} onChange={(e) => onChange('categoryId', e.target.value)} />
          <Select value={values.vendorId} options={vendorOptions} onChange={(e) => onChange('vendorId', e.target.value)} />
        </FormGrid>
      </FormSection>

      <div className="flex justify-end gap-2">
        <Button onClick={onCancel}>Cancel</Button>
        <PrimaryButton onClick={onSubmit}>Create Product</PrimaryButton>
      </div>
    </div>
  );
}
