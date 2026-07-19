'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Laptop, ShieldCheck, Trash2 } from 'lucide-react';

type TrustedDevice = {
  id: string;
  current: boolean;
  device: string;
  browser: string;
  locationHint: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
};

function dateTime(value: string) {
  try { return value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not set'; }
  catch { return value || 'Not set'; }
}

export default function CustomerTrustedBrowserPanel({ tenantSlug, storeSlug }: { tenantSlug: string; storeSlug: string }) {
  const [enabled, setEnabled] = useState(false);
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => { load(); }, []);

  async function request(url: string, init?: RequestInit) {
    const headers = new Headers(init?.headers); headers.set('Accept', 'application/json');
    const response = await fetch(url, { ...init, headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Trusted browser action failed.');
    return payload;
  }

  async function load() {
    try {
      const query = new URLSearchParams({ tenantSlug, storeSlug });
      const payload = await request(`/api/native-storefront/account?${query.toString()}`);
      setEnabled(Boolean(payload.twoStep?.enabled));
      setDevices(Array.isArray(payload.trustedDevices) ? payload.trustedDevices : []);
    } catch (next) { setError(next instanceof Error ? next.message : 'Trusted browsers could not be loaded.'); }
  }

  async function post(body: Record<string, unknown>) {
    setError('');
    const payload = await request('/api/native-storefront/account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenantSlug, storeSlug, ...body }) });
    if (Array.isArray(payload.trustedDevices)) setDevices(payload.trustedDevices);
    if (payload.notice) setNotice(payload.notice);
    return payload;
  }

  async function revokeDevice(deviceId: string) {
    setBusy(`device-${deviceId}`); setNotice('');
    try { await post({ action: 'revoke-trusted-device', deviceId }); }
    catch (next) { setError(next instanceof Error ? next.message : 'That trusted browser could not be removed.'); }
    finally { setBusy(''); }
  }

  async function revokeAll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy('all'); setNotice('');
    try {
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      await post({ action: 'revoke-all-trusted-devices', ...data });
      setDevices([]); event.currentTarget.reset();
    } catch (next) { setError(next instanceof Error ? next.message : 'Trusted browsers could not be removed.'); }
    finally { setBusy(''); }
  }

  if (!enabled) return null;

  return <section className="mt-8 rounded-[24px] border bg-white p-6" style={{ borderColor: 'var(--storefront-line, #E3E8F0)' }}>
    <div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100"><Laptop className="h-5 w-5" /></div><div><h2 className="text-xl font-black">Trusted browsers</h2><p className="mt-1 text-xs leading-6 text-slate-500">A trusted browser still needs the correct password, but can skip the authenticator step for up to 30 days. Trust tokens rotate whenever they are used.</p></div></div>
    {error ? <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{error}</div> : null}
    {notice ? <div className="mt-5 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</div> : null}
    <div className="mt-5 grid gap-3">{devices.length ? devices.map((device) => <div key={device.id} className="flex flex-col gap-4 rounded-2xl border bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2 text-sm font-black">{device.device} · {device.browser}{device.current ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800"><ShieldCheck className="h-3 w-3" />This browser</span> : null}</div><div className="mt-1 text-xs leading-5 text-slate-500">{device.locationHint} · Last used {dateTime(device.lastUsedAt)} · Expires {dateTime(device.expiresAt)}</div></div><button type="button" disabled={busy === `device-${device.id}`} onClick={() => revokeDevice(device.id)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border px-4 py-2 text-xs font-black disabled:opacity-50"><Trash2 className="h-4 w-4" />{busy === `device-${device.id}` ? 'Removing…' : 'Remove'}</button></div>) : <div className="rounded-2xl border border-dashed p-4 text-sm leading-6 text-slate-500">No browsers are currently trusted. Select “Trust this browser for 30 days” after a future two-step sign-in.</div>}</div>
    {devices.length ? <form onSubmit={revokeAll} className="mt-5 grid gap-3 border-t pt-5 sm:grid-cols-[1fr_auto] sm:items-end"><label className="grid gap-1.5 text-xs font-bold text-slate-600">Current password<input required name="currentPassword" type="password" autoComplete="current-password" placeholder="Confirm your password" className="rounded-xl border px-4 py-3 text-sm font-normal text-slate-900" /></label><button disabled={busy === 'all'} className="rounded-full border border-red-200 bg-red-50 px-5 py-3 text-sm font-black text-red-800 disabled:opacity-50">{busy === 'all' ? 'Removing…' : 'Remove all trusted browsers'}</button></form> : null}
  </section>;
}
