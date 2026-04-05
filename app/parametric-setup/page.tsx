import { ConfigWorkspacePage } from '@/components/configuration/config-workspace-page';

export default function Page() {
  return (
    <ConfigWorkspacePage
      storageKey="config-parametric-setup"
      title="Parametric Setup"
      subtitle="Control the foundational settings for Print CAD and parametric storefront behavior."
      sections={[
        {
          title: 'Core Engine Settings',
          fields: [
            { key: 'solverMode', label: 'Solver Mode', type: 'select', options: ['Standard', 'Strict', 'Performance'] },
            { key: 'defaultMaterial', label: 'Default Material', placeholder: 'Corrugated E flute' },
            { key: 'autoPreview', label: 'Auto-generate previews', type: 'toggle' },
            { key: 'validationWarnings', label: 'Show validation warnings', type: 'toggle' }
          ]
        }
      ]}
    />
  );
}
