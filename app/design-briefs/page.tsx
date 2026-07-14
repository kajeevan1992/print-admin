'use client';

import { useEffect, useMemo, useState } from 'react';

type Brief = Record<string, any>;
type Summary = { total?: number; needsReview?: number; quoteRequired?: number; quoteSent?: number; quotePaid?: number; readyForDesign?: number };

const statusOptions = [
  ['needs-review', 'Needs review'],
  ['quote-required', 'Quote required'],
  ['quote-sent', 'Quote sent'],
  ['no-extra-charge', 'No extra charge'],
  ['approved-to-design', 'Approved to design'],
  ['design-in-progress', 'Design in progress'],
  ['proof-sent', 'Proof sent / waiting approval'],
  ['revision-requested', 'Revision requested'],
  ['revision-in-progress', 'Revision in progress'],
  ['waiting-customer', 'Waiting customer'],
  ['closed', 'Closed'],
];

function moneyMinor(value: unknown) {
  const amount = Number(value || 0);
  return amount > 0 ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount / 100) : 'Not set';
}
function dateLabel(value: unknown) {
  const raw = String(value || '');
  if (!raw) return 'Not set';
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
function statusTone(value: string) {
  if (['quote-required', 'waiting-customer', 'revision-requested'].includes(value)) return 'border-amber-300 bg-amber-50 text-amber-800';
  if (['quote-sent', 'proof-sent'].includes(value)) return 'border-sky-300 bg-sky-50 text-sky-800';
  if (['no-extra-charge', 'approved-to-design', 'design-in-progress', 'revision-in-progress'].includes(value)) return 'border-emerald-300 bg-emerald-50 text-emerald-800';
  if (value === 'closed') return 'border-slate-300 bg-slate-100 text-slate-700';
  return 'border-rose-200 bg-rose-50 text-rose-800';
}
function field(brief: Brief, key: string, label: string) {
  const value = String(brief[key] || '').trim();
  if (!value) return null;
  return <div className="rounded-2xl border border-slate-200 bg-white p-3"><p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p><p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-slate-800">{value}</p></div>;
}
function text(value: unknown) { return String(value || '').trim(); }
function paymentUrl(brief: Brief) { return text(brief.designQuotePaymentUrl || brief.ticket?.designQuotePaymentUrl); }
function paymentStatus(brief: Brief) { return text(brief.designQuotePaymentStatus || brief.ticket?.designQuotePaymentStatus) || 'not-requested'; }
function proofUrl(brief: Brief) { return text(brief.designProofUrl || brief.ticket?.designProofUrl); }
function proofVersion(brief: Brief) { const value = Number(brief.ticket?.proofVersion || brief.proofVersion || 0); return Number.isFinite(value) && value > 0 ? value : 0; }
function proofToken(brief: Brief) { return text(brief.ticket?.proofToken || brief.proofToken); }
function decidedVersion(brief: Brief) { const value = Number(brief.decidedProofVersion || brief.ticket?.decidedProofVersion || 0); return Number.isFinite(value) && value > 0 ? value : 0; }
function decidedToken(brief: Brief) { return text(brief.decidedProofToken || brief.ticket?.decidedProofToken); }
function proofEvents(brief: Brief) { const direct = Array.isArray(brief.proofEvents) ? brief.proofEvents : []; const ticket = Array.isArray(brief.ticket?.proofEvents) ? brief.ticket.proofEvents : []; return direct.length ? direct : ticket; }
function eventTitle(event: Brief) {
  const action = text(event.action).replace(/-/g, ' ');
  const version = event.proofVersion ? `v${event.proofVersion}` : '';
  if (event.action === 'proof-sent') return `Proof ${version} sent`;
  if (event.action === 'proof-resent') return `Proof ${version} email resent`;
  if (event.action === 'customer-proof-approved') return `Customer approved ${version}`;
  if (String(event.action || '').includes('revision')) return `Customer requested changes ${version}`;
  return `${action || 'Proof event'} ${version}`.trim();
}
function proofReviewUrl(brief: Brief) {
  const orderId = text(brief.orderNumber || brief.orderId || brief.ticket?.orderNumber || brief.ticket?.orderId);
  if (!orderId) return '';
  const params = new URLSearchParams({ orderId });
  const email = text(brief.customerEmail || brief.customer?.email);
  const token = proofToken(brief);
  const version = proofVersion(brief);
  if (email) params.set('email', email);
  if (token) params.set('proofToken', token);
  if (version) params.set('proofVersion', String(version));
  return `/proof-action?${params.toString()}`;
}
function proofDecisionLabel(brief: Brief) {
  const currentVersion = proofVersion(brief);
  const decisionVersion = decidedVersion(brief);
  if (!decisionVersion) return 'No customer decision yet';
  if (!currentVersion) return `Decision recorded on v${decisionVersion}`;
  return decisionVersion === currentVersion ? `Decision matches current v${currentVersion}` : `Decision was on old v${decisionVersion}; current is v${currentVersion}`;
}

function BriefCard({ brief, onUpdated }: { brief: Brief; onUpdated: () => void }) {
  const [status, setStatus] = useState(String(brief.designQuoteStatus || 'needs-review'));
  const [amount, setAmount] = useState(brief.quoteAmountMinor ? String(Number(brief.quoteAmountMinor) / 100) : '');
  const [note, setNote] = useState(String(brief.staffNote || ''));
  const [designProofUrl, setDesignProofUrl] = useState(proofUrl(brief));
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const [latestPaymentUrl, setLatestPaymentUrl] = useState(paymentUrl(brief));
  const ticket = brief.ticket || {};
  const visiblePaymentUrl = latestPaymentUrl || paymentUrl(brief);
  const visibleProofUrl = designProofUrl || proofUrl(brief);
  const currentProofVersion = proofVersion(brief);
  const currentProofToken = proofToken(brief);
  const customerDecisionVersion = decidedVersion(brief);
  const customerDecisionToken = decidedToken(brief);
  const reviewHref = proofReviewUrl(brief);
  const decisionMatchesCurrent = Boolean(customerDecisionVersion && currentProofVersion && customerDecisionVersion === currentProofVersion && (!customerDecisionToken || !currentProofToken || customerDecisionToken === currentProofToken));
  const events = proofEvents(brief).slice(0, 8);

  async function save() {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/internal/design-briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: brief.id, designQuoteStatus: status, quoteAmountMinor: Math.round(Number(amount || 0) * 100), staffNote: note, designProofUrl, actor: 'admin-design-review' }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) throw new Error(payload.error || 'Update failed');
      const url = payload.paymentSession?.url || payload.brief?.designQuotePaymentUrl || '';
      if (url) setLatestPaymentUrl(url);
      if (payload.brief?.designProofUrl) setDesignProofUrl(payload.brief.designProofUrl);
      setMessage(status === 'proof-sent' ? `Design proof v${payload.brief?.proofVersion || 'new'} sent for customer approval` : status === 'revision-in-progress' ? 'Design revision marked in progress' : url ? 'Updated and payment link created' : 'Updated');
      onUpdated();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  }
  async function resendProofEmail() {
    if (!currentProofVersion || !currentProofToken) {
      setMessage('No current proof token/version exists to resend. Send a proof first.');
      return;
    }
    setResending(true);
    setMessage('');
    try {
      const response = await fetch('/api/internal/design-briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: brief.id, action: 'resend-proof-email', resendProofEmail: true, staffNote: note, designProofUrl: visibleProofUrl, actor: 'admin-design-review' }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) throw new Error(payload.error || 'Resend failed');
      if (payload.brief?.designProofUrl) setDesignProofUrl(payload.brief.designProofUrl);
      setMessage(payload.message || `Design proof v${currentProofVersion} email resent to customer.`);
      onUpdated();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Resend failed');
    } finally {
      setResending(false);
    }
  }
  async function copyLink(value = visiblePaymentUrl, label = 'Link') {
    if (!value) return;
    const fullUrl = value.startsWith('/') ? `${window.location.origin}${value}` : value;
    await navigator.clipboard?.writeText(fullUrl).catch(() => null);
    setMessage(`${label} copied`);
  }

  return <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{brief.orderNumber || brief.orderId}</p>
        <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">{brief.productName || 'Design brief'}</h2>
        <p className="mt-2 text-sm font-semibold text-slate-500">{brief.customerName || 'Customer'} · {brief.customerEmail || 'No email'} · submitted {dateLabel(brief.submittedAt)}</p>
      </div>
      <div className={`rounded-full border px-4 py-2 text-xs font-black ${statusTone(String(brief.designQuoteStatus || 'needs-review'))}`}>{brief.designQuoteStatus || 'needs-review'}</div>
    </div>

    <div className="mt-5 grid gap-3 lg:grid-cols-5">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Ticket</p><p className="mt-1 text-sm font-black text-slate-900">{ticket.status || 'No ticket linked'}</p><p className="mt-1 text-xs text-slate-500">{ticket.blockReason || 'No block reason recorded'}</p></div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Print payment</p><p className="mt-1 text-sm font-black text-slate-900">{ticket.paymentStatus || 'Unknown'}</p><p className="mt-1 text-xs text-slate-500">Print order payment state</p></div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Design quote</p><p className="mt-1 text-sm font-black text-slate-900">{moneyMinor(brief.quoteAmountMinor)}</p><p className="mt-1 text-xs text-slate-500">Extra design charge, if required</p></div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Quote payment</p><p className="mt-1 text-sm font-black text-slate-900">{paymentStatus(brief)}</p><p className="mt-1 text-xs text-slate-500">Stripe design quote payment state</p></div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Proof version</p><p className="mt-1 text-sm font-black text-slate-900">{currentProofVersion ? `v${currentProofVersion}` : 'Not sent'}</p><p className={`mt-1 text-xs font-semibold ${decisionMatchesCurrent ? 'text-emerald-700' : customerDecisionVersion ? 'text-amber-700' : 'text-slate-500'}`}>{proofDecisionLabel(brief)}</p></div>
    </div>

    {String(brief.designQuoteStatus || '') === 'revision-requested' ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-black">Customer requested design changes</p><p className="mt-1">Move this to <strong>Revision in progress</strong> when a designer starts revising. Then use <strong>Proof sent / waiting approval</strong> again with the updated proof URL.</p></div> : null}

    {visiblePaymentUrl ? <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-sky-700">Customer payment link</p>
      <p className="mt-2 break-all text-xs font-semibold text-sky-900">{visiblePaymentUrl}</p>
      <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => copyLink(visiblePaymentUrl, 'Payment link')} className="rounded-full bg-sky-700 px-4 py-2 text-xs font-black text-white">Copy link</button><a href={visiblePaymentUrl} target="_blank" rel="noreferrer" className="rounded-full border border-sky-200 bg-white px-4 py-2 text-xs font-black text-sky-800 no-underline">Open link</a></div>
    </div> : null}

    {visibleProofUrl ? <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-violet-700">Design proof file</p>
      <p className="mt-2 break-all text-xs font-semibold text-violet-900">{visibleProofUrl}</p>
      <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => copyLink(visibleProofUrl, 'Proof file link')} className="rounded-full bg-violet-700 px-4 py-2 text-xs font-black text-white">Copy proof file</button><a href={visibleProofUrl} target="_blank" rel="noreferrer" className="rounded-full border border-violet-200 bg-white px-4 py-2 text-xs font-black text-violet-800 no-underline">Open proof</a></div>
    </div> : null}

    {reviewHref ? <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-indigo-700">Current customer review link</p>
      <p className="mt-2 break-all text-xs font-semibold text-indigo-900">{reviewHref}</p>
      <div className="mt-2 grid gap-2 md:grid-cols-3">
        <div className="rounded-xl bg-white/70 p-3"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-indigo-500">Current version</p><p className="mt-1 text-sm font-black text-indigo-950">{currentProofVersion ? `v${currentProofVersion}` : 'Not set'}</p></div>
        <div className="rounded-xl bg-white/70 p-3"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-indigo-500">Decision version</p><p className="mt-1 text-sm font-black text-indigo-950">{customerDecisionVersion ? `v${customerDecisionVersion}` : 'None yet'}</p></div>
        <div className="rounded-xl bg-white/70 p-3"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-indigo-500">Token check</p><p className="mt-1 text-xs font-bold text-indigo-950">{currentProofToken ? currentProofToken : 'No token'}</p></div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => copyLink(reviewHref, 'Review link')} className="rounded-full bg-indigo-700 px-4 py-2 text-xs font-black text-white">Copy review link</button><a href={reviewHref} target="_blank" rel="noreferrer" className="rounded-full border border-indigo-200 bg-white px-4 py-2 text-xs font-black text-indigo-800 no-underline">Open review page</a><button onClick={() => void resendProofEmail()} disabled={resending || !currentProofVersion || !currentProofToken} className="rounded-full border border-indigo-200 bg-white px-4 py-2 text-xs font-black text-indigo-800 disabled:opacity-50">{resending ? 'Resending…' : 'Resend proof email'}</button></div>
      <p className="mt-3 text-xs font-semibold text-indigo-700">Resend keeps the same proof version/token and only sends the current secure approval link again.</p>
    </div> : null}

    {events.length ? <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Proof event history</p>
      <div className="mt-3 space-y-2">{events.map((event: Brief, index: number) => <div key={event.id || `${event.action}-${index}`} className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"><p className="text-sm font-black text-slate-900">{eventTitle(event)}</p><p className="text-xs font-semibold text-slate-500">{dateLabel(event.at)}</p></div>
        <p className="mt-1 text-xs font-semibold text-slate-600">{event.actor || 'system'} · email {event.emailStatus || 'n/a'} · release {event.productionReleaseState || 'n/a'}</p>
        {event.note ? <p className="mt-2 whitespace-pre-wrap text-xs text-slate-700">{event.note}</p> : null}
        {event.reviewUrl ? <p className="mt-2 break-all text-[11px] font-semibold text-indigo-700">{event.reviewUrl}</p> : null}
      </div>)}</div>
    </div> : null}

    <div className="mt-5 grid gap-3 md:grid-cols-2">
      {field(brief, 'designType', 'Design type')}
      {field(brief, 'designGoal', 'Goal')}
      {field(brief, 'suppliedText', 'Text/content')}
      {field(brief, 'logoStatus', 'Logo/assets')}
      {field(brief, 'brandColours', 'Brand colours/style')}
      {field(brief, 'deadline', 'Deadline')}
      {field(brief, 'budgetExpectation', 'Budget expectation')}
      {field(brief, 'inspiration', 'Reference link')}
      {field(brief, 'mustInclude', 'Must include')}
      {field(brief, 'avoid', 'Avoid')}
      {field(brief, 'designWorkState', 'Design/proof state')}
      {field(brief, 'customerProofStatus', 'Customer proof status')}
      {field(brief, 'proofDecisionNote', 'Customer proof note')}
      {field(brief, 'proofRevisionNote', 'Revision request')}
      {field(brief, 'productionReleaseState', 'Production release state')}
      {field(brief, 'proofDecisionAt', 'Proof decision at')}
      {field(brief, 'proofApprovedAt', 'Proof approved at')}
      {field(brief, 'proofRevisionRequestedAt', 'Revision requested at')}
    </div>

    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-3 lg:grid-cols-[220px_180px_minmax(0,1fr)_auto] lg:items-end">
        <label className="text-sm font-bold text-slate-700">Review state<select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-sm font-bold text-slate-700">Extra quote £<input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="0" step="0.01" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
        <label className="text-sm font-bold text-slate-700">Staff note<input value={note} onChange={(event) => setNote(event.target.value)} placeholder="What did you decide / what is needed next?" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
        <button onClick={save} disabled={saving} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{saving ? 'Saving…' : status === 'quote-sent' ? 'Save + create link' : status === 'proof-sent' ? 'Send new proof version' : status === 'revision-in-progress' ? 'Start revision' : 'Save review'}</button>
      </div>
      <label className="mt-3 block text-sm font-bold text-slate-700">Design proof URL<input value={designProofUrl} onChange={(event) => setDesignProofUrl(event.target.value)} placeholder="Link to PDF/proof preview for customer approval" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
      {status === 'quote-sent' ? <p className="mt-3 text-xs font-semibold text-slate-500">When quote amount is above £0, saving creates a Stripe payment link for the extra design charge.</p> : null}
      {status === 'proof-sent' ? <p className="mt-3 text-xs font-semibold text-slate-500">This creates a new proof version and proof token, emails the customer, and keeps print production blocked until approval.</p> : null}
      {status === 'revision-in-progress' ? <p className="mt-3 text-xs font-semibold text-slate-500">Use this after a customer requests design proof changes. When the revised design is ready, choose Proof sent / waiting approval and add the new proof URL.</p> : null}
      {message ? <p className="mt-3 text-xs font-bold text-slate-500">{message}</p> : null}
    </div>
  </article>;
}

