'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Ban,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  KeyRound,
  Mail,
  MonitorSmartphone,
  NotebookPen,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  UserCheck,
  UserRound,
  UserX,
} from 'lucide-react';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { PageHeader } from '@/components/ui/page-header';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Card } from '@/components/ui/card';

type SecurityLevel = 'suspended' | 'attention' | 'verified' | 'protected';
type CustomerSummary = {
  id: string;
  email: string;
  name: string;
  phone: string;
  company: string;
  isActive: boolean;
  emailVerified: boolean;
  emailVerifiedAt: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  addressCount: number;
  activeSessions: number;
  trustedBrowsers: number;
  passkeys: number;
  twoStepEnabled: boolean;
  orderCount: number;
  orderTotalMinor: number;
  quoteCount: number;
  quoteTotalMinor: number;
  invoiceCount: number;
  invoicedMinor: number;
  creditedMinor: number;
  netRevenueMinor: number;
  storeSlugs: string[];
  securityLevel: SecurityLevel;
};
type CustomerDetail = CustomerSummary & {
  defaultStoreSlug: string;
  addresses: Array<Record<string, any>>;
  orders: Array<Record<string, any>>;
  quotes: Array<Record<string, any>>;
  invoices: Array<Record<string, any>>;
  sessions: Array<Record<string, any>>;
  trustedDevices: Array<Record<string, any>>;
  passkeyItems: Array<Record<string, any>>;
  supportNotes: Array<Record<string, any>>;
  audit: Array<Record<string, any>>;
};
type Metrics = { total: number; active: number; suspended: number; unverified: number; protected: number; activeSessions: number; netRevenueMinor: number };
type Tab = 'overview' | 'activity' | 'security' | 'notes';

