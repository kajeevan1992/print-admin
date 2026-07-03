import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { platformPrisma } from '@/core/db/platform-prisma';

function clean(value: FormDataEntryValue | null) {
  return String(value || '').trim();
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '');
}

async function resolveTenantId(tenantSlug: string) {
  const tenant = await platformPrisma.tenant.findFirst({
    where: {
      OR: [
        { id: tenantSlug },
        { slug: tenantSlug },
        { defaultSubdomain: tenantSlug },
      ],
    },
    select: { id: true, slug: true, defaultSubdomain: true },
  });
  return tenant?.id || tenantSlug;
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const tenantSlug = slug(clean(form.get('tenantSlug')));
  const storeSlug = slug(clean(form.get('storeSlug')));
  const productSlug = slug(clean(form.get('productSlug')));
  const categorySlug = slug(clean(form.get('categorySlug')));
  const customerName = clean(form.get('customerName'));
  const email = clean(form.get('email'));
  const phone = clean(form.get('phone'));
  const quantity = clean(form.get('quantity'));
  const deadline = clean(form.get('deadline'));
  const artworkStatus = clean(form.get('artworkStatus'));
  const notes = clean(form.get('notes'));

  if (!tenantSlug || !storeSlug || !productSlug || !customerName || (!email && !phone)) {
    return NextResponse.json({ ok: false, error: 'Missing required quote request details.' }, { status: 400 });
  }

  const tenantId = await resolveTenantId(tenantSlug);
  const id = randomUUID();
  const recordSlug = `quote-${Date.now()}-${id.slice(0, 8)}`;

  await platformPrisma.coreCatalogRecord.create({
    data: {
      id,
      tenantId,
      resource: 'storefront-quote-requests',
      slug: recordSlug,
      name: `Quote request from ${customerName}`,
      description: notes,
      metadataJson: {
        status: 'new',
        source: 'native-storefront',
        tenantId,
        tenantSlug,
        storeSlug,
        categorySlug,
        productSlug,
        customerName,
        email,
        phone,
        quantity,
        deadline,
        artworkStatus,
        notes,
      },
    },
  });

  return NextResponse.redirect(new URL(`/native-stores/${tenantSlug}/${storeSlug}/${categorySlug}/${productSlug}`, request.url), { status: 303 });
}
