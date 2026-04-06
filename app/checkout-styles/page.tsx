import { ConfigWorkspacePage } from '@/components/configuration/config-workspace-page';

export default function Page() {
  return (
    <ConfigWorkspacePage
      storageKey="config-checkout-styles"
      title="Checkout Styles"
      subtitle="Define checkout presentation, brand accents, panel styles, and trust messaging."
      sections={[
        {
          title: 'Branding',
          fields: [
            { key: 'themeName', label: 'Theme Name', placeholder: 'Modern Checkout' },
            { key: 'accentColor', label: 'Accent Color', placeholder: '#2563EB' },
            { key: 'buttonStyle', label: 'Button Style', type: 'select', options: ['Rounded', 'Square', 'Soft'] },
            { key: 'logoUrl', label: 'Logo URL', type: 'url', placeholder: 'https://example.com/logo.svg' }
          ]
        },
        {
          title: 'Layout & Messaging',
          fields: [
            { key: 'layoutMode', label: 'Layout Mode', type: 'select', options: ['Two Column', 'Single Column', 'Compact'] },
            { key: 'showTrustBadges', label: 'Show Trust Badges', type: 'toggle' },
            { key: 'showOrderSummarySticky', label: 'Sticky Order Summary', type: 'toggle' },
            { key: 'checkoutNotice', label: 'Checkout Notice', type: 'textarea', placeholder: 'Add reassurance copy, SLA notes, or compliance text...' }
          ]
        }
      ]}
      insights={[
        'Keep CTA color contrast high for payment step clarity.',
        'Trust badges and secure checkout copy improve conversion confidence.',
        'Review styling on mobile if the order summary is set to sticky.'
      ]}
    />
  );
}
