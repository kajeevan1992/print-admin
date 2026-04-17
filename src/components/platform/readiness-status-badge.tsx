export function ReadinessStatusBadge({ status }: { status: string }) {
  const tone =
    status === 'frontend-complete'
      ? 'var(--theme-success)'
      : status === 'ready-to-design' || status === 'next'
      ? 'var(--theme-accent)'
      : status === 'needs-backend' || status === 'planned'
      ? 'var(--theme-warning)'
      : 'var(--theme-text-muted)';

  return (
    <span
      className="rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em]"
      style={{ background: 'rgba(255,255,255,0.06)', color: tone }}
    >
      {status}
    </span>
  );
}
