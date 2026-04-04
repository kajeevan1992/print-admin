import { FormGrid } from '@/components/forms/form-grid';
import { FormSection } from '@/components/forms/form-section';
import { Input } from '@/components/forms/input';
import { Select, type SelectOption } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { ProductCreateInput } from '@/modules/products/types';

const methodOptions: SelectOption[] = [
  { value: 'idml_template', label: 'Attach IDML template file' },
  { value: 'print_editor_template', label: 'Import Print Editor template file' },
  { value: 'blank', label: 'Generate a blank product' },
  { value: 'parametric_standard', label: 'Generate a parametric standard' }
];

export function ProductForm({
  values,
  categoryOptions,
  onChange,
  onSubmit,
  onCancel,
  success,
  onReset,
  onEditCreated
}: {
  values: ProductCreateInput;
  categoryOptions: SelectOption[];
  onChange: (changes: Partial<ProductCreateInput>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  success: boolean;
  onReset: () => void;
  onEditCreated: () => void;
}) {
  if (success) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">Product created successfully.</div>
        <div className="flex flex-wrap justify-end gap-2">
          <PrimaryButton onClick={onEditCreated}>Edit Product</PrimaryButton>
          <Button onClick={onReset}>Add New Product</Button>
          <Button onClick={onCancel}>Return to Products</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FormSection title="Create Product">
        <FormGrid>
          <Input value={values.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Name" />
          <Select options={categoryOptions} value={values.categoryId} onChange={(e) => onChange({ categoryId: e.target.value })} />
          <Select options={methodOptions} value={values.creationMethod} onChange={(e) => onChange({ creationMethod: e.target.value as ProductCreateInput['creationMethod'] })} />
          <Select options={[{ value: 'online', label: 'Online' }, { value: 'static', label: 'Static' }]} value={values.productType} onChange={(e) => onChange({ productType: e.target.value as ProductCreateInput['productType'] })} />
        </FormGrid>
      </FormSection>

      {values.creationMethod === 'blank' ? (
        <FormSection title="Blank Product Settings">
          <FormGrid>
            <Input value={String(values.pages ?? '')} onChange={(e) => onChange({ pages: Number(e.target.value) || 0 })} placeholder="Pages" />
            <Input value={values.units ?? ''} onChange={(e) => onChange({ units: e.target.value })} placeholder="Units" />
            <Input value={String(values.width ?? '')} onChange={(e) => onChange({ width: Number(e.target.value) || 0 })} placeholder="Width" />
            <Input value={String(values.height ?? '')} onChange={(e) => onChange({ height: Number(e.target.value) || 0 })} placeholder="Height" />
            <Input value={String(values.bleed ?? '')} onChange={(e) => onChange({ bleed: Number(e.target.value) || 0 })} placeholder="Bleed" />
          </FormGrid>
        </FormSection>
      ) : null}

      {values.creationMethod === 'parametric_standard' ? (
        <FormSection title="Parametric Standard">
          <FormGrid>
            <Input value={values.parametric?.standard ?? ''} onChange={(e) => onChange({ parametric: { ...(values.parametric ?? { standard: '', size: '', allowance: '', material: '' }), standard: e.target.value } })} placeholder="Standard" />
            <Input value={values.parametric?.size ?? ''} onChange={(e) => onChange({ parametric: { ...(values.parametric ?? { standard: '', size: '', allowance: '', material: '' }), size: e.target.value } })} placeholder="Size" />
            <Input value={values.parametric?.allowance ?? ''} onChange={(e) => onChange({ parametric: { ...(values.parametric ?? { standard: '', size: '', allowance: '', material: '' }), allowance: e.target.value } })} placeholder="Allowance" />
            <Input value={values.parametric?.material ?? ''} onChange={(e) => onChange({ parametric: { ...(values.parametric ?? { standard: '', size: '', allowance: '', material: '' }), material: e.target.value } })} placeholder="Material" />
          </FormGrid>
        </FormSection>
      ) : null}

      {(values.creationMethod === 'idml_template' || values.creationMethod === 'print_editor_template') ? (
        <FormSection title="Template Upload">
          <div className="space-y-2 rounded-lg border border-dashed border-border bg-panelMuted p-6 text-sm">
            <p className="text-textMuted">Drop a template file here or use a mocked file selector.</p>
            <Input
              placeholder={values.creationMethod === 'idml_template' ? 'IDML/PDF file name' : '.pn file name'}
              value={values.creationMethod === 'idml_template' ? values.idmlFileName ?? '' : values.printEditorTemplateFileName ?? ''}
              onChange={(e) => onChange(values.creationMethod === 'idml_template' ? { idmlFileName: e.target.value } : { printEditorTemplateFileName: e.target.value })}
            />
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
