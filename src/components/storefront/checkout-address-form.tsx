export function CheckoutAddressForm() {
  return (
    <div
      className="rounded-3xl border p-5"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <p className="text-sm font-semibold">Billing and delivery details</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {[
          ['Company name', 'Print Admin Ltd'],
          ['Contact name', 'Alex Morgan'],
          ['Email', 'alex@example.com'],
          ['Phone', '+44 20 0000 0000'],
          ['Address line 1', '12 Example Street'],
          ['Address line 2', 'Floor 2'],
          ['City', 'London'],
          ['Postcode', 'EC1A 1AA']
        ].map(([label, value]) => (
          <label key={label} className="grid gap-2 text-sm">
            <span style={{ color: 'var(--theme-text-muted)' }}>{label}</span>
            <input
              defaultValue={value}
              className="rounded-2xl border px-4 py-3 outline-none"
              style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text)' }}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
