import { approvalItems } from '@/data/account-operations';

export function ApprovalsPanel() {
  return (
    <div
      className="rounded-3xl border p-5"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Approvals</p>
        <button
          type="button"
          className="rounded-full border px-3 py-1 text-xs"
          style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}
        >
          View all
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {approvalItems.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border p-4"
            style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                  {item.id} · {item.type}
                </p>
              </div>
              <span
                className="rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em]"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color:
                    item.status === 'approved'
                      ? 'var(--theme-success)'
                      : item.status === 'changes-requested'
                      ? 'var(--theme-warning)'
                      : 'var(--theme-accent)'
                }}
              >
                {item.status}
              </span>
            </div>

            <p className="mt-3 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
              Due by {item.dueBy}
            </p>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="rounded-full px-3 py-1 text-xs font-medium"
                style={{ background: 'var(--theme-primary)', color: 'var(--theme-primary-text)' }}
              >
                Review
              </button>
              <button
                type="button"
                className="rounded-full border px-3 py-1 text-xs"
                style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
              >
                Open details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
