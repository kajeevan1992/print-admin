'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Cog, Cpu, Search, ShieldAlert, Wrench } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { BaseModal } from '@/components/modals/base-modal';
import { printerManagementService } from '@/services/printer-management.service';
import type { PrinterFleetRecord, PrinterRisk, PrinterStatus, PrinterTechnology } from '@/data/printer-management';

const statusOptions: Array<'all' | PrinterStatus> = ['all', 'online', 'maintenance', 'offline', 'queued'];
const riskOptions: Array<'all' | PrinterRisk> = ['all', 'low', 'watch', 'critical'];
const technologyOptions: Array<'all' | PrinterTechnology> = ['all', 'Digital', 'Large Format', 'Finishing', 'Hybrid'];

const emptyPrinter: PrinterFleetRecord = {
  id: '',
  name: '',
  plant: '',
  status: 'online',
  risk: 'low',
  technology: 'Digital',
  queueJobs: 0,
  utilisation: 0,
  operator: '',
  lastService: '',
  makeModel: '',
  notes: ''
};

const riskTone: Record<PrinterRisk, string> = {
  low: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  watch: 'border-amber-400/30 bg-amber-400/10 text-amber-100',
  critical: 'border-rose-400/30 bg-rose-400/10 text-rose-200'
};

const statusTone: Record<PrinterStatus, string> = {
  online: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200',
  maintenance: 'border-violet-400/30 bg-violet-400/10 text-violet-200',
  offline: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
  queued: 'border-amber-400/30 bg-amber-400/10 text-amber-100'
};

