import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

type ThemeProduct = {
  id: string
  slug: string
  name: string
  description: string
  categorySlug: string
  categoryName: string
  status: "published" | "draft"
  currency: string
  priceFromMinor: number
  vatClass: "zero" | "standard"
  pricingSource: "internal" | "supplier" | "matrix"
  images: string[]
  badges: string[]
  optionGroups: any[]
  turnarounds: any[]
  artworkRules: any
}

const categories = [
  { id: "cat-print-products", slug: "print-products", name: "Print Products", productCount: 3 },
  { id: "cat-large-format", slug: "large-format", name: "Large Format", productCount: 1 },
]

const products: ThemeProduct[] = [
  {
    id: "prod-a5-leaflets",
    slug: "a5-leaflets",
    name: "A5 Leaflets",
    description: "Zero-rated leaflet product with internal pricing and artwork rules for hosted themes.",
    categorySlug: "print-products",
    categoryName: "Print Products",
    status: "published",
    currency: "GBP",
    priceFromMinor: 2900,
    vatClass: "zero",
    pricingSource: "internal",
    images: ["/placeholder-product.svg"],
    badges: ["Zero VAT", "Internal pricing"],
    optionGroups: [
      { key: "quantity", label: "Quantity", displayType: "dropdown", required: true, values: [{ id: "500", label: "500" }, { id: "1000", label: "1,000" }, { id: "2500", label: "2,500" }] },
      { key: "material", label: "Paper", displayType: "dropdown", required: true, values: [{ id: "130gsm_silk", label: "130gsm Silk" }, { id: "170gsm_silk", label: "170gsm Silk" }] },
      { key: "sides", label: "Printed sides", displayType: "cards", required: true, values: [{ id: "single", label: "Single sided" }, { id: "double", label: "Double sided" }] },
    ],
    turnarounds: [
      { id: "standard", label: "Standard", workingDays: 3 },
      { id: "express", label: "Express", workingDays: 2 },
    ],
    artworkRules: { profile: "flat", expectedPages: 2, trimWidthMm: 148, trimHeightMm: 210, bleedMm: 3, allowedFileTypes: ["application/pdf"], pdfOnly: true, maxUploadMb: 50 },
  },
  {
    id: "prod-booklets",
    slug: "booklets",
    name: "Booklets",
    description: "Zero-rated booklet product. Design services and other add-ons remain standard VAT as separate lines.",
    categorySlug: "print-products",
    categoryName: "Print Products",
    status: "published",
    currency: "GBP",
    priceFromMinor: 9900,
    vatClass: "zero",
    pricingSource: "matrix",
    images: ["/placeholder-product.svg"],
    badges: ["Zero VAT", "Matrix pricing"],
    optionGroups: [
      { key: "quantity", label: "Quantity", displayType: "dropdown", required: true, values: [{ id: "50", label: "50" }, { id: "100", label: "100" }, { id: "250", label: "250" }] },
      { key: "pages", label: "Pages", displayType: "dropdown", required: true, values: [{ id: "8", label: "8pp" }, { id: "12", label: "12pp" }, { id: "16", label: "16pp" }] },
    ],
    turnarounds: [{ id: "standard", label: "Standard", workingDays: 5 }],
    artworkRules: { profile: "booklet", expectedPages: 8, trimWidthMm: 148, trimHeightMm: 210, bleedMm: 3, allowedFileTypes: ["application/pdf"], pdfOnly: true, maxUploadMb: 100 },
  },
  {
    id: "prod-business-cards",
    slug: "business-cards",
    name: "Business Cards",
    description: "Standard VAT product with strict material keys and supplier/matrix compatible options.",
    categorySlug: "print-products",
    categoryName: "Print Products",
    status: "published",
    currency: "GBP",
    priceFromMinor: 1900,
    vatClass: "standard",
    pricingSource: "internal",
    images: ["/placeholder-product.svg"],
    badges: ["20% VAT", "Internal pricing"],
    optionGroups: [
      { key: "quantity", label: "Quantity", displayType: "dropdown", required: true, values: [{ id: "250", label: "250" }, { id: "500", label: "500" }, { id: "1000", label: "1,000" }] },
      { key: "material", label: "Stock", displayType: "dropdown", required: true, values: [{ id: "450gsm_silk", label: "450gsm Silk" }, { id: "450gsm_uncoated", label: "450gsm Uncoated" }] },
      { key: "finish", label: "Finish", displayType: "cards", required: false, values: [{ id: "none", label: "No finish" }, { id: "lamination_soft_touch", label: "Soft touch lamination" }] },
    ],
    turnarounds: [{ id: "standard", label: "Standard", workingDays: 3 }, { id: "rush", label: "Rush", workingDays: 1 }],
    artworkRules: { profile: "flat", expectedPages: 2, trimWidthMm: 85, trimHeightMm: 55, bleedMm: 3, allowedFileTypes: ["application/pdf"], pdfOnly: true, maxUploadMb: 25 },
  },
  {
    id: "prod-pvc-banner",
    slug: "pvc-banner",
    name: "PVC Banner",
    description: "Large-format roll material product using machine width limits and variable length rules.",
    categorySlug: "large-format",
    categoryName: "Large Format",
    status: "published",
    currency: "GBP",
    priceFromMinor: 2400,
    vatClass: "standard",
    pricingSource: "internal",
    images: ["/placeholder-product.svg"],
    badges: ["20% VAT", "Roll material"],
    optionGroups: [
      { key: "width_mm", label: "Width", displayType: "number", required: true, values: [] },
      { key: "height_mm", label: "Height", displayType: "number", required: true, values: [] },
      { key: "material", label: "Material", displayType: "dropdown", required: true, values: [{ id: "pvc_banner_440gsm_1200mm", label: "440gsm PVC Banner 1200mm Roll" }] },
    ],
    turnarounds: [{ id: "standard", label: "Standard", workingDays: 3 }],
    artworkRules: { profile: "large-format", expectedPages: 1, trimWidthMm: 1200, trimHeightMm: 1000, bleedMm: 5, allowedFileTypes: ["application/pdf"], pdfOnly: true, maxUploadMb: 100 },
  },
]

