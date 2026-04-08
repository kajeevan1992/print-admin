'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { calculatePricingQuote, finishes, materials, printerProfiles } from '@/lib/product-system-store';

export default function Page() {
  const [quantity, setQuantity] = useState('500');
  const [materialId, setMaterialId] = useState(materials[0].id);
  const [finishId, setFinishId] = useState(finishes[1].id);
  const [printerProfileId, setPrinterProfileId] = useState(printerProfiles[0].id);
  const quote = useMemo(() => calculatePricingQuote({ quantity: Number(quantity) || 100, materialId, finishId, printerProfileId }), [quantity, materialId, finishId, printerProfileId]);

  return (
    <div className="space-y-6">
      <PageHeader title="Pricing Engine Lab" subtitle="Shape your rule stack for quantity breaks, material uplift, finish cost, setup fees, machine routing, and protected margin." />
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2"><span className="text-sm font-medium">Quantity</span><Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></label>
            <label className="space-y-2"><span className="text-sm font-medium">Material</span><Select options={materials.map((item) => ({ value: item.id, label: item.name }))} value={materialId} onChange={(e) => setMaterialId(e.target.value)} /></label>
            <label className="space-y-2"><span className="text-sm font-medium">Finish</span><Select options={finishes.map((item) => ({ value: item.id, label: item.name }))} value={finishId} onChange={(e) => setFinishId(e.target.value)} /></label>
            <label className="space-y-2"><span className="text-sm font-medium">Printer</span><Select options={printerProfiles.map((item) => ({ value: item.id, label: item.name }))} value={printerProfileId} onChange={(e) => setPrinterProfileId(e.target.value)} /></label>
          </div>
          <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <p className="text-sm font-medium text-white">Rule stack</p>
            <ul className="mt-3 space-y-2 text-[13px] leading-6 text-textMuted">
              <li>• Base run cost anchors every quote.</li>
              <li>• Quantity adds scalable run cost.</li>
              <li>• Material surcharge and GSM impact stock pricing.</li>
              <li>• Finish adds uplift and setup fees.</li>
              <li>• Printer adds capability-based operational cost.</li>
              <li>• Margin is layered on top to protect commercial outcome.</li>
            </ul>
          </div>
        </Card>
        <Card>
          <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">Live estimate</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Subtotal</p><p className="mt-2 text-2xl font-semibold text-white">£{quote.subtotal}</p></div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Margin</p><p className="mt-2 text-2xl font-semibold text-white">£{quote.margin}</p></div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Sell price</p><p className="mt-2 text-2xl font-semibold text-white">£{quote.total}</p></div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Turnaround</p><p className="mt-2 text-2xl font-semibold text-white">{quote.turnaroundDays} days</p></div>
          </div>
          <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-[13px] leading-6 text-textMuted">
            Use this as the admin-side confidence layer before wiring exact API pricing. It keeps the business logic visible and testable while you refine production rules.
          </div>
        </Card>
      </div>
    </div>
  );
}
