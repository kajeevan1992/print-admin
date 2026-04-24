'use client';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';

export function NotificationsPage() {
  return (
    <LocalRecordsPage
      storageKey="print-admin.notifications"
      title="Notifications"
      subtitle="Track operational alerts, merchant warnings, deployment notices, and approval reminders from one admin inbox."
      createLabel="Add Notification"
      initialItems={[
        {
          id: 'notif-1',
          title: 'Production board backlog rising',
          subtitle: 'warning • production',
          meta: 'Plant A • SLA risk',
          type: 'warning',
          area: 'production',
          assignee: 'Ops Desk',
          status: 'open',
          message: 'The overnight queue exceeded the safe threshold for Plant A. Review routing and vendor overflow.'
        },
        {
          id: 'notif-2',
          title: 'Store theme publish pending',
          subtitle: 'approval • theme',
          meta: 'Harbor Print Co. • awaiting review',
          type: 'approval',
          area: 'theme',
          assignee: 'Creative Lead',
          status: 'pending',
          message: 'A storefront theme update is ready for release but still needs final design approval.'
        },
        {
          id: 'notif-3',
          title: 'API key expires this week',
          subtitle: 'security • platform',
          meta: 'Merchant account integration',
          type: 'security',
          area: 'platform',
          assignee: 'Platform Admin',
          status: 'open',
          message: 'Rotate the staging integration API key before the scheduled sync window closes.'
        }
      ]}
      fields={[
        { key: 'type', label: 'Type', options: ['info', 'warning', 'approval', 'security'] },
        { key: 'area', label: 'Area', options: ['dashboard', 'production', 'orders', 'theme', 'platform', 'content'] },
        { key: 'assignee', label: 'Owner' },
        { key: 'status', label: 'Status', options: ['open', 'pending', 'resolved'] },
        { key: 'message', label: 'Message', type: 'textarea' }
      ]}
      subtitleFields={['type', 'area']}
      cardMetaFields={['assignee', 'status']}
      searchKeys={['title', 'type', 'area', 'assignee', 'status', 'message']}
      primaryFilterKey="status"
      quickTemplates={[
        { label: 'Warning', values: { title: 'New warning', type: 'warning', area: 'production', assignee: 'Ops Desk', status: 'open' } },
        { label: 'Approval', values: { title: 'New approval', type: 'approval', area: 'theme', assignee: 'Creative Lead', status: 'pending' } }
      ]}
    />
  );
}
