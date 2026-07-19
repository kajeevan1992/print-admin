'use client';

import { FormEvent, useEffect, useState } from 'react';
import { browserSupportsWebAuthn, platformAuthenticatorIsAvailable, startRegistration } from '@simplewebauthn/browser';
import { Fingerprint, KeyRound, ShieldCheck, Trash2 } from 'lucide-react';

type Passkey = { id: string; name: string; deviceType: string; backedUp: boolean; createdAt: string; lastUsedAt: string };

function dateTime(value: string) { try { return value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not used yet'; } catch { return value || 'Not used yet'; } }

export default function CustomerPasskeySecurityPanel({ tenantSlug, storeSlug }: { tenantSlug: string; storeSlug: string }) {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [supported, setSupported] = useState(false);
  const [platformAvailable, setPlatformAvailable] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const nextSupported = browserSupportsWebAuthn();
    setSupported(nextSupported);
    if (nextSupported) platformAuthenticatorIsAvailable().then(setPlatformAvailable).catch(() => setPlatformAvailable(false));
    load();
  }, []);

  async function request(url: string, init?: RequestInit) {
    const headers = new Headers(init?.headers); headers.set('Accept', 'application/json');
    const response = await fetch(url, { ...init, headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Passkey action failed.');
    return payload;
  }

  async function load() {
    try {
      const query = new URLSearchParams({ tenantSlug, storeSlug });
      const payload = await request(`/api/native-storefront/passkeys?${query.toString()}`);
      setPasskeys(Array.isArray(payload.passkeys) ? payload.passkeys : []);
    } catch (next) { setError(next instanceof Error ? next.message : 'Passkeys could not be loaded.'); }
  }

  async function post(body: Record<string, unknown>) {
    return request('/api/native-storefront/passkeys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenantSlug, storeSlug, ...body }) });
  }

  async function addPasskey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy('add'); setError(''); setNotice('');
    try {
      const form = event.currentTarget;
      const data = Object.fromEntries(new FormData(form).entries());
      const begin = await post({ action: 'begin-passkey-registration', currentPassword: data.currentPassword, twoStepCode: data.twoStepCode });
      const credential = await startRegistration({ optionsJSON: begin.options });
      const complete = await post({ action: 'complete-passkey-registration', name: data.name, response: credential });
      setPasskeys(Array.isArray(complete.passkeys) ? complete.passkeys : []);
      setNotice(complete.notice || 'Passkey added.');
      form.reset();
    } catch (next) {
      const message = next instanceof Error ? next.message : 'Passkey could not be added.';
      setError(message.includes('not allowed') || message.includes('NotAllowed') ? 'Passkey setup was cancelled or timed out. Try again when ready.' : message);
    } finally { setBusy(''); }
  }

  async function removePasskey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy('remove'); setError(''); setNotice('');
    try {
      const form = event.currentTarget;
      const data = Object.fromEntries(new FormData(form).entries());
      const payload = await post({ action: 'revoke-passkey', passkeyId: data.passkeyId, currentPassword: data.currentPassword, twoStepCode: data.twoStepCode });
      setPasskeys(Array.isArray(payload.passkeys) ? payload.passkeys : []);
      setNotice(payload.notice || 'Passkey removed.');
      form.reset();
    } catch (next) { setError(next instanceof Error ? next.message : 'Passkey could not be removed.'); }
    finally { setBusy(''); }
  }

  return <section className="mt-8 rounded-[24px] border bg-white p-6" style={{ borderColor: 'var(--storefront-line, #E3E8F0)' }}>
    <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><Fingerprint className="h-5 w-5" /></div><div><h2 className="text-xl font-black">Passkeys</h2><p className="text-xs text-slate-500">Sign in with Face ID, Touch ID, Windows Hello or a security key.</p></div></div>
    {error ? <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{error}</div> : null}
    {notice ? <div className="mt-5 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</div> : null}

    {!supported ? <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">This browser does not support passkeys. Your password and authenticator sign-in remain available.</div> : <form onSubmit={addPasskey} className="mt-6 rounded-[20px] border bg-slate-50 p-5">
      <div className="flex items-center gap-2 font-black"><KeyRound className="h-4 w-4" />Add a passkey</div>
      <p className="mt-2 text-xs leading-6 text-slate-500">{platformAvailable ? 'This device can use its built-in biometric or screen-lock authenticator.' : 'A compatible security key or password manager can create the passkey.'} Confirm your current password. When authenticator two-step verification is enabled, enter its six-digit code too.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><input required name="name" maxLength={80} placeholder="Name, e.g. My iPhone" className="rounded-xl border bg-white px-4 py-3 text-sm" /><input required name="currentPassword" type="password" autoComplete="current-password" placeholder="Current password" className="rounded-xl border bg-white px-4 py-3 text-sm" /><input name="twoStepCode" inputMode="numeric" autoComplete="one-time-code" placeholder="Authenticator code, if enabled" className="rounded-xl border bg-white px-4 py-3 text-sm sm:col-span-2" /></div>
      <button disabled={busy === 'add'} className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-black text-white disabled:opacity-50" style={{ backgroundColor: 'var(--storefront-primary, #18A7D0)' }}><Fingerprint className="h-4 w-4" />{busy === 'add' ? 'Opening device security…' : 'Add passkey'}</button>
    </form>}

    <div className="mt-6"><div className="flex items-center gap-2 font-black"><ShieldCheck className="h-4 w-4" />Registered passkeys</div>{passkeys.length ? <div className="mt-4 grid gap-3">{passkeys.map((passkey) => <article key={passkey.id} className="rounded-[18px] border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-black">{passkey.name}</div><div className="mt-1 text-xs text-slate-500">{passkey.deviceType === 'multiDevice' || passkey.backedUp ? 'Synced passkey' : 'Device or security-key passkey'} · Added {dateTime(passkey.createdAt)}</div><div className="mt-1 text-xs text-slate-500">Last used: {dateTime(passkey.lastUsedAt)}</div></div><Fingerprint className="h-5 w-5 text-slate-400" /></div></article>)}</div> : <div className="mt-4 rounded-[18px] border border-dashed p-6 text-center text-sm text-slate-500">No passkeys have been added yet.</div>}</div>

    {passkeys.length ? <form onSubmit={removePasskey} className="mt-6 rounded-[20px] border border-red-200 bg-red-50 p-5"><div className="flex items-center gap-2 font-black text-red-950"><Trash2 className="h-4 w-4" />Remove a passkey</div><p className="mt-2 text-xs leading-6 text-red-900">The removed passkey immediately stops working. Confirm your password and, when enabled, the current authenticator code.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><select required name="passkeyId" className="rounded-xl border bg-white px-4 py-3 text-sm sm:col-span-2"><option value="">Choose a passkey</option>{passkeys.map((passkey) => <option key={passkey.id} value={passkey.id}>{passkey.name}</option>)}</select><input required name="currentPassword" type="password" autoComplete="current-password" placeholder="Current password" className="rounded-xl border bg-white px-4 py-3 text-sm" /><input name="twoStepCode" inputMode="numeric" autoComplete="one-time-code" placeholder="Authenticator code, if enabled" className="rounded-xl border bg-white px-4 py-3 text-sm" /></div><button disabled={busy === 'remove'} className="mt-4 inline-flex items-center gap-2 rounded-full bg-red-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50"><Trash2 className="h-4 w-4" />{busy === 'remove' ? 'Removing…' : 'Remove passkey'}</button></form> : null}
  </section>;
}
