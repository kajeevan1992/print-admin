
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Menu,
  Minus,
  Package,
  Plus,
  Search,
  ShieldCheck,
  ShoppingCart,
  Star,
  Truck,
  Upload,
  User,
  X,
} from "lucide-react";
import { Button } from "@/themes/atlantis/components/ui/button";
import { Input } from "@/themes/atlantis/components/ui/input";
import { Textarea } from "@/themes/atlantis/components/ui/textarea";

const BRAND = {
  bg: "#F1F4F6",
  bg2: "#EDF1F3",
  panel: "#FFFFFF",
  panelSoft: "#F8FBFC",
  panelTint: "#F6FAFC",
  line: "#E2E6E8",
  ink: "#121517",
  muted: "#667179",
  primary: "rgb(24, 167, 208)",
  primaryDark: "#127B98",
  black: "#0F1012",
};


const THEME_BASE_PATH = "/theme/atlantis";

const DEFAULT_EXTERNAL_API_BASE = "http://y46josgjr3wve61rhl5xwivq.13.61.22.39.sslip.io";

function getApiBaseUrl() {
  const raw =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL ||
    DEFAULT_EXTERNAL_API_BASE;
  return raw.replace(/\/$/, "");
}


function stripThemeBase(pathname) {
  if (!pathname) return "/";
  if (pathname === THEME_BASE_PATH) return "/";
  if (pathname.startsWith(THEME_BASE_PATH + "/")) {
    return pathname.slice(THEME_BASE_PATH.length) || "/";
  }
  return pathname;
}

