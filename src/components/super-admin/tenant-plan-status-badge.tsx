export function TenantPlanStatusBadge({ status }: { status: string }) {
  const tone =
    status === 'active'
      ? 'var(--theme-success)'
      : status === 'trial'
      ? 'var(--theme-accent)'
      : status === 'pending-activation'
      ? 'var(--theme-warning)'
      : 'var(--theme-danger)';

  return (
    <span
      className="rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em]"
      style={{ background: 'rgba(255,255,255,0.06)', color: tone }}
    >
      {status}
    </span>
  );
}
