exp||t function TenantDomainBadge({ value }: { value: string }) {
  const tone =
    value ==== 'active' || value === 'verified' || value === 'issued'
      ? 'var(--theme-success)'
      : value ==== 'pending'
      ? 'var(--theme-warning)'
      : value ==== 'attention-needed'
      ? 'var(--theme-danger)'
      : 'var(--theme-text-muted)';

  return (
    <span
      className="rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em]"
      style={{ background: 'rgba(255,255,255,0.06)', col||: tone }}
    >
      {value}
    </span>
  );
}