function withThemeBase(pathname) {
  if (!pathname || pathname === "/") return THEME_BASE_PATH;
  return `${THEME_BASE_PATH}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

function formatMinorPrice(value, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format((value ?? 0) / 100);
}

function mapLiveProduct(product) {
  return {
    title: product.title,
    price: product.priceFromMinor != null ? `From ${formatMinorPrice(product.priceFromMinor, product.currency || "GBP")}` : "Request quote",
    badge: product.productType === "QUOTE_LED" ? "Quote" : product.productType === "UPLOAD_LED" ? "Upload Artwork" : "Live Product",
    image:
      product.slug === "standard-business-cards"
        ? "/atlantis-images/business-card-front.svg"
        : product.slug === "a5-flyers"
        ? "/atlantis-images/flyer-front.svg"
        : "/atlantis-images/poster-main.svg",
    path:
      product.slug === "standard-business-cards"
        ? "/standard-business-cards"
        : product.slug === "a5-flyers"
        ? "/flyers"
        : product.slug === "mailer-boxes"
        ? "/posters-large-format-prints"
        : `/${product.slug}`,
  };
}

const NAV_ITEMS = [
  {
    label: "Business Cards",
    path: "/category/business-cards",
    feature: {
      title: "Professional business cards",
      body: "Premium presentation for your brand, team and customer touchpoints.",
      image: "/atlantis-images/business-card-front.svg",
      cta: "Shop business cards",
    },
    columns: [
      { title: "Popular styles", links: [["Standard Business Cards", "/standard-business-cards"], ["Premium Business Cards", "/standard-business-cards"], ["Rounded Corner Cards", "/standard-business-cards"], ["Loyalty Cards", "/all-products"]] },
      { title: "By finish", links: [["Matte", "/standard-business-cards"], ["Gloss", "/standard-business-cards"], ["Soft Touch", "/standard-business-cards"], ["Recycled", "/standard-business-cards"]] },
      { title: "Business essentials", links: [["Letterheads", "/all-products"], ["Compliment Slips", "/all-products"], ["Presentation Folders", "/all-products"], ["Name Badges", "/all-products"]] },
    ],
  },
  {
    label: "Flyers",
    path: "/category/flyers",
    feature: {
      title: "Flyers and leaflets",
      body: "Compact, promotional print for campaigns, menus and events.",
      image: "/atlantis-images/flyer-front.svg",
      cta: "View flyers",
    },
    columns: [
      { title: "Flyer formats", links: [["A6 Flyers", "/flyers"], ["A5 Flyers", "/flyers"], ["A4 Flyers", "/flyers"], ["DL Flyers", "/flyers"]] },
      { title: "Marketing print", links: [["Leaflets", "/flyers"], ["Menus", "/flyers"], ["Promotional Handouts", "/flyers"], ["Event Sheets", "/flyers"]] },
      { title: "Related products", links: [["Posters", "/posters-large-format-prints"], ["Booklets", "/booklets"], ["Brochures", "/booklets"], ["Stickers", "/all-products"]] },
    ],
  },
  {
    label: "Posters",
    path: "/category/posters",
    feature: {
      title: "Posters and large format",
      body: "Strong image-led products for displays, signage and retail promotion.",
      image: "/atlantis-images/poster-main.svg",
      cta: "Explore posters",
    },
    columns: [
      { title: "Large format", links: [["A3 Posters", "/posters-large-format-prints"], ["A2 Posters", "/posters-large-format-prints"], ["A1 Posters", "/posters-large-format-prints"], ["A0 Posters", "/posters-large-format-prints"]] },
      { title: "Display products", links: [["Roller Banners", "/all-products"], ["PVC Banners", "/all-products"], ["Foamex Boards", "/all-products"], ["Window Graphics", "/all-products"]] },
      { title: "Signage", links: [["Indoor Signage", "/all-products"], ["Outdoor Signage", "/all-products"], ["Retail POS", "/all-products"], ["Event Signage", "/all-products"]] },
    ],
  },
  {
    label: "Booklets",
    path: "/category/booklets",
    feature: {
      title: "Booklets and brochures",
      body: "Editorial-style layouts for stitched, wiro and premium bound print.",
      image: "/atlantis-images/hero-slide-2.svg",
      cta: "Shop booklets",
    },
    columns: [
      { title: "Booklet types", links: [["Stapled Booklets", "/booklets"], ["Wiro Bound", "/booklets"], ["Perfect Bound", "/booklets"], ["Brochures", "/booklets"]] },
      { title: "Use cases", links: [["Company Profiles", "/booklets"], ["Product Brochures", "/booklets"], ["Lookbooks", "/booklets"], ["Manuals", "/booklets"]] },
      { title: "Related items", links: [["Flyers", "/flyers"], ["Presentation Folders", "/all-products"], ["Posters", "/posters-large-format-prints"], ["Custom Quote", "/bespoke-quote"]] },
    ],
  },
  {
    label: "Labels",
    path: "/all-products",
    feature: {
      title: "Labels and stickers",
      body: "Product labels, sticker sheets and packaging-ready print.",
      image: "/atlantis-images/hero-slide-3.svg",
      cta: "Browse labels",
    },
    columns: [
      { title: "Label products", links: [["Bottle Labels", "/all-products"], ["Product Labels", "/all-products"], ["Sticker Sheets", "/all-products"], ["Window Stickers", "/all-products"]] },
      { title: "Packaging print", links: [["Sleeves", "/all-products"], ["Packaging Inserts", "/all-products"], ["Branded Seals", "/all-products"], ["Custom Packaging", "/bespoke-quote"]] },
      { title: "Support", links: [["Artwork Help", "/bespoke-quote"], ["Material Advice", "/bespoke-quote"], ["Bulk Pricing", "/bespoke-quote"], ["Get a Quote", "/bespoke-quote"]] },
    ],
  },
  {
    label: "Stationery",
    path: "/all-products",
    feature: {
      title: "Professional stationery",
      body: "Core office and brand stationery with a calm, polished presentation.",
      image: "/atlantis-images/hero-slide-1.svg",
      cta: "View stationery",
    },
    columns: [
      { title: "Essentials", links: [["Letterheads", "/all-products"], ["Compliment Slips", "/all-products"], ["NCR Pads", "/all-products"], ["Notepads", "/all-products"]] },
      { title: "Branded print", links: [["Presentation Folders", "/all-products"], ["Envelopes", "/all-products"], ["Notebooks", "/booklets"], ["Appointment Cards", "/all-products"]] },
      { title: "Useful links", links: [["Business Cards", "/standard-business-cards"], ["Booklets", "/booklets"], ["Custom Quote", "/bespoke-quote"], ["All Products", "/all-products"]] },
    ],
  },
  {
    label: "Signage",
    path: "/all-products",
    feature: {
      title: "Display and signage",
      body: "Retail, event and wayfinding graphics with large-format flexibility.",
      image: "/atlantis-images/poster-main.svg",
      cta: "Explore signage",
    },
    columns: [
      { title: "Display print", links: [["Roller Banners", "/all-products"], ["Foamex Boards", "/all-products"], ["PVC Signs", "/all-products"], ["Window Graphics", "/all-products"]] },
      { title: "Events", links: [["Directional Signs", "/all-products"], ["Exhibition Panels", "/all-products"], ["Outdoor Banners", "/all-products"], ["Promotional Boards", "/all-products"]] },
      { title: "Need help?", links: [["Installation Advice", "/bespoke-quote"], ["Custom Sizing", "/bespoke-quote"], ["Material Guidance", "/bespoke-quote"], ["Request Quote", "/bespoke-quote"]] },
    ],
  },
  {
    label: "All Products",
    path: "/all-products",
    feature: {
      title: "Explore the full catalog",
      body: "A broader storefront view with cleaner sections and stronger product grouping.",
      image: "/atlantis-images/hero-slide-2.svg",
      cta: "Shop all products",
    },
    columns: [
      { title: "Core categories", links: [["Business Cards", "/standard-business-cards"], ["Flyers", "/flyers"], ["Posters", "/posters-large-format-prints"], ["Booklets", "/booklets"]] },
      { title: "Expanded range", links: [["Labels", "/all-products"], ["Signage", "/all-products"], ["Stationery", "/all-products"], ["Packaging", "/all-products"]] },
      { title: "Custom support", links: [["Bespoke Quote", "/bespoke-quote"], ["Bulk Orders", "/bespoke-quote"], ["Artwork Advice", "/bespoke-quote"], ["Delivery Support", "/all-products"]] },
    ],
  },
  {
    label: "Bespoke Quote",
    path: "/bespoke-quote",
    feature: {
      title: "Custom print projects",
      body: "Perfect for specialist materials, unusual sizes and larger bespoke jobs.",
      image: "/atlantis-images/hero-slide-3.svg",
      cta: "Request a quote",
    },
    columns: [
      { title: "Best for", links: [["Bulk Orders", "/bespoke-quote"], ["Special Finishes", "/bespoke-quote"], ["Large Projects", "/bespoke-quote"], ["Complex Specs", "/bespoke-quote"]] },
      { title: "Support", links: [["Artwork Help", "/bespoke-quote"], ["Material Advice", "/bespoke-quote"], ["Production Queries", "/bespoke-quote"], ["Pricing Guidance", "/bespoke-quote"]] },
      { title: "Related pages", links: [["All Products", "/all-products"], ["Business Cards", "/standard-business-cards"], ["Flyers", "/flyers"], ["Posters", "/posters-large-format-prints"]] },
    ],
  },
];

const heroSlides = [
  {
    eyebrow: "Premium print solutions",
    title: "Professional online printing with a cleaner, calmer storefront feel.",
    body: "A much closer visual direction to the reference screenshots: softer grey-white background, broader navigation, fuller dropdown coverage and denser ecommerce sections.",
    image: "/atlantis-images/hero-slide-1.svg",
  },
  {
    eyebrow: "Built for trust",
    title: "Make browsing, ordering and quoting feel structured and premium.",
    body: "This theme now leans further into a real print ecommerce layout with product-led sections, review blocks, category strips and a broader footer structure.",
    image: "/atlantis-images/hero-slide-2.svg",
  },
  {
    eyebrow: "Ready for scale",
    title: "A stronger storefront foundation before connecting your backend.",
    body: "Use the current build for presentation now, then wire product data, pricing rules, uploads and admin flows through your dashboard later.",
    image: "/atlantis-images/hero-slide-3.svg",
  },
];

const catalog = {
  businessCards: {
    name: "Business Cards",
    slug: "/standard-business-cards",
    basePrice: 21.99,
    badge: "Best Seller",
    images: ["/atlantis-images/business-card-front.svg", "/atlantis-images/business-card-back.svg", "/atlantis-images/business-card-front.svg"],
    options: {
      finish: ["Standard Matte", "Premium Gloss", "Soft Touch", "Recycled"],
      orientation: ["Landscape", "Portrait"],
      corners: ["Square", "Rounded"],
      quantity: [100, 250, 500, 1000, 2500],
    },
    specs: [["Size", "85mm × 55mm"], ["Material", "350gsm stock"], ["Print", "Full colour"], ["Turnaround", "Standard / express"]],
    description: "Compact, professional cards with cleaner controls and stronger image hierarchy.",
  },
  flyers: {
    name: "Flyers",
    slug: "/flyers",
    basePrice: 18.4,
    badge: "Popular",
    images: ["/atlantis-images/flyer-front.svg", "/atlantis-images/flyer-back.svg", "/atlantis-images/flyer-front.svg"],
    options: {
      size: ["A6", "A5", "A4", "DL"],
      sides: ["Single Sided", "Double Sided"],
      paper: ["130gsm", "170gsm", "250gsm"],
      quantity: [100, 250, 500, 1000],
    },
    specs: [["Paper", "Silk / gloss / uncoated"], ["Print", "Full colour"], ["Turnaround", "Fast production"], ["Use case", "Menus, promotions, events"]],
    description: "Promotional print layouts that feel lighter, more structured and more sellable.",
  },
  posters: {
    name: "Posters",
    slug: "/posters-large-format-prints",
    basePrice: 8.49,
    badge: "Large Format",
    images: ["/atlantis-images/poster-main.svg", "/atlantis-images/poster-main.svg", "/atlantis-images/poster-main.svg"],
    options: {
      size: ["A3", "A2", "A1", "A0"],
      material: ["135gsm satin", "200gsm matt", "PVC", "Vinyl"],
      finish: ["Standard", "Laminated"],
      quantity: [1, 3, 5, 10, 25],
    },
    specs: [["Use", "Indoor / outdoor"], ["Material", "Paper, vinyl, PVC"], ["Print", "High-resolution colour"], ["Extras", "Custom sizes"]],
    description: "Large-format products presented in a more reference-like, image-first structure.",
  },
};

const featuredCollections = [
  { title: "Business Cards", subtitle: "Premium cards for teams and brands", image: "/atlantis-images/business-card-front.svg", path: "/category/business-cards" },
  { title: "Flyers & Leaflets", subtitle: "Menus, handouts and promotions", image: "/atlantis-images/flyer-front.svg", path: "/category/flyers" },
  { title: "Posters & Large Format", subtitle: "Display graphics and event print", image: "/atlantis-images/poster-main.svg", path: "/category/posters" },
  { title: "Booklets", subtitle: "Brochures, manuals and stitched print", image: "/atlantis-images/hero-slide-2.svg", path: "/category/booklets" },
  { title: "Labels", subtitle: "Bottle, product and packaging labels", image: "/atlantis-images/hero-slide-3.svg", path: "/all-products" },
  { title: "Stationery", subtitle: "Branded office and presentation materials", image: "/atlantis-images/hero-slide-1.svg", path: "/all-products" },
];

const featuredProducts = [
  { title: "Standard Business Cards", price: "From £21.99", badge: "Best Seller", image: "/atlantis-images/business-card-front.svg", path: "/standard-business-cards" },
  { title: "Premium Flyers", price: "From £18.40", badge: "Popular", image: "/atlantis-images/flyer-front.svg", path: "/flyers" },
  { title: "Large Format Posters", price: "From £8.49", badge: "Fast Turnaround", image: "/atlantis-images/poster-main.svg", path: "/posters-large-format-prints" },
  { title: "Wiro Bound Booklets", price: "From £34.00", badge: "Professional", image: "/atlantis-images/hero-slide-2.svg", path: "/booklets" },
];

const trustBadges = [
  { icon: ShieldCheck, title: "Professional Quality", text: "Cleaner white cards, calmer hierarchy and a more reference-like storefront tone." },
  { icon: Truck, title: "Fast Turnaround", text: "Useful for urgent print jobs and repeat customer reorders." },
  { icon: Package, title: "Custom Options", text: "Ready for more product options, quote routes and add-ons." },
  { icon: Star, title: "Commerce Ready", text: "Built to feel more like a complete production storefront." },
];

const testimonials = [
  { quote: "The new layout feels much more premium and easier to navigate.", name: "Marketing Lead", company: "Studio Brand Co." },
  { quote: "Cleaner typography and denser content blocks made the store feel more credible.", name: "Operations Manager", company: "Northway Events" },
  { quote: "The category structure and dropdowns feel much closer to a real print commerce site.", name: "Founder", company: "Urban Retail Print" },
];

const faqItems = [
  ["Can I upload artwork later?", "Yes. The storefront can be extended so artwork upload happens after add-to-cart or after quote approval."],
  ["Can this connect to my admin dashboard?", "Yes. The current theme is frontend-first and structured so product, stock and order data can be connected later."],
  ["Can I request custom print sizes?", "Yes. Use the bespoke quote flow for custom jobs, specialist materials and bulk pricing."],
  ["Can pricing be made dynamic?", "Yes. Product pages can be wired to live pricing rules and option matrices from your backend."],
];

const pricingGrid = [
  { qty: "100 pcs", price: "£12.00" },
  { qty: "250 pcs", price: "£18.00" },
  { qty: "500 pcs", price: "£27.00" },
  { qty: "1000 pcs", price: "£44.00" },
];

const productPageContent = {
  businessCards: {
    tabs: ["Product info", "Specifications", "Design guidelines", "FAQ's", "Ordering process"],
    optionGroups: [
      {
        key: "format",
        label: "Size",
        valueLabel: "85 × 55 mm",
        style: "tile",
        options: [
          { value: "Standard", sublabel: "85 × 55 mm", recommended: true },
          { value: "Portrait", sublabel: "55 × 85 mm" },
          { value: "Folded Portrait", sublabel: "110 × 85 mm" },
          { value: "Landscape Folded", sublabel: "170 × 55 mm", muted: true },
        ],
      },
      {
        key: "materialType",
        label: "Material Type",
        valueLabel: "Matt",
        style: "pill",
        options: [
          { value: "Matt", recommended: true },
          { value: "Glossy" },
          { value: "Eco" },
          { value: "Uncoated" },
          { value: "Special" },
          { value: "Seed Paper" },
        ],
      },
      {
        key: "paperType",
        label: "Paper type",
        valueLabel: "400 gsm Silk",
        style: "tile",
        options: [
          { value: "Matte (Silk) 300 gsm" },
          { value: "Matte (Silk) 350 gsm" },
          { value: "Matte (Silk) 400 gsm", recommended: true },
          { value: "Matte (Silk) 450 gsm" },
        ],
      },
      {
        key: "finishing",
        label: "Finishing",
        valueLabel: "No finishing",
        style: "tile",
        options: [
          { value: "No finishing" },
          { value: "Double-sided Matte lamination", recommended: true },
          { value: "Double-sided Gloss lamination" },
          { value: "Double-sided UV Glossy", muted: true },
        ],
      },
      {
        key: "printing",
        label: "Printing",
        valueLabel: "Double-sided",
        style: "pill",
        options: [
          { value: "Single-sided printing" },
          { value: "Double-sided printing", recommended: true },
        ],
      },
      {
        key: "corners",
        label: "Corners",
        valueLabel: "Straight corners",
        style: "pill",
        options: [
          { value: "Straight corners" },
          { value: "Rounded Corners + £8.00" },
        ],
      },
    ],
    quantities: [
      { qty: 50, price: 11.29 },
      { qty: 100, price: 13.49 },
      { qty: 250, price: 16.99 },
      { qty: 500, price: 21.99, recommended: true },
      { qty: 1000, price: 27.99 },
      { qty: 2500, price: 43.99 },
      { qty: 5000, price: 85.99 },
      { qty: 10000, price: 128.99 },
    ],
    deliveryOptions: [
      { day: "Monday April 27", latest: "Latest Tuesday April 28", selected: true },
      { day: "Thursday April 23", latest: "Latest Friday April 24", addon: "+ £1.00" },
      { day: "Wednesday April 22", latest: "Latest Thursday April 23", addon: "+ £2.00" },
    ],
    description:
      "Create lasting connections with affordable, professional business cards. Choose from multiple sizes, papers and finishes to match your brand identity, with single or double-sided print and optional finishing for added durability.",
    bullets: [
      "High-quality full colour print",
      "Possibility of cutting deviation",
      "Dark ink near fold lines may crack on heavier stocks",
      "Eco-friendly options available",
    ],
    specs: [
      ["Material", "Matt | Eco | Writable | Special"],
      ["Finishing", "Gloss | Matte | Velvet | No finishing"],
      ["Print", "Full colour"],
      ["Printing options", "Single-sided | Double-sided"],
      ["Cutting", "Rounded Corners | Square Corners"],
      ["Print technique", "High-quality digital print"],
    ],
    guidelines: [
      "Use CMYK as the colour mode.",
      "Resolution of at least 300 dpi.",
      "Add 3 mm bleed and keep 4 mm safety margin.",
      "Minimum font size is 6 pt.",
      "Check line thickness and overprint settings.",
      "Keep total ink coverage under 300%.",
    ],
    faqs: [
      "What is this product? And what can I use it for?",
      "What materials can I choose from?",
      "What is the fastest possible turnaround?",
      "Which production techniques do you use?",
      "What is cutting deviation?",
      "Is there an option to add drill holes?",
    ],
    orderLinks: ["Ordering with own design", "Using editor design"],
  },
  flyers: {
    tabs: ["Product info", "Specifications", "Artwork guides", "FAQ's", "Ordering process"],
    optionGroups: [
      {
        key: "format",
        label: "Size",
        valueLabel: "A5",
        style: "tile",
        options: [
          { value: "A6", sublabel: "105 × 148 mm" },
          { value: "A5", sublabel: "148 × 210 mm", recommended: true },
          { value: "A4", sublabel: "210 × 297 mm" },
          { value: "DL", sublabel: "99 × 210 mm" },
        ],
      },
      {
        key: "sides",
        label: "Printing",
        valueLabel: "Double-sided",
        style: "pill",
        options: [
          { value: "Single-sided printing" },
          { value: "Double-sided printing", recommended: true },
        ],
      },
      {
        key: "paper",
        label: "Paper type",
        valueLabel: "170 gsm Silk",
        style: "tile",
        options: [
          { value: "130 gsm Silk" },
          { value: "170 gsm Silk", recommended: true },
          { value: "250 gsm Silk" },
          { value: "350 gsm Silk" },
        ],
      },
    ],
    quantities: [
      { qty: 100, price: 18.4 },
      { qty: 250, price: 22.4, recommended: true },
      { qty: 500, price: 29.4 },
      { qty: 1000, price: 37.4 },
      { qty: 2500, price: 59.4 },
      { qty: 5000, price: 89.4 },
    ],
    deliveryOptions: [
      { day: "Thursday April 23", latest: "Latest Friday April 24", selected: true },
      { day: "Wednesday April 22", latest: "Latest Thursday April 23", addon: "+ £2.00" },
    ],
    description:
      "Flyers and leaflets are ideal for promotions, takeaway menus and event handouts. Select a size, print side configuration and stock weight to build a simple, quick-turnaround order.",
    bullets: [
      "Fast handout and promotional print",
      "Multiple flyer sizes available",
      "Simple artwork setup",
      "Suitable for menus and campaigns",
    ],
    specs: [
      ["Stock", "Silk | Gloss | Uncoated"],
      ["Print", "Full colour"],
      ["Sides", "Single-sided | Double-sided"],
      ["Use cases", "Promotions | Menus | Events"],
    ],
    guidelines: ["Use CMYK colour mode.", "300 dpi resolution.", "Add 3 mm bleed.", "Keep text in the safe area."],
    faqs: ["What flyer sizes are available?", "Do you offer folded flyers?", "Can I print menus?", "What turnaround options are available?"],
    orderLinks: ["Ordering with print-ready PDF", "Requesting artwork help"],
  },
  posters: {
    tabs: ["Product info", "Specifications", "Design guidelines", "FAQ's", "Ordering process"],
    optionGroups: [
      {
        key: "format",
        label: "Size",
        valueLabel: "A2",
        style: "tile",
        options: [
          { value: "A3", sublabel: "297 × 420 mm" },
          { value: "A2", sublabel: "420 × 594 mm", recommended: true },
          { value: "A1", sublabel: "594 × 841 mm" },
          { value: "A0", sublabel: "841 × 1189 mm" },
        ],
      },
      {
        key: "material",
        label: "Material",
        valueLabel: "190 gsm Photo Satin",
        style: "pill",
        options: [
          { value: "Photo Satin" },
          { value: "Matt Paper" },
          { value: "Plain Paper" },
          { value: "PVC" },
          { value: "Vinyl" },
        ],
      },
      {
        key: "eyelets",
        label: "Eyelets",
        valueLabel: "No",
        style: "pill",
        options: [
          { value: "No" },
          { value: "Yes + £25.00" },
        ],
      },
    ],
    quantities: [
      { qty: 1, price: 8.49, recommended: true },
      { qty: 3, price: 17.49 },
      { qty: 5, price: 23.49 },
      { qty: 10, price: 39.49 },
      { qty: 25, price: 74.49 },
    ],
    deliveryOptions: [
      { day: "Thursday April 23", latest: "Latest Friday April 24", selected: true },
      { day: "Wednesday April 22", latest: "Latest Thursday April 23", addon: "+ £3.00" },
    ],
    description:
      "Large format posters and display graphics designed for campaigns, retail environments and event signage. Configure format, material and add-ons before ordering.",
    bullets: ["High-resolution colour output", "Indoor and outdoor materials", "Large format sizes available", "Optional finishing and add-ons"],
    specs: [
      ["Material", "Photo satin | Matt paper | PVC | Vinyl"],
      ["Sizes", "A3 | A2 | A1 | A0 | Custom"],
      ["Add-ons", "Eyelets"],
      ["Print", "Colour / BW"],
    ],
    guidelines: ["Use high-resolution images.", "Keep important text away from trim.", "Use CMYK colour mode.", "Supply artwork to final size plus bleed."],
    faqs: ["Which poster sizes are available?", "Can I use outdoor material?", "Do you offer custom sizes?", "Can I add eyelets?"],
    orderLinks: ["Ordering with own artwork", "Requesting custom sizing"],
  },
};


const categoryPages = {
  businessCards: {
    path: "/category/business-cards",
    title: "Business Cards",
    eyebrow: "Professional print for business",
    intro:
      "Choose from standard, premium and specialist business cards with a cleaner category layout, stronger visual hierarchy and quick access to the most-used product ranges.",
    heroImage: "/atlantis-images/business-card-front.svg",
    trust: ["Fast turnaround", "Premium stocks", "Bulk pricing", "Artwork support"],
    quickLinks: ["Standard Cards", "Premium Cards", "Rounded Corner Cards", "Loyalty Cards", "Eco Cards"],
    featured: [
      { title: "Classic Business Cards", text: "The most-used business card range for brands, teams and client-facing work.", path: "/standard-business-cards", image: "/atlantis-images/business-card-front.svg" },
      { title: "Premium Business Cards", text: "Thicker stocks and stronger finishes for a more premium presentation.", path: "/standard-business-cards", image: "/atlantis-images/business-card-back.svg" },
      { title: "Rounded Corner Cards", text: "A softer, more distinctive edge for creative and retail brands.", path: "/standard-business-cards", image: "/atlantis-images/business-card-front.svg" },
    ],
    grid: [
      "Standard Business Cards",
      "Premium Business Cards",
      "Rounded Corner Cards",
      "Folded Business Cards",
      "Square Business Cards",
      "Eco Business Cards",
      "Loyalty Cards",
      "Appointment Cards",
    ],
    faqs: [
      "Which business card size is most popular?",
      "Can I order premium finishes and thicker stocks?",
      "Do you offer rounded or folded cards?",
      "Can I request a custom size or finish?",
    ],
  },
  flyers: {
    path: "/category/flyers",
    title: "Flyers & Leaflets",
    eyebrow: "Promotional print for campaigns",
    intro:
      "A promotional-print category page with size options, paper selections and a more reference-like structure for menus, handouts and event marketing.",
    heroImage: "/atlantis-images/flyer-front.svg",
    trust: ["Quick handouts", "Multiple sizes", "Simple reorder flow", "Menu printing"],
    quickLinks: ["A6 Flyers", "A5 Flyers", "A4 Flyers", "DL Flyers", "Folded Flyers"],
    featured: [
      { title: "A5 Flyers", text: "A balanced size for promotional campaigns, menus and branded handouts.", path: "/flyers", image: "/atlantis-images/flyer-front.svg" },
      { title: "DL Flyers", text: "Slim, menu-ready format ideal for hospitality and takeaway promotions.", path: "/flyers", image: "/atlantis-images/flyer-back.svg" },
      { title: "Folded Leaflets", text: "Best for service menus, product guides and information handouts.", path: "/flyers", image: "/atlantis-images/flyer-front.svg" },
    ],
    grid: [
      "A6 Flyers",
      "A5 Flyers",
      "A4 Flyers",
      "DL Flyers",
      "Folded Flyers",
      "Menus",
      "Leaflets",
      "Promotional Handouts",
    ],
    faqs: [
      "What flyer size works best for handouts?",
      "Can I print takeaway menus?",
      "What paper weights are available?",
      "Do you offer folded flyer formats?",
    ],
  },
  posters: {
    path: "/category/posters",
    title: "Posters & Large Format",
    eyebrow: "Display print and large format",
    intro:
      "Explore large-format posters and display products with stronger category grouping for retail, events and internal signage.",
    heroImage: "/atlantis-images/poster-main.svg",
    trust: ["Large format sizes", "Indoor & outdoor", "Display materials", "Custom sizing"],
    quickLinks: ["A3 Posters", "A2 Posters", "A1 Posters", "A0 Posters", "PVC & Vinyl"],
    featured: [
      { title: "A2 Posters", text: "A versatile poster format for promotions, in-store notices and events.", path: "/posters-large-format-prints", image: "/atlantis-images/poster-main.svg" },
      { title: "A1 Posters", text: "A stronger promotional format for retail windows and wall displays.", path: "/posters-large-format-prints", image: "/atlantis-images/poster-main.svg" },
      { title: "PVC & Vinyl Posters", text: "More durable large-format options for longer-lasting display use.", path: "/posters-large-format-prints", image: "/atlantis-images/poster-main.svg" },
    ],
    grid: [
      "A3 Posters",
      "A2 Posters",
      "A1 Posters",
      "A0 Posters",
      "PVC Posters",
      "Vinyl Posters",
      "Window Graphics",
      "Retail POS",
    ],
    faqs: [
      "Which poster size is best for retail displays?",
      "Can I choose outdoor materials?",
      "Do you offer custom large-format sizes?",
      "Can I add eyelets or specialist finishing?",
    ],
  },
  booklets: {
    path: "/category/booklets",
    title: "Booklets & Brochures",
    eyebrow: "Editorial and brochure print",
    intro:
      "A stronger category landing page for stapled, wiro and premium bound print products, designed to feel closer to a real commercial storefront.",
    heroImage: "/atlantis-images/hero-slide-2.svg",
    trust: ["Stapled & bound", "Brochure ready", "Manuals & booklets", "Bulk print support"],
    quickLinks: ["Stapled Booklets", "Wiro Bound", "Perfect Bound", "Brochures", "Manuals"],
    featured: [
      { title: "Stapled Booklets", text: "The most common booklet option for brochures, programmes and product guides.", path: "/booklets", image: "/atlantis-images/hero-slide-2.svg" },
      { title: "Wiro Bound Booklets", text: "A premium bound style for presentations, manuals and notebooks.", path: "/booklets", image: "/atlantis-images/hero-slide-2.svg" },
      { title: "Perfect Bound Brochures", text: "Best for thicker brochure print and more polished presentation.", path: "/booklets", image: "/atlantis-images/hero-slide-2.svg" },
    ],
    grid: [
      "Stapled Booklets",
      "Wiro Bound Booklets",
      "Perfect Bound Booklets",
      "Brochures",
      "Lookbooks",
      "Manuals",
      "Notebooks",
      "Company Profiles",
    ],
    faqs: [
      "Which binding type should I choose?",
      "What page counts are supported?",
      "Can I print brochures and manuals?",
      "Is thicker cover stock available?",
    ],
  },
};

function CategoryPage({ kind, navigate }) {
  const page = categoryPages[kind];
  return (
    <section className="py-6">
      <Shell narrow>
        <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: BRAND.muted }}>
          <button onClick={() => navigate("/")} className="font-semibold">Home</button>
          <span>/</span>
          <span>{page.title}</span>
        </div>

        <div className="overflow-hidden rounded-[22px] border bg-white shadow-[0_14px_30px_rgba(0,0,0,0.035)]" style={{ borderColor: BRAND.line }}>
          <div className="grid gap-0 lg:grid-cols-[1.02fr_0.98fr]">
            <div className="p-6 md:p-8">
              <div className="inline-flex rounded-full bg-[#F1FAFD] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>
                {page.eyebrow}
              </div>
              <h1 className="mt-4 text-[42px] font-black leading-[0.95] tracking-[-0.05em]" style={{ color: BRAND.ink }}>
                {page.title}
              </h1>
              <p className="mt-4 max-w-[620px] text-[13px] leading-7" style={{ color: BRAND.muted }}>
                {page.intro}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {page.trust.map((item) => (
                  <span key={item} className="rounded-full border bg-white px-3 py-2 text-[11px] font-semibold shadow-[0_6px_14px_rgba(0,0,0,0.02)]" style={{ borderColor: BRAND.line, color: BRAND.muted }}>
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <PrimaryButton onClick={() => navigate(kind === "businessCards" ? "/standard-business-cards" : kind === "flyers" ? "/flyers" : kind === "posters" ? "/posters-large-format-prints" : "/booklets")}>
                  Shop featured range
                </PrimaryButton>
                <SecondaryButton onClick={() => navigate("/bespoke-quote")}>Request custom quote</SecondaryButton>
              </div>
            </div>
            <div className="bg-[linear-gradient(180deg,#F8FBFC,#F1F5F7)] p-5">
              <div className="overflow-hidden rounded-[18px] border bg-white shadow-[0_12px_28px_rgba(0,0,0,0.03)]" style={{ borderColor: BRAND.line }}>
                <img src={page.heroImage} alt={page.title} className="h-[330px] w-full object-cover" />
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {page.quickLinks.map((item) => (
                  <div key={item} className="rounded-[12px] border bg-white px-3 py-3 text-[12px] font-semibold" style={{ borderColor: BRAND.line, color: BRAND.ink }}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {page.featured.map((item) => (
            <button key={item.title} onClick={() => navigate(item.path)} className="group rounded-[20px] border bg-white p-4 text-left shadow-[0_12px_28px_rgba(0,0,0,0.03)] transition hover:-translate-y-[1px] hover:shadow-[0_16px_34px_rgba(0,0,0,0.05)]" style={{ borderColor: BRAND.line }}>
              <img src={item.image} alt={item.title} className="h-44 w-full rounded-[14px] object-cover" />
              <div className="mt-4 text-[18px] font-black tracking-[-0.03em]" style={{ color: BRAND.ink }}>{item.title}</div>
              <p className="mt-2 text-[12px] leading-6" style={{ color: BRAND.muted }}>{item.text}</p>
              <div className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold" style={{ color: BRAND.primary }}>
                View product <ChevronRight className="h-4 w-4" />
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-[22px] border bg-white p-5 shadow-[0_12px_28px_rgba(0,0,0,0.03)]" style={{ borderColor: BRAND.line }}>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Browse category</div>
              <div className="mt-2 text-[30px] font-black tracking-[-0.04em]" style={{ color: BRAND.ink }}>
                Explore the full {page.title.toLowerCase()} range
              </div>
            </div>
            <SecondaryButton onClick={() => navigate("/all-products")}>View all products</SecondaryButton>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {page.grid.map((item, idx) => (
              <button
                key={item}
                onClick={() => navigate(kind === "businessCards" ? "/standard-business-cards" : kind === "flyers" ? "/flyers" : kind === "posters" ? "/posters-large-format-prints" : "/booklets")}
                className="group rounded-[16px] border bg-white p-3 text-left shadow-[0_8px_20px_rgba(0,0,0,0.02)] transition hover:-translate-y-[1px] hover:shadow-[0_14px_28px_rgba(0,0,0,0.05)]"
                style={{ borderColor: BRAND.line }}
              >
                <img src={(kind === "businessCards" ? "/atlantis-images/business-card-front.svg" : kind === "flyers" ? "/atlantis-images/flyer-front.svg" : kind === "posters" ? "/atlantis-images/poster-main.svg" : "/atlantis-images/hero-slide-2.svg")} alt={item} className="h-28 w-full rounded-[12px] object-cover" />
                <div className="mt-3 text-[13px] font-bold" style={{ color: BRAND.ink }}>{item}</div>
                <div className="mt-1 text-[11px]" style={{ color: BRAND.muted }}>
                  {idx % 2 === 0 ? "Popular option" : "Available with custom specs"}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[22px] border bg-white p-5 shadow-[0_12px_28px_rgba(0,0,0,0.03)]" style={{ borderColor: BRAND.line }}>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Why order this category</div>
            <div className="mt-2 text-[28px] font-black tracking-[-0.04em]" style={{ color: BRAND.ink }}>
              A cleaner category page with better browsing structure.
            </div>
            <div className="mt-4 grid gap-3">
              {[
                "Stronger grouping of featured and supporting products",
                "Clearer jump-off points to real product pages",
                "Useful for demos before connecting live backend data",
                "Easy to replace placeholder images with final assets",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 text-[12px]" style={{ color: BRAND.muted }}>
                  <Check className="mt-0.5 h-4 w-4" style={{ color: BRAND.primary }} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[22px] border bg-white p-5 shadow-[0_12px_28px_rgba(0,0,0,0.03)]" style={{ borderColor: BRAND.line }}>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Category FAQ</div>
            <div className="mt-4 space-y-3">
              {page.faqs.map((item) => (
                <div key={item} className="rounded-[14px] border bg-[#FAFBFB] px-4 py-3 text-[12px] font-semibold" style={{ borderColor: BRAND.line, color: BRAND.ink }}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Shell>
    </section>
  );
}

function currency(value) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value);
}

function usePathState() {
  const getPath = () => stripThemeBase(window.location.pathname || "/");
  const [path, setPath] = useState(getPath());
  useEffect(() => {
    const onPop = () => setPath(getPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const navigate = (next) => {
    const internalPath = next || "/";
    const finalPath = withThemeBase(internalPath);
    window.history.pushState({}, "", finalPath);
    setPath(internalPath);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return { path, navigate };
}

function useCart() {
  const [items, setItems] = useState(() => {
    const raw = localStorage.getItem("holo-cart");
    return raw ? JSON.parse(raw) : [];
  });
  useEffect(() => { localStorage.setItem("holo-cart", JSON.stringify(items)); }, [items]);
  const addItem = (item) => setItems((prev) => [...prev, { ...item, id: crypto.randomUUID(), qty: item.qty || 1 }]);
  const removeItem = (id) => setItems((prev) => prev.filter((x) => x.id !== id));
  const updateQty = (id, delta) => setItems((prev) => prev.map((x) => (x.id === id ? { ...x, qty: Math.max(1, x.qty + delta) } : x)));
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  return { items, addItem, removeItem, updateQty, subtotal };
}

function Shell({ children, narrow = false }) {
  return <div className={`mx-auto w-full px-4 sm:px-6 lg:px-8 ${narrow ? "max-w-[1220px]" : "max-w-[1360px]"}`}>{children}</div>;
}

function UtilityBar() {
  return (
    <div style={{ backgroundColor: BRAND.black, color: "white" }}>
      <Shell>
        <div className="flex h-8 items-center justify-between text-[11px] font-medium">
          <span>Professional print, signage and packaging solutions</span>
          <div className="hidden gap-5 sm:flex">
            <span>Business orders</span>
            <span>Bulk pricing</span>
            <span>Fast turnaround</span>
            <span>Bespoke quote support</span>
          </div>
        </div>
      </Shell>
    </div>
  );
}

function Header({ navigate, currentPath, cartCount, cartSubtotal }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openLabel, setOpenLabel] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const close = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpenLabel(null); };
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header className={`sticky top-0 z-40 border-b bg-white/95 backdrop-blur transition-all duration-300 ${isScrolled ? "shadow-[0_12px_30px_rgba(0,0,0,0.06)]" : ""}`} style={{ borderColor: BRAND.line }}>
      <Shell>
        <div ref={wrapperRef} className="relative">
          <div className={`grid grid-cols-[auto_1fr_auto] items-center gap-6 transition-all duration-300 ${isScrolled ? "h-[64px]" : "h-[74px]"}`}>
            <div className="flex items-center gap-3">
              <button className="rounded-xl p-2 xl:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></button>
              <button onClick={() => navigate("/")} className="flex items-center gap-0.5">
                <span className="text-[42px] font-black tracking-[-0.055em]" style={{ color: BRAND.primary }}>HOLO</span>
                <span className="text-[42px] font-black tracking-[-0.055em]" style={{ color: BRAND.ink }}>PRINT</span>
              </button>
            </div>

            <nav className="hidden items-center justify-center gap-4 xl:flex">
              {NAV_ITEMS.map((item) => {
                const active = currentPath === item.path;
                const open = openLabel === item.label;
                return (
                  <button
                    key={item.label}
                    className="inline-flex items-center gap-1 text-[13px] font-semibold tracking-[-0.01em]"
                    style={{ color: active || open ? BRAND.primary : BRAND.ink }}
                    onMouseEnter={() => setOpenLabel(item.label)}
                    onClick={() => navigate(item.path)}
                  >
                    {item.label}
                    <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
                  </button>
                );
              })}
            </nav>

            <div className="ml-auto flex items-center gap-2">
              <IconButton icon={<Search className="h-4 w-4" />} />
              <IconButton icon={<User className="h-4 w-4" />} />
              <button onClick={() => navigate("/cart")} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-semibold" style={{ borderColor: BRAND.line, color: BRAND.muted, backgroundColor: "white" }}>
                <ShoppingCart className="h-4 w-4" />
                <span>{currency(cartSubtotal)}</span>
                {cartCount > 0 && <span className="rounded-full px-1.5 py-0.5 text-[10px] text-white" style={{ backgroundColor: BRAND.primary }}>{cartCount}</span>}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {openLabel && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.18 }} onMouseLeave={() => setOpenLabel(null)} className="absolute left-0 right-0 top-full hidden xl:block">
                <div className="mt-2 rounded-[22px] border bg-white p-5 shadow-[0_34px_100px_rgba(0,0,0,0.13)]" style={{ borderColor: BRAND.line }}>
                  {(() => {
                    const item = NAV_ITEMS.find((x) => x.label === openLabel) || NAV_ITEMS[0];
                    return (
                      <div className="grid gap-5">
                        <div className="grid grid-cols-[270px_1fr_1fr_1fr] gap-6">
                          <div className="rounded-[20px] border p-4" style={{ borderColor: BRAND.line, background: "linear-gradient(180deg, #FBFDFE 0%, #F4F9FB 100%)" }}>
                            <img src={item.feature.image} alt={item.feature.title} className="h-36 w-full rounded-[12px] object-cover" />
                            <div className="mt-4 text-[18px] font-black tracking-[-0.03em]" style={{ color: BRAND.ink }}>{item.feature.title}</div>
                            <p className="mt-2 text-[12px] leading-6" style={{ color: BRAND.muted }}>{item.feature.body}</p>
                            <button onClick={() => navigate(item.path)} className="mt-4 text-[12px] font-bold" style={{ color: BRAND.primary }}>{item.feature.cta}</button>
                          </div>

                          {item.columns.map((column) => (
                            <div key={column.title}>
                              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>{column.title}</div>
                              <div className="grid gap-1">
                                {column.links.map(([label, path]) => (
                                  <button key={label} onClick={() => { navigate(path); setOpenLabel(null); }} className="rounded-xl px-3 py-2 text-left text-[12px] font-medium hover:bg-[#F6F7F8]" style={{ color: BRAND.ink }}>
                                    {label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-4 gap-3 border-t pt-4" style={{ borderColor: BRAND.line }}>
                          {["Fast turnaround", "Premium stock", "Bulk pricing", "Artwork support"].map((x, idx) => (
                            <div key={x} className="rounded-[16px] border px-4 py-3 text-[11px] font-semibold" style={{ borderColor: BRAND.line, color: BRAND.muted, background: "linear-gradient(180deg, #FFFFFF 0%, #F8FBFC 100%)" }}>
                              {x}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Shell>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/25 xl:hidden" onClick={() => setMobileOpen(false)}>
          <div className="h-full w-[320px] bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <div className="text-[24px] font-black">Menu</div>
              <button onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="grid gap-1">
              {NAV_ITEMS.map((item) => (
                <button key={item.label} className="rounded-xl px-3 py-3 text-left text-[14px] font-semibold hover:bg-[#F6F7F8]" onClick={() => { navigate(item.path); setMobileOpen(false); }}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function IconButton({ icon }) {
  return <div className="grid h-9 w-9 place-items-center rounded-xl border bg-white" style={{ borderColor: BRAND.line }}>{icon}</div>;
}

function Hero({ navigate }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setActive((p) => (p + 1) % heroSlides.length), 4600);
    return () => clearInterval(timer);
  }, []);
  return (
    <section className="relative overflow-hidden border-b" style={{ borderColor: BRAND.line, backgroundColor: BRAND.panelSoft }}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(24,167,208,0.07),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(0,0,0,0.03),transparent_24%)]" />
      <Shell>
        <div className="relative grid min-h-[500px] items-center gap-10 py-8 lg:grid-cols-[1.02fr_0.98fr]">
          <AnimatePresence mode="wait">
            <motion.div key={active} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22 }}>
              <div className="mb-3 inline-flex rounded-full bg-[#F1FAFD] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>{heroSlides[active].eyebrow}</div>
              <h1 className="max-w-[660px] text-[66px] font-black leading-[0.9] tracking-[-0.065em] sm:text-[78px]" style={{ color: BRAND.ink }}>{heroSlides[active].title}</h1>
              <p className="mt-5 max-w-[600px] text-[14px] leading-7" style={{ color: BRAND.muted }}>{heroSlides[active].body}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <PrimaryButton onClick={() => navigate("/all-products")}>Browse Products</PrimaryButton>
                <SecondaryButton onClick={() => navigate("/bespoke-quote")}>Request Bespoke Quote</SecondaryButton>
              </div>
              <div className="mt-5 flex gap-2">
                {heroSlides.map((_, i) => (
                  <button key={i} onClick={() => setActive(i)} className="h-2.5 rounded-full transition-all" style={{ width: i === active ? 28 : 8, backgroundColor: i === active ? BRAND.primary : "#D4D9DD" }} />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="justify-self-center lg:justify-self-end">
            <div className="overflow-hidden rounded-[28px] border bg-white p-3 shadow-[0_28px_72px_rgba(0,0,0,0.065)]" style={{ borderColor: BRAND.line }}>
              <img src={heroSlides[active].image} alt="Hero" className="h-[365px] w-[580px] max-w-full rounded-[18px] object-cover" />
            </div>
          </div>
        </div>
        <div className="mt-6 rounded-[22px] border bg-white p-5 shadow-[0_14px_30px_rgba(0,0,0,0.038)]" style={{ borderColor: BRAND.line }}>
          <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>You may also like</div>
          <div className="grid gap-4 md:grid-cols-3">
            {featuredProducts.slice(0,3).map((item) => (
              <button key={item.title} onClick={() => window.location.pathname !== item.path && (window.history.pushState({}, "", item.path), window.dispatchEvent(new PopStateEvent("popstate")))} className="group rounded-[16px] border bg-white p-3 text-left transition hover:-translate-y-[1px] hover:shadow-[0_12px_24px_rgba(0,0,0,0.05)]" style={{ borderColor: BRAND.line }}>
                <img src={item.image} alt={item.title} className="h-28 w-full rounded-[12px] object-cover transition duration-500 group-hover:scale-[1.03]" />
                <div className="mt-3 text-[13px] font-bold" style={{ color: BRAND.ink }}>{item.title}</div>
                <div className="text-[11px]" style={{ color: BRAND.muted }}>{item.price}</div>
              </button>
            ))}
          </div>
        </div>
      </Shell>
    </section>
  );
}

function SectionHeading({ eyebrow, title, compact = false, action = null }) {
  return (
    <div className={compact ? "mb-4" : "mb-5 flex items-end justify-between gap-4"}>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>{eyebrow}</div>
        <h2 className="mt-2 text-[30px] font-black tracking-[-0.045em]" style={{ color: BRAND.ink }}>{title}</h2>
      </div>
      {!compact && action}
    </div>
  );
}

function HomePage({ navigate, featuredProducts = featuredProducts, tenantName = 'Atlantis Print' }) {
  return (
    <div>
      <Hero navigate={navigate} />

      <section className="py-6"><Shell><div className="flex gap-3 overflow-x-auto pb-2">
        {["Business Cards", "Flyers", "Posters", "Booklets", "Labels", "Signage", "Packaging", "Stationery"].map((item) => (
          <button key={item} className="whitespace-nowrap rounded-full border bg-white px-4 py-2 text-[12px] font-semibold shadow-[0_6px_14px_rgba(0,0,0,0.02)]" style={{ borderColor: BRAND.line }}>{item}</button>
        ))}
      </div></Shell></section>

      <section className="py-6"><Shell><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {trustBadges.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-[20px] border bg-white p-4 shadow-[0_12px_28px_rgba(0,0,0,0.035)]" style={{ borderColor: BRAND.line }}>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#F1FAFD]" style={{ color: BRAND.primary }}><Icon className="h-5 w-5" /></div>
              <div className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: BRAND.primary }}>Store benefit</div><div className="mt-2 text-[15px] font-bold" style={{ color: BRAND.ink }}>{item.title}</div>
              <p className="mt-2 text-[12px] leading-6" style={{ color: BRAND.muted }}>{item.text}</p>
            </div>
          );
        })}
      </div></Shell>
</section>

      <section className="py-3"><Shell>
        <div className="rounded-[20px] border bg-white px-5 py-4 shadow-[0_12px_28px_rgba(0,0,0,0.03)]" style={{ borderColor: BRAND.line }}>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              ["10k+", "orders delivered"],
              ["24hr", "express turnaround"],
              ["350gsm+", "premium stock options"],
              ["B2B", "bulk quote ready"],
            ].map(([n,t]) => (
              <div key={n} className="text-center">
                <div className="text-[28px] font-black tracking-[-0.04em]" style={{ color: BRAND.ink }}>{n}</div>
                <div className="text-[11px] uppercase tracking-[0.14em]" style={{ color: BRAND.muted }}>{t}</div>
              </div>
            ))}
          </div>
        </div>
      </Shell></section>

      <section className="py-3"><Shell>
        <div className="rounded-[20px] border bg-white px-5 py-4 shadow-[0_12px_28px_rgba(0,0,0,0.03)]" style={{ borderColor: BRAND.line }}>
          <div className="grid gap-4 md:grid-cols-5">
            {["Retail brands", "Hospitality", "Events", "Corporate teams", "Independent studios"].map((item) => (
              <div key={item} className="rounded-[14px] border bg-[#FBFBFB] px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[0.14em]" style={{ borderColor: BRAND.line, color: BRAND.muted }}>
                {item}
              </div>
            ))}
          </div>
        </div>
      </Shell></section>

      <section className="py-6"><Shell>
        <SectionHeading eyebrow="Collections" title="Shop our most-used print categories" action={<SecondaryButton onClick={() => navigate("/all-products")}>View all</SecondaryButton>} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featuredCollections.map((item) => (
            <button key={item.title} onClick={() => navigate(item.path)} className="group rounded-[18px] border bg-white p-4 text-left shadow-[0_10px_24px_rgba(0,0,0,0.03)] transition hover:-translate-y-[1px] hover:shadow-[0_14px_34px_rgba(0,0,0,0.05)]" style={{ borderColor: BRAND.line }}>
              <div className="overflow-hidden rounded-[14px]"><img src={item.image} alt={item.title} className="h-40 w-full object-cover transition duration-500 group-hover:scale-[1.03]" /></div>
              <div className="mt-4 text-[18px] font-black tracking-[-0.03em]" style={{ color: BRAND.ink }}>{item.title}</div>
              <p className="mt-2 text-[12px] leading-6" style={{ color: BRAND.muted }}>{item.subtitle}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-[12px] font-bold" style={{ color: BRAND.primary }}>Explore <ChevronRight className="h-4 w-4" /></div>
            </button>
          ))}
        </div>
      </Shell></section>

      <section className="py-6"><Shell>
        <SectionHeading eyebrow="Featured products" title={`Popular print products from ${tenantName}`} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {featuredProducts.map((item) => (
            <button key={item.title} onClick={() => navigate(item.path)} className="group rounded-[18px] border bg-white p-4 text-left shadow-[0_10px_24px_rgba(0,0,0,0.03)] transition hover:-translate-y-[1px] hover:shadow-[0_14px_34px_rgba(0,0,0,0.05)]" style={{ borderColor: BRAND.line }}>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-[#F1FAFD] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: BRAND.primary }}>{item.badge}</span>
                <span className="text-[11px]" style={{ color: BRAND.muted }}>In stock</span>
              </div>
              <div className="mt-3 overflow-hidden rounded-[14px]"><img src={item.image} alt={item.title} className="h-40 w-full object-cover transition duration-500 group-hover:scale-[1.03]" /></div>
              <div className="mt-4 text-[15px] font-bold" style={{ color: BRAND.ink }}>{item.title}</div>
              <div className="mt-1 text-[12px]" style={{ color: BRAND.muted }}>{item.price}</div>
              <div className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold" style={{ color: BRAND.primary }}>View details <ChevronRight className="h-4 w-4" /></div>
            </button>
          ))}
        </div>
      </Shell></section>

      <section className="py-6"><Shell><div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="overflow-hidden rounded-[20px] border bg-white shadow-[0_12px_28px_rgba(0,0,0,0.03)]" style={{ borderColor: BRAND.line }}>
          <div className="grid gap-0 md:grid-cols-[0.95fr_1.05fr]">
            <div className="p-6">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Why this feels more complete</div>
              <div className="mt-3 max-w-[380px] text-[30px] font-black leading-[1.04] tracking-[-0.04em]" style={{ color: BRAND.ink }}>Broader structure, denser sections and more reference-like navigation.</div>
              <p className="mt-3 max-w-[380px] text-[12px] leading-6" style={{ color: BRAND.muted }}>The homepage now carries more of the visual density from the examples: category strips, trust cards, featured collections, product rows, reviews and FAQ.</p>
              <div className="mt-5 grid gap-2">
                {["Featured collections", "Trust badges", "Reviews and FAQ", "Quote and cart flow"].map((x) => (
                  <div key={x} className="flex items-center gap-2 text-[12px]" style={{ color: BRAND.muted }}><Check className="h-4 w-4" style={{ color: BRAND.primary }} />{x}</div>
                ))}
              </div>
            </div>
            <img src="/atlantis-images/hero-slide-2.svg" alt="Showcase" className="h-full min-h-[300px] w-full object-cover" />
          </div>
        </div>

        <div className="grid gap-4">
          {testimonials.map((item) => (
            <div key={item.name} className="rounded-[22px] border bg-white p-5 shadow-[0_14px_30px_rgba(0,0,0,0.038)]" style={{ borderColor: BRAND.line }}>
              <div className="flex gap-1" style={{ color: BRAND.primary }}>{Array.from({length:5}).map((_,i)=><Star key={i} className="h-4 w-4 fill-current" />)}</div>
              <p className="mt-3 text-[13px] leading-6" style={{ color: BRAND.ink }}>“{item.quote}”</p>
              <div className="mt-3 text-[12px] font-bold" style={{ color: BRAND.ink }}>{item.name}</div>
              <div className="text-[11px]" style={{ color: BRAND.muted }}>{item.company}</div>
            </div>
          ))}
        </div>
      </div></Shell></section>

      <section className="py-6"><Shell><div className="grid gap-4 md:grid-cols-3">
        {[
          ["Choose your product", "Browse cards, flyers, posters, labels and more."],
          ["Upload artwork or request help", "Use artwork later or move through a bespoke quote flow."],
          ["Approve and receive delivery", "Keep the customer journey simple and clear."],
        ].map(([title, text], i) => (
          <div key={title} className="rounded-[22px] border bg-white p-5 shadow-[0_14px_30px_rgba(0,0,0,0.038)]" style={{ borderColor: BRAND.line }}>
            <div className="grid h-8 w-8 place-items-center rounded-full text-[12px] font-bold text-white" style={{ backgroundColor: BRAND.primary }}>{i + 1}</div>
            <div className="mt-4 text-[16px] font-bold" style={{ color: BRAND.ink }}>{title}</div>
            <p className="mt-2 text-[12px] leading-6" style={{ color: BRAND.muted }}>{text}</p>
          </div>
        ))}
      </div></Shell></section>

      <section className="py-6"><Shell>
        <SectionHeading eyebrow="Pricing options" title="Simple starter pricing blocks" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {pricingGrid.map((item) => (
            <div key={item.qty} className="rounded-[18px] border bg-white p-5 text-center shadow-[0_10px_24px_rgba(0,0,0,0.03)]" style={{ borderColor: BRAND.line }}>
              <div className="text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: BRAND.muted }}>{item.qty}</div>
              <div className="mt-3 text-[30px] font-black tracking-[-0.045em]" style={{ color: BRAND.ink }}>{item.price}</div>
              <div className="mt-2 text-[12px]" style={{ color: BRAND.muted }}>Base visual pricing block</div>
            </div>
          ))}
        </div>
      </Shell></section>

      <section className="py-6"><Shell>
        <div className="rounded-[22px] border bg-white p-5 shadow-[0_14px_30px_rgba(0,0,0,0.038)]" style={{ borderColor: BRAND.line }}>
          <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Delivery estimator</div>
              <div className="mt-2 text-[24px] font-black tracking-[-0.03em]" style={{ color: BRAND.ink }}>Estimate dispatch and delivery</div>
              <p className="mt-2 text-[12px] leading-6" style={{ color: BRAND.muted }}>A more complete ecommerce storefront often includes delivery expectation or postcode-based guidance.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input className="h-11 rounded-xl border text-[12px]" placeholder="Enter postcode" style={{ borderColor: BRAND.line }} />
              <PrimaryButton className="justify-center">Check delivery</PrimaryButton>
            </div>
          </div>
        </div>
      </Shell></section>

      <section className="py-6"><Shell>
        <div className="rounded-[22px] border p-6 shadow-[0_14px_30px_rgba(0,0,0,0.038)]" style={{ borderColor: BRAND.line, backgroundColor: BRAND.panel }}>
          <SectionHeading eyebrow="Frequently asked questions" title="Common questions before customers order" compact />
          <div className="grid gap-3">
            {faqItems.map(([q, a]) => (
              <div key={q} className="rounded-[14px] border bg-[#FBFBFB] p-4" style={{ borderColor: BRAND.line }}>
                <div className="text-[13px] font-bold" style={{ color: BRAND.ink }}>{q}</div>
                <p className="mt-2 text-[12px] leading-6" style={{ color: BRAND.muted }}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </Shell></section>

      <section className="py-4"><Shell>
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ["Artwork check included","Optional preflight before production"],
            ["Business account ready","Suitable for repeat teams and larger orders"],
            ["Custom quote route","For complex print jobs and specialist materials"],
            ["Clearer storefront UX","Cleaner spacing and stronger ecommerce density"],
          ].map(([title, text]) => (
            <div key={title} className="rounded-[20px] border bg-white p-4 shadow-[0_12px_28px_rgba(0,0,0,0.03)]" style={{ borderColor: BRAND.line }}>
              <div className="text-[13px] font-bold" style={{ color: BRAND.ink }}>{title}</div>
              <div className="mt-2 text-[11px] leading-6" style={{ color: BRAND.muted }}>{text}</div>
            </div>
          ))}
        </div>
      </Shell></section>

      <section className="py-3"><Shell>
        <div className="rounded-[20px] border bg-white px-5 py-4 shadow-[0_12px_28px_rgba(0,0,0,0.03)]" style={{ borderColor: BRAND.line }}>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ["Most popular for brand launches", "Cards, flyers and posters grouped for quick decision-making."],
              ["Useful for hospitality and events", "Menus, handouts, signage and branded print in one storefront."],
              ["Designed to scale later", "Replace placeholders with real images and connect live data when ready."],
            ].map(([title, text]) => (
              <div key={title} className="rounded-[16px] border bg-[#FBFBFB] px-4 py-4" style={{ borderColor: BRAND.line }}>
                <div className="text-[12px] font-bold" style={{ color: BRAND.ink }}>{title}</div>
                <div className="mt-2 text-[11px] leading-6" style={{ color: BRAND.muted }}>{text}</div>
              </div>
            ))}
          </div>
        </div>
      </Shell></section>

      <section className="py-4"><Shell>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[22px] border bg-white p-5 shadow-[0_12px_28px_rgba(0,0,0,0.03)]" style={{ borderColor: BRAND.line }}>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Business support</div>
            <div className="mt-2 text-[24px] font-black tracking-[-0.04em]" style={{ color: BRAND.ink }}>Need regular ordering or repeat business pricing?</div>
            <p className="mt-3 text-[12px] leading-6" style={{ color: BRAND.muted }}>
              Add an account-management or repeat-order flow later through your admin dashboard for larger teams and repeat customers.
            </p>
          </div>
          <div className="rounded-[22px] border bg-white p-5 shadow-[0_12px_28px_rgba(0,0,0,0.03)]" style={{ borderColor: BRAND.line }}>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Quote support</div>
            <div className="mt-2 text-[24px] font-black tracking-[-0.04em]" style={{ color: BRAND.ink }}>Custom materials, finishes and production advice.</div>
            <p className="mt-3 text-[12px] leading-6" style={{ color: BRAND.muted }}>
              Keep this area as a bridge between standard ecommerce ordering and bespoke project support.
            </p>
          </div>
        </div>
      </Shell></section>

      <section className="py-6"><Shell>
        <div className="rounded-[22px] border p-6 shadow-[0_14px_30px_rgba(0,0,0,0.04)]" style={{ borderColor: BRAND.line, background: "linear-gradient(135deg, #FFFFFF 0%, #F7FBFC 100%)" }}>
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Ready to connect your backend later</div>
              <div className="mt-2 text-[32px] font-black tracking-[-0.045em]" style={{ color: BRAND.ink }}>Present a polished storefront now and grow into a full commerce flow.</div>
              <p className="mt-3 max-w-[720px] text-[12px] leading-7" style={{ color: BRAND.muted }}>
                Use this theme for the client demo now, then connect catalog data, artwork upload, stock control, orders and bespoke quote workflows through your admin dashboard.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <PrimaryButton onClick={() => navigate("/all-products")}>Browse catalog</PrimaryButton>
              <SecondaryButton onClick={() => navigate("/bespoke-quote")}>Talk bespoke print</SecondaryButton>
            </div>
          </div>
        </div>
      </Shell></section>
    </div>
  );
}


function ProductAccordion({ title, defaultOpen = false, children }) {
  return (
    <details open={defaultOpen} className="group rounded-[14px] border bg-white shadow-[0_6px_16px_rgba(0,0,0,0.015)]" style={{ borderColor: BRAND.line }}>
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[13px] font-bold" style={{ color: BRAND.ink }}>
        {title}
        <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
      </summary>
      <div className="border-t px-4 py-4" style={{ borderColor: BRAND.line }}>
        {children}
      </div>
    </details>
  );
}


function ProductPage({ type, cart, liveProducts = [] }) {
  const slugToKey = {
    businessCards: "standard-business-cards",
    flyers: "a5-flyers",
    posters: "mailer-boxes",
  };
  const liveProduct = liveProducts.find((item) => item.slug === slugToKey[type]);
  const product = liveProduct
    ? {
        ...catalog[type],
        name: liveProduct.title,
        description: liveProduct.subtitle || catalog[type].description,
        basePrice: liveProduct.priceFromMinor ? liveProduct.priceFromMinor / 100 : catalog[type].basePrice,
        badge: liveProduct.productType === "QUOTE_LED" ? "Quote product" : catalog[type].badge,
      }
    : catalog[type];
  const page = productPageContent[type];
  const [selectedImage, setSelectedImage] = useState(0);

  const initialSelected = {};
  page.optionGroups.forEach((group) => {
    const recommended = group.options.find((opt) => opt.recommended);
    initialSelected[group.key] = recommended ? recommended.value : group.options[0].value;
  });

  const [selected, setSelected] = useState(initialSelected);
  const [selectedQty, setSelectedQty] = useState(page.quantities.find((q) => q.recommended)?.qty || page.quantities[0].qty);
  const [selectedDelivery, setSelectedDelivery] = useState(0);

  const currentPrice = page.quantities.find((q) => q.qty === selectedQty)?.price ?? product.basePrice;

  return (
    <section className="py-6">
      <Shell narrow>
        <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: BRAND.muted }}>
          <button onClick={() => window.history.back?.()} className="font-semibold">Home</button>
          <span>/</span>
          <button className="font-semibold">{product.name}</button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {page.tabs.map((tab) => (
            <button key={tab} className="rounded-full border bg-white px-4 py-2 text-[12px] font-semibold shadow-[0_6px_14px_rgba(0,0,0,0.02)]" style={{ borderColor: BRAND.line, color: BRAND.muted }}>
              {tab}
            </button>
          ))}
        </div>

        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-[40px] font-black tracking-[-0.045em]" style={{ color: BRAND.ink }}>{product.name}</h1>
            <p className="mt-2 max-w-[760px] text-[12px] leading-6" style={{ color: BRAND.muted }}>
              Configure format, stock, finishing and quantity with a more commercial product-page structure inspired by your reference screenshots.
            </p>
          </div>
          <div className="hidden items-center gap-3 rounded-[18px] border bg-white px-4 py-3 shadow-[0_10px_24px_rgba(0,0,0,0.03)] lg:flex" style={{ borderColor: BRAND.line }}>
            <div className="flex -space-x-2">
              {["A", "K", "S"].map((x, i) => (
                <div key={x} className="grid h-9 w-9 place-items-center rounded-full border-2 text-[12px] font-bold text-white" style={{ borderColor: "white", backgroundColor: i === 0 ? BRAND.primary : i === 1 ? "#1F2937" : "#94A3B8" }}>
                  {x}
                </div>
              ))}
            </div>
            <div>
              <div className="text-[13px] font-bold" style={{ color: BRAND.ink }}>Do you need help?</div>
              <div className="text-[12px] font-semibold" style={{ color: BRAND.primary }}>Chat with us</div>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.02fr_1fr]">
          <div>
            <div className="overflow-hidden rounded-[22px] border bg-[#F5F6F7] shadow-[0_14px_28px_rgba(0,0,0,0.03)]" style={{ borderColor: BRAND.line }}>
              <div className="relative">
                <img src={product.images[selectedImage]} alt={product.name} className="h-[560px] w-full object-cover" />
                <button className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[20px] shadow-[0_10px_24px_rgba(0,0,0,0.08)]" style={{ color: BRAND.ink }}>
                  ‹
                </button>
                <button className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[20px] shadow-[0_10px_24px_rgba(0,0,0,0.08)]" style={{ color: BRAND.ink }}>
                  ›
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {product.images.concat(product.images[0]).slice(0, 6).map((img, i) => (
                <button
                  key={`${img}-${i}`}
                  onClick={() => setSelectedImage(i % product.images.length)}
                  className="overflow-hidden rounded-[14px] border bg-white"
                  style={{ borderColor: selectedImage === i % product.images.length ? BRAND.primary : BRAND.line }}
                >
                  <img src={img} alt="" className="h-[70px] w-[70px] object-cover" />
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              <ProductAccordion title="Description" defaultOpen>
                <p className="text-[13px] leading-7" style={{ color: BRAND.ink }}>{page.description}</p>
                <div className="mt-5 space-y-3">
                  {page.bullets.map((item, i) => (
                    <div key={item} className="flex items-start gap-3 text-[12px]" style={{ color: BRAND.muted }}>
                      <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-full border" style={{ borderColor: i === 1 || i === 2 ? BRAND.line : BRAND.primary, color: i === 1 || i === 2 ? BRAND.muted : BRAND.primary }}>
                        {i === 1 || i === 2 ? "−" : "＋"}
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </ProductAccordion>

              <ProductAccordion title="Product specifications">
                <div className="overflow-hidden rounded-[12px] border" style={{ borderColor: BRAND.line }}>
                  {page.specs.map(([label, value], i) => (
                    <div key={label} className={`grid grid-cols-[170px_1fr] gap-4 px-4 py-3 text-[12px] ${i % 2 === 0 ? "bg-[#F7F8F9]" : "bg-white"}`}>
                      <div style={{ color: BRAND.ink, fontWeight: 700 }}>{label}</div>
                      <div style={{ color: BRAND.muted }}>{value}</div>
                    </div>
                  ))}
                </div>
              </ProductAccordion>

              <ProductAccordion title="Design guidelines">
                <div className="space-y-3 text-[12px]">
                  {page.guidelines.map((item) => (
                    <div key={item} className="font-medium underline" style={{ color: BRAND.primary }}>{item}</div>
                  ))}
                </div>
              </ProductAccordion>

              <ProductAccordion title="Frequently asked questions">
                <div className="space-y-3 text-[12px]">
                  {page.faqs.map((item) => (
                    <div key={item} className="font-medium underline" style={{ color: BRAND.primary }}>{item}</div>
                  ))}
                </div>
              </ProductAccordion>

              <ProductAccordion title="Ordering process">
                <div className="space-y-3 text-[12px]">
                  {page.orderLinks.map((item) => (
                    <div key={item} className="font-medium underline" style={{ color: BRAND.primary }}>{item}</div>
                  ))}
                </div>
              </ProductAccordion>
            </div>
          </div>

          <div className="space-y-5">
            {page.optionGroups.map((group) => (
              <div key={group.key}>
                <div className="mb-3 flex items-center gap-2 text-[18px] font-black tracking-[-0.03em]" style={{ color: BRAND.ink }}>
                  <span className="text-[15px] font-semibold tracking-normal" style={{ color: BRAND.ink }}>{group.label}:</span>
                  <span className="text-[15px] font-semibold tracking-normal" style={{ color: BRAND.primary }}>
                    {selected[group.key] || group.valueLabel}
                  </span>
                </div>

                {group.style === "tile" ? (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {group.options.map((option) => {
                      const active = selected[group.key] === option.value;
                      return (
                        <button
                          key={option.value}
                          onClick={() => setSelected((prev) => ({ ...prev, [group.key]: option.value }))}
                          className="relative rounded-[14px] border bg-white p-4 text-center shadow-[0_8px_18px_rgba(0,0,0,0.02)]"
                          style={{
                            borderColor: active ? BRAND.primary : BRAND.line,
                            boxShadow: active ? "inset 0 0 0 1px rgb(24, 167, 208)" : "none",
                            opacity: option.muted ? 0.72 : 1,
                          }}
                        >
                          <div className="mx-auto mb-4 h-[68px] w-[92px] rounded-[10px] bg-[linear-gradient(135deg,#f7f7f7,#eceff1)]" />
                          <div className="text-[13px] font-bold leading-5" style={{ color: BRAND.ink }}>{option.value}</div>
                          {option.sublabel && <div className="mt-1 text-[12px]" style={{ color: BRAND.muted }}>{option.sublabel}</div>}
                          {option.recommended && (
                            <div className="absolute inset-x-0 bottom-0 rounded-b-[12px] py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white" style={{ backgroundColor: BRAND.primary }}>
                              Recommended
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {group.options.map((option) => {
                      const active = selected[group.key] === option.value;
                      return (
                        <button
                          key={option.value}
                          onClick={() => setSelected((prev) => ({ ...prev, [group.key]: option.value }))}
                          className="relative rounded-[10px] border bg-white px-4 py-3 text-[13px] font-semibold"
                          style={{
                            borderColor: active ? BRAND.primary : BRAND.line,
                            color: active ? BRAND.ink : BRAND.ink,
                            boxShadow: active ? "inset 0 0 0 1px rgb(24, 167, 208)" : "none",
                          }}
                        >
                          {option.value}
                          {option.recommended && (
                            <span className="ml-2 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-white" style={{ backgroundColor: BRAND.primary }}>
                              Recommended
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            <div>
              <div className="mb-3 flex items-center gap-2 text-[14px] font-semibold" style={{ color: BRAND.ink }}>
                <span>Print run:</span>
                <span style={{ color: BRAND.primary }}>{selectedQty}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {page.quantities.map((row) => (
                  <button
                    key={row.qty}
                    onClick={() => setSelectedQty(row.qty)}
                    className="relative rounded-[12px] border bg-white px-4 py-4 text-left shadow-[0_6px_16px_rgba(0,0,0,0.02)]"
                    style={{
                      borderColor: selectedQty === row.qty ? BRAND.primary : BRAND.line,
                      boxShadow: selectedQty === row.qty ? "inset 0 0 0 1px rgb(24, 167, 208)" : "none",
                    }}
                  >
                    {row.recommended && (
                      <div className="absolute left-0 top-0 rounded-br-[10px] rounded-tl-[10px] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white" style={{ backgroundColor: BRAND.primary }}>
                        Recommended
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[14px] font-semibold" style={{ color: BRAND.ink }}>{row.qty.toLocaleString()}</span>
                      <span className="text-[16px] font-black" style={{ color: BRAND.ink }}>{currency(row.price)}</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-3 text-right text-[12px] font-semibold underline" style={{ color: BRAND.primary }}>
                Show all quantities
              </div>
            </div>

            <div>
              <div className="mb-3 text-[14px] font-semibold" style={{ color: BRAND.ink }}>Estimated delivery date</div>
              <div className="space-y-3">
                {page.deliveryOptions.map((item, idx) => (
                  <button
                    key={item.day}
                    onClick={() => setSelectedDelivery(idx)}
                    className="w-full rounded-[12px] border bg-white px-4 py-4 text-left shadow-[0_6px_16px_rgba(0,0,0,0.02)]"
                    style={{
                      borderColor: selectedDelivery == idx ? BRAND.primary : BRAND.line,
                      boxShadow: selectedDelivery == idx ? "inset 0 0 0 1px rgb(24, 167, 208)" : "none",
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[15px] font-bold" style={{ color: BRAND.ink }}>{item.day}</div>
                        <div className="mt-1 text-[12px]" style={{ color: BRAND.muted }}>{item.latest}</div>
                      </div>
                      {item.addon && <div className="text-[14px] font-bold" style={{ color: BRAND.ink }}>{item.addon}</div>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[20px] border bg-white p-5 shadow-[0_16px_34px_rgba(0,0,0,0.04)]" style={{ borderColor: BRAND.line }}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: BRAND.primary }}>Selected price</div>
                  <div className="mt-2 text-[40px] font-black tracking-[-0.04em]" style={{ color: BRAND.ink }}>{currency(currentPrice)}</div><div className="mt-1 text-[11px]" style={{ color: BRAND.muted }}>Ex VAT visual placeholder pricing</div>
                </div>
                <div className="text-right text-[12px]" style={{ color: BRAND.muted }}>
                  <div>Standard delivery</div>
                  <div className="font-semibold" style={{ color: BRAND.ink }}>{page.deliveryOptions[selectedDelivery].day}</div>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <PrimaryButton className="justify-center" onClick={() => cart.addItem({ name: product.name, config: { ...selected, quantity: selectedQty }, price: currentPrice })}>
                  Add to cart
                </PrimaryButton>
                <SecondaryButton className="justify-center">Browse design templates</SecondaryButton>
              </div>
              <div className="mt-4 grid gap-2 text-[12px]" style={{ color: BRAND.muted }}><div className="mb-2 flex flex-wrap gap-2">{["Secure checkout later","Artwork support","Bespoke quote route"].map((x) => <span key={x} className="rounded-full border bg-[#F8FBFC] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ borderColor: BRAND.line, color: BRAND.primary }}>{x}</span>)}</div>
                <div className="flex items-center gap-2"><Check className="h-4 w-4" style={{ color: BRAND.primary }} /> Artwork check included before print</div>
                <div className="flex items-center gap-2"><Check className="h-4 w-4" style={{ color: BRAND.primary }} /> Custom sizes and specialist materials via bespoke quote</div>
                <div className="flex items-center gap-2"><Check className="h-4 w-4" style={{ color: BRAND.primary }} /> Production advice available from support</div>
              </div>
            </div>
          </div>
        </div>
      </Shell>
    </section>
  );
}

function BookletsPage({ navigate }) {
  return (
    <section className="py-6">
      <Shell narrow>
        <div className="rounded-[22px] border p-6 shadow-[0_14px_30px_rgba(0,0,0,0.038)]" style={{ borderColor: BRAND.line, backgroundColor: BRAND.panel }}>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Booklet printing</div>
          <h1 className="mt-2 text-[34px] font-black tracking-[-0.04em]" style={{ color: BRAND.ink }}>Booklets with a cleaner, more editorial storefront layout</h1>
          <p className="mt-3 max-w-[660px] text-[12px] leading-6" style={{ color: BRAND.muted }}>This page now reflects a fuller commerce structure with lighter cards, more compact typography and cleaner category presentation.</p>
          <div className="mt-5 flex gap-3">
            <PrimaryButton onClick={() => navigate("/all-products")}>Browse products</PrimaryButton>
            <SecondaryButton onClick={() => navigate("/bespoke-quote")}>Request quote</SecondaryButton>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {["Stapled Booklets", "Wiro Bound Booklets", "Perfect Bound Booklets", "Spot UV Booklets", "Notebooks", "Brochures"].map((title, i) => (
            <div key={title} className="rounded-[20px] border bg-white p-4 shadow-[0_12px_28px_rgba(0,0,0,0.035)]" style={{ borderColor: BRAND.line }}>
              <img src={heroSlides[i % heroSlides.length].image} alt={title} className="h-40 w-full rounded-[14px] object-cover" />
              <div className="mt-4 text-[16px] font-bold" style={{ color: BRAND.ink }}>{title}</div>
              <p className="mt-2 text-[12px] leading-6" style={{ color: BRAND.muted }}>Cleaner product card spacing and a more believable print-store presentation.</p>
            </div>
          ))}
        </div>
      </Shell>
    </section>
  );
}

function AllProductsPage({ navigate }) {
  return (
    <section className="py-6">
      <Shell narrow>
        <div className="grid gap-6 lg:grid-cols-[270px_1fr]">
          <div className="rounded-[20px] border bg-white p-4 shadow-[0_12px_28px_rgba(0,0,0,0.035)]" style={{ borderColor: BRAND.line }}>
            <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Search catalog</div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: BRAND.muted }} />
              <Input className="h-10 rounded-xl border pl-10 text-[12px]" placeholder="Search products..." style={{ borderColor: BRAND.line }} />
            </div>
            <div className="mt-4 grid gap-1">
              {["Business Cards", "Flyers", "Posters", "Booklets", "Labels", "Signage", "Packaging", "Stationery"].map((x) => (
                <button key={x} className="rounded-xl px-3 py-2 text-left text-[12px] font-medium hover:bg-[#F6F7F8]">{x}</button>
              ))}
            </div>
          </div>
          <div className="grid gap-5">
            {NAV_ITEMS.slice(0,7).map((group) => (
              <div key={group.label} className="rounded-[22px] border bg-white p-5 shadow-[0_14px_30px_rgba(0,0,0,0.038)]" style={{ borderColor: BRAND.line }}>
                <div className="text-[22px] font-black tracking-[-0.03em]" style={{ color: BRAND.ink }}>{group.label}</div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {group.columns.flatMap((c) => c.links).slice(0, 4).map(([label, path], i) => (
                    <button key={label} onClick={() => navigate(path)} className="group rounded-[16px] border p-3 text-left transition hover:-translate-y-[1px] hover:shadow-[0_14px_28px_rgba(0,0,0,0.055)]" style={{ borderColor: BRAND.line }}>
                      <img src={featuredProducts[i % featuredProducts.length].image} alt={label} className="h-24 w-full rounded-[10px] object-cover transition duration-500 group-hover:scale-[1.03]" />
                      <div className="mt-3 text-[13px] font-bold" style={{ color: BRAND.ink }}>{label}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Shell>
    </section>
  );
}

function BespokeQuotePage() {
  return (
    <section className="py-6">
      <Shell narrow>
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="rounded-[22px] border p-6 shadow-[0_14px_30px_rgba(0,0,0,0.038)]" style={{ borderColor: BRAND.line, backgroundColor: BRAND.panel }}>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Custom quote</div>
            <h1 className="mt-2 text-[34px] font-black tracking-[-0.04em]" style={{ color: BRAND.ink }}>Request a bespoke quote for custom print jobs</h1>
            <p className="mt-3 max-w-[620px] text-[12px] leading-6" style={{ color: BRAND.muted }}>This section now sits more naturally inside the storefront and better matches the professional, compact structure from your references.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Input placeholder="Full name" className="h-11 rounded-xl border text-[12px]" style={{ borderColor: BRAND.line }} />
              <Input placeholder="Company" className="h-11 rounded-xl border text-[12px]" style={{ borderColor: BRAND.line }} />
              <Input placeholder="Email" className="h-11 rounded-xl border text-[12px]" style={{ borderColor: BRAND.line }} />
              <Input placeholder="Phone" className="h-11 rounded-xl border text-[12px]" style={{ borderColor: BRAND.line }} />
              <Input placeholder="Project type" className="h-11 rounded-xl border text-[12px] sm:col-span-2" style={{ borderColor: BRAND.line }} />
              <Textarea placeholder="Tell us about quantity, sizes, material, deadline and finishing details." className="min-h-[170px] rounded-[14px] border text-[12px] sm:col-span-2" style={{ borderColor: BRAND.line }} />
              <PrimaryButton className="sm:col-span-2 justify-center">Get quote</PrimaryButton>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="rounded-[22px] border bg-white p-5 shadow-[0_14px_30px_rgba(0,0,0,0.038)]" style={{ borderColor: BRAND.line }}>
              <div className="text-[15px] font-bold" style={{ color: BRAND.ink }}>Ideal for</div>
              <div className="mt-4 grid gap-3">
                {["Custom sizes", "Special finishes", "Bulk orders", "Complex specifications"].map((x) => (
                  <div key={x} className="flex items-center gap-2 text-[12px]" style={{ color: BRAND.muted }}><Check className="h-4 w-4" style={{ color: BRAND.primary }} />{x}</div>
                ))}
              </div>
            </div>
            <div className="rounded-[22px] border bg-white p-5 shadow-[0_14px_30px_rgba(0,0,0,0.038)]" style={{ borderColor: BRAND.line }}>
              <div className="text-[15px] font-bold" style={{ color: BRAND.ink }}>Upload artwork later</div>
              <p className="mt-3 text-[12px] leading-6" style={{ color: BRAND.muted }}>You can also wire artwork upload into the order or approval flow later.</p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px]" style={{ borderColor: BRAND.line }}>
                <Upload className="h-4 w-4" />Artwork placeholder flow
              </div>
            </div>
          </div>
        </div>
      </Shell>
    </section>
  );
}

function CartPage({ cart, navigate }) {
  return (
    <section className="py-6">
      <Shell narrow>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Basket</div>
            <h1 className="mt-2 text-[34px] font-black tracking-[-0.04em]" style={{ color: BRAND.ink }}>Your cart</h1>
          </div>
          <SecondaryButton onClick={() => navigate("/all-products")}>Keep shopping</SecondaryButton>
        </div>
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-4">
            {cart.items.length === 0 ? (
              <div className="rounded-[18px] border bg-white p-6 text-[12px] shadow-[0_10px_24px_rgba(0,0,0,0.03)]" style={{ borderColor: BRAND.line, color: BRAND.muted }}>Your cart is empty.</div>
            ) : (
              cart.items.map((item) => (
                <div key={item.id} className="rounded-[20px] border bg-white p-4 shadow-[0_12px_28px_rgba(0,0,0,0.035)]" style={{ borderColor: BRAND.line }}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[15px] font-bold" style={{ color: BRAND.ink }}>{item.name}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Object.entries(item.config || {}).map(([k, v]) => (
                          <span key={k} className="rounded-full bg-[#F6F7F8] px-3 py-1 text-[10px] font-medium" style={{ color: BRAND.muted }}>{k}: {String(v)}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-[18px] font-black">{currency(item.price * item.qty)}</div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 rounded-full border px-2 py-1" style={{ borderColor: BRAND.line }}>
                      <button onClick={() => cart.updateQty(item.id, -1)}><Minus className="h-4 w-4" /></button>
                      <span className="w-5 text-center text-[12px] font-semibold">{item.qty}</span>
                      <button onClick={() => cart.updateQty(item.id, 1)}><Plus className="h-4 w-4" /></button>
                    </div>
                    <button onClick={() => cart.removeItem(item.id)} className="text-[11px] font-bold" style={{ color: "#C23636" }}>Remove</button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="rounded-[22px] border bg-white p-5 shadow-[0_14px_30px_rgba(0,0,0,0.038)]" style={{ borderColor: BRAND.line }}>
            <div className="text-[20px] font-black tracking-[-0.03em]" style={{ color: BRAND.ink }}>Order summary</div>
            <div className="mt-4 space-y-3 text-[12px]" style={{ color: BRAND.muted }}>
              <div className="flex justify-between"><span>Subtotal</span><span>{currency(cart.subtotal)}</span></div>
              <div className="flex justify-between"><span>Estimated VAT</span><span>{currency(cart.subtotal * 0.2)}</span></div>
            </div>
            <div className="mt-4 border-t pt-4" style={{ borderColor: BRAND.line }}>
              <div className="flex justify-between text-[15px] font-bold" style={{ color: BRAND.ink }}>
                <span>Total</span>
                <span>{currency(cart.subtotal)}</span>
              </div>
            </div>
            <PrimaryButton className="mt-5 w-full justify-center">Proceed</PrimaryButton>
          </div>
        </div>
      </Shell>
    </section>
  );
}

function Footer({ navigate }) {
  return (
    <footer className="mt-8 border-t bg-white" style={{ borderColor: BRAND.line }}>
      <div className="border-b py-3" style={{ borderColor: BRAND.line, backgroundColor: BRAND.primary }}>
        <Shell>
          <div className="flex flex-col items-center justify-between gap-3 text-[12px] font-semibold text-white md:flex-row">
            <span>Get the very best print solutions for your business, events and brand campaigns — with room to grow into a full admin-connected storefront.</span>
            <div className="flex gap-2">
              <Input className="h-9 w-[250px] rounded-full border-0 bg-white text-[12px] text-black" placeholder="Email address" />
              <button className="rounded-full bg-black px-4 text-[12px] font-bold text-white">Subscribe</button>
            </div>
          </div>
        </Shell>
      </div>
      <Shell>
        <div className="grid gap-3 py-5 md:grid-cols-4">
          {[["Business printing","20+"],["Event signage","12+"],["Labels & packaging","18+"],["Custom quote support","1:1"]].map(([item,count]) => (
            <div key={item} className="rounded-[18px] border px-4 py-3" style={{ borderColor: BRAND.line, color: BRAND.muted, background: "linear-gradient(180deg, #FFFFFF 0%, #F8FBFC 100%)" }}><div className="text-[10px] font-bold uppercase tracking-[0.14em]">{item}</div><div className="mt-1 text-[16px] font-black" style={{ color: BRAND.ink }}>{count}</div></div>
          ))}
        </div>
        <div className="grid gap-8 py-10 md:grid-cols-[1.25fr_0.8fr_0.8fr_0.8fr_0.8fr]">
          <div>
            <button onClick={() => navigate("/")} className="flex items-center gap-0.5">
              <span className="text-[50px] font-black tracking-[-0.055em]" style={{ color: BRAND.primary }}>HOLO</span>
              <span className="text-[50px] font-black tracking-[-0.055em]" style={{ color: BRAND.ink }}>PRINT</span>
            </button>
            <p className="mt-4 max-w-[360px] text-[12px] leading-7" style={{ color: BRAND.muted }}>A fuller ecommerce print storefront direction with broader navigation, denser sections and a cleaner visual tone.</p>
          </div>
          <FooterCol title="Products" items={[["Business Cards", "/standard-business-cards"], ["Flyers", "/flyers"], ["Posters", "/posters-large-format-prints"], ["Booklets", "/booklets"]]} navigate={navigate} />
          <FooterCol title="Categories" items={[["Labels", "/all-products"], ["Stationery", "/all-products"], ["Signage", "/all-products"], ["Packaging", "/all-products"]]} navigate={navigate} />
          <FooterCol title="Business" items={[["Bulk pricing", "/bespoke-quote"], ["Custom quotes", "/bespoke-quote"], ["Artwork advice", "/bespoke-quote"], ["Delivery support", "/all-products"]]} navigate={navigate} />
          <FooterCol title="Support" items={[["All products", "/all-products"], ["Cart", "/cart"], ["Contact", "/bespoke-quote"], ["Quote request", "/bespoke-quote"]]} navigate={navigate} />
        </div>
      </Shell>
    
        <Shell>
          <div className="border-t py-4 text-[11px] flex flex-col gap-2 md:flex-row md:items-center md:justify-between" style={{ borderColor: BRAND.line, color: BRAND.muted }}>
            <span>© 2026 HOLO PRINT. All rights reserved. Professional print storefront theme.</span>
            <div className="flex gap-4">
              <button onClick={() => navigate("/all-products")}>All products</button>
              <button onClick={() => navigate("/bespoke-quote")}>Custom quote</button>
              <button onClick={() => navigate("/cart")}>Cart</button>
            </div>
          </div>
        </Shell>
      </footer>
  );
}

function FooterCol({ title, items, navigate }) {
  return (
    <div>
      <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.16em]" style={{ color: BRAND.ink }}>{title}</div>
      <div className="grid gap-2">
        {items.map(([label, path]) => (
          <button key={label} onClick={() => navigate(path)} className="text-left text-[12px]" style={{ color: BRAND.muted }}>{label}</button>
        ))}
      </div>
    </div>
  );
}

function PrimaryButton({ children, className = "", ...props }) {
  return (
    <Button className={`inline-flex items-center rounded-full px-5 py-2.5 text-[12px] font-bold text-white shadow-[0_12px_26px_rgba(24,167,208,0.22)] transition hover:translate-y-[-1px] hover:shadow-[0_14px_26px_rgba(24,167,208,0.22)] ${className}`} style={{ backgroundColor: BRAND.primary }} {...props}>
      {children}
    </Button>
  );
}

function SecondaryButton({ children, className = "", ...props }) {
  return (
    <Button className={`inline-flex items-center rounded-full border px-5 py-2.5 text-[12px] font-bold transition hover:bg-[#F6F7F8] ${className}`} style={{ borderColor: BRAND.line, color: BRAND.ink, backgroundColor: "white" }} {...props}>
      {children}
    </Button>
  );
}

