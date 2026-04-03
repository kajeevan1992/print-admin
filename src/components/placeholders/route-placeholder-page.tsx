import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';

const prettify = (value: string) =>
  value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

export function RoutePlaceholderPage({ slug }: { slug: string[] }) {
  const joined = slug.join(' / ');
  const title = prettify(slug[slug.length - 1] ?? 'module');

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={`This module is mapped from your admin structure and is ready for the next build phase.`}
      />
      <Card>
        <p className="mb-3 text-sm text-textMuted">Placeholder route</p>
        <p className="text-sm text-textMuted">Current path: /{joined}</p>
      </Card>
    </div>
  );
}
