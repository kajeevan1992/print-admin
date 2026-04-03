'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Box, Quote, DollarSign, Factory, Settings, Users, Palette, FileText, Store, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { label: 'Dashboard', href: '/', icon: Home },
  { label: 'Products', href: '/products', icon: Box },
  { label: 'Channels', href: '/channels', icon: Store },
  { label: 'Themes', href: '/themes', icon: Palette },
  { label: 'Quotations', href: '/quotes', icon: Quote },
  { label: 'Orders', href: '/orders', icon: ClipboardList },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Pricing', href: '/settings', icon: DollarSign },
  { label: 'Production', href: '/production', icon: Factory },
  { label: 'Content', href: '/content', icon: FileText },
  { label: 'Settings', href: '/settings', icon: Settings }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-72 shrink-0 border-r border-border bg-panel/70 p-4 lg:block">
      <div className="mb-5 rounded-lg bg-panelMuted p-3">
        <p className="text-xs text-textMuted">Print SaaS Admin</p>
        <p className="text-sm font-semibold">Unified Control Center</p>
      </div>
      <nav className="space-y-1 overflow-y-auto pb-8">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link key={item.label} href={item.href} className={cn('flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-textMuted hover:bg-panelMuted hover:text-text', active && 'bg-panelMuted text-text')}>
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
