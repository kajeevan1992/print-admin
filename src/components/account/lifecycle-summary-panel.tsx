export function LifecycleSummaryPanel() {
  return (
    <div
      className="rounded-3xl border p-5"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <p className="text-sm font-semibold">Lifecycle summary</p>
      <div className="mt-4 grid gap-3 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
        <p>• 1 order awaiting artwork/preflight checks</p>
        <p>• 1 order currently in production</p>
        <p>• 1 order dispatched and nearing delivery</p>
        <p>• approval, artwork, and dispatch states are now represented in one customer-facing flow</p>
      </div>
    </div>
  );
}
