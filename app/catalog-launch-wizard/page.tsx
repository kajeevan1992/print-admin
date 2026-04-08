import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';

const steps = [
  { title: 'Choose templates', body: 'Start with reusable config templates so product creation is not one-off every time.', href: '/config-templates' },
  { title: 'Model materials & finishes', body: 'Control compatible substrate and finishing options before publishing products.', href: '/materials-library' },
  { title: 'Define printers & routing', body: 'Attach real production capability to the catalog.', href: '/printer-profiles' },
  { title: 'Test price logic', body: 'Preview quantity, material, finish, and machine-driven price outcomes.', href: '/pricing-engine-lab' },
  { title: 'Build the product', body: 'Create launch-ready products using the integrated builder studio.', href: '/product-builder-studio' }
];

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Catalog Launch Wizard" subtitle="A guided sequence for building a production-grade print catalog from templates through launch-ready products." />
      <div className="grid gap-4 lg:grid-cols-2">
        {steps.map((step, index) => (
          <Card key={step.title}>
            <p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Step {index + 1}</p>
            <h3 className="mt-2 text-lg font-semibold text-white">{step.title}</h3>
            <p className="mt-2 text-[13px] leading-6 text-textMuted">{step.body}</p>
            <Link href={step.href} className="mt-4 inline-flex rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-white/[0.06]">Open step</Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
