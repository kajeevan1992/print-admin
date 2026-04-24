'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BadgePoundSterling, Calculator, CheckCircle2, Percent, Plus, ReceiptText, Search, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { BaseModal } from '@/components/modals/base-modal';
import { productsMock } from '@/data/products';

type MarginBand = 'safe' | 'watch' | 'risk';

type PricingRule = {
  id: string;
  name: string;
  target: 'all' | 'catalogs' | 'business-cards' | 'signage' | 'packaging';
  kind: 'markup' | 'discount' | 'surcharge';
  value: number;
  enabled: boolean;
};

type PriceScenario = {
  id: string;
  name: string;
  productId: string;
  quantity: number;
  turnaround: 'standard' | 'priority' | 'rush';
  finish: 'none' | 'matt-lam' | 'spot-uv' | 'soft-touch';
  channel: 'retail' | 'trade' | 'enterprise';
  promoCode: string;
};

type ApprovalRecord = {
  id: string;
  label: string;
  status: 'draft' | 'review' | 'approved';
  marginBand: MarginBand;
  sellPrice: number;
  updatedAt: string;
};

const RULES_KEY = 'pricing-command-rules';
const APPROVALS_KEY = 'pricing-command-approvals';

const seedRules: PricingRule[] = [
  { id: 'rule-1', name: 'Rush turnaround uplift', target: 'all', kind: 'markup', value: 18, enabled: true },
  { id: 'rule-2', name: 'Trade customer discount', target: 'all', kind: 'discount', value: 10, enabled: true },
  { id: 'rule-3', name: 'Packaging surcharge', target: 'packaging', kind: 'surcharge', value: 12, enabled: true },
  { id: 'rule-4', name: 'Signage finishing uplift', target: 'signage', kind: 'markup', value: 8, enabled: false }
];

const emptyRule: PricingRule = {
  id: '',
  name: '',
  target: 'all',
  kind: 'markup',
  value: 0,
  enabled: true
};

const starterScenario: PriceScenario = {
  id: 'scenario-main',
  name: 'Launch review',
  productId: productsMock[0]?.id ?? '',
  quantity: 250,
  turnaround: 'standard',
  finish: 'none',
  channel: 'retail',
  promoCode: ''
};

