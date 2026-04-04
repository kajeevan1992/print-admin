import { useState } from 'react';
import { Button } from '@/components/ui/buttons';
import { ProductSectionCard } from './product-section-card';
import type { ProductComment } from '@/modules/products/types';

export function CommentsPanel({ comments, onAdd }: { comments: ProductComment[]; onAdd: (message: string) => Promise<void> }) {
  const [value, setValue] = useState('');

  return (
    <ProductSectionCard title="Internal Notes">
      <div className="space-y-3">
        <textarea className="w-full rounded-lg border border-border bg-panelMuted p-3 text-sm" rows={4} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Add internal note" />
        <div className="flex justify-end"><Button onClick={async () => { if (!value.trim()) return; await onAdd(value); setValue(''); }}>Add Comment</Button></div>
        <div className="space-y-2">
          {comments.length === 0 ? <p className="text-sm text-textMuted">No notes yet.</p> : comments.map((comment) => (
            <div key={comment.id} className="rounded-lg border border-border bg-panelMuted p-3 text-sm">
              <div className="mb-1 flex justify-between"><span className="font-medium">{comment.author}</span><span className="text-xs text-textMuted">{comment.timestamp}</span></div>
              <p>{comment.message}</p>
            </div>
          ))}
        </div>
      </div>
    </ProductSectionCard>
  );
}
