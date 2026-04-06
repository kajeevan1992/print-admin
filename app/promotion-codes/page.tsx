'use client';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';

const promotions = [
  {
    id: 'promo-spring10',
    title: 'SPRING10',
    subtitle: '10% off seasonal campaign',
    meta: 'Ends Apr 30 • Active',
    discountType: 'Percentage',
    discountValue: '10',
    audience: 'All customers',
    usageLimit: '500',
    active: true,
    notes: 'Applies to selected marketing print products only.'
  },
  {
    id: 'promo-freeship',
    title: 'SHIPFREE',
    subtitle: 'Free standard delivery',
    meta: 'Channel limited',
    discountType: 'Shipping',
    discountValue: '100',
    audience: 'B2C storefront',
    usageLimit: '250',
    active: true,
    notes: 'Exclude express delivery and oversized items.'
  },
  {
    id: 'promo-b2b50',
    title: 'B2B50',
    subtitle: 'Fixed discount for account orders',
    meta: 'Minimum basket required',
    discountType: 'Fixed Amount',
    discountValue: '50',
    audience: 'Trade accounts',
    usageLimit: '100',
    active: false,
    notes: 'Enable only during quarterly campaign windows.'
  }
];

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="config-promotion-codes"
      title="Promotion Codes"
      subtitle="Create campaign codes, usage limits, discount logic, and audience restrictions."
      createLabel="Add Promotion Code"
      initialItems={promotions}
      subtitleFields={['discountType', 'discountValue']}
      cardMetaFields={['audience', 'usageLimit']}
      searchKeys={['title', 'discountType', 'audience']}
      fields={[
        { key: 'discountType', label: 'Discount Type', options: ['Percentage', 'Fixed Amount', 'Shipping'] },
        { key: 'discountValue', label: 'Discount Value', type: 'number' },
        { key: 'audience', label: 'Audience' },
        { key: 'usageLimit', label: 'Usage Limit', type: 'number' },
        { key: 'active', label: 'Active', toggle: true },
        { key: 'notes', label: 'Campaign Notes', type: 'textarea', placeholder: 'Add constraints, exclusions, and campaign notes...' }
      ]}
    />
  );
}
