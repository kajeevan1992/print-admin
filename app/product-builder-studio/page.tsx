import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';

const pillars = [
  { title: 'Core model', body: 'Model the product as a system: template + options + production routing + price logic.' },
  { title: 'Admin value', body: 'Create products faster with fewer hidden dependencies and less manual cleanup.' },
  { title: 'Launch outcome', body: 'A more powerful admin than PrintNow for building configurable print products.' }
];

const items = [{ title: 'Product blueprint', body: 'Template type, pages, units, width, height, bleed, editor mode, and storefront publication defaults.' },{ title: 'Option schema', body: 'Dropdown, swatch, text, textarea, numeric, date, file, quantity, and size-select fields with validation and conditional visibility.' },{ title: 'Production routing', body: 'Map product outcomes to printer profiles, material families, finish compatibility, and turnaround lanes.' },{ title: 'Pricing linkage', body: 'Connect each option set to quantity breaks, material uplift, finish charges, setup fees, and tax/shipping awareness.' }];

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Product Builder" subtitle="Build print products the way a production business actually needs them — with templates, option sets, material matrices, finish logic, printer routing, and storefront-ready configuration." />

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
