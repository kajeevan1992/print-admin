'use client';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';

export function CommandCenterPage() {
  return (
    <LocalRecordsPage
      storageKey="productivity-command-center"
      title="Command Center"
      subtitle="Coordinate recurring admin tasks, handoffs, and launch checklists across catalog, content, storefront, and production."
      createLabel="Add Task"
      initialItems={[
        {
          id: 'task-1',
          title: 'Prepare spring trade storefront',
          subtitle: 'launch • in-progress',
          meta: 'owner=Marketing Ops • due this week',
          category: 'launch',
          priority: 'high',
          status: 'in-progress',
          owner: 'Marketing Ops',
          dueWindow: 'This week',
          checklist: 'Finalize landing page, confirm promotions, publish theme, validate checkout fields.'
        },
        {
          id: 'task-2',
          title: 'Review vendor overflow rules',
          subtitle: 'operations • queued',
          meta: 'owner=Production Manager • vendor routing',
          category: 'operations',
          priority: 'medium',
          status: 'queued',
          owner: 'Production Manager',
          dueWindow: 'Next 3 days',
          checklist: 'Verify SLA fallback vendors, update printer management notes, audit turn times.'
        },
        {
          id: 'task-3',
          title: 'Audit API keys for merchant accounts',
          subtitle: 'platform • due soon',
          meta: 'owner=Platform Admin • security review',
          category: 'platform',
          priority: 'high',
          status: 'due-soon',
          owner: 'Platform Admin',
          dueWindow: 'Next 7 days',
          checklist: 'Rotate staging keys, confirm scopes, archive unused keys, verify webhook callbacks.'
        }
      ]}
      fields={[
        { key: 'category', label: 'Category', options: ['launch', 'operations', 'catalog', 'content', 'platform'] },
        { key: 'priority', label: 'Priority', options: ['low', 'medium', 'high', 'critical'] },
        { key: 'status', label: 'Status', options: ['queued', 'in-progress', 'due-soon', 'blocked', 'done'] },
        { key: 'owner', label: 'Owner' },
        { key: 'dueWindow', label: 'Due Window' },
        { key: 'checklist', label: 'Checklist', type: 'textarea' }
      ]}
      subtitleFields={['category', 'status']}
      cardMetaFields={['owner', 'priority', 'dueWindow']}
      searchKeys={['title', 'category', 'priority', 'status', 'owner', 'dueWindow', 'checklist']}
      primaryFilterKey="status"
      quickTemplates={[
        { label: 'Launch task', values: { title: 'New launch task', category: 'launch', priority: 'high', status: 'queued', owner: 'Launch Lead', dueWindow: 'This week' } },
        { label: 'Ops review', values: { title: 'New ops review', category: 'operations', priority: 'medium', status: 'queued', owner: 'Operations' } }
      ]}
    />
  );
}
