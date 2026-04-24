import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';

export function ModulePlaceholderPage({
  title,
  subtitle,
  capabilities
}: {
  title: string;
  subtitle: string;
  capabilities: string[];
}) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <Card>
        <p className="mb-3 text-sm text-textMuted">Planned module · Coming soon</p>
        <ul className="list-disc space-y-2 pl-5 text-sm text-textMuted">
          {capabilities.map((capability) => (
            <li key={capability}>{capability}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
