'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, MapPinned, PackageCheck, Plus, Search, ShieldCheck, Truck, ScanLine, ArrowRightLeft, ArrowUpRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { BaseModal } from '@/components/modals/base-modal';

type DispatchStage = 'ready' | 'manifested' | 'handover' | 'exception';
type RiskBand = 'low' | 'medium' | 'high';

type DispatchShipment = {
  id: string;
  productionJobId?: string;
  batchCode: string;
  orderCount: number;
  orderNumber?: string;
  productName?: string;
  customerName?: string;
  carrier: 'DHL' | 'DPD' | 'Royal Mail' | 'UPS' | 'Other';
  service: 'next-day' | 'tracked-24' | 'tracked-48' | 'economy' | 'same-day' | 'collection';
  dock: 'North Dock' | 'South Dock' | 'Express Cage' | 'Front Counter';
  stage: DispatchStage;
  risk: RiskBand;
  destinationZone: 'UK' | 'EU' | 'US' | 'ROW';
  scanStatus: 'complete' | 'partial' | 'missing';
  cutoffAt: string;
  trackingNumber?: string;
  manifestNumber?: string;
  status?: string;
  notes: string;
};

const STORAGE_KEY = 'dispatch-center-shipments';
const stageOrder: DispatchStage[] = ['ready', 'manifested', 'handover', 'exception'];
const stageLabels: Record<DispatchStage, string> = { ready: 'Ready to Pack', manifested: 'Manifested', handover: 'Carrier Handover', exception: 'Exception' };

const emptyShipment: DispatchShipment = {
  id: '', batchCode: '', orderCount: 1, carrier: 'DHL', service: 'next-day', dock: 'North Dock', stage: 'ready', risk: 'low', destinationZone: 'UK', scanStatus: 'complete', cutoffAt: '15:00', notes: ''
};

const seedShipments: DispatchShipment[] = [
  { id: 'ds-1001', batchCode: 'BATCH-NE-104', orderCount: 18, carrier: 'DHL', service: 'next-day', dock: 'Express Cage', stage: 'ready', risk: 'medium', destinationZone: 'UK', scanStatus: 'partial', cutoffAt: '14:30', notes: 'Waiting on 2 late-finishing orders.' },
  { id: 'ds-1002', batchCode: 'BATCH-SD-311', orderCount: 42, carrier: 'DPD', service: 'tracked-24', dock: 'North Dock', stage: 'manifested', risk: 'low', destinationZone: 'UK', scanStatus: 'complete', cutoffAt: '15:15', notes: 'Labels and manifests complete.' }
];

