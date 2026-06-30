import DeliveryPopupInterceptor from '@/themes/atlantis-native/DeliveryPopupInterceptor';

export default async function NativeStoreLayout({ children, params }: { children: React.ReactNode; params: Promise<{ tenantSlug: string; storeSlug: string }> }) {
  const { tenantSlug, storeSlug } = await params;
  const cleanTenantSlug = String(tenantSlug || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '');
  const cleanStoreSlug = String(storeSlug || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '');
  const storeBase = `/native-stores/${cleanTenantSlug}/${cleanStoreSlug}`;
  return <><DeliveryPopupInterceptor storeBase={storeBase} />{children}</>;
}
