'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Layers3, Printer, ShieldCheck, WandSparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';

type Option = { label: string; value: string };
type Field = { key: string; label: string; type: 'select' | 'text' | 'number'; options?: Option[]; helpText?: string; visibility?: { key: string; equals: string } };
type Template = { id: string; name: string; description: string; artworkProfile: string; fields: Field[] };
type Material = { id: string; name: string; surcharge: number; finishIds: string[]; printerIds: string[] };
type Finish = { id: string; name: string; surcharge: number; setupFee: number };
type PrinterProfile = { id: string; name: string; technology: string; turnaroundDays: number };

type Turnaround = 'standard' | 'priority' | 'rush';

const templates: Template[] = [
  {
    id: 'business-cards',
    name: 'Business Cards',
    description: 'Standard small-format trade card with premium finish support.',
    artworkProfile: 'Marketing standard',
    fields: [
      { key: 'size', label: 'Trim size', type: 'select', options: [{ label: '85 × 55 mm', value: '85x55' }, { label: '90 × 50 mm', value: '90x50' }, { label: 'Square 65 × 65 mm', value: '65x65' }] },
      { key: 'sides', label: 'Print sides', type: 'select', options: [{ label: 'Single sided', value: 'single' }, { label: 'Double sided', value: 'double' }] },
      { key: 'whiteInk', label: 'White ink layer', type: 'select', options: [{ label: 'Not required', value: 'off' }, { label: 'Include white ink', value: 'on' }], visibility: { key: 'size', equals: '65x65' } },
      { key: 'notes', label: 'Artwork notes', type: 'text', helpText: 'Optional guidance for studio or prepress teams.' }
    ]
  },
  {
    id: 'flyers',
    name: 'Flyers & Leaflets',
    description: 'Promotional sheet product with folding and campaign options.',
    artworkProfile: 'Folded leaflet',
    fields: [
      { key: 'size', label: 'Flat size', type: 'select', options: [{ label: 'A6', value: 'a6' }, { label: 'A5', value: 'a5' }, { label: 'A4', value: 'a4' }, { label: 'DL', value: 'dl' }] },
      { key: 'folding', label: 'Fold style', type: 'select', options: [{ label: 'No fold', value: 'none' }, { label: 'Half fold', value: 'half' }, { label: 'Tri-fold', value: 'tri-fold' }] },
      { key: 'perforation', label: 'Perforation', type: 'select', options: [{ label: 'No perforation', value: 'off' }, { label: 'Add perforation', value: 'on' }], visibility: { key: 'folding', equals: 'tri-fold' } },
      { key: 'campaignCode', label: 'Campaign code', type: 'text' }
    ]
  },
  {
    id: 'booklets',
    name: 'Booklets',
    description: 'Multi-page booklet product with binding and spine configuration.',
    artworkProfile: 'Booklet production',
    fields: [
      { key: 'size', label: 'Finished size', type: 'select', options: [{ label: 'A5 Portrait', value: 'a5' }, { label: 'A4 Portrait', value: 'a4' }] },
      { key: 'binding', label: 'Binding', type: 'select', options: [{ label: 'Saddle stitched', value: 'saddle' }, { label: 'Perfect bound', value: 'perfect' }] },
      { key: 'pageCount', label: 'Page count', type: 'number' },
      { key: 'spineText', label: 'Spine text', type: 'text', visibility: { key: 'binding', equals: 'perfect' } }
    ]
  }
];

const materials: Material[] = [
  { id: 'silk-350', name: '350gsm Silk', surcharge: 0, finishIds: ['matt-lam', 'soft-touch', 'spot-uv'], printerIds: ['hp-indigo-7k', 'xerox-iridesse'] },
  { id: 'uncoated-300', name: '300gsm Uncoated', surcharge: 2, finishIds: ['none', 'matt-lam'], printerIds: ['hp-indigo-7k', 'komori-offset'] },
  { id: 'silk-170', name: '170gsm Silk', surcharge: 1, finishIds: ['none', 'gloss-lam'], printerIds: ['hp-indigo-7k', 'komori-offset'] }
];
const finishes: Finish[] = [
  { id: 'none', name: 'No finish', surcharge: 0, setupFee: 0 },
  { id: 'matt-lam', name: 'Matt laminate', surcharge: 6, setupFee: 10 },
  { id: 'gloss-lam', name: 'Gloss laminate', surcharge: 5, setupFee: 10 },
  { id: 'soft-touch', name: 'Soft touch laminate', surcharge: 9, setupFee: 14 },
  { id: 'spot-uv', name: 'Spot UV', surcharge: 18, setupFee: 30 }
];
const printers: PrinterProfile[] = [
  { id: 'hp-indigo-7k', name: 'HP Indigo 7K', technology: 'Digital', turnaroundDays: 2 },
  { id: 'xerox-iridesse', name: 'Xerox Iridesse', technology: 'Digital specialty', turnaroundDays: 3 },
  { id: 'komori-offset', name: 'Komori Lithrone', technology: 'Offset', turnaroundDays: 4 }
];

