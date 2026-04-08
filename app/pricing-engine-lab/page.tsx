'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';

const materials = [
  { id: 'silk-350', name: '350gsm Silk', uplift: 0 },
  { id: 'uncoated-300', name: '300gsm Uncoated', uplift: 2 },
  { id: 'silk-170', name: '170gsm Silk', uplift: 1 }
];
const finishes = [
  { id: 'none', name: 'No finish', surcharge: 0, setup: 0 },
  { id: 'matt-lam', name: 'Matt laminate', surcharge: 6, setup: 10 },
  { id: 'spot-uv', name: 'Spot UV', surcharge: 18, setup: 30 }
];
const tiers = [
  { upTo: 250, unit: 0.18 },
  { upTo: 500, unit: 0.12 },
  { upTo: 1000, unit: 0.09 },
  { upTo: 5000, unit: 0.06 }
];

export default function Page() {
  const [quantity, setQuantity] = useState('500');
  const [materialId, setMaterialId] = useState('silk-350');
  const [finishId, setFinishId] = useState('matt-lam');
  const [turnaround, setTurnaround] = useState('standard');

  const quote = useMemo(() => {
    const qty = Number(quantity) || 100;
    const material = materials.find((item) => item.id === materialId) ?? materials[0];
    const finish = finishes.find((item) => item.id === finishId) ?? finishes[0];
    const tier = tiers.find((item) => qty <= item.upTo) ?? tiers[tiers.length - 1];
    const turnaroundMultiplier = turnaround === 'rush' ? 1.4 : turnaround === 'priority' ? 1.18 : 1;
    const subtotal = Math.round((14 + qty * tier.unit + material.uplift + finish.surcharge + finish.setup + 12) * turnaroundMultiplier);
    const margin = Math.round(subtotal * 0.32);
    return { subtotal, margin, total: subtotal + margin, tier: `up to ${tier.upTo}` };
  }, [quantity, materialId, finishId, turnaround]);

  return (
    <div className="space-y-6">
      <PageHeader title="Pricing Engine Lab" subtitle="Shape print pricing with quantity tiers, material uplift, finish charges, setup fees, and turnaround pressure before wiring the API engine." />
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2"><span className="text-sm font-medium">Quantity</span><Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></label>
            <label className="space-y-2"><span className="text-sm font-medium">Material</span><Select options={materials.map((item) => ({ value: item.id, label: item.name }))} value={materialId} onChange={(e) => setMaterialId(e.target.value)} /></label>
            <label className="space-y-2"><span className="text-sm font-medium">Finish</span><Select options={finishes.map((item) => ({ value: item.id, label: item.name }))} value={finishId} onChange={(e) => setFinishId(e.target.value)} /></label>
            <label className="space-y-2"><span className="text-sm font-medium">Turnaround</span><Select options={[{ value: 'standard', label: 'Standard' }, { value: 'priority', label: 'Priority' }, { value: 'rush', label: 'Rush' }]} value={turnaround} onChange={(e) => setTurnaround(e.target.value)} /></label>
          </div>
        </Card>
        <Card>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Subtotal</p><p className="mt-2 text-2xl font-semibold text-white">£{quote.subtotal}</p></div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Margin</p><p className="mt-2 text-2xl font-semibold text-white">£{quote.margin}</p></div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Sell price</p><p className="mt-2 text-2xl font-semibold text-white">£{quote.total}</p></div>
          </div>
          <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-[13px] leading-6 text-textMuted">
            Active tier: <span className="text-white">{quote.tier}</span>. This screen is the staging area for quantity breaks, setup fees, and finish/material uplifts before final API wiring.
          </div>
        </Card>
      </div>
    </div>
  );
}
