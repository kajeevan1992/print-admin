'use client';

import { X } from 'lucide-react';
import type { NavItem } from './types';

export default function ChromeMobileMenu({ open, navItems, onClose, onNavigate }: { open: boolean; navItems: NavItem[]; onClose: () => void; onNavigate: (path: string) => void }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 bg-black/25 xl:hidden" onClick={onClose}><div className="h-full w-[320px] bg-white p-5" onClick={(event) => event.stopPropagation()}><div className="mb-6 flex items-center justify-between"><div className="text-[24px] font-black">Menu</div><button onClick={onClose}><X className="h-5 w-5" /></button></div><div className="grid gap-1">{navItems.map((item) => <button key={item.label} className="rounded-xl px-3 py-3 text-left text-[14px] font-semibold hover:bg-[#F6F7F8]" onClick={() => { onNavigate(item.path); onClose(); }}>{item.label}</button>)}</div></div></div>;
}
