type CartItemCardProps = {
  title: string;
  variant: string;
  quantity: number;
  turnaround: string;
  subtotal: string;
};

export function CartItemCard({ title, variant, quantity, turnaround, subtotal }: CartItemCardProps) {
  return (
    <div
      className="rounded-3xl border p-5"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-2 text-sm" style={{ color: 'var(--theme-text-muted)' }}>{variant}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full px-3 py-1" style={{ background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}>
              Qty {quantity}
            </span>
            <span className="rounded-full px-3 py-1" style={{ background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}>
              {turnaround}
            </span>
          </div>
        </div>
        <p className="text-sm font-semibold">{subtotal}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full border px-4 py-2 text-sm"
          style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
        >
          Edit
        </button>
        <button
          type="button"
          className="rounded-full border px-4 py-2 text-sm"
          style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}
