'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';

const sections = [
  {
    title: 'Blog Content',
    href: '/blog-content',
    description: 'Manage blog posts, campaign articles, release notes, and editorial landing content.'
  },
  {
    title: 'Page Content',
    href: '/page-content',
    description: 'Maintain standard storefront pages such as about, contact, support, and policy pages.'
  },
  {
    title: 'Category CMS',
    href: '/category-cms',
    description: 'Control category landing copy, browse/upload/create flags, and merchandising content.'
  },
  {
    title: 'Extended Content',
    href: '/extended-content',
    description: 'Create flexible campaign and custom audience pages with custom SEO and copy blocks.'
  },
  {
    title: 'HTML Snippets',
    href: '/html-snippets',
    description: 'Manage reusable raw HTML and script snippets for head, footer, product, and checkout zones.'
  }
];

export function ContentHubPage() {
  return (
    <div>
      <PageHeader
        title="Content Control Center"
        subtitle="Manage editorial content, category CMS, extended pages, and reusable HTML snippets across your print storefronts."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <Card key={section.title}>
            <h3 className="text-base font-semibold">{section.title}</h3>
            <p className="mt-2 text-sm text-textMuted">{section.description}</p>
            <div className="mt-4">
              <Link href={section.href} className="text-sm font-medium text-accent">
                Open module
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
