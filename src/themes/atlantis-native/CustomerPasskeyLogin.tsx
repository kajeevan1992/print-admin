'use client';

import { useEffect, useState } from 'react';
import { browserSupportsWebAuthn, startAuthentication } from '@simplewebauthn/browser';
import { Fingerprint } from 'lucide-react';

export default function CustomerPasskeyLogin({ tenantSlug, storeSlug, storeBase, returnUrl }: { tenantSlug: string; storeSlug: string; storeBase: string; returnUrl: string }) {
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setSupported(browserSupportsWebAuthn()); }, []);

  async function post(body: Record<string, unknown>) {
    const response = await fetch('/api/native-storefront/passkeys', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ tenantSlug, storeSlug, ...body }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Passkey sign-in failed.');
    return payload;
  }

  async function signIn() {
    setBusy(true); setError('');
    try {
      const begin = await post({ action: 'begin-passkey-login', returnUrl });
      const credential = await startAuthentication({ optionsJSON: begin.options });
      const complete = await post({ action: 'complete-passkey-login', response: credential, returnUrl });
      window.location.assign(complete.redirectUrl || `${storeBase}/account`);
    } catch (next) {
      const message = next instanceof Error ? next.message : 'Passkey sign-in failed.';
      setError(message.includes('not allowed') || message.includes('NotAllowed') ? 'Passkey sign-in was cancelled or timed out. Try again when ready.' : message);
      setBusy(false);
    }
  }

  if (!supported) return null;
  return <div className="mx-auto mt-4 w-full max-w-[560px] rounded-[22px] border bg-white p-5 text-center shadow-sm" style={{ borderColor: 'var(--storefront-line, #E3E8F0)' }}>
    <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Password-free sign in</div>
    <button type="button" onClick={signIn} disabled={busy} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-black disabled:opacity-50" style={{ borderColor: 'var(--storefront-primary, #18A7D0)', color: 'var(--storefront-primary, #18A7D0)' }}><Fingerprint className="h-5 w-5" />{busy ? 'Checking your device…' : 'Sign in with a passkey'}</button>
    <p className="mt-3 text-xs leading-5 text-slate-500">Use Face ID, Touch ID, Windows Hello or a security key registered to this store.</p>
    {error ? <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-left text-xs text-amber-900">{error}</div> : null}
  </div>;
}
