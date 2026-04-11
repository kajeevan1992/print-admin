'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, ShieldAlert, Truck, Warehouse } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { BaseModal } from '@/components/modals/base-modal';
import { shippingMethodsService } from '@/services/shipping-methods.service';
import type { ShippingMethodChannel, ShippingMethodRecord, ShippingMethodStatus, ShippingRiskBand } from '@/data/shipping-methods';

const statusOptions: Array<'all' | ShippingMethodStatus> = ['all', 'active', 'pilot', 'paused'];
const channelOptions: Array<'all' | ShippingMethodChannel> = ['all', 'DTC', 'B2B', 'Marketplace', 'Pickup'];
const riskOptions: Array<'all' | ShippingRiskBand> = ['all', 'healthy', 'watch', 'critical'];

const emptyMethod: ShippingMethodRecord = {
  id: '',
  name: '',
  channel: 'DTC',
  status: 'active',
  risk: 'healthy',
  carrier: '',
  serviceLevel: '',
  cutoffTime: '16:00',
  transitDays: '2-3 days',
  surcharge: 0,
  eligiblePlants: ['North'],
  owner: '',
  notes: ''
};

const statusTone: Record<ShippingMethodStatus, string> = {
  active: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200',
  pilot: 'border-violet-400/30 bg-violet-400/10 text-violet-200',
  paused: 'border-slate-400/20 bg-slate-400/10 text-slate-200'
};

const riskTone: Record<ShippingRiskBand, string> = {
  healthy: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  watch: 'border-amber-400/30 bg-amber-400/10 text-amber-100',
  critical: 'border-rose-400/30 bg-rose-400/10 text-rose-200'
};

function currency(value: number) {
  return value === 0 ? 'No surcharge' : `+£${value.toFixed(2)}`;
}

