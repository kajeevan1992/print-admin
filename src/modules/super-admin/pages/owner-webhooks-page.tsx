
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Webhook, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { OwnerWebhookRecord, OwnerWebhookScope, OwnerWebhookStatus } from '@/data/owner-webhooks';
import { ownerWebhooksService } from '@/services/owner-webhooks.service';

type StatusFilter = 'all' | OwnerWebhookStatus;
type ScopeFilter = 'all' | OwnerWebhookScope;

const emptyRecord: OwnerWebhookRecord = {
  id: '',
  label: '',
  endpoint: '',
  tenant: '',
  scope: 'tenant',
  status: 'active',
  lastDeliveryAt: '2026-04-12 00:00',
  events: '',
  owner: '',
  notes: ''
};

export function OwnerWebhooksPage() {
  const [rows, setRows] = useState<OwnerWebhookRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [editing, setEditing] = useState<OwnerWebhookRecord | null>(null);

  async function load() {
    const data = await ownerWebhooksService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || [row.label, row.endpoint, row.tenant, row.events, row.owner, row.notes].join(' ').toLowerCase().includes(q);
    const matchesStatus = status === 'all' || row.status === status;
    const matchesScope = scope === 'all' || row.scope === scope;
    return matchesQuery && matchesStatus && matchesScope;
  }), [rows, search, status, scope]);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((row) => row.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  async function save(record: OwnerWebhookRecord) {
    await ownerWebhooksService.save(record);
    setEditing(null);
    await load();
    setSelectedId(record.id);
  }

  return (
    <div>
      <PageHeader
        title="Owner Webhooks"
        subtitle="Manage SaaS owner-side webhook endpoints and delivery controls before wiring real secrets, retries, and delivery logs."
        actions={<><Button onClick={() => ownerWebhooksService.reset().then(load)}>Reset Seed</Button><PrimaryButton onClick={() => setEditing({ ...emptyRecord, id: `hook-${Date.now()}` })}>New Webhook</PrimaryButton></>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1.6fr_220px_220px]">
        <Input id="owner-webhooks-search" name="ownerWebhooksSearch" placeholder="Search label, endpoint, tenant, events, || notes" value={search} onChange={(e) => setSearch(e.target.value)} leadingIcon={<Search className="h-4 w-4" />} />
        <Select id="owner-webhooks-status" name="ownerWebhooksStatus" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} options={[{ value: 'all', label: 'All status' }, { value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused' }, { value: 'failed', label: 'Failed' }]} />
        <Select id="owner-webhooks-scope" name="ownerWebhooksScope" value={scope} onChange={(e) => setScope(e.target.value as ScopeFilter)} options={[{ value: 'all', label: 'All scopes' }, { value: 'tenant', label: 'Tenant' }, { value: 'platform', label: 'Platform' }, { value: 'integration', label: 'Integration' }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm text-textMuted">Owner-managed webhook endpoints</div>
          <div className="divide-y divide-white/6">
            {filtered.map((row) => (
              <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} className={`grid w-full gap-2 px-4 py-4 text-left transition hover:bg-white/4 ${selectedId === row.id ? 'bg-white/6' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{row.label}</p>
                    <p className="text-xs text-textMuted">{row.tenant} · {row.scope} · {row.owner}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white">{row.status}</span>
                </div>
                <p className="text-sm text-textMuted">{row.endpoint}</p>
              </button>
            ))}
            {!filtered.length && <div className="px-4 py-10 text-sm text-textMuted">No webhooks match the current filters.</div>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Webhook className="h-4 w-4 text-sky-300" />
              <p className="text-sm font-medium text-white">Webhook spotlight</p>
            </div>
            {selected ? (
              <div className="space-y-3 text-sm">
                <MiniStat label="Tenant" value={selected.tenant} />
                <MiniStat label="Scope" value={selected.scope} />
                <MiniStat label="Owner" value={selected.owner} />
                <MiniStat label="Last delivery" value={selected.lastDeliveryAt} />
                <MiniStat label="Events" value={selected.events} />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Endpoint</p>
                  <p className="mt-1 break-all text-textMuted">{selected.endpoint}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Notes</p>
                  <p className="mt-1 text-textMuted">{selected.notes}</p>
                </div>
                <div className="grid gap-2">
                  <Button onClick={() => save({ ...selected, status: 'active' })}>Activate</Button>
                  <Button onClick={() => save({ ...selected, status: 'paused' })}>Pause</Button>
                  <Button onClick={() => save({ ...selected, status: 'failed' })}>Mark Failed</Button>
                  <Button onClick={() => setEditing(selected)}>Edit Webhook</Button>
                  <Button onClick={async () => { await ownerWebhooksService.delete(selected.id); await load(); }}>Delete Webhook</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">Pick a webhook to review delivery details.</p>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <p className="text-sm font-medium text-white">Owner guidance</p>
            </div>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Use this page to model owner-side webhook management before wiring real signing secrets, retries, and delivery history.</p>
              <p>This is the right future surface for test sends, secret rotation, delivery failures, and endpoint health.</p>
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

function EditModal({ value, onClose, onSave }: { value: OwnerWebhookRecord; onClose: () => void; onSave: (value: OwnerWebhookRecord) => void; }) {
  const [draft, setDraft] = useState<OwnerWebhookRecord>(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-white">{value.id ? 'Edit owner webhook' : 'New owner webhook'}</p>
          <Button onClick={onClose}>Close</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input id="owner-webhook-label" name="ownerWebhookLabel" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Label" />
          <Input id="owner-webhook-tenant" name="ownerWebhookTenant" value={draft.tenant} onChange={(e) => setDraft({ ...draft, tenant: e.target.value })} placeholder="Tenant" />
          <Select id="owner-webhook-scope" name="ownerWebhookScope" value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value as OwnerWebhookScope })} options={[{ value: 'tenant', label: 'Tenant' }, { value: 'platform', label: 'Platform' }, { value: 'integration', label: 'Integration' }]} />
          <Select id="owner-webhook-status" name="ownerWebhookStatus" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as OwnerWebhookStatus })} options={[{ value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused' }, { value: 'failed', label: 'Failed' }]} />
          <Input id="owner-webhook-endpoint" name="ownerWebhookEndpoint" value={draft.endpoint} onChange={(e) => setDraft({ ...draft, endpoint: e.target.value })} placeholder="Endpoint" />
          <Input id="owner-webhook-events" name="ownerWebhookEvents" value={draft.events} onChange={(e) => setDraft({ ...draft, events: e.target.value })} placeholder="Events" />
          <Input id="owner-webhook-owner" name="ownerWebhookOwner" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="Owner" />
          <Input id="owner-webhook-last-delivery" name="ownerWebhookLastDelivery" value={draft.lastDeliveryAt} onChange={(e) => setDraft({ ...draft, lastDeliveryAt: e.target.value })} placeholder="Last delivery at" />
        </div>
        <div className="mt-3">
          <textarea
            id="owner-webhook-notes"
            name="ownerWebhookNotes"
            className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            placeholder="Notes"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <PrimaryButton onClick={() => onSave(draft)}>Save Webhook</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
