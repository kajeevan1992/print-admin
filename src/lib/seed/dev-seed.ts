import { prisma } from '@/lib/prisma';

export async function seedTenantAndProducts() {
  const tenantSlug = 'demo';
  const defaultSubdomain = 'demo.printcore.com';

  let tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'Printcore Demo Store',
        slug: tenantSlug,
        status: 'ACTIVE',
        defaultSubdomain,
        primaryDomain: defaultSubdomain,
        planName: 'Growth',
        storefrontsLimit: 3,
        adminUsersLimit: 8,
        storageLimitGb: 50,
        themeKey: 'base',
        supportEmail: 'support@printcore.com',
        domains: {
          create: [
            {
              hostname: defaultSubdomain,
              type: 'PLATFORM_SUBDOMAIN',
              isPrimary: true,
              verificationStatus: 'VERIFIED',
              sslStatus: 'ISSUED',
            },
          ],
        },
      },
    });
  }

  const category = await prisma.category.upsert({
    where: {
      tenantId_slug: {
        tenantId: tenant.id,
        slug: 'print-products',
      },
    },
    update: {
      name: 'Print Products',
      description: 'Seeded print product category',
    },
    create: {
      tenantId: tenant.id,
      slug: 'print-products',
      name: 'Print Products',
      description: 'Seeded print product category',
    },
  });

  const seedProducts = [
    {
      slug: 'standard-business-cards',
      title: 'Standard Business Cards',
      subtitle: 'Professional everyday cards',
      productType: 'STANDARD',
      priceFromMinor: 1900,
      variants: [
        { name: '350gsm Silk', sku: 'BC-350-SILK', priceMinor: 1900, currency: 'GBP' },
        { name: '400gsm Matt', sku: 'BC-400-MATT', priceMinor: 2400, currency: 'GBP' },
      ],
    },
    {
      slug: 'a5-flyers',
      title: 'A5 Flyers',
      subtitle: 'Promotional handouts and campaigns',
      productType: 'UPLOAD_LED',
      priceFromMinor: 2900,
      variants: [
        { name: '130gsm Gloss', sku: 'FL-A5-130-G', priceMinor: 2900, currency: 'GBP' },
        { name: '170gsm Silk', sku: 'FL-A5-170-S', priceMinor: 3400, currency: 'GBP' },
      ],
    },
    {
      slug: 'mailer-boxes',
      title: 'Mailer Boxes',
      subtitle: 'Custom packaging for e-commerce',
      productType: 'QUOTE_LED',
      priceFromMinor: 9900,
      variants: [
        { name: 'Small Box', sku: 'MB-SMALL', priceMinor: 9900, currency: 'GBP' },
        { name: 'Medium Box', sku: 'MB-MED', priceMinor: 12900, currency: 'GBP' },
      ],
    },
  ] as const;

  for (const product of seedProducts) {
    const existing = await prisma.product.findFirst({
      where: {
        tenantId: tenant.id,
        slug: product.slug,
      },
      include: { variants: true },
    });

    let savedProduct = existing;
    if (!existing) {
      savedProduct = await prisma.product.create({
        data: {
          tenantId: tenant.id,
          categoryId: category.id,
          slug: product.slug,
          title: product.title,
          subtitle: product.subtitle,
          productType: product.productType,
          priceFromMinor: product.priceFromMinor,
          currency: 'GBP',
          isActive: true,
        },
      });
    }

    if (savedProduct && savedProduct.variants.length === 0) {
      await prisma.productVariant.createMany({
        data: product.variants.map((variant) => ({
          productId: savedProduct!.id,
          name: variant.name,
          sku: variant.sku,
          priceMinor: variant.priceMinor,
          currency: variant.currency,
        })),
      });
    }
  }

  return {
    tenantSlug,
    defaultSubdomain,
    seeded: true,
  };
}
