import { BRAND } from './theme-helpers';
import { SectionHeading, Shell } from './HomePrimitives';
import { whyCards } from './home-extra-data';

export default function HomeWhySection() {
  return <section className="py-8"><Shell><SectionHeading eyebrow="Why choose Holo Print" title="A local print partner for businesses, events and everyday customers." body="This section adds the trust and service depth from the reference homepage, but keeps the Holo Print tone: clean, blue, rounded and professional." /><div className="grid gap-5 md:grid-cols-3">{whyCards.map(([title, text, image]) => <div key={title} className="rounded-[22px] border bg-white p-4 shadow-[0_16px_36px_rgba(0,0,0,0.05)]" style={{ borderColor: BRAND.line }}><img src={image} alt={title} className="h-52 w-full rounded-[16px] object-cover" /><div className="mt-4 text-[17px] font-black tracking-[-0.03em]" style={{ color: BRAND.ink }}>{title}</div><p className="mt-2 text-[12px] leading-6" style={{ color: BRAND.muted }}>{text}</p></div>)}</div></Shell></section>;
}