export function PrinterManagementPage() {
  const [fleet, setFleet] = useState<PrinterFleetRecord[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | PrinterStatus>('all');
  const [risk, setRisk] = useState<'all' | PrinterRisk>('all');
  const [technology, setTechnology] = useState<'all' | PrinterTechnology>('all');
  const [editing, setEditing] = useState<PrinterFleetRecord | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    const items = await printerManagementService.getFleet();
    setFleet(items);
    setSelectedId((current) => current ?? items[0]?.id ?? null);
  };

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(
    () =>
      fleet.filter((printer) => {
        const haystack = `${printer.name} ${printer.plant} ${printer.operator} ${printer.makeModel} ${printer.technology}`.toLowerCase();
        const matchesSearch = !search || haystack.includes(search.toLowerCase());
        const matchesStatus = status === 'all' || printer.status === status;
        const matchesRisk = risk === 'all' || printer.risk === risk;
        const matchesTechnology = technology === 'all' || printer.technology === technology;
        return matchesSearch && matchesStatus && matchesRisk && matchesTechnology;
      }),
    [fleet, search, status, risk, technology]
  );

  const selected = rows.find((printer) => printer.id === selectedId) ?? rows[0] ?? null;

  const kpis = useMemo(
    () => ({
      online: rows.filter((item) => item.status === 'online').length,
      atRisk: rows.filter((item) => item.risk !== 'low').length,
      queue: rows.reduce((sum, item) => sum + item.queueJobs, 0),
      utilisation: rows.length ? Math.round(rows.reduce((sum, item) => sum + item.utilisation, 0) / rows.length) : 0
    }),
    [rows]
  );

  async function savePrinter(printer: PrinterFleetRecord) {
    await printerManagementService.savePrinter(printer);
    setEditing(null);
    await load();
    setSelectedId(printer.id);
  }

  const createPrinter = () => {
    setEditing({ ...emptyPrinter, id: `pr-${Date.now()}` });
  };

  const duplicatePrinter = async (printer: PrinterFleetRecord) => {
    const copy: PrinterFleetRecord = {
      ...printer,
      id: `pr-${Date.now()}`,
      name: `${printer.name} Copy`,
      status: 'queued'
    };
    await savePrinter(copy);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(fleet, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'printer-management-export.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const watchList = rows.filter((item) => item.risk !== 'low');

  return (
    <div className="space-y-5">
      <PageHeader
        title="Printer Management"
        subtitle="Manage plant readiness, press allocation, downtime, and SLA exposure before API and database wiring."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={load}>Refresh</Button>
            <Button onClick={exportJson}>Export JSON</Button>
            <Button onClick={async () => { await printerManagementService.resetFleet(); await load(); }}>Reset seed data</Button>
            <PrimaryButton onClick={createPrinter}>Add Printer</PrimaryButton>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card><p className="text-xs text-textMuted">Online presses</p><p className="mt-2 text-2xl font-semibold">{kpis.online}</p></Card>
        <Card><p className="text-xs text-textMuted">At-risk assets</p><p className="mt-2 text-2xl font-semibold">{kpis.atRisk}</p></Card>
        <Card><p className="text-xs text-textMuted">Queued jobs</p><p className="mt-2 text-2xl font-semibold">{kpis.queue}</p></Card>
        <Card><p className="text-xs text-textMuted">Average utilisation</p><p className="mt-2 text-2xl font-semibold">{kpis.utilisation}%</p></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.75fr_1fr]">
        <Card className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={16} />
              <Input className="pl-9" placeholder="Search plant, press, operator..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select options={statusOptions} value={status} onChange={(e) => setStatus(e.target.value as 'all' | PrinterStatus)} />
            <Select options={riskOptions} value={risk} onChange={(e) => setRisk(e.target.value as 'all' | PrinterRisk)} />
            <Select options={technologyOptions} value={technology} onChange={(e) => setTechnology(e.target.value as 'all' | PrinterTechnology)} />
          </div>

          <div className="grid gap-3">
            {rows.map((printer) => (
              <button
                key={printer.id}
                onClick={() => setSelectedId(printer.id)}
                className={`rounded-2xl border p-4 text-left transition ${selectedId === printer.id ? 'border-accent bg-accent/10' : 'border-white/6 bg-white/[0.02] hover:border-white/15'}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{printer.name}</p>
                    <p className="mt-1 text-xs text-textMuted">{printer.makeModel}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] ${statusTone[printer.status]}`}>{printer.status}</span>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] ${riskTone[printer.risk]}`}>{printer.risk}</span>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-xs text-textMuted md:grid-cols-4">
                  <div><span className="text-white">Plant:</span> {printer.plant}</div>
                  <div><span className="text-white">Tech:</span> {printer.technology}</div>
                  <div><span className="text-white">Queue:</span> {printer.queueJobs} jobs</div>
                  <div><span className="text-white">Utilisation:</span> {printer.utilisation}%</div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={(e) => { e.stopPropagation(); setEditing(printer); }}>Edit</Button>
                  <Button onClick={(e) => { e.stopPropagation(); duplicatePrinter(printer); }}>Duplicate</Button>
                  <Button onClick={async (e) => { e.stopPropagation(); await printerManagementService.deletePrinter(printer.id); await load(); }}>Delete</Button>
                  {printer.status !== 'maintenance' ? (
                    <Button onClick={async (e) => { e.stopPropagation(); await savePrinter({ ...printer, status: 'maintenance', risk: printer.risk === 'critical' ? 'critical' : 'watch' }); }}>
                      Send to maintenance
                    </Button>
                  ) : (
                    <PrimaryButton onClick={async (e) => { e.stopPropagation(); await savePrinter({ ...printer, status: 'online', risk: 'low' }); }}>
                      Return online
                    </PrimaryButton>
                  )}
                </div>
              </button>
            ))}

            {!rows.length ? <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-textMuted">No printers match the current filters.</div> : null}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Press spotlight</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{selected?.name ?? 'No printer selected'}</h3>
              <p className="mt-1 text-sm text-textMuted">{selected ? `${selected.plant} · ${selected.technology}` : 'Choose a press to review queue, service status, and operator ownership.'}</p>
            </div>

            {selected ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><p className="text-xs text-textMuted">Assigned operator</p><p className="mt-1 text-sm font-semibold text-white">{selected.operator}</p></div>
                  <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><p className="text-xs text-textMuted">Last service</p><p className="mt-1 text-sm font-semibold text-white">{selected.lastService}</p></div>
                  <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><p className="text-xs text-textMuted">Queued work</p><p className="mt-1 text-sm font-semibold text-white">{selected.queueJobs} jobs</p></div>
                  <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><p className="text-xs text-textMuted">Utilisation</p><p className="mt-1 text-sm font-semibold text-white">{selected.utilisation}%</p></div>
                </div>
                <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-textMuted">Notes</p>
                  <p className="mt-2 text-sm leading-6 text-textMuted">{selected.notes}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setEditing(selected)}>Edit press</Button>
                  <PrimaryButton onClick={() => duplicatePrinter(selected)}>Clone profile</PrimaryButton>
                </div>
              </>
            ) : null}
          </Card>

          <Card>
            <div className="flex items-center gap-2 text-white"><ShieldAlert size={16} /> SLA risk board</div>
            <div className="mt-3 space-y-2 text-sm text-textMuted">
              {watchList.length ? watchList.map((printer) => (
                <div key={printer.id} className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-white">{printer.name}</span>
                    <span className={`rounded-full border px-2 py-1 text-[10px] uppercase ${riskTone[printer.risk]}`}>{printer.risk}</span>
                  </div>
                  <p className="mt-1 text-xs text-textMuted">{printer.notes}</p>
                </div>
              )) : <p className="rounded-xl border border-dashed border-white/10 px-3 py-5 text-center">No printers are currently flagged.</p>}
            </div>
          </Card>

          <Card>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><div className="flex items-center gap-2 text-white"><Cpu size={16} /> Fleet balance</div><p className="mt-2 text-sm text-textMuted">Spread urgent work away from at-risk presses before queues become SLA issues.</p></div>
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><div className="flex items-center gap-2 text-white"><Wrench size={16} /> Maintenance planning</div><p className="mt-2 text-sm text-textMuted">Capture service dates and keep maintenance windows visible to production leads.</p></div>
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><div className="flex items-center gap-2 text-white"><Activity size={16} /> Operator readiness</div><p className="mt-2 text-sm text-textMuted">Make operator ownership and plant responsibility obvious before API wiring.</p></div>
            </div>
          </Card>
        </div>
      </div>

      <BaseModal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.name ? `Edit ${editing.name}` : 'Add printer'}>
        {editing ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder="Printer name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              <Input placeholder="Plant" value={editing.plant} onChange={(e) => setEditing({ ...editing, plant: e.target.value })} />
              <Input placeholder="Make / model" value={editing.makeModel} onChange={(e) => setEditing({ ...editing, makeModel: e.target.value })} />
              <Input placeholder="Operator" value={editing.operator} onChange={(e) => setEditing({ ...editing, operator: e.target.value })} />
              <Select options={technologyOptions.filter((item) => item !== 'all')} value={editing.technology} onChange={(e) => setEditing({ ...editing, technology: e.target.value as PrinterTechnology })} />
              <Select options={statusOptions.filter((item) => item !== 'all')} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as PrinterStatus })} />
              <Select options={riskOptions.filter((item) => item !== 'all')} value={editing.risk} onChange={(e) => setEditing({ ...editing, risk: e.target.value as PrinterRisk })} />
              <Input type="date" placeholder="Last service" value={editing.lastService} onChange={(e) => setEditing({ ...editing, lastService: e.target.value })} />
              <Input type="number" placeholder="Queued jobs" value={editing.queueJobs} onChange={(e) => setEditing({ ...editing, queueJobs: Number(e.target.value) || 0 })} />
              <Input type="number" placeholder="Utilisation %" value={editing.utilisation} onChange={(e) => setEditing({ ...editing, utilisation: Number(e.target.value) || 0 })} />
            </div>
            <textarea
              value={editing.notes}
              onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
              rows={4}
              className="w-full rounded-2xl border border-white/8 bg-panelMuted/90 px-3.5 py-3 text-[13px] text-text outline-none transition placeholder:text-textMuted/70 focus:border-accent/70 focus:bg-panelMuted"
              placeholder="Production notes, downtime reasons, and routing guidance..."
            />
            <div className="flex justify-end gap-2">
              <Button onClick={() => setEditing(null)}>Cancel</Button>
              <PrimaryButton onClick={() => savePrinter(editing)} disabled={!editing.name.trim()}>Save printer</PrimaryButton>
            </div>
          </div>
        ) : null}
      </BaseModal>
    </div>
  );
}