const emptyMetrics: Metrics = { total: 0, active: 0, suspended: 0, unverified: 0, protected: 0, activeSessions: 0, netRevenueMinor: 0 };
function money(value: number, currency = 'GBP') { return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(Number(value || 0) / 100); }
function date(value: string, withTime = false) { try { return value ? new Intl.DateTimeFormat('en-GB', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }).format(new Date(value)) : '—'; } catch { return value || '—'; } }
function title(value: unknown) { return String(value || '').replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function securityTone(value: SecurityLevel) {
  if (value === 'protected') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  if (value === 'verified') return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200';
  if (value === 'attention') return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  return 'border-rose-500/30 bg-rose-500/10 text-rose-200';
}
async function api(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: 'no-store', ...init, headers: { Accept: 'application/json', ...(init?.headers || {}) } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Customer request failed.');
  return payload;
}

export function CustomersPage() {
  const [items, setItems] = useState<CustomerSummary[]>([]);
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [verification, setVerification] = useState('all');
  const [security, setSecurity] = useState('all');
  const [sort, setSort] = useState('activity');
  const [tab, setTab] = useState<Tab>('overview');
  const [storeSlug, setStoreSlug] = useState('');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const loadCustomers = useCallback(async (keepSelection = true) => {
    setBusy((current) => current || 'list');
    setError('');
    try {
      const params = new URLSearchParams({ search, sort, limit: '300' });
      if (status !== 'all') params.set('status', status);
      if (verification !== 'all') params.set('verification', verification);
      if (security !== 'all') params.set('security', security);
      const payload = await api(`/api/internal/customer-management?${params.toString()}`);
      const next = Array.isArray(payload?.data?.items) ? payload.data.items : [];
      setItems(next);
      setMetrics(payload?.data?.metrics || emptyMetrics);
      setSelectedId((current) => keepSelection && next.some((item: CustomerSummary) => item.id === current) ? current : next[0]?.id || '');
    } catch (next) {
      setError(next instanceof Error ? next.message : 'Customers could not be loaded.');
    } finally {
      setBusy((current) => current === 'list' ? '' : current);
    }
  }, [search, status, verification, security, sort]);

  const loadDetail = useCallback(async (customerId: string) => {
    if (!customerId) { setDetail(null); return; }
    setBusy('detail');
    setError('');
    try {
      const payload = await api(`/api/internal/customer-management/${encodeURIComponent(customerId)}`);
      const next = payload.data as CustomerDetail;
      setDetail(next);
      setStoreSlug((current) => current && next.storeSlugs.includes(current) ? current : next.defaultStoreSlug || next.storeSlugs[0] || '');
    } catch (next) {
      setError(next instanceof Error ? next.message : 'Customer details could not be loaded.');
      setDetail(null);
    } finally {
      setBusy('');
    }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void loadCustomers(), 180); return () => window.clearTimeout(timer); }, [loadCustomers]);
  useEffect(() => { void loadDetail(selectedId); }, [selectedId, loadDetail]);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) || null, [items, selectedId]);
  const storeOptions = useMemo(() => detail ? [...new Set([detail.defaultStoreSlug, ...detail.storeSlugs].filter(Boolean))] : [], [detail]);

  async function runAction(action: string, extra: Record<string, unknown> = {}, confirmation = '') {
    if (!detail) return;
    if (confirmation && !window.confirm(confirmation)) return;
    setBusy(action); setError(''); setNotice('');
    try {
      const payload = await api(`/api/internal/customer-management/${encodeURIComponent(detail.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, storeSlug, ...extra }),
      });
      setDetail(payload.data || null);
      setNotice(payload.notice || 'Customer account updated.');
      await loadCustomers(true);
    } catch (next) {
      setError(next instanceof Error ? next.message : 'Customer support action failed.');
    } finally {
      setBusy('');
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    await runAction('update-profile', values);
  }

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    await runAction('add-note', values);
    form.reset();
  }

  return <div className="space-y-6">
    <PageHeader
      title="Customers"
      subtitle="Real storefront customer accounts, commercial history, security posture and audited support controls."
      actions={<Button onClick={() => void loadCustomers(false)} disabled={busy === 'list'}><RefreshCw size={15} />Refresh</Button>}
    />

    {notice ? <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</div> : null}
    {error ? <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div> : null}

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      <Metric icon={UserRound} label="Customers" value={String(metrics.total)} />
      <Metric icon={UserCheck} label="Active" value={String(metrics.active)} />
      <Metric icon={UserX} label="Suspended" value={String(metrics.suspended)} />
      <Metric icon={Mail} label="Unverified" value={String(metrics.unverified)} />
      <Metric icon={ShieldCheck} label="Protected" value={String(metrics.protected)} />
      <Metric icon={CircleDollarSign} label="Net invoiced" value={money(metrics.netRevenueMinor)} />
    </div>

    <Card className="p-4">
      <div className="grid gap-3 xl:grid-cols-[minmax(280px,1fr)_160px_160px_160px_160px]">
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={16} /><Input className="pl-9" placeholder="Search name, email, phone, company or store" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <Select options={['all', 'active', 'suspended']} value={status} onChange={(event) => setStatus(event.target.value)} />
        <Select options={['all', 'verified', 'unverified']} value={verification} onChange={(event) => setVerification(event.target.value)} />
        <Select options={['all', 'protected', 'verified', 'attention', 'suspended']} value={security} onChange={(event) => setSecurity(event.target.value)} />
        <Select options={['activity', 'spend', 'created', 'name']} value={sort} onChange={(event) => setSort(event.target.value)} />
      </div>
    </Card>

    <div className="grid gap-4 xl:grid-cols-[minmax(360px,0.82fr)_minmax(0,1.6fr)]">
      <Card className="max-h-[calc(100vh-270px)] overflow-auto p-3">
        <div className="space-y-2">
          {items.map((customer) => <button key={customer.id} onClick={() => { setSelectedId(customer.id); setTab('overview'); setNotice(''); }} className={`w-full rounded-2xl border p-4 text-left transition ${selectedId === customer.id ? 'border-accent/50 bg-accent/10' : 'border-white/8 bg-panelMuted/30 hover:bg-white/[0.04]'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><div className="truncate font-semibold text-white">{customer.name}</div><div className="mt-1 truncate text-xs text-textMuted">{customer.company || customer.email}</div><div className="mt-1 truncate text-xs text-textMuted">{customer.company ? customer.email : customer.phone || 'No phone saved'}</div></div>
              <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${securityTone(customer.securityLevel)}`}>{title(customer.securityLevel)}</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <Mini label="Orders" value={String(customer.orderCount)} />
              <Mini label="Invoices" value={String(customer.invoiceCount)} />
              <Mini label="Net" value={money(customer.netRevenueMinor)} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-textMuted"><span>{customer.activeSessions} sessions</span><span>·</span><span>{customer.passkeys} passkeys</span><span>·</span><span>{date(customer.lastActivityAt)}</span></div>
          </button>)}
          {!items.length ? <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-textMuted">No storefront customer accounts match these filters.</div> : null}
        </div>
      </Card>

      <Card className="min-h-[620px]">
        {busy === 'detail' ? <div className="grid min-h-[560px] place-items-center text-sm text-textMuted">Loading customer account…</div> : detail ? <>
          <div className="flex flex-col gap-5 border-b border-white/8 pb-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase ${securityTone(detail.securityLevel)}`}>{title(detail.securityLevel)}</span>{detail.emailVerified ? <span className="inline-flex items-center gap-1 text-xs text-emerald-300"><CheckCircle2 size={13} />Email verified</span> : <span className="inline-flex items-center gap-1 text-xs text-amber-300"><ShieldAlert size={13} />Verification needed</span>}</div>
              <h2 className="mt-3 truncate text-2xl font-semibold text-white">{detail.name}</h2>
              <p className="mt-1 break-all text-sm text-textMuted">{detail.email}{detail.company ? ` · ${detail.company}` : ''}</p>
              <p className="mt-1 text-xs text-textMuted">Customer since {date(detail.createdAt)} · Last activity {date(detail.lastActivityAt, true)}</p>
            </div>
            <div className="flex min-w-[220px] flex-col gap-2">
              {storeOptions.length ? <Select options={storeOptions} value={storeSlug} onChange={(event) => setStoreSlug(event.target.value)} /> : null}
              <Button onClick={() => window.location.href = `mailto:${detail.email}`}><Mail size={14} />Email customer</Button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {(['overview', 'activity', 'security', 'notes'] as Tab[]).map((value) => <button key={value} onClick={() => setTab(value)} className={`rounded-full border px-4 py-2 text-xs font-semibold ${tab === value ? 'border-accent/50 bg-accent/10 text-white' : 'border-white/8 text-textMuted'}`}>{title(value)}</button>)}
          </div>

          {tab === 'overview' ? <Overview detail={detail} busy={busy} onSave={saveProfile} /> : null}
          {tab === 'activity' ? <ActivityPanel detail={detail} /> : null}
          {tab === 'security' ? <SecurityPanel detail={detail} busy={busy} runAction={runAction} /> : null}
          {tab === 'notes' ? <NotesPanel detail={detail} busy={busy} onAdd={addNote} /> : null}
        </> : <div className="grid min-h-[560px] place-items-center text-sm text-textMuted">Select a customer account.</div>}
      </Card>
    </div>
  </div>;
}

function Overview({ detail, busy, onSave }: { detail: CustomerDetail; busy: string; onSave: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="mt-6 space-y-5">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Box label="Orders" value={String(detail.orderCount)} /><Box label="Quotes" value={String(detail.quoteCount)} /><Box label="Invoices" value={String(detail.invoiceCount)} /><Box label="Net invoiced" value={money(detail.netRevenueMinor)} /></div>
    <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
      <form onSubmit={onSave} className="rounded-2xl border border-white/8 bg-panelMuted/30 p-5">
        <div className="flex items-center gap-2"><UserRound size={17} /><h3 className="font-semibold text-white">Customer details</h3></div>
        <div className="mt-4 grid gap-3"><Input required name="name" defaultValue={detail.name} placeholder="Customer name" /><Input name="phone" defaultValue={detail.phone} placeholder="Phone / WhatsApp" /><Input name="company" defaultValue={detail.company} placeholder="Company" /><div className="rounded-xl border border-white/8 bg-black/10 px-3 py-2 text-sm text-textMuted">Login email: <span className="text-white">{detail.email}</span><br /><span className="text-xs">Email changes remain customer-controlled through dual verification.</span></div></div>
        <PrimaryButton className="mt-4" disabled={busy === 'update-profile'}><UserCheck size={14} />{busy === 'update-profile' ? 'Saving…' : 'Save contact details'}</PrimaryButton>
      </form>
      <div className="space-y-4">
        <div className="rounded-2xl border border-white/8 bg-panelMuted/30 p-5"><div className="flex items-center gap-2"><Building2 size={17} /><h3 className="font-semibold text-white">Account footprint</h3></div><div className="mt-4 grid grid-cols-2 gap-3"><Mini label="Addresses" value={String(detail.addressCount)} /><Mini label="Active sessions" value={String(detail.activeSessions)} /><Mini label="Trusted browsers" value={String(detail.trustedBrowsers)} /><Mini label="Passkeys" value={String(detail.passkeys)} /></div><div className="mt-4 text-xs leading-6 text-textMuted">Stores: {detail.storeSlugs.length ? detail.storeSlugs.join(', ') : detail.defaultStoreSlug || 'No storefront activity yet'}</div></div>
        <div className="rounded-2xl border border-white/8 bg-panelMuted/30 p-5"><div className="text-xs uppercase tracking-[0.16em] text-textMuted">Commercial totals</div><div className="mt-3 space-y-2 text-sm"><Line label="Quoted" value={money(detail.quoteTotalMinor)} /><Line label="Ordered" value={money(detail.orderTotalMinor)} /><Line label="Invoiced" value={money(detail.invoicedMinor)} /><Line label="Credited" value={money(detail.creditedMinor)} /><Line label="Net revenue" value={money(detail.netRevenueMinor)} strong /></div></div>
      </div>
    </div>
    {detail.addresses.length ? <div><h3 className="text-sm font-semibold text-white">Saved addresses</h3><div className="mt-3 grid gap-3 md:grid-cols-2">{detail.addresses.map((address) => <div key={address.id} className="rounded-2xl border border-white/8 p-4 text-sm text-textMuted"><div className="font-semibold text-white">{address.label || 'Address'}</div><div className="mt-2 leading-6">{address.recipientName}<br />{address.company ? <>{address.company}<br /></> : null}{address.line1}<br />{address.line2 ? <>{address.line2}<br /></> : null}{address.town}, {address.postcode}<br />{address.country}</div></div>)}</div></div> : null}
  </div>;
}

function ActivityPanel({ detail }: { detail: CustomerDetail }) {
  return <div className="mt-6 grid gap-5 xl:grid-cols-3">
    <ActivityColumn icon={ShoppingBag} title="Orders" empty="No orders linked to this customer." items={detail.orders.map((item) => ({ key: item.id, heading: item.orderNumber, sub: `${title(item.status)} · ${title(item.paymentStatus || 'unpaid')}`, value: money(item.totalMinor, item.currency), date: date(item.createdAt), href: `/orders/${encodeURIComponent(item.id)}` }))} />
    <ActivityColumn icon={FileText} title="Quotes" empty="No formal quotes linked to this customer." items={detail.quotes.map((item) => ({ key: item.id, heading: item.quoteNumber, sub: `${item.title} · ${title(item.status)}`, value: money(item.totalMinor, item.currency), date: date(item.updatedAt), href: '/quotes' }))} />
    <ActivityColumn icon={CircleDollarSign} title="Invoices" empty="No formal invoices linked to this customer." items={detail.invoices.map((item) => ({ key: item.id, heading: item.invoiceNumber, sub: `${item.orderNumber} · ${title(item.status)}`, value: money(item.totalMinor, item.currency), date: date(item.issuedAt), href: `/api/internal/invoices/${encodeURIComponent(item.id)}/document` }))} />
  </div>;
}

function SecurityPanel({ detail, busy, runAction }: { detail: CustomerDetail; busy: string; runAction: (action: string, extra?: Record<string, unknown>, confirmation?: string) => Promise<void> }) {
  return <div className="mt-6 space-y-5">
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Box label="Email" value={detail.emailVerified ? 'Verified' : 'Unverified'} /><Box label="Authenticator" value={detail.twoStepEnabled ? 'Enabled' : 'Not enabled'} /><Box label="Passkeys" value={String(detail.passkeys)} /><Box label="Active sessions" value={String(detail.activeSessions)} /></div>
    <div className="grid gap-5 xl:grid-cols-2">
      <div className="rounded-2xl border border-white/8 p-5"><div className="flex items-center gap-2"><Send size={17} /><h3 className="font-semibold text-white">Customer recovery</h3></div><p className="mt-2 text-xs leading-6 text-textMuted">Links are sent only to the saved login email. Staff never see or set the customer password.</p><div className="mt-4 flex flex-wrap gap-2"><Button disabled={busy === 'resend-verification' || detail.emailVerified || !detail.isActive} onClick={() => void runAction('resend-verification')}><Mail size={14} />Resend verification</Button><Button disabled={busy === 'send-password-reset' || !detail.isActive} onClick={() => void runAction('send-password-reset', {}, 'Send a one-hour password reset link to the saved customer email?')}><KeyRound size={14} />Send reset link</Button></div></div>
      <div className="rounded-2xl border border-white/8 p-5"><div className="flex items-center gap-2"><ShieldAlert size={17} /><h3 className="font-semibold text-white">Immediate access controls</h3></div><p className="mt-2 text-xs leading-6 text-textMuted">Every action is tenant-scoped, audited and followed by a customer security email when available.</p><div className="mt-4 flex flex-wrap gap-2"><Button disabled={busy === 'revoke-sessions' || !detail.activeSessions} onClick={() => void runAction('revoke-sessions', {}, 'Sign this customer out from every browser and remove trusted-browser access?')}><MonitorSmartphone size={14} />Sign out all</Button><Button disabled={busy === 'revoke-trusted-devices' || !detail.trustedBrowsers} onClick={() => void runAction('revoke-trusted-devices', {}, 'Remove every trusted browser for this customer?')}><Smartphone size={14} />Remove trusted browsers</Button><Button disabled={busy === 'revoke-passkeys' || !detail.passkeys} onClick={() => void runAction('revoke-passkeys', {}, 'Remove every passkey for this customer? Password recovery will remain available.')}><KeyRound size={14} />Remove passkeys</Button></div></div>
    </div>
    <div className={`rounded-2xl border p-5 ${detail.isActive ? 'border-rose-500/20 bg-rose-500/[0.04]' : 'border-emerald-500/20 bg-emerald-500/[0.04]'}`}><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 font-semibold text-white">{detail.isActive ? <Ban size={17} /> : <UserCheck size={17} />}{detail.isActive ? 'Suspend customer account' : 'Reactivate customer account'}</div><p className="mt-2 text-xs leading-6 text-textMuted">{detail.isActive ? 'Suspension blocks sign-in and revokes customer sessions without deleting orders, invoices, notes, MFA or passkeys.' : 'Reactivation restores sign-in using the customer’s existing credentials. No session is created for staff.'}</p></div><Button disabled={busy === 'set-active'} onClick={() => void runAction('set-active', { active: !detail.isActive }, detail.isActive ? 'Suspend this customer account and sign out every active browser?' : 'Reactivate this customer account?')}>{detail.isActive ? <UserX size={14} /> : <UserCheck size={14} />}{detail.isActive ? 'Suspend account' : 'Reactivate account'}</Button></div></div>
    <div className="grid gap-5 xl:grid-cols-3"><SecurityList title="Active sessions" icon={MonitorSmartphone} empty="No active sessions." items={detail.sessions.map((item) => ({ key: item.id, heading: `${item.browser} on ${item.device}`, sub: `${item.locationHint} · ${item.storeSlug}`, date: `Last seen ${date(item.lastSeenAt, true)}` }))} /><SecurityList title="Trusted browsers" icon={Smartphone} empty="No trusted browsers." items={detail.trustedDevices.map((item) => ({ key: item.id, heading: `${item.browser} on ${item.device}`, sub: `${item.locationHint} · ${item.storeSlug}`, date: `Expires ${date(item.expiresAt, true)}` }))} /><SecurityList title="Passkeys" icon={KeyRound} empty="No passkeys." items={detail.passkeyItems.map((item) => ({ key: item.id, heading: item.name, sub: `${item.backedUp ? 'Synced' : 'Device'} passkey · ${item.storeSlug}`, date: item.lastUsedAt ? `Last used ${date(item.lastUsedAt, true)}` : `Added ${date(item.createdAt)}` }))} /></div>
  </div>;
}

function NotesPanel({ detail, busy, onAdd }: { detail: CustomerDetail; busy: string; onAdd: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="mt-6 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
    <form onSubmit={onAdd} className="h-fit rounded-2xl border border-white/8 p-5"><div className="flex items-center gap-2"><NotebookPen size={17} /><h3 className="font-semibold text-white">Add internal support note</h3></div><p className="mt-2 text-xs leading-6 text-textMuted">Notes are visible to tenant staff only and are recorded with the staff member and time.</p><textarea required minLength={3} maxLength={4000} name="note" rows={7} className="mt-4 w-full rounded-xl border border-white/10 bg-panelMuted px-4 py-3 text-sm text-white outline-none" placeholder="Customer request, agreed action, delivery context or follow-up…" /><PrimaryButton className="mt-3" disabled={busy === 'add-note'}><NotebookPen size={14} />{busy === 'add-note' ? 'Saving…' : 'Add support note'}</PrimaryButton></form>
    <div className="space-y-5"><div><h3 className="text-sm font-semibold text-white">Support notes</h3><div className="mt-3 space-y-3">{detail.supportNotes.map((note) => <div key={note.id} className="rounded-2xl border border-white/8 p-4"><p className="whitespace-pre-wrap text-sm leading-6 text-white">{note.note}</p><p className="mt-3 text-xs text-textMuted">{note.actorName || 'Staff'} · {date(note.createdAt, true)}</p></div>)}{!detail.supportNotes.length ? <Empty text="No support notes yet." /> : null}</div></div><div><h3 className="text-sm font-semibold text-white">Support audit</h3><div className="mt-3 space-y-2">{detail.audit.map((entry) => <div key={entry.id} className="rounded-xl border border-white/8 px-3 py-2 text-xs"><div className="font-semibold text-white">{title(entry.action)}</div><div className="mt-1 text-textMuted">{entry.actor || 'System'} · {date(entry.createdAt, true)}</div></div>)}{!detail.audit.length ? <Empty text="No customer support actions recorded." /> : null}</div></div></div>
  </div>;
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) { return <Card><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.13em] text-textMuted">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div><Icon size={20} className="text-accent" /></div></Card>; }
function Mini({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/8 bg-black/10 px-3 py-2"><div className="text-[10px] uppercase tracking-[0.12em] text-textMuted">{label}</div><div className="mt-1 truncate font-semibold text-white">{value}</div></div>; }
function Box({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-white/8 p-4"><div className="text-xs text-textMuted">{label}</div><div className="mt-2 text-lg font-semibold text-white">{value}</div></div>; }
function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) { return <div className={`flex justify-between gap-3 ${strong ? 'border-t border-white/8 pt-3 font-semibold text-white' : 'text-textMuted'}`}><span>{label}</span><span className={strong ? '' : 'text-white'}>{value}</span></div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-textMuted">{text}</div>; }
function ActivityColumn({ icon: Icon, title: heading, items, empty }: { icon: any; title: string; items: Array<{ key: string; heading: string; sub: string; value: string; date: string; href: string }>; empty: string }) { return <div><div className="flex items-center gap-2"><Icon size={16} /><h3 className="font-semibold text-white">{heading}</h3></div><div className="mt-3 space-y-3">{items.map((item) => <a key={item.key} href={item.href} target={item.href.startsWith('/api/') ? '_blank' : undefined} className="block rounded-2xl border border-white/8 p-4 no-underline"><div className="flex justify-between gap-3"><div className="min-w-0"><div className="truncate font-semibold text-white">{item.heading}</div><div className="mt-1 line-clamp-2 text-xs text-textMuted">{item.sub}</div></div><div className="shrink-0 text-sm font-semibold text-white">{item.value}</div></div><div className="mt-3 text-xs text-textMuted">{item.date}</div></a>)}{!items.length ? <Empty text={empty} /> : null}</div></div>; }
function SecurityList({ icon: Icon, title: heading, items, empty }: { icon: any; title: string; items: Array<{ key: string; heading: string; sub: string; date: string }>; empty: string }) { return <div><div className="flex items-center gap-2"><Icon size={16} /><h3 className="font-semibold text-white">{heading}</h3></div><div className="mt-3 space-y-3">{items.map((item) => <div key={item.key} className="rounded-2xl border border-white/8 p-4"><div className="font-semibold text-white">{item.heading}</div><div className="mt-1 text-xs text-textMuted">{item.sub}</div><div className="mt-2 text-xs text-textMuted">{item.date}</div></div>)}{!items.length ? <Empty text={empty} /> : null}</div></div>; }
