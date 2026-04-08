'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileBox, Layers3, PencilRuler, Rocket, WandSparkles } from 'lucide-react';
import { FormGrid } from '@/components/forms/form-grid';
import { FormSection } from '@/components/forms/form-section';
import { Input } from '@/components/forms/input';
import { Select, type SelectOption } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import {
  calculatePricingQuote,
  configTemplates,
  getAvailableFinishes,
  getAvailablePrinters,
  getTemplateById,
  materials
} from '@/lib/product-system-store';
import type { CreationMethod, ProductFormValues } from '@/modules/products/types';

const creationMethodCards: Array<{ value: CreationMethod; title: string; description: string; icon: typeof FileBox }> = [
  {
    value: 'idml',
    title: 'Attach IDML template file',
    description: 'Upload an Adobe InDesign IDML or PDF template for Print Editor products.',
    icon: FileBox
  },
  {
    value: 'print-editor-template',
    title: 'Import Print Editor template file',
    description: 'Import a .pn file from another PrintNow installation.',
    icon: Layers3
  },
  {
    value: 'blank',
    title: 'Generate a blank product',
    description: 'Create a blank canvas product using pages, units, dimensions, and bleed.',
    icon: PencilRuler
  },
  {
    value: 'parametric-standard',
    title: 'Generate a parametric standard',
    description: 'Create a product from a Print CAD parametric standard with size and material.',
    icon: Rocket
  }
];

const steps = ['Basics', 'Configuration', 'Pricing', 'Review'] as const;
type StepId = (typeof steps)[number];

type Props = {
  values: ProductFormValues;
  categoryOptions: SelectOption[];
  onChange: <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => void;
  onCancel: () => void;
  onSubmit: () => void;
  success?: boolean;
  onReset: () => void;
};

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
    <label className="block rounded-2xl border border-dashed border-white/12 bg-white/[0.03] p-4 text-sm text-textMuted">
      <span className="mb-2 block font-medium text-white">{label}</span>
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