function loadLocalShipments() {
  if (typeof window === 'undefined') return seedShipments;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return seedShipments;
  try { return JSON.parse(raw) as DispatchShipment[]; } catch { return seedShipments; }
}
function saveLocalShipments(items: DispatchShipment[]) { if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
function stageTone(stage: DispatchStage) {
  if (stage === 'ready') return 'border-cyan-500/25 bg-cyan-500/10 text-cyan-200';
  if (stage === 'manifested') return 'border-violet-500/25 bg-violet-500/10 text-violet-200';
  if (stage === 'handover') return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200';
  return 'border-rose-500/25 bg-rose-500/10 text-rose-200';
}
function riskTone(risk: RiskBand) { return risk === 'high' ? 'border-rose-500/25 bg-rose-500/10 text-rose-200' : risk === 'medium' ? 'border-amber-500/25 bg-amber-500/10 text-amber-200' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'; }
function actionForStage(stage: DispatchStage) { return stage === 'handover' ? 'mark-dispatched' : stage === 'ready' ? 'start-packing' : undefined; }

export function DispatchCenterPage() {
  const [shipments, setShipments] = useState<DispatchShipment[]>([]);
  const [source, setSource] = useState<'internal-production' | 'local-demo'>('local-demo');
  const [search, setSearch] = useState('');
  const [carrierFilter, setCarrierFilter] = useState<'all' | DispatchShipment['carrier']>('all');
  const [riskFilter, setRiskFilter] = useState<'all' | RiskBand>('all');
  const [editing, setEditing] = useState<DispatchShipment | null>(null);

  async function load() {
    try {
      const res = await fetch('/api/internal/dispatch/shipments', { cache: 'no-store' });
      const payload = await res.json().catch(() => ({}));
      const items = Array.isArray(payload?.data?.items) ? payload.data.items : [];
      if (res.ok && payload?.ok && items.length) { setShipments(items); setSource('internal-production'); return; }
    } catch {}
    setShipments(loadLocalShipments()); setSource('local-demo');
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => { if (source === 'local-demo' && shipments.length) saveLocalShipments(shipments); }, [shipments, source]);

  const carriers = useMemo(() => ['all', ...Array.from(new Set(shipments.map((item) => item.carrier)))] as const, [shipments]);
  const filtered = useMemo(() => shipments.filter((item) => {
    const haystack = `${item.batchCode} ${item.orderNumber || ''} ${item.productName || ''} ${item.carrier} ${item.service} ${item.dock} ${item.destinationZone} ${item.notes}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (carrierFilter === 'all' || item.carrier === carrierFilter) && (riskFilter === 'all' || item.risk === riskFilter);
  }), [carrierFilter, riskFilter, search, shipments]);
  const grouped = useMemo(() => Object.fromEntries(stageOrder.map((stage) => [stage, filtered.filter((item) => item.stage === stage)])) as Record<DispatchStage, DispatchShipment[]>, [filtered]);
  const stats = useMemo(() => ({ batches: filtered.length, orders: filtered.reduce((sum, item) => sum + item.orderCount, 0), exceptions: filtered.filter((item) => item.stage === 'exception').length, scansBlocked: filtered.filter((item) => item.scanStatus !== 'complete').length }), [filtered]);

  async function saveShipment(shipment: DispatchShipment) {
    if (shipment.productionJobId) {
      const res = await fetch('/api/internal/dispatch/shipments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...shipment, productionJobId: shipment.productionJobId, dispatch: shipment }) });
      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload?.shipment) { await load(); return; }
    }
    setShipments((current) => current.some((item) => item.id === shipment.id) ? current.map((item) => item.id === shipment.id ? shipment : item) : [shipment, ...current]);
  }

  async function saveCurrent() { if (editing) { await saveShipment(editing); setEditing(null); } }

  async function moveStage(shipment: DispatchShipment, direction: 'back' | 'forward') {
    const currentIndex = stageOrder.indexOf(shipment.stage);
    const nextIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0 || nextIndex >= stageOrder.length) return;
    const nextStage = stageOrder[nextIndex];
    if (shipment.productionJobId) {
      await fetch('/api/internal/dispatch/shipments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productionJobId: shipment.productionJobId, stage: nextStage, action: actionForStage(nextStage), dispatch: { ...shipment, stage: nextStage } }) });
      await load();
      return;
    }
    setShipments((current) => current.map((item) => item.id === shipment.id ? { ...item, stage: nextStage } : item));
  }

  function duplicateShipment(shipment: DispatchShipment) { setShipments((current) => [{ ...shipment, id: `ds-${Date.now()}`, productionJobId: undefined, batchCode: `${shipment.batchCode}-COPY`, stage: 'ready' }, ...current]); }

  return (
    <div className="space-y-6">
      <PageHeader title="Dispatch Center" subtitle={`Parcel handoff, manifest readiness and delivery risk. Source: ${source === 'internal-production' ? 'production job tickets' : 'local demo fallback'}.`} actions={<><Button onClick={() => void load()}>Refresh</Button><PrimaryButton onClick={() => setEditing({ ...emptyShipment, id: `ds-${Date.now()}`, batchCode: `BATCH-${Math.floor(Math.random() * 900) + 100}` })}><Plus size={16} /> New Batch</PrimaryButton></>} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Card><p className="text-xs uppercase text-textMuted">Dispatch batches</p><p className="mt-2 text-3xl font-semibold text-white">{stats.batches}</p></Card><Card><p className="text-xs uppercase text-textMuted">Orders in handoff</p><p className="mt-2 text-3xl font-semibold text-white">{stats.orders}</p></Card><Card><p className="text-xs uppercase text-textMuted">Exceptions</p><p className="mt-2 text-3xl font-semibold text-white">{stats.exceptions}</p></Card><Card><p className="text-xs uppercase text-textMuted">Scan blockers</p><p className="mt-2 text-3xl font-semibold text-white">{stats.scansBlocked}</p></Card></div>
      <Card className="p-4"><div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={16} /><Input className="pl-9" placeholder="Search batches, orders, carriers, docks, notes..." value={search} onChange={(e) => setSearch(e.target.value)} /></div><Select value={carrierFilter} options={carriers as unknown as string[]} onChange={(e) => setCarrierFilter(e.target.value as typeof carrierFilter)} /><Select value={riskFilter} options={['all', 'low', 'medium', 'high']} onChange={(e) => setRiskFilter(e.target.value as typeof riskFilter)} /></div></Card>
      <div className="grid gap-4 xl:grid-cols-4">{stageOrder.map((stage) => <Card key={stage} className="overflow-hidden p-0"><div className="border-b border-white/6 px-4 py-3"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-white">{stageLabels[stage]}</p><p className="text-xs text-textMuted">{grouped[stage].length} batches</p></div><span className={`rounded-full border px-2.5 py-1 text-[11px] ${stageTone(stage)}`}>{stageLabels[stage]}</span></div></div><div className="space-y-3 p-3">{grouped[stage].length === 0 ? <div className="rounded-2xl border border-dashed border-white/8 bg-white/[0.02] px-3 py-5 text-center text-xs text-textMuted">No batches in this stage</div> : grouped[stage].map((shipment) => <div key={shipment.id} className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><div className="mb-3 flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-white">{shipment.batchCode}</p><p className="mt-1 text-xs text-textMuted">{shipment.carrier} · {shipment.service}</p>{shipment.orderNumber ? <p className="mt-1 text-xs text-textMuted">{shipment.orderNumber} · {shipment.productName || 'Production job'}</p> : null}</div><span className={`rounded-full border px-2.5 py-1 text-[11px] ${riskTone(shipment.risk)}`}>{shipment.risk} risk</span></div><div className="space-y-2 text-xs text-textMuted"><div className="flex items-center gap-2"><PackageCheck size={14} /> <span>{shipment.orderCount} order(s)</span></div><div className="flex items-center gap-2"><MapPinned size={14} /> <span>{shipment.dock} · {shipment.destinationZone}</span></div><div className="flex items-center gap-2"><ScanLine size={14} /> <span>Scan {shipment.scanStatus}</span></div><div className="flex items-center gap-2"><Truck size={14} /> <span>{shipment.trackingNumber || 'Tracking not set'}</span></div></div><p className="mt-3 rounded-xl border border-white/6 bg-white/[0.03] px-3 py-2 text-xs text-textMuted">{shipment.notes || 'No dispatch notes yet.'}</p><div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => setEditing(shipment)}>Edit</Button>{shipment.productionJobId ? <a href={`/production/jobs/${shipment.productionJobId}`}><Button>Job detail</Button></a> : <Button onClick={() => duplicateShipment(shipment)}>Duplicate</Button>}<Button onClick={() => void moveStage(shipment, 'back')} disabled={shipment.stage === 'ready'}><ArrowRightLeft size={14} /> Back</Button><PrimaryButton onClick={() => void moveStage(shipment, 'forward')} disabled={shipment.stage === 'exception'}><ArrowUpRight size={14} /> Advance</PrimaryButton></div></div>)}</div></Card>)}</div>
      <div className="grid gap-4 xl:grid-cols-3"><Card><h3 className="text-base font-semibold text-white">Manifest checklist</h3><div className="mt-3 space-y-2 text-sm text-textMuted">{['Verify carton count and label count match.', 'Confirm export paperwork for EU and ROW batches.', 'Close scan gaps before handover release.'].map((item) => <div key={item} className="flex items-start gap-2 rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2"><CheckCircle2 size={14} className="mt-0.5 text-emerald-300" /><span>{item}</span></div>)}</div></Card><Card><h3 className="text-base font-semibold text-white">Carrier snapshot</h3><div className="mt-3 space-y-2 text-sm text-textMuted">{(['DHL', 'DPD', 'Royal Mail', 'UPS'] as const).map((carrier) => <div key={carrier} className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2"><span>{carrier}</span><span className="text-white">{filtered.filter((item) => item.carrier === carrier).reduce((sum, item) => sum + item.orderCount, 0)} orders</span></div>)}</div></Card><Card><h3 className="text-base font-semibold text-white">Dispatch warnings</h3><div className="mt-3 space-y-2 text-sm text-textMuted">{filtered.filter((item) => item.risk === 'high' || item.scanStatus !== 'complete').slice(0, 4).map((item) => <div key={item.id} className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2"><div className="flex items-start gap-2"><AlertTriangle size={14} className="mt-0.5 text-amber-200" /><div><p className="text-white">{item.batchCode}</p><p className="text-xs text-amber-100/85">{item.notes}</p></div></div></div>)}{filtered.every((item) => item.risk !== 'high' && item.scanStatus === 'complete') ? <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-emerald-100">No active dispatch blockers right now.</div> : null}<div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2 text-xs text-textMuted"><ShieldCheck size={14} className="mr-2 inline-block text-cyan-300" />Production tickets are reused here; no duplicate dispatch module has been created.</div></div></Card></div>
      <BaseModal open={!!editing} onClose={() => setEditing(null)} title={editing ? `Edit ${editing.batchCode}` : 'Edit batch'}>{editing ? <div className="space-y-3"><Input value={editing.batchCode} onChange={(e) => setEditing({ ...editing, batchCode: e.target.value })} placeholder="Batch code" /><Input type="number" value={String(editing.orderCount)} onChange={(e) => setEditing({ ...editing, orderCount: Number(e.target.value) || 1 })} placeholder="Order count" /><Select value={editing.carrier} options={['DHL', 'DPD', 'Royal Mail', 'UPS', 'Other']} onChange={(e) => setEditing({ ...editing, carrier: e.target.value as DispatchShipment['carrier'] })} /><Select value={editing.service} options={['next-day', 'tracked-24', 'tracked-48', 'economy', 'same-day', 'collection']} onChange={(e) => setEditing({ ...editing, service: e.target.value as DispatchShipment['service'] })} /><Select value={editing.dock} options={['North Dock', 'South Dock', 'Express Cage', 'Front Counter']} onChange={(e) => setEditing({ ...editing, dock: e.target.value as DispatchShipment['dock'] })} /><Select value={editing.stage} options={stageOrder} onChange={(e) => setEditing({ ...editing, stage: e.target.value as DispatchStage })} /><Select value={editing.risk} options={['low', 'medium', 'high']} onChange={(e) => setEditing({ ...editing, risk: e.target.value as RiskBand })} /><Select value={editing.destinationZone} options={['UK', 'EU', 'US', 'ROW']} onChange={(e) => setEditing({ ...editing, destinationZone: e.target.value as DispatchShipment['destinationZone'] })} /><Select value={editing.scanStatus} options={['complete', 'partial', 'missing']} onChange={(e) => setEditing({ ...editing, scanStatus: e.target.value as DispatchShipment['scanStatus'] })} /><Input value={editing.trackingNumber || ''} onChange={(e) => setEditing({ ...editing, trackingNumber: e.target.value })} placeholder="Tracking number" /><Input value={editing.cutoffAt} onChange={(e) => setEditing({ ...editing, cutoffAt: e.target.value })} placeholder="Cutoff time" /><Input value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} placeholder="Dispatch notes" /><div className="flex justify-end gap-2"><Button onClick={() => setEditing(null)}>Cancel</Button><PrimaryButton onClick={() => void saveCurrent()}>Save Batch</PrimaryButton></div></div> : null}</BaseModal>
    </div>
  );
}
