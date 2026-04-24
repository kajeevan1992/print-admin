'use client';


export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Boxes, Calculator, Layers3, Printer, SwatchBook, WandSparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';

const items = [
  { title: 'Product Builder', href: '/product-builder-studio', icon: WandSparkles, description: 'Design the configurable product schema and production flow.' },
  { title: 'Config Templates', href: '/config-templates', icon: Layers3, description: 'Manage reusable dropdowns, text fields, and option groups.' },
  { title: 'Option Sets', href: '/option-sets', icon: Layers3, description: 'Package reusable size, stock, finish, and delivery choices.' },
  { title: 'Materials Library', href: '/materials-library', icon: SwatchBook, description: 'Control substrates, compatibility, and surcharge behavior.' },
  { title: 'Printer Profiles', href: '/printer-profiles', icon: Printer, description: 'Map production routing and machine capabilities.' },
  { title: 'Pricing Engine', href: '/pricing-engine-lab', icon: Calculator, description: 'Build quantity, material, finish, and turnaround logic.' },
  { title: 'Product Rules Lab', href: '/product-rules-lab', icon: Boxes, description: 'Define conditional field logic and option visibility.' },
  { title: 'Production Routing', href: '/production-routing-lab', icon: Printer, description: 'Control which presses and fallback routes should take each product stack.' }
];

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Product System Console" subtitle="Operate your print-business product stack from one launch surface. This ties together product setup, pricing, compatibility, and rules so the main admin can behave more like a true production platform." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.href} className="p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] text-accentAlt"><Icon size={18} /></div>
              <h3 className="mt-4 text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-textMuted">{item.description}</p>
              <Link href={item.href} className="mt-4 inline-flex rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-[12px] text-white">Open</Link>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
