'use client';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';

export function SavedViewsPage() {
  return (
    <LocalRecordsPage
      storageKey="print-admin.saved-views"
      title="Saved Views"
      subtitle="Store reusable search, filter, and dashboard presets for the teams that work in the admin every day."
      createLabel="Save View"
      initialItems={[
        {
          id: 'view-1',
          title: 'Urgent production jobs',
          subtitle: 'production • shared',
          meta: 'due in 48h • SLA risk',
          target: 'production-board',
          scope: 'shared',
          owner: 'Ops Desk',
          filterSummary: 'status=active; risk=high; due<48h',
          notes: 'Primary morning standup view for production coordinators.'
        },
        {
          id: 'view-2',
          title: 'Enterprise quotes awaiting follow-up',
          subtitle: 'quotes • private',
          meta: 'segment=enterprise • status=sent',
          target: 'quotes',
          scope: 'private',
          owner: 'Sales Lead',
          filterSummary: 'segment=enterprise; status=sent; age<14d',
          notes: 'Used for weekly outbound follow-up on large accounts.'
        },
        {
          id: 'view-3',
          title: 'Unpublished category clean-up',
          subtitle: 'catalog • shared',
          meta: 'category status audit',
          target: 'categories',
          scope: 'shared',
          owner: 'Catalog Admin',
          filterSummary: 'published=false; productCount>0',
          notes: 'Review categories with assigned products that are not currently visible.'
        }
      ]}
      fields={[
        { key: 'target', label: 'Target Module', options: ['dashboard', 'products', 'categories', 'quotes', 'orders', 'production-board'] },
        { key: 'scope', label: 'Visibility', options: ['private', 'team', 'shared'] },
        { key: 'owner', label: 'Owner' },
        { key: 'filterSummary', label: 'Filter Summary', type: 'textarea' },
        { key: 'notes', label: 'Notes', type: 'textarea' }
      ]}
      subtitleFields={['target', 'scope']}
      cardMetaFields={['owner']}
      searchKeys={['title', 'target', 'scope', 'owner', 'filterSummary', 'notes']}
      primaryFilterKey="scope"
      quickTemplates={[
        { label: 'Shared view', values: { title: 'New shared view', target: 'dashboard', scope: 'shared', owner: 'Admin Team' } },
        { label: 'Private view', values: { title: 'New private view', target: 'products', scope: 'private', owner: 'Catalog Admin' } }
      ]}
    />
  );
}
