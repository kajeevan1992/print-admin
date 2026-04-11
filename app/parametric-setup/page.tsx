export const dynamic = 'force-dynamic';

import { ConfigWorkspacePage } from '@/components/configuration/config-workspace-page';

export default function Page() {
  return (
    <ConfigWorkspacePage
      storageKey="config-parametric-setup"
      title="Parametric Setup"
      subtitle="Control the Print CAD foundations used by standards, solver behavior, previews, and storefront widget defaults."
      sections={[
        {
          title: 'Core Engine Settings',
          description: 'Define how the parametric solver behaves when customers change dimensions and material allowances.',
          fields: [
            { key: 'solverMode', label: 'Solver Mode', type: 'select', options: ['Standard', 'Strict', 'Performance'] },
            { key: 'defaultMaterial', label: 'Default Material', placeholder: 'Corrugated E flute' },
            { key: 'defaultAllowance', label: 'Default Allowance (mm)', type: 'number', placeholder: '3' },
            { key: 'autoPreview', label: 'Auto-generate previews', type: 'toggle' },
            { key: 'validationWarnings', label: 'Show validation warnings', type: 'toggle' }
          ]
        },
        {
          title: 'Storefront Widget Behaviour',
          description: 'Controls exposed to category widgets and product pages when a parametric standard is used.',
          fields: [
            { key: 'defaultView', label: 'Default 3D View', type: 'select', options: ['Isometric', 'Front', 'Exploded'] },
            { key: 'dimensionUnits', label: 'Dimension Units', type: 'select', options: ['Millimeters', 'Centimeters', 'Inches'] },
            { key: 'allowLivePricing', label: 'Allow live pricing refresh', type: 'toggle' },
            { key: 'allowMaterialSwap', label: 'Allow material switching', type: 'toggle' }
          ]
        }
      ]}
      insights={[
        'Keep standard materials aligned with production vendor capabilities.',
        'Enable live pricing only when the calculator library is in sync.',
        'Strict mode is recommended for board and packaging products with tight tolerances.'
      ]}
    />
  );
}