const artworkProfiles: Record<string, string[]> = {
  'Marketing standard': ['3 mm bleed on all edges', 'CMYK artwork preferred', 'Fonts outlined or embedded', 'Images above 300 DPI'],
  'Folded leaflet': ['Fold panel widths confirmed', 'Safe area respected on fold lines', 'Bleed checked around fold edges'],
  'Booklet production': ['Page count divisible by 4', 'Creep allowance confirmed', 'Binding setup approved']
};

const pricingTiers = [
  { upTo: 250, unitCost: 0.18 },
  { upTo: 500, unitCost: 0.12 },
  { upTo: 1000, unitCost: 0.09 },
  { upTo: 5000, unitCost: 0.06 }
];

function getVisibleFields(template: Template, values: Record<string, string>) {
  return template.fields.filter((field) => !field.visibility || values[field.visibility.key] === field.visibility.equals);
}

function calculateQuote(quantity: number, materialId: string, finishId: string, printerId: string, turnaround: Turnaround) {
  const material = materials.find((item) => item.id === materialId) ?? materials[0];
  const finish = finishes.find((item) => item.id === finishId) ?? finishes[0];
  const printer = printers.find((item) => item.id === printerId) ?? printers[0];
  const tier = pricingTiers.find((item) => quantity <= item.upTo) ?? pricingTiers[pricingTiers.length - 1];
  const baseRun = 14;
  const machineCost = printer.technology === 'Offset' ? 24 : printer.technology === 'Digital specialty' ? 18 : 12;
  const turnaroundMultiplier = turnaround === 'rush' ? 1.4 : turnaround === 'priority' ? 1.18 : 1;
  const subtotal = Math.round((baseRun + quantity * tier.unitCost + material.surcharge + finish.surcharge + finish.setupFee + machineCost) * turnaroundMultiplier);
  const margin = Math.round(subtotal * 0.32);
  return {
    subtotal,
    margin,
    total: subtotal + margin,
    turnaroundDays: turnaround === 'rush' ? Math.max(1, printer.turnaroundDays - 1) : turnaround === 'priority' ? Math.max(1, printer.turnaroundDays - 0.5) : printer.turnaroundDays,
    tierLabel: `up to ${tier.upTo}`,
    breakdown: [
      { label: 'Base run', value: baseRun },
      { label: 'Material uplift', value: material.surcharge + Math.round(quantity * tier.unitCost) },
      { label: 'Finish & setup', value: finish.surcharge + finish.setupFee },
      { label: 'Machine routing', value: machineCost },
      { label: 'Margin', value: margin }
    ]
  };
}

