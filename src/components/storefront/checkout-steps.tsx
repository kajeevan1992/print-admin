type CheckoutStepsProps = {
  current: 'cart' | 'details' | 'shipping' | 'payment' | 'review';
};

const steps: CheckoutStepsProps['current'][] = ['cart', 'details', 'shipping', 'payment', 'review'];

export function CheckoutSteps({ current }: CheckoutStepsProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-5">
      {steps.map((step, index) => (
        <div
          key={step}
          className="rounded-2xl border px-4 py-3 text-sm"
          style={{
            borderColor: step === current ? 'var(--theme-primary)' : 'var(--theme-border)',
            background: step === current ? 'var(--theme-surface-alt)' : 'var(--theme-surface)'
          }}
        >
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--theme-text-muted)' }}>
            Step {index + 1}
          </p>
          <p className="mt-1 font-medium capitalize">{step}</p>
        </div>
      ))}
    </div>
  );
}
