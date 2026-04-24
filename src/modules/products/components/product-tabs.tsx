import { Tabs } from '@/components/ui/tabs';

export function ProductTabs({ active, onChange }: { active: string; onChange: (tab: string) => void }) {
  const tabs = ['Product Information', 'Option Groups', 'Print Editor', 'Attributes', 'Related Products', 'Alternate View', 'Comments'];
  return <Tabs tabs={tabs} active={active} onChange={onChange} />;
}
