'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Copy, KeyRound, RefreshCw, ShieldCheck, ShieldOff } from 'lucide-react';

type TwoStepStatus = { enabled: boolean; enabledAt: string; recoveryCodeCount: number; setupPending: boolean };
type SetupDetails = { secret: string; otpauthUri: string; recoveryCodes: string[] };

function dateTime(value: string) { try { return value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not set'; } catch { return value || 'Not set'; } }

export default function CustomerTwoStepSecurityPanel({ tenantSlug, storeSlug }: { tenantSlug: string; storeSlug: string }) {
  const [status, setStatus] = useState<TwoStepStatus>({ enabled: false, enabledAt: '', recoveryCodeCount: 0, setupPending: false });
  const [setup, setSetup] = useState<SetupDetails | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => { load(); }, []);

  async function request(url: string, init?: RequestInit) {
    const headers = new Headers(init?.headers); headers.set('Accept', 'application/json');
    const response = await fetch(url, { ...init, headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Two-step security action failed.');
    return payload;
  }

  async function load() {
    try {
      const query = new URLSearchParams({ tenantSlug, storeSlug });
      const payload = await request(`/api/native-storefront/account?${query.toString()}`);
      if (payload.twoStep) setStatus(payload.twoStep);
    } catch (next) { setError(next instanceof Error ? next.message : 'Two-step status could not be loaded.'); }
  }

  async function post(body: Record<string, unknown>) {
    setError('');
    const payload = await request('/api/native-storefront/account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenantSlug, storeSlug, ...body }) });
    if (payload.twoStep) setStatus(payload.twoStep);
    if (payload.notice) setNotice(payload.notice);
    return payload;
  }

  async function beginSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy('begin'); setNotice(''); setRecoveryCodes([]);
    try {
      const form = event.currentTarget;
      const data = Object.fromEntries(new FormData(form).entries());
      const payload = await post({ action: 'begin-two-step-setup', ...data });
      setSetup({ secret: payload.secret, otpauthUri: payload.otpauthUri, recoveryCodes: payload.recoveryCodes || [] });
      form.reset();
    } catch (next) { setError(next instanceof Error ? next.message : 'Two-step setup could not be started.'); }
    finally { setBusy(''); }
  }

  async function confirmSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy('confirm'); setNotice('');
    try {
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      await post({ action: 'confirm-two-step-setup', ...data });
      setRecoveryCodes(setup?.recoveryCodes || []); setSetup(null); event.currentTarget.reset();
    } catch (next) { setError(next instanceof Error ? next.message : 'The authenticator code could not be confirmed.'); }
    finally { setBusy(''); }
  }

  async function disable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy('disable'); setNotice('');
    try { const data = Object.fromEntries(new FormData(event.currentTarget).entries()); await post({ action: 'disable-two-step', ...data }); setSetup(null); setRecoveryCodes([]); event.currentTarget.reset(); }
    catch (next) { setError(next instanceof Error ? next.message : 'Two-step verification could not be disabled.'); }
    finally { setBusy(''); }
  }

  async function regenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy('regenerate'); setNotice('');
    try { const data = Object.fromEntries(new FormData(event.currentTarget).entries()); const payload = await post({ action: 'regenerate-recovery-codes', ...data }); setRecoveryCodes(payload.recoveryCodes || []); event.currentTarget.reset(); }
    catch (next) { setError(next instanceof Error ? next.message : 'Recovery codes could not be regenerated.'); }
    finally { setBusy(''); }
  }

  async function copy(value: string) { try { await navigator.clipboard.writeText(value); setNotice('Copied to clipboard.'); } catch { setError('Copy failed. Select the value manually.'); } }

  const visibleCodes = recoveryCodes.length ? recoveryCodes : setup?.recoveryCodes || [];

  return <section className="mt-8 rounded-[24px] border bg-white p-6" style={{ borderColor: 'var(--storefront-line, #E3E8F0)' }}>
    <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><ShieldCheck className="h-5 w-5" /></div><div><h2 className="text-xl font-black">Two-step verification</h2><p className="text-xs text-slate-500">Protect password sign-ins with an authenticator app or a one-time recovery code.</p></div></div>
    {error ? <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{error}</div> : null}
    {notice ? <div className="mt-5 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</div> : null}

    {!status.enabled && !setup ? <form onSubmit={beginSetup} className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"><label className="grid gap-1.5 text-xs font-bold text-slate-600">Current password<input required name="currentPassword" type="password" autoComplete="current-password" placeholder="Confirm your password" className="rounded-xl border px-4 py-3 text-sm font-normal text-slate-900" /></label><button disabled={busy === 'begin'} className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-black text-white disabled:opacity-50" style={{ backgroundColor: 'var(--storefront-primary, #18A7D0)' }}><KeyRound className="h-4 w-4" />{busy === 'begin' ? 'Preparing…' : 'Set up authenticator'}</button></form> : null}

    {setup ? <div className="mt-6 rounded-[20px] border bg-slate-50 p-5">
      <h3 className="text-lg font-black">Add this account to your authenticator</h3>
      <p className="mt-2 text-xs leading-6 text-slate-500">Use Google Authenticator, Microsoft Authenticator, 1Password or another TOTP app. Add the secret manually or paste the setup URI.</p>
      <div className="mt-4 grid gap-3"><div className="rounded-xl border bg-white p-4"><div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Secret key</div><div className="mt-2 flex items-center justify-between gap-3"><code className="break-all text-sm font-black">{setup.secret}</code><button type="button" onClick={() => copy(setup.secret)} className="shrink-0"><Copy className="h-4 w-4" /></button></div></div><div className="rounded-xl border bg-white p-4"><div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Setup URI</div><div className="mt-2 flex items-center justify-between gap-3"><code className="max-h-16 overflow-auto break-all text-xs">{setup.otpauthUri}</code><button type="button" onClick={() => copy(setup.otpauthUri)} className="shrink-0"><Copy className="h-4 w-4" /></button></div></div></div>
      <form onSubmit={confirmSetup} className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"><label className="grid gap-1.5 text-xs font-bold text-slate-600">Six-digit authenticator code<input required name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" placeholder="123456" className="rounded-xl border px-4 py-3 text-center text-lg font-black tracking-[0.18em]" /></label><button disabled={busy === 'confirm'} className="rounded-full px-5 py-3 text-sm font-black text-white disabled:opacity-50" style={{ backgroundColor: 'var(--storefront-primary, #18A7D0)' }}>{busy === 'confirm' ? 'Checking…' : 'Enable two-step verification'}</button></form>
    </div> : null}

    {status.enabled ? <div className="mt-6 grid gap-5 xl:grid-cols-2"><div className="rounded-[20px] border bg-emerald-50 p-5"><div className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">Enabled</div><div className="mt-2 text-lg font-black text-emerald-950">Authenticator protection is active</div><div className="mt-2 text-xs leading-6 text-emerald-900">Enabled {dateTime(status.enabledAt)} · {status.recoveryCodeCount} unused recovery codes remain.</div></div><form onSubmit={regenerate} className="rounded-[20px] border p-5"><div className="flex items-center gap-2 font-black"><RefreshCw className="h-4 w-4" />Generate new recovery codes</div><div className="mt-4 grid gap-3"><input required name="currentPassword" type="password" autoComplete="current-password" placeholder="Current password" className="rounded-xl border px-4 py-3 text-sm" /><input required name="code" autoComplete="one-time-code" placeholder="Authenticator or recovery code" className="rounded-xl border px-4 py-3 text-sm" /></div><button disabled={busy === 'regenerate'} className="mt-4 rounded-full border px-4 py-2.5 text-xs font-black disabled:opacity-50">{busy === 'regenerate' ? 'Generating…' : 'Replace all recovery codes'}</button></form><form onSubmit={disable} className="rounded-[20px] border border-red-200 bg-red-50 p-5 xl:col-span-2"><div className="flex items-center gap-2 font-black text-red-950"><ShieldOff className="h-4 w-4" />Disable two-step verification</div><p className="mt-2 text-xs leading-6 text-red-900">This removes authenticator protection and invalidates every recovery code. Other signed-in devices will be signed out.</p><div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><input required name="currentPassword" type="password" autoComplete="current-password" placeholder="Current password" className="rounded-xl border px-4 py-3 text-sm" /><input required name="code" autoComplete="one-time-code" placeholder="Authenticator or recovery code" className="rounded-xl border px-4 py-3 text-sm" /><button disabled={busy === 'disable'} className="rounded-full bg-red-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{busy === 'disable' ? 'Disabling…' : 'Disable protection'}</button></div></form></div> : null}

    {visibleCodes.length ? <div className="mt-6 rounded-[20px] border border-amber-300 bg-amber-50 p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="font-black text-amber-950">Save these recovery codes now</h3><p className="mt-1 text-xs leading-6 text-amber-900">Each code works once. They will not be shown again after this page is closed.</p></div><button type="button" onClick={() => copy(visibleCodes.join('\n'))} className="inline-flex items-center gap-2 text-xs font-black text-amber-950"><Copy className="h-4 w-4" />Copy all</button></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{visibleCodes.map((code) => <code key={code} className="rounded-lg bg-white px-3 py-2 text-center text-sm font-black tracking-[0.12em]">{code}</code>)}</div></div> : null}
  </section>;
}
