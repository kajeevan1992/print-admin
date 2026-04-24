import Link from 'next/link';

export function DatabaseManagerShortcut() {
  return (
    <Link
      href="/database-manager"
      className="rounded-2xl border px-3 py-2 text-xs font-medium"
      style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
    >
      Database Manager
    </Link>
  );
}
