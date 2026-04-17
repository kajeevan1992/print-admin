export const dynamic = 'force-dynamic';

import { ConfigWorkspacePage } from '@/components/configuration/config-workspace-page';

export default function Page() {
  return (
    <ConfigWorkspacePage
      storageKey="config-admin-theme"
      title="Admin Theme"
      subtitle="Customize admin appearance, density, navigation style, and operator display preferences."
      sections={[
        {
          title: 'Brand & Layout',
          description: 'Define how the admin experience feels for operators and merchant admins.',
          fields: [
            { key: 'profileName', label: 'Profile Name', placeholder: 'Operations Dark Theme' },
            { key: 'themeMode', label: 'Theme Mode', type: 'select', options: ['dark', 'light', 'system'] },
            { key: 'density', label: 'Density', type: 'select', options: ['comfortable', 'compact', 'dense'] },
            { key: 'stickySidebar', label: 'Sticky Sidebar', type: 'toggle' }
          ]
        },
        {
          title: 'Dashboard Preferences',
          fields: [
            { key: 'defaultLanding', label: 'Default Landing', type: 'select', options: ['dashboard', 'orders', 'production', 'products'] },
            { key: 'showPlanPanel', label: 'Show Plan Panel', type: 'toggle' },
            { key: 'showStoreSwitcher', label: 'Show Store Switcher', type: 'toggle' },
            { key: 'dashboardNotes', label: 'Dashboard Notes', type: 'textarea', placeholder: 'Add operator hints, notice copy, || onboarding guidance...' }
          ]
        },
        {
          title: 'Accessibility',
          fields: [
            { key: 'fontScale', label: 'Font Scale', type: 'select', options: ['100%', '110%', '125%'] },
            { key: 'reducedMotion', label: 'Reduced Motion', type: 'toggle' },
            { key: 'highContrast', label: 'High Contrast', type: 'toggle' },
            { key: 'focusOutlines', label: 'Always Show Focus', type: 'toggle' }
          ]
        }
      ]}
      insights={[
        'Keep one theme profile per operations team || merchant group.',
        'Match dashboard defaults to the role that uses the admin most often.',
        'Use higher contrast and larger font scale for warehouse || print-room stations.'
      ]}
    />
  );
}
