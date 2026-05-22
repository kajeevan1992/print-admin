'use client';

import { useEffect, useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { BaseModal } from '@/components/modals/base-modal';
import { PageHeader } from '@/components/ui/page-header';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Card } from '@/components/ui/card';
import { operationsService } from '@/services/operations.service';
import type { ProductionJob } from '@/data/operations';

type JobTicket = {
  id: string;
  orderId?: string;
  orderNumber: string;
  customerName?: string;
  productId?: string;
  productName: string;
  quantity: number;
  dueDate: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'queued' | 'artwork-check' | 'proofing' | 'ready-to-print' | 'printing' | 'finishing' | 'packing' | 'dispatched' | 'blocked';
  artworkStatus: string;
  machine: string;
  material: string;
  route: string[];
  finishing: string[];
  supplier: string;
  notes?: string;
  warnings: string[];
};

type QueueCard = {
  id: string;
  orderId?: string;
  orderNumber: string;
  product: string;
  quantity: number;
  dueDate: string;
  stage: string;
  priority: string;
  artworkStatus: string;
  machine: string;
  material: string;
  route: string[];
  warnings: string[];
  source: 'ticket' | 'production';
};

type ScheduledCard = QueueCard & {
  lane: string;
  estimatedMinutes: number;
  scheduledShift: string;
  startMinute: number;
  finishMinute: number;
  finishLabel: string;
  operator: string;
  breachRisk: 'low' | 'medium' | 'high';
  scheduleReason: string;
};

const emptyJob: ProductionJob = { id: '', orderNumber: '', product: '', plant: 'Nevada DC', stage: 'queued', slaRisk: 'low', dueDate: '' };
const fallbackMachines = ['Unassigned', 'Ricoh Pro C5400S', 'Large Format Printer', 'Guillotine', 'Laminator', 'Booklet Maker', 'Supplier / Outsource'];
const shifts = [
  { id: 'morning', label: 'Morning', start: 8 * 60, end: 14 * 60, capacity: 360, operator: 'Operator A' },
  { id: 'evening', label: 'Evening', start: 14 * 60, end: 20 * 60, capacity: 360, operator: 'Operator B' },
  { id: 'overflow', label: 'Overflow', start: 20 * 60, end: 23 * 60, capacity: 180, operator: 'Overflow / Owner' },
];

function daysUntil(date: string) {
  if (!date) return 999;
  const due = new Date(`${date}T23:59:59`).getTime();
  return Math.ceil((due - Date.now()) / 86400000);
}
function priorityWeight(card: QueueCard) {
  const dueWeight = Math.max(0, 8 - daysUntil(card.dueDate));
  const priority = card.priority === 'urgent' ? 10 : card.priority === 'high' ? 7 : card.priority === 'normal' ? 3 : 1;
  const blockedPenalty = queueStage(card) === 'blocked' ? -20 : 0;
  const readyBonus = ['approved', 'preflight-pass'].includes(card.artworkStatus) ? 4 : 0;
  return dueWeight + priority + readyBonus + blockedPenalty;
}
function slaRisk(card: QueueCard) {
  if (card.warnings.length || card.stage === 'blocked' || card.artworkStatus === 'preflight-fail') return 'high';
  if (daysUntil(card.dueDate) <= 1 || card.priority === 'urgent') return 'high';
  if (daysUntil(card.dueDate) <= 2 || card.priority === 'high') return 'medium';
  return 'low';
}
function queueStage(card: QueueCard) {
  if (card.stage === 'dispatched') return 'dispatched';
  if (card.stage === 'blocked' || card.artworkStatus === 'preflight-fail') return 'blocked';
  if (['not-uploaded', 'uploaded', 'preflight-warning'].includes(card.artworkStatus)) return 'artwork';
  if (card.stage === 'finishing') return 'finishing';
  if (card.stage === 'packing') return 'packing';
  if (card.stage === 'printing' || card.stage === 'ready-to-print') return 'print';
  return 'queued';
}
function cardMachine(card: QueueCard) {
  if (card.source === 'ticket') return card.machine || (card.supplier === 'supplier-api' ? 'Supplier / Outsource' : 'Unassigned');
  return card.machine || 'Unassigned';
}
function estimateMinutes(card: QueueCard) {
  const base = card.source === 'ticket' ? 18 : 12;
  const qty = Math.max(1, Number(card.quantity || 100));
  const finishExtra = card.route?.includes('finishing') ? 18 : 0;
  const artworkExtra = queueStage(card) === 'artwork' ? 10 : 0;
  const supplierExtra = cardMachine(card) === 'Supplier / Outsource' ? 8 : 0;
  return Math.round(base + qty / 75 + finishExtra + artworkExtra + supplierExtra);
}
function batchKey(card: QueueCard) {
  return [cardMachine(card), card.material || 'material-not-set', card.product?.toLowerCase?.() || 'product'].join('|');
}
function formatMinute(minute: number) {
  const hour = Math.floor(minute / 60) % 24;
  const min = minute % 60;
  return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}
