export function TenantDomainBadge({ value }: { value: string }) {
  const tone =
    value === 'active' || value === 'verified' || value === 'issued'
      ? 'var(--theme-success)'
      : value === 'pending'
      ? 'var(--theme-warning)'
      : 'var(--theme-text-muted)';

  return (
    <span className="px-2 py-1 text-xs rounded-full" style={{ color: tone }}>
      {value}
    </span>
  );
}
