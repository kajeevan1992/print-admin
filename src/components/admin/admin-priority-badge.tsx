export function AdminPriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className="rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em]"
      style={{
        background: priority === 'rush' ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.06)',
        color: priority === 'rush' ? 'var(--theme-danger)' : 'var(--theme-text-muted)'
      }}
    >
      {priority}
    </span>
  );
}
