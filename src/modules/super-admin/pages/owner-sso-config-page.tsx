
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, ShieldCheck, ShieldEllipsis } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { OwnerSsoConfigRecord, OwnerSsoProtocol, OwnerSsoStatus } from '@/data/owner-sso-config';
import { ownerSsoConfigService } from '@/services/owner-sso-config.service';

type StatusFilter = 'all' | OwnerSsoStatus;
type ProtocolFilter = 'all' | OwnerSsoProtocol;

const emptyRecord: OwnerSsoConfigRecord = {
  id: '',
  tenant: '',
  providerName: '',
  protocol: 'oidc',
  status: 'draft',
  domainHint: '',
  lastValidatedAt: '2026-04-12 00:00',
  owner: '',
  notes: ''
};

export function OwnerSsoConfigPage() {
  const [rows, setRows] = useState<OwnerSsoConfigRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [protocol, setProtocol] = useState<ProtocolFilter>('all');
  const [editing, setEditing] = useState<OwnerSsoConfigRecord | null>(null);

  async function load() {
    const data = await ownerSsoConfigService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || [row.tenant, row.providerName, row.domainHint, row.owner, row.notes].join(' ').toLowerCase().includes(q);
    const matchesStatus = status === 'all' || row.status === status;
    const matchesProtocol = protocol === 'all' || row.protocol === protocol;
    return matchesQuery && matchesStatus && matchesProtocol;
  }), [rows, search, status, protocol]);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((row) => row.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  async function save(record: OwnerSsoConfigRecord) {
    await ownerSsoConfigService.save(record);
    setEditing(null);
    await load();
    setSelectedId(record.id);
  }

  return (
    <div>
      <PageHeader
        title="Owner SSO Config"
        subtitle="Manage enterprise login configuration across tenants before wiring real identity providers, metadata exchange, and validation endpoints."
        actions={<><Button onClick={() => ownerSsoConfigService.reset().then(load)}>Reset Seed</Button><PrimaryButton onClick={() => setEditing({ ...emptyRecord, id: `sso-${Date.now()}` })}>New SSO Config</PrimaryButton></>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1.6fr_220px_220px]">
        <Input id="owner-sso-search" name="ownerSsoSearch" placeholder="Search tenant, provider, domain, owner, || notes" value={search} onChange={(e) => setSearch(e.target.value)} leadingIcon={<Search className="h-4 w-4" />} />
        <Select id="owner-sso-status" name="ownerSsoStatus" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} options={[{ value: 'all', label: 'All status' }, { value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused' }]} />
        <Select id="owner-sso-protocol" name="ownerSsoProtocol" value={protocol} onChange={(e) => setProtocol(e.target.value as ProtocolFilter)} options={[{ value: 'all', label: 'All protocols' }, { value: 'saml', label: 'SAML' }, { value: 'oidc', label: 'OIDC' }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm text-textMuted">Owner-managed enterprise login setups</div>
          <div className="divide-y divide-white/6">
            {filtered.map((row) => (
              <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} className={`grid w-full gap-2 px-4 py-4 text-left transition hover:bg-white/4 ${selectedId === row.id ? 'bg-white/6' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{row.tenant}</p>
                    <p className="text-xs text-textMuted">{row.providerName} · {row.protocol} · {row.owner}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white">{row.status}</span>
                </div>
                <p className="text-sm text-textMuted">{row.domainHint}</p>
              </button>
            ))}
            {!filtered.length && <div className="px-4 py-10 text-sm text-textMuted">No SSO configs match the current filters.</div>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <ShieldEllipsis className="h-4 w-4 text-sky-300" />
              <p className="text-sm font-medium text-white">SSO spotlight</p>
            </div>
            {selected ? (
              <div className="space-y-3 text-sm">
                <MiniStat label="Provider" value={selected.providerName} />
                <MiniStat label="Protocol" value={selected.protocol} />
                <MiniStat label="Tenant" value={selected.tenant} />
                <MiniStat label="Domain hint" value={selected.domainHint} />
                <MiniStat label="Owner" value={selected.owner} />
                <MiniStat label="Last validated" value={selected.lastValidatedAt} />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Notes</p>
                  <p className="mt-1 text-textMuted">{selected.notes}</p>
                </div>
                <div className="grid gap-2">
                  <Button onClick={() => save({ ...selected, status: 'active' })}>Activate</Button>
                  <Button onClick={() => save({ ...selected, status: 'paused' })}>Pause</Button>
                  <Button onClick={() => setEditing(selected)}>Edit SSO Config</Button>
                  <Button onClick={async () => { await ownerSsoConfigService.delete(selected.id); await load(); }}>Delete SSO Config</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">Pick an SSO config to review enterprise login details.</p>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <p className="text-sm font-medium text-white">Owner guidance</p>
            </div>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Use this page to model enterprise login controls before wiring real metadata parsing, certificate validation, and tenant-specific identity rules.</p>
              <p>This is the right future surface for domain verification, IdP testing, mapping claims, and admin lockout safeguards.</p>
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

function EditModal({ value, onClose, onSave }: { value: OwnerSsoConfigRecord; onClose: () => void; onSave: (value: OwnerSsoConfigRecord) => void; }) {
  const [draft, setDraft] = useState<OwnerSsoConfigRecord>(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{value.id ? 'Edit owner SSO config' : 'New owner SSO config'}</p>
          <Button onClick={onClose}>Close</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input id="owner-sso-tenant" name="ownerSsoTenant" value={draft.tenant} onChange={(e) => setDraft({ ...draft, tenant: e.target.value })} placeholder="Tenant" />
          <Input id="owner-sso-provider" name="ownerSsoProvider" value={draft.providerName} onChange={(e) => setDraft({ ...draft, providerName: e.target.value })} placeholder="Provider name" />
          <Select id="owner-sso-protocol-edit" name="ownerSsoProtocolEdit" value={draft.protocol} onChange={(e) => setDraft({ ...draft, protocol: e.target.value as OwnerSsoProtocol })} options={[{ value: 'saml', label: 'SAML' }, { value: 'oidc', label: 'OIDC' }]} />
          <Select id="owner-sso-status-edit" name="ownerSsoStatusEdit" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as OwnerSsoStatus })} options={[{ value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused' }]} />
          <Input id="owner-sso-domain" name="ownerSsoDomain" value={draft.domainHint} onChange={(e) => setDraft({ ...draft, domainHint: e.target.value })} placeholder="Domain hint" />
          <Input id="owner-sso-owner" name="ownerSsoOwner" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="Owner" />
          <Input id="owner-sso-validated" name="ownerSsoValidated" value={draft.lastValidatedAt} onChange={(e) => setDraft({ ...draft, lastValidatedAt: e.target.value })} placeholder="Last validated at" />
        </div>
        <div className="mt-3">
          <textarea
            id="owner-sso-notes"
            name="ownerSsoNotes"
            className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            placeholder="Notes"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <PrimaryButton onClick={() => onSave(draft)}>Save SSO Config</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
