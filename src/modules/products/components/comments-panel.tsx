'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/buttons';
import { ProductSectionCard } from './product-section-card';
import type { ProductComment } from '@/modules/products/types';

export function CommentsPanel({
  comments,
  onAdd
}: {
  comments: ProductComment[];
  onAdd?: (message: string) => void;
}) {
  const [note, setNote] = useState('');

  return (
    <ProductSectionCard title="Internal Notes">
      <div className="space-y-3">
        {comments.length === 0 ? <p className="text-sm text-textMuted">No internal notes yet.</p> : comments.map((comment) => (
          <div key={comment.id} className="rounded-lg border border-border bg-panelMuted p-3 text-sm">
            <div className="mb-1 flex items-center justify-between">
              <p className="font-medium">{comment.author}</p>
              <span className="text-xs text-textMuted">{comment.timestamp}</span>
            </div>
            <p className="text-textMuted">{comment.message}</p>
          </div>
        ))}

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="Write internal note..."
          className="w-full rounded-lg border border-border bg-panelMuted p-3 text-sm outline-none"
        />
        <div className="flex justify-end">
          <Button
            onClick={() => {
              if (!note.trim()) return;
              onAdd?.(note.trim());
              setNote('');
            }}
          >
            Save Note
          </Button>
        </div>
      </div>
    </ProductSectionCard>
  );
}
