export function CheckoutShippingPayment() {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div
        className="rounded-3xl border p-5"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
      >
        <p className="text-sm font-semibold">Shipping method</p>
        <div className="mt-4 grid gap-3">
          {[
            ['Standard delivery', '2–3 days / Included'],
            ['Priority delivery', '1–2 days / +£12'],
            ['Collection', 'By arrangement / £0']
          ].map(([title, meta], idx) => (
            <button
              key={title}
              type="button"
              className="rounded-2xl border px-4 py-3 text-left"
              style={{
                borderColor: idx == 0 ? 'var(--theme-primary)' : 'var(--theme-border)',
                background: idx == 0 ? 'var(--theme-surface-alt)' : 'var(--theme-surface)'
              }}
            >
              <p className="font-medium">{title}</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>{meta}</p>
            </button>
          ))}
        </div>
      </div>

      <div
        className="rounded-3xl border p-5"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
      >
        <p className="text-sm font-semibold">Payment method</p>
        <div className="mt-4 grid gap-3">
          {[
            ['Card payment', 'Frontend shell for future payment provider wiring'],
            ['Purchase order', 'B2B-friendly route for internal approvals'],
            ['Invoice account', 'For approved customer accounts and enterprise flows']
          ].map(([title, meta], idx) => (
            <button
              key={title}
              type="button"
              className="rounded-2xl border px-4 py-3 text-left"
              style={{
                borderColor: idx == 0 ? 'var(--theme-primary)' : 'var(--theme-border)',
                background: idx == 0 ? 'var(--theme-surface-alt)' : 'var(--theme-surface)'
              }}
            >
              <p className="font-medium">{title}</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>{meta}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
