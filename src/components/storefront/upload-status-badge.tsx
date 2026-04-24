export function UploadStatusBadge({ status }: { status: string }) {
  const tone =
    status === 'approved'
      ? 'var(--theme-success)'
      : status === 'changes-requested'
      ? 'var(--theme-warning)'
      : status === 'checking'
      ? 'var(--theme-accent)'
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
