import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

type FieldSpec = {
  key: string
  required: boolean
  type: string
  notes?: string
}

type ContractSection = {
  version: string
  owner: "internal-storefront"
  rule: string
  endpoints: Record<string, string>
  payloads: Record<string, FieldSpec[]>
}

const storefrontContract: ContractSection = {
  version: "v301-storefront-internal-api-contract",
  owner: "internal-storefront",
  rule: "Hosted themes must use internal API services only. Do not use /api/proxy or public /api/v1 routes for hosted SaaS storefront themes.",
  endpoints: {
    categories: "/api/internal/catalog/categories",
    products: "/api/internal/catalog/products",
    productDetail: "/api/internal/catalog/products?slug=:slug",
    optionSets: "/api/internal/catalog/option-sets",
    pricing: "/api/internal/catalog/pricing-calculate",
    vat: "/api/internal/catalog/vat-engine",
    cart: "/api/internal/catalog/storefront-cart",
    checkoutDraft: "/api/internal/catalog/checkout-draft",
    artworkUpload: "/api/internal/catalog/storefront-artwork",
    artworkInspection: "/api/internal/catalog/artwork-inspection",
    preflightGate: "/api/internal/catalog/preflight-production",
    paymentRequest: "/api/internal/catalog/payment-intents",
    orderWorkflow: "/api/internal/catalog/order-workflow",
  },
  payloads: {
    productCard: [
      { key: "id", required: true, type: "string" },
      { key: "slug", required: true, type: "string" },
      { key: "name", required: true, type: "string" },
      { key: "description", required: false, type: "string" },
      { key: "categoryName", required: false, type: "string" },
      { key: "priceFromMinor", required: false, type: "number", notes: "Minor units, GBP pennies." },
      { key: "currency", required: true, type: "string", notes: "Default GBP." },
      { key: "status", required: true, type: "published | draft" },
      { key: "images", required: false, type: "array" },
    ],
    productDetail: [
      { key: "id", required: true, type: "string" },
      { key: "slug", required: true, type: "string" },
      { key: "name", required: true, type: "string" },
      { key: "description", required: false, type: "string" },
      { key: "optionGroups", required: false, type: "array", notes: "Theme renders these as selectable product options." },
      { key: "vatClass", required: true, type: "zero | standard", notes: "Line-item VAT. Never global storefront VAT." },
      { key: "pricingSource", required: true, type: "internal | supplier | matrix" },
      { key: "turnarounds", required: false, type: "array" },
      { key: "artworkRules", required: false, type: "object" },
    ],
    pricingRequest: [
      { key: "productId", required: true, type: "string" },
      { key: "quantity", required: true, type: "number" },
      { key: "selections", required: true, type: "object" },
    ],
    pricingResponse: [
      { key: "subtotalMinor", required: true, type: "number" },
      { key: "vatMinor", required: true, type: "number" },
      { key: "totalMinor", required: true, type: "number" },
      { key: "vatBreakdown", required: true, type: "array", notes: "Must support mixed zero-rated products and VAT-rated add-ons." },
      { key: "turnaround", required: false, type: "object" },
    ],
    cartLine: [
      { key: "lineId", required: true, type: "string" },
      { key: "productId", required: true, type: "string" },
      { key: "productName", required: true, type: "string" },
      { key: "selectedOptions", required: true, type: "object" },
      { key: "pricing", required: true, type: "object" },
      { key: "vatClass", required: true, type: "zero | standard" },
      { key: "artwork", required: false, type: "object" },
    ],
    checkoutDraftRequest: [
      { key: "customer", required: true, type: "object", notes: "name, email and phone required; company optional." },
      { key: "cart", required: true, type: "array" },
      { key: "pricingSummary", required: true, type: "object" },
      { key: "artworkSummary", required: false, type: "object" },
    ],
    artworkRules: [
      { key: "profile", required: true, type: "flat | booklet | multipage | large-format" },
      { key: "expectedPages", required: false, type: "number" },
      { key: "trimWidthMm", required: true, type: "number" },
      { key: "trimHeightMm", required: true, type: "number" },
      { key: "bleedMm", required: true, type: "number" },
      { key: "allowedFileTypes", required: true, type: "array" },
      { key: "pdfOnly", required: true, type: "boolean" },
      { key: "maxUploadMb", required: true, type: "number" },
    ],
  },
}

function validationSummary() {
  return {
    forbiddenRoutes: ["/api/proxy", "/api/v1"],
    requiredThemeFlows: [
      "category-listing",
      "product-detail",
      "option-selection",
      "pricing-preview",
      "cart-review",
      "customer-checkout-draft",
      "artwork-upload-status",
      "preflight-production-status",
    ],
    themeReadyWhen: [
      "All product/category reads use internal endpoints.",
      "Pricing uses internal pricing endpoint and returns VAT per line.",
      "Cart lines carry selected options, pricing, VAT and artwork metadata.",
      "Checkout draft creates a structured internal order payload before payment.",
    ],
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: "internal-storefront-contract",
    data: {
      contract: storefrontContract,
      validation: validationSummary(),
      nextBuilds: ["v302-theme-data-adapter", "v303-cart-checkout-theme-bridge", "v304-artwork-preflight-theme-bridge"],
    },
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const routes = Array.isArray(body.routes) ? body.routes.map(String) : []
  const forbidden = routes.filter((route) => route.includes("/api/proxy") || route.includes("/api/v1"))

  return NextResponse.json({
    ok: forbidden.length === 0,
    source: "internal-storefront-contract",
    data: {
      checkedRoutes: routes.length,
      forbiddenRoutesFound: forbidden,
      message:
        forbidden.length === 0
          ? "Theme route contract is internal-only safe."
          : "Hosted theme contract violation: remove public/proxy routes.",
    },
  }, { status: forbidden.length === 0 ? 200 : 400 })
}
