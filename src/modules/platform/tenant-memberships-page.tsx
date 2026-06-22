'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';

type Tenant = { id: string; name: string; slug: string; status: string };
type Membership = { id: string; tenantId: string; tenantName: string; tenantSlug: string; userId: string; email: string; name: string; role: string; status: string; permissions: Record<string, boolean>; updatedAt: string };
type Report = { permissions: string[]; roles: string[]; defaults: Record<string, Record<string, boolean>>; tenants: Tenant[]; memberships: Membership[] };
type FormState = { tenantId: string; email: string; name: string; role: string; status: string };
const empty: FormState = { tenantId: '', email: '', name: '', role: 'TENANT_STAFF', status: 'ACTIVE' };
function title(value: string) { return value.replace(/[:_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }
function pill(status: string) { return status === 'ACTIVE' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-amber-500/30 bg-amber-500/10 text-amber-100'; }

export function TenantMembershipsPage() {
  const [report, setReport] = useState<Report>({ permissions: [], roles: [], defaults: {}, tenants: [], memberships: [] });
  const [form, setForm] = useState<FormState>(empty);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    try { const response = await fetch('/api/internal/platform/tenant-memberships', { cache: 'no-store' }); const payload = await response.json().catch(() => ({})); if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Memberships could not load.'); setReport(payload.data); setForm((current) => ({ ...current, tenantId: current.tenantId || payload.data.tenants?.[0]?.id || '' })); setMessage('Memberships refreshed.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Memberships could not load.'); }
    finally { setLoading(false); }
  }
  async function save() {
    setSaving(true);
    try { const response = await fetch('/api/internal/platform/tenant-memberships', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); const payload = await response.json().catch(() => ({})); if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Membership could not be saved.'); setReport(payload.data); setForm({ ...empty, tenantId: form.tenantId }); setMessage('Tenant membership saved.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Membership could not be saved.'); }
    finally { setSaving(false); }
  }
  async function remove(id: string) {
    try { const response = await fetch(`/api/internal/platform/tenant-memberships?id=${encodeURIComponent(id)}`, { method: 'DELETE' }); const payload = await response.json().catch(() => ({})); if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Membership could not be removed.'); setReport(payload.data); setMessage('Tenant membership removed.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Membership could not be removed.'); }
  }
  useEffect(() => { void load(); }, []);
  const tenantOptions = useMemo(() => report.tenants.map((tenant) => ({ value: tenant.id, label: `${tenant.name} / ${tenant.slug}` })), [report.tenants]);
  const roleOptions = useMemo(() => (report.roles.length ? report.roles : ['TENANT_OWNER','TENANT_ADMIN','TENANT_STAFF']).map((role) => ({ value: role, label: title(role) })), [report.roles]);
  return <div className="space-y-4"><PageHeader title="Tenant Memberships" subtitle="Build 64 adds DB-backed memberships and a role permission matrix. It reuses Tenant/User and does not replace shop login setup." actions={<Button onClick={() => void load()} disabled={loading || saving}><RefreshCw size={14} /> Refresh</Button>} />{message ? <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}<div className="grid gap-4 xl:grid-cols-[400px_1fr]"><Card className="space-y-3"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]"><ShieldCheck size={20} /></div><div><h3 className="text-sm font-semibold text-white">Add membership</h3><p className="text-xs text-textMuted">Assign an existing or new user to a tenant.</p></div></div><Field label="Tenant"><Select value={form.tenantId} onChange={(event) => setForm({ ...form, tenantId: event.target.value })} options={tenantOptions} /></Field><Field label="User email"><Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="admin@shop.co.uk" /></Field><Field label="Name"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Shop Admin" /></Field><Field label="Role"><Select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} options={roleOptions} /></Field><Field label="Status"><Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'SUSPENDED', label: 'Suspended' }]} /></Field><PrimaryButton onClick={() => void save()} disabled={saving}><Save size={14} /> Save membership</PrimaryButton></Card><div className="space-y-4"><div className="grid gap-4 md:grid-cols-3"><Metric label="Tenants" value={report.tenants.length} /><Metric label="Memberships" value={report.memberships.length} /><Metric label="Permissions" value={report.permissions.length} /></div><Card><h3 className="mb-3 text-sm font-semibold text-white">Active memberships</h3><div className="grid gap-3">{report.memberships.map((item) => <div key={item.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><div className="flex flex-wrap justify-between gap-3"><div><p className="text-sm font-semibold text-white">{item.name}</p><p className="text-xs text-textMuted">{item.email} · {item.tenantSlug}</p></div><span className={`h-fit rounded-full border px-2.5 py-1 text-xs ${pill(item.status)}`}>{item.status}</span></div><div className="mt-3 grid gap-2 text-xs text-textMuted md:grid-cols-3"><p>Tenant: <span className="text-white">{item.tenantName}</span></p><p>Role: <span className="text-white">{title(item.role)}</span></p><p>Allowed: <span className="text-white">{Object.values(item.permissions || {}).filter(Boolean).length}</span></p></div><div className="mt-3 flex gap-2"><Button onClick={() => setForm({ tenantId: item.tenantId, email: item.email, name: item.name, role: item.role, status: item.status })}>Edit</Button><Button onClick={() => void remove(item.id)}><Trash2 size={14} /> Remove</Button></div></div>)}{!loading && !report.memberships.length ? <p className="text-sm text-textMuted">No tenant memberships yet.</p> : null}</div></Card></div></div><Card><h3 className="mb-3 text-sm font-semibold text-white">Default permission matrix</h3><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-textMuted"><th className="p-2">Permission</th>{(report.roles.length ? report.roles : ['TENANT_OWNER','TENANT_ADMIN','TENANT_STAFF']).map((role) => <th key={role} className="p-2">{title(role)}</th>)}</tr></thead><tbody>{report.permissions.map((permission) => <tr key={permission} className="border-t border-white/8"><td className="p-2 text-white">{permission}</td>{(report.roles.length ? report.roles : ['TENANT_OWNER','TENANT_ADMIN','TENANT_STAFF']).map((role) => <td key={`${permission}-${role}`} className="p-2">{report.defaults?.[role]?.[permission] ? '✅' : '—'}</td>)}</tr>)}</tbody></table></div></Card></div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1 block text-xs uppercase tracking-wide text-textMuted">{label}</span>{children}</label>; }
function Metric({ label, value }: { label: string; value: string | number }) { return <Card><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></Card>; }
