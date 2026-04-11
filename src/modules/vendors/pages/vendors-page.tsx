'use client';

import { useEffect, useMemo, useState } from 'react';
import { Factory, Package, Search, ShieldAlert, Truck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { BaseModal } from '@/components/modals/base-modal';
import { vendorOpsService } from '@/services/vendor-ops.service';
import type { VendorRecord, VendorCategory, VendorHealth, VendorStatus } from '@/data/vendor-ops';

const statusOptions: Array<'all' | VendorStatus> = ['all', 'active', 'onboarding', 'paused'];
const categoryOptions: Array<'all' | VendorCategory> = ['all', 'Print', 'Finishing', 'Packaging', 'Freight'];
const healthOptions: Array<'all' | VendorHealth> = ['all', 'healthy', 'watch', 'critical'];

const emptyVendor: VendorRecord = {
  id: '',
  name: '',
  category: 'Print',
  region: '',
  status: 'active',
  health: 'healthy',
  leadDays: 3,
  onTimeRate: 95,
  spendMtd: 0,
  capability: '',
  accountOwner: '',
  notes: ''
};

const toneMap: Record<VendorHealth, string> = {
  healthy: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  watch: 'border-amber-400/30 bg-amber-400/10 text-amber-100',
  critical: 'border-rose-400/30 bg-rose-400/10 text-rose-200'
};

const statusTone: Record<VendorStatus, string> = {
  active: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200',
  onboarding: 'border-violet-400/30 bg-violet-400/10 text-violet-200',
  paused: 'border-slate-400/20 bg-slate-400/10 text-slate-200'
};

function currency(value: number) {
  return `£${value.toLocaleString()}`;
}

export function VendorsPage() {
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | VendorStatus>('all');
  const [category, setCategory] = useState<'all' | VendorCategory>('all');
  const [health, setHealth] = useState<'all' | VendorHealth>('all');
  const [editing, setEditing] = useState<VendorRecord | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    const items = await vendorOpsService.getVendors();
    setVendors(items);
    setSelectedId((current) => current ?? items[0]?.id ?? null);
  };

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(
    () =>
      vendors.filter((vendor) => {
        const haystack = `${vendor.name} ${vendor.category} ${vendor.region} ${vendor.capability} ${vendor.accountOwner}`.toLowerCase();
        const matchesSearch = !search || haystack.includes(search.toLowerCase());
        const matchesStatus = status === 'all' || vendor.status === status;
        const matchesCategory = category === 'all' || vendor.category === category;
        const matchesHealth = health === 'all' || vendor.health === health;
        return matchesSearch && matchesStatus && matchesCategory && matchesHealth;
      }),
    [vendors, search, status, category, health]
  );

  const selected = rows.find((vendor) => vendor.id === selectedId) ?? rows[0] ?? null;

  const kpis = useMemo(() => ({
    active: rows.filter((vendor) => vendor.status === 'active').length,
    watch: rows.filter((vendor) => vendor.health !== 'healthy').length,
    avgOnTime: rows.length ? Math.round(rows.reduce((sum, vendor) => sum + vendor.onTimeRate, 0) / rows.length) : 0,
    monthlySpend: rows.reduce((sum, vendor) => sum + vendor.spendMtd, 0)
  }), [rows]);

  async function saveVendor(vendor: VendorRecord) {
    await vendorOpsService.saveVendor(vendor);
    setEditing(null);
    await load();
    setSelectedId(vendor.id);
  }

  const createVendor = () => {
    setEditing({
      ...emptyVendor,
      id: `vd-${Date.now()}`
    });
  };

  const duplicateVendor = async (vendor: VendorRecord) => {
    const copy = {
      ...vendor,
      id: `vd-${Date.now()}`,
      name: `${vendor.name} Copy`,
      status: 'onboarding' as VendorStatus
    };
    await saveVendor(copy);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(vendors, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'trade-vendors-export.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const flaggedVendors = rows.filter((vendor) => vendor.health !== 'healthy');

  return (
    <div className="space-y-5">
      <PageHeader
        title="Trade Vendors"
        subtitle="Manage supplier onboarding, health, capability, and trade capacity before API and database wiring."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={load}>Refresh</Button>
            <Button onClick={exportJson}>Export JSON</Button>
            <Button onClick={async () => { await vendorOpsService.resetVendors(); await load(); }}>Reset seed data</Button>
            <PrimaryButton onClick={createVendor}>Add Vendor</PrimaryButton>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card><p className="text-xs text-textMuted">Active vendors</p><p className="mt-2 text-2xl font-semibold">{kpis.active}</p></Card>
        <Card><p className="text-xs text-textMuted">Needs attention</p><p className="mt-2 text-2xl font-semibold">{kpis.watch}</p></Card>
        <Card><p className="text-xs text-textMuted">Average on-time rate</p><p className="mt-2 text-2xl font-semibold">{kpis.avgOnTime}%</p></Card>
        <Card><p className="text-xs text-textMuted">Spend this month</p><p className="mt-2 text-2xl font-semibold">{currency(kpis.monthlySpend)}</p></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.75fr_1fr]">
        <Card className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={16} />
              <Input className="pl-9" placeholder="Search vendor, capability, owner..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select options={statusOptions} value={status} onChange={(e) => setStatus(e.target.value as 'all' | VendorStatus)} />
            <Select options={categoryOptions} value={category} onChange={(e) => setCategory(e.target.value as 'all' | VendorCategory)} />
            <Select options={healthOptions} value={health} onChange={(e) => setHealth(e.target.value as 'all' | VendorHealth)} />
          </div>

          <div className="grid gap-3">
            {rows.map((vendor) => (
              <button
                key={vendor.id}
                onClick={() => setSelectedId(vendor.id)}
                className={`rounded-2xl border p-4 text-left transition ${selectedId === vendor.id ? 'border-accent bg-accent/10' : 'border-white/6 bg-white/[0.02] hover:border-white/15'}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{vendor.name}</p>
                    <p className="mt-1 text-xs text-textMuted">{vendor.capability}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] ${statusTone[vendor.status]}`}>{vendor.status}</span>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] ${toneMap[vendor.health]}`}>{vendor.health}</span>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-xs text-textMuted md:grid-cols-4">
                  <div><span className="text-white">Category:</span> {vendor.category}</div>
                  <div><span className="text-white">Region:</span> {vendor.region}</div>
                  <div><span className="text-white">Lead:</span> {vendor.leadDays}d</div>
                  <div><span className="text-white">On-time:</span> {vendor.onTimeRate}%</div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={(e) => { e.stopPropagation(); setEditing(vendor); }}>Edit</Button>
                  <Button onClick={(e) => { e.stopPropagation(); duplicateVendor(vendor); }}>Duplicate</Button>
                  <Button onClick={async (e) => { e.stopPropagation(); await vendorOpsService.deleteVendor(vendor.id); await load(); }}>Delete</Button>
                  {vendor.health !== 'critical' ? (
                    <Button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await saveVendor({ ...vendor, health: vendor.health === 'healthy' ? 'watch' : 'critical' });
                      }}
                    >
                      Raise risk
                    </Button>
                  ) : (
                    <PrimaryButton onClick={async (e) => { e.stopPropagation(); await saveVendor({ ...vendor, health: 'watch', status: 'active' }); }}>
                      Stabilise
                    </PrimaryButton>
                  )}
                </div>
              </button>
            ))}

            {!rows.length ? <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-textMuted">No vendors match the current filters.</div> : null}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Vendor spotlight</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{selected?.name ?? 'No vendor selected'}</h3>
              <p className="mt-1 text-sm text-textMuted">{selected ? `${selected.category} · ${selected.region}` : 'Choose a vendor to review commercial and operational health.'}</p>
            </div>

            {selected ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><p className="text-xs text-textMuted">Account owner</p><p className="mt-1 text-sm font-semibold text-white">{selected.accountOwner}</p></div>
                  <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><p className="text-xs text-textMuted">MTD spend</p><p className="mt-1 text-sm font-semibold text-white">{currency(selected.spendMtd)}</p></div>
                  <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><p className="text-xs text-textMuted">Lead time</p><p className="mt-1 text-sm font-semibold text-white">{selected.leadDays} days</p></div>
                  <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><p className="text-xs text-textMuted">Service level</p><p className="mt-1 text-sm font-semibold text-white">{selected.onTimeRate}% on-time</p></div>
                </div>
                <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-textMuted">Notes</p>
                  <p className="mt-2 text-sm leading-6 text-textMuted">{selected.notes}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setEditing(selected)}>Edit vendor</Button>
                  <PrimaryButton onClick={() => duplicateVendor(selected)}>Clone supplier</PrimaryButton>
                </div>
              </>
            ) : null}
          </Card>

          <Card>
            <div className="flex items-center gap-2 text-white"><ShieldAlert size={16} /> Supplier risk board</div>
            <div className="mt-3 space-y-2 text-sm text-textMuted">
              {flaggedVendors.length ? flaggedVendors.map((vendor) => (
                <div key={vendor.id} className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-white">{vendor.name}</span>
                    <span className={`rounded-full border px-2 py-1 text-[10px] uppercase ${toneMap[vendor.health]}`}>{vendor.health}</span>
                  </div>
                  <p className="mt-1 text-xs text-textMuted">{vendor.notes}</p>
                </div>
              )) : <p className="rounded-xl border border-dashed border-white/10 px-3 py-5 text-center">No vendors are currently flagged.</p>}
            </div>
          </Card>

          <Card>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><div className="flex items-center gap-2 text-white"><Factory size={16} /> Print capacity</div><p className="mt-2 text-sm text-textMuted">Balance overflow work across healthy trade print suppliers.</p></div>
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><div className="flex items-center gap-2 text-white"><Package size={16} /> Packaging readiness</div><p className="mt-2 text-sm text-textMuted">Track onboarding vendors before routing custom packaging jobs.</p></div>
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><div className="flex items-center gap-2 text-white"><Truck size={16} /> Freight resilience</div><p className="mt-2 text-sm text-textMuted">Keep a backup dispatch partner ready for high-SLA work.</p></div>
            </div>
          </Card>
        </div>
      </div>

      <BaseModal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.name ? `Edit ${editing.name}` : 'Add vendor'}>
        {editing ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder="Vendor name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              <Input placeholder="Region" value={editing.region} onChange={(e) => setEditing({ ...editing, region: e.target.value })} />
              <Select options={categoryOptions.filter((item) => item !== 'all')} value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value as VendorCategory })} />
              <Select options={statusOptions.filter((item) => item !== 'all')} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as VendorStatus })} />
              <Select options={healthOptions.filter((item) => item !== 'all')} value={editing.health} onChange={(e) => setEditing({ ...editing, health: e.target.value as VendorHealth })} />
              <Input placeholder="Account owner" value={editing.accountOwner} onChange={(e) => setEditing({ ...editing, accountOwner: e.target.value })} />
              <Input placeholder="Capability" value={editing.capability} onChange={(e) => setEditing({ ...editing, capability: e.target.value })} />
              <Input type="number" placeholder="Lead days" value={editing.leadDays} onChange={(e) => setEditing({ ...editing, leadDays: Number(e.target.value) || 0 })} />
              <Input type="number" placeholder="On-time rate" value={editing.onTimeRate} onChange={(e) => setEditing({ ...editing, onTimeRate: Number(e.target.value) || 0 })} />
              <Input type="number" placeholder="Spend this month" value={editing.spendMtd} onChange={(e) => setEditing({ ...editing, spendMtd: Number(e.target.value) || 0 })} />
            </div>
            <textarea
              value={editing.notes}
              onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
              rows={4}
              className="w-full rounded-2xl border border-white/8 bg-panelMuted/90 px-3.5 py-3 text-[13px] text-text outline-none transition placeholder:text-textMuted/70 focus:border-accent/70 focus:bg-panelMuted"
              placeholder="Relationship notes, concerns, and routing context..."
            />
            <div className="flex justify-end gap-2">
              <Button onClick={() => setEditing(null)}>Cancel</Button>
              <PrimaryButton onClick={() => saveVendor(editing)} disabled={!editing.name.trim()}>Save vendor</PrimaryButton>
            </div>
          </div>
        ) : null}
      </BaseModal>
    </div>
  );
}
