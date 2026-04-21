'use client';

import { useEffect, useMemo, useState } from 'react';
import { KeyRound, Search, Shield, TriangleAlert, Users2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { BaseModal } from '@/components/modals/base-modal';
import { adminUsersService } from '@/services/admin-users.service';
import type { AdminRole, AdminStatus, AdminUserRecord } from '@/data/admin-users';

const roleOptions: Array<'all' | AdminRole> = ['all', 'super_admin', 'ops_admin', 'finance_admin', 'support_admin'];
const statusOptions: Array<'all' | AdminStatus> = ['all', 'active', 'invited', 'suspended'];

const riskTone = {
  healthy: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
  watch: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
  critical: 'border-rose-400/25 bg-rose-400/10 text-rose-200'
} as const;

const statusTone = {
  active: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-200',
  invited: 'border-violet-400/25 bg-violet-400/10 text-violet-200',
  suspended: 'border-slate-400/25 bg-slate-400/10 text-slate-200'
} as const;

const emptyRecord: AdminUserRecord = {
  id: '',
  name: '',
  email: '',
  role: 'ops_admin',
  status: 'invited',
  scope: '',
  twoFactor: false,
  lastActive: 'Invite pending',
  environments: ['staging'],
  risk: 'healthy',
  notes: ''
};

function titleCase(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function AdminUsersPage() {
  const [rows, setRows] = useState<AdminUserRecord[]>([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<'all' | AdminRole>('all');
  const [status, setStatus] = useState<'all' | AdminStatus>('all');
  const [editing, setEditing] = useState<AdminUserRecord | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function load() {
    const data = await adminUsersService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const haystack = `${row.name} ${row.email} ${row.scope} ${row.notes}`.toLowerCase();
    const matchesSearch = !search || haystack.includes(search.toLowerCase());
    const matchesRole = role === 'all' || row.role === role;
    const matchesStatus = status === 'all' || row.status === status;
    return matchesSearch && matchesRole && matchesStatus;
  }), [rows, search, role, status]);

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

  const kpis = useMemo(() => ({
    active: filtered.filter((item) => item.status === 'active').length,
    invited: filtered.filter((item) => item.status === 'invited').length,
    protected: filtered.filter((item) => item.twoFactor).length,
    atRisk: filtered.filter((item) => item.risk !== 'healthy').length
  }), [filtered]);

  async function save(record: AdminUserRecord) {
    await adminUsersService.save(record);
    setEditing(null);
    await load();
    setSelectedId(record.id);
  }

  async function remove(record: AdminUserRecord) {
    await adminUsersService.remove(record.id);
    await load();
  }

  async function resetAll() {
    await adminUsersService.reset();
    await load();
  }

  async function toggleSuspended(record: AdminUserRecord) {
    await adminUsersService.save({
      ...record,
      status: record.status === 'suspended' ? 'active' : 'suspended',
      risk: record.status === 'suspended' ? 'healthy' : 'critical',
      lastActive: record.status === 'suspended' ? 'Today, just now' : record.lastActive
    });
    await load();
  }

  async function enforceTwoFactor(record: AdminUserRecord) {
    await adminUsersService.save({ ...record, twoFactor: true, risk: 'healthy' });
    await load();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Admin Users"
        subtitle="Manage elevated SaaS-owner accounts, access level, environment reach, and security posture."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => resetAll()}>Reset</Button>
            <PrimaryButton onClick={() => setEditing({ ...emptyRecord, id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}` })}>Invite Admin</PrimaryButton>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.85fr]">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <StatCard icon={Users2} label="Active admins" value={String(kpis.active)} />
            <StatCard icon={Shield} label="Invites pending" value={String(kpis.invited)} />
            <StatCard icon={KeyRound} label="2FA enforced" value={String(kpis.protected)} />
            <StatCard icon={TriangleAlert} label="At risk" value={String(kpis.atRisk)} />
          </div>

          <Card className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search admins" icon={<Search className="size-4" />} />
              <Select value={role} onChange={(event) => setRole(event.target.value as 'all' | AdminRole)} options={roleOptions.map((item) => ({ value: item, label: item === 'all' ? 'All roles' : titleCase(item) }))} />
              <Select value={status} onChange={(event) => setStatus(event.target.value as 'all' | AdminStatus)} options={statusOptions.map((item) => ({ value: item, label: item === 'all' ? 'All statuses' : titleCase(item) }))} />
            </div>

            <div className="grid gap-3">
              {filtered.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelectedId(row.id)}
                  className={`rounded-2xl border p-4 text-left transition ${selected?.id === row.id ? 'border-cyan-400/40 bg-cyan-400/10' : 'border-white/8 bg-white/[0.03] hover:border-white/15'}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{row.name}</p>
                      <p className="text-xs text-textMuted">{row.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      <span className={`rounded-full border px-2 py-1 ${statusTone[row.status]}`}>{titleCase(row.status)}</span>
                      <span className={`rounded-full border px-2 py-1 ${riskTone[row.risk]}`}>{titleCase(row.risk)}</span>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-textMuted md:grid-cols-3">
                    <p>Role: <span className="text-white">{titleCase(row.role)}</span></p>
                    <p>2FA: <span className="text-white">{row.twoFactor ? 'Enforced' : 'Not enforced'}</span></p>
                    <p>Last active: <span className="text-white">{row.lastActive}</span></p>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Admin spotlight</p>
              <p className="mt-2 text-lg font-semibold text-white">{selected?.name ?? 'Select an admin'}</p>
              <p className="text-sm text-textMuted">{selected?.scope ?? 'Review elevated access and owner-console responsibilities.'}</p>
            </div>

            {selected ? (
              <div className="space-y-3 text-sm">
                <Metric label="Email" value={selected.email} />
                <Metric label="Role" value={titleCase(selected.role)} />
                <Metric label="Status" value={titleCase(selected.status)} />
                <Metric label="Environment reach" value={selected.environments.join(', ')} />
                <Metric label="Security" value={selected.twoFactor ? 'Two-factor enforced' : 'Needs two-factor'} />
                <Metric label="Notes" value={selected.notes || 'No notes'} />

                <div className="grid gap-2 pt-2">
                  <PrimaryButton onClick={() => setEditing(selected)}>Edit admin</PrimaryButton>
                  <Button onClick={() => enforceTwoFactor(selected)}>Enforce 2FA</Button>
                  <Button onClick={() => toggleSuspended(selected)}>{selected.status === 'suspended' ? 'Restore access' : 'Suspend access'}</Button>
                  <Button onClick={() => remove(selected)}>Delete admin</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">No admin matches the current filters.</p>
            )}
          </Card>

          <Card className="space-y-3">
            <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Owner guidance</p>
            <ul className="space-y-2 text-sm text-textMuted">
              <li>Keep finance and deployment permissions separated where possible.</li>
              <li>Enforce two-factor before granting production environment reach.</li>
              <li>Suspend unused elevated accounts quickly to reduce tenant risk.</li>
            </ul>
          </Card>
        </div>
      </div>

      <BaseModal
        open={!!editing}
        title={editing?.id ? 'Admin user' : 'Invite admin'}
        onClose={() => setEditing(null)}
      >
        {editing ? (
          <div className="space-y-3">
            <Input label="Name" value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} />
            <Input label="Email" value={editing.email} onChange={(event) => setEditing({ ...editing, email: event.target.value })} />
            <Input label="Scope" value={editing.scope} onChange={(event) => setEditing({ ...editing, scope: event.target.value })} />
            <Select label="Role" value={editing.role} onChange={(event) => setEditing({ ...editing, role: event.target.value as AdminRole })} options={roleOptions.filter((item): item is AdminRole => item !== 'all').map((item) => ({ value: item, label: titleCase(item) }))} />
            <Select label="Status" value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value as AdminStatus })} options={statusOptions.filter((item): item is AdminStatus => item !== 'all').map((item) => ({ value: item, label: titleCase(item) }))} />
            <Select label="Risk" value={editing.risk} onChange={(event) => setEditing({ ...editing, risk: event.target.value as AdminUserRecord['risk'] })} options={['healthy', 'watch', 'critical'].map((item) => ({ value: item, label: titleCase(item) }))} />
            <Input label="Environment reach" value={editing.environments.join(', ')} onChange={(event) => setEditing({ ...editing, environments: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} />
            <Input label="Notes" value={editing.notes} onChange={(event) => setEditing({ ...editing, notes: event.target.value })} />
            <div className="flex items-center gap-2">
              <input id="admin-2fa" name="admin-2fa" type="checkbox" checked={editing.twoFactor} onChange={(event) => setEditing({ ...editing, twoFactor: event.target.checked })} />
              <label htmlFor="admin-2fa" className="text-sm text-white">Two-factor required</label>
            </div>
            <PrimaryButton onClick={() => save(editing)}>Save admin user</PrimaryButton>
          </div>
        ) : null}
      </BaseModal>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users2; label: string; value: string }) {
  return (
    <Card className="space-y-3">
      <div className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-cyan-200">
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-textMuted">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
      </div>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
      <p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">{label}</p>
      <p className="mt-1 text-sm text-white">{value}</p>
    </div>
  );
}
