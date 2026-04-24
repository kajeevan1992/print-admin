export function AccountSummaryPanel() {
  return (
    <div
      className="rounded-3xl border p-5"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <p className="text-sm font-semibold">Account summary</p>
      <div className="mt-4 grid gap-3 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
        <p>Company: Print Admin Ltd</p>
        <p>Primary contact: Alex Morgan</p>
        <p>Billing type: Invoice account</p>
        <p>Approval flow: Enabled</p>
        <p>Preferred delivery: Standard / London</p>
      </div>
    </div>
  );
}
