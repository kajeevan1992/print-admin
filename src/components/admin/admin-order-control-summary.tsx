export function AdminOrderControlSummary() {
  return (
    <div className="space-y-4">
      <div
        className="rounded-3xl border p-5"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
      >
        <p className="text-sm font-semibold">Control summary</p>
        <div className="mt-4 grid gap-3 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
          <p>• 1 job in artwork review</p>
          <p>• 1 job awaiting approval</p>
          <p>• 1 job currently in production</p>
          <p>• 1 job currently in quality check</p>
        </div>
      </div>

      <div
        className="rounded-3xl border p-5"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
      >
        <p className="text-sm font-semibold">Admin next stage</p>
        <div className="mt-4 grid gap-3 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
          <p>• connect these cards to real order records</p>
          <p>• wire artwork review and approval actions</p>
          <p>• connect production-stage transitions and dispatch events</p>
          <p>• add tenant-aware SLA and assignee rules</p>
        </div>
      </div>
    </div>
  );
}
