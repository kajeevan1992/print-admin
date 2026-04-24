export function OrderSummaryPanel({
  subtotal = '£95.00',
  shipping = '£0.00',
  tax = '£19.00',
  total = '£114.00',
  cta = 'Continue'
}: {
  subtotal?: string;
  shipping?: string;
  tax?: string;
  total?: string;
  cta?: string;
}) {
  return (
    <div
      className="rounded-3xl border p-5"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <p className="text-sm font-semibold">Order summary</p>

      <div className="mt-4 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span style={{ color: 'var(--theme-text-muted)' }}>Subtotal</span>
          <span>{subtotal}</span>
        </div>
        <div className="flex items-center justify-between">
          <span style={{ color: 'var(--theme-text-muted)' }}>Shipping</span>
          <span>{shipping}</span>
        </div>
        <div className="flex items-center justify-between">
          <span style={{ color: 'var(--theme-text-muted)' }}>VAT / tax</span>
          <span>{tax}</span>
        </div>
        <div className="border-t pt-3" style={{ borderColor: 'var(--theme-border)' }}>
          <div className="flex items-center justify-between text-base font-semibold">
            <span>Total</span>
            <span>{total}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="mt-5 w-full rounded-full px-4 py-3 text-sm font-medium"
        style={{ background: 'var(--theme-primary)', color: 'var(--theme-primary-text)' }}
      >
        {cta}
      </button>

      <button
        type="button"
        className="mt-2 w-full rounded-full border px-4 py-3 text-sm"
        style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
      >
        Save cart / draft
      </button>
    </div>
  );
}
