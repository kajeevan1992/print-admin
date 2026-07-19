'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { MailCheck, ShieldCheck } from 'lucide-react';

export default function CustomerEmailChangeConfirmation({ tenantSlug, storeSlug, storeBase, token }: { tenantSlug: string; storeSlug: string; storeBase: string; token: string }) {
  const started = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!token) { setError('This email-change link is missing its secure token.'); return; }
    confirmChange();
  }, [token]);

  async function confirmChange() {
    if (!token) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/native-storefront/account', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ action: 'confirm-email-change', tenantSlug, storeSlug, token }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'The secure email-change link could not be confirmed.');
      setNotice(payload.notice || 'This email address has been confirmed.');
      setCompleted(Boolean(payload.completed));
      if (payload.completed && payload.redirectUrl) window.setTimeout(() => window.location.assign(payload.redirectUrl), 1400);
    } catch (next) { setError(next instanceof Error ? next.message : 'The secure email-change link could not be confirmed.'); }
    finally { setBusy(false); }
  }

  return <div className="mx-auto w-full max-w-[580px] rounded-[28px] border bg-white p-7 shadow-sm sm:p-9" style={{ borderColor: 'var(--storefront-line, #E3E8F0)' }}>
    <div className="grid h-12 w-12 place-items-center rounded-2xl" style={{ backgroundColor: 'color-mix(in srgb, var(--storefront-primary, #18A7D0) 12%, white)', color: 'var(--storefront-primary, #18A7D0)' }}>{completed ? <ShieldCheck className="h-7 w-7" /> : <MailCheck className="h-7 w-7" />}</div>
    <div className="mt-5 text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--storefront-primary, #18A7D0)' }}>Verified login email change</div>
    <h1 className="mt-3 text-[36px] font-black tracking-[-0.055em]">{completed ? 'Your login email is changed' : 'Confirm this email address'}</h1>
    <p className="mt-4 text-sm leading-7 text-slate-500">Both the current and replacement email addresses must approve the request. One confirmation alone cannot change the account login.</p>
    <div className="mt-6 space-y-4">
      {busy ? <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-600">Checking your secure confirmation link…</div> : null}
      {error ? <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</div> : null}
      {error ? <button type="button" onClick={confirmChange} disabled={!token || busy} className="w-full rounded-full px-5 py-3 text-sm font-black text-white disabled:opacity-50" style={{ backgroundColor: 'var(--storefront-primary, #18A7D0)' }}>Try secure confirmation again</button> : null}
    </div>
    <div className="mt-7 flex flex-wrap justify-center gap-4 text-sm"><Link href={`${storeBase}/login`} className="font-black no-underline" style={{ color: 'var(--storefront-primary, #18A7D0)' }}>Customer sign in</Link><Link href={storeBase} className="font-bold text-slate-500 no-underline">Return to store</Link></div>
  </div>;
}
