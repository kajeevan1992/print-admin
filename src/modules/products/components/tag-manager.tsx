import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/buttons';
import type { ProductTag } from '@/modules/products/types';
import { ProductSectionCard } from './product-section-card';

const colorMap = {
  blue: 'bg-blue-500/20 text-blue-200',
  violet: 'bg-violet-500/20 text-violet-200',
  emerald: 'bg-emerald-500/20 text-emerald-200',
  amber: 'bg-amber-500/20 text-amber-200'
};

export function TagManager({
  tags,
  suggested,
  onChange
}: {
  tags: ProductTag[];
  suggested: ProductTag[];
  onChange?: (tags: ProductTag[]) => void;
}) {
  const [value, setValue] = useState('');
  const nextColor = useMemo<ProductTag['color']>(() => 'blue', []);

  const addTag = (tag: ProductTag) => {
    if (tags.some((item) => item.label.toLowerCase() === tag.label.toLowerCase())) return;
    onChange?.([...tags, tag]);
  };

  return (
    <ProductSectionCard title="Tag Management">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => onChange?.(tags.filter((item) => item.id !== tag.id))}
              className={`rounded-full px-3 py-1 text-xs ${colorMap[tag.color]}`}
            >
              {tag.label} ×
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Add tag..." className="w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm" />
          <Button
            onClick={() => {
              if (!value.trim()) return;
              addTag({ id: `tag-${Date.now()}`, label: value.trim(), color: nextColor });
              setValue('');
            }}
          >
            Add
          </Button>
        </div>

        <div>
          <p className="mb-2 text-xs uppercase text-textMuted">Suggested Tags</p>
          <div className="flex flex-wrap gap-2">
            {suggested.map((tag) => (
              <button key={tag.id} type="button" onClick={() => addTag(tag)} className="rounded-full border border-border px-3 py-1 text-xs">
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </ProductSectionCard>
  );
}
