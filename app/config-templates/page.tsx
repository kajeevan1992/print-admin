import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';

const pillars = [
  { title: 'Core model', body: 'Treat configuration like reusable infrastructure, not hard-coded product forms.' },
  { title: 'Admin value', body: 'Standardize dropdowns, text fields, sizes, and validation across the whole catalog.' },
  { title: 'Launch outcome', body: 'Cleaner product entry and more consistent storefront configuration behavior.' }
];

const items = [{ title: 'Reusable groups', body: 'Create option bundles like Paper, Size, Binding, Finishes, Artwork, Delivery, and Custom Data.' },{ title: 'Field logic', body: 'Default values, required state, helper copy, conditional display, and storefront ordering.' },{ title: 'Compatibility rules', body: 'Only show certain fields when a material, printer, format, or product type supports them.' },{ title: 'Multi-product use', body: 'Apply one template across many products to keep catalog configuration consistent.' }];

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Config Templates" subtitle="Reusable option blueprints for dropdowns, text inputs, size selectors, artwork fields, production constraints, and storefront presentation." />

      <Card className="overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="p-6 md:p-8">
            <div className="inline-flex rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-textMuted">Plugin-inspired production logic</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-white">Make product setup powerful, not fragile.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-textMuted">This surface is designed to help your team model real print-business complexity inside the admin instead of hiding it in theme files or one-off pricing workarounds.</p>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {pillars.map((pillar) => (
                <div key={pillar.title} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-sm font-medium text-white">{pillar.title}</p>
                  <p className="mt-2 text-[13px] leading-6 text-textMuted">{pillar.body}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-white/6 bg-[radial-gradient(circle_at_top_left,rgba(124,140,255,0.18),transparent_42%),rgba(255,255,255,0.03)] p-6 md:border-l md:border-t-0 md:p-8">
            <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">What belongs here</p>
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="mt-1 text-[13px] leading-6 text-textMuted">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
