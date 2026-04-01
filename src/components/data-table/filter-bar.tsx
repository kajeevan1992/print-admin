import { Button } from '@/components/ui/buttons';

export function FilterBar({ children, onCreate }: { children?: React.ReactNode; onCreate?: () => void }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-panel p-3">
      {children}
      {onCreate ? <Button className="ml-auto" onClick={onCreate}>Create Product</Button> : null}
    </div>
  );
}