function readTicketCards(tickets: JobTicket[]): QueueCard[] {
  return tickets.map((ticket) => ({
    id: ticket.id,
    orderId: ticket.orderId,
    orderNumber: ticket.orderNumber,
    product: ticket.productName,
    quantity: Number(ticket.quantity || 1),
    dueDate: ticket.dueDate,
    stage: ticket.status,
    priority: ticket.priority || 'normal',
    artworkStatus: ticket.artworkStatus || 'not-uploaded',
    machine: ticket.machine || '',
    material: ticket.material || '',
    route: ticket.route || [],
    warnings: ticket.warnings || [],
    source: 'ticket',
  }));
}
function readProductionCards(jobs: ProductionJob[]): QueueCard[] {
  return jobs.map((job) => ({
    id: job.id,
    orderNumber: job.orderNumber,
    product: job.product,
    quantity: 100,
    dueDate: job.dueDate,
    stage: job.stage,
    priority: job.slaRisk === 'high' ? 'urgent' : job.slaRisk === 'medium' ? 'high' : 'normal',
    artworkStatus: job.stage === 'proofing' ? 'uploaded' : 'approved',
    machine: job.plant || 'Unassigned',
    material: '',
    route: ['print', 'finish', 'dispatch'],
    warnings: job.slaRisk === 'high' ? ['High SLA risk from production record.'] : [],
    source: 'production',
  }));
}
async function readTickets(): Promise<JobTicket[]> {
  try {
    const res = await fetch('/api/internal/config/production-job-tickets/items', { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.ok === false) return [];
    return Array.isArray(json.data?.items) ? json.data.items : [];
  } catch {
    return [];
  }
}
function statusClass(risk: string) {
  if (risk === 'high') return 'border-rose-400/25 bg-rose-400/10 text-rose-100';
  if (risk === 'medium') return 'border-amber-400/25 bg-amber-400/10 text-amber-100';
  return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100';
}
function scheduleCards(cards: QueueCard[]): ScheduledCard[] {
  const sorted = [...cards].sort((a, b) => priorityWeight(b) - priorityWeight(a) || daysUntil(a.dueDate) - daysUntil(b.dueDate));
  const laneShiftCursor = new Map<string, Record<string, number>>();
  return sorted.map((card) => {
    const lane = cardMachine(card);
    const minutes = estimateMinutes(card);
    if (!laneShiftCursor.has(lane)) laneShiftCursor.set(lane, Object.fromEntries(shifts.map((shift) => [shift.id, shift.start])) as Record<string, number>);
    const cursor = laneShiftCursor.get(lane)!;
    let selected = shifts[0];
    for (const shift of shifts) {
      if ((cursor[shift.id] || shift.start) + minutes <= shift.end) { selected = shift; break; }
      selected = shift;
    }
    const start = cursor[selected.id] || selected.start;
    const finish = start + minutes;
    cursor[selected.id] = finish;
    const breachRisk = queueStage(card) === 'blocked' || finish > selected.end || slaRisk(card) === 'high' ? 'high' : slaRisk(card) === 'medium' ? 'medium' : 'low';
    return { ...card, lane, estimatedMinutes: minutes, scheduledShift: selected.label, startMinute: start, finishMinute: finish, finishLabel: finish > selected.end ? `${formatMinute(finish)} overflow` : formatMinute(finish), operator: selected.operator, breachRisk, scheduleReason: queueStage(card) === 'blocked' ? 'Blocked until artwork/preflight issue is fixed.' : 'Prioritised by due date, priority and artwork readiness.' };
  });
}

export function ProductionPage() {
  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [tickets, setTickets] = useState<JobTicket[]>([]);
  const [stage, setStage] = useState('all');
  const [machine, setMachine] = useState('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<ProductionJob | null>(null);

  const load = async () => {
    const [legacyJobs, ticketRows] = await Promise.all([operationsService.getProductionJobs(), readTickets()]);
    setJobs(legacyJobs);
    setTickets(ticketRows);
  };
  useEffect(() => { void load(); }, []);

  const cards = useMemo(() => [...readTicketCards(tickets), ...readProductionCards(jobs)], [tickets, jobs]);
  const machines = useMemo(() => Array.from(new Set([...fallbackMachines, ...cards.map(cardMachine).filter(Boolean)])), [cards]);
  const filteredCards = useMemo(() => cards.filter((card) => {
    const text = `${card.orderNumber} ${card.product} ${card.material} ${card.machine}`.toLowerCase();
    return (!search || text.includes(search.toLowerCase())) && (stage === 'all' || queueStage(card) === stage || card.stage === stage) && (machine === 'all' || cardMachine(card) === machine);
  }), [cards, search, stage, machine]);
  const scheduled = useMemo(() => scheduleCards(filteredCards), [filteredCards]);
  const laneMap = useMemo(() => machines.reduce((acc, lane) => ({ ...acc, [lane]: scheduled.filter((card) => card.lane === lane) }), {} as Record<string, ScheduledCard[]>), [machines, scheduled]);
  const batches = useMemo(() => Object.entries(filteredCards.reduce((acc, card) => { const key = batchKey(card); acc[key] = [...(acc[key] || []), card]; return acc; }, {} as Record<string, QueueCard[]>)).filter(([, group]) => group.length > 1), [filteredCards]);
  const rows = useMemo(() => jobs.filter((job) => (!search || `${job.orderNumber} ${job.product} ${job.plant}`.toLowerCase().includes(search.toLowerCase())) && (stage === 'all' || job.stage === stage)), [jobs, search, stage]);
  const breached = scheduled.filter((card) => card.breachRisk === 'high').length;
  const assigned = scheduled.filter((card) => card.operator).length;

  return (
    <div className="space-y-4">
      <PageHeader title="Smart Production Scheduler" subtitle="Machine queues, shift assignment, ETA prediction, SLA breach detection and batch hints using the existing production tickets pipeline." actions={<div className="flex gap-2"><Button onClick={() => void load()}>Refresh</Button><PrimaryButton onClick={() => setEditing({ ...emptyJob, id: `pj-${Date.now()}`, dueDate: new Date().toISOString().slice(0, 10) })}>Add Job</PrimaryButton></div>} />
      <div className="grid gap-4 md:grid-cols-6"><Card><p className="text-xs text-textMuted">Queue cards</p><p className="mt-2 text-2xl font-semibold">{cards.length}</p></Card><Card><p className="text-xs text-textMuted">Job tickets</p><p className="mt-2 text-2xl font-semibold">{tickets.length}</p></Card><Card><p className="text-xs text-textMuted">Scheduled</p><p className="mt-2 text-2xl font-semibold">{scheduled.length}</p></Card><Card><p className="text-xs text-textMuted">Assigned</p><p className="mt-2 text-2xl font-semibold">{assigned}</p></Card><Card><p className="text-xs text-textMuted">SLA breach risk</p><p className="mt-2 text-2xl font-semibold">{breached}</p></Card><Card><p className="text-xs text-textMuted">Batch hints</p><p className="mt-2 text-2xl font-semibold">{batches.length}</p></Card></div>
      <div className="grid gap-2 md:grid-cols-[1fr_180px_240px]"><Input placeholder="Search production queue..." value={search} onChange={(e) => setSearch(e.target.value)} /><Select options={['all', 'queued', 'artwork', 'print', 'finishing', 'packing', 'blocked', 'dispatched']} value={stage} onChange={(e) => setStage(e.target.value)} /><Select options={[{ value: 'all', label: 'All machines' }, ...machines.map((item) => ({ value: item, label: item }))]} value={machine} onChange={(e) => setMachine(e.target.value)} /></div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {machines.map((lane) => {
            const laneCards = laneMap[lane] || [];
            const minutes = laneCards.reduce((sum, card) => sum + card.estimatedMinutes, 0);
            const risk = laneCards.some((card) => card.breachRisk === 'high') ? 'high' : laneCards.some((card) => card.breachRisk === 'medium') ? 'medium' : 'low';
            return <Card key={lane} className="min-h-[220px]">
              <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-white">{lane}</h3><p className="mt-1 text-xs text-textMuted">{laneCards.length} jobs · est. {minutes} min</p></div><span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${statusClass(risk)}`}>{risk}</span></div>
              <div className="mt-4 space-y-3">
                {laneCards.map((card) => <div key={`${card.source}-${card.id}`} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                  <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-white">{card.orderNumber}</p><p className="mt-1 text-xs text-textMuted">{card.product}</p></div><span className={`rounded-full border px-2 py-1 text-[10px] ${statusClass(card.breachRisk)}`}>{card.breachRisk}</span></div>
                  <div className="mt-3 grid gap-1 text-xs text-textMuted"><p>Stage: {queueStage(card)} / {card.stage}</p><p>Qty: {card.quantity} · Due: {card.dueDate || 'not set'}</p><p>Shift: {card.scheduledShift} · ETA {card.finishLabel}</p><p>Operator: {card.operator}</p><p>Artwork: {card.artworkStatus}</p>{card.material ? <p>Material: {card.material}</p> : null}</div>
                  <div className="mt-3 rounded-xl border border-white/8 bg-black/20 p-2 text-[11px] text-textMuted">{card.scheduleReason}</div>
                  {card.warnings.length ? <div className="mt-2 rounded-xl border border-amber-400/20 bg-amber-400/10 p-2 text-[11px] text-amber-100">{card.warnings[0]}</div> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {card.source === 'ticket' ? <a href={`/production/jobs/${card.id}`}><PrimaryButton><ExternalLink size={14} /> Job detail</PrimaryButton></a> : <Button onClick={() => setEditing(jobs.find((job) => job.id === card.id) || null)}>Edit legacy job</Button>}
                    {card.orderId ? <a href={`/orders/${card.orderId}`}><Button>Order</Button></a> : null}
                    {card.source === 'ticket' ? <a href="/dispatch-center"><Button>Dispatch</Button></a> : null}
                  </div>
                </div>)}
                {!laneCards.length ? <p className="rounded-2xl border border-dashed border-white/10 p-4 text-xs text-textMuted">No jobs in this lane.</p> : null}
              </div>
            </Card>;
          })}
        </div>
        <div className="space-y-4">
          <Card><h3 className="font-semibold text-white">Shift assignment</h3><div className="mt-4 space-y-2">{shifts.map((shift) => { const shiftCards = scheduled.filter((card) => card.scheduledShift === shift.label); const used = shiftCards.reduce((sum, card) => sum + card.estimatedMinutes, 0); return <div key={shift.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3"><div className="flex justify-between gap-3 text-sm"><span className="font-semibold text-white">{shift.label}</span><span className="text-textMuted">{formatMinute(shift.start)}–{formatMinute(shift.end)}</span></div><p className="mt-1 text-xs text-textMuted">{shift.operator} · {used}/{shift.capacity} min · {shiftCards.length} jobs</p><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-white" style={{ width: `${Math.min(100, Math.round((used / shift.capacity) * 100))}%` }} /></div></div>; })}</div></Card>
          <Card><h3 className="font-semibold text-white">SLA breach predictions</h3><div className="mt-4 space-y-2">{scheduled.filter((card) => card.breachRisk === 'high').slice(0, 6).map((card) => <div key={`${card.source}-${card.id}`} className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-3"><p className="text-sm font-semibold text-white">{card.orderNumber}</p><p className="mt-1 text-xs text-rose-100">Due {card.dueDate || 'not set'} · ETA {card.finishLabel} · {card.scheduleReason}</p>{card.source === 'ticket' ? <a href={`/production/jobs/${card.id}`} className="mt-2 inline-block text-xs text-white underline">Open job detail</a> : null}</div>)}{!scheduled.some((card) => card.breachRisk === 'high') ? <p className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-xs text-emerald-100">No high-risk schedule breaches detected.</p> : null}</div></Card>
          <Card><h3 className="font-semibold text-white">Batch printing hints</h3><p className="mt-1 text-xs text-textMuted">Groups jobs with same machine/material/product for possible gang run or shared setup.</p><div className="mt-4 space-y-2">{batches.map(([key, group]) => <div key={key} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3"><p className="text-sm font-semibold text-white">{group.length} jobs</p><p className="mt-1 text-xs text-textMuted">{key.replaceAll('|', ' · ')}</p><p className="mt-2 text-xs text-textMuted">Setup saving potential: {Math.max(0, group.length - 1)} shared setup(s)</p><div className="mt-2 flex flex-wrap gap-2">{group.filter((item) => item.source === 'ticket').slice(0, 3).map((item) => <a key={item.id} href={`/production/jobs/${item.id}`} className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white">{item.orderNumber}</a>)}</div></div>)}{!batches.length ? <p className="rounded-2xl border border-dashed border-white/10 p-4 text-xs text-textMuted">No batch opportunities in current filter.</p> : null}</div></Card>
        </div>
      </div>

      <Card>
        <h3 className="mb-3 font-semibold text-white">Legacy production jobs table</h3>
        <DataTable columns={[{ key: 'order', header: 'Order', render: (row) => row.orderNumber }, { key: 'product', header: 'Product', render: (row) => row.product }, { key: 'plant', header: 'Plant', render: (row) => row.plant }, { key: 'stage', header: 'Stage', render: (row) => row.stage }, { key: 'risk', header: 'SLA Risk', render: (row) => row.slaRisk }, { key: 'dueDate', header: 'Due Date', render: (row) => row.dueDate }, { key: 'actions', header: 'Actions', render: (row) => <div className="flex gap-2"><Button onClick={() => setEditing(row)}>Edit</Button><Button onClick={async () => { await operationsService.deleteProductionJob(row.id); await load(); }}>Delete</Button></div> }]} rows={rows} rowKey={(row) => row.id} />
      </Card>

      <BaseModal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Production Job' : 'Add Production Job'}>
        {editing ? <div className="space-y-3"><Input placeholder="Order Number" value={editing.orderNumber} onChange={(e) => setEditing({ ...editing, orderNumber: e.target.value })} /><Input placeholder="Product" value={editing.product} onChange={(e) => setEditing({ ...editing, product: e.target.value })} /><Select options={['Nevada DC', 'Texas Plant', 'New Jersey Hub', 'Ricoh Pro C5400S', 'Large Format Printer', 'Supplier / Outsource']} value={editing.plant} onChange={(e) => setEditing({ ...editing, plant: e.target.value })} /><Select options={['queued', 'proofing', 'printing', 'finishing', 'shipped']} value={editing.stage} onChange={(e) => setEditing({ ...editing, stage: e.target.value as ProductionJob['stage'] })} /><Select options={['low', 'medium', 'high']} value={editing.slaRisk} onChange={(e) => setEditing({ ...editing, slaRisk: e.target.value as ProductionJob['slaRisk'] })} /><Input type="date" value={editing.dueDate} onChange={(e) => setEditing({ ...editing, dueDate: e.target.value })} /><div className="flex justify-end gap-2"><Button onClick={() => setEditing(null)}>Cancel</Button><PrimaryButton onClick={async () => { await operationsService.saveProductionJob(editing); setEditing(null); await load(); }}>Save Job</PrimaryButton></div></div> : null}
      </BaseModal>
    </div>
  );
}
