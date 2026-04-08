'use client';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';
import { configTemplates } from '@/lib/product-system-store';

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="print-admin.config-templates"
      title="Config Templates"
      subtitle="Reusable field groups for dropdowns, text inputs, size selection, artwork prompts, and production-aware storefront configuration."
      createLabel="Add template"
      initialItems={configTemplates.map((template) => ({
        id: template.id,
        title: template.name,
        description: template.description,
        category: template.category,
        fieldCount: String(template.fields.length),
        meta: `${template.category} · ${template.fields.length} fields`
      }))}
      fields={[
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'category', label: 'Category' },
        { key: 'fieldCount', label: 'Field count', type: 'number' }
      ]}
      buildSubtitle={(item) => String(item.description ?? '')}
      buildCardMeta={(item) => `${item.category ?? 'General'} · ${item.fieldCount ?? '0'} fields`}
      searchKeys={['title', 'description', 'category']}
    />
  );
}
