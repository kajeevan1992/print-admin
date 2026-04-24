export function OrderStatusBadge({ status }: { status: string }) {
  const tone =
    status === 'delivered'
      ? 'var(--theme-success)'
      : status === 'shipped'
      ? 'var(--theme-accent)'
      : status === 'awaiting-approval'
      ? 'var(--theme-warning)'
      : 'var(--theme-text)';

  return (
    <span
      className="rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em]"
      style={{ background: 'rgba(255,255,255,0.06)', color: tone }}
    >
      {status}
    </span>
  );
}
