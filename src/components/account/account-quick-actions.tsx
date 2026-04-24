import Link from 'next/link';

const actions = [
  { label: 'Start new order', href: '/storefront/products' },
  { label: 'Upload artwork', href: '/storefront/upload-artwork' },
  { label: 'Open cart', href: '/storefront/cart' },
  { label: 'Browse templates', href: '/storefront/templates' }
];

export function AccountQuickActions() {
  return (
    <div
      className="rounded-3xl border p-5"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <p className="text-sm font-semibold">Quick actions</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="rounded-2xl border px-4 py-3 text-sm font-medium transition hover:opacity-90"
            style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text)' }}
          >
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
