'use client';

import { useState } from 'react';
import { BaseModal } from '@/components/modals/base-modal';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { CategoryTag } from '@/modules/categories/types';

export function CategoryTagsModal({
  open,
  tags,
  onClose,
  onSave
}: {
  open: boolean;
  tags: CategoryTag[];
  onClose: () => void;
  onSave: (labels: string[]) => void;
}) {
  const [items, setItems] = useState(tags.map((tag) => tag.label));
  const [value, setValue] = useState('');

  const addTag = () => {
    const label = value.trim().replace(/,+$/, '');
    if (!label || items.includes(label)) return;
    setItems((prev) => [...prev, label]);
    setValue('');
  };

  return (
    <BaseModal open={open} onClose={onClose} title="Manage Category Tags">
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="Type a tag and press Enter"
            className="w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <Button onClick={addTag}>Add</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span key={item} className="inline-flex items-center gap-2 rounded-full border border-border bg-panelMuted px-3 py-1 text-sm">
              {item}
              <button onClick={() => setItems((prev) => prev.filter((tag) => tag !== item))} className="text-red-300">×</button>
            </span>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <PrimaryButton onClick={() => onSave(items)}>Save</PrimaryButton>
        </div>
      </div>
    </BaseModal>
  );
}
