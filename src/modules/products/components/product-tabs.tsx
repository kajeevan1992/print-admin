import { Tabs } from '@/components/ui/tabs';

export function ProductTabs({ active, onChange }: { active: string; onChange: (tab: string) => void }) {
  const tabs = ['Product Information', 'Print Editor', 'Attributes', 'Related Products', 'Alternative View', 'Comments', 'Tags', 'Inventory'];
  return <Tabs tabs={tabs} active={active} onChange={onChange} />;
}