export default function App() {
  const { path, navigate } = usePathState();
  const cart = useCart();
    const [liveProducts, setLiveProducts] = useState([]);
  const [apiState, setApiState] = useState({ loading: true, message: "Connecting to live API..." });

  useEffect(() => {
    let active = true;

    async function loadLiveData() {
      try {
        const apiBase = getApiBaseUrl();

        const healthRes = await fetch(`${apiBase}/health`, { cache: "no-store" });
        const healthPayload = await healthRes.json().catch(() => null);

        if (!healthRes.ok || !healthPayload?.success) {
          if (active) {
            setApiState({ loading: false, message: "Storefront loaded, but external API health check failed." });
          }
          return;
        }

        if (active) {
          setApiState({ loading: true, message: "External API connected. Loading products..." });
        }

        const productsRes = await fetch(`${apiBase}/products?limit=12&page=1`, { cache: "no-store" });
        const productsPayload = await productsRes.json().catch(() => null);

        const rawProducts = productsPayload?.data?.items || productsPayload?.data || [];
        const normalizedProducts = Array.isArray(rawProducts)
          ? rawProducts
              .filter(Boolean)
              .map((product) => ({
                id: product.id,
                slug: product.slug,
                title: product.title || product.name,
                subtitle: product.subtitle || product.description || "",
                productType: product.productType || "STANDARD",
                priceFromMinor:
                  typeof product.priceFromMinor === "number"
                    ? product.priceFromMinor
                    : product.priceMapping?.basePriceMinor || null,
                currency: product.currency || "GBP",
              }))
              .filter((product) => product.slug && product.title)
          : [];

        if (active) {
          setLiveProducts(normalizedProducts);
          setApiState({
            loading: false,
            message: normalizedProducts.length
              ? "Connected to live external API data."
              : "External API connected. No live products returned yet.",
          });
        }
      } catch (error) {
        if (active) {
          setApiState({ loading: false, message: "Storefront loaded, but external API is not reachable yet." });
        }
      }
    }

    loadLiveData();
    return () => {
      active = false;
    };
  }, []);

  const featuredProductsData = liveProducts.length ? liveProducts.slice(0, 4).map(mapLiveProduct) : featuredProducts;

  let page;
  switch (path) {
    case "/category/business-cards":
      page = <CategoryPage kind="businessCards" navigate={navigate} />;
      break;
    case "/standard-business-cards":
      page = <ProductPage type="businessCards" cart={cart} liveProducts={liveProducts} />;
      break;
    case "/category/flyers":
      page = <CategoryPage kind="flyers" navigate={navigate} />;
      break;
    case "/flyers":
      page = <ProductPage type="flyers" cart={cart} liveProducts={liveProducts} />;
      break;
    case "/category/posters":
      page = <CategoryPage kind="posters" navigate={navigate} />;
      break;
    case "/posters-large-format-prints":
      page = <ProductPage type="posters" cart={cart} liveProducts={liveProducts} />;
      break;
    case "/category/booklets":
      page = <CategoryPage kind="booklets" navigate={navigate} />;
      break;
    case "/booklets":
      page = <BookletsPage navigate={navigate} />;
      break;
    case "/all-products":
      page = <AllProductsPage navigate={navigate} />;
      break;
    case "/bespoke-quote":
      page = <BespokeQuotePage />;
      break;
    case "/cart":
      page = <CartPage cart={cart} navigate={navigate} />;
      break;
    default:
      page = <HomePage navigate={navigate} featuredProducts={featuredProductsData} tenantName={"Atlantis Print"} />;
  }

  return (
    <div style={{ backgroundColor: BRAND.bg, color: BRAND.ink }}>
      <div className="border-b px-4 py-2 text-center text-[11px]" style={{ borderColor: BRAND.line, backgroundColor: "#F7FBFC", color: BRAND.muted }}>
        <span className="font-semibold" style={{ color: BRAND.ink }}>
          {"Atlantis Print"}
        </span>
        {" · "}
        {apiState.message}
      </div>
      <UtilityBar />
      <Header navigate={navigate} currentPath={path} cartCount={cart.items.length} cartSubtotal={cart.subtotal} />
      {page}
      <Footer navigate={navigate} />
    </div>
  );
}
