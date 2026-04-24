'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileBox, Layers3, PencilRuler, Rocket, ShieldCheck, Sparkles, Wand2 } from 'lucide-react';
import { FormGrid } from '@/components/forms/form-grid';
import { FormSection } from '@/components/forms/form-section';
import { Input } from '@/components/forms/input';
import { Select, type SelectOption } from '@/components/forms/select';
import {
  artworkProfiles,
  calculateProductEstimate,
  getArtworkProfile,
  getCompatibleFinishes,
  getCompatibleMaterials,
  getCompatiblePrinters,
  getRuleWarnings,
  getTemplateById,
  getVisibleTemplateFields,
  productTemplates
} from '@/lib/product-system';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { CreationMethod, ProductFormValues } from '@/modules/products/types';

const creationMethodCards: Array<{ value: CreationMethod; title: string; description: string; icon: typeof FileBox }> = [
  { value: 'idml', title: 'Attach IDML template file', description: 'Upload an Adobe InDesign IDML || PDF template for Print Editor products.', icon: FileBox },
  { value: 'print-editor-template', title: 'Import Print Editor template file', description: 'Import a .pn file from another PrintNow installation.', icon: Layers3 },
  { value: 'blank', title: 'Generate a blank product', description: 'Create a blank canvas product using pages, units, dimensions, and bleed.', icon: PencilRuler },
  { value: 'parametric-standard', title: 'Generate a parametric standard', description: 'Create a product from a Print CAD parametric standard with size and material.', icon: Rocket }
];
const steps = ['Basics', 'Creation', 'Configuration', 'Review'] as const;
type StepId = (typeof steps)[number];

function FilePicker({ label, accept, value, onPick }: { label: string; accept: string; value: string; onPick: (fileName: string) => void }) {
  return (
    <label className="block rounded-2xl border border-dashed border-white/12 bg-white/[0.03] p-4 text-sm text-textMuted">
      <span className="mb-2 block font-medium text-white">{label}</span>
      <input type="file" accept={accept} className="mb-3 block w-full text-sm" onChange={(event) => onPick(event.target.files?.[0]?.name ?? '')} />
      <p>{value ? `Selected: ${value}` : 'No file selected yet.'}</p>
    </label>
  );
}

