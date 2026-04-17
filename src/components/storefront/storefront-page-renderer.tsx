'use client';

import type { PageSchema } from '@/storefront/editor/page-schema';
import { SectionRenderer } from '@/components/editor/section-renderer';

export function StorefrontPageRenderer({ page }: { page: PageSchema }) {
  return (
    <div className="space-y-4">
      {page.sections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </div>
  );
}
