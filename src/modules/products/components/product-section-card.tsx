import { Card } from '@/components/ui/card';

export function ProductSectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </Card>
  );
}
