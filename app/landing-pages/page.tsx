'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { Copy, Eye, Globe2, LayoutPanelTop, Plus, Save, Sparkles, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';

type LandingStatus = 'draft' | 'published' | 'archived';

type CustomerLandingPage = {
  id: string;
  title: string;
  slug: string;
  status: LandingStatus;
  pageType: string;
  tenantDisplayName: string;
  brandColor: string;
  heroKicker: string;
  heroHeadline: string;
  heroSubheading: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  secondaryCtaLabel: string;
  secondaryCtaUrl: string;
  productCategoriesText: string;
  featureCardsText: string;
  workflowStepsText: string;
  trustBadgesText: string;
  industriesText: string;
  faqText: string;
  seoTitle: string;
  seoDescription: string;
  updatedAt?: string;
};

type Template = {
  label: string;
  description: string;
  values: Omit<CustomerLandingPage, 'id' | 'updatedAt'>;
};

const CONFIG_KEY = 'content-customer-landing-pages';
const statuses: LandingStatus[] = ['draft', 'published', 'archived'];
const pageTypes = ['customer-homepage', 'b2b-partner-portal', 'local-service-page', 'product-campaign', 'large-format-page', 'wedding-stationery-page'];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 90);
}

function cleanText(value: unknown, fallback = '') {
  return String(value ?? fallback).trim();
}

function safeStatus(value: unknown): LandingStatus {
  const candidate = cleanText(value, 'draft').toLowerCase();
  return candidate === 'published' || candidate === 'archived' ? candidate : 'draft';
}

function lines(value: string) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function pairs(value: string) {
  return lines(value).map((line) => {
    const [title, ...bodyParts] = line.split(/\s+[-–—]\s+/);
    return { title: title.trim(), body: bodyParts.join(' — ').trim() };
  });
}

function uniqueSlug(base: string, items: CustomerLandingPage[]) {
  const root = slugify(base) || 'landing-page';
  let next = root;
  let i = 2;
  while (items.some((item) => item.slug === next)) {
    next = `${root}-${i}`;
    i += 1;
  }
  return next;
}

