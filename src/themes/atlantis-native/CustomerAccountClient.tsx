'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Download, FileText, KeyRound, LogOut, MailCheck, MapPin, Package, Palette, Receipt, RefreshCw, ShieldCheck, UserRound } from 'lucide-react';

type Address = { id: string; label: string; recipientName: string; company: string; line1: string; line2: string; town: string; county: string; postcode: string; country: string; phone: string; isDefaultShipping: boolean; isDefaultBilling: boolean };
type OrderItem = { id: string; productName: string; quantity: number; totalPrice: number; metadataJson?: Record<string, any> };
type AccountOrder = { id: string; orderNumber: string; status: string; paymentStatus: string; currency: string; totalMinor: number; formattedTotal: string; createdAt: string; quoteReference: string; items: OrderItem[] };
type AccountQuote = { id: string; quoteNumber: string; title: string; status: string; currency: string; totalMinor: number; formattedTotal: string; expiresAt: string; updatedAt: string; revision: number; convertedOrderId: string; lineCount: number; href: string };
type AccountInvoice = { id: string; invoiceNumber: string; orderNumber: string; status: string; currency: string; totalMinor: number; creditedMinor: number; formattedTotal: string; formattedCredited: string; issuedAt: string; invoiceHref: string; receiptHref: string; creditNotes: Array<{ id: string; creditNoteNumber: string; reason: string; totalMinor: number; formattedTotal: string; issuedAt: string; href: string }> };
type Summary = { orderCount: number; quoteCount: number; invoiceCount: number; artworkCount: number; addressCount: number; artwork: Array<{ orderId: string; orderNumber: string; productName: string; status: string; uploadId: string }> };
type Section = 'overview' | 'orders' | 'quotes' | 'artwork' | 'invoices' | 'addresses';
type Mode = 'login' | 'register' | 'forgot-password' | 'reset-password' | 'verify-email' | 'dashboard';
type Customer = { id: string; name: string; email: string; phone: string; company: string; emailVerified: boolean };

