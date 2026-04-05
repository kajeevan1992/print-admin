import { ConfigWorkspacePage } from '@/components/configuration/config-workspace-page';

export default function Page() {
  return (
    <ConfigWorkspacePage
      storageKey="config-pricing"
      title="Pricing"
      subtitle="Define storefront pricing defaults, markups, and calculator behavior."
      sections={[
        {
          title: 'Base Pricing Defaults',
          fields: [
            { key: 'currency', label: 'Currency', type: 'select', options: ['USD', 'GBP', 'EUR'] },
            { key: 'minimumOrderValue', label: 'Minimum Order Value', type: 'number', placeholder: '25' },
            { key: 'roundingRule', label: 'Rounding Rule', type: 'select', options: ['Nearest whole', 'Nearest 0.50', 'Nearest 0.99'] },
            { key: 'taxInclusive', label: 'Prices include tax', type: 'toggle' }
          ]
        },
        {
          title: 'Markup Policy',
          fields: [
            { key: 'defaultMarkup', label: 'Default Markup %', type: 'number', placeholder: '15' },
            { key: 'rushFee', label: 'Rush Fee %', type: 'number', placeholder: '25' },
            { key: 'bulkDiscountEnabled', label: 'Enable Bulk Discounts', type: 'toggle' },
            { key: 'notes', label: 'Pricing Notes', type: 'textarea', placeholder: 'Internal notes for the pricing team...' }
          ]
        }
      ]}
    />
  );
}
