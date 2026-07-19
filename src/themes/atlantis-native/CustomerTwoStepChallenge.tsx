'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';

export default function CustomerTwoStepChallenge({ tenantSlug, storeSlug, storeBase, returnUrl }: { tenantSlug: string; storeSlug: string; storeBase: string; returnUrl: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await fetch('/api/native-storefront/account', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ tenantSlug, storeSlug, action: 'complete-two-step-login', returnUrl, ...data }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Two-step verification failed.');
      window.location.assign(payload.redirectUrl || `${storeBase}/account`);
    } catch (next) { setError(next instanceof Error ? next.message : 'Two-step verification failed.'); setBusy(false); }
  }

  return <div className="mx-auto w-full max-w-[560px] rounded-[28px] border bg-white p-7 shadow-sm sm:p-9" style={{ borderColor: 'var(--storefront-line, #E3E8F0)' }}>
    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100"><ShieldCheck className="h-7 w-7" /></div>
    <div className="mt-5 text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--storefront-primary, #18A7D0)' }}>Two-step verification</div>
    <h1 className="mt-3 text-[36px] font-black tracking-[-0.055em]">Finish signing in</h1>
    <p className="mt-3 text-sm leading-7 text-slate-500">Enter the six-digit code from your authenticator app. A saved recovery code also works once.</p>
    <form onSubmit={submit} className="mt-7 space-y-4">
      <label className="grid gap-2 text-xs font-bold text-slate-600">Authenticator or recovery code<input required name="code" autoComplete="one-time-code" inputMode="text" autoCapitalize="characters" spellCheck={false} placeholder="123456 or ABCD-EFGH" className="w-full rounded-xl border px-4 py-3 text-center text-lg font-black tracking-[0.18em]" /></label>
      {error ? <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{error}</div> : null}
      <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-black text-white disabled:opacity-50" style={{ backgroundColor: 'var(--storefront-primary, #18A7D0)' }}><KeyRound className="h-4 w-4" />{busy ? 'Checking code…' : 'Verify and sign in'}</button>
    </form>
    <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm"><Link href={`${storeBase}/login`} className="font-black no-underline" style={{ color: 'var(--storefront-primary, #18A7D0)' }}>Start sign-in again</Link><Link href={`${storeBase}/forgot-password`} className="font-bold text-slate-500 no-underline">Reset password</Link></div>
  </div>;
}
