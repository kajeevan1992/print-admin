'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import type { NavItem } from './types';
import { storeHref } from './theme-helpers';
import ChromeMobileMenu from './ChromeMobileMenu';

export default function HeaderMobileButton({ navItems, storeBase }: { navItems: NavItem[]; storeBase: string }) {
  const [open, setOpen] = useState(false);
  const go = (path: string) => { window.location.href = storeHref(storeBase, path); };
  return <><button type="button" className="rounded-xl p-2 xl:hidden" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button><ChromeMobileMenu open={open} navItems={navItems} onClose={() => setOpen(false)} onNavigate={go} /></>;
}