const templates: Template[] = [
  {
    label: 'Print shop customer homepage',
    description: 'Best for a normal print shop storefront landing page.',
    values: {
      title: 'Online Print Ordering',
      slug: 'online-print-ordering',
      status: 'draft',
      pageType: 'customer-homepage',
      tenantDisplayName: 'Your Print Shop',
      brandColor: '#18a7d0',
      heroKicker: 'Online print ordering',
      heroHeadline: 'Order print online with instant pricing and artwork upload.',
      heroSubheading: 'Give customers a clean landing page where they can choose products, upload artwork, request quotes and collect or receive delivery.',
      primaryCtaLabel: 'Start an order',
      primaryCtaUrl: '/products',
      secondaryCtaLabel: 'Request a quote',
      secondaryCtaUrl: '/quote',
      productCategoriesText: 'Business Cards\nFlyers & Leaflets\nPosters\nBanners & Signage\nStickers & Labels\nBooklets',
      featureCardsText: 'Instant pricing — Customers choose size, material, finishing and turnaround before checkout.\nArtwork upload — Collect print-ready files, notes and proof approval in one flow.\nStorefront ready — Use this page as the homepage for a customer, branch, campaign or private portal.',
      workflowStepsText: 'Choose product\nConfigure options\nUpload artwork\nApprove proof\nCollect or receive delivery',
      trustBadgesText: 'Same-day options\nSecure checkout\nArtwork checked before print\nLocal collection available',
      industriesText: 'Local businesses\nEvents & exhibitions\nRestaurants & takeaways\nSchools & charities\nWedding suppliers',
      faqText: 'Can I upload artwork later? — Yes, customers can order first and upload artwork during checkout or after order approval.\nDo you check artwork? — Yes, artwork can be reviewed before production.\nCan customers collect locally? — Yes, collection, delivery and custom handover messages can be configured.',
      seoTitle: 'Online Print Ordering | Customer Landing Page',
      seoDescription: 'Order print online with instant pricing, artwork upload, proof approval, local collection and delivery.',
    },
  },
  {
    label: 'B2B partner portal',
    description: 'For private portals and repeat business clients.',
    values: {
      title: 'Business Print Portal',
      slug: 'business-print-portal',
      status: 'draft',
      pageType: 'b2b-partner-portal',
      tenantDisplayName: 'Your Print Shop',
      brandColor: '#4b0b78',
      heroKicker: 'Private business portal',
      heroHeadline: 'A branded print portal for repeat business customers.',
      heroSubheading: 'Create a landing page for companies that need controlled products, agreed pricing, fast reorders and a clear approval flow.',
      primaryCtaLabel: 'Open portal',
      primaryCtaUrl: '/login',
      secondaryCtaLabel: 'Speak to sales',
      secondaryCtaUrl: '/contact',
      productCategoriesText: 'Stationery Packs\nBusiness Cards\nStaff Handbooks\nTraining Materials\nEvent Print\nMarketing Packs',
      featureCardsText: 'Private catalogues — Show the products, pricing and templates that belong to one client.\nRepeat ordering — Make reorders easy for branches, teams and departments.\nApproval friendly — Use proofing, job statuses and internal notes to control the print journey.',
      workflowStepsText: 'Login to portal\nPick approved item\nUpload or personalise\nManager approval\nProduction and dispatch',
      trustBadgesText: 'Private access\nApproved catalogue\nRepeat ordering\nProduction tracking',
      industriesText: 'Franchises\nEstate agents\nSchools\nCharities\nCorporate teams\nEvent organisers',
      faqText: 'Can this be private? — Yes, the page can introduce a customer portal and send users to login.\nCan pricing be customer-specific? — This page is ready for customer-specific catalogue and pricing rules.\nCan staff reorder? — Yes, it can be used as the entry point for repeat ordering.',
      seoTitle: 'Business Print Portal | Private B2B Print Ordering',
      seoDescription: 'Private B2B print portal landing page for repeat ordering, customer catalogues and production tracking.',
    },
  },
  {
    label: 'Large format and signage',
    description: 'For banners, boards, posters, vinyl and signage leads.',
    values: {
      title: 'Large Format Printing',
      slug: 'large-format-printing',
      status: 'draft',
      pageType: 'large-format-page',
      tenantDisplayName: 'Your Print Shop',
      brandColor: '#0f766e',
      heroKicker: 'Large format print',
      heroHeadline: 'Order banners, posters, boards and signage from one page.',
      heroSubheading: 'Turn large format enquiries into structured orders with product choices, artwork upload, delivery notes and quote requests.',
      primaryCtaLabel: 'Get signage quote',
      primaryCtaUrl: '/quote',
      secondaryCtaLabel: 'View products',
      secondaryCtaUrl: '/products/large-format',
      productCategoriesText: 'PVC Banners\nFoamex Boards\nPosters\nWindow Vinyl\nRoller Banners\nShop Signs',
      featureCardsText: 'Quote-led products — Capture measurements, materials, fitting notes and deadlines.\nArtwork ready — Let customers upload large files and production notes.\nLocal fulfilment — Promote collection, delivery and installation options.',
      workflowStepsText: 'Choose signage type\nSend size and material\nUpload artwork\nConfirm proof\nCollect, deliver or install',
      trustBadgesText: 'Outdoor materials\nLarge file upload\nQuote-led workflow\nLocal delivery',
      industriesText: 'Retail shops\nRestaurants\nGyms\nEvents\nBuilders\nEstate agents',
      faqText: 'Can customers request custom sizes? — Yes, this page is designed for quote-led large format products.\nCan installation be handled? — Add fitting or delivery notes to the call-to-action flow.\nCan artwork be checked? — Yes, use preflight and proofing before production.',
      seoTitle: 'Large Format Printing | Banners, Boards and Signage',
      seoDescription: 'Large format print landing page for banners, posters, boards, vinyl, signage quotes and artwork upload.',
    },
  },
];

