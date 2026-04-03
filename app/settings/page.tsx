import { ModulePlaceholderPage } from '@/components/placeholders/module-placeholder-page';

export default function Page() {
  return <ModulePlaceholderPage title="Settings" subtitle="Configure platform-level defaults and operational controls." capabilities={[
    'Currency/locale defaults',
    'Tax and compliance profiles',
    'Notification routing rules',
    'Integration key management'
  ]} />;
}
