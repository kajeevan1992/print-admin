type CategoryCardProps = {
  title: string;
  description: string;
};

export function CategoryCard({ title, description }: CategoryCardProps) {
  return (
    <div
      className="rounded-3xl border p-5"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-3 text-sm" style={{ color: 'var(--theme-text-muted)' }}>{description}</p>
      <button
        type="button"
        className="mt-5 rounded-full px-4 py-2 text-sm font-medium"
        style={{ background: 'var(--theme-surface-alt)', color: 'var(--theme-text)' }}
      >
        Explore category
      </button>
    </div>
  );
}