function normalisePage(row: Record<string, unknown>, index: number): CustomerLandingPage {
  const title = cleanText(row.title || row.name, `Landing page ${index + 1}`);
  return {
    id: cleanText(row.id, `landing-${index + 1}`),
    title,
    slug: slugify(cleanText(row.slug || row.friendlyUrl || title, `landing-page-${index + 1}`)) || `landing-page-${index + 1}`,
    status: safeStatus(row.status),
    pageType: cleanText(row.pageType, 'customer-homepage'),
    tenantDisplayName: cleanText(row.tenantDisplayName || row.businessName, 'Your Print Shop'),
    brandColor: cleanText(row.brandColor, '#18a7d0'),
    heroKicker: cleanText(row.heroKicker, 'Online print ordering'),
    heroHeadline: cleanText(row.heroHeadline, 'Order print online with instant pricing and artwork upload.'),
    heroSubheading: cleanText(row.heroSubheading, 'A landing page for online ordering, artwork upload, proofing and local print fulfilment.'),
    primaryCtaLabel: cleanText(row.primaryCtaLabel, 'Start an order'),
    primaryCtaUrl: cleanText(row.primaryCtaUrl, '/products'),
    secondaryCtaLabel: cleanText(row.secondaryCtaLabel, 'Request a quote'),
    secondaryCtaUrl: cleanText(row.secondaryCtaUrl, '/quote'),
    productCategoriesText: cleanText(row.productCategoriesText, 'Business Cards\nFlyers & Leaflets\nBooklets\nBanners & Signage'),
    featureCardsText: cleanText(row.featureCardsText, 'Instant pricing — Let customers configure print online.\nArtwork upload — Collect files and print notes.\nLocal fulfilment — Promote collection and delivery.'),
    workflowStepsText: cleanText(row.workflowStepsText, 'Choose product\nConfigure options\nUpload artwork\nApprove proof\nCollect or receive delivery'),
    trustBadgesText: cleanText(row.trustBadgesText, 'Same-day options\nSecure checkout\nArtwork checked before print'),
    industriesText: cleanText(row.industriesText, 'Local businesses\nEvents\nSchools\nWedding suppliers'),
    faqText: cleanText(row.faqText, 'Can I upload artwork later? — Yes, artwork upload can happen during checkout or after order approval.'),
    seoTitle: cleanText(row.seoTitle, `${title} | Print Admin`),
    seoDescription: cleanText(row.seoDescription, 'Customer landing page for online print ordering.'),
    updatedAt: cleanText(row.updatedAt, ''),
  };
}

function FieldShell({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-textMuted">{label}</span>
      {children}
      {hint ? <span className="block text-xs leading-5 text-textMuted">{hint}</span> : null}
    </label>
  );
}

function TextInput({ label, value, onChange, placeholder, hint }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; hint?: string }) {
  return (
    <FieldShell label={label} hint={hint}>
      <input
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-text outline-none transition focus:border-accent"
      />
    </FieldShell>
  );
}

function TextArea({ label, value, onChange, rows = 4, hint }: { label: string; value: string; onChange: (value: string) => void; rows?: number; hint?: string }) {
  return (
    <FieldShell label={label} hint={hint}>
      <textarea
        value={value}
        rows={rows}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)}
        className="w-full resize-y rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-6 text-text outline-none transition focus:border-accent"
      />
    </FieldShell>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <FieldShell label={label}>
      <select
        value={value}
        onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-text outline-none transition focus:border-accent"
      >
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </FieldShell>
  );
}

