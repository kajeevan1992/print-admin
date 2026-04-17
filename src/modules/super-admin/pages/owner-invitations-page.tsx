'use client';

import { useEffect, useMemo, useState } from 'react';
import { Mail, Search, ShieldCheck, UserPlus, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { ownerOnboardingService } from '@/services/owner-onboarding.service';
import type { OwnerOnboardingRecord } from '@/data/owner-onboarding';

type InviteFilter = 'all' | 'not_sent' | 'sent' | 'accepted';

const emptyRecord: OwnerOnboardingRecord = {
  id: '',
  tenantName: '',
  primaryContact: '',
  email: '',
  company: '',
  billingPlan: 'starter',
  region: 'uk',
  seats: 5,
  stores: 1,
  status: 'draft',
  invitationState: 'not_sent',
  deploymentState: 'not_started',
  demoPack: 'none',
  notes: ''
};

export function OwnerInvitationsPage() {
  const [rows, setRows] = useState<OwnerOnboardingRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<InviteFilter>('all');
  const [editing, setEditing] = useState<OwnerOnboardingRecord | null>(null);
  const [form, setForm] = useState<OwnerOnboardingRecord>(emptyRecord);

  async function load() {
    const data = await ownerOnboardingService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const query = search.trim().toLowerCase();
    const matchesQuery = !query || [row.tenantName, row.primaryContact, row.email, row.company].join(' ').toLowerCase().includes(query);
    const matchesFilter = filter === 'all' || row.invitationState === filter;
    return matchesQuery && matchesFilter;
  }), [rows, search, filter]);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((row) => row.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  const stats = useMemo(() => ({
    draft: rows.filter((row) => row.invitationState === 'not_sent').length,
    pending: rows.filter((row) => row.invitationState === 'sent').length,
    accepted: rows.filter((row) => row.invitationState === 'accepted').length
  }), [rows]);

  function startCreate() {
    const nextId = `onb-${Date.now()}`;
    const draft = { ...emptyRecord, id: nextId };
    setForm(draft);
    setEditing(draft);
  }

  function startEdit(record: OwnerOnboardingRecord) {
    setForm(record);
    setEditing(record);
  }

  async function save() {
    if (!form.tenantName.trim() || !form.email.trim()) return;
    await ownerOnboardingService.save(form);
    await load();
    setSelectedId(form.id);
    setEditing(null);
  }

  async function patch(record: OwnerOnboardingRecord) {
    await ownerOnboardingService.save(record);
    await load();
    setSelectedId(record.id);
  }

  async function removeSelected() {
    if (!selected) return;
    await ownerOnboardingService.remove(selected.id);
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Owner Invitations"
        subtitle="Control first-admin invites, resend onboarding access, and track invite acceptance before wiring real email delivery."
        actions={
          <>
            <Button onClick={() => ownerOnboardingService.reset().then(load)}>Reset Seed</Button>
            <PrimaryButton onClick={startCreate}>Invite Tenant Admin</PrimaryButton>
          </>
        }
      />

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <Card className="p-4"><p className="text-xs uppercase text-textMuted">Not sent</p><p className="mt-2 text-2xl font-semibold">{stats.draft}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase text-textMuted">Pending acceptance</p><p className="mt-2 text-2xl font-semibold">{stats.pending}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase text-textMuted">Accepted</p><p className="mt-2 text-2xl font-semibold">{stats.accepted}</p></Card>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-[1.5fr_220px]">
        <Input id="owner-invitations-search" name="ownerInvitationsSearch" placeholder="Search tenant, contact, || email" value={search} onChange={(e) => setSearch(e.target.value)} leftIcon={<Search className="h-4 w-4" />} />
        <Select id="owner-invitations-filter" name="ownerInvitationsFilter" value={filter} onChange={(e) => setFilter(e.target.value as InviteFilter)} options={[
          { value: 'all', label: 'All invitations' },
          { value: 'not_sent', label: 'Not sent' },
          { value: 'sent', label: 'Sent' },
          { value: 'accepted', label: 'Accepted' }
        ]} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-border px-4 py-3 text-sm font-medium">Invitation queue</div>
          <div className="divide-y divide-border">
            {filtered.map((row) => (
              <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} className={`w-full px-4 py-4 text-left transition hover:bg-white/[0.03] ${selected?.id === row.id ? 'bg-white/[0.04]' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{row.tenantName}</p>
                    <p className="mt-1 text-sm text-textMuted">{row.primaryContact} · {row.email}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.24em] text-textMuted">{row.billingPlan} · {row.region}</p>
                  </div>
                  <span className="rounded-full border border-white/10 px-2 py-1 text-xs capitalize text-textMuted">{row.invitationState.replace('_', ' ')}</span>
                </div>
              </button>
            ))}
            {!filtered.length && <div className="px-4 py-8 text-sm text-textMuted">No invitation records match this filter.</div>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-cyan-300" />
              <p className="text-sm font-medium">Invitation spotlight</p>
            </div>
            {selected ? (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium">{selected.tenantName}</p>
                  <p className="text-textMuted">{selected.company}</p>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <div><p className="text-xs uppercase text-textMuted">Primary contact</p><p>{selected.primaryContact}</p></div>
                  <div><p className="text-xs uppercase text-textMuted">Email</p><p>{selected.email}</p></div>
                  <div><p className="text-xs uppercase text-textMuted">Invite state</p><p className="capitalize">{selected.invitationState.replace('_', ' ')}</p></div>
                  <div><p className="text-xs uppercase text-textMuted">Launch state</p><p className="capitalize">{selected.status.replaceAll('_', ' ')}</p></div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button onClick={() => patch({ ...selected, invitationState: 'sent' })}><Mail className="mr-2 h-4 w-4" />Send / Resend</Button>
                  <Button onClick={() => patch({ ...selected, invitationState: 'accepted', status: selected.status === 'draft' ? 'configuring' : selected.status })}>Accept Invite</Button>
                  <Button onClick={() => startEdit(selected)}>Edit</Button>
                  <Button onClick={removeSelected}><XCircle className="mr-2 h-4 w-4" />Delete</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">Select an onboarding record to manage its invitation.</p>
            )}
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-fuchsia-300" />
              <p className="text-sm font-medium">{editing ? 'Edit invitation' : 'Quick create invite'}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input id="invite-tenant-name" name="inviteTenantName" placeholder="Tenant name" value={form.tenantName} onChange={(e) => setForm((current) => ({ ...current, tenantName: e.target.value, company: current.company || e.target.value }))} />
              <Input id="invite-company" name="inviteCompany" placeholder="Company" value={form.company} onChange={(e) => setForm((current) => ({ ...current, company: e.target.value }))} />
              <Input id="invite-contact" name="inviteContact" placeholder="Primary contact" value={form.primaryContact} onChange={(e) => setForm((current) => ({ ...current, primaryContact: e.target.value }))} />
              <Input id="invite-email" name="inviteEmail" placeholder="Email" value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} />
              <Select id="invite-plan" name="invitePlan" value={form.billingPlan} onChange={(e) => setForm((current) => ({ ...current, billingPlan: e.target.value as OwnerOnboardingRecord['billingPlan'] }))} options={[
                { value: 'starter', label: 'Starter' },
                { value: 'growth', label: 'Growth' },
                { value: 'enterprise', label: 'Enterprise' }
              ]} />
              <Select id="invite-region" name="inviteRegion" value={form.region} onChange={(e) => setForm((current) => ({ ...current, region: e.target.value as OwnerOnboardingRecord['region'] }))} options={[
                { value: 'uk', label: 'UK' },
                { value: 'eu', label: 'EU' },
                { value: 'us', label: 'US' }
              ]} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <PrimaryButton onClick={save}>{editing ? 'Save Invite' : 'Create Invite'}</PrimaryButton>
              <Button onClick={() => { setEditing(null); setForm(emptyRecord); }}>Clear</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
