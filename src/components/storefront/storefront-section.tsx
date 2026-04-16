import type { ReactNode } from 'react';

export function StorefrontSection({
  eyebrow,
  title,
  body,
  children
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6 max-w-2xl">
        {eyebrow ? (
          <p className="text-xs uppercase tracking-[0.26em]" style={{ color: 'var(--theme-text-muted)' }}>
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-2 text-2xl font-semibold">{title}</h2>
        {body ? (
          <p className="mt-3 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            {body}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
