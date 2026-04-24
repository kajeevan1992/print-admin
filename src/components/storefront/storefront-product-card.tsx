type StorefrontProductCardProps = {
  title: string;
  subtitle: string;
  price: string;
  badge?: string;
  turnaround?: string;
  features?: string[];
};

export function StorefrontProductCard({ title, subtitle, price, badge, turnaround, features = [] }: StorefrontProductCardProps) {
  return (
    <div
      className="rounded-3xl border p-5"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-2 text-sm" style={{ color: 'var(--theme-text-muted)' }}>{subtitle}</p>
        </div>
        {badge ? (
          <span
            className="rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em]"
            style={{ background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}
          >
            {badge}
          </span>
        ) : null}
      </div>

      {turnaround ? (
        <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
          Turnaround: {turnaround}
        </p>
      ) : null}

      {features.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {features.map((feature) => (
            <span
              key={feature}
              className="rounded-full px-3 py-1 text-[11px]"
              style={{ background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}
            >
              {feature}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm font-semibold">{price}</p>
        <button
          type="button"
          className="rounded-full px-4 py-2 text-sm font-medium"
          style={{ background: 'var(--theme-primary)', color: 'var(--theme-primary-text)' }}
        >
          View product
        </button>
      </div>
    </div>
  );
}
