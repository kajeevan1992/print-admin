'use client';

import Link from 'next/link';
import { MapPin, PackageCheck, Store, Truck, X } from 'lucide-react';
import { BRAND, storeHref } from './theme-helpers';

const OPTIONS = [
  { title: 'Collection', body: 'Collect from your selected store or collection point once the job is ready.', icon: Store, path: '/collection-points' },
  { title: 'Same day delivery', body: 'Local delivery option for urgent print jobs when available for the tenant store.', icon: Truck, path: '/same-day-delivery' },
  { title: 'Print and ship', body: 'Send finished print by courier or post for wider UK delivery.', icon: PackageCheck, path: '/print-and-ship' },
];

export default function DeliveryOptionsButton({ storeBase }: { storeBase: string }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" onClick={() => setOpen(true)} className="hidden h-9 items-center gap-2 rounded-xl border bg-white px-4 text-[12px] font-black lg:inline-flex" style={{ borderColor: BRAND.line, color: BRAND.ink }}><MapPin className="h-4 w-4" style={{ color: BRAND.primary }} /><span>Select store</span></button>{open ? <div className="fixed inset-0 z-[90] bg-[rgba(16,18,24,0.45)] px-4 py-6 backdrop-blur-sm" onClick={() => setOpen(false)}><div className="mx-auto mt-16 max-w-[760px] overflow-hidden rounded-[30px] border bg-white shadow-[0_34px_100px_rgba(0,0,0,0.22)]" style={{ borderColor: BRAND.line }} onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4 border-b p-6" style={{ borderColor: BRAND.line }}><div><div className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Delivery and collection</div><h2 className="mt-2 text-[30px] font-black tracking-[-0.05em]" style={{ color: BRAND.ink }}>How would you like to receive your order?</h2><p className="mt-2 max-w-[560px] text-[13px] leading-6" style={{ color: BRAND.muted }}>Choose collection, same day delivery, or print and ship. This popup matches the original top-nav behaviour.</p></div><button type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full border bg-white" style={{ borderColor: BRAND.line }}><X className="h-4 w-4" /></button></div><div className="grid gap-4 p-5 md:grid-cols-3">{OPTIONS.map((option) => { const Icon = option.icon; return <Link key={option.title} href={storeHref(storeBase, option.path)} onClick={() => setOpen(false)} className="rounded-[22px] border bg-white p-5 text-left no-underline transition hover:-translate-y-[2px] hover:shadow-[0_18px_44px_rgba(0,0,0,0.08)]" style={{ borderColor: BRAND.line }}><div className="grid h-12 w-12 place-items-center rounded-[18px]" style={{ backgroundColor: 'rgba(24,167,208,0.10)', color: BRAND.primary }}><Icon className="h-6 w-6" /></div><div className="mt-4 text-[17px] font-black tracking-[-0.03em]" style={{ color: BRAND.ink }}>{option.title}</div><p className="mt-2 text-[12px] leading-6" style={{ color: BRAND.muted }}>{option.body}</p></Link>; })}</div></div></div> : null}</>;
}

function useState(initial: boolean) {
  return require('react').useState(initial) as [boolean, (value: boolean) => void];
}
