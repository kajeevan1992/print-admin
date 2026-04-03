import { FormGrid } from '@/components/forms/form-grid';
import { FormSection } from '@/components/forms/form-section';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { categoryOptions } from '@/data/products';
import type { ProductFormValues } from '@/modules/products/types';

export function ProductForm({ values, onChange, onCancel, onSubmit }: {
  values: ProductFormValues;
  onChange: (key: keyof ProductFormValues, value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <button className="rounded-lg border border-border bg-panelMuted p-4 text-left">Use DMI Templated Product</button>
        <button className="rounded-lg border border-border bg-panelMuted p-4 text-left">Create Blank Product</button>
      </div>

      <FormSection title="Create Product">
        <FormGrid>
          <Input placeholder="Product Name" value={values.name} onChange={(e) => onChange('name', e.target.value)} />
          <Select value={values.category} options={categoryOptions} onChange={(e) => onChange('category', e.target.value)} />
          <Input placeholder="Pages" value={values.pages} onChange={(e) => onChange('pages', e.target.value)} />
          <Input placeholder="Units" value={values.units} onChange={(e) => onChange('units', e.target.value)} />
          <Input placeholder="Width" value={values.width} onChange={(e) => onChange('width', e.target.value)} />
          <Input placeholder="Height" value={values.height} onChange={(e) => onChange('height', e.target.value)} />
          <Input placeholder="Bleed" value={values.bleed} onChange={(e) => onChange('bleed', e.target.value)} />
        </FormGrid>
      </FormSection>

      <div className="flex justify-end gap-2">
        <Button onClick={onCancel}>Cancel</Button>
        <PrimaryButton onClick={onSubmit}>Create Product</PrimaryButton>
      </div>
    </div>
  );
}
