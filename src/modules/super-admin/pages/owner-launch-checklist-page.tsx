'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCheck, ClipboardCheck, PackageCheck, Rocket, Search } from 'lucide-react';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import type { OwnerOnboardingRecord } from '@/data/owner-onboarding';
import { ownerOnboardingService } from '@/services/owner-onboarding.service';

type LaunchFilter = 'all' | 'blocked' | 'ready' | 'live';
type ScoredRecord = OwnerOnboardingRecord & {
  checks: { invite: boolean; demo: boolean; deployment: boolean; status: boolean };
  completed: number;
  readiness: 'blocked' | 'ready' | 'live';
};

export function OwnerLaunchChecklistPage() {
  const [rows, setRows] = useState<OwnerOnboardingRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<LaunchFilter>('all');

  async function load() {
    const data = await ownerOnboardingService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const scored = useMemo<ScoredRecord[]>(() => rows.map((row) => {
    const checks = {
      invite: row.invitationState === 'accepted',
      demo: row.demoPack === 'approved',
      deployment: row.deploymentState === 'ready',
      status: row.status === 'ready_for_launch' || row.status === 'live'
    };
    const completed = Object.values(checks).filter(Boolean).length;
    const readiness = completed === 4 ? (row.status === 'live' ? 'live' : 'ready') : 'blocked';
    return { ...row, checks, completed, readiness };
  }), [rows]);

  const filtered = useMemo(() => scored.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || [row.tenantName, row.primaryContact, row.email, row.company, row.notes].join(' ').toLowerCase().includes(q);
    const matchesFilter = filter === 'all' || row.readiness === filter;
    return matchesQuery && matchesFilter;
  }), [scored, search, filter]);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((row) => row.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;
  const stats = useMemo(() => ({
    blocked: scored.filter((row) => row.readiness === 'blocked').length,
    ready: scored.filter((row) => row.readiness === 'ready').length,
    live: scored.filter((row) => row.readiness === 'live').length
  }), [scored]);

  async function patch(next: OwnerOnboardingRecord) {
    await ownerOnboardingService.save(next);
    await load();
    setSelectedId(next.id);
  }

  return (
    <div>
      <PageHeader
        title="Owner Launch Checklist"
        subtitle="Run final go-live checks across invite acceptance, demo approval, deployment readiness, and launch signoff before store activation."
        actions={<><Button onClick={() => ownerOnboardingService.reset().then(load)}>Reset Seed</Button><PrimaryButton onClick={() => selected ? patch({ ...selected, status: selected.status === 'live' ? 'live' : 'ready_for_launch' }) : undefined}>Mark Ready for Launch</PrimaryButton></>}
      />

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <MetricCard label="Blocked" value={String(stats.blocked)} />
        <MetricCard label="Ready" value={String(stats.ready)} />
        <MetricCard label="Live" value={String(stats.live)} />
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-[1.5fr_220px]">
        <Input id="owner-launch-search" name="ownerLaunchSearch" placeholder="Search tenant, contact, or notes" value={search} onChange={(e) => setSearch(e.target.value)} leftIcon={<Search className="h-4 w-4" />} />
        <Select id="owner-launch-filter" name="ownerLaunchFilter" value={filter} onChange={(e) => setFilter(e.target.value as LaunchFilter)} options={[
          { value: 'all', label: 'All records' },
          { value: 'blocked', label: 'Blocked' },
          { value: 'ready', label: 'Ready' },
          { value: 'live', label: 'Live' }
        ]} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-border px-4 py-3 text-sm font-medium">Launch queue</div>
          <div className="divide-y divide-border">
            {filtered.map((row) => (
              <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} className={`w-full px-4 py-4 text-left transition hover:bg-white/[0.03] ${selected?.id === row.id ? 'bg-white/[0.04]' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{row.tenantName}</p>
                    <p className="mt-1 text-sm text-textMuted">{row.primaryContact} · {row.region.toUpperCase()} · {row.billingPlan}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.24em] text-textMuted">{row.completed}/4 checks complete</p>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-xs uppercase tracking-[0.2em] ${row.readiness === 'live' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100' : row.readiness === 'ready' ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100' : 'border-amber-400/30 bg-amber-400/10 text-amber-100'}`}>{row.readiness}</span>
                </div>
              </button>
            ))}
            {!filtered.length && <div className="px-4 py-8 text-sm text-textMuted">No launch records match this filter.</div>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-cyan-300" /><p className="text-sm font-medium">Launch spotlight</p></div>
            {selected ? (
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-lg font-semibold text-white">{selected.tenantName}</p>
                  <p className="text-textMuted">{selected.company}</p>
                </div>
                <ChecklistRow label="Primary admin accepted" ok={selected.checks.invite} />
                <ChecklistRow label="Demo pack approved" ok={selected.checks.demo} />
                <ChecklistRow label="Deployment ready" ok={selected.checks.deployment} />
                <ChecklistRow label="Launch signed off" ok={selected.checks.status} />
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button onClick={() => patch({ ...selected, invitationState: 'accepted' })}><CheckCheck className="mr-2 h-4 w-4" />Accept Invite</Button>
                  <Button onClick={() => patch({ ...selected, demoPack: 'approved' })}><PackageCheck className="mr-2 h-4 w-4" />Approve Demo</Button>
                  <Button onClick={() => patch({ ...selected, deploymentState: 'ready' })}><Rocket className="mr-2 h-4 w-4" />Ready Deployment</Button>
                  <PrimaryButton onClick={() => patch({ ...selected, status: selected.status === 'live' ? 'live' : 'ready_for_launch' })}>Sign Off Launch</PrimaryButton>
                  <Button onClick={() => patch({ ...selected, status: 'live', deploymentState: 'ready', invitationState: 'accepted', demoPack: 'approved' })}>Activate Live</Button>
                </div>
              </div>
            ) : <p className="text-sm text-textMuted">Select a tenant to manage launch readiness.</p>}
          </Card>

          <Card className="p-4">
            <p className="text-sm font-medium">Owner guidance</p>
            <ul className="mt-3 space-y-2 text-sm text-textMuted">
              <li>Use this checklist as the final gate before store activation.</li>
              <li>“Ready” means all pre-launch checks are complete but the tenant is not yet live.</li>
              <li>Activate live only after invite, demo, and deployment are all complete.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return <Card className="p-4"><p className="text-xs uppercase text-textMuted">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></Card>;
}

function ChecklistRow({ label, ok }: { label: string; ok: boolean }) {
  return <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2"><span>{label}</span><span className={`rounded-full px-2 py-1 text-xs uppercase tracking-[0.2em] ${ok ? 'bg-emerald-400/10 text-emerald-200' : 'bg-amber-400/10 text-amber-200'}`}>{ok ? 'done' : 'pending'}</span></div>;
}
