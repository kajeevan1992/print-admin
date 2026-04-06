import { ConfigWorkspacePage } from '@/components/configuration/config-workspace-page';

export default function Page() {
  return (
    <ConfigWorkspacePage
      storageKey="config-email-account"
      title="Email Account"
      subtitle="Configure SMTP sender accounts, authentication, and reply-to handling for the platform."
      sections={[
        {
          title: 'SMTP Connection',
          fields: [
            { key: 'senderName', label: 'Sender Name', placeholder: 'Print Support' },
            { key: 'senderEmail', label: 'Sender Email', type: 'email', placeholder: 'support@example.com' },
            { key: 'host', label: 'SMTP Host', placeholder: 'smtp.example.com' },
            { key: 'port', label: 'Port', type: 'number', placeholder: '587' },
            { key: 'encryption', label: 'Encryption', type: 'select', options: ['TLS', 'SSL', 'None'] },
            { key: 'authRequired', label: 'Authentication Required', type: 'toggle' }
          ]
        },
        {
          title: 'Delivery Handling',
          fields: [
            { key: 'replyTo', label: 'Reply-To', type: 'email', placeholder: 'helpdesk@example.com' },
            { key: 'bounceAddress', label: 'Bounce Address', type: 'email', placeholder: 'bounce@example.com' },
            { key: 'dailyLimit', label: 'Daily Limit', type: 'number', placeholder: '10000' },
            { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Document provider notes, API credentials storage, or sending rules...' }
          ]
        }
      ]}
    />
  );
}
