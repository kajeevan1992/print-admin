'use client';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';

const items = [
  {
    id: 'landing-page-1',
    title: 'Spring Promotions',
    subtitle: 'Campaign landing page',
    meta: 'Status: Published • Layout: Hero + Grid',
    slug: 'spring-promotions',
    layout: 'hero-grid',
    status: 'published',
    audience: 'all-customers',
    primaryGoal: 'lead-generation'
  },
  {
    id: 'landing-page-2',
    title: 'Schools Welcome Pack',
    subtitle: 'Sector-specific landing page',
    meta: 'Status: Draft • Layout: Story + CTA',
    slug: 'schools-welcome-pack',
    layout: 'story-cta',
    status: 'draft',
    audience: 'education',
    primaryGoal: 'catalog-access'
  }
];

export function LandingPagesPage() {
  return (
    <LocalRecordsPage
      storageKey="content-landing-pages"
      title="Landing Pages"
      subtitle="Create campaign, sector, and promotional landing pages that connect themes, content, and storefront conversion goals."
      createLabel="Add Landing Page"
      initialItems={items}
      fields={[
        { key: 'title', label: 'Landing Page Title', placeholder: 'Spring Promotions' },
        { key: 'slug', label: 'Slug', placeholder: 'spring-promotions' },
        { key: 'layout', label: 'Layout', options: ['hero-grid', 'story-cta', 'catalog-focus', 'signup-focus'] },
        { key: 'status', label: 'Status', options: ['draft', 'published', 'scheduled'] },
        { key: 'audience', label: 'Audience', options: ['all-customers', 'education', 'retail', 'b2b', 'trade'] },
        { key: 'primaryGoal', label: 'Primary Goal', options: ['lead-generation', 'catalog-access', 'promotion-redemption', 'quote-request'] }
      ]}
      subtitleFields={['layout', 'status']}
      cardMetaFields={['audience', 'primaryGoal']}
      searchKeys={['title', 'slug', 'layout', 'status', 'audience', 'primaryGoal']}
    />
  );
}
