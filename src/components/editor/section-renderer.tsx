'use client';
import { Section } from '@/storefront/editor/page-schema';

export function SectionRenderer({ section }: { section: Section }) {
  if (section.type === 'hero') return <div><h2>{section.props.title}</h2><p>{section.props.subtitle}</p></div>;
  if (section.type === 'text') return <div><p>{section.props.text}</p></div>;
  return null;
}
