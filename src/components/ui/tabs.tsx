import { cn } from '@/lib/utils';

export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (tab: string) => void }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={cn('rounded-lg border px-3 py-2 text-sm', active === tab ? 'border-accent bg-panelMuted' : 'border-border')}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
