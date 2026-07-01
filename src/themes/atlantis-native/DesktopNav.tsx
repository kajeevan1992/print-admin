'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import type { NavItem } from './types';
import { BRAND, storeHref } from './theme-helpers';

export default function DesktopNav({ currentPath = '/', navItems, storeBase }: { currentPath?: string; navItems: NavItem[]; storeBase: string }) {
  const [openLabel, setOpenLabel] = useState<string | null>(null);
  return <nav className="relative hidden items-center justify-center gap-4 xl:flex" onMouseLeave={() => setOpenLabel(null)}>{navItems.map((item) => { const active = currentPath === item.path || currentPath.startsWith(`${item.path}/`); const open = openLabel === item.label; return <Link key={item.label} href={storeHref(storeBase, item.path)} onMouseEnter={() => setOpenLabel(item.label)} className="inline-flex items-center gap-1 text-[13px] font-semibold tracking-[-0.01em] no-underline" style={{ color: active || open ? BRAND.primary : BRAND.ink }}>{item.label}<ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} /></Link>; })}</nav>;
}
