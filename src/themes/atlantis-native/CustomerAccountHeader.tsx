import Link from 'next/link';
import { LogIn, User } from 'lucide-react';
import { currentStorefrontCustomer } from '@/core/storefront/customer-account.service';
import { BRAND } from './theme-helpers';

export default async function CustomerAccountHeader({ tenantSlug, storeSlug, storeBase, studio = false }: { tenantSlug: string; storeSlug: string; storeBase: string; studio?: boolean }) {
  const customer = await currentStorefrontCustomer(tenantSlug, storeSlug).catch(() => null);
  const href = customer ? `${storeBase}/account` : `${storeBase}/login`;
  const label = customer ? `Account: ${customer.name}` : 'Customer sign in';
  return <Link href={href} aria-label={label} title={label} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-black no-underline" style={{ borderColor: studio ? 'rgba(255,255,255,0.18)' : BRAND.line, backgroundColor: studio ? 'rgba(255,255,255,0.08)' : 'white', color: studio ? 'white' : BRAND.ink }}>{customer ? <User className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}<span className="hidden max-w-[110px] truncate sm:inline">{customer ? customer.name : 'Sign in'}</span></Link>;
}
