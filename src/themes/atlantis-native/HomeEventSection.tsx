import Link from 'next/link';
import { BRAND, storeHref } from './theme-helpers';
import { ProductCard, SectionHeading, Shell } from './HomePrimitives';
import { eventProducts } from './home-extra-data';

export default function HomeEventSection({ storeBase }: { storeBase: string }) {
  return <section className="py-8"><Shell><SectionHeading eyebrow="Event print essentials" title="Everything needed for launches, exhibitions, campaigns and local events" /><div className="grid gap-5 lg:grid-cols-[1.05fr_1fr]"><Link href={storeHref(storeBase, '/signage')} className="group overflow-hidden rounded-[26px] border bg-white text-left no-underline shadow-[0_18px_48px_rgba(0,0,0,0.06)]" style={{ borderColor: BRAND.line }}><div className="bg-[linear-gradient(135deg,#18A7D0,#7B3FE4)] p-6 text-white"><div className="inline-flex rounded-full bg-white/18 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]">Hero pick</div><div className="mt-4 text-[34px] font-black tracking-[-0.05em]">Signs, banners and event displays</div><p className="mt-3 max-w-[520px] text-[13px] leading-7 text-white/82">A stronger block for promoting high-value signage and event print without changing your brand colours.</p></div><img src="/native-theme-assets/atlantis/poster-main.svg" alt="Event print" className="h-72 w-full object-cover" /></Link><div className="grid gap-5 sm:grid-cols-2">{eventProducts.map((item) => <ProductCard key={item.title} item={item} compact storeBase={storeBase} />)}</div></div></Shell></section>;
}
