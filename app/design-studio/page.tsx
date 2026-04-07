import Link from 'next/link';
import { ArrowRight, ImageIcon, Layers3, Palette, Sparkles, Type, Wand2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { AmbientIllustration } from '@/components/ui/ambient-illustration';

const blocks = [
  {
    title: 'Theme system',
    description: 'Fine-tune storefront styling, spacing, color behavior, and page-level presentation.',
    href: '/site-theme',
    icon: Palette
  },
  {
    title: 'Page composition',
    description: 'Shape landing pages, content blocks, snippets, and CMS surfaces that support conversion.',
    href: '/landing-pages',
    icon: Layers3
  },
  {
    title: 'Brand assets',
    description: 'Coordinate typography, imagery, and launch messaging so the experience feels deliberate.',
    href: '/content',
    icon: ImageIcon
  }
];

export default function DesignStudioPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Design Studio"
        subtitle="A calmer visual workspace for themes, landing pages, and content styling — built to help the admin feel more like a premium product."
      />

      <Card className="overflow-hidden p-0">
        <div className="grid gap-0 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="p-6 md:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-textMuted">
              <Sparkles size={12} /> Visual polish workspace
            </div>
            <h2 className="mt-4 max-w-2xl text-[2rem] font-semibold tracking-[-0.05em] text-white">Design with more clarity and less admin friction.</h2>
            <p className="mt-3 max-w-2xl text-[13px] leading-6 text-textMuted">Use this hub when refining the storefront look and feel. It gives the visual side of the platform a more guided and premium working rhythm.</p>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {blocks.map((block) => {
                const Icon = block.icon;
                return (
                  <Link key={block.title} href={block.href} className="rounded-[22px] border border-white/8 bg-black/20 p-4 transition hover:bg-white/[0.05]">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.05] text-accentAlt"><Icon size={17} /></div>
                    <p className="mt-4 text-sm font-medium text-white">{block.title}</p>
                    <p className="mt-1 text-[12px] leading-6 text-textMuted">{block.description}</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-[12px] font-medium text-accentAlt">Open <ArrowRight size={14} /></span>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="border-t border-white/6 bg-white/[0.02] p-6 md:border-l md:border-t-0 md:p-8">
            <AmbientIllustration className="h-52" />
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <div className="flex items-center gap-2 text-white"><Type size={16} className="text-accentAlt" /><p className="text-sm font-medium">Typography pass</p></div>
                <p className="mt-2 text-[12px] leading-6 text-textMuted">Smaller type, lighter weights, and calmer spacing can make the interface feel significantly more premium.</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <div className="flex items-center gap-2 text-white"><Wand2 size={16} className="text-accentAlt" /><p className="text-sm font-medium">Launch visuals</p></div>
                <p className="mt-2 text-[12px] leading-6 text-textMuted">Use focused landing pages and softer visual surfaces instead of relying only on stacked cards and dense settings panels.</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
