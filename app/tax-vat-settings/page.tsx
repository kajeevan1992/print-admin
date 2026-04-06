import { ConfigWorkspacePage } from '@/components/configuration/config-workspace-page';

export default function Page() {
  return (
    <ConfigWorkspacePage
      storageKey="config-tax-vat"
      title="Tax / VAT Settings"
      subtitle="Configure tax regions, VAT display labels, exemptions, and checkout compliance rules."
      sections={[
        {
          title: 'Primary Tax Profile',
          description: 'Set the default tax mode used across storefronts and checkout.',
          fields: [
            { key: 'profileName', label: 'Profile Name', placeholder: 'UK VAT Standard' },
            { key: 'mode', label: 'Tax Mode', type: 'select', options: ['VAT Inclusive', 'VAT Exclusive', 'Mixed'] },
            { key: 'defaultRate', label: 'Default Rate', type: 'number', placeholder: '20' },
            { key: 'displayLabel', label: 'Display Label', placeholder: 'Incl. VAT' },
            { key: 'pricesIncludeTax', label: 'Prices Include Tax', type: 'toggle' },
            { key: 'validateVatNumbers', label: 'Validate VAT Numbers', type: 'toggle' }
          ]
        },
        {
          title: 'Regional Rules',
          description: 'Control cross-border charging, reverse charge handling, and tax references.',
          fields: [
            { key: 'domesticRegion', label: 'Domestic Region', placeholder: 'United Kingdom' },
            { key: 'crossBorderRule', label: 'Cross-border Rule', type: 'select', options: ['Use destination rate', 'Use origin rate', 'Manual review'] },
            { key: 'reverseChargeLabel', label: 'Reverse Charge Label', placeholder: 'VAT reverse charge may apply' },
            { key: 'taxReference', label: 'Tax Reference', placeholder: 'GB123456789' },
            { key: 'complianceNotes', label: 'Compliance Notes', type: 'textarea', placeholder: 'Internal guidance, filing notes, and edge cases...' }
          ]
        }
      ]}
      insights={[
        'Confirm the storefront pricing model before enabling tax-inclusive display.',
        'Reverse charge logic should be aligned with account and organization settings.',
        'Keep tax references and customer-facing labels consistent across invoices and checkout.'
      ]}
    />
  );
}