function productCard(product: ThemeProduct) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    categoryName: product.categoryName,
    categorySlug: product.categorySlug,
    status: product.status,
    priceFromMinor: product.priceFromMinor,
    currency: product.currency,
    vatClass: product.vatClass,
    pricingSource: product.pricingSource,
    images: product.images,
    badges: product.badges,
    href: `/products/${product.slug}`,
  }
}

function productDetail(product: ThemeProduct) {
  return {
    ...productCard(product),
    optionGroups: product.optionGroups,
    turnarounds: product.turnarounds,
    artworkRules: product.artworkRules,
    addOns: [
      { id: "design-service", name: "Design Service", vatClass: "standard", priceFromMinor: 3500, note: "VAT-rated add-on even when the base product is zero-rated." },
    ],
    internalOnly: true,
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const slug = url.searchParams.get("slug")
  const category = url.searchParams.get("category")

  if (slug) {
    const product = products.find((item) => item.slug === slug || item.id === slug)
    if (!product) {
      return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 })
    }
    return NextResponse.json({ ok: true, source: "internal-theme-data-adapter", data: { product: productDetail(product) } })
  }

  const filteredProducts = category ? products.filter((product) => product.categorySlug === category) : products

  return NextResponse.json({
    ok: true,
    source: "internal-theme-data-adapter",
    data: {
      contractVersion: "v302-theme-data-adapter",
      rule: "Hosted themes consume this normalized adapter and must not call /api/proxy or /api/v1.",
      categories,
      products: filteredProducts.map(productCard),
      themeRoutes: {
        home: "/",
        category: "/category/:slug",
        product: "/products/:slug",
        cart: "/cart",
        checkout: "/checkout",
      },
      requiredNextBridges: ["cart-checkout-theme-bridge", "artwork-preflight-theme-bridge", "hosted-theme-loader"],
    },
  })
}
