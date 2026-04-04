import { useId, useMemo, useRef } from 'react';
import { FormGrid } from '@/components/forms/form-grid';
import { FormSection } from '@/components/forms/form-section';
import { Input } from '@/components/forms/input';
import { Select, type SelectOption } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { ProductFormValues } from '@/modules/products/types';

const creationMethods: Array<{ value: ProductFormValues['creationMethod']; label: string; description: string }> = [
  {
    value: 'idml',
    label: 'Attach IDML template file',
    description: 'Upload an Adobe InDesign IDML or PDF template for Print Editor setup.'
  },
  {
    value: 'print-editor-template',
    label: 'Import Print Editor template file',
    description: 'Import a .pn template exported from another PrintNow installation.'
  },
  {
    value: 'blank',
    label: 'Generate a blank product',
    description: 'Start with custom dimensions, page count, and bleed settings.'
  },
  {
    value: 'parametric-standard',
    label: 'Generate a parametric standard',
    description: 'Create a Print CAD driven product using standard, size, allowance, and material.'
  }
];

const productTypes: SelectOption[] = [
  { value: 'online', label: 'Online Product' },
  { value: 'static', label: 'Static / PDF Product' },
  { value: 'parametric', label: 'Parametric Product' }
];

const unitOptions: SelectOption[] = [
  { value: 'in', label: 'Inches' },
  { value: 'cm', label: 'Centimeters' },
  { value: 'mm', label: 'Millimeters' },
  { value: 'pt', label: 'Points' }
];

const parametricOptions = {
  standards: ['Mailer Box', 'Folding Carton', 'Bottle Neck Tag', 'Presentation Folder'],
  sizes: ['Small', 'Medium', 'Large', 'Custom'],
  allowances: ['Standard', 'Tight', 'Loose'],
  materials: ['350gsm SBS', 'Corrugated E-Flute', 'Kraft 300gsm', 'Premium Uncoated']
};

