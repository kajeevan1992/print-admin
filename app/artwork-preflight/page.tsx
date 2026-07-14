export const dynamic = 'force-dynamic';

import Link from 'next/link';

const workflowCards = [
  {
    title: '1. Product artwork rules',
    href: '/product-builder-artwork',
    eyebrow: 'Admin setup',
    body: 'Set accepted file types, bleed, safe area, DPI, PDF preference, checkout blocking, machine/material limits and customer guidance per product.',
    status: 'Product-owned rules',
  },
  {
    title: '2. Artwork upload intake',
    href: '/artwork-uploads',
    eyebrow: 'Staff queue',
    body: 'See every storefront artwork upload, preflight result, linked order, linked production ticket and handoff state from one queue.',
    status: 'Existing upload module',
  },
  {
    title: '3. Proofing decisions',
    href: '/artwork-proofing',
    eyebrow: 'Prepress approval',
    body: 'Review uploads, decide pass/warning/fail, hold blocked work, and release safe artwork into the customer approval or production flow.',
    status: 'Production-safe gate',
  },
  {
    title: '4. Design-help briefs',
    href: '/design-briefs',
    eyebrow: 'Design workflow',
    body: 'Manage customer design briefs, extra design quote payments, versioned design proofs, revision loops and secure proof resend emails.',
    status: 'Design proof loop',
  },
  {
    title: '5. Production planner',
    href: '/production-planner',
    eyebrow: 'Release control',
    body: 'Confirm that artwork, proof and payment gates are clear before work reaches prepress, print, finishing or dispatch.',
    status: 'Release-gated',
  },
  {
    title: '6. Dispatch handoff',
    href: '/dispatch-center',
    eyebrow: 'Fulfilment',
    body: 'Keep blocked proof/payment orders out of dispatch and move only production-ready work into collection or delivery handoff.',
    status: 'No blocked dispatch',
  },
];

const customerCards = [
  {
    title: 'Upload replacement artwork',
    href: '/storefront/upload-artwork',
    body: 'Customer-facing upload page for replacement artwork after a failed preflight or requested correction.',
  },
  {
    title: 'Track order',
    href: '/track-order',
    body: 'Customer order status, next action, proof history, production status and dispatch progress.',
  },
  {
    title: 'Design brief form',
    href: '/design-brief',
    body: 'Customer design-help follow-up form after checkout when they choose design support instead of uploading print-ready artwork.',
  },
  {
    title: 'Launch proof readiness',
    href: '/launch-design-proof-readiness',
    body: 'Launch health checks for design briefs, proof tokens, proof files, proof events, payment holds and proof email queue health.',
  },
];

const safetyRules = [
  'Product pages only collect product options, quantity and turnaround. Artwork choices stay in checkout/cart.',
  'Upload-now checkout blocks payment when artwork preflight has a blocking issue.',
  'Upload-later orders are accepted but production stays held until artwork is uploaded and approved.',
  'Design-help orders can be paid first, then held while staff reviews the brief, quotes design work and sends versioned proofs.',
  'Only the current proof token/version can approve production. Old proof links and stale decisions stay blocked.',
  'Production and dispatch stay blocked until both proof/artwork and payment gates are released.',
];

function CardLink({ item }: { item: { title: string; href: string; eyebrow?: string; body: string; status?: string } }) {
  return (
    <Link href={item.href} className="group block rounded-[26px] border border-white/10 bg-white/[0.03] p-5 transition hover:border-sky-400/40 hover:bg-white/[0.06]">
      <div className="flex min-h-full flex-col justify-between gap-5">
        <div>
          {item.eyebrow ? <p className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-200">{item.eyebrow}</p> : null}
          <h2 className="mt-2 text-xl font-black tracking-[-0.04em] text-white">{item.title}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">{item.body}</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          {item.status ? <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-100">{item.status}</span> : <span />}
          <span className="text-sm font-black text-sky-200 group-hover:text-white">Open →</span>
        </div>
      </div>
    </Link>
  );
}

export default function ArtworkPreflightHubPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-sky-200">Artwork preflight module</p>
              <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] sm:text-5xl">Artwork, proofing and production safety hub</h1>
              <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300">
                This page connects the existing product artwork rules, checkout upload gate, staff upload queue, proofing decisions, design-help proof loop, production planner and dispatch handoff. It is a navigation and safety hub, not a duplicate workflow.
              </p>
            </div>
            <Link href="/launch-design-proof-readiness" className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950">Run proof readiness</Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workflowCards.map((item) => <CardLink key={item.href} item={item} />)}
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-200">Safety rules</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">What must stay true before launch</h2>
            <div className="mt-4 space-y-3">
              {safetyRules.map((rule, index) => (
                <div key={rule} className="flex gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-sm leading-6 text-slate-300">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-black text-slate-950">{index + 1}</span>
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-violet-200">Customer-facing flow</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">Pages connected to artwork decisions</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {customerCards.map((item) => <CardLink key={item.href} item={item} />)}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-emerald-400/20 bg-emerald-400/10 p-5 text-sm leading-7 text-emerald-100">
          <p className="font-black text-white">Launch position</p>
          <p className="mt-2">
            The missing `/artwork-preflight` route is now a real module hub. It closes the 404 gap while keeping the backend ownership correct: product builder owns rules, checkout owns pre-payment gating, artwork uploads/proofing own staff checks, design briefs own customer design proof rounds, and production/dispatch own release gates.
          </p>
        </section>
      </div>
    </main>
  );
}
