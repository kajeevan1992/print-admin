import { recentOrders } from '@/data/customer-account';

function statusTone(status: string) {
  if (status === 'delivered' || status === 'shipped') return 'var(--theme-success)';
  if (status === 'awaiting-approval') return 'var(--theme-warning)';
  return 'var(--theme-accent)';
}

export function AccountOrdersPanel() {
  return (
    <div
      className="rounded-3xl border p-5"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Recent orders</p>
        <button
          type="button"
          className="rounded-full border px-3 py-1 text-xs"
          style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}
        >
          View all
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {recentOrders.map((order) => (
          <div
            key={order.id}
            className="rounded-2xl border p-4"
            style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{order.title}</p>
                <p
                  className="mt-1 text-xs"
                  style={{ color: 'var(--theme-text-muted)' }}
                >
                  {order.id} · {order.placedAt}
                </p>
              </div>
              <span
                className="rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em]"
                style={{ background: 'rgba(255,255,255,0.06)', color: statusTone(order.status) }}
              >
                {order.status}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between text-sm">
              <span style={{ color: 'var(--theme-text-muted)' }}>Total</span>
              <span className="font-medium">{order.total}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
