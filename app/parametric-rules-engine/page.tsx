import { LocalRecordsPage } from '@/components/configuration/local-records-page';

const items = [
  {
    id: 'rule-1',
    title: 'Minimum Panel Width',
    subtitle: 'Blocks unsafe narrow side panels',
    meta: 'Validation · Active',
    ruleType: 'Validation',
    trigger: 'Panel Width < 18mm',
    scope: 'Packaging',
    severity: 'Blocking',
    enabled: true,
    notes: 'Prevents malformed cartons that cannot be glued consistently.'
  },
  {
    id: 'rule-2',
    title: 'Auto Material Upgrade',
    subtitle: 'Switches board grade on large dimensions',
    meta: 'Automation · Active',
    ruleType: 'Automation',
    trigger: 'Longest side > 500mm',
    scope: 'Display',
    severity: 'Warning',
    enabled: true,
    notes: 'Promotes heavier board stock when the span exceeds approved stability limits.'
  }
];

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="module-parametric-rules"
      title="Parametric Rules Engine"
      subtitle="Create and tune validation, automation, and pricing logic applied to parametric standards and storefront widgets."
      createLabel="Add Rule"
      initialItems={items}
      fields={[
        { key: 'subtitle', label: 'Summary' },
        { key: 'ruleType', label: 'Rule Type', options: ['Validation', 'Automation', 'Pricing'] },
        { key: 'trigger', label: 'Trigger Condition' },
        { key: 'scope', label: 'Scope', options: ['Packaging', 'Display', 'Signage', 'All Standards'] },
        { key: 'severity', label: 'Severity', options: ['Blocking', 'Warning', 'Info'] },
        { key: 'enabled', label: 'Enabled', toggle: true },
        { key: 'notes', label: 'Rule Notes', type: 'textarea', placeholder: 'Describe what this rule does and who owns the logic...' }
      ]}
      buildCardMeta={(item) => `${item.ruleType ?? ''} · ${item.scope ?? ''} · ${item.severity ?? ''}`}
      searchKeys={['title', 'subtitle', 'ruleType', 'scope', 'severity', 'trigger']}
    />
  );
}