export default function Page() {
  const [templateId, setTemplateId] = useState(templates[0].id);
  const [materialId, setMaterialId] = useState(materials[0].id);
  const [finishId, setFinishId] = useState(materials[0].finishIds[0]);
  const [printerId, setPrinterId] = useState(materials[0].printerIds[0]);
  const [quantity, setQuantity] = useState('250');
  const [turnaround, setTurnaround] = useState<Turnaround>('standard');
  const [values, setValues] = useState<Record<string, string>>({});

  const template = useMemo(() => templates.find((item) => item.id === templateId) ?? templates[0], [templateId]);
  const allowedFinishes = useMemo(() => finishes.filter((item) => (materials.find((m) => m.id === materialId) ?? materials[0]).finishIds.includes(item.id)), [materialId]);
  const allowedPrinters = useMemo(() => printers.filter((item) => (materials.find((m) => m.id === materialId) ?? materials[0]).printerIds.includes(item.id)), [materialId]);
  const visibleFields = useMemo(() => getVisibleFields(template, values), [template, values]);
  const quote = useMemo(() => calculateQuote(Number(quantity) || 100, materialId, finishId, printerId, turnaround), [quantity, materialId, finishId, printerId, turnaround]);

  useEffect(() => {
    if (!allowedFinishes.some((item) => item.id === finishId)) setFinishId(allowedFinishes[0]?.id ?? 'none');
  }, [allowedFinishes, finishId]);
  useEffect(() => {
    if (!allowedPrinters.some((item) => item.id === printerId)) setPrinterId(allowedPrinters[0]?.id ?? printers[0].id);
  }, [allowedPrinters, printerId]);

  return (
    <div className="space-y-6">
      <PageHeader title="Product Builder Studio" subtitle="Model configurable print products with template-driven options, production-aware routing, artwork rules, and live pricing — closer to a real print MIS than a static admin form." />
      <Card className="overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="p-6 md:p-8">
            <div className="inline-flex rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-textMuted">Production-grade print configuration</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-white">Turn products into configurable systems, not one-off records.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-textMuted">This builder combines template schema, material/finish compatibility, printer routing, artwork readiness, and pricing logic in one guided surface.</p>
          </div>
          <div className="border-t border-white/6 bg-[radial-gradient(circle_at_top_left,rgba(124,140,255,0.18),transparent_42%),rgba(255,255,255,0.03)] p-6 md:border-l md:border-t-0 md:p-8">
            <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">Live stack</p>
            <div className="mt-4 space-y-3">
              {[
                { icon: Layers3, label: 'Template', value: template.name },
                { icon: Printer, label: 'Printer', value: allowedPrinters.find((item) => item.id === printerId)?.name ?? 'Not selected' },
                { icon: ShieldCheck, label: 'Artwork profile', value: template.artworkProfile },
                { icon: CheckCircle2, label: 'Estimated sell price', value: `£${quote.total}` }
              ].map((item) => {
                const Icon = item.icon;
                return <div key={item.label} className="rounded-2xl border border-white/8 bg-black/20 p-4"><div className="flex items-start gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-accentAlt"><Icon size={16} /></div><div><p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">{item.label}</p><p className="mt-1 text-sm font-medium text-white">{item.value}</p></div></div></div>;
              })}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2"><span className="text-sm font-medium">Config template</span><Select options={templates.map((item) => ({ value: item.id, label: item.name }))} value={templateId} onChange={(e) => setTemplateId(e.target.value)} /></label>
            <label className="space-y-2"><span className="text-sm font-medium">Quantity</span><Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></label>
            <label className="space-y-2"><span className="text-sm font-medium">Material</span><Select options={materials.map((item) => ({ value: item.id, label: item.name }))} value={materialId} onChange={(e) => setMaterialId(e.target.value)} /></label>
            <label className="space-y-2"><span className="text-sm font-medium">Finish</span><Select options={allowedFinishes.map((item) => ({ value: item.id, label: item.name }))} value={finishId} onChange={(e) => setFinishId(e.target.value)} /></label>
            <label className="space-y-2"><span className="text-sm font-medium">Printer profile</span><Select options={allowedPrinters.map((item) => ({ value: item.id, label: `${item.name} · ${item.technology}` }))} value={printerId} onChange={(e) => setPrinterId(e.target.value)} /></label>
            <label className="space-y-2"><span className="text-sm font-medium">Turnaround</span><Select options={[{ value: 'standard', label: 'Standard' }, { value: 'priority', label: 'Priority' }, { value: 'rush', label: 'Rush' }]} value={turnaround} onChange={(e) => setTurnaround(e.target.value as Turnaround)} /></label>
          </div>

          <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <p className="text-sm font-medium text-white">Template options</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {visibleFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <span className="text-sm font-medium">{field.label}</span>
                  {field.type === 'select' ? (
                    <Select options={field.options?.map((item) => ({ value: item.value, label: item.label })) ?? []} value={values[field.key] ?? ''} onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))} />
                  ) : (
                    <Input type={field.type === 'number' ? 'number' : 'text'} value={values[field.key] ?? ''} onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))} />
                  )}
                  {field.helpText ? <p className="text-[12px] text-textMuted">{field.helpText}</p> : null}
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">Artwork readiness</p>
            <p className="mt-2 text-sm font-medium text-white">{template.artworkProfile}</p>
            <div className="mt-4 space-y-2">
              {(artworkProfiles[template.artworkProfile] ?? []).map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                  <CheckCircle2 size={14} className="mt-0.5 text-accentAlt" />
                  <p className="text-[12px] leading-6 text-textMuted">{item}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">Pricing breakdown</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Subtotal</p><p className="mt-2 text-2xl font-semibold text-white">£{quote.subtotal}</p></div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Sell price</p><p className="mt-2 text-2xl font-semibold text-white">£{quote.total}</p></div>
            </div>
            <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-sm font-medium text-white">Applied tier · {quote.tierLabel}</p>
              <p className="mt-1 text-[13px] text-textMuted">Turnaround {quote.turnaroundDays} days</p>
              <div className="mt-4 space-y-2">
                {quote.breakdown.map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-[13px] text-textMuted"><span>{item.label}</span><span className="font-medium text-white">£{item.value}</span></div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
