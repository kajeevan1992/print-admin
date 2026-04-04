import { FormGrid } from '@/components/forms/form-grid';
import { FormSection } from '@/components/forms/form-section';
import { Input } from '@/components/forms/input';
import { Select, type SelectOption } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { ProductFormValues } from '@/modules/products/types';

const creationMethods: SelectOption[] = [
  { value: 'idml', label: 'Attach IDML template file' },
  { value: 'print-editor-template', label: 'Import Print Editor template file' },
  { value: 'blank', label: 'Generate a blank product' },
  { value: 'parametric-standard', label: 'Generate a parametric standard' }
];

export function ProductForm({
  values,
  categoryOptions,
  onChange,
  onCancel,
  onSubmit,
  success,
  onReset
}: {
  values: ProductFormValues;
  categoryOptions: SelectOption[];
  onChange: (key: keyof ProductFormValues, value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  success: boolean;
  onReset: () => void;
}) {
  if (success) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">
          Product created successfully.
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <PrimaryButton onClick={onCancel}>Edit Product</PrimaryButton>
          <Button onClick={onReset}>Add New Product</Button>
          <Button onClick={onCancel}>Return to Products</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FormSection title="Product Setup">
        <FormGrid>
          <Input placeholder="Name" value={values.name} onChange={(e) => onChange('name', e.target.value)} />
          <Select options={categoryOptions} value={values.categoryId} onChange={(e) => onChange('categoryId', e.target.value)} />
          <Select options={creationMethods} value={values.creationMethod} onChange={(e) => onChange('creationMethod', e.target.value)} />
          <Select
            options={[
              { value: 'online', label: 'Online Product' },
              { value: 'static', label: 'Static/PDF Product' },
              { value: 'parametric', label: 'Parametric Product' }
            ]}
            value={values.productType}
            onChange={(e) => onChange('productType', e.target.value)}
          />
        </FormGrid>
      </FormSection>

      {values.creationMethod === 'blank' ? (
        <FormSection title="Blank Product Fields">
          <FormGrid>
            <Input placeholder="Pages" value={values.pages} onChange={(e) => onChange('pages', e.target.value)} />
            <Input placeholder="Units" value={values.units} onChange={(e) => onChange('units', e.target.value)} />
            <Input placeholder="Width" value={values.width} onChange={(e) => onChange('width', e.target.value)} />
            <Input placeholder="Height" value={values.height} onChange={(e) => onChange('height', e.target.value)} />
            <Input placeholder="Bleed" value={values.bleed} onChange={(e) => onChange('bleed', e.target.value)} />
          </FormGrid>
        </FormSection>
      ) : null}

      {values.creationMethod === 'parametric-standard' ? (
        <FormSection title="Parametric Standard Configuration">
          <FormGrid>
            <Input placeholder="Standard" value={values.parametricStandard} onChange={(e) => onChange('parametricStandard', e.target.value)} />
            <Input placeholder="Size" value={values.parametricSize} onChange={(e) => onChange('parametricSize', e.target.value)} />
            <Input placeholder="Allowance" value={values.parametricAllowance} onChange={(e) => onChange('parametricAllowance', e.target.value)} />
            <Input placeholder="Material" value={values.parametricMaterial} onChange={(e) => onChange('parametricMaterial', e.target.value)} />
          </FormGrid>
        </FormSection>
      ) : null}

      {(values.creationMethod === 'idml' || values.creationMethod === 'print-editor-template') ? (
        <FormSection title="Template Upload">
          <div className="rounded-lg border border-dashed border-border bg-panelMuted p-8 text-center text-sm text-textMuted">
            Drag & drop file placeholder / upload dropzone UI.
          </div>
        </FormSection>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button onClick={onCancel}>Cancel</Button>
        <PrimaryButton onClick={onSubmit}>Create Product</PrimaryButton>
      </div>
    </div>
  );
}
