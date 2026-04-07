'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, FileBox, Layers3, PencilRuler, Rocket } from 'lucide-react';
import { FormGrid } from '@/components/forms/form-grid';
import { FormSection } from '@/components/forms/form-section';
import { Input } from '@/components/forms/input';
import { Select, type SelectOption } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
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

const steps = ['Basics', 'Creation', 'Review'] as const;

type StepId = (typeof steps)[number];

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
  const [step, setStep] = useState<StepId>('Basics');

  const canSubmit = Boolean(values.name.trim() && values.categoryId);
  const stepIndex = steps.indexOf(step);

  const creationSummary = useMemo(() => {
    const match = creationMethodCards.find((item) => item.value === values.creationMethod);
    return match?.title ?? 'Creation method';
  }, [values.creationMethod]);

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
    <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
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

        {step === 'Creation' ? (
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

            {values.creationMethod === 'idml' ? (
              <FormSection title="IDML / PDF template upload">
                <FilePicker label="Upload IDML or PDF template" accept=".idml,.pdf" value={values.idmlFileName} onPick={(fileName) => onChange('idmlFileName', fileName)} />
              </FormSection>
            ) : null}

            {values.creationMethod === 'print-editor-template' ? (
              <FormSection title="Print Editor template upload">
                <FilePicker label="Upload .pn template" accept=".pn" value={values.printEditorTemplateName} onPick={(fileName) => onChange('printEditorTemplateName', fileName)} />
              </FormSection>
            ) : null}

            {values.creationMethod === 'blank' ? (
              <FormSection title="Blank product fields">
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
              <FormSection title="Parametric standard configuration">
                <FormGrid>
                  <Input placeholder="Standard" value={values.parametricStandard} onChange={(e) => onChange('parametricStandard', e.target.value)} />
                  <Input placeholder="Size" value={values.parametricSize} onChange={(e) => onChange('parametricSize', e.target.value)} />
                  <Input placeholder="Allowance" value={values.parametricAllowance} onChange={(e) => onChange('parametricAllowance', e.target.value)} />
                  <Input placeholder="Material" value={values.parametricMaterial} onChange={(e) => onChange('parametricMaterial', e.target.value)} />
                </FormGrid>
              </FormSection>
            ) : null}
          </>
        ) : null}

        {step === 'Review' ? (
          <FormSection title="Review before launch">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Product</p>
                <p className="mt-2 text-lg font-semibold text-white">{values.name || 'Untitled product'}</p>
                <p className="mt-1 text-sm text-textMuted">Category: {(() => {
                  const selected = categoryOptions.find((item) => {
                    return typeof item !== 'string' && item.value === values.categoryId;
                  });
                  return selected && typeof selected !== 'string' ? selected.label : 'Not selected';
                })()}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Method</p>
                <p className="mt-2 text-lg font-semibold text-white">{creationSummary}</p>
                <p className="mt-1 text-sm text-textMuted">Type: {values.productType}</p>
              </div>
            </div>
            <p className="text-sm leading-6 text-textMuted">When you create this product, you can continue into the full editor to manage content, pricing, tags, alternate views, and storefront publishing.</p>
          </FormSection>
        ) : null}

        <div className="flex justify-between gap-2">
          <Button onClick={stepIndex === 0 ? onCancel : () => setStep(steps[stepIndex - 1])}>{stepIndex === 0 ? 'Cancel' : 'Back'}</Button>
          {step !== 'Review' ? (
            <PrimaryButton onClick={() => setStep(steps[stepIndex + 1])}>Continue</PrimaryButton>
          ) : (
            <PrimaryButton onClick={onSubmit} disabled={!canSubmit}>Create Product</PrimaryButton>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-[24px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(124,140,255,0.18),transparent_40%),rgba(255,255,255,0.03)] p-5">
          <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">Guided product flow</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">Build once, launch cleanly.</h3>
          <p className="mt-2 text-sm leading-6 text-textMuted">This wizard keeps the first-create experience calmer by separating setup, method choice, and final review into clearer steps.</p>
        </div>

        <div className="space-y-3">
          {creationMethodCards.map((item, index) => {
            const active = values.creationMethod === item.value;
            const Icon = item.icon;
            return (
              <div key={item.value} className={`rounded-2xl border p-4 ${active ? 'border-accent/40 bg-accent/12' : 'border-white/8 bg-white/[0.03]'}`}>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-black/20 text-accentAlt"><Icon size={16} /></div>
                  <div>
                    <p className="text-sm font-medium text-white">0{index + 1} · {item.title}</p>
                    <p className="mt-1 text-[13px] leading-6 text-textMuted">{item.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
