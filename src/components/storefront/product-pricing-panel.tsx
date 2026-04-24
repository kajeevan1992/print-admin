export function ProductPricingPanel() {
  return (
    <div
      className="rounded-3xl border p-5"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <p className="text-sm font-semibold">Pricing summary</p>
      <div className="mt-4 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span style={{ color: 'var(--theme-text-muted)' }}>Base product</span>
          <span>£29.00</span>
        </div>
        <div className="flex items-center justify-between">
          <span style={{ color: 'var(--theme-text-muted)' }}>Selected options</span>
          <span>£8.00</span>
        </div>
        <div className="flex items-center justify-between">
          <span style={{ color: 'var(--theme-text-muted)' }}>Estimated turnaround</span>
          <span>2–3 days</span>
        </div>
        <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--theme-border)' }}>
          <div className="flex items-center justify-between text-base font-semibold">
            <span>Total from</span>
            <span>£37.00</span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-2">
        <button
          type="button"
          className="rounded-full px-4 py-3 text-sm font-medium"
          style={{ background: 'var(--theme-primary)', color: 'var(--theme-primary-text)' }}
        >
          Add to cart
        </button>
        <button
          type="button"
          className="rounded-full border px-4 py-3 text-sm"
          style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
        >
          Save configuration
        </button>
      </div>
    </div>
  );
}
