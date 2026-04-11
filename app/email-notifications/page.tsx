'use client';

export const dynamic = 'force-dynamic';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="ops-email-notifications"
      title="Email Notifications"
      subtitle="Manage lifecycle emails sent to customers, vendors, and internal teams across quoting, proofing, production, and dispatch."
      createLabel="Add Notification"
      primaryFilterKey="status"
      searchKeys={['title', 'subtitle', 'meta', 'audience', 'trigger', 'owner']}
      fields={[
        { key: 'title', label: 'Notification Name', placeholder: 'Dispatch exception alert' },
        {
          key: 'status',
          label: 'Status',
          options: [
            { value: 'active', label: 'Active' },
            { value: 'draft', label: 'Draft' },
            { value: 'paused', label: 'Paused' }
          ]
        },
        {
          key: 'audience',
          label: 'Audience',
          options: [
            { value: 'customer', label: 'Customer' },
            { value: 'internal', label: 'Internal' },
            { value: 'vendor', label: 'Vendor' }
          ]
        },
        {
          key: 'trigger',
          label: 'Trigger',
          options: [
            { value: 'quote', label: 'Quote' },
            { value: 'proof', label: 'Proof' },
            { value: 'production', label: 'Production' },
            { value: 'dispatch', label: 'Dispatch' },
            { value: 'support', label: 'Support' }
          ]
        },
        {
          key: 'channel',
          label: 'Channel',
          options: [
            { value: 'email-only', label: 'Email only' },
            { value: 'email-sms', label: 'Email + SMS' },
            { value: 'ops-digest', label: 'Ops digest' }
          ]
        },
        {
          key: 'priority',
          label: 'Priority',
          options: [
            { value: 'low', label: 'Low' },
            { value: 'standard', label: 'Standard' },
            { value: 'critical', label: 'Critical' }
          ]
        },
        { key: 'owner', label: 'Owner', placeholder: 'CX operations' },
        { key: 'subject', label: 'Subject Line', placeholder: 'Your order has moved into dispatch' },
        { key: 'slaHours', label: 'SLA Hours', type: 'number', placeholder: '2' },
        { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Fallback recipients, escalations, and conditional send notes.' }
      ]}
      quickTemplates={[
        {
          label: 'Customer dispatch',
          values: {
            title: 'Dispatch confirmation',
            status: 'active',
            audience: 'customer',
            trigger: 'dispatch',
            channel: 'email-only',
            priority: 'standard',
            owner: 'CX operations',
            subject: 'Your order is on the way',
            slaHours: '1',
            notes: 'Sent after manifest creation with tracking token merge fields.'
          }
        },
        {
          label: 'Critical plant alert',
          values: {
            title: 'Plant SLA risk',
            status: 'active',
            audience: 'internal',
            trigger: 'production',
            channel: 'ops-digest',
            priority: 'critical',
            owner: 'Production control',
            subject: 'SLA risk detected on live jobs',
            slaHours: '0',
            notes: 'Escalates to operations leadership and plant leads immediately.'
          }
        },
        {
          label: 'Vendor chase',
          values: {
            title: 'Vendor ETA chase',
            status: 'draft',
            audience: 'vendor',
            trigger: 'production',
            channel: 'email-only',
            priority: 'standard',
            owner: 'Trade buying',
            subject: 'Confirm ETA for outstanding subcontract work',
            slaHours: '4',
            notes: 'Used when subcontract finishing or overflow print is slipping.'
          }
        }
      ]}
      buildSubtitle={(item) => `${item.audience ?? 'audience'} • ${item.trigger ?? 'trigger'} • ${item.channel ?? 'channel'}`}
      buildCardMeta={(item) => `Status ${item.status ?? 'draft'} • Priority ${item.priority ?? 'standard'} • Owner ${item.owner ?? 'unassigned'}`}
      initialItems={[
        {
          id: 'email-1',
          title: 'Dispatch confirmation',
          subtitle: 'customer • dispatch • email-only',
          meta: 'Status active • Priority standard • Owner CX operations',
          status: 'active',
          audience: 'customer',
          trigger: 'dispatch',
          channel: 'email-only',
          priority: 'standard',
          owner: 'CX operations',
          subject: 'Your order is on the way',
          slaHours: '1',
          notes: 'Includes tracking and dispatch note merge fields.',
          pinned: true
        },
        {
          id: 'email-2',
          title: 'Proof approval reminder',
          subtitle: 'customer • proof • email-only',
          meta: 'Status active • Priority standard • Owner Artwork desk',
          status: 'active',
          audience: 'customer',
          trigger: 'proof',
          channel: 'email-only',
          priority: 'standard',
          owner: 'Artwork desk',
          subject: 'Reminder: proof awaiting approval',
          slaHours: '12',
          notes: 'Nudges customers when proof has been idle for half a day.'
        },
        {
          id: 'email-3',
          title: 'Plant SLA risk',
          subtitle: 'internal • production • ops-digest',
          meta: 'Status active • Priority critical • Owner Production control',
          status: 'active',
          audience: 'internal',
          trigger: 'production',
          channel: 'ops-digest',
          priority: 'critical',
          owner: 'Production control',
          subject: 'SLA risk detected on live jobs',
          slaHours: '0',
          notes: 'Escalates when queue ageing exceeds agreed thresholds.',
          starred: true
        },
        {
          id: 'email-4',
          title: 'Vendor ETA chase',
          subtitle: 'vendor • production • email-only',
          meta: 'Status draft • Priority standard • Owner Trade buying',
          status: 'draft',
          audience: 'vendor',
          trigger: 'production',
          channel: 'email-only',
          priority: 'standard',
          owner: 'Trade buying',
          subject: 'Confirm ETA for subcontract work',
          slaHours: '4',
          notes: 'Used for overflow jobs with external finish suppliers.'
        },
        {
          id: 'email-5',
          title: 'Support escalation digest',
          subtitle: 'internal • support • ops-digest',
          meta: 'Status paused • Priority critical • Owner CX leadership',
          status: 'paused',
          audience: 'internal',
          trigger: 'support',
          channel: 'ops-digest',
          priority: 'critical',
          owner: 'CX leadership',
          subject: 'Escalated support cases summary',
          slaHours: '2',
          notes: 'Currently paused pending new severity mapping.'
        }
      ]}
    />
  );
}
