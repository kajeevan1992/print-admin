'use client';

import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import type { NavItem } from './types';

export default function ChromeMobileMenu({ open, navItems, onClose, onNavigate }: { open: boolean; navItems: NavItem[]; onClose: () => void; onNavigate: (path: string) => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (!open) return null;
  return <div className="fixed inset-0 z-50 bg-black/25 xl:hidden" onClick={onClose}><div className="h-full w-[min(360px,92vw)] overflow-y-auto bg-white p-5" onClick={(event) => event.stopPropagation()}><div className="mb-6 flex items-center justify-between"><div className="text-[24px] font-black">Menu</div><button type="button" onClick={onClose} aria-label="Close menu"><X className="h-5 w-5" /></button></div><div className="grid gap-2">{navItems.map((item) => {
    const childCount = item.columns.reduce((total, column) => total + column.links.length, 0);
    const hasChildren = childCount > 0;
    const isExpanded = expanded === item.path;
    return <div key={`${item.label}-${item.path}`} className="overflow-hidden rounded-xl border border-black/5">
      <div className="flex items-center">
        <button type="button" className="flex-1 px-3 py-3 text-left text-[14px] font-semibold hover:bg-[#F6F7F8]" onClick={() => { onNavigate(item.path); onClose(); }}>{item.label}</button>
        {hasChildren ? <button type="button" aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${item.label}`} aria-expanded={isExpanded} className="grid h-11 w-11 place-items-center hover:bg-[#F6F7F8]" onClick={() => setExpanded(isExpanded ? null : item.path)}><ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} /></button> : null}
      </div>
      {hasChildren && isExpanded ? <div className="border-t border-black/5 bg-[#F8F9FA] px-3 py-3">{item.columns.map((column) => <div key={column.title} className="mb-4 last:mb-0"><div className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-black/45">{column.title}</div><div className="grid gap-1">{column.links.map(([label, path]) => <button type="button" key={`${label}-${path}`} className="rounded-lg px-3 py-2 text-left text-[13px] font-medium hover:bg-white" onClick={() => { onNavigate(path); onClose(); }}>{label}</button>)}</div></div>)}</div> : null}
    </div>;
  })}</div></div></div>;
}
