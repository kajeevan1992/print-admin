'use client';

import { useMemo, useState } from 'react';
import { WandSparkles, Layers3, Printer, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { calculatePricingQuote, configTemplates, getAvailableFinishes, getAvailablePrinters, getTemplateById, materials } from '@/lib/product-system-store';

export function ProductBuilderStudioPage() {
  const [templateId, setTemplateId] = useState(configTemplates[0].id);
  const [materialId, setMaterialId] = useState(materials[0].id);
  const [finishId, setFinishId] = useState(getAvailableFinishes(materials[0].id)[0]?.id ?? 'none');
  const [printerProfileId, setPrinterProfileId] = useState(getAvailablePrinters(materials[0].id)[0]?.id ?? '');
  const [quantity, setQuantity] = useState('250');
  const [dynamicFields, setDynamicFields] = useState<Record<string, string>>({});

  const template = useMemo(() => getTemplateById(templateId), [templateId]);
  const finishes = useMemo(() => getAvailableFinishes(materialId), [materialId]);
  const printers = useMemo(() => getAvailablePrinters(materialId), [materialId]);

  const quote = useMemo(() => calculatePricingQuote({ quantity: Number(quantity) || 100, materialId, finishId, printerProfileId }), [quantity, materialId, finishId, printerProfileId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Builder Studio"
        subtitle="Design powerful print products with templates, option schemas, materials, finishes, printers, and live pricing before wiring the workflow to APIs."
      />

      <Card className="overflow-hidden p-0">
        <div className="grid gap-0 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="p-6 md:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-textMuted">
              <WandSparkles size={12} /> v19 + v20 product system
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-white">Template-driven product configuration for real print businesses.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-textMuted">
              This builder mirrors the plugin philosophy: template + options + materials + finishes + printers + pricing. The admin becomes the source of truth instead of relying on hidden logic.
            </p>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {[
                ['Config templates', 'Reusable dropdowns, text fields, sizes, and validation.'],
                ['Production routing', 'Filter compatible materials, finishes, and printer profiles.'],
                ['Pricing preview', 'Preview structured price outcomes before launch.']
              ].map(([title, body]) => (
                <div key={title} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-sm font-medium text-white">{title}</p>
                  <p className="mt-1 text-[13px] leading-6 text-textMuted">{body}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-white/6 bg-[radial-gradient(circle_at_top_left,rgba(124,140,255,0.18),transparent_42%),rgba(255,255,255,0.03)] p-6 md:border-l md:border-t-0 md:p-8">
            <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">Live product stack</p>
            <div className="mt-4 space-y-3">
              {[
                { icon: Layers3, label: 'Template', value: template.name },
                { icon: Printer, label: 'Printer', value: printers.find((printer) => printer.id === printerProfileId)?.name ?? 'Not selected' },
                { icon: ShieldCheck, label: 'Estimated sell price', value: `£${quote.total}` }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-accentAlt"><Icon size={16} /></div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">{item.label}</p>
                        <p className="mt-1 text-sm font-medium text-white">{item.value}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Config template</span>
              <Select options={configTemplates.map((item) => ({ value: item.id, label: item.name }))} value={templateId} onChange={(e) => setTemplateId(e.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Quantity</span>
              <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Material</span>
              <Select options={materials.map((item) => ({ value: item.id, label: item.name }))} value={materialId} onChange={(e) => { setMaterialId(e.target.value); const nextFinish = getAvailableFinishes(e.target.value)[0]; if (nextFinish) setFinishId(nextFinish.id); const nextPrinter = getAvailablePrinters(e.target.value)[0]; if (nextPrinter) setPrinterProfileId(nextPrinter.id); }} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Finish</span>
              <Select options={finishes.map((item) => ({ value: item.id, label: item.name }))} value={finishId} onChange={(e) => setFinishId(e.target.value)} />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium">Printer profile</span>
              <Select options={printers.map((item) => ({ value: item.id, label: `${item.name} · ${item.technology}` }))} value={printerProfileId} onChange={(e) => setPrinterProfileId(e.target.value)} />
            </label>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {template.fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <span className="text-sm font-medium">{field.label}</span>
                {field.type === 'select' ? (
                  <Select
                    options={field.options?.map((item) => ({ value: item.value, label: item.label })) ?? []}
                    value={dynamicFields[field.key] ?? ''}
                    onChange={(e) => setDynamicFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  />
                ) : (
                  <Input
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={dynamicFields[field.key] ?? ''}
                    onChange={(e) => setDynamicFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  />
                )}
                {field.helpText ? <p className="text-[12px] text-textMuted">{field.helpText}</p> : null}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">Pricing engine preview</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Subtotal</p><p className="mt-2 text-2xl font-semibold text-white">£{quote.subtotal}</p></div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Margin</p><p className="mt-2 text-2xl font-semibold text-white">£{quote.margin}</p></div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Sell price</p><p className="mt-2 text-2xl font-semibold text-white">£{quote.total}</p></div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Turnaround</p><p className="mt-2 text-2xl font-semibold text-white">{quote.turnaroundDays} days</p></div>
          </div>
          <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <p className="text-sm font-medium text-white">Production-aware logic</p>
            <ul className="mt-3 space-y-2 text-[13px] leading-6 text-textMuted">
              <li>• Material filters compatible finishes and printers.</li>
              <li>• Template fields define what the storefront should ask the customer.</li>
              <li>• Pricing combines quantity, material uplift, finish cost, machine cost, and margin.</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
