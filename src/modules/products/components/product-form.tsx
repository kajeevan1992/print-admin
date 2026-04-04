import { FormGrid } from '@/components/forms/form-grid';
import { FormSection } from '@/components/forms/form-section';
import { Input } from '@/components/forms/input';
import { Select, type SelectOption } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { CreationMethod, ProductFormValues } from '@/modules/products/types';

const creationMethodCards: Array<{ value: CreationMethod; title: string; description: string }> = [
  {
    value: 'idml',
    title: 'Attach IDML template file',
    description: 'Upload an Adobe InDesign IDML or PDF template for Print Editor products.'
  },
  {
    value: 'print-editor-template',
    title: 'Import Print Editor template file',
    description: 'Import a .pn file from another PrintNow installation.'
  },
  {
    value: 'blank',
    title: 'Generate a blank product',
    description: 'Create a blank canvas product using pages, units, dimensions, and bleed.'
  },
  {
    value: 'parametric-standard',
    title: 'Generate a parametric standard',
    description: 'Create a product from a Print CAD parametric standard with size and material.'
  }
];

function FilePicker({
  label,
  accept,
  value,
  onPick
}: {
  label: string;
  accept: string;
  value: string;
  onPick: (fileName: string) => void;
}) {
  return (
    <label className="block rounded-xl border border-dashed border-border bg-panelMuted p-4 text-sm text-textMuted">
      <span className="mb-2 block font-medium text-text">{label}</span>
      <input
        type="file"
        accept={accept}
        className="mb-3 block w-full text-sm"
        onChange={(event) => onPick(event.target.files?.[0]?.name ?? '')}
      />
      <p>{value ? `Selected: ${value}` : 'No file selected yet.'}</p>
    </label>
  );
}

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
  onChange: <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => void;
  onCancel: () => void;
  onSubmit: () => void;
  success?: boolean;
  onReset: () => void;
}) {
  if (success) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          Product created successfully. You can continue editing, start another product, or return to the list.
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <PrimaryButton onClick={onCancel}>Edit Product</PrimaryButton>
          <Button onClick={onReset}>Add New Product</Button>
          <Button onClick={onCancel}>Return to Products</Button>
        </div>
      </div>
    );
  }

  const canSubmit = Boolean(values.name.trim() && values.categoryId);

  return (
    <div className="space-y-4">
      <FormSection title="Product Setup">
        <FormGrid>
          <Input placeholder="Product name" value={values.name} onChange={(e) => onChange('name', e.target.value)} />
          <Select options={categoryOptions} value={values.categoryId} onChange={(e) => onChange('categoryId', e.target.value)} />
          <Select
            options={[
              { value: 'online', label: 'Online Product' },
              { value: 'static', label: 'Static / PDF Product' },
              { value: 'parametric', label: 'Parametric Product' }
            ]}
            value={values.productType}
            onChange={(e) => onChange('productType', e.target.value as ProductFormValues['productType'])}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Choose Creation Method">
        <div className="grid gap-3 md:grid-cols-2">
          {creationMethodCards.map((method) => {
            const active = values.creationMethod === method.value;
            return (
              <button
                type="button"
                key={method.value}
                onClick={() => onChange('creationMethod', method.value)}
                className={`rounded-xl border p-4 text-left transition ${
                  active ? 'border-accent bg-accent/10' : 'border-border bg-panelMuted hover:border-accent/50'
                }`}
              >
                <p className="font-medium text-text">{method.title}</p>
                <p className="mt-1 text-sm text-textMuted">{method.description}</p>
              </button>
            );
          })}
        </div>
      </FormSection>

      {values.creationMethod === 'idml' ? (
        <FormSection title="IDML / PDF Template Upload">
          <FilePicker label="Upload IDML or PDF template" accept=".idml,.pdf" value={values.idmlFileName} onPick={(fileName) => onChange('idmlFileName', fileName)} />
        </FormSection>
      ) : null}

      {values.creationMethod === 'print-editor-template' ? (
        <FormSection title="Print Editor Template Upload">
          <FilePicker label="Upload .pn template" accept=".pn" value={values.printEditorTemplateName} onPick={(fileName) => onChange('printEditorTemplateName', fileName)} />
        </FormSection>
      ) : null}

      {values.creationMethod === 'blank' ? (
        <FormSection title="Blank Product Fields">
          <FormGrid>
            <Input placeholder="Pages" value={values.pages} onChange={(e) => onChange('pages', e.target.value)} />
            <Select options={['in', 'cm', 'mm', 'pt']} value={values.units} onChange={(e) => onChange('units', e.target.value)} />
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

      <div className="flex justify-end gap-2">
        <Button onClick={onCancel}>Cancel</Button>
        <PrimaryButton onClick={onSubmit} disabled={!canSubmit}>
          Create Product
        </PrimaryButton>
      </div>
    </div>
  );
}