export function ProductForm({ values, categoryOptions, onChange, onCancel, onSubmit, success, onReset }: Props) {
  const [step, setStep] = useState<StepId>('Basics');

  const selectedTemplate = useMemo(() => getTemplateById(values.configTemplateId), [values.configTemplateId]);
  const availableFinishes = useMemo(() => getAvailableFinishes(values.materialId), [values.materialId]);
  const availablePrinters = useMemo(() => getAvailablePrinters(values.materialId), [values.materialId]);

  useEffect(() => {
    if (!values.configTemplateId) {
      onChange('configTemplateId', configTemplates[0].id);
    }
  }, [onChange, values.configTemplateId]);

  useEffect(() => {
    if (!values.materialId) {
      onChange('materialId', materials[0].id);
    }
  }, [onChange, values.materialId]);

  useEffect(() => {
    if (availableFinishes.length > 0 && !availableFinishes.find((item) => item.id === values.finishId)) {
      onChange('finishId', availableFinishes[0].id);
    }
  }, [availableFinishes, onChange, values.finishId]);

  useEffect(() => {
    if (availablePrinters.length > 0 && !availablePrinters.find((item) => item.id === values.printerProfileId)) {
      onChange('printerProfileId', availablePrinters[0].id);
    }
  }, [availablePrinters, onChange, values.printerProfileId]);

  const quote = useMemo(
    () =>
      calculatePricingQuote({
        quantity: Number(values.quantity) || 100,
        materialId: values.materialId,
        finishId: values.finishId,
        printerProfileId: values.printerProfileId
      }),
    [values.finishId, values.materialId, values.printerProfileId, values.quantity]
  );

  const canSubmit = Boolean(values.name.trim() && values.categoryId);

  if (success) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-5 text-sm text-emerald-100">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 text-emerald-300" size={18} />
            <div>
              <p className="font-medium text-white">Product created successfully.</p>
              <p className="mt-1 text-emerald-100/85">Continue editing, start another product, or return to the list.</p>
            </div>
          </div>
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
    <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {steps.map((item, index) => (
            <button
              key={item}
              type="button"
              onClick={() => setStep(item)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[13px] transition ${
                item === step ? 'border-accent/40 bg-accent/12 text-white' : 'border-white/8 bg-white/[0.03] text-textMuted hover:bg-white/[0.05]'
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/20 text-[11px]">{index + 1}</span>
              {item}
            </button>
          ))}
        </div>

        {step === 'Basics' ? (
          <FormSection title="Product basics">
            <FormGrid>
              <Input placeholder="Product name" value={values.name} onChange={(e) => onChange('name', e.target.value)} />
              <Select options={categoryOptions} value={values.categoryId} onChange={(e) => onChange('categoryId', e.target.value)} />
              <Select
                options={configTemplates.map((template) => ({ value: template.id, label: template.name }))}
                value={values.configTemplateId}
                onChange={(e) => onChange('configTemplateId', e.target.value)}
              />
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
        ) : null}

        {step === 'Configuration' ? (
          <>
            <FormSection title="Choose creation method">
              <div className="grid gap-3 md:grid-cols-2">
                {creationMethodCards.map((method) => {
                  const active = values.creationMethod === method.value;
                  const Icon = method.icon;
                  return (
                    <button
                      type="button"
                      key={method.value}
                      onClick={() => onChange('creationMethod', method.value)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        active ? 'border-accent/40 bg-accent/12' : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-black/20 text-accentAlt">
                          <Icon size={18} />
                        </div>
                        <div>
                          <p className="font-medium text-white">{method.title}</p>
                          <p className="mt-1 text-sm leading-6 text-textMuted">{method.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </FormSection>

            <FormSection title="Configuration template">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 text-accentAlt">
                    <WandSparkles size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{selectedTemplate.name}</p>
                    <p className="text-[13px] text-textMuted">{selectedTemplate.description}</p>
                  </div>
                </div>
                <FormGrid>
                  {selectedTemplate.fields.map((field) => {
                    const fieldValue = values.dynamicFields[field.key] ?? '';
                    if (field.type === 'select') {
                      return (
                        <div key={field.key}>
                          <p className="mb-2 text-sm font-medium text-white">{field.label}</p>
                          <Select
                            options={field.options?.map((option) => ({ value: option.value, label: option.label })) ?? []}
                            value={fieldValue}
                            onChange={(e) =>
                              onChange('dynamicFields', {
                                ...values.dynamicFields,
                                [field.key]: e.target.value
                              })
                            }
                          />
                          {field.helpText ? <p className="mt-2 text-[12px] text-textMuted">{field.helpText}</p> : null}
                        </div>
                      );
                    }

                    return (
                      <div key={field.key}>
                        <p className="mb-2 text-sm font-medium text-white">{field.label}</p>
                        <Input
                          type={field.type === 'number' ? 'number' : 'text'}
                          value={fieldValue}
                          onChange={(e) =>
                            onChange('dynamicFields', {
                              ...values.dynamicFields,
                              [field.key]: e.target.value
                            })
                          }
                        />
                        {field.helpText ? <p className="mt-2 text-[12px] text-textMuted">{field.helpText}</p> : null}
                      </div>
                    );
                  })}
                </FormGrid>
              </div>
            </FormSection>

            <FormSection title="Files and generated defaults">
              {values.creationMethod === 'idml' ? (
                <FilePicker label="Upload IDML or PDF template" accept=".idml,.pdf" value={values.idmlFileName} onPick={(fileName) => onChange('idmlFileName', fileName)} />
              ) : null}
              {values.creationMethod === 'print-editor-template' ? (
                <FilePicker label="Upload .pn template" accept=".pn" value={values.printEditorTemplateName} onPick={(fileName) => onChange('printEditorTemplateName', fileName)} />
              ) : null}
              {values.creationMethod === 'blank' ? (
                <FormGrid>
                  <Input placeholder="Pages" value={values.pages} onChange={(e) => onChange('pages', e.target.value)} />
                  <Select options={['in', 'cm', 'mm', 'pt']} value={values.units} onChange={(e) => onChange('units', e.target.value)} />
                  <Input placeholder="Width" value={values.width} onChange={(e) => onChange('width', e.target.value)} />
                  <Input placeholder="Height" value={values.height} onChange={(e) => onChange('height', e.target.value)} />
                  <Input placeholder="Bleed" value={values.bleed} onChange={(e) => onChange('bleed', e.target.value)} />
                </FormGrid>
              ) : null}
              {values.creationMethod === 'parametric-standard' ? (
                <FormGrid>
                  <Input placeholder="Standard" value={values.parametricStandard} onChange={(e) => onChange('parametricStandard', e.target.value)} />
                  <Input placeholder="Size" value={values.parametricSize} onChange={(e) => onChange('parametricSize', e.target.value)} />
                  <Input placeholder="Allowance" value={values.parametricAllowance} onChange={(e) => onChange('parametricAllowance', e.target.value)} />
                  <Input placeholder="Material" value={values.parametricMaterial} onChange={(e) => onChange('parametricMaterial', e.target.value)} />
                </FormGrid>
              ) : null}
            </FormSection>
          </>
        ) : null}

        {step === 'Pricing' ? (
          <>
            <FormSection title="Production and pricing inputs">
              <FormGrid>
                <Select
                  options={materials.map((material) => ({ value: material.id, label: material.name }))}
                  value={values.materialId}
                  onChange={(e) => onChange('materialId', e.target.value)}
                />
                <Select
                  options={availableFinishes.map((finish) => ({ value: finish.id, label: finish.name }))}
                  value={values.finishId}
                  onChange={(e) => onChange('finishId', e.target.value)}
                />
                <Select
                  options={availablePrinters.map((printer) => ({ value: printer.id, label: printer.name }))}
                  value={values.printerProfileId}
                  onChange={(e) => onChange('printerProfileId', e.target.value)}
                />
                <Input placeholder="Quantity" type="number" value={values.quantity} onChange={(e) => onChange('quantity', e.target.value)} />
              </FormGrid>
            </FormSection>

            <FormSection title="Pricing preview">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Subtotal</p>
                  <p className="mt-2 text-xl font-semibold text-white">£{quote.subtotal}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Margin</p>
                  <p className="mt-2 text-xl font-semibold text-white">£{quote.margin}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Estimated sell price</p>
                  <p className="mt-2 text-xl font-semibold text-white">£{quote.total}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Turnaround</p>
                  <p className="mt-2 text-xl font-semibold text-white">{quote.turnaroundDays} days</p>
                </div>
              </div>
            </FormSection>
          </>
        ) : null}

        {step === 'Review' ? (
          <FormSection title="Review before launch">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Product</p>
                <p className="mt-2 text-lg font-semibold text-white">{values.name || 'Untitled product'}</p>
                <p className="mt-1 text-sm text-textMuted">
                  Category:{' '}
                  {(() => {
                    const selected = categoryOptions.find(
                      (item): item is Exclude<SelectOption, string> => typeof item !== 'string' && item.value === values.categoryId
                    );
                    return selected?.label ?? 'Not selected';
                  })()}
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Configuration</p>
                <p className="mt-2 text-lg font-semibold text-white">{selectedTemplate.name}</p>
                <p className="mt-1 text-sm text-textMuted">Method: {values.creationMethod}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 md:col-span-2">
                <p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Operational summary</p>
                <p className="mt-2 text-sm leading-6 text-textMuted">
                  Material <span className="text-white">{materials.find((item) => item.id === values.materialId)?.name ?? '—'}</span>, finish{' '}
                  <span className="text-white">{availableFinishes.find((item) => item.id === values.finishId)?.name ?? '—'}</span>, printer{' '}
                  <span className="text-white">{availablePrinters.find((item) => item.id === values.printerProfileId)?.name ?? '—'}</span>, estimated sell price{' '}
                  <span className="text-white">£{quote.total}</span>.
                </p>
              </div>
            </div>
          </FormSection>
        ) : null}

        <div className="flex flex-wrap justify-between gap-2">
          <div className="flex gap-2">
            {step !== 'Basics' ? (
              <Button type="button" onClick={() => setStep(steps[Math.max(0, steps.indexOf(step) - 1)])}>
                Back
              </Button>
            ) : null}
            {step !== 'Review' ? (
              <Button type="button" onClick={() => setStep(steps[Math.min(steps.length - 1, steps.indexOf(step) + 1)])}>
                Continue
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={onCancel}>
              Cancel
            </Button>
            <PrimaryButton type="button" onClick={onSubmit} disabled={!canSubmit}>
              Create Product
            </PrimaryButton>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(124,140,255,0.18),transparent_42%),rgba(255,255,255,0.03)] p-5 shadow-card">
          <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">Builder guidance</p>
          <h3 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-white">A print product should behave like a system.</h3>
          <p className="mt-2 text-[13px] leading-6 text-textMuted">
            This wizard pulls together template selection, configurable options, materials, finishes, printers, and pricing so product setup feels closer to a production-grade print platform.
          </p>
        </div>

        <div className="grid gap-3">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Selected template</p>
            <p className="mt-2 text-base font-semibold text-white">{selectedTemplate.name}</p>
            <p className="mt-1 text-[13px] text-textMuted">{selectedTemplate.fields.length} configuration inputs</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Materials & finishing</p>
            <p className="mt-2 text-base font-semibold text-white">{materials.find((item) => item.id === values.materialId)?.name ?? 'Not selected'}</p>
            <p className="mt-1 text-[13px] text-textMuted">Finish: {availableFinishes.find((item) => item.id === values.finishId)?.name ?? '—'}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Printer routing</p>
            <p className="mt-2 text-base font-semibold text-white">{availablePrinters.find((item) => item.id === values.printerProfileId)?.name ?? 'Not selected'}</p>
            <p className="mt-1 text-[13px] text-textMuted">Used for capability filtering and turnaround planning.</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Live estimate</p>
            <p className="mt-2 text-2xl font-semibold text-white">£{quote.total}</p>
            <p className="mt-1 text-[13px] text-textMuted">Subtotal £{quote.subtotal} · Margin £{quote.margin}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
