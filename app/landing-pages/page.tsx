'use client';


export const dynamic = 'force-dynamic';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="content-landing-pages"
      title="Landing Pages"
      subtitle="Manage campaign and audience landing pages used across storefronts, promotions, and customer-specific funnels."
      createLabel="Add Landing Page"
      initialItems={[
        {
          id: 'landing-1',
          title: 'Spring Print Launch',
          subtitle: 'hero • published',
          meta: 'B2B buyers • lead-generation',
          slug: 'spring-print-launch',
          layout: 'hero',
          status: 'published',
          audience: 'b2b-buyers',
          primaryGoal: 'lead-generation'
        },
        {
          id: 'landing-2',
          title: 'University Welcome Kits',
          subtitle: 'catalog • draft',
          meta: 'education • quote-request',
          slug: 'university-welcome-kits',
          layout: 'catalog',
          status: 'draft',
          audience: 'education',
          primaryGoal: 'quote-request'
        },
        {
          id: 'landing-3',
          title: 'Summer Promo Hub',
          subtitle: 'promo • published',
          meta: 'retail • promotion-redemption',
          slug: 'summer-promo-hub',
          layout: 'promo',
          status: 'published',
          audience: 'retail',
          primaryGoal: 'promotion-redemption'
        }
      ]}
      fields={[
        { key: 'slug', label: 'Slug' },
        { key: 'layout', label: 'Layout', options: ['hero', 'catalog', 'promo', 'minimal'] },
        { key: 'status', label: 'Status', options: ['draft', 'published', 'archived'] },
        { key: 'audience', label: 'Audience', options: ['b2b-buyers', 'education', 'retail', 'internal'] },
        { key: 'primaryGoal', label: 'Primary Goal', options: ['lead-generation', 'catalog-access', 'promotion-redemption', 'quote-request'] }
      ]}
      subtitleFields={['layout', 'status']}
      cardMetaFields={['audience', 'primaryGoal']}
      searchKeys={['title', 'slug', 'layout', 'status', 'audience', 'primaryGoal']}
    />
  );
}