function ActionButton({ children, onClick, tone = 'default' }: { children: ReactNode; onClick?: () => void; tone?: 'default' | 'primary' | 'danger' }) {
  const styles = tone === 'primary'
    ? 'border-accent bg-accent text-white hover:brightness-110'
    : tone === 'danger'
      ? 'border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/15'
      : 'border-border bg-white/[0.03] text-text hover:bg-white/[0.06]';

  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${styles}`}>
      {children}
    </button>
  );
}

export default function Page() {
  const auth = useAuth();
  const tenantId = auth.session?.tenantId || auth.auth?.tenantId || 'holo-print';
  const endpoint = useMemo(() => `/api/internal/config/${encodeURIComponent(CONFIG_KEY)}/items?tenantId=${encodeURIComponent(tenantId)}`, [tenantId]);
  const [items, setItems] = useState<CustomerLandingPage[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [syncState, setSyncState] = useState<'loading' | 'ready' | 'saving' | 'error'>('loading');
  const [message, setMessage] = useState('Loading customer landing pages from the tenant database…');

  useEffect(() => {
    let active = true;

    async function load() {
      setSyncState('loading');
      setMessage('Loading customer landing pages from the tenant database…');
      try {
        const response = await fetch(endpoint, { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Landing pages could not load.');
        const raw = payload?.data?.metadataJson?.items || payload?.data?.items || [];
        const mapped = Array.isArray(raw) ? raw.map((row, index) => normalisePage(row as Record<string, unknown>, index)) : [];
        if (!active) return;
        setItems(mapped);
        setSelectedId(mapped[0]?.id || '');
        setSyncState('ready');
        setMessage(mapped.length ? 'Connected to the internal database. Edit a page, save, then preview it.' : 'Connected to the internal database. Create your first customer landing page from a template.');
      } catch (error) {
        if (!active) return;
        setSyncState('error');
        setMessage(error instanceof Error ? error.message : 'Could not load landing pages.');
      }
    }

    void load();
    return () => { active = false; };
  }, [endpoint]);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? items[0] ?? null, [items, selectedId]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery = !q || [item.title, item.slug, item.pageType, item.heroHeadline, item.tenantDisplayName].join(' ').toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [items, query, statusFilter]);

  const previewPath = selected ? `/lp/${selected.slug}?tenantId=${encodeURIComponent(tenantId)}&preview=1` : '';
  const resolverPath = selected ? `/api/v1/customer-landing-pages/resolve?tenantId=${encodeURIComponent(tenantId)}&slug=${encodeURIComponent(selected.slug)}&preview=1` : '';

  function updateSelected<K extends keyof CustomerLandingPage>(key: K, value: CustomerLandingPage[K]) {
    if (!selected) return;
    setItems((current) => current.map((item) => item.id === selected.id ? { ...item, [key]: value } : item));
  }

  function updateSlugFromTitle(title: string) {
    if (!selected) return;
    const nextSlug = selected.slug ? selected.slug : uniqueSlug(title, items);
    setItems((current) => current.map((item) => item.id === selected.id ? { ...item, title, slug: nextSlug } : item));
  }

  function createFromTemplate(template: Template) {
    const id = `landing-${Date.now()}`;
    const next: CustomerLandingPage = {
      ...template.values,
      id,
      slug: uniqueSlug(template.values.slug || template.values.title, items),
      updatedAt: new Date().toISOString(),
    };
    setItems((current) => [next, ...current]);
    setSelectedId(id);
    setMessage('Template added. Edit the content and press Save pages.');
    setSyncState('ready');
  }

  function duplicateSelected() {
    if (!selected) return;
    const id = `landing-${Date.now()}`;
    const next: CustomerLandingPage = {
      ...selected,
      id,
      title: `${selected.title} Copy`,
      slug: uniqueSlug(`${selected.slug}-copy`, items),
      status: 'draft',
      updatedAt: new Date().toISOString(),
    };
    setItems((current) => [next, ...current]);
    setSelectedId(id);
  }

  function deleteSelected() {
    if (!selected) return;
    const next = items.filter((item) => item.id !== selected.id);
    setItems(next);
    setSelectedId(next[0]?.id || '');
  }

  async function saveAll() {
    setSyncState('saving');
    setMessage('Saving customer landing pages…');
    try {
      const now = new Date().toISOString();
      const payloadItems = items.map((item) => ({ ...item, slug: slugify(item.slug || item.title), updatedAt: now }));
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Customer Landing Pages',
          description: 'Tenant customer-facing landing pages, portal intros and campaign pages.',
          items: payloadItems,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Save failed.');
      setItems(payloadItems);
      setSyncState('ready');
      setMessage('Saved to the internal database. Public preview and resolver API are now updated.');
    } catch (error) {
      setSyncState('error');
      setMessage(error instanceof Error ? error.message : 'Could not save landing pages.');
    }
  }

  function copyResolver() {
    if (!resolverPath || typeof window === 'undefined') return;
    void navigator.clipboard?.writeText(`${window.location.origin}${resolverPath}`);
    setMessage('Resolver API URL copied.');
  }

  function openPreview() {
    if (!previewPath || typeof window === 'undefined') return;
    window.open(previewPath, '_blank', 'noopener,noreferrer');
  }

  const previewCategories = selected ? lines(selected.productCategoriesText).slice(0, 6) : [];
  const previewFeatures = selected ? pairs(selected.featureCardsText).slice(0, 3) : [];
  const previewBadges = selected ? lines(selected.trustBadgesText).slice(0, 4) : [];

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(24,167,208,0.2),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))] p-6 shadow-soft">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-textMuted">
              <LayoutPanelTop size={14} /> Customer Landing Pages
            </div>
            <h1 className="max-w-4xl text-3xl font-semibold tracking-[-0.05em] text-white md:text-5xl">Build PrintNow-style customer landing pages inside your admin.</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-textMuted md:text-base">
              Create tenant storefront homepages, B2B portal intros, campaign pages and local service pages. These save to your internal config database and can be rendered at <span className="font-mono text-text">/lp/[slug]</span> or consumed by the hosted theme through the public resolver API.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={saveAll} tone="primary"><Save size={16} /> Save pages</ActionButton>
            <ActionButton onClick={openPreview}><Eye size={16} /> Preview</ActionButton>
            <ActionButton onClick={copyResolver}><Copy size={16} /> Copy API</ActionButton>
          </div>
        </div>
      </div>

      <div className={`rounded-2xl border px-4 py-3 text-sm ${syncState === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-100' : 'border-border bg-panel text-textMuted'}`}>
        <span className="font-semibold text-text">{syncState.toUpperCase()}</span> · {message}
      </div>

      <section className="grid gap-3 lg:grid-cols-3">
        {templates.map((template) => (
          <button
            key={template.label}
            type="button"
            onClick={() => createFromTemplate(template)}
            className="rounded-[24px] border border-border bg-panel p-4 text-left transition hover:-translate-y-0.5 hover:border-accent/60 hover:bg-white/[0.04]"
          >
            <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/15 text-accent"><Sparkles size={18} /></span>
            <p className="font-semibold text-text">{template.label}</p>
            <p className="mt-1 text-sm leading-5 text-textMuted">{template.description}</p>
          </button>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-[24px] border border-border bg-panel p-4">
            <div className="grid gap-3">
              <TextInput label="Search" value={query} onChange={setQuery} placeholder="Search title, slug or page type" />
              <SelectField label="Status filter" value={statusFilter} onChange={setStatusFilter} options={['all', ...statuses]} />
            </div>
          </div>

          <div className="rounded-[24px] border border-border bg-panel p-3">
            <div className="mb-3 flex items-center justify-between px-1">
              <p className="text-sm font-semibold text-text">{filtered.length} pages</p>
              <ActionButton onClick={() => createFromTemplate(templates[0])}><Plus size={15} /> New</ActionButton>
            </div>
            <div className="space-y-2">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${selected?.id === item.id ? 'border-accent bg-accent/10' : 'border-border bg-background hover:bg-white/[0.04]'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-text">{item.title}</p>
                      <p className="mt-1 font-mono text-xs text-textMuted">/lp/{item.slug}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${item.status === 'published' ? 'bg-emerald-500/15 text-emerald-200' : item.status === 'archived' ? 'bg-zinc-500/15 text-zinc-300' : 'bg-amber-500/15 text-amber-200'}`}>{item.status}</span>
                  </div>
                  <p className="mt-3 text-xs text-textMuted">{item.pageType} · {item.tenantDisplayName}</p>
                </button>
              ))}
              {!filtered.length ? <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-textMuted">No pages found. Create one from a template.</p> : null}
            </div>
          </div>
        </div>

        {selected ? (
          <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="space-y-5">
              <div className="rounded-[24px] border border-border bg-panel p-5">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-textMuted">Page setup</p>
                    <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-text">{selected.title}</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={previewPath as any} target="_blank" className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-text hover:bg-white/[0.06]"><Globe2 size={15} /> Public preview</Link>
                    <ActionButton onClick={duplicateSelected}><Copy size={15} /> Duplicate</ActionButton>
                    <ActionButton onClick={deleteSelected} tone="danger"><Trash2 size={15} /> Delete</ActionButton>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <TextInput label="Page title" value={selected.title} onChange={updateSlugFromTitle} />
                  <TextInput label="Slug" value={selected.slug} onChange={(value) => updateSelected('slug', slugify(value))} hint="Used for the public /lp/[slug] URL." />
                  <SelectField label="Status" value={selected.status} onChange={(value) => updateSelected('status', value as LandingStatus)} options={statuses} />
                  <SelectField label="Page type" value={selected.pageType} onChange={(value) => updateSelected('pageType', value)} options={pageTypes} />
                  <TextInput label="Customer / tenant display name" value={selected.tenantDisplayName} onChange={(value) => updateSelected('tenantDisplayName', value)} />
                  <TextInput label="Brand colour" value={selected.brandColor} onChange={(value) => updateSelected('brandColor', value)} hint="Example: #18a7d0" />
                </div>
              </div>

              <div className="rounded-[24px] border border-border bg-panel p-5">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-textMuted">Hero and CTA</p>
                <div className="grid gap-4">
                  <TextInput label="Hero kicker" value={selected.heroKicker} onChange={(value) => updateSelected('heroKicker', value)} />
                  <TextArea label="Hero headline" rows={2} value={selected.heroHeadline} onChange={(value) => updateSelected('heroHeadline', value)} />
                  <TextArea label="Hero subheading" rows={3} value={selected.heroSubheading} onChange={(value) => updateSelected('heroSubheading', value)} />
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextInput label="Primary CTA label" value={selected.primaryCtaLabel} onChange={(value) => updateSelected('primaryCtaLabel', value)} />
                    <TextInput label="Primary CTA URL" value={selected.primaryCtaUrl} onChange={(value) => updateSelected('primaryCtaUrl', value)} />
                    <TextInput label="Secondary CTA label" value={selected.secondaryCtaLabel} onChange={(value) => updateSelected('secondaryCtaLabel', value)} />
                    <TextInput label="Secondary CTA URL" value={selected.secondaryCtaUrl} onChange={(value) => updateSelected('secondaryCtaUrl', value)} />
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-border bg-panel p-5">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-textMuted">Page content blocks</p>
                <div className="grid gap-4">
                  <TextArea label="Product categories" value={selected.productCategoriesText} onChange={(value) => updateSelected('productCategoriesText', value)} hint="One product/category per line." />
                  <TextArea label="Feature cards" value={selected.featureCardsText} onChange={(value) => updateSelected('featureCardsText', value)} rows={5} hint="One per line. Format: Title — description." />
                  <TextArea label="Workflow steps" value={selected.workflowStepsText} onChange={(value) => updateSelected('workflowStepsText', value)} hint="One step per line." />
                  <TextArea label="Trust badges" value={selected.trustBadgesText} onChange={(value) => updateSelected('trustBadgesText', value)} hint="One badge per line." />
                  <TextArea label="Industries / audience" value={selected.industriesText} onChange={(value) => updateSelected('industriesText', value)} hint="One audience per line." />
                  <TextArea label="FAQ" value={selected.faqText} onChange={(value) => updateSelected('faqText', value)} rows={5} hint="One per line. Format: Question — answer." />
                </div>
              </div>

              <div className="rounded-[24px] border border-border bg-panel p-5">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-textMuted">SEO</p>
                <div className="grid gap-4">
                  <TextInput label="SEO title" value={selected.seoTitle} onChange={(value) => updateSelected('seoTitle', value)} />
                  <TextArea label="SEO description" value={selected.seoDescription} onChange={(value) => updateSelected('seoDescription', value)} rows={3} />
                </div>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="sticky top-5 space-y-4">
                <div className="overflow-hidden rounded-[28px] border border-border bg-background shadow-soft">
                  <div className="p-5" style={{ background: `linear-gradient(135deg, ${selected.brandColor || '#18a7d0'}, #0f172a)` }}>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">{selected.heroKicker}</p>
                    <h3 className="mt-3 text-3xl font-semibold leading-[0.95] tracking-[-0.06em] text-white">{selected.heroHeadline}</h3>
                    <p className="mt-3 text-sm leading-6 text-white/75">{selected.heroSubheading}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-3 py-2 text-xs font-bold text-slate-950">{selected.primaryCtaLabel}</span>
                      <span className="rounded-full border border-white/20 px-3 py-2 text-xs font-bold text-white">{selected.secondaryCtaLabel}</span>
                    </div>
                  </div>
                  <div className="space-y-4 p-5">
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-textMuted">Products</p>
                      <div className="grid grid-cols-2 gap-2">
                        {previewCategories.map((category) => <span key={category} className="rounded-2xl border border-border bg-panel px-3 py-2 text-xs font-semibold text-text">{category}</span>)}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-textMuted">Trust</p>
                      <div className="flex flex-wrap gap-2">
                        {previewBadges.map((badge) => <span key={badge} className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">{badge}</span>)}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-textMuted">Features</p>
                      <div className="space-y-2">
                        {previewFeatures.map((feature) => (
                          <div key={`${feature.title}-${feature.body}`} className="rounded-2xl border border-border bg-panel p-3">
                            <p className="text-sm font-semibold text-text">{feature.title}</p>
                            <p className="mt-1 text-xs leading-5 text-textMuted">{feature.body}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-border bg-panel p-4">
                  <p className="text-sm font-semibold text-text">Developer handoff</p>
                  <p className="mt-2 text-xs leading-5 text-textMuted">Hosted theme can call this API and render the returned data for the correct tenant.</p>
                  <code className="mt-3 block overflow-x-auto rounded-2xl border border-border bg-background p-3 text-[11px] leading-5 text-textMuted">{resolverPath}</code>
                </div>
              </div>
            </aside>
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-border bg-panel p-10 text-center">
            <p className="text-lg font-semibold text-text">No landing page selected</p>
            <p className="mt-2 text-sm text-textMuted">Create a page from a template to start building.</p>
          </div>
        )}
      </section>
    </div>
  );
}