function nowLabel() {
  return new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

function loadRules() {
  if (typeof window === 'undefined') return seedRules;
  const raw = window.localStorage.getItem(RULES_KEY);
  if (!raw) return seedRules;
  try {
    return JSON.parse(raw) as PricingRule[];
  } catch {
    return seedRules;
  }
}

function saveRules(rules: PricingRule[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(RULES_KEY, JSON.stringify(rules));
}

function loadApprovals() {
  if (typeof window === 'undefined') return [] as ApprovalRecord[];
  const raw = window.localStorage.getItem(APPROVALS_KEY);
  if (!raw) return [] as ApprovalRecord[];
  try {
    return JSON.parse(raw) as ApprovalRecord[];
  } catch {
    return [] as ApprovalRecord[];
  }
}

function saveApprovals(items: ApprovalRecord[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(APPROVALS_KEY, JSON.stringify(items));
}

function finishMultiplier(finish: PriceScenario['finish']) {
  switch (finish) {
    case 'matt-lam':
      return 1.08;
    case 'spot-uv':
      return 1.14;
    case 'soft-touch':
      return 1.12;
    default:
      return 1;
  }
}

function turnaroundMultiplier(turnaround: PriceScenario['turnaround']) {
  switch (turnaround) {
    case 'priority':
      return 1.12;
    case 'rush':
      return 1.24;
    default:
      return 1;
  }
}

function channelMultiplier(channel: PriceScenario['channel']) {
  switch (channel) {
    case 'trade':
      return 0.92;
    case 'enterprise':
      return 0.96;
    default:
      return 1;
  }
}

function promoDiscount(code: string) {
  const normalized = code.trim().toUpperCase();
  if (normalized === 'LAUNCH10') return 10;
  if (normalized === 'VIP15') return 15;
  return 0;
}

export function PricingCommandPage() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [scenario, setScenario] = useState<PriceScenario>(starterScenario);
  const [ruleSearch, setRuleSearch] = useState('');
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);

  useEffect(() => {
    const loadedRules = loadRules();
    const loadedApprovals = loadApprovals();
    setRules(loadedRules);
    setApprovals(loadedApprovals);
  }, []);

  useEffect(() => { saveRules(rules); }, [rules]);
  useEffect(() => { saveApprovals(approvals); }, [approvals]);

  const selectedProduct = useMemo(() => productsMock.find((product) => product.id === scenario.productId) ?? productsMock[0], [scenario.productId]);

  const filteredRules = useMemo(() => rules.filter((rule) => {
    const haystack = `${rule.name} ${rule.target} ${rule.kind}`.toLowerCase();
    return haystack.includes(ruleSearch.toLowerCase());
  }), [ruleSearch, rules]);

  const pricing = useMemo(() => {
    const baseUnit = selectedProduct?.priceMapping?.basePrice ?? 1;
    const baseSubtotal = baseUnit * scenario.quantity;
    const categoryKey = selectedProduct?.categoryId?.replace('cat-', '') as PricingRule['target'] | undefined;

    const baseAdjusted = baseSubtotal * finishMultiplier(scenario.finish) * turnaroundMultiplier(scenario.turnaround) * channelMultiplier(scenario.channel);

    let adjustmentTotal = 0;
    const appliedRules = rules.filter((rule) => rule.enabled && (rule.target === 'all' || rule.target === categoryKey));

    for (const rule of appliedRules) {
      if (rule.kind === 'markup' || rule.kind === 'surcharge') {
        adjustmentTotal += baseAdjusted * (rule.value / 100);
      }
      if (rule.kind === 'discount') {
        adjustmentTotal -= baseAdjusted * (rule.value / 100);
      }
    }

    if (scenario.turnaround === 'rush') {
      adjustmentTotal += baseAdjusted * 0.12;
    }
    if (scenario.channel === 'trade') {
      adjustmentTotal -= baseAdjusted * 0.08;
    }

    const promoValue = promoDiscount(scenario.promoCode);
    const promoAmount = promoValue ? (baseAdjusted + adjustmentTotal) * (promoValue / 100) : 0;
    const sellPrice = Math.max(0, baseAdjusted + adjustmentTotal - promoAmount);
    const costEstimate = baseSubtotal * 0.63;
    const marginAmount = sellPrice - costEstimate;
    const marginPercent = sellPrice > 0 ? (marginAmount / sellPrice) * 100 : 0;
    const marginBand: MarginBand = marginPercent >= 32 ? 'safe' : marginPercent >= 22 ? 'watch' : 'risk';

    return {
      baseUnit,
      baseSubtotal,
      baseAdjusted,
      appliedRules,
      adjustmentTotal,
      promoAmount,
      promoValue,
      sellPrice,
      costEstimate,
      marginAmount,
      marginPercent,
      marginBand
    };
  }, [rules, scenario, selectedProduct]);

  const stats = useMemo(() => ({
    enabledRules: rules.filter((rule) => rule.enabled).length,
    riskyApprovals: approvals.filter((item) => item.marginBand === 'risk').length,
    reviewQueue: approvals.filter((item) => item.status !== 'approved').length,
    promoDetected: pricing.promoValue > 0 ? 'Active' : 'None'
  }), [approvals, pricing.promoValue, rules]);

  const saveApproval = (status: ApprovalRecord['status']) => {
    const label = `${selectedProduct?.name ?? 'Product'} · ${scenario.quantity} units`;
    const next: ApprovalRecord = {
      id: `${Date.now()}`,
      label,
      status,
      marginBand: pricing.marginBand,
      sellPrice: Number(pricing.sellPrice.toFixed(2)),
      updatedAt: nowLabel()
    };
    setApprovals((current) => [next, ...current].slice(0, 12));
  };

  const openNewRule = () => setEditingRule({ ...emptyRule, id: `rule-${Date.now()}` });

  const saveRule = () => {
    if (!editingRule) return;
    setRules((current) => {
      const exists = current.some((rule) => rule.id === editingRule.id);
      return exists ? current.map((rule) => rule.id === editingRule.id ? editingRule : rule) : [editingRule, ...current];
    });
    setEditingRule(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pricing Command"
        subtitle="Turn pricing reviews into a usable admin workflow with rule visibility, margin protection, and launch sign-off before API and database wiring."
        actions={<>
          <Button onClick={() => { setRules(seedRules); setApprovals([]); setScenario(starterScenario); }}>Reset seed data</Button>
          <PrimaryButton onClick={openNewRule}>Add rule</PrimaryButton>
        </>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><p className="text-xs uppercase text-textMuted">Enabled rules</p><p className="mt-2 text-3xl font-semibold text-white">{stats.enabledRules}</p></Card>
        <Card><p className="text-xs uppercase text-textMuted">Approvals in queue</p><p className="mt-2 text-3xl font-semibold text-white">{stats.reviewQueue}</p></Card>
        <Card><p className="text-xs uppercase text-textMuted">Risky approvals</p><p className="mt-2 text-3xl font-semibold text-white">{stats.riskyApprovals}</p></Card>
        <Card><p className="text-xs uppercase text-textMuted">Promo detected</p><p className="mt-2 text-3xl font-semibold text-white">{stats.promoDetected}</p></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">Scenario calculator</p>
              <h3 className="mt-2 text-lg font-semibold text-white">Launch pricing review</h3>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs ${pricing.marginBand === 'safe' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : pricing.marginBand === 'watch' ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-rose-500/30 bg-rose-500/10 text-rose-200'}`}>{pricing.marginBand} margin</span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Select value={scenario.productId} options={productsMock.map((product) => ({ value: product.id, label: product.name }))} onChange={(e) => setScenario({ ...scenario, productId: e.target.value })} />
            <Input type="number" min={1} value={String(scenario.quantity)} onChange={(e) => setScenario({ ...scenario, quantity: Number(e.target.value) || 1 })} placeholder="Quantity" />
            <Select value={scenario.turnaround} options={['standard', 'priority', 'rush']} onChange={(e) => setScenario({ ...scenario, turnaround: e.target.value as PriceScenario['turnaround'] })} />
            <Select value={scenario.finish} options={['none', 'matt-lam', 'spot-uv', 'soft-touch']} onChange={(e) => setScenario({ ...scenario, finish: e.target.value as PriceScenario['finish'] })} />
            <Select value={scenario.channel} options={['retail', 'trade', 'enterprise']} onChange={(e) => setScenario({ ...scenario, channel: e.target.value as PriceScenario['channel'] })} />
            <Input value={scenario.promoCode} onChange={(e) => setScenario({ ...scenario, promoCode: e.target.value })} placeholder="Promo code e.g. LAUNCH10" />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-4"><p className="text-xs uppercase text-textMuted">Base subtotal</p><p className="mt-2 text-2xl font-semibold text-white">£{pricing.baseSubtotal.toFixed(2)}</p></div>
            <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-4"><p className="text-xs uppercase text-textMuted">Rule impact</p><p className="mt-2 text-2xl font-semibold text-white">£{pricing.adjustmentTotal.toFixed(2)}</p></div>
            <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-4"><p className="text-xs uppercase text-textMuted">Promo value</p><p className="mt-2 text-2xl font-semibold text-white">£{pricing.promoAmount.toFixed(2)}</p></div>
            <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-4"><p className="text-xs uppercase text-textMuted">Final sell price</p><p className="mt-2 text-2xl font-semibold text-white">£{pricing.sellPrice.toFixed(2)}</p></div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Card className="bg-white/[0.02]">
              <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">Margin control</p>
              <div className="mt-3 space-y-3 text-sm text-textMuted">
                <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><div className="flex items-center justify-between"><span>Estimated cost</span><span className="font-medium text-white">£{pricing.costEstimate.toFixed(2)}</span></div></div>
                <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><div className="flex items-center justify-between"><span>Margin amount</span><span className="font-medium text-white">£{pricing.marginAmount.toFixed(2)}</span></div></div>
                <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3"><div className="flex items-center justify-between"><span>Margin %</span><span className="font-medium text-white">{pricing.marginPercent.toFixed(1)}%</span></div></div>
                {pricing.marginBand !== 'safe' ? <p className="inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100"><AlertTriangle size={14} /> Review rule stack before storefront release.</p> : <p className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100"><ShieldCheck size={14} /> Margin protection looks healthy for launch.</p>}
              </div>
            </Card>

            <Card className="bg-white/[0.02]">
              <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">Applied rule stack</p>
              <div className="mt-3 space-y-2 text-sm text-textMuted">
                {pricing.appliedRules.length === 0 ? <div className="rounded-2xl border border-dashed border-white/8 px-3 py-4 text-center text-xs">No active rules matched this product.</div> : pricing.appliedRules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between rounded-2xl border border-white/6 bg-white/[0.02] px-3 py-3">
                    <div>
                      <p className="font-medium text-white">{rule.name}</p>
                      <p className="mt-1 text-xs">{rule.target} • {rule.kind}</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs text-white">{rule.value}%</span>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button onClick={() => saveApproval('draft')}>Save draft</Button>
                  <Button onClick={() => saveApproval('review')}>Send to review</Button>
                  <PrimaryButton onClick={() => saveApproval('approved')}>Approve pricing</PrimaryButton>
                </div>
              </div>
            </Card>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">Rule library</p>
                <h3 className="mt-2 text-base font-semibold text-white">Commercial controls</h3>
              </div>
              <BadgePoundSterling className="text-accentAlt" size={18} />
            </div>
            <div className="mt-4 relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={15} />
              <Input className="pl-9" value={ruleSearch} onChange={(e) => setRuleSearch(e.target.value)} placeholder="Search rules..." />
            </div>
            <div className="mt-4 space-y-2">
              {filteredRules.map((rule) => (
                <div key={rule.id} className="rounded-2xl border border-white/6 bg-white/[0.02] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{rule.name}</p>
                      <p className="mt-1 text-xs text-textMuted">{rule.target} • {rule.kind} • {rule.value}%</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] ${rule.enabled ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-white/[0.05] text-textMuted'}`}>{rule.enabled ? 'enabled' : 'paused'}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button onClick={() => setRules((current) => current.map((item) => item.id === rule.id ? { ...item, enabled: !item.enabled } : item))}>{rule.enabled ? 'Pause' : 'Enable'}</Button>
                    <Button onClick={() => setEditingRule(rule)}>Edit</Button>
                    <Button onClick={() => setRules((current) => current.filter((item) => item.id !== rule.id))}><span className="inline-flex items-center gap-1"><Trash2 size={14} /> Delete</span></Button>
                  </div>
                </div>
              ))}
              <Button onClick={openNewRule}><span className="inline-flex items-center gap-1"><Plus size={14} /> Add pricing rule</span></Button>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">Launch sign-off</p>
                <h3 className="mt-2 text-base font-semibold text-white">Recent approvals</h3>
              </div>
              <ReceiptText className="text-accentAlt" size={18} />
            </div>
            <div className="mt-4 space-y-2">
              {approvals.length === 0 ? <div className="rounded-2xl border border-dashed border-white/8 px-3 py-5 text-center text-xs text-textMuted">No approvals captured yet.</div> : approvals.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/6 bg-white/[0.02] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{item.label}</p>
                      <p className="mt-1 text-xs text-textMuted">{item.updatedAt}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] ${item.marginBand === 'safe' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : item.marginBand === 'watch' ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-rose-500/30 bg-rose-500/10 text-rose-200'}`}>{item.marginBand}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-textMuted">
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-white">{item.status}</span>
                    <span>£{item.sellPrice.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">Guidance</p>
            <div className="mt-4 space-y-2 text-sm text-textMuted">
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3 inline-flex items-start gap-2"><Calculator size={16} className="mt-0.5 text-accentAlt" /> Review margins before promo codes and trade discounts stack together.</div>
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3 inline-flex items-start gap-2"><Percent size={16} className="mt-0.5 text-accentAlt" /> Keep risky pricing approvals visible so catalog launches do not rely on hidden spreadsheet logic.</div>
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3 inline-flex items-start gap-2"><Sparkles size={16} className="mt-0.5 text-accentAlt" /> This page is meant to become the human review layer before API calculators and live pricebooks are wired in.</div>
            </div>
          </Card>
        </div>
      </div>

      <BaseModal open={!!editingRule} onClose={() => setEditingRule(null)} title={editingRule?.name ? `Edit ${editingRule.name}` : 'Add pricing rule'}>
        {editingRule ? (
          <div className="space-y-3">
            <Input value={editingRule.name} onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })} placeholder="Rule name" />
            <Select value={editingRule.target} options={['all', 'catalogs', 'business-cards', 'signage', 'packaging']} onChange={(e) => setEditingRule({ ...editingRule, target: e.target.value as PricingRule['target'] })} />
            <Select value={editingRule.kind} options={['markup', 'discount', 'surcharge']} onChange={(e) => setEditingRule({ ...editingRule, kind: e.target.value as PricingRule['kind'] })} />
            <Input type="number" min={0} value={String(editingRule.value)} onChange={(e) => setEditingRule({ ...editingRule, value: Number(e.target.value) || 0 })} placeholder="Percent value" />
            <Select value={editingRule.enabled ? 'enabled' : 'paused'} options={['enabled', 'paused']} onChange={(e) => setEditingRule({ ...editingRule, enabled: e.target.value === 'enabled' })} />
            <div className="flex justify-end gap-2">
              <Button onClick={() => setEditingRule(null)}>Cancel</Button>
              <PrimaryButton onClick={saveRule}>{editingRule.name ? 'Save rule' : 'Create rule'}</PrimaryButton>
            </div>
          </div>
        ) : null}
      </BaseModal>
    </div>
  );
}
