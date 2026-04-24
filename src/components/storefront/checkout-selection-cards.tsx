'use client';

type Option = {
  id: string;
  label: string;
  meta: string;
};

export function CheckoutSelectionCards({
  title,
  value,
  onChange,
  options
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
}) {
  return (
    <div
      className="rounded-3xl border p-5"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-4 grid gap-3">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className="rounded-2xl border px-4 py-3 text-left"
            style={{
              borderColor: value === option.id ? 'var(--theme-primary)' : 'var(--theme-border)',
              background: value === option.id ? 'var(--theme-surface-alt)' : 'var(--theme-surface)'
            }}
          >
            <p className="font-medium">{option.label}</p>
            <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>{option.meta}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
