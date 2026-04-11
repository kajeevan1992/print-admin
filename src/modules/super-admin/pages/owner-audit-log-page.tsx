
'use client';

import { useEffect, useMemo, useState } from 'react';
import { History, Search, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Button } from '@/components/ui/buttons';
import type { OwnerAuditDomain, OwnerAuditRecord, OwnerAuditSeverity } from '@/data/owner-audit-log';
import { ownerAuditLogService } from '@/services/owner-audit-log.service';

type DomainFilter = 'all' | OwnerAuditDomain;
type SeverityFilter = 'all' | OwnerAuditSeverity;

const severityTone: Record<OwnerAuditSeverity, string> = {
  info: 'border-sky-400/25 bg-sky-400/10 text-sky-200',
  watch: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
  critical: 'border-rose-400/25 bg-rose-400/10 text-rose-200'
};

export function OwnerAuditLogPage() {
  const [rows, setRows] = useState<OwnerAuditRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [domain, setDomain] = useState<DomainFilter>('all');
  const [severity, setSeverity] = useState<SeverityFilter>('all');

  async function load() {
    const data = await ownerAuditLogService.list();
    setRows(data);
    setSelectedId((current) => current ?? data[0]?.id ?? null);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || [row.actor, row.tenant, row.action, row.summary, row.domain].join(' ').toLowerCase().includes(q);
    const matchesDomain = domain === 'all' || row.domain === domain;
    const matchesSeverity = severity === 'all' || row.severity === severity;
    return matchesQuery && matchesDomain && matchesSeverity;
  }), [rows, search, domain, severity]);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((row) => row.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div>
      <PageHeader
        title="Owner Audit Log"
        subtitle="Review owner-side actions across auth, tenants, billing, and deployments before wiring real event streams and database history."
        actions={<Button onClick={() => ownerAuditLogService.reset().then(load)}>Reset Seed</Button>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1.6fr_220px_220px]">
        <Input
          id="owner-audit-search"
          name="ownerAuditSearch"
          placeholder="Search actor, tenant, action, or summary"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leadingIcon={<Search className="h-4 w-4" />}
        />
        <Select
          id="owner-audit-domain"
          name="ownerAuditDomain"
          value={domain}
          onChange={(e) => setDomain(e.target.value as DomainFilter)}
          options={[
            { value: 'all', label: 'All domains' },
            { value: 'auth', label: 'Auth' },
            { value: 'tenant', label: 'Tenant' },
            { value: 'billing', label: 'Billing' },
            { value: 'deployment', label: 'Deployment' }
          ]}
        />
        <Select
          id="owner-audit-severity"
          name="ownerAuditSeverity"
          value={severity}
          onChange={(e) => setSeverity(e.target.value as SeverityFilter)}
          options={[
            { value: 'all', label: 'All severity' },
            { value: 'info', label: 'Info' },
            { value: 'watch', label: 'Watch' },
            { value: 'critical', label: 'Critical' }
          ]}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/6 px-4 py-3 text-sm text-textMuted">Owner action history</div>
          <div className="divide-y divide-white/6">
            {filtered.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelectedId(row.id)}
                className={`grid w-full gap-2 px-4 py-4 text-left transition hover:bg-white/4 ${selectedId === row.id ? 'bg-white/6' : ''}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{row.action}</p>
                    <p className="text-xs text-textMuted">{row.tenant} · {row.domain} · {row.actor}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${severityTone[row.severity]}`}>{row.severity}</span>
                </div>
                <p className="text-sm text-textMuted">{row.summary}</p>
              </button>
            ))}
            {!filtered.length && <div className="px-4 py-10 text-sm text-textMuted">No audit events match the current filters.</div>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <p className="text-sm font-medium text-white">Event spotlight</p>
            </div>
            {selected ? (
              <div className="space-y-3 text-sm">
                <MiniStat label="Actor" value={selected.actor} />
                <MiniStat label="Tenant" value={selected.tenant} />
                <MiniStat label="Domain" value={selected.domain} />
                <MiniStat label="When" value={selected.happenedAt} />
                <MiniStat label="Severity" value={selected.severity} />
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-textMuted">Summary</p>
                  <p className="mt-1 text-textMuted">{selected.summary}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">Pick an event to review owner-side history.</p>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <History className="h-4 w-4 text-sky-300" />
              <p className="text-sm font-medium text-white">Owner guidance</p>
            </div>
            <div className="space-y-2 text-sm text-textMuted">
              <p>Keep this log focused on high-value owner actions until a real audit/event stream is wired to the API and database.</p>
              <p>This page is the right place later for immutable audit history, export, filtering, and compliance visibility.</p>
            </div>
          </Card>
        </div>
      </div>
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
