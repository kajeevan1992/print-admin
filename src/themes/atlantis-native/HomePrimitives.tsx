import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { BRAND, storeHref } from './theme-helpers';

export function Shell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

export function PrimaryButton({ children, href }: { children: React.ReactNode; href: string }) {
  return <Link href={href} className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-[12px] font-black text-white no-underline shadow-[0_12px_28px_rgba(24,167,208,0.24)]" style={{ backgroundColor: BRAND.primary }}>{children}</Link>;
}

export function SecondaryButton({ children, href }: { children: React.ReactNode; href: string }) {
  return <Link href={href} className="inline-flex items-center gap-2 rounded-full border bg-white px-5 py-3 text-[12px] font-black no-underline" style={{ borderColor: BRAND.line, color: BRAND.ink }}>{children}</Link>;
}

export function SectionHeading({ eyebrow, title, body, action }: { eyebrow: string; title: string; body?: string; action?: React.ReactNode }) {
  return <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><div className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>{eyebrow}</div><h2 className="mt-2 max-w-[760px] text-[30px] font-black leading-[1.02] tracking-[-0.045em]" style={{ color: BRAND.ink }}>{title}</h2>{body ? <p className="mt-3 max-w-[740px] text-[13px] leading-7" style={{ color: BRAND.muted }}>{body}</p> : null}</div>{action}</div>;
}

export function ProductCard({ item, compact = false, storeBase }: { item: any; compact?: boolean; storeBase: string }) {
  return <Link href={storeHref(storeBase, item.path)} className="group rounded-[22px] border bg-white p-4 text-left no-underline shadow-[0_16px_36px_rgba(0,0,0,0.05)] transition hover:-translate-y-[2px] hover:shadow-[0_22px_50px_rgba(0,0,0,0.08)]" style={{ borderColor: BRAND.line }}><div className="overflow-hidden rounded-[16px] bg-[#F4F7FA]"><img src={item.image} alt={item.title} className={`${compact ? 'h-36' : 'h-48'} w-full object-cover transition duration-500 group-hover:scale-[1.04]`} /></div><div className="mt-4 text-[16px] font-black tracking-[-0.03em]" style={{ color: BRAND.ink }}>{item.title}</div>{item.text ? <p className="mt-2 min-h-[42px] text-[12px] leading-6" style={{ color: BRAND.muted }}>{item.text}</p> : null}<div className="mt-3 flex items-center justify-between gap-3"><span className="text-[12px] font-bold" style={{ color: BRAND.ink }}>{item.price}</span><span className="inline-flex items-center gap-1 text-[12px] font-black" style={{ color: BRAND.primary }}>View <ChevronRight className="h-4 w-4" /></span></div></Link>;
}