export default function DesignBriefsPage() {
  const [items, setItems] = useState<Brief[]>([]);
  const [summary, setSummary] = useState<Summary>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/internal/design-briefs', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) throw new Error(payload.error || 'Could not load design briefs');
      setItems(payload.items || []);
      setSummary(payload.summary || {});
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not load design briefs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);
  const filtered = useMemo(() => filter === 'all' ? items : items.filter((item) => String(item.designQuoteStatus || 'needs-review') === filter), [filter, items]);

  return <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-950 lg:px-8">
    <section className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-[11px] font-black uppercase tracking-[0.25em] text-sky-600">Design operations</p><h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">Customer design briefs</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">Review submitted design-help briefs, decide if an extra design quote is needed, create Stripe design quote links, send versioned design proofs for approval, handle revisions, and keep print production blocked until proof approval.</p></div>
          <button onClick={() => void load()} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Refresh</button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {[["Total", summary.total || 0], ["Needs review", summary.needsReview || 0], ["Quote required", summary.quoteRequired || 0], ["Quote sent", summary.quoteSent || 0], ["Quote paid", summary.quotePaid || 0], ["Ready/proof/revision", summary.readyForDesign || 0]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>)}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">{['all', ...statusOptions.map(([value]) => value)].map((value) => <button key={value} onClick={() => setFilter(value)} className={`rounded-full border px-4 py-2 text-xs font-black ${filter === value ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>{value === 'all' ? 'All' : statusOptions.find(([key]) => key === value)?.[1] || value}</button>)}</div>

      {loading ? <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">Loading design briefs…</div> : null}
      {error ? <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-800">{error}</div> : null}
      {!loading && !error && !filtered.length ? <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">No design briefs found for this filter.</div> : null}
      <div className="space-y-5">{filtered.map((brief) => <BriefCard key={brief.id} brief={brief} onUpdated={load} />)}</div>
    </section>
  </main>;
}