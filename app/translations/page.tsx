'use client';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';

const locales = [
  {
    id: 'locale-en-gb',
    title: 'English (UK)',
    subtitle: 'en-GB',
    meta: 'Default locale',
    localeCode: 'en-GB',
    region: 'United Kingdom',
    status: 'Published',
    translator: 'Internal',
    isDefault: true,
    notes: 'Primary storefront locale.'
  },
  {
    id: 'locale-fr-fr',
    title: 'French (France)',
    subtitle: 'fr-FR',
    meta: 'QA pending',
    localeCode: 'fr-FR',
    region: 'France',
    status: 'Draft',
    translator: 'Agency',
    isDefault: false,
    notes: 'Checkout and account screens still under review.'
  },
  {
    id: 'locale-de-de',
    title: 'German (Germany)',
    subtitle: 'de-DE',
    meta: 'Ready for launch',
    localeCode: 'de-DE',
    region: 'Germany',
    status: 'Published',
    translator: 'Agency',
    isDefault: false,
    notes: 'Use with EU pricing and VAT profile.'
  }
];

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="config-translations"
      title="Translations"
      subtitle="Manage locale packs, rollout readiness, default locale selection, and translation ownership."
      createLabel="Add Locale"
      initialItems={locales}
      subtitleFields={['localeCode', 'region']}
      cardMetaFields={['status', 'translator']}
      searchKeys={['title', 'localeCode', 'region', 'status']}
      fields={[
        { key: 'localeCode', label: 'Locale Code' },
        { key: 'region', label: 'Region' },
        { key: 'status', label: 'Status', options: ['Draft', 'Published', 'Archived'] },
        { key: 'translator', label: 'Translator' },
        { key: 'isDefault', label: 'Default Locale', toggle: true },
        { key: 'notes', label: 'Release Notes', type: 'textarea', placeholder: 'Add translation coverage notes, rollout caveats, or QA status...' }
      ]}
    />
  );
}
