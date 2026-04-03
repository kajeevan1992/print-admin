import { ModulePlaceholderPage } from '@/components/placeholders/module-placeholder-page';

export default function Page() {
  return <ModulePlaceholderPage title="Content" subtitle="Manage storefront content blocks and merchandising assets." capabilities={[
    'Reusable promo block library',
    'Channel-specific content scheduling',
    'SEO metadata templates',
    'Asset versioning and rollback'
  ]} />;
}
