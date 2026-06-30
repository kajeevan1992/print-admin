'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PackageCheck, Store, Truck, X } from 'lucide-react';
import { BRAND, storeHref } from './theme-helpers';

const options = [
  ['Collection', 'Collect from your selected store or collection point.', Store, '/collection-points'],
  ['Same day delivery', 'Local urgent delivery when available for this store.', Truck, '/same-day-delivery'],
  ['Print and ship', 'Send finished print by courier or post.', PackageCheck, '/print-and-ship'],
] as const;

export default function DeliveryPopupInterceptor({ storeBase }: { storeBase: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const link = target?.closest('a[href$="/collection-points"]') as HTMLAnchorElement | null;
      if (!link) return;
      event.preventDefault();
      setOpen(true);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  if (!open) return null;
  return <div className="fixed inset-0 z-[90] bg-[rgba(16,18,24,0.45)] px-4 py-6 backdrop-blur-sm" onClick={() => setOpen(false)}><div className="mx-auto mt-16 max-w-[760px] overflow-hidden rounded-[30px] border bg-white shadow-[0_34px_100px_rgba(0,0,0,0.22)]" style={{ borderColor: BRAND.line }} onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4 border-b p-6" style={{ borderColor: BRAND.line }}><div><div className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Delivery and collection</div><h2 className="mt-2 text-[30px] font-black tracking-[-0.05em]" style={{ color: BRAND.ink }}>How would you like to receive your order?</h2></div><button type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full border bg-white" style={{ borderColor: BRAND.line }}><X className="h-4 w-4" /></button></div><div className="grid gap-4 p-5 md:grid-cols-3">{options.map(([title, body, Icon, path]) => <Link key={title} href={storeHref(storeBase, path)} onClick={() => setOpen(false)} className="rounded-[22px] border bg-white p-5 text-left no-underline transition hover:-translate-y-[2px] hover:shadow-[0_18px_44px_rgba(0,0,0,0.08)]" style={{ borderColor: BRAND.line }}><div className="grid h-12 w-12 place-items-center rounded-[18px]" style={{ backgroundColor: 'rgba(24,167,208,0.10)', color: BRAND.primary }}><Icon className="h-6 w-6" /></div><div className="mt-4 text-[17px] font-black tracking-[-0.03em]" style={{ color: BRAND.ink }}>{title}</div><p className="mt-2 text-[12px] leading-6" style={{ color: BRAND.muted }}>{body}</p></Link>)}</div></div></div>;
}
