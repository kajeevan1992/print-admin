import Link from 'next/link';
import { User } from 'lucide-react';
import { currentStorefrontCustomer } from '@/core/storefront/customer-account.service';
import { BRAND } from './theme-helpers';

export default async function CustomerAccountHeader({ tenantSlug, storeSlug, storeBase, studio = false }: { tenantSlug: string; storeSlug: string; storeBase: string; studio?: boolean }) {
  const customer = await currentStorefrontCustomer(tenantSlug, storeSlug).catch(() => null);
  const href = customer ? `${storeBase}/account` : `${storeBase}/login`;
  const label = customer ? `Account: ${customer.name}` : 'Customer sign in';
  return <Link href={href} aria-label={label} title={label} className="grid h-9 w-9 place-items-center rounded-xl border no-underline" style={{ borderColor: studio ? 'rgba(255,255,255,0.18)' : BRAND.line, backgroundColor: studio ? 'rgba(255,255,255,0.08)' : 'white', color: studio ? 'white' : BRAND.ink }}><User className="h-4 w-4" /></Link>;
}
