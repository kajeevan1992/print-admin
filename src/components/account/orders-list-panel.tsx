import { orderList } from '@/data/account-operations';
import { OrderStatusBadge } from './order-status-badge';

export function OrdersListPanel() {
  return (
    <div
      className="rounded-3xl border p-5"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Orders</p>
        <button
          type="button"
          className="rounded-full border px-3 py-1 text-xs"
          style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}
        >
          Filter
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {orderList.map((order) => (
          <div
            key={order.id}
            className="rounded-2xl border p-4"
            style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{order.title}</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                  {order.id} · Placed {order.placedAt}
                </p>
              </div>
              <OrderStatusBadge status={order.status} />
            </div>

            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <p style={{ color: 'var(--theme-text-muted)' }}>Total</p>
                <p className="font-medium">{order.total}</p>
              </div>
              <div>
                <p style={{ color: 'var(--theme-text-muted)' }}>Delivery</p>
                <p className="font-medium">{order.delivery}</p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="rounded-full border px-3 py-1 text-xs"
                style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
              >
                View order
              </button>
              <button
                type="button"
                className="rounded-full border px-3 py-1 text-xs"
                style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}
              >
                Reorder
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
