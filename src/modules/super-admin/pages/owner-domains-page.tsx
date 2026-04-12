
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Globe2, Search, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { OwnerDomainRecord, OwnerDomainStatus, OwnerDomainType } from '@/data/owner-domains';
import { ownerDomainsService } from '@/services/owner-domains.service';

type StatusFilter = 'all' | OwnerDomainStatus;
type TypeFilter = 'all' | OwnerDomainType;

const emptyRecord: OwnerDomainRecord = {
  id: '',
  tenant: '',
  hostname: '',
  type: 'primary',
  status: 'pending',
  sslMode: '',
  dnsProvider: '',
  owner: '',
  notes: ''
};

export function OwnerDomainsPage() {
  const [rows, setRows] = useState<OwnerDomainRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [type, setType] = useState<TypeFilter>('all');
  const [editing, setEditing] = useState<OwnerDomainRecord | null>(null);

  async function load() {
    const data = await ownerDomainsService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || [row.tenant, row.hostname, row.sslMode, row.dnsProvider, row.owner, row.notes].join(' ').toLowerCase().includes(q);
    const matchesStatus = status === 'all' || row.status === status;
    const matchesType = type === 'all' || row.type === type;
    return matchesQuery && matchesStatus && matchesType;
  }), [rows, search, status, type]);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((row) => row.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  async function save(record: OwnerDomainRecord) {
    await ownerDomainsService.save(record);
    setEditing(null);
    await load();
    setSelectedId(record.id);
  }

  return (
    <div>
      <PageHeader
        title="Owner Domains"
        subtitle="Manage tenant domains, DNS state, and certificate readiness before wiring real DNS checks and certificate automation."
        actions={<><Button onClick={() => ownerDomainsService.reset().then(load)}>Reset Seed</Button><PrimaryButton onClick={() => setEditing({ ...emptyRecord, id: `domain-${Date.now()}` })}>New Domain</PrimaryButton></>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1.6fr_220px_220px]">
        <Input id="owner-domains-search" name="ownerDomainsSearch" placeholder="Search tenant, hostname, DNS, owner, or notes" value={search} onChange={(e) => setSearch(e.target.value)} leadingIcon={<Search className="h-4 w-4" />} />
        <Select id="owner-domains-status" name="ownerDomainsStatus" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} options={[{ value: 'all', label: 'All status' }, { value: 'verified', label: 'Verified' }, { value: 'pending', label: 'Pending' }, { value: 'issue', label: 'Issue' }]} />
        <Select id="owner-domains-type" name="ownerDomainsType" value={type} onChange={(e) => setType(e.target.value as TypeFilter)} options={[{ value: 'all', label: 'All types' }, { value: 'primary', label: 'Primary' }, { value: 'redirect', label: 'Redirect' }, { value: 'preview', label: 'Preview' }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm text-textMuted">Owner-managed domains</div>
          <div className="divide-y divide-white/6">
            {filtered.map((row) => (
              <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} className={`grid w-full gap-2 px-4 py-4 text-left transition hover:bg-white/4 ${selectedId === row.id ? 'bg-white/6' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{row.hostname}</p>
                    <p className="text-xs text-textMuted">{row.tenant} · {row.type} · {row.dnsProvider}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white">{row.status}</span>
                </div>
                <p className="text-sm text-textMuted">{row.sslMode}</p>
              </button>
            ))}
            {!filtered.length && <div className="px-4 py-10 text-sm text-textMuted">No domains match the current filters.</div>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-sky-300" />
              <p className="text-sm font-medium text-white">Domain spotlight</p>
            </div>
            {selected ? (
              <div className="space-y-3 text-sm">
                <MiniStat label="Tenant" value={selected.tenant} />
                <MiniStat label="Type" value={selected.type} />
                <MiniStat label="DNS provider" value={selected.dnsProvider} />
                <MiniStat label="SSL mode" value={selected.sslMode} />
                <MiniStat label="Owner" value={selected.owner} />
                <MiniStat label="Status" value={selected.status} />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Notes</p>
                  <p className="mt-1 text-textMuted">{selected.notes}</p>
                </div>
                <div className="grid gap-2">
                  <Button onClick={() => save({ ...selected, status: 'verified' })}>Mark Verified</Button>
                  <Button onClick={() => save({ ...selected, status: 'pending' })}>Mark Pending</Button>
                  <Button onClick={() => save({ ...selected, status: 'issue' })}>Mark Issue</Button>
                  <Button onClick={() => setEditing(selected)}>Edit Domain</Button>
                  <Button onClick={async () => { await ownerDomainsService.delete(selected.id); await load(); }}>Delete Domain</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">Pick a domain to review DNS and certificate details.</p>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <p className="text-sm font-medium text-white">Owner guidance</p>
            </div>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Use this page to model domain routing and certificate readiness before wiring real validation checks and DNS automation.</p>
              <p>This is the right future surface for certificate renewals, validation errors, and tenant domain approvals.</p>
            </div>
          </Card>
        </div>
      </div>

      {editing && <EditModal value={editing} onClose={() => setEditing(null)} onSave={(next) => void save(next)} />}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
      <p className="text-xs uppercase tracking-[0.24em] text-textMuted">{label}</p>
      <p className="mt-1 text-sm text-white">{value}</p>
    </div>
  );
}

function EditModal({ value, onClose, onSave }: { value: OwnerDomainRecord; onClose: () => void; onSave: (value: OwnerDomainRecord) => void; }) {
  const [draft, setDraft] = useState<OwnerDomainRecord>(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{value.id ? 'Edit owner domain' : 'New owner domain'}</p>
          <Button onClick={onClose}>Close</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input id="owner-domain-tenant" name="ownerDomainTenant" value={draft.tenant} onChange={(e) => setDraft({ ...draft, tenant: e.target.value })} placeholder="Tenant" />
          <Input id="owner-domain-hostname" name="ownerDomainHostname" value={draft.hostname} onChange={(e) => setDraft({ ...draft, hostname: e.target.value })} placeholder="Hostname" />
          <Select id="owner-domain-type" name="ownerDomainType" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as OwnerDomainType })} options={[{ value: 'primary', label: 'Primary' }, { value: 'redirect', label: 'Redirect' }, { value: 'preview', label: 'Preview' }]} />
          <Select id="owner-domain-status" name="ownerDomainStatus" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as OwnerDomainStatus })} options={[{ value: 'verified', label: 'Verified' }, { value: 'pending', label: 'Pending' }, { value: 'issue', label: 'Issue' }]} />
          <Input id="owner-domain-ssl" name="ownerDomainSsl" value={draft.sslMode} onChange={(e) => setDraft({ ...draft, sslMode: e.target.value })} placeholder="SSL mode" />
          <Input id="owner-domain-dns" name="ownerDomainDns" value={draft.dnsProvider} onChange={(e) => setDraft({ ...draft, dnsProvider: e.target.value })} placeholder="DNS provider" />
          <Input id="owner-domain-owner" name="ownerDomainOwner" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="Owner" />
        </div>
        <div className="mt-3">
          <textarea
            id="owner-domain-notes"
            name="ownerDomainNotes"
            className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            placeholder="Notes"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <PrimaryButton onClick={() => onSave(draft)}>Save Domain</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
