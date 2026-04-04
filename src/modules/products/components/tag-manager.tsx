import { useState } from 'react';
import { Button } from '@/components/ui/buttons';
import type { ProductTag } from '@/modules/products/types';
import { ProductSectionCard } from './product-section-card';

const colorMap = {
  blue: 'bg-blue-500/20 text-blue-200',
  violet: 'bg-violet-500/20 text-violet-200',
  emerald: 'bg-emerald-500/20 text-emerald-200',
  amber: 'bg-amber-500/20 text-amber-200'
};

export function TagManager({ tags, suggested }: { tags: ProductTag[]; suggested: ProductTag[] }) {
  const [value, setValue] = useState('');

  return (
    <ProductSectionCard title="Tag Management">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => <span key={tag.id} className={`rounded-full px-3 py-1 text-xs ${colorMap[tag.color]}`}>{tag.label} ×</span>)}
        </div>

        <div className="flex gap-2">
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Add tag..." className="w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm" />
          <Button>Add</Button>
        </div>

        <div>
          <p className="mb-2 text-xs uppercase text-textMuted">Suggested Tags</p>
          <div className="flex flex-wrap gap-2">
            {suggested.map((tag) => <button key={tag.id} className="rounded-full border border-border px-3 py-1 text-xs">{tag.label}</button>)}
          </div>
        </div>
      </div>
    </ProductSectionCard>
  );
}
