'use client';

import { useEffect, useMemo, useState } from 'react';
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

const emptyJob: ProductionJob = { id: '', orderNumber: '', product: '', plant: 'Nevada DC', stage: 'queued', slaRisk: 'low', dueDate: '' };
const fallbackMachines = ['Unassigned', 'Ricoh Pro C5400S', 'Large Format Printer', 'Guillotine', 'Laminator', 'Booklet Maker', 'Supplier / Outsource'];

function daysUntil(date: string) {
  if (!date) return 999;
  const due = new Date(`${date}T23:59:59`).getTime();
  return Math.ceil((due - Date.now()) / 86400000);
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
  if (card.source === 'ticket') return card.supplier === 'supplier-api' ? 'Supplier / Outsource' : card.machine || 'Unassigned';
  return card.machine || 'Unassigned';
}
function estimateMinutes(card: QueueCard) {
  const base = card.source === 'ticket' ? 18 : 12;
  const qty = Math.max(1, Number(card.quantity || 100));
  const finishExtra = card.route?.includes('finishing') ? 18 : 0;
  const artworkExtra = queueStage(card) === 'artwork' ? 10 : 0;
  return Math.round(base + qty / 75 + finishExtra + artworkExtra);
}
function batchKey(card: QueueCard) {
  return [cardMachine(card), card.material || 'material-not-set', card.product?.toLowerCase?.() || 'product'].join('|');
}
function readTicketCards(tickets: JobTicket[]): QueueCard[] {
  return tickets.map((ticket) => ({
    id: ticket.id,
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
  useEffect(() => { load(); }, []);

  const cards = useMemo(() => [...readTicketCards(tickets), ...readProductionCards(jobs)], [tickets, jobs]);
  const machines = useMemo(() => Array.from(new Set([...fallbackMachines, ...cards.map(cardMachine).filter(Boolean)])), [cards]);
  const filteredCards = useMemo(() => cards.filter((card) => {
    const text = `${card.orderNumber} ${card.product} ${card.material} ${card.machine}`.toLowerCase();
    const matchesSearch = !search || text.includes(search.toLowerCase());
    const matchesStage = stage === 'all' || queueStage(card) === stage || card.stage === stage;
    const matchesMachine = machine === 'all' || cardMachine(card) === machine;
    return matchesSearch && matchesStage && matchesMachine;
  }), [cards, search, stage, machine]);
  const laneMap = useMemo(() => machines.reduce((acc, lane) => ({ ...acc, [lane]: filteredCards.filter((card) => cardMachine(card) === lane) }), {} as Record<string, QueueCard[]>), [machines, filteredCards]);
  const batches = useMemo(() => Object.entries(filteredCards.reduce((acc, card) => { const key = batchKey(card); acc[key] = [...(acc[key] || []), card]; return acc; }, {} as Record<string, QueueCard[]>)).filter(([, group]) => group.length > 1), [filteredCards]);
  const rows = useMemo(() => jobs.filter((job) => {
    const matchesSearch = !search || `${job.orderNumber} ${job.product} ${job.plant}`.toLowerCase().includes(search.toLowerCase());
    const matchesStage = stage === 'all' || job.stage === stage;
    return matchesSearch && matchesStage;
  }), [jobs, search, stage]);

  return (
    <div className="space-y-4">
      <PageHeader title="Production Planner" subtitle="Machine queues, capacity signals, SLA risk and batch hints reusing production jobs plus v367 job tickets." actions={<div className="flex gap-2"><Button onClick={load}>Refresh</Button><PrimaryButton onClick={() => setEditing({ ...emptyJob, id: `pj-${Date.now()}`, dueDate: new Date().toISOString().slice(0, 10) })}>Add Job</PrimaryButton></div>} />
      <div className="grid gap-4 md:grid-cols-5">
        <Card><p className="text-xs text-textMuted">Queue cards</p><p className="mt-2 text-2xl font-semibold">{cards.length}</p></Card>
        <Card><p className="text-xs text-textMuted">Job tickets</p><p className="mt-2 text-2xl font-semibold">{tickets.length}</p></Card>
        <Card><p className="text-xs text-textMuted">In production</p><p className="mt-2 text-2xl font-semibold">{cards.filter((item) => ['printing', 'finishing', 'print'].includes(item.stage) || queueStage(item) === 'print').length}</p></Card>
        <Card><p className="text-xs text-textMuted">High SLA risk</p><p className="mt-2 text-2xl font-semibold">{cards.filter((item) => slaRisk(item) === 'high').length}</p></Card>
        <Card><p className="text-xs text-textMuted">Batch hints</p><p className="mt-2 text-2xl font-semibold">{batches.length}</p></Card>
      </div>
      <div className="grid gap-2 md:grid-cols-[1fr_180px_240px]">
        <Input placeholder="Search production queue..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select options={['all', 'queued', 'artwork', 'print', 'finishing', 'packing', 'blocked', 'dispatched']} value={stage} onChange={(e) => setStage(e.target.value)} />
        <Select options={[{ value: 'all', label: 'All machines' }, ...machines.map((item) => ({ value: item, label: item }))]} value={machine} onChange={(e) => setMachine(e.target.value)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {machines.map((lane) => {
            const laneCards = laneMap[lane] || [];
            const minutes = laneCards.reduce((sum, card) => sum + estimateMinutes(card), 0);
            const risk = laneCards.some((card) => slaRisk(card) === 'high') ? 'high' : laneCards.some((card) => slaRisk(card) === 'medium') ? 'medium' : 'low';
            return <Card key={lane} className="min-h-[220px]">
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="font-semibold text-white">{lane}</h3><p className="mt-1 text-xs text-textMuted">{laneCards.length} jobs · est. {minutes} min</p></div>
                <span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${statusClass(risk)}`}>{risk}</span>
              </div>
              <div className="mt-4 space-y-3">
                {laneCards.map((card) => <div key={`${card.source}-${card.id}`} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                  <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-white">{card.orderNumber}</p><p className="mt-1 text-xs text-textMuted">{card.product}</p></div><span className={`rounded-full border px-2 py-1 text-[10px] ${statusClass(slaRisk(card))}`}>{slaRisk(card)}</span></div>
                  <div className="mt-3 grid gap-1 text-xs text-textMuted"><p>Stage: {queueStage(card)} / {card.stage}</p><p>Qty: {card.quantity} · Due: {card.dueDate || 'not set'}</p><p>Artwork: {card.artworkStatus}</p>{card.material ? <p>Material: {card.material}</p> : null}</div>
                  {card.warnings.length ? <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/10 p-2 text-[11px] text-amber-100">{card.warnings[0]}</div> : null}
                </div>)}
                {!laneCards.length ? <p className="rounded-2xl border border-dashed border-white/10 p-4 text-xs text-textMuted">No jobs in this lane.</p> : null}
              </div>
            </Card>;
          })}
        </div>
        <div className="space-y-4">
          <Card><h3 className="font-semibold text-white">Batch printing hints</h3><p className="mt-1 text-xs text-textMuted">Groups jobs with same machine/material/product for possible gang run or shared setup.</p><div className="mt-4 space-y-2">{batches.map(([key, group]) => <div key={key} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3"><p className="text-sm font-semibold text-white">{group.length} jobs</p><p className="mt-1 text-xs text-textMuted">{key.replaceAll('|', ' · ')}</p><p className="mt-2 text-xs text-textMuted">Setup saving potential: {Math.max(0, group.length - 1)} shared setup(s)</p></div>)}{!batches.length ? <p className="rounded-2xl border border-dashed border-white/10 p-4 text-xs text-textMuted">No batch opportunities in current filter.</p> : null}</div></Card>
          <Card><h3 className="font-semibold text-white">Shift capacity</h3><div className="mt-4 space-y-2 text-xs text-textMuted"><div className="flex justify-between"><span>Morning shift</span><span>08:00–14:00</span></div><div className="flex justify-between"><span>Evening shift</span><span>14:00–20:00</span></div><div className="flex justify-between"><span>Night shift</span><span>Optional / future</span></div></div><p className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-xs text-textMuted">v368 estimates queue minutes per lane. Future builds can add exact drag-drop scheduling and shift assignment once job tickets are fully generated from orders.</p></Card>
        </div>
      </div>

      <Card>
        <h3 className="mb-3 font-semibold text-white">Legacy production jobs table</h3>
        <DataTable
          columns={[
            { key: 'order', header: 'Order', render: (row) => row.orderNumber },
            { key: 'product', header: 'Product', render: (row) => row.product },
            { key: 'plant', header: 'Plant', render: (row) => row.plant },
            { key: 'stage', header: 'Stage', render: (row) => row.stage },
            { key: 'risk', header: 'SLA Risk', render: (row) => row.slaRisk },
            { key: 'dueDate', header: 'Due Date', render: (row) => row.dueDate },
            { key: 'actions', header: 'Actions', render: (row) => <div className="flex gap-2"><Button onClick={() => setEditing(row)}>Edit</Button><Button onClick={async () => { await operationsService.deleteProductionJob(row.id); await load(); }}>Delete</Button></div> }
          ]}
          rows={rows}
          rowKey={(row) => row.id}
        />
      </Card>

      <BaseModal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Production Job' : 'Add Production Job'}>
        {editing ? (
          <div className="space-y-3">
            <Input placeholder="Order Number" value={editing.orderNumber} onChange={(e) => setEditing({ ...editing, orderNumber: e.target.value })} />
            <Input placeholder="Product" value={editing.product} onChange={(e) => setEditing({ ...editing, product: e.target.value })} />
            <Select options={['Nevada DC', 'Texas Plant', 'New Jersey Hub', 'Ricoh Pro C5400S', 'Large Format Printer', 'Supplier / Outsource']} value={editing.plant} onChange={(e) => setEditing({ ...editing, plant: e.target.value })} />
            <Select options={['queued', 'proofing', 'printing', 'finishing', 'shipped']} value={editing.stage} onChange={(e) => setEditing({ ...editing, stage: e.target.value as ProductionJob['stage'] })} />
            <Select options={['low', 'medium', 'high']} value={editing.slaRisk} onChange={(e) => setEditing({ ...editing, slaRisk: e.target.value as ProductionJob['slaRisk'] })} />
            <Input type="date" value={editing.dueDate} onChange={(e) => setEditing({ ...editing, dueDate: e.target.value })} />
            <div className="flex justify-end gap-2"><Button onClick={() => setEditing(null)}>Cancel</Button><PrimaryButton onClick={async () => { await operationsService.saveProductionJob(editing); setEditing(null); await load(); }}>Save Job</PrimaryButton></div>
          </div>
        ) : null}
      </BaseModal>
    </div>
  );
}
