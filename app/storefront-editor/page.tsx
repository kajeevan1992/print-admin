'use client';
import { useState } from 'react';
import { demoPage } from '@/storefront/editor/page-schema';
import { SectionRenderer } from '@/components/editor/section-renderer';

export default function Page() {
  const [page] = useState(demoPage);
  return <div>{page.sections.map(s => <SectionRenderer key={s.id} section={s} />)}</div>;
}
