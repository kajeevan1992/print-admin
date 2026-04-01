'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Box, Tags, Quote, DollarSign, Factory, Settings, Users, Palette, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { label: 'Dashboard', href: '/', icon: Home },
  { label: 'Products', href: '/products', icon: Box },
  { label: 'Categories', href: '#', icon: Tags },
  { label: 'Collections', href: '#', icon: FileText },
  { label: 'Tags', href: '#', icon: Tags },
  { label: 'Artwork Proofing', href: '#', icon: Palette },
  { label: 'Quotations', href: '#', icon: Quote },
  { label: 'Pricing', href: '#', icon: DollarSign },
  { label: 'Pricing Rules', href: '#', icon: DollarSign },
  { label: 'Production', href: '#', icon: Factory },
  { label: 'Users', href: '#', icon: Users },
  { label: 'Site Themes', href: '#', icon: Palette },
  { label: 'Content', href: '#', icon: FileText },
  { label: 'Settings', href: '#', icon: Settings }
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