export function ProductForm({ values, categoryOptions, onChange, onCancel, onSubmit, success, onReset }: {
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

  const selectedTemplate = useMemo(() => getTemplateById(values.templateId), [values.templateId]);
  const compatibleMaterials = useMemo(() => getCompatibleMaterials(values.templateId), [values.templateId]);
  const selectedMaterial = useMemo(
    () => compatibleMaterials.find((item) => item.id === values.materialId) ?? compatibleMaterials[0],
    [compatibleMaterials, values.materialId]
  );
  const allowedFinishes = useMemo(() => getCompatibleFinishes(values.templateId, selectedMaterial?.id ?? values.materialId), [values.templateId, selectedMaterial, values.materialId]);
  const allowedPrinters = useMemo(
    () => getCompatiblePrinters(values.templateId, selectedMaterial?.id ?? values.materialId, values.configValues ?? {}),
    [values.templateId, selectedMaterial, values.materialId, values.configValues]
  );
  const visibleTemplateFields = useMemo(() => getVisibleTemplateFields(values.templateId, values.configValues ?? {}), [values.templateId, values.configValues]);
  const estimate = useMemo(
    () => calculateProductEstimate(Number(values.quantity) || 250, selectedMaterial?.id ?? values.materialId, values.finishId, values.printerId, values.turnaround, values.configValues ?? {}),
    [values.quantity, selectedMaterial, values.materialId, values.finishId, values.printerId, values.turnaround, values.configValues]
  );
  const artworkProfile = useMemo(() => getArtworkProfile(values.templateId), [values.templateId]);
  const warnings = useMemo(() => getRuleWarnings(values.templateId, values.configValues ?? {}), [values.templateId, values.configValues]);

  useEffect(() => {
    if (compatibleMaterials.length && !compatibleMaterials.some((item) => item.id === values.materialId)) {
      onChange('materialId', compatibleMaterials[0].id);
    }
  }, [compatibleMaterials, onChange, values.materialId]);

  useEffect(() => {
    if (allowedFinishes.length && !allowedFinishes.some((item) => item.id === values.finishId)) {
      onChange('finishId', allowedFinishes[0].id);
    }
  }, [allowedFinishes, onChange, values.finishId]);

  useEffect(() => {
    if (allowedPrinters.length && !allowedPrinters.some((item) => item.id === values.printerId)) {
      onChange('printerId', allowedPrinters[0].id);
    }
  }, [allowedPrinters, onChange, values.printerId]);

  const creationSummary = useMemo(() => creationMethodCards.find((item) => item.value === values.creationMethod)?.title ?? 'Creation method', [values.creationMethod]);
  const updateConfigValue = (key: string, value: string) => onChange('configValues', { ...(values.configValues ?? {}), [key]: value });
  const selectedCategory = useMemo(() => categoryOptions.find((item): item is Exclude<SelectOption, string> => typeof item !== 'string' && item.value === values.categoryId), [categoryOptions, values.categoryId]);

  if (success) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-5 text-sm text-emerald-100">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 text-emerald-300" size={18} />
            <div>
              <p className="font-medium text-white">Product created successfully.</p>
              <p className="mt-1 text-emerald-100/85">Continue editing, start another product, || return to the list.</p>
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
            <button key={item} type="button" onClick={() => setStep(item)} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[13px] transition ${item === step ? 'border-accent/40 bg-accent/12 text-white' : 'border-white/8 bg-white/[0.03] text-textMuted hover:bg-white/[0.05]'}`}>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/20 text-[11px]">{index + 1}</span>{item}
            </button>
          ))}
        </div>

        {step === 'Basics' && (
          <FormSection title="Product basics">
            <FormGrid>
              <Input placeholder="Product name" value={values.name} onChange={(e) => onChange('name', e.target.value)} />
              <Select options={categoryOptions} value={values.categoryId} onChange={(e) => onChange('categoryId', e.target.value)} />
              <Select options={[{ value: 'online', label: 'Online Product' }, { value: 'static', label: 'Static / PDF Product' }, { value: 'parametric', label: 'Parametric Product' }]} value={values.productType} onChange={(e) => onChange('productType', e.target.value as ProductFormValues['productType'])} />
              <Select options={productTemplates.map((item) => ({ value: item.id, label: item.name }))} value={values.templateId} onChange={(e) => onChange('templateId', e.target.value)} />
            </FormGrid>
          </FormSection>
        )}

        {step === 'Creation' && (
          <>
            <FormSection title="Choose creation method">
              <div className="grid gap-3 md:grid-cols-2">
                {creationMethodCards.map((method) => {
                  const active = values.creationMethod === method.value;
                  const Icon = method.icon;
                  return (
                    <button type="button" key={method.value} onClick={() => onChange('creationMethod', method.value)} className={`rounded-2xl border p-4 text-left transition ${active ? 'border-accent/40 bg-accent/12' : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.05]'}`}>
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-black/20 text-accentAlt"><Icon size={18} /></div>
                        <div><p className="font-medium text-white">{method.title}</p><p className="mt-1 text-sm leading-6 text-textMuted">{method.description}</p></div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </FormSection>

            {values.creationMethod === 'idml' && <FormSection title="IDML / PDF template upload"><FilePicker label="Upload IDML || PDF template" accept=".idml,.pdf" value={values.idmlFileName} onPick={(fileName) => onChange('idmlFileName', fileName)} /></FormSection>}
            {values.creationMethod === 'print-editor-template' && <FormSection title="Print Editor template upload"><FilePicker label="Upload .pn template" accept=".pn" value={values.printEditorTemplateName} onPick={(fileName) => onChange('printEditorTemplateName', fileName)} /></FormSection>}
            {values.creationMethod === 'blank' && (
              <FormSection title="Blank product fields"><FormGrid>
                <label className="space-y-1 text-sm"><span className="text-textMuted">Pages</span><Input placeholder="Pages" value={values.pages} onChange={(e) => onChange('pages', e.target.value)} /></label>
                <label className="space-y-1 text-sm"><span className="text-textMuted">Units</span><Select options={['in', 'cm', 'mm', 'pt']} value={values.units} onChange={(e) => onChange('units', e.target.value)} /></label>
                <label className="space-y-1 text-sm"><span className="text-textMuted">Width</span><Input placeholder="Width" value={values.width} onChange={(e) => onChange('width', e.target.value)} /></label>
                <label className="space-y-1 text-sm"><span className="text-textMuted">Height</span><Input placeholder="Height" value={values.height} onChange={(e) => onChange('height', e.target.value)} /></label>
                <label className="space-y-1 text-sm"><span className="text-textMuted">Bleed</span><Input placeholder="Bleed" value={values.bleed} onChange={(e) => onChange('bleed', e.target.value)} /></label>
              </FormGrid><p className="mt-3 text-xs leading-5 text-textMuted">These fields define the starter canvas only. Sellable sizes, materials, finishes, sides, quantities, turnaround choices, and artwork rules should be managed as product option sets in the next catalog configuration build.</p></FormSection>
            )}
            {values.creationMethod === 'parametric-standard' && (
              <FormSection title="Parametric standard configuration"><FormGrid>
                <Input placeholder="Standard" value={values.parametricStandard} onChange={(e) => onChange('parametricStandard', e.target.value)} />
                <Input placeholder="Size" value={values.parametricSize} onChange={(e) => onChange('parametricSize', e.target.value)} />
                <Input placeholder="Allowance" value={values.parametricAllowance} onChange={(e) => onChange('parametricAllowance', e.target.value)} />
                <Input placeholder="Material" value={values.parametricMaterial} onChange={(e) => onChange('parametricMaterial', e.target.value)} />
              </FormGrid></FormSection>
            )}
          </>
        )}

        {step === 'Configuration' && (
          <>
            <FormSection title="Production configuration">
              <FormGrid>
                <Select options={compatibleMaterials.map((item) => ({ value: item.id, label: `${item.name} · ${item.gsm}gsm` }))} value={selectedMaterial?.id ?? ''} onChange={(e) => onChange('materialId', e.target.value)} />
                <Select options={allowedFinishes.map((item) => ({ value: item.id, label: item.name }))} value={values.finishId} onChange={(e) => onChange('finishId', e.target.value)} />
                <Select options={allowedPrinters.map((item) => ({ value: item.id, label: `${item.name} · ${item.technology}` }))} value={values.printerId} onChange={(e) => onChange('printerId', e.target.value)} />
                <Input placeholder="Quantity" value={values.quantity} onChange={(e) => onChange('quantity', e.target.value)} />
                <Select options={[{ value: 'standard', label: 'Standard' }, { value: 'priority', label: 'Priority' }, { value: 'rush', label: 'Rush' }]} value={values.turnaround} onChange={(e) => onChange('turnaround', e.target.value as ProductFormValues['turnaround'])} />
              </FormGrid>
            </FormSection>

            <FormSection title="Template driven options">
              <div className="mb-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black/20 text-accentAlt"><Wand2 size={18} /></div>
                  <div>
                    <p className="font-medium text-white">{selectedTemplate.name}</p>
                    <p className="mt-1 text-sm leading-6 text-textMuted">{selectedTemplate.description}</p>
                    <p className="mt-2 text-[12px] text-textMuted">Artwork profile: {artworkProfile.name}</p>
                  </div>
                </div>
              </div>
              <FormGrid>
                {visibleTemplateFields.map((field) => (
                  <div key={field.key}>
                    {field.type === 'select' ? (
                      <Select options={(field.options ?? []).map((item) => ({ value: item.value, label: item.label }))} value={(values.configValues ?? {})[field.key] ?? ''} onChange={(e) => updateConfigValue(field.key, e.target.value)} />
                    ) : (
                      <Input type={field.type === 'number' ? 'number' : 'text'} placeholder={field.label} value={(values.configValues ?? {})[field.key] ?? ''} onChange={(e) => updateConfigValue(field.key, e.target.value)} />
                    )}
                    {field.helpText ? <p className="mt-1 text-[12px] text-textMuted">{field.helpText}</p> : null}
                  </div>
                ))}
              </FormGrid>
            </FormSection>

            <FormSection title="Artwork preflight">
              <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Profile</p>
                  <p className="mt-2 text-lg font-semibold text-white">{artworkProfile.name}</p>
                  <p className="mt-1 text-sm text-textMuted">{artworkProfile.proofMode} proof · minimum {artworkProfile.minimumDpi} DPI</p>
                  <div className="mt-4 space-y-2">
                    {artworkProfile.checklist.map((item) => <div key={item} className="flex items-start gap-2 text-sm text-textMuted"><CheckCircle2 size={14} className="mt-0.5 text-emerald-300" />{item}</div>)}
                  </div>
                </div>
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-amber-100/80">Warnings</p>
                  <div className="mt-3 space-y-2 text-sm text-amber-50/90">
                    {[...artworkProfile.warnings, ...warnings].map((item) => <div key={item} className="flex items-start gap-2"><AlertTriangle size={14} className="mt-0.5 text-amber-300" />{item}</div>)}
                    {artworkProfile.warnings.length + warnings.length === 0 ? <div className="flex items-start gap-2"><ShieldCheck size={14} className="mt-0.5 text-emerald-300" />No preflight warnings right now.</div> : null}
                  </div>
                </div>
              </div>
            </FormSection>

            <FormSection title="Live production estimate">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Template</p><p className="mt-2 text-lg font-semibold text-white">{selectedTemplate.name}</p></div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Material</p><p className="mt-2 text-lg font-semibold text-white">{selectedMaterial?.name}</p></div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Route</p><p className="mt-2 text-lg font-semibold text-white">{allowedPrinters.find((item) => item.id === values.printerId)?.name ?? allowedPrinters[0]?.name}</p></div>
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4"><p className="text-[11px] uppercase tracking-[0.22em] text-emerald-100/75">Estimated total</p><p className="mt-2 text-2xl font-semibold text-white">£{estimate.total}</p><p className="mt-1 text-sm text-emerald-100/75">{estimate.tierLabel} · {estimate.turnaroundDays} day lead</p></div>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">{estimate.breakdown.map((item) => <div key={item.label} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-sm text-textMuted"><span>{item.label}</span><span className="font-medium text-white">£{item.value}</span></div>)}</div>
            </FormSection>
          </>
        )}

        {step === 'Review' && (
          <FormSection title="Review before launch">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Product</p>
                <p className="mt-2 text-lg font-semibold text-white">{values.name || 'Untitled product'}</p>
                <p className="mt-1 text-sm text-textMuted">Category: {selectedCategory?.label ?? 'Not selected'}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Method</p>
                <p className="mt-2 text-lg font-semibold text-white">{creationSummary}</p>
                <p className="mt-1 text-sm text-textMuted">Type: {values.productType}</p>
                <p className="mt-1 text-sm text-textMuted">Template: {selectedTemplate.name}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Production stack</p>
                  <p className="mt-2 text-sm text-white">{selectedMaterial?.name} · {(allowedFinishes.find((item) => item.id === values.finishId) ?? allowedFinishes[0])?.name} · {(allowedPrinters.find((item) => item.id === values.printerId) ?? allowedPrinters[0])?.name}</p>
                  <p className="mt-2 text-sm text-textMuted">Artwork profile: {artworkProfile.name} · {artworkProfile.proofMode} proof</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Price preview</p>
                  <p className="mt-2 text-sm text-white">£{estimate.total} total · {estimate.turnaroundDays} day lead</p>
                  <p className="mt-2 text-sm text-textMuted">Warnings: {warnings.length ? warnings.join(' · ') : 'None'}</p>
                </div>
              </div>
            </div>
            <p className="text-sm leading-6 text-textMuted">When you create this product, you can continue into the full editor to manage content, pricing, tags, alternate views, and storefront publishing.</p>
          </FormSection>
        )}

        <div className="flex justify-between gap-2">
          <Button onClick={stepIndex === 0 ? onCancel : () => setStep(steps[stepIndex - 1])}>{stepIndex === 0 ? 'Cancel' : 'Back'}</Button>
          {step !== 'Review' ? <PrimaryButton onClick={() => setStep(steps[stepIndex + 1])}>Continue</PrimaryButton> : <PrimaryButton onClick={onSubmit} disabled={!canSubmit}>Create Product</PrimaryButton>}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-[24px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(124,140,255,0.18),transparent_40%),rgba(255,255,255,0.03)] p-5">
          <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">Guided product flow</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">Build once, route cleanly.</h3>
          <p className="mt-2 text-sm leading-6 text-textMuted">This wizard connects template schema, substrate choices, artwork readiness, and pricing so the first product setup feels more like a production system.</p>
        </div>
        <div className="space-y-3">
          {creationMethodCards.map((item, index) => {
            const active = values.creationMethod === item.value;
            const Icon = item.icon;
            return <div key={item.value} className={`rounded-2xl border p-4 ${active ? 'border-accent/40 bg-accent/12' : 'border-white/8 bg-white/[0.03]'}`}><div className="flex items-start gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-black/20 text-accentAlt"><Icon size={16} /></div><div><p className="text-sm font-medium text-white">0{index + 1} · {item.title}</p><p className="mt-1 text-[13px] leading-6 text-textMuted">{item.description}</p></div></div></div>;
          })}
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Current estimate</p>
          <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">£{estimate.total}</p>
          <p className="mt-2 text-sm text-textMuted">{selectedTemplate.name} · {selectedMaterial?.name} · {(allowedPrinters.find((item) => item.id === values.printerId) ?? allowedPrinters[0])?.name}</p>
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/8 bg-black/20 p-3 text-[13px] text-textMuted"><Sparkles size={14} className="mt-0.5 text-accentAlt" />Pricing updates automatically as you change quantity, material, finish, and option values.</div>
        </div>
      </div>
    </div>
  );
}
