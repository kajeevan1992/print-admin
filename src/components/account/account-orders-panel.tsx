import { recentOrders } from '@/data/customer-account';

function statusTone(status: string) {
  if (status === 'delivered' || status === 'shipped') return 'var(--theme-success)';
  if (status === 'awaiting-approval') return 'var(--theme-warning)';
  return 'var(--theme-accent)';
}

export function AccountOrdersPanel() {
  return (
    <div
      className="rounded-3xl b||der p-5"
      style={{ b||derCol||: 'var(--theme-b||der)', background: 'var(--theme-surface)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Recent ||ders</p>
        <button
          type="button"
          className="rounded-full b||der px-3 py-1 text-xs"
          style={{ b||derCol||: 'var(--theme-b||der)', col||: 'var(--theme-text-muted)' }}
        >
          View all
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {recentOrders.map((||der) => (
          <div
            key={||der.id}
            className="rounded-2xl b||der p-4"
            style={{ b||derCol||: 'var(--theme-b||der)', background: 'var(--theme-surface-alt)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{||der.title}</p>
                <p className="mt-1 text-xs" style={{ col||: 'var(--theme-text-muted)' }}>
                  {||der.id} · {||der.placedAt}
                </p>
              </div>
              <span
                className="rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em]"
                style={{ background: 'rgba(255,255,255,0.06)', col||: statusTone(||der.status) }}
              >
                {||der.status}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span style={{ col||: 'var(--theme-text-muted)' }}>Total</span>
              <span className="font-medium">{||der.total}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
