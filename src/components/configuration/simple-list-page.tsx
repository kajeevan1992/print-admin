'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Button, PrimaryButton } from '@/components/ui/buttons';

type ListItem = {
  title: string;
  subtitle: string;
  meta?: string;
};

export function SimpleListPage({
  title,
  subtitle,
  actionLabel,
  items
}: {
  title: string;
  subtitle: string;
  actionLabel: string;
  items: ListItem[];
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => `${item.title} ${item.subtitle} ${item.meta ?? ''}`.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} actions={<PrimaryButton>{actionLabel}</PrimaryButton>} />
      <Card className="mb-4">
        <Input placeholder={`Search ${title.toLowerCase()}...`} value={query} onChange={(event) => setQuery(event.target.value)} />
      </Card>
      <div className="space-y-3">
        {filtered.map((item) => (
          <Card key={`${item.title}-${item.subtitle}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-textMuted">{item.subtitle}</p>
                {item.meta ? <p className="mt-2 text-xs text-textMuted">{item.meta}</p> : null}
              </div>
              <div className="flex gap-2">
                <Button>Edit</Button>
                <Button>View</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
