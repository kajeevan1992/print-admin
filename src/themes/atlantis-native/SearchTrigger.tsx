'use client';

import { Search } from 'lucide-react';
import { BRAND } from './theme-helpers';

export default function SearchTrigger() {
  return <button type="button" onClick={() => window.dispatchEvent(new Event('open-holo-search'))}><span className="grid h-9 w-9 place-items-center rounded-xl border bg-white" style={{ borderColor: BRAND.line }}><Search className="h-4 w-4" /></span></button>;
}
