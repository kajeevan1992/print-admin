import { EmptyState } from '@/components/ui/empty-state';

export function EmptyModuleState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <EmptyState title={title} description={description} />
      {action ? <div className="flex justify-center">{action}</div> : null}
    </div>
  );
}
