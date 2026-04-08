import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';

const pillars = [
  { title: 'Core model', body: 'A machine capability layer that keeps product setup grounded in reality.' },
  { title: 'Admin value', body: 'Reduce misrouting and bad production assumptions during product setup.' },
  { title: 'Launch outcome', body: 'Higher launch confidence because the catalog matches real print capability.' }
];

const items = [{ title: 'Capability matrix', body: 'Color mode, max sheet size, max roll width, duplex ability, and white/varnish/inkset support.' },{ title: 'Routing rules', body: 'Preferred products, fallback devices, turnaround lanes, and operator grouping.' },{ title: 'Material support', body: 'Only allow compatible materials and finishes per device profile.' },{ title: 'Planning data', body: 'Setup time, hourly capacity, click cost, and utilization notes for production planning.' }];

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Printer Profiles" subtitle="Capture digital, large-format, and offset printer capabilities so products can route intelligently by material, sheet size, color mode, and turnaround." />

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
