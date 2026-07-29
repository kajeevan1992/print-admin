'use client';

import { useState } from 'react';
import { MapPin } from 'lucide-react';
import FulfillmentSelector from './FulfillmentSelector';
import type { CollectionPoint } from './collection-points';
import { BRAND } from './theme-helpers';

export default function HeaderFulfillmentControl({ tenantSlug, storeSlug, collectionPoints }: { tenantSlug: string; storeSlug: string; collectionPoints: CollectionPoint[] }) {
  const [open, setOpen] = useState(false);

  return <>
    <button type="button" onClick={() => setOpen(true)} className="hidden items-center gap-2 whitespace-nowrap rounded-xl border bg-white px-3 py-2 text-[12px] font-semibold transition hover:bg-[#F8FAFC] md:inline-flex" style={{ borderColor: BRAND.line, color: BRAND.ink }} title="Choose collection or delivery">
      <MapPin className="h-4 w-4" style={{ color: BRAND.primary }} />
      <span>Select store</span>
    </button>
    <div className="[&>button]:hidden">
      <FulfillmentSelector compact forceOpen={open} onClose={() => setOpen(false)} tenantSlug={tenantSlug} storeSlug={storeSlug} collectionPoints={collectionPoints} />
    </div>
  </>;
}
