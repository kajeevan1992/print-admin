import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const adapterEndpoints = {
  themeData: "/api/internal/storefront/theme-data",
  productList: "/api/internal/storefront/theme-data",
  productDetail: "/api/internal/storefront/theme-data?slug=:slug",
  categoryFilter: "/api/internal/storefront/theme-data?category=:slug",
  pricing: "/api/internal/catalog/pricing-calculate",
  vat: "/api/internal/catalog/vat-engine",
  cart: "/api/internal/catalog/storefront-cart",
  checkoutDraft: "/api/internal/catalog/checkout-draft",
  artwork: "/api/internal/catalog/storefront-artwork",
  preflight: "/api/internal/catalog/preflight-production",
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: "internal-catalog-theme-data-adapter",
    data: {
      version: "v302-theme-data-adapter",
      purpose: "Normalize product/category/detail payloads for hosted storefront themes.",
      endpoints: adapterEndpoints,
      guarantees: [
        "Product cards include slug, priceFromMinor, VAT class, pricing source and image placeholders.",
        "Product detail includes option groups, turnarounds, artwork rules and VAT-rated add-ons.",
        "Hosted themes must consume internal services only.",
        "No /api/proxy or public /api/v1 route is required for hosted SaaS themes.",
      ],
      payloads: {
        productCard: ["id", "slug", "name", "description", "categoryName", "priceFromMinor", "currency", "vatClass", "pricingSource", "images", "badges", "href"],
        productDetail: ["productCard fields", "optionGroups", "turnarounds", "artworkRules", "addOns"],
        category: ["id", "slug", "name", "productCount"],
      },
    },
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const routes = Array.isArray(body.routes) ? body.routes.map(String) : []
  const forbidden = routes.filter((route) => route.includes("/api/proxy") || route.includes("/api/v1"))

  return NextResponse.json({
    ok: forbidden.length === 0,
    source: "internal-catalog-theme-data-adapter",
    data: {
      checkedRoutes: routes.length,
      forbiddenRoutesFound: forbidden,
      adapterEndpoints,
      message: forbidden.length === 0 ? "Theme adapter routes are internal-only safe." : "Remove forbidden hosted theme routes before frontend test.",
    },
  }, { status: forbidden.length === 0 ? 200 : 400 })
}
