'use client';

export function CheckoutReviewPanel({
  shippingLabel,
  paymentLabel
}: {
  shippingLabel: string;
  paymentLabel: string;
}) {
  return (
    <div
      className="rounded-3xl border p-5"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <p className="text-sm font-semibold">Review selections</p>
      <div className="mt-4 space-y-3 text-sm">
        <div>
          <p style={{ color: 'var(--theme-text-muted)' }}>Shipping</p>
          <p className="mt-1 font-medium">{shippingLabel}</p>
        </div>
        <div>
          <p style={{ color: 'var(--theme-text-muted)' }}>Payment</p>
          <p className="mt-1 font-medium">{paymentLabel}</p>
        </div>
        <div>
          <p style={{ color: 'var(--theme-text-muted)' }}>Next integration stage</p>
          <p className="mt-1">
            Connect these selections to tenant rules, pricing, payment providers, and order creation APIs later.
          </p>
        </div>
      </div>
    </div>
  );
}
