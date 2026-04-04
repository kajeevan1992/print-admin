import { Tabs } from '@/components/ui/tabs';

export function ProductTabs({ active, onChange }: { active: string; onChange: (tab: string) => void }) {
  return <Tabs tabs={['Product Information', 'Print Editor', 'Attributes', 'Related Products', 'Alternate View', 'Comments']} active={active} onChange={onChange} />;
}
