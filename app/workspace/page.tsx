import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';

const sections = [
  {
    title: 'Catalog control',
    description: 'Manage products, categories, collections, and tags in one place.',
    links: [
      { href: '/products', label: 'Open Products' },
      { href: '/categories', label: 'Open Categories' },
      { href: '/collections', label: 'Open Collections' },
      { href: '/tags', label: 'Open Tags' }
    ]
  },
  {
    title: 'Commerce operations',
    description: 'Jump into orders, quotations, production, and customer workflows.',
    links: [
      { href: '/orders', label: 'Open Orders' },
      { href: '/quotes', label: 'Open Quotations' },
      { href: '/production', label: 'Open Production' },
      { href: '/customers', label: 'Open Customers' }
    ]
  },
  {
    title: 'Storefront and content',
    description: 'Update channels, themes, content records, and page-level content.',
    links: [
      { href: '/channels', label: 'Open Print Store' },
      { href: '/themes', label: 'Open Site Theme' },
      { href: '/content', label: 'Open Content Hub' },
      { href: '/landing-pages', label: 'Open Landing Pages' }
    ]
  },
  {
    title: 'Team productivity',
    description: 'Keep daily admin work moving with alerts, saved views, and command tasks.',
    links: [
      { href: '/notifications', label: 'Open Notifications' },
      { href: '/saved-views', label: 'Open Saved Views' },
      { href: '/command-center', label: 'Open Command Center' },
      { href: '/support-tickets', label: 'Open Support Tickets' }
    ]
  }
];

export default function WorkspacePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspace"
        subtitle="A faster launch point for the busiest admin workflows across catalog, commerce, and storefront operations."
      />

      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
        {sections.map((section) => (
          <Card key={section.title} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-text">{section.title}</h2>
              <p className="mt-1 text-sm text-textMuted">{section.description}</p>
            </div>
            <div className="space-y-2">
              {section.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm font-medium hover:border-accent/40 hover:text-accent"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
