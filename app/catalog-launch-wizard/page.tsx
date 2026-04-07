import Link from 'next/link';
import { ArrowRight, Boxes, FolderTree, Sparkles, Tag } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';

const steps = [
  { id: '01', title: 'Products', description: 'Create core products and define their launch method.', href: '/products', icon: Boxes },
  { id: '02', title: 'Categories', description: 'Shape catalog structure and storefront navigation.', href: '/categories', icon: FolderTree },
  { id: '03', title: 'Collections', description: 'Curate access-controlled assortments for groups and stores.', href: '/collections', icon: FolderTree },
  { id: '04', title: 'Tags', description: 'Add cross-category discovery paths and browse pages.', href: '/tags', icon: Tag }
];

export default function CatalogLaunchWizardPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Catalog Launch Wizard" subtitle="A guided route through the product catalog structure, from setup to storefront-ready organization." />
      <Card>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-textMuted">
          <Sparkles size={12} /> Guided launch flow
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-4">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <Link key={step.id} href={step.href} className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4 transition hover:bg-white/[0.06]">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-accentAlt"><Icon size={18} /></div>
                <p className="mt-4 text-[11px] uppercase tracking-[0.24em] text-textMuted">Step {step.id}</p>
                <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-white">{step.title}</h3>
                <p className="mt-2 text-[13px] leading-6 text-textMuted">{step.description}</p>
                <div className="mt-4 inline-flex items-center gap-2 text-[12.5px] font-medium text-white">Open step <ArrowRight size={14} /></div>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
