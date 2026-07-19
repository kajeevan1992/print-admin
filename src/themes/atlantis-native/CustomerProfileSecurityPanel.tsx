'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, Laptop, LogOut, ShieldCheck, Smartphone, UserRound } from 'lucide-react';

type Customer = { id: string; name: string; email: string; phone: string; company: string; emailVerified: boolean };
type CustomerSession = { id: string; current: boolean; device: string; browser: string; locationHint: string; createdAt: string; lastSeenAt: string; expiresAt: string };

function dateTime(value: string) { try { return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); } catch { return value || 'Unknown'; } }
function isMobile(device: string) { return /iphone|ipad|android/i.test(device); }

export default function CustomerProfileSecurityPanel({ tenantSlug, storeSlug, storeBase, initialCustomer }: { tenantSlug: string; storeSlug: string; storeBase: string; initialCustomer: Customer }) {
  const [customer, setCustomer] = useState(initialCustomer);
  const [sessions, setSessions] = useState<CustomerSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('passwordChanged') === '1') setNotice('Password changed. Every older customer session was signed out.');
    loadAccount();
  }, []);

  async function accountRequest(url: string, init?: RequestInit) {
    const response = await fetch(url, { ...init, headers: { Accept: 'application/json', ...(init?.headers || {}) } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Customer account action failed.');
    return payload;
  }

  async function loadAccount() {
    setLoadingSessions(true);
    try {
      const query = new URLSearchParams({ tenantSlug, storeSlug });
      const payload = await accountRequest(`/api/native-storefront/account?${query.toString()}`);
      if (payload.authenticated === false) { window.location.assign(`${storeBase}/login?return=${encodeURIComponent(`${storeBase}/account/profile`)}`); return; }
      if (payload.customer) setCustomer(payload.customer);
      setSessions(Array.isArray(payload.sessions) ? payload.sessions : []);
    } catch (next) { setError(next instanceof Error ? next.message : 'Active sessions could not be loaded.'); }
    finally { setLoadingSessions(false); }
  }

  async function post(body: Record<string, unknown>) {
    setError('');
    const payload = await accountRequest('/api/native-storefront/account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenantSlug, storeSlug, ...body }) });
    if (payload.customer) setCustomer(payload.customer);
    if (Array.isArray(payload.sessions)) setSessions(payload.sessions);
    if (payload.notice) setNotice(payload.notice);
    return payload;
  }

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy('profile'); setNotice('');
    try { const data = Object.fromEntries(new FormData(event.currentTarget).entries()); await post({ action: 'update-profile', ...data }); }
    catch (next) { setError(next instanceof Error ? next.message : 'Customer details could not be updated.'); }
    finally { setBusy(''); }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy('password'); setNotice('');
    try {
      const form = event.currentTarget;
      const data = Object.fromEntries(new FormData(form).entries());
      const payload = await post({ action: 'change-password', ...data });
      form.reset();
      window.location.assign(payload.redirectUrl || `${storeBase}/account/profile?passwordChanged=1`);
    } catch (next) { setError(next instanceof Error ? next.message : 'Password could not be changed.'); setBusy(''); }
  }

  async function signOutOthers() {
    setBusy('others'); setNotice('');
    try { await post({ action: 'revoke-other-sessions' }); }
    catch (next) { setError(next instanceof Error ? next.message : 'Other sessions could not be signed out.'); }
    finally { setBusy(''); }
  }

  async function revokeSession(sessionId: string) {
    setBusy(`session:${sessionId}`); setNotice('');
    try { await post({ action: 'revoke-session', sessionId }); }
    catch (next) { setError(next instanceof Error ? next.message : 'That session could not be signed out.'); }
    finally { setBusy(''); }
  }

  const otherSessions = sessions.filter((session) => !session.current);

  return <div>
    <div className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--storefront-primary, #18A7D0)' }}>Profile & security</div>
    <h1 className="mt-3 text-[38px] font-black tracking-[-0.055em]">Your customer details</h1>
    <p className="mt-2 max-w-[760px] text-sm leading-7 text-slate-500">Update the details used at checkout, rotate your password and review every active customer session for this store.</p>

    {error ? <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{error}</div> : null}
    {notice ? <div className="mt-5 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</div> : null}

    <div className="mt-8 grid gap-6 xl:grid-cols-2">
      <form onSubmit={updateProfile} className="rounded-[24px] border bg-white p-6" style={{ borderColor: 'var(--storefront-line, #E3E8F0)' }}>
        <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><UserRound className="h-5 w-5" /></div><div><h2 className="text-xl font-black">Contact details</h2><p className="text-xs text-slate-500">Used for checkout and customer communication.</p></div></div>
        <div className="mt-6 grid gap-4">
          <label className="grid gap-1.5 text-xs font-bold text-slate-600">Full name<input required name="name" defaultValue={customer.name} className="rounded-xl border px-4 py-3 text-sm font-normal text-slate-900" /></label>
          <label className="grid gap-1.5 text-xs font-bold text-slate-600">Email address<div className="flex items-center justify-between gap-3 rounded-xl border bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700"><span className="truncate">{customer.email}</span>{customer.emailVerified ? <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Verified</span> : <span className="text-[10px] font-black uppercase text-amber-700">Verification needed</span>}</div><span className="font-normal text-slate-400">Login email changes use a separate verified-email process.</span></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-xs font-bold text-slate-600">Phone / WhatsApp<input name="phone" defaultValue={customer.phone} className="rounded-xl border px-4 py-3 text-sm font-normal text-slate-900" /></label><label className="grid gap-1.5 text-xs font-bold text-slate-600">Company<input name="company" defaultValue={customer.company} className="rounded-xl border px-4 py-3 text-sm font-normal text-slate-900" /></label></div>
        </div>
        <button disabled={busy === 'profile'} className="mt-6 rounded-full px-5 py-3 text-sm font-black text-white disabled:opacity-50" style={{ backgroundColor: 'var(--storefront-primary, #18A7D0)' }}>{busy === 'profile' ? 'Saving…' : 'Save customer details'}</button>
      </form>

      <form onSubmit={changePassword} className="rounded-[24px] border bg-white p-6" style={{ borderColor: 'var(--storefront-line, #E3E8F0)' }}>
        <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><KeyRound className="h-5 w-5" /></div><div><h2 className="text-xl font-black">Change password</h2><p className="text-xs text-slate-500">Requires your current password.</p></div></div>
        <div className="mt-6 grid gap-4"><input required name="currentPassword" type="password" autoComplete="current-password" placeholder="Current password" className="rounded-xl border px-4 py-3 text-sm" /><input required name="newPassword" type="password" minLength={10} autoComplete="new-password" placeholder="New password (10+ characters)" className="rounded-xl border px-4 py-3 text-sm" /><input required name="newPasswordConfirm" type="password" minLength={10} autoComplete="new-password" placeholder="Confirm new password" className="rounded-xl border px-4 py-3 text-sm" /></div>
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-6 text-slate-600"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />Changing the password immediately invalidates every older customer cookie and emails a security alert.</div>
        <button disabled={busy === 'password'} className="mt-6 rounded-full px-5 py-3 text-sm font-black text-white disabled:opacity-50" style={{ backgroundColor: 'var(--storefront-primary, #18A7D0)' }}>{busy === 'password' ? 'Changing password…' : 'Change password securely'}</button>
      </form>
    </div>

    <section className="mt-8 rounded-[24px] border bg-white p-6" style={{ borderColor: 'var(--storefront-line, #E3E8F0)' }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><Laptop className="h-5 w-5" /></div><div><h2 className="text-xl font-black">Active customer sessions</h2><p className="text-xs text-slate-500">Only sessions for this storefront are shown.</p></div></div></div><button type="button" onClick={signOutOthers} disabled={busy === 'others' || !otherSessions.length} className="inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-xs font-black disabled:opacity-40"><LogOut className="h-4 w-4" />{busy === 'others' ? 'Signing out…' : 'Sign out other devices'}</button></div>
      {loadingSessions ? <div className="mt-6 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Loading secure session details…</div> : sessions.length ? <div className="mt-6 grid gap-3">{sessions.map((session) => { const Icon = isMobile(session.device) ? Smartphone : Laptop; return <article key={session.id} className="flex flex-col gap-4 rounded-[18px] border p-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'var(--storefront-line, #E3E8F0)' }}><div className="flex min-w-0 items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100"><Icon className="h-5 w-5" /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong>{session.browser} on {session.device}</strong>{session.current ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-700">Current session</span> : null}</div><div className="mt-1 text-xs leading-6 text-slate-500">{session.locationHint} · Last active {dateTime(session.lastSeenAt)}<br />Signed in {dateTime(session.createdAt)} · Expires {dateTime(session.expiresAt)}</div></div></div>{!session.current ? <button type="button" onClick={() => revokeSession(session.id)} disabled={busy === `session:${session.id}`} className="shrink-0 text-xs font-black text-red-700 disabled:opacity-50">{busy === `session:${session.id}` ? 'Signing out…' : 'Sign out session'}</button> : null}</article>; })}</div> : <div className="mt-6 rounded-xl border border-dashed p-5 text-sm text-slate-500">No active customer sessions were found.</div>}
    </section>
  </div>;
}
