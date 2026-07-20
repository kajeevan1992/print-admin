'use client';

import { useState } from 'react';
import { Download, ShieldAlert, Trash2 } from 'lucide-react';

export default function CustomerPrivacyPanel({ tenantSlug, storeSlug, storeBase }: { tenantSlug: string; storeSlug: string; storeBase: string }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function request(action: string, values: Record<string, string>) {
    setError(''); setBusy(action);
    try {
      const response = await fetch('/api/native-storefront/customer-privacy', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ tenantSlug, storeSlug, action, ...values }) });
      if (action === 'export-data' && response.ok) {
        const blob = await response.blob();
        const disposition = response.headers.get('content-disposition') || '';
        const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || `customer-data-${storeSlug}.json`;
        const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); return;
      }
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) throw new Error(payload.error || 'Customer privacy action failed.');
      if (payload.redirectUrl) window.location.assign(payload.redirectUrl);
    } catch (value) { setError(value instanceof Error ? value.message : 'Customer privacy action failed.'); }
    finally { setBusy(''); }
  }

  return <section className="mt-8 rounded-[24px] border bg-white p-6" style={{ borderColor: 'var(--storefront-line, #E3E8F0)' }}>
    <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><ShieldAlert className="h-5 w-5" /></div><div><h2 className="text-xl font-black">Privacy and account closure</h2><p className="text-xs text-slate-500">Download your customer data or permanently close this store login.</p></div></div>
    {error ? <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{error}</div> : null}
    <form onSubmit={(event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>; void request('export-data', values); }} className="mt-6 rounded-[20px] border bg-slate-50 p-5">
      <div className="flex items-center gap-2 font-black"><Download className="h-4 w-4" />Download my data</div><p className="mt-2 text-xs leading-6 text-slate-500">Creates a private JSON file containing your profile, saved addresses, orders, quotes and invoices for this store.</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row"><input required name="currentPassword" type="password" autoComplete="current-password" placeholder="Current password" className="min-w-0 flex-1 rounded-xl border bg-white px-4 py-3 text-sm" /><button disabled={busy === 'export-data'} className="rounded-full border px-5 py-3 text-sm font-black disabled:opacity-50">{busy === 'export-data' ? 'Preparing…' : 'Download data'}</button></div>
    </form>
    <form onSubmit={(event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>; if (window.confirm('Close this customer login permanently? This cannot be undone.')) void request('close-account', values); }} className="mt-6 rounded-[20px] border border-red-200 bg-red-50 p-5">
      <div className="flex items-center gap-2 font-black text-red-950"><Trash2 className="h-4 w-4" />Close customer account</div><p className="mt-2 text-xs leading-6 text-red-900">This removes saved addresses and disables every password, session, passkey, trusted browser and authenticator credential. Orders, invoices, payments and tax records may remain where legally required.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><input required name="currentPassword" type="password" autoComplete="current-password" placeholder="Current password" className="rounded-xl border bg-white px-4 py-3 text-sm" /><input required name="confirmation" placeholder="Type CLOSE MY ACCOUNT" className="rounded-xl border bg-white px-4 py-3 text-sm" /></div>
      <button disabled={busy === 'close-account'} className="mt-4 inline-flex items-center gap-2 rounded-full bg-red-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50"><Trash2 className="h-4 w-4" />{busy === 'close-account' ? 'Closing…' : 'Close my account'}</button>
      <a href={storeBase} className="ml-4 text-xs font-black text-slate-600">Return to store</a>
    </form>
  </section>;
}