export function ShippingMethodsPage() {
  const [methods, setMethods] = useState<ShippingMethodRecord[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | ShippingMethodStatus>('all');
  const [channel, setChannel] = useState<'all' | ShippingMethodChannel>('all');
  const [risk, setRisk] = useState<'all' | ShippingRiskBand>('all');
  const [editing, setEditing] = useState<ShippingMethodRecord | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    const items = await shippingMethodsService.getMethods();
    setMethods(items);
    setSelectedId((current) => current ?? items[0]?.id ?? null);
  };

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(
    () => methods.filter((item) => {
      const haystack = `${item.name} ${item.channel} ${item.carrier} ${item.serviceLevel} ${item.owner} ${item.eligiblePlants.join(' ')}`.toLowerCase();
      const matchesSearch = !search || haystack.includes(search.toLowerCase());
      const matchesStatus = status === 'all' || item.status === status;
      const matchesChannel = channel === 'all' || item.channel === channel;
      const matchesRisk = risk === 'all' || item.risk === risk;
      return matchesSearch && matchesStatus && matchesChannel && matchesRisk;
    }),
    [methods, search, status, channel, risk]
  );

  const selected = rows.find((item) => item.id === selectedId) ?? rows[0] ?? null;

  const kpis = useMemo(() => ({
    active: rows.filter((item) => item.status === 'active').length,
    flagged: rows.filter((item) => item.risk !== 'healthy').length,
    pickup: rows.filter((item) => item.channel === 'Pickup').length,
    avgSurcharge: rows.length ? rows.reduce((sum, item) => sum + item.surcharge, 0) / rows.length : 0
  }), [rows]);

  async function saveMethod(record: ShippingMethodRecord) {
    await shippingMethodsService.saveMethod(record);
    setEditing(null);
    await load();
    setSelectedId(record.id);
  }

  const createMethod = () => setEditing({ ...emptyMethod, id: `sm-${Date.now()}` });

  const duplicateMethod = async (record: ShippingMethodRecord) => {
    const copy: ShippingMethodRecord = { ...record, id: `sm-${Date.now()}`, name: `${record.name} Copy`, status: 'pilot' };
    await saveMethod(copy);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(methods, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'shipping-methods-export.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const flagged = rows.filter((item) => item.risk !== 'healthy');

  return (
    <div className="space-y-5">
      <PageHeader
        title="Shipping Methods"
        subtitle="Manage delivery routes, dispatch cutoffs, carrier health, and pickup readiness before API and database wiring."
        actions={<div className="flex flex-wrap gap-2"><Button onClick={load}>Refresh</Button><Button onClick={exportJson}>Export JSON</Button><Button onClick={async () => { await shippingMethodsService.resetMethods(); await load(); }}>Reset seed data</Button><PrimaryButton onClick={createMethod}>Add Shipping Method</PrimaryButton></div>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card><p className="text-xs text-textMuted">Active routes</p><p className="mt-2 text-2xl font-semibold">{kpis.active}</p></Card>
        <Card><p className="text-xs text-textMuted">Needs attention</p><p className="mt-2 text-2xl font-semibold">{kpis.flagged}</p></Card>
        <Card><p className="text-xs text-textMuted">Pickup routes</p><p className="mt-2 text-2xl font-semibold">{kpis.pickup}</p></Card>
        <Card><p className="text-xs text-textMuted">Average surcharge</p><p className="mt-2 text-2xl font-semibold">£{kpis.avgSurcharge.toFixed(2)}</p></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.75fr_1fr]">
        <Card className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={16} />
              <Input className="pl-9" placeholder="Search route, carrier, owner, plant..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select options={statusOptions} value={status} onChange={(e) => setStatus(e.target.value as 'all' | ShippingMethodStatus)} />
            <Select options={channelOptions} value={channel} onChange={(e) => setChannel(e.target.value as 'all' | ShippingMethodChannel)} />
            <Select options={riskOptions} value={risk} onChange={(e) => setRisk(e.target.value as 'all' | ShippingRiskBand)} />
          </div>

          <div className="grid gap-3">
            {rows.map((item) => (
              <button key={item.id} onClick={() => setSelectedId(item.id)} className={`rounded-2xl border p-4 text-left transition ${selectedId === item.id ? 'border-accent bg-accent/10' : 'border-white/6 bg-white/[0.02] hover:border-white/15'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{item.name}</p>
                    <p className="mt-1 text-xs text-textMuted">{item.carrier} · {item.serviceLevel}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] ${statusTone[item.status]}`}>{item.status}</span>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] ${riskTone[item.risk]}`}>{item.risk}</span>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-xs text-textMuted md:grid-cols-4">
                  <div><span className="text-white">Channel:</span> {item.channel}</div>
                  <div><span className="text-white">Cutoff:</span> {item.cutoffTime}</div>
                  <div><span className="text-white">Transit:</span> {item.transitDays}</div>
                  <div><span className="text-white">Surcharge:</span> {currency(item.surcharge)}</div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={(e) => { e.stopPropagation(); setEditing(item); }}>Edit</Button>
                  <Button onClick={(e) => { e.stopPropagation(); duplicateMethod(item); }}>Duplicate</Button>
                  <Button onClick={async (e) => { e.stopPropagation(); await shippingMethodsService.deleteMethod(item.id); await load(); }}>Delete</Button>
                  {item.status !== 'paused' ? (
                    <Button onClick={async (e) => { e.stopPropagation(); await saveMethod({ ...item, status: 'paused', risk: item.risk === 'healthy' ? 'watch' : item.risk }); }}>Pause</Button>
                  ) : (
                    <PrimaryButton onClick={async (e) => { e.stopPropagation(); await saveMethod({ ...item, status: 'active', risk: item.risk === 'critical' ? 'watch' : item.risk }); }}>Activate</PrimaryButton>
                  )}
                </div>
              </button>
            ))}
            {!rows.length ? <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-textMuted">No shipping methods match the current filters.</div> : null}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Route spotlight</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{selected?.name ?? 'No route selected'}</h3>
              <p className="mt-1 text-sm text-textMuted">{selected ? `${selected.channel} · ${selected.carrier}` : 'Choose a shipping method to review cutoff timing and routing fit.'}</p>
            </div>
            {selected ? <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><p className="text-xs text-textMuted">Owner</p><p className="mt-1 text-sm font-semibold text-white">{selected.owner}</p></div>
                <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><p className="text-xs text-textMuted">Eligible plants</p><p className="mt-1 text-sm font-semibold text-white">{selected.eligiblePlants.join(', ')}</p></div>
                <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><p className="text-xs text-textMuted">Dispatch cutoff</p><p className="mt-1 text-sm font-semibold text-white">{selected.cutoffTime}</p></div>
                <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><p className="text-xs text-textMuted">Commercial uplift</p><p className="mt-1 text-sm font-semibold text-white">{currency(selected.surcharge)}</p></div>
              </div>
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-textMuted">Notes</p>
                <p className="mt-2 text-sm leading-6 text-textMuted">{selected.notes}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setEditing(selected)}>Edit route</Button>
                <PrimaryButton onClick={() => duplicateMethod(selected)}>Clone route</PrimaryButton>
              </div>
            </> : null}
          </Card>

          <Card>
            <div className="flex items-center gap-2 text-white"><ShieldAlert size={16} /> Carrier warnings</div>
            <div className="mt-3 space-y-2 text-sm text-textMuted">
              {flagged.length ? flagged.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-white">{item.name}</span>
                    <span className={`rounded-full border px-2 py-1 text-[10px] uppercase ${riskTone[item.risk]}`}>{item.risk}</span>
                  </div>
                  <p className="mt-1 text-xs text-textMuted">{item.notes}</p>
                </div>
              )) : <p className="rounded-xl border border-dashed border-white/10 px-3 py-5 text-center">No routes are currently flagged.</p>}
            </div>
          </Card>

          <Card>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><div className="flex items-center gap-2 text-white"><Truck size={16} /> Dispatch guidance</div><p className="mt-2 text-sm text-textMuted">Keep rush routes limited to eligible plants with confirmed pack-out windows.</p></div>
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><div className="flex items-center gap-2 text-white"><Warehouse size={16} /> Pickup readiness</div><p className="mt-2 text-sm text-textMuted">Use pickup only where slot controls and warehouse staffing are reliable.</p></div>
            </div>
          </Card>
        </div>
      </div>

      <BaseModal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit shipping method' : 'Add shipping method'}>
        {editing ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder="Method name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              <Input placeholder="Carrier" value={editing.carrier} onChange={(e) => setEditing({ ...editing, carrier: e.target.value })} />
              <Select options={channelOptions.filter((o): o is ShippingMethodChannel => o !== 'all')} value={editing.channel} onChange={(e) => setEditing({ ...editing, channel: e.target.value as ShippingMethodChannel })} />
              <Select options={statusOptions.filter((o): o is ShippingMethodStatus => o !== 'all')} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as ShippingMethodStatus })} />
              <Input placeholder="Service level" value={editing.serviceLevel} onChange={(e) => setEditing({ ...editing, serviceLevel: e.target.value })} />
              <Select options={riskOptions.filter((o): o is ShippingRiskBand => o !== 'all')} value={editing.risk} onChange={(e) => setEditing({ ...editing, risk: e.target.value as ShippingRiskBand })} />
              <Input placeholder="Cutoff time" value={editing.cutoffTime} onChange={(e) => setEditing({ ...editing, cutoffTime: e.target.value })} />
              <Input placeholder="Transit days" value={editing.transitDays} onChange={(e) => setEditing({ ...editing, transitDays: e.target.value })} />
              <Input type="number" step="0.5" placeholder="Surcharge" value={String(editing.surcharge)} onChange={(e) => setEditing({ ...editing, surcharge: Number(e.target.value) || 0 })} />
              <Input placeholder="Owner" value={editing.owner} onChange={(e) => setEditing({ ...editing, owner: e.target.value })} />
            </div>
            <Input placeholder="Eligible plants (comma separated)" value={editing.eligiblePlants.join(', ')} onChange={(e) => setEditing({ ...editing, eligiblePlants: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} />
            <textarea className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-surface px-3 py-2 text-sm text-white outline-none" placeholder="Notes" value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
            <div className="flex justify-end gap-2"><Button onClick={() => setEditing(null)}>Cancel</Button><PrimaryButton onClick={() => saveMethod(editing)}>Save shipping method</PrimaryButton></div>
          </div>
        ) : null}
      </BaseModal>
    </div>
  );
}
