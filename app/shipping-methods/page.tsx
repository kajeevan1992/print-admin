export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ShippingMethodsPage } from '@/modules/operations/pages/shipping-methods-page';

export default function Page() {
  return <div className="space-y-4"><div className="flex justify-end"><Link href="/fulfilment-rules" className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.07]">Advanced capacity &amp; postcode rules</Link></div><ShippingMethodsPage /></div>;
}