function clean(value: unknown) { return String(value || '').trim(); }
function date(value: string) { try { return value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(value)) : 'Not set'; } catch { return value || 'Not set'; } }
function statusLabel(value: string) { return clean(value).toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function messageBox(message: string, kind: 'error' | 'success' = 'success') { return <div className={`rounded-xl border p-3 text-sm ${kind === 'error' ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-emerald-300 bg-emerald-50 text-emerald-900'}`}>{message}</div>; }

export default function CustomerAccountClient({ mode, section = 'overview', tenantSlug, storeSlug, storeBase, returnUrl, token = '', customer, orders = [], quotes = [], invoices = [], addresses: suppliedAddresses = [], summary }: { mode: Mode; section?: Section; tenantSlug: string; storeSlug: string; storeBase: string; returnUrl?: string; token?: string; customer?: Customer | null; orders?: AccountOrder[]; quotes?: AccountQuote[]; invoices?: AccountInvoice[]; addresses?: Address[]; summary?: Summary }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [addresses, setAddresses] = useState(suppliedAddresses);
  const verificationStarted = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === '1') setNotice('Your email address is verified.');
    if (params.get('passwordReset') === '1') setNotice('Your password was changed and your other customer sessions were signed out.');
  }, []);

  useEffect(() => {
    if (mode !== 'verify-email' || verificationStarted.current) return;
    verificationStarted.current = true;
    if (!token) { setError('This verification link is missing its secure token.'); return; }
    verifyEmail();
  }, [mode, token]);

  async function post(body: Record<string, unknown>) {
    setError('');
    const response = await fetch('/api/native-storefront/account', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ tenantSlug, storeSlug, ...body }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Account action failed.');
    return payload;
  }

  async function authSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(mode);
    try {
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      const payload = await post({ action: mode, ...data, returnUrl: returnUrl || `${storeBase}/account` });
      window.location.assign(payload.redirectUrl || `${storeBase}/account`);
    } catch (next) { setError(next instanceof Error ? next.message : 'Sign-in failed.'); }
    finally { setBusy(''); }
  }

  async function forgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy('forgot-password');
    setNotice('');
    try {
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      const payload = await post({ action: 'request-password-reset', ...data });
      setNotice(payload.notice || 'If an active account matches that email, a secure reset link has been sent.');
      event.currentTarget.reset();
    } catch (next) { setError(next instanceof Error ? next.message : 'The reset request could not be completed.'); }
    finally { setBusy(''); }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy('reset-password');
    setNotice('');
    try {
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      const payload = await post({ action: 'reset-password', token, ...data, returnUrl: returnUrl || `${storeBase}/account` });
      window.location.assign(payload.redirectUrl || `${storeBase}/account`);
    } catch (next) { setError(next instanceof Error ? next.message : 'The password could not be changed.'); }
    finally { setBusy(''); }
  }

  async function verifyEmail() {
    setBusy('verify-email');
    setNotice('');
    try {
      const payload = await post({ action: 'verify-email', token, returnUrl: returnUrl || `${storeBase}/account` });
      setNotice(payload.notice || 'Your email address is verified.');
      window.setTimeout(() => window.location.assign(payload.redirectUrl || `${storeBase}/login?verified=1`), 600);
    } catch (next) { setError(next instanceof Error ? next.message : 'The email address could not be verified.'); }
    finally { setBusy(''); }
  }

  async function resendVerification() {
    setBusy('resend-verification');
    setNotice('');
    try {
      const payload = await post({ action: 'resend-verification', email: customer?.email || '' });
      setNotice(payload.notice || 'If verification is still needed, a new secure link has been sent.');
    } catch (next) { setError(next instanceof Error ? next.message : 'A new verification email could not be requested.'); }
    finally { setBusy(''); }
  }

  async function logout() { setBusy('logout'); try { const payload = await post({ action: 'logout' }); window.location.assign(payload.redirectUrl || storeBase); } catch (next) { setError(next instanceof Error ? next.message : 'Sign-out failed.'); setBusy(''); } }
  async function saveAddress(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy('address'); const form = event.currentTarget; try { const data = Object.fromEntries(new FormData(form).entries()); const payload = await post({ action: 'save-address', ...data }); setAddresses(Array.isArray(payload.addresses) ? payload.addresses : addresses); form.reset(); } catch (next) { setError(next instanceof Error ? next.message : 'Address could not be saved.'); } finally { setBusy(''); } }
  async function removeAddress(id: string) { setBusy(`delete:${id}`); try { const payload = await post({ action: 'delete-address', id }); setAddresses(Array.isArray(payload.addresses) ? payload.addresses : addresses.filter((address) => address.id !== id)); } catch (next) { setError(next instanceof Error ? next.message : 'Address could not be removed.'); } finally { setBusy(''); } }
  async function repeatOrder(orderId: string) { setBusy(`repeat:${orderId}`); try { const payload = await post({ action: 'repeat-order', orderId }); window.location.assign(payload.redirectUrl || `${storeBase}/cart`); } catch (next) { setError(next instanceof Error ? next.message : 'This order could not be repeated.'); setBusy(''); } }

  if (mode === 'forgot-password') return <SecurityCard eyebrow="Password recovery" title="Reset your password" icon={<KeyRound className="h-7 w-7" />}>
    <p className="text-sm leading-7 text-slate-500">Enter the email used for this store. For privacy, the response is the same whether or not an account exists.</p>
    <form onSubmit={forgotPassword} className="mt-6 space-y-4"><input required name="email" type="email" autoComplete="email" placeholder="Email address" className="w-full rounded-xl border px-4 py-3 text-sm" />{error ? messageBox(error, 'error') : null}{notice ? messageBox(notice) : null}<button disabled={Boolean(busy)} className="w-full rounded-full px-5 py-3 text-sm font-black text-white disabled:opacity-50" style={{ backgroundColor: 'var(--storefront-primary, #18A7D0)' }}>{busy ? 'Sending…' : 'Send secure reset link'}</button></form>
    <div className="mt-6 text-center text-sm text-slate-500"><Link href={`${storeBase}/login`} className="font-black no-underline" style={{ color: 'var(--storefront-primary, #18A7D0)' }}>Return to sign in</Link></div>
  </SecurityCard>;

  if (mode === 'reset-password') return <SecurityCard eyebrow="Secure account recovery" title="Choose a new password" icon={<ShieldCheck className="h-7 w-7" />}>
    <p className="text-sm leading-7 text-slate-500">The link is single-use and expires after one hour. Changing the password signs out every other customer session.</p>
    {!token ? messageBox('This reset link is missing its secure token.', 'error') : <form onSubmit={resetPassword} className="mt-6 space-y-4"><input required name="password" type="password" minLength={10} autoComplete="new-password" placeholder="New password (10+ characters)" className="w-full rounded-xl border px-4 py-3 text-sm" /><input required name="passwordConfirm" type="password" minLength={10} autoComplete="new-password" placeholder="Confirm new password" className="w-full rounded-xl border px-4 py-3 text-sm" />{error ? messageBox(error, 'error') : null}{notice ? messageBox(notice) : null}<button disabled={Boolean(busy)} className="w-full rounded-full px-5 py-3 text-sm font-black text-white disabled:opacity-50" style={{ backgroundColor: 'var(--storefront-primary, #18A7D0)' }}>{busy ? 'Changing password…' : 'Change password securely'}</button></form>}
    <div className="mt-6 text-center text-sm text-slate-500"><Link href={`${storeBase}/forgot-password`} className="font-black no-underline" style={{ color: 'var(--storefront-primary, #18A7D0)' }}>Request a new link</Link></div>
  </SecurityCard>;

  if (mode === 'verify-email') return <SecurityCard eyebrow="Email verification" title="Confirm your email address" icon={<MailCheck className="h-7 w-7" />}>
    <p className="text-sm leading-7 text-slate-500">This single-use link confirms that you control the email used for this customer account.</p>
    <div className="mt-6 space-y-4">{busy === 'verify-email' ? <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-600">Verifying your secure link…</div> : null}{error ? <>{messageBox(error, 'error')}<button type="button" onClick={verifyEmail} disabled={!token || Boolean(busy)} className="w-full rounded-full px-5 py-3 text-sm font-black text-white disabled:opacity-50" style={{ backgroundColor: 'var(--storefront-primary, #18A7D0)' }}>Try verification again</button></> : null}{notice ? messageBox(notice) : null}</div>
    <div className="mt-6 text-center text-sm text-slate-500"><Link href={`${storeBase}/login`} className="font-black no-underline" style={{ color: 'var(--storefront-primary, #18A7D0)' }}>Customer sign in</Link></div>
  </SecurityCard>;

  if (mode === 'login' || mode === 'register') return <div className="mx-auto w-full max-w-[560px] rounded-[28px] border bg-white p-7 shadow-sm sm:p-9" style={{ borderColor: 'var(--storefront-line, #E3E8F0)' }}>
    <div className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--storefront-primary, #18A7D0)' }}>{mode === 'login' ? 'Customer sign in' : 'Create account'}</div>
    <h1 className="mt-3 text-[36px] font-black tracking-[-0.055em]">{mode === 'login' ? 'Welcome back' : 'Save orders and reorder faster'}</h1>
    <p className="mt-3 text-sm leading-7 text-slate-500">Your customer account is separate from the print administration login and is scoped to this store.</p>
    {notice ? <div className="mt-5">{messageBox(notice)}</div> : null}
    <form onSubmit={authSubmit} className="mt-7 space-y-4">
      {mode === 'register' ? <><input required name="name" placeholder="Full name" className="w-full rounded-xl border px-4 py-3 text-sm" /><div className="grid gap-4 sm:grid-cols-2"><input name="phone" placeholder="Phone / WhatsApp" className="w-full rounded-xl border px-4 py-3 text-sm" /><input name="company" placeholder="Company (optional)" className="w-full rounded-xl border px-4 py-3 text-sm" /></div></> : null}
      <input required name="email" type="email" placeholder="Email address" autoComplete="email" className="w-full rounded-xl border px-4 py-3 text-sm" />
      <input required name="password" type="password" minLength={10} placeholder="Password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="w-full rounded-xl border px-4 py-3 text-sm" />
      {mode === 'login' ? <div className="text-right"><Link href={`${storeBase}/forgot-password`} className="text-xs font-black no-underline" style={{ color: 'var(--storefront-primary, #18A7D0)' }}>Forgot password?</Link></div> : null}
      {error ? messageBox(error, 'error') : null}
      <button disabled={Boolean(busy)} className="w-full rounded-full px-5 py-3 text-sm font-black text-white disabled:opacity-50" style={{ backgroundColor: 'var(--storefront-primary, #18A7D0)' }}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create customer account'}</button>
    </form>
    <div className="mt-6 text-center text-sm text-slate-500">{mode === 'login' ? <>New customer? <Link href={`${storeBase}/register${returnUrl ? `?return=${encodeURIComponent(returnUrl)}` : ''}`} className="font-black no-underline" style={{ color: 'var(--storefront-primary, #18A7D0)' }}>Create an account</Link></> : <>Already registered? <Link href={`${storeBase}/login${returnUrl ? `?return=${encodeURIComponent(returnUrl)}` : ''}`} className="font-black no-underline" style={{ color: 'var(--storefront-primary, #18A7D0)' }}>Sign in</Link></>}</div>
  </div>;

  if (!customer) return <div className="rounded-[28px] border bg-white p-8 text-center"><h1 className="text-3xl font-black">Sign in required</h1><Link href={`${storeBase}/login`} className="mt-5 inline-flex rounded-full px-5 py-3 font-black text-white no-underline" style={{ backgroundColor: 'var(--storefront-primary, #18A7D0)' }}>Customer sign in</Link></div>;

  const nav: Array<[Section, string, any]> = [['overview', 'Overview', UserRound], ['orders', 'Orders', Package], ['quotes', 'Quotes', FileText], ['artwork', 'Artwork', Palette], ['invoices', 'Invoices', Receipt], ['addresses', 'Addresses', MapPin]];
  const cards = [{ label: 'Orders', value: summary?.orderCount || 0, href: `${storeBase}/account/orders` }, { label: 'Quotes', value: summary?.quoteCount || 0, href: `${storeBase}/account/quotes` }, { label: 'Artwork items', value: summary?.artworkCount || 0, href: `${storeBase}/account/artwork` }, { label: 'Invoices', value: summary?.invoiceCount || 0, href: `${storeBase}/account/invoices` }];

  function OrderList({ values, empty }: { values: AccountOrder[]; empty: string }) { return values.length ? <div className="space-y-4">{values.map((order) => <article key={order.id} className="rounded-[22px] border bg-white p-5" style={{ borderColor: 'var(--storefront-line, #E3E8F0)' }}><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--storefront-primary, #18A7D0)' }}>{order.orderNumber}</div><h3 className="mt-2 text-xl font-black">{order.items.length} item{order.items.length === 1 ? '' : 's'} · {order.formattedTotal}</h3><p className="mt-1 text-xs text-slate-500">{date(order.createdAt)} · {statusLabel(order.status)} · Payment {statusLabel(order.paymentStatus)}</p></div><button disabled={busy === `repeat:${order.id}`} onClick={() => repeatOrder(order.id)} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black disabled:opacity-50"><RefreshCw className="h-4 w-4" />{busy === `repeat:${order.id}` ? 'Repricing…' : 'Order again'}</button></div><div className="mt-4 grid gap-2">{order.items.slice(0, 6).map((item) => <div key={item.id} className="flex justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2 text-xs"><span>{item.productName} × {item.quantity}</span><strong>{new Intl.NumberFormat('en-GB', { style: 'currency', currency: order.currency || 'GBP' }).format(item.totalPrice || 0)}</strong></div>)}</div></article>)}</div> : <div className="rounded-[22px] border border-dashed p-8 text-center text-sm text-slate-500">{empty}</div>; }
  function QuoteList() { return quotes.length ? <div className="space-y-4">{quotes.map((quote) => <Link key={quote.id} href={quote.href} className="block rounded-[22px] border bg-white p-5 no-underline" style={{ borderColor: 'var(--storefront-line, #E3E8F0)', color: 'var(--storefront-ink, #111827)' }}><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--storefront-primary, #18A7D0)' }}>{quote.quoteNumber}</div><h3 className="mt-2 text-xl font-black">{quote.title}</h3><p className="mt-1 text-xs text-slate-500">Revision {quote.revision} · {quote.lineCount} line{quote.lineCount === 1 ? '' : 's'} · Expires {date(quote.expiresAt)}</p></div><div className="text-right"><div className="text-lg font-black">{quote.formattedTotal}</div><div className="mt-1 text-xs font-bold uppercase text-slate-500">{statusLabel(quote.status)}</div></div></div></Link>)}</div> : <div className="rounded-[22px] border border-dashed p-8 text-center text-sm text-slate-500">Formal quote requests and approvals will appear here.</div>; }
  function InvoiceList() { return invoices.length ? <div className="space-y-4">{invoices.map((invoice) => <article key={invoice.id} className="rounded-[22px] border bg-white p-5" style={{ borderColor: 'var(--storefront-line, #E3E8F0)' }}><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--storefront-primary, #18A7D0)' }}>{invoice.invoiceNumber}</div><h3 className="mt-2 text-xl font-black">{invoice.orderNumber} · {invoice.formattedTotal}</h3><p className="mt-1 text-xs text-slate-500">Issued {date(invoice.issuedAt)} · {statusLabel(invoice.status)}{invoice.creditedMinor ? ` · Credited ${invoice.formattedCredited}` : ''}</p></div><div className="flex flex-wrap gap-2"><a href={invoice.invoiceHref} target="_blank" className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black no-underline"><Download className="h-4 w-4" />Invoice PDF</a><a href={invoice.receiptHref} target="_blank" className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black no-underline"><Download className="h-4 w-4" />Receipt</a></div></div>{invoice.creditNotes.length ? <div className="mt-4 space-y-2">{invoice.creditNotes.map((note) => <a key={note.id} href={note.href} target="_blank" className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs no-underline" style={{ color: 'var(--storefront-ink, #111827)' }}><span>{note.creditNoteNumber} · {note.reason}</span><strong>{note.formattedTotal}</strong></a>)}</div> : null}</article>)}</div> : <div className="rounded-[22px] border border-dashed p-8 text-center text-sm text-slate-500">VAT invoices will appear after payment is confirmed.</div>; }

  return <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
    <aside className="h-fit rounded-[24px] border bg-white p-4" style={{ borderColor: 'var(--storefront-line, #E3E8F0)' }}>
      <div className="p-3"><div className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: 'var(--storefront-primary, #18A7D0)' }}>Customer account</div><div className="mt-2 font-black">{customer.name}</div><div className="mt-1 truncate text-xs text-slate-500">{customer.email}</div><div className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${customer.emailVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{customer.emailVerified ? <CheckCircle2 className="h-3 w-3" /> : <MailCheck className="h-3 w-3" />}{customer.emailVerified ? 'Email verified' : 'Verification needed'}</div></div>
      <nav className="mt-3 space-y-1">{nav.map(([key, itemLabel, Icon]) => <Link key={key} href={`${storeBase}/account${key === 'overview' ? '' : `/${key}`}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold no-underline" style={{ backgroundColor: section === key ? 'color-mix(in srgb, var(--storefront-primary, #18A7D0) 10%, white)' : 'transparent', color: section === key ? 'var(--storefront-primary, #18A7D0)' : 'var(--storefront-ink, #111827)' }}><Icon className="h-4 w-4" />{itemLabel}</Link>)}</nav>
      <button onClick={logout} disabled={busy === 'logout'} className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-red-700 disabled:opacity-50"><LogOut className="h-4 w-4" />Sign out</button>
    </aside>
    <section>
      {error ? <div className="mb-5">{messageBox(error, 'error')}</div> : null}
      {notice ? <div className="mb-5">{messageBox(notice)}</div> : null}
      {!customer.emailVerified ? <div className="mb-6 flex flex-col gap-4 rounded-[20px] border border-amber-300 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 font-black text-amber-950"><MailCheck className="h-5 w-5" />Verify your email address</div><p className="mt-1 text-sm leading-6 text-amber-900">Verification protects password recovery and confirms where account documents should be sent.</p></div><button type="button" onClick={resendVerification} disabled={busy === 'resend-verification'} className="shrink-0 rounded-full bg-amber-950 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">{busy === 'resend-verification' ? 'Sending…' : 'Resend verification'}</button></div> : null}
      {section === 'overview' ? <><div><div className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--storefront-primary, #18A7D0)' }}>Account overview</div><h1 className="mt-3 text-[38px] font-black tracking-[-0.055em]">Hello, {customer.name.split(' ')[0]}</h1><p className="mt-2 text-sm text-slate-500">Track print jobs, quotes, artwork, VAT invoices and saved delivery details.</p></div><div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <Link key={card.label} href={card.href} className="rounded-[20px] border bg-white p-5 no-underline" style={{ borderColor: 'var(--storefront-line, #E3E8F0)', color: 'var(--storefront-ink, #111827)' }}><div className="text-3xl font-black">{card.value}</div><div className="mt-2 text-xs font-bold text-slate-500">{card.label}</div></Link>)}</div><div className="mt-8"><h2 className="mb-4 text-2xl font-black">Recent orders</h2><OrderList values={orders.slice(0, 5)} empty="No orders have been placed with this email yet." /></div></> : null}
      {section === 'orders' ? <><h1 className="mb-6 text-[38px] font-black tracking-[-0.055em]">Orders</h1><OrderList values={orders} empty="Your completed and active orders will appear here." /></> : null}
      {section === 'quotes' ? <><h1 className="mb-6 text-[38px] font-black tracking-[-0.055em]">Quotes</h1><QuoteList /></> : null}
      {section === 'invoices' ? <><h1 className="text-[38px] font-black tracking-[-0.055em]">Invoices</h1><p className="mb-6 mt-2 text-sm text-slate-500">Download VAT invoices, payment receipts and any refund credit notes.</p><InvoiceList /></> : null}
      {section === 'artwork' ? <><h1 className="mb-6 text-[38px] font-black tracking-[-0.055em]">Artwork</h1>{summary?.artwork?.length ? <div className="grid gap-4">{summary.artwork.map((item, index) => <div key={`${item.orderId}-${item.productName}-${index}`} className="rounded-[20px] border bg-white p-5" style={{ borderColor: 'var(--storefront-line, #E3E8F0)' }}><div className="text-xs font-black" style={{ color: 'var(--storefront-primary, #18A7D0)' }}>{item.orderNumber}</div><div className="mt-2 font-black">{item.productName}</div><div className="mt-1 text-xs text-slate-500">Artwork status: {statusLabel(item.status)}</div></div>)}</div> : <div className="rounded-[22px] border border-dashed p-8 text-center text-sm text-slate-500">Artwork linked to your orders will appear here.</div>}</> : null}
      {section === 'addresses' ? <><h1 className="text-[38px] font-black tracking-[-0.055em]">Saved addresses</h1><p className="mt-2 text-sm text-slate-500">Save delivery and billing details for future checkout.</p><form onSubmit={saveAddress} className="mt-6 rounded-[24px] border bg-white p-5" style={{ borderColor: 'var(--storefront-line, #E3E8F0)' }}><div className="grid gap-3 sm:grid-cols-2"><input name="label" placeholder="Label, e.g. Office" className="rounded-xl border px-3 py-2.5 text-sm" /><input name="recipientName" placeholder="Recipient name" defaultValue={customer.name} className="rounded-xl border px-3 py-2.5 text-sm" /><input name="company" placeholder="Company" defaultValue={customer.company} className="rounded-xl border px-3 py-2.5 text-sm" /><input name="phone" placeholder="Phone" defaultValue={customer.phone} className="rounded-xl border px-3 py-2.5 text-sm" /><input required name="line1" placeholder="Address line 1" className="rounded-xl border px-3 py-2.5 text-sm sm:col-span-2" /><input name="line2" placeholder="Address line 2" className="rounded-xl border px-3 py-2.5 text-sm sm:col-span-2" /><input required name="town" placeholder="Town / city" className="rounded-xl border px-3 py-2.5 text-sm" /><input name="county" placeholder="County" className="rounded-xl border px-3 py-2.5 text-sm" /><input required name="postcode" placeholder="Postcode" className="rounded-xl border px-3 py-2.5 text-sm" /><input name="country" defaultValue="United Kingdom" className="rounded-xl border px-3 py-2.5 text-sm" /></div><div className="mt-4 flex flex-wrap gap-5 text-xs font-bold"><label><input type="checkbox" name="isDefaultShipping" className="mr-2" />Default delivery</label><label><input type="checkbox" name="isDefaultBilling" className="mr-2" />Default billing</label></div><button disabled={busy === 'address'} className="mt-5 rounded-full px-5 py-2.5 text-sm font-black text-white disabled:opacity-50" style={{ backgroundColor: 'var(--storefront-primary, #18A7D0)' }}>{busy === 'address' ? 'Saving…' : 'Save address'}</button></form><div className="mt-6 grid gap-4 md:grid-cols-2">{addresses.map((address) => <div key={address.id} className="rounded-[20px] border bg-white p-5" style={{ borderColor: 'var(--storefront-line, #E3E8F0)' }}><div className="flex justify-between gap-3"><div><div className="font-black">{address.label}</div><div className="mt-2 text-sm leading-6 text-slate-500">{address.recipientName}<br />{address.company ? <>{address.company}<br /></> : null}{address.line1}<br />{address.line2 ? <>{address.line2}<br /></> : null}{address.town}, {address.postcode}<br />{address.country}</div></div><button onClick={() => removeAddress(address.id)} disabled={busy === `delete:${address.id}`} className="h-fit text-xs font-black text-red-700">Remove</button></div><div className="mt-3 flex gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{address.isDefaultShipping ? <span>Delivery default</span> : null}{address.isDefaultBilling ? <span>Billing default</span> : null}</div></div>)}</div></> : null}
    </section>
  </div>;
}

function SecurityCard({ eyebrow, title, icon, children }: { eyebrow: string; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-[560px] rounded-[28px] border bg-white p-7 shadow-sm sm:p-9" style={{ borderColor: 'var(--storefront-line, #E3E8F0)' }}><div className="grid h-12 w-12 place-items-center rounded-2xl" style={{ backgroundColor: 'color-mix(in srgb, var(--storefront-primary, #18A7D0) 12%, white)', color: 'var(--storefront-primary, #18A7D0)' }}>{icon}</div><div className="mt-5 text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--storefront-primary, #18A7D0)' }}>{eyebrow}</div><h1 className="mt-3 text-[36px] font-black tracking-[-0.055em]">{title}</h1><div className="mt-4">{children}</div></div>;
}
