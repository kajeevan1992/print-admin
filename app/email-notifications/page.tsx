'use client';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';

const notificationFlows = [
  {
    id: 'notif-order-confirmation',
    title: 'Order Confirmation',
    subtitle: 'Customer trigger',
    meta: 'Email • Active',
    audience: 'Customer',
    channel: 'Email',
    event: 'Order placed',
    template: 'order-confirmation-v2',
    enabled: true,
    notes: 'Includes proof link and order summary.'
  },
  {
    id: 'notif-proof-request',
    title: 'Proof Approval Needed',
    subtitle: 'Customer + CSR trigger',
    meta: 'Email • SMS optional',
    audience: 'Customer',
    channel: 'Email',
    event: 'Proof ready',
    template: 'proof-approval',
    enabled: true,
    notes: 'Escalates after 24 hours with no response.'
  },
  {
    id: 'notif-sla-risk',
    title: 'SLA Risk Alert',
    subtitle: 'Internal operations alert',
    meta: 'Email • Internal only',
    audience: 'Operations',
    channel: 'Email',
    event: 'Due date risk',
    template: 'sla-risk-alert',
    enabled: false,
    notes: 'Planned for production board integration.'
  }
];

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="config-email-notifications"
      title="Email Notifications"
      subtitle="Manage message triggers, delivery channels, audience targeting, and notification templates."
      createLabel="Add Notification"
      initialItems={notificationFlows}
      subtitleFields={['audience', 'event']}
      cardMetaFields={['channel', 'template']}
      searchKeys={['title', 'audience', 'event', 'template']}
      fields={[
        { key: 'audience', label: 'Audience' },
        { key: 'channel', label: 'Channel', options: ['Email', 'SMS', 'Webhook'] },
        { key: 'event', label: 'Event Trigger' },
        { key: 'template', label: 'Template ID' },
        { key: 'enabled', label: 'Enabled', toggle: true },
        { key: 'notes', label: 'Notification Notes', type: 'textarea', placeholder: 'Add trigger rules, escalation notes, and dependencies...' }
      ]}
    />
  );
}
