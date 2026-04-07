import Link from 'next/link';
import { Brush, Image as ImageIcon, LayoutTemplate, Palette, Sparkles, Wand2 } from 'lucide-react';
import { AmbientIllustration } from '@/components/ui/ambient-illustration';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';

const lanes = [
  {
    title: 'Brand surfaces',
    description: 'Tune theme, checkout styling, and storefront appearance before launch.',
    links: [
      { href: '/site-theme', label: 'Open site theme' },
      { href: '/checkout-styles', label: 'Open checkout styles' },
      { href: '/translations', label: 'Open translations' }
    ],
    icon: Palette
  },
  {
    title: 'Campaign pages',
    description: 'Build landing pages, page content, and product stories with cleaner visual direction.',
    links: [
      { href: '/landing-pages', label: 'Open landing pages' },
      { href: '/page-content', label: 'Open page content' },
      { href: '/product-content', label: 'Open product content' }
    ],
    icon: LayoutTemplate
  },
  {
    title: 'Creative assets',
    description: 'Review illustrations, promo visuals, and supporting content blocks together.',
    links: [
      { href: '/html-snippets', label: 'Open HTML snippets' },
      { href: '/extended-content', label: 'Open extended content' },
      { href: '/tag-content', label: 'Open tag content' }
    ],
    icon: ImageIcon
  }
];

export default function DesignStudioPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Design Studio" subtitle="A more premium visual hub for theme, content, brand surfaces, and campaign polish." />

      <Card className="overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="p-6 md:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-textMuted">
              <Sparkles size={12} /> Apple-like refinement
            </div>
            <h2 className="mt-4 text-[1.95rem] font-semibold tracking-[-0.05em] text-white">Shape a calmer, lighter storefront experience.</h2>
            <p className="mt-3 max-w-2xl text-[13px] leading-6 text-textMuted">Move from theme edits to page storytelling with fewer jumps and a cleaner visual hierarchy.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/site-theme" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-950 transition hover:opacity-90">
                Open site theme <Brush size={14} />
              </Link>
              <Link href="/landing-pages" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-white/[0.08]">
                Open landing pages <Wand2 size={14} />
              </Link>
            </div>
          </div>
          <div className="border-t border-white/6 p-6 md:border-l md:border-t-0 md:p-8">
            <AmbientIllustration className="h-44" />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        {lanes.map((lane) => {
          const Icon = lane.icon;
          return (
            <Card key={lane.title} className="space-y-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-accentAlt">
                <Icon size={18} />
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-[-0.03em] text-white">{lane.title}</h3>
                <p className="mt-2 text-[13px] leading-6 text-textMuted">{lane.description}</p>
              </div>
              <div className="space-y-2">
                {lane.links.map((link) => (
                  <Link key={link.href} href={link.href} className="block rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-3 text-[12.5px] text-white transition hover:bg-white/[0.06]">
                    {link.label}
                  </Link>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