function UploadField({
  title,
  hint,
  fileName,
  accept,
  onSelect,
  onClear
}: {
  title: string;
  hint: string;
  fileName: string;
  accept: string;
  onSelect: (fileName: string) => void;
  onClear: () => void;
}) {
  const id = useId();
  const ref = useRef<HTMLInputElement | null>(null);

  return (
    <div className="space-y-3 rounded-xl border border-border bg-panelMuted/70 p-4">
      <div>
        <p className="text-sm font-medium text-text">{title}</p>
        <p className="mt-1 text-sm text-textMuted">{hint}</p>
      </div>

      <input
        id={id}
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onSelect(file.name);
        }}
      />

      <label
        htmlFor={id}
        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border px-4 py-8 text-center hover:border-accent"
      >
        <span className="text-sm font-medium text-text">Drag & drop or click to upload</span>
        <span className="mt-1 text-xs text-textMuted">Accepted: {accept}</span>
      </label>

      <div className="flex items-center justify-between rounded-lg border border-border bg-panel px-3 py-2 text-sm">
        <span className={fileName ? 'text-text' : 'text-textMuted'}>
          {fileName || 'No file selected yet'}
        </span>
        <div className="flex gap-2">
          <Button type="button" onClick={() => ref.current?.click()}>
            Browse
          </Button>
          {fileName ? (
            <Button type="button" className="text-red-300" onClick={onClear}>
              Clear
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ProductForm({
  values,
  categoryOptions,
  onChange,
  onCancel,
  onSubmit,
  success,
  createdProductId,
  onEditCreated,
  onReset
}: {
  values: ProductFormValues;
  categoryOptions: SelectOption[];
  onChange: (key: keyof ProductFormValues, value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  success: boolean;
  createdProductId?: string | null;
  onEditCreated: () => void;
  onReset: () => void;
}) {
  const selectedMethod = useMemo(
    () => creationMethods.find((method) => method.value === values.creationMethod),
    [values.creationMethod]
  );

  if (success) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Product created</p>
          <h3 className="mt-2 text-xl font-semibold text-text">Your product has been added successfully.</h3>
          <p className="mt-2 text-sm text-textMuted">
            Continue to product setup, create another product, or return to the product list.
          </p>
          {createdProductId ? <p className="mt-3 text-xs text-textMuted">Product ID: {createdProductId}</p> : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <PrimaryButton type="button" onClick={onEditCreated}>Edit Product</PrimaryButton>
          <Button type="button" onClick={onReset}>Add New Product</Button>
          <Button type="button" onClick={onCancel}>Return to Products</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <FormSection title="Step 1 · Product Basics">
        <FormGrid>
          <Input
            placeholder="Product Name"
            value={values.name}
            onChange={(e) => onChange('name', e.target.value)}
          />
          <Select
            options={categoryOptions}
            value={values.categoryId}
            onChange={(e) => onChange('categoryId', e.target.value)}
          />
          <Select
            options={productTypes}
            value={values.productType}
            onChange={(e) => onChange('productType', e.target.value)}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Step 2 · Creation Method">
        <div className="grid gap-3 md:grid-cols-2">
          {creationMethods.map((method) => {
            const active = values.creationMethod === method.value;
            return (
              <button
                key={method.value}
                type="button"
                onClick={() => onChange('creationMethod', method.value)}
                className={`rounded-xl border p-4 text-left transition ${
                  active ? 'border-accent bg-panelMuted ring-1 ring-accent/40' : 'border-border bg-panel hover:border-slate-500'
                }`}
              >
                <p className="text-sm font-semibold text-text">{method.label}</p>
                <p className="mt-2 text-sm text-textMuted">{method.description}</p>
              </button>
            );
          })}
        </div>
      </FormSection>

      <FormSection title="Step 3 · Method Configuration">
        <div className="mb-4 rounded-lg border border-border bg-panelMuted/60 px-4 py-3 text-sm text-textMuted">
          <span className="font-medium text-text">Selected:</span> {selectedMethod?.label}
        </div>

        {values.creationMethod === 'idml' ? (
          <UploadField
            title="IDML / PDF Template"
            hint="The uploaded template will define editable areas, image placeholders, and text frames for your print product."
            accept=".idml,.pdf"
            fileName={values.idmlFileName}
            onSelect={(fileName) => onChange('idmlFileName', fileName)}
            onClear={() => onChange('idmlFileName', '')}
          />
        ) : null}

        {values.creationMethod === 'print-editor-template' ? (
          <UploadField
            title="Print Editor Template"
            hint="Import a .pn template exported from another PrintNow installation to reuse editor setup."
            accept=".pn"
            fileName={values.printEditorTemplateName}
            onSelect={(fileName) => onChange('printEditorTemplateName', fileName)}
            onClear={() => onChange('printEditorTemplateName', '')}
          />
        ) : null}

        {values.creationMethod === 'blank' ? (
          <div className="space-y-4">
            <p className="text-sm text-textMuted">
              Define a new blank print product with the correct page count, dimensions, units, and bleed.
            </p>
            <FormGrid>
              <Input placeholder="Pages" value={values.pages} onChange={(e) => onChange('pages', e.target.value)} />
              <Select options={unitOptions} value={values.units} onChange={(e) => onChange('units', e.target.value)} />
              <Input placeholder="Width" value={values.width} onChange={(e) => onChange('width', e.target.value)} />
              <Input placeholder="Height" value={values.height} onChange={(e) => onChange('height', e.target.value)} />
              <Input placeholder="Bleed" value={values.bleed} onChange={(e) => onChange('bleed', e.target.value)} />
            </FormGrid>
          </div>
        ) : null}

        {values.creationMethod === 'parametric-standard' ? (
          <div className="space-y-4">
            <p className="text-sm text-textMuted">
              Configure the Print CAD standard this product should inherit from.
            </p>
            <FormGrid>
              <Select
                options={parametricOptions.standards.map((value) => ({ value, label: value }))}
                value={values.parametricStandard}
                onChange={(e) => onChange('parametricStandard', e.target.value)}
              />
              <Select
                options={parametricOptions.sizes.map((value) => ({ value, label: value }))}
                value={values.parametricSize}
                onChange={(e) => onChange('parametricSize', e.target.value)}
              />
              <Select
                options={parametricOptions.allowances.map((value) => ({ value, label: value }))}
                value={values.parametricAllowance}
                onChange={(e) => onChange('parametricAllowance', e.target.value)}
              />
              <Select
                options={parametricOptions.materials.map((value) => ({ value, label: value }))}
                value={values.parametricMaterial}
                onChange={(e) => onChange('parametricMaterial', e.target.value)}
              />
            </FormGrid>
          </div>
        ) : null}
      </FormSection>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" onClick={onCancel}>Cancel</Button>
        <PrimaryButton type="button" onClick={onSubmit}>Create Product</PrimaryButton>
      </div>
    </div>
  );
}
