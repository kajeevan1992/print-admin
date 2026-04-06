'use client';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';

const fieldsData = [
  {
    id: 'checkout-company',
    title: 'Company Name',
    subtitle: 'Billing step',
    meta: 'Optional • Text',
    placement: 'Billing',
    fieldType: 'Text',
    required: false,
    visibility: 'B2B only',
    helpText: 'Shown for trade accounts during billing.'
  },
  {
    id: 'checkout-po',
    title: 'Purchase Order Number',
    subtitle: 'Review step',
    meta: 'Optional • Text',
    placement: 'Review',
    fieldType: 'Text',
    required: false,
    visibility: 'Organizations',
    helpText: 'Used for account reconciliation and invoicing.'
  },
  {
    id: 'checkout-delivery-note',
    title: 'Delivery Instructions',
    subtitle: 'Shipping step',
    meta: 'Optional • Textarea',
    placement: 'Shipping',
    fieldType: 'Textarea',
    required: false,
    visibility: 'All customers',
    helpText: 'Internal courier and dispatch notes.'
  }
];

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="config-checkout-fields"
      title="Checkout Fields"
      subtitle="Manage extra fields collected during checkout, including placement, visibility, and validation."
      createLabel="Add Checkout Field"
      initialItems={fieldsData}
      subtitleFields={['placement', 'fieldType']}
      cardMetaFields={['visibility']}
      searchKeys={['title', 'placement', 'fieldType', 'visibility']}
      fields={[
        { key: 'placement', label: 'Placement', options: ['Billing', 'Shipping', 'Review', 'Payment'] },
        { key: 'fieldType', label: 'Field Type', options: ['Text', 'Textarea', 'Number', 'Select', 'Checkbox'] },
        { key: 'visibility', label: 'Visibility' },
        { key: 'required', label: 'Required', toggle: true },
        { key: 'helpText', label: 'Help Text', type: 'textarea', placeholder: 'Add helper text or validation guidance...' }
      ]}
    />
  );
}
