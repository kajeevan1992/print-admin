'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Save, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';

type Owner = { id: string; name: string; email: string; role: string; isActive: boolean; tenantName: string | null; tenantSlug: string | null; lastLoginAt: string | null };
type Shop = { id: string; name: string; slug: string; status: string; defaultSubdomain: string; ownerCount: number };
type Report = { roles: string[]; shops: Shop[]; owners: Owner[] };

type FormState = { tenantSlug: string; tenantName: string; defaultSubdomain: string; ownerName: string; ownerEmail: string; loginSecret: string; role: string; isActive: boolean };

const initialForm: FormState = { tenantSlug: 'holo-print', tenantName: 'HOLO Print', defaultSubdomain: 'holo-print', ownerName: '', ownerEmail: '', loginSecret: '', role: 'TENANT_OWNER', isActive: true };
function title(value: string) { return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()); }
function statusTone(active: boolean) { return active ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-red-500/30 bg-red-500/10 text-red-100'; }

export function WebsiteOwnerSetupPage() {
  const [report, setReport] = useState<Report>({ roles: [], shops: [], owners: [] });
  const [form, setForm] = useState<FormState>(initialForm);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/internal/platform/shop-owner', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Shop owner setup failed to load.');
      setReport(payload.data);
      setMessage('Website owner setup refreshed.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Shop owner setup failed to load.');
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const response = await fetch('/api/internal/platform/shop-owner', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Could not save website owner.');
      setReport({ roles: payload.data.roles, shops: payload.data.shops, owners: payload.data.owners });
      setForm((current) => ({ ...current, ownerName: '', ownerEmail: '', loginSecret: '' }));
      setMessage('Website owner account saved. They can now login as a normal tenant admin.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save website owner.');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(owner: Owner) {
    try {
      const response = await fetch('/api/internal/platform/shop-owner', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'status', email: owner.email, isActive: !owner.isActive }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Could not update status.');
      setReport({ roles: payload.data.roles, shops: payload.data.shops, owners: payload.data.owners });
      setMessage(owner.isActive ? 'Website owner suspended.' : 'Website owner restored.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update status.');
    }
  }

  useEffect(() => { void load(); }, []);
  const selectedShop = useMemo(() => report.shops.find((shop) => shop.slug === form.tenantSlug), [report.shops, form.tenantSlug]);

  return <div className="space-y-4">
    <PageHeader title="Website Owner Setup" subtitle="Build 60 creates real DB-backed tenant owners/admins for shops. It reuses Tenant/User auth tables and does not use dummy admin records." actions={<Button onClick={() => void load()} disabled={loading || saving}><RefreshCw size={14} /> Refresh</Button>} />
    {message ? <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}
    <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
      <Card className="space-y-3"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]"><UserPlus size={20} /></div><div><h3 className="text-sm font-semibold text-white">Create / update website owner</h3><p className="text-xs text-textMuted">For HOLO Print or any future tenant.</p></div></div>
        <Field label="Tenant slug"><Input value={form.tenantSlug} onChange={(event) => setForm({ ...form, tenantSlug: event.target.value, defaultSubdomain: event.target.value })} /></Field>
        <Field label="Tenant name"><Input value={form.tenantName} onChange={(event) => setForm({ ...form, tenantName: event.target.value })} /></Field>
        <Field label="Default subdomain"><Input value={form.defaultSubdomain} onChange={(event) => setForm({ ...form, defaultSubdomain: event.target.value })} /></Field>
        <Field label="Owner/admin name"><Input value={form.ownerName} onChange={(event) => setForm({ ...form, ownerName: event.target.value })} placeholder="Example: HOLO Admin" /></Field>
        <Field label="Owner/admin email"><Input value={form.ownerEmail} onChange={(event) => setForm({ ...form, ownerEmail: event.target.value })} placeholder="admin@holoprint.co.uk" /></Field>
        <Field label="Login password"><Input type="password" value={form.loginSecret} onChange={(event) => setForm({ ...form, loginSecret: event.target.value })} placeholder="Required for new account" /></Field>
        <Field label="Role"><Select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} options={(report.roles.length ? report.roles : ['TENANT_OWNER', 'TENANT_ADMIN', 'TENANT_STAFF']).map((role) => ({ value: role, label: title(role) }))} /></Field>
        <label className="flex items-center gap-2 text-sm text-white"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /> Active login</label>
        <PrimaryButton onClick={() => void save()} disabled={saving}><Save size={14} /> Save website owner</PrimaryButton>
      </Card>
      <div className="space-y-4"><div className="grid gap-4 md:grid-cols-3"><Metric label="Shops" value={report.shops.length} /><Metric label="Website owners" value={report.owners.length} /><Metric label="Selected shop" value={selectedShop?.name || form.tenantName || '-'} /></div>
        <Card><h3 className="mb-3 text-sm font-semibold text-white">Existing website owner logins</h3><div className="grid gap-3">{report.owners.map((owner) => <div key={owner.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><div className="flex flex-wrap justify-between gap-3"><div><p className="text-sm font-semibold text-white">{owner.name}</p><p className="text-xs text-textMuted">{owner.email}</p></div><span className={`h-fit rounded-full border px-2.5 py-1 text-xs ${statusTone(owner.isActive)}`}>{owner.isActive ? 'Active' : 'Suspended'}</span></div><div className="mt-3 grid gap-2 text-xs text-textMuted md:grid-cols-3"><p>Tenant: <span className="text-white">{owner.tenantSlug || '-'}</span></p><p>Role: <span className="text-white">{title(owner.role)}</span></p><p>Last login: <span className="text-white">{owner.lastLoginAt || 'Never'}</span></p></div><div className="mt-3"><Button onClick={() => void toggle(owner)}>{owner.isActive ? 'Suspend login' : 'Restore login'}</Button></div></div>)}{!loading && !report.owners.length ? <p className="text-sm text-textMuted">No website owner logins yet.</p> : null}</div></Card>
        <Card><h3 className="mb-3 text-sm font-semibold text-white">Tenant shops</h3><div className="grid gap-2">{report.shops.map((shop) => <div key={shop.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm"><p className="font-semibold text-white">{shop.name}</p><p className="text-xs text-textMuted">/{shop.slug} · {shop.ownerCount} owner/admin login(s)</p></div>)}</div></Card>
      </div>
    </div>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1 block text-xs uppercase tracking-wide text-textMuted">{label}</span>{children}</label>; }
function Metric({ label, value }: { label: string; value: string | number }) { return <Card><p className="text-xs uppercase tracking-wide text-textMuted">{label}</p><p className="mt-2 break-words text-xl font-semibold text-white">{value}</p></Card>; }
