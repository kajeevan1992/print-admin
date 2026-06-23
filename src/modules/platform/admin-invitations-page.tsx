'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Send, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';

type Report = { roles: string[]; tenants: Array<{ id: string; name: string; slug: string }>; users: Array<{ id: string; email: string; name: string; role: string; tenantSlug: string }>; invitations: Array<{ id: string; email: string; role: string; status: string; tenantSlug: string; expiresAt: string | null }> };
const empty = { tenantId: '', email: '', name: '', role: 'TENANT_ADMIN', expiresInDays: 7 };
function label(value: string) { return value.replace(/_/g, ' ').toLowerCase(); }

export function AdminInvitationsPage() {
  const [report, setReport] = useState<Report>({ roles: [], tenants: [], users: [], invitations: [] });
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/internal/platform/admin-invitations', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Could not load admin invitations.');
      setReport(payload.data);
      setForm((current) => ({ ...current, tenantId: current.tenantId || payload.data.tenants?.[0]?.id || '' }));
      setMessage('Admin users refreshed.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not load admin invitations.'); }
    finally { setLoading(false); }
  }
  async function createInvite() {
    setLoading(true);
    try {
      const response = await fetch('/api/internal/platform/admin-invitations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Could not create invitation.');
      setReport(payload.data);
      setInviteUrl(payload.data.invitation?.inviteUrl || '');
      setForm({ ...empty, tenantId: form.tenantId });
      setMessage('Invitation created. Copy the invite link and send it to the admin.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not create invitation.'); }
    finally { setLoading(false); }
  }
  async function revoke(id: string) {
    setLoading(true);
    try {
      const response = await fetch(`/api/internal/platform/admin-invitations?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Could not revoke invitation.');
      setReport(payload.data);
      setMessage('Invitation revoked.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not revoke invitation.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  return <div className="space-y-4">
    <PageHeader title="Admin Users" subtitle="DB-backed admin users and invitation links." actions={<Button onClick={() => void load()} disabled={loading}><RefreshCw size={14} /> Refresh</Button>} />
    {message ? <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-textMuted">{message}</div> : null}
    {inviteUrl ? <Card><p className="text-xs uppercase tracking-wide text-textMuted">New invite link</p><Input value={inviteUrl} readOnly /></Card> : null}
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Card className="space-y-3"><h3 className="text-sm font-semibold text-white">Invite admin</h3><Select value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value })} options={report.tenants.map((t) => ({ value: t.id, label: `${t.name} / ${t.slug}` }))} /><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="admin@email.co.uk" /><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" /><Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} options={(report.roles.length ? report.roles : ['TENANT_OWNER','TENANT_ADMIN','TENANT_STAFF']).filter((r) => r !== 'SUPERADMIN').map((r) => ({ value: r, label: label(r) }))} /><Input type="number" value={String(form.expiresInDays)} onChange={(e) => setForm({ ...form, expiresInDays: Number(e.target.value) || 7 })} /><PrimaryButton onClick={() => void createInvite()} disabled={loading}><Send size={14} /> Create invite</PrimaryButton></Card>
      <div className="space-y-4"><Card><h3 className="mb-3 text-sm font-semibold text-white">Invitations</h3><div className="grid gap-2">{report.invitations.map((i) => <div key={i.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm"><p className="font-semibold text-white">{i.email}</p><p className="text-xs text-textMuted">{i.tenantSlug} · {label(i.role)} · {i.status}</p>{i.status === 'PENDING' ? <Button onClick={() => void revoke(i.id)}><Trash2 size={14} /> Revoke</Button> : null}</div>)}</div></Card><Card><h3 className="mb-3 text-sm font-semibold text-white">Admin users</h3><div className="grid gap-2">{report.users.map((u) => <div key={u.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm"><p className="font-semibold text-white">{u.name}</p><p className="text-xs text-textMuted">{u.email} · {label(u.role)} · {u.tenantSlug || 'platform'}</p></div>)}</div></Card></div>
    </div>
  </div>;
}
