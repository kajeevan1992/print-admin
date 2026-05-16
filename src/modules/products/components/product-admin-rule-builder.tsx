'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';
import { ProductSectionCard } from './product-section-card';
import type { ProductOptionGroup, ProductTemplateRuleConfig } from '@/modules/products/types';

type AdminRuleScope = 'storefront' | 'pricing' | 'artwork' | 'production' | 'compatibility';
type ConditionOperator = 'equals' | 'not-equals' | 'is-selected' | 'is-empty' | 'greater-than' | 'less-than' | 'between';
type ActionType =
  | 'show-group'
  | 'hide-group'
  | 'require-group'
  | 'show-value'
  | 'hide-value'
  | 'set-default-value'
  | 'add-price'
  | 'multiply-price'
  | 'set-lead-time'
  | 'block-checkout'
  | 'show-message'
  | 'set-artwork-mode'
  | 'assign-production-method';

type RuleCondition = {
  id: string;
  groupKey: string;
  operator: ConditionOperator;
  value?: string;
  secondaryValue?: string;
};

type RuleAction = {
  id: string;
  type: ActionType;
  targetGroupKey?: string;
  targetValueId?: string;
  amountMinor?: number;
  multiplier?: number;
  leadTimeDays?: number;
  message?: string;
};

export type ProductAdminRule = {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  scope: AdminRuleScope;
  stopProcessing?: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
  adminNote?: string;
};

type RulesWithAdminRules = ProductTemplateRuleConfig & { adminRules?: ProductAdminRule[] };

const scopes: AdminRuleScope[] = ['storefront', 'pricing', 'artwork', 'production', 'compatibility'];
const conditionOperators: ConditionOperator[] = ['equals', 'not-equals', 'is-selected', 'is-empty', 'greater-than', 'less-than', 'between'];
const actionTypes: ActionType[] = ['show-group', 'hide-group', 'require-group', 'show-value', 'hide-value', 'set-default-value', 'add-price', 'multiply-price', 'set-lead-time', 'block-checkout', 'show-message', 'set-artwork-mode', 'assign-production-method'];

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function firstGroupKey(groups: ProductOptionGroup[]) {
  return groups[0]?.pricingKey || groups[0]?.key || '';
}

function firstValueId(group?: ProductOptionGroup) {
  return group?.values[0]?.id || '';
}

function groupKey(group: ProductOptionGroup) {
  return group.pricingKey || group.key;
}

function groupLabel(group: ProductOptionGroup) {
  return `${group.name || group.key} (${groupKey(group)})`;
}

function findGroup(groups: ProductOptionGroup[], key?: string) {
  if (!key) return undefined;
  return groups.find((group) => group.key === key || group.pricingKey === key);
}

function newCondition(groups: ProductOptionGroup[]): RuleCondition {
  const key = firstGroupKey(groups);
  return {
    id: makeId('condition'),
    groupKey: key,
    operator: 'equals',
    value: firstValueId(findGroup(groups, key)),
  };
}

function newAction(groups: ProductOptionGroup[]): RuleAction {
  const key = firstGroupKey(groups);
  return {
    id: makeId('action'),
    type: 'show-message',
    targetGroupKey: key,
    targetValueId: firstValueId(findGroup(groups, key)),
    message: 'This selection changes the available options.',
  };
}

function newRule(groups: ProductOptionGroup[]): ProductAdminRule {
  return {
    id: makeId('rule'),
    name: 'New product rule',
    enabled: true,
    priority: 100,
    scope: 'storefront',
    conditions: [newCondition(groups)],
    actions: [newAction(groups)],
    adminNote: 'Used by the hosted storefront resolver after option groups are selected.',
  };
}

function updateRule(rules: ProductAdminRule[], id: string, patch: Partial<ProductAdminRule>) {
  return rules.map((rule) => rule.id === id ? { ...rule, ...patch } : rule);
}

function updateCondition(rule: ProductAdminRule, id: string, patch: Partial<RuleCondition>) {
  return {
    ...rule,
    conditions: rule.conditions.map((condition) => condition.id === id ? { ...condition, ...patch } : condition),
  };
}

function updateAction(rule: ProductAdminRule, id: string, patch: Partial<RuleAction>) {
  return {
    ...rule,
    actions: rule.actions.map((action) => action.id === id ? { ...action, ...patch } : action),
  };
}

function formatMoney(amountMinor?: number) {
  if (!amountMinor) return '£0.00';
  return `£${(amountMinor / 100).toFixed(2)}`;
}

function summariseAction(action: RuleAction) {
  if (action.type === 'add-price') return `Add ${formatMoney(action.amountMinor)}`;
  if (action.type === 'multiply-price') return `Multiply price by ${action.multiplier || 1}`;
  if (action.type === 'set-lead-time') return `Set lead time to ${action.leadTimeDays || 0} day(s)`;
  if (action.message) return action.message;
  return action.type;
}

function createSoftTouchPreset(groups: ProductOptionGroup[]): ProductAdminRule {
  const finishGroup = groups.find((group) => group.source === 'finish') || groups.find((group) => group.key.includes('finish')) || groups[0];
  const targetGroup = groups.find((group) => group.source === 'material') || groups.find((group) => group.key.includes('material')) || finishGroup;
  const softTouch = finishGroup?.values.find((value) => /soft|velvet|touch/i.test(value.label)) || finishGroup?.values[0];
  return {
    id: makeId('rule'),
    name: 'Soft touch compatibility gate',
    enabled: true,
    priority: 20,
    scope: 'compatibility',
    conditions: [{ id: makeId('condition'), groupKey: groupKey(finishGroup), operator: 'equals', value: softTouch?.id || '' }],
    actions: [
      { id: makeId('action'), type: 'show-message', targetGroupKey: groupKey(targetGroup), message: 'Soft touch finishing must only remain available for compatible coated/card materials.' },
      { id: makeId('action'), type: 'block-checkout', message: 'Block checkout when the selected material is not compatible with soft touch.' },
    ],
    adminNote: 'Use this for product-level rules such as foil/soft touch/matte lamination dependencies.',
  };
}

function createCustomSizePreset(groups: ProductOptionGroup[]): ProductAdminRule {
  const sizeGroup = groups.find((group) => group.source === 'size') || groups[0];
  return {
    id: makeId('rule'),
    name: 'Custom size manual review gate',
    enabled: true,
    priority: 30,
    scope: 'artwork',
    conditions: [{ id: makeId('condition'), groupKey: groupKey(sizeGroup), operator: 'is-selected', value: sizeGroup?.values.find((value) => value.isCustomSizeTrigger)?.id || sizeGroup?.values[0]?.id || '' }],
    actions: [
      { id: makeId('action'), type: 'set-artwork-mode', targetGroupKey: groupKey(sizeGroup), message: 'Artwork must be checked against the entered custom width/height before production.' },
      { id: makeId('action'), type: 'show-message', message: 'Custom-size orders may need manual artwork review before production.' },
    ],
    adminNote: 'Useful for banners, boards and bespoke products using width/height inputs.',
  };
}

export function ProductAdminRuleBuilder({ optionGroups, rules, onChange }: { optionGroups: ProductOptionGroup[]; rules: RulesWithAdminRules; onChange: (rules: ProductAdminRule[]) => void }) {
  const adminRules = rules.adminRules || [];
  const orderedRules = useMemo(() => [...adminRules].sort((a, b) => a.priority - b.priority), [adminRules]);
  const enabledCount = adminRules.filter((rule) => rule.enabled).length;
  const pricingActionCount = adminRules.flatMap((rule) => rule.actions).filter((action) => action.type === 'add-price' || action.type === 'multiply-price').length;
  const blockingCount = adminRules.flatMap((rule) => rule.actions).filter((action) => action.type === 'block-checkout').length;

  const setRules = (next: ProductAdminRule[]) => onChange(next);
  const replaceRule = (nextRule: ProductAdminRule) => setRules(adminRules.map((rule) => rule.id === nextRule.id ? nextRule : rule));

  return (
    <ProductSectionCard title="Admin Rule Builder">
      <p className="text-sm leading-6 text-textMuted">
        Build product-level rules that the hosted storefront resolver can apply after the customer chooses options. Use this for dependencies such as foil needing soft-touch, spot UV needing matt lamination, custom-size artwork checks, lead-time changes and checkout blocks.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Enabled rules</p>
          <p className="mt-2 text-2xl font-semibold text-white">{enabledCount}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Pricing actions</p>
          <p className="mt-2 text-2xl font-semibold text-white">{pricingActionCount}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Checkout blocks</p>
          <p className="mt-2 text-2xl font-semibold text-white">{blockingCount}</p>
        </div>
      </div>

      {!optionGroups.length ? (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          Add option groups first. Rules need group keys and value IDs so the resolver can match customer selections safely.
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => setRules([...adminRules, newRule(optionGroups)])} disabled={!optionGroups.length}>Add Rule</Button>
        <Button onClick={() => setRules([...adminRules, createSoftTouchPreset(optionGroups)])} disabled={!optionGroups.length}>Preset: finishing compatibility</Button>
        <Button onClick={() => setRules([...adminRules, createCustomSizePreset(optionGroups)])} disabled={!optionGroups.length}>Preset: custom-size artwork gate</Button>
      </div>

      {!adminRules.length ? (
        <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] p-4 text-sm text-textMuted">
          No admin rules yet. Add a rule when an option choice should hide another choice, require another choice, add cost, change lead time, show a message or block checkout.
        </div>
      ) : null}

      <div className="mt-4 space-y-4">
        {orderedRules.map((rule) => {
          const originalIndex = adminRules.findIndex((item) => item.id === rule.id);
          return (
            <div key={rule.id} className="rounded-2xl border border-border bg-panelMuted/40 p-4">
              <div className="grid gap-3 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_auto]">
                <label className="space-y-1 text-sm"><span className="text-textMuted">Rule name</span><Input value={rule.name} onChange={(event) => setRules(updateRule(adminRules, rule.id, { name: event.target.value }))} /></label>
                <label className="space-y-1 text-sm"><span className="text-textMuted">Scope</span><select value={rule.scope} onChange={(event) => setRules(updateRule(adminRules, rule.id, { scope: event.target.value as AdminRuleScope }))} className="h-11 w-full rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 text-[13px] text-text">{scopes.map((scope) => <option key={scope} value={scope}>{scope}</option>)}</select></label>
                <label className="space-y-1 text-sm"><span className="text-textMuted">Priority</span><Input type="number" value={String(rule.priority)} onChange={(event) => setRules(updateRule(adminRules, rule.id, { priority: Number(event.target.value) || 0 }))} /></label>
                <label className="flex items-end gap-2 pb-3 text-sm text-textMuted"><input type="checkbox" checked={rule.enabled} onChange={(event) => setRules(updateRule(adminRules, rule.id, { enabled: event.target.checked }))} /> Enabled</label>
                <Button className="self-end text-red-300" onClick={() => setRules(adminRules.filter((item) => item.id !== rule.id))}>Delete</Button>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
                <label className="space-y-1 text-sm"><span className="text-textMuted">Admin note</span><Input value={rule.adminNote || ''} onChange={(event) => setRules(updateRule(adminRules, rule.id, { adminNote: event.target.value }))} placeholder="Why this rule exists" /></label>
                <label className="flex items-end gap-2 pb-3 text-sm text-textMuted"><input type="checkbox" checked={!!rule.stopProcessing} onChange={(event) => setRules(updateRule(adminRules, rule.id, { stopProcessing: event.target.checked }))} /> Stop after match</label>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-textMuted">When all conditions match</p>
                    <Button onClick={() => replaceRule({ ...rule, conditions: [...rule.conditions, newCondition(optionGroups)] })}>Add condition</Button>
                  </div>
                  <div className="space-y-2">
                    {rule.conditions.map((condition) => {
                      const selectedGroup = findGroup(optionGroups, condition.groupKey);
                      const valueOptions = selectedGroup?.values || [];
                      return (
                        <div key={condition.id} className="grid gap-2 rounded-xl border border-border p-3 md:grid-cols-[1fr_0.9fr_1fr_auto]">
                          <select value={condition.groupKey} onChange={(event) => {
                            const nextGroup = findGroup(optionGroups, event.target.value);
                            replaceRule(updateCondition(rule, condition.id, { groupKey: event.target.value, value: firstValueId(nextGroup) }));
                          }} className="h-11 rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 text-[13px] text-text">
                            {optionGroups.map((group) => <option key={group.id} value={groupKey(group)}>{groupLabel(group)}</option>)}
                          </select>
                          <select value={condition.operator} onChange={(event) => replaceRule(updateCondition(rule, condition.id, { operator: event.target.value as ConditionOperator }))} className="h-11 rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 text-[13px] text-text">
                            {conditionOperators.map((operator) => <option key={operator} value={operator}>{operator}</option>)}
                          </select>
                          {valueOptions.length && condition.operator !== 'is-empty' ? (
                            <select value={condition.value || ''} onChange={(event) => replaceRule(updateCondition(rule, condition.id, { value: event.target.value }))} className="h-11 rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 text-[13px] text-text">
                              <option value="">Any value</option>
                              {valueOptions.map((value) => <option key={value.id} value={value.id}>{value.label || value.id}</option>)}
                            </select>
                          ) : (
                            <Input value={condition.value || ''} placeholder="Value / number" onChange={(event) => replaceRule(updateCondition(rule, condition.id, { value: event.target.value }))} />
                          )}
                          <Button className="text-red-300" onClick={() => replaceRule({ ...rule, conditions: rule.conditions.filter((item) => item.id !== condition.id) })}>Remove</Button>
                          {condition.operator === 'between' ? <Input value={condition.secondaryValue || ''} placeholder="Second value" onChange={(event) => replaceRule(updateCondition(rule, condition.id, { secondaryValue: event.target.value }))} /> : null}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-textMuted">Then apply actions</p>
                    <Button onClick={() => replaceRule({ ...rule, actions: [...rule.actions, newAction(optionGroups)] })}>Add action</Button>
                  </div>
                  <div className="space-y-2">
                    {rule.actions.map((action) => {
                      const selectedGroup = findGroup(optionGroups, action.targetGroupKey);
                      const valueOptions = selectedGroup?.values || [];
                      return (
                        <div key={action.id} className="rounded-xl border border-border p-3">
                          <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                            <select value={action.type} onChange={(event) => replaceRule(updateAction(rule, action.id, { type: event.target.value as ActionType }))} className="h-11 rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 text-[13px] text-text">
                              {actionTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                            </select>
                            <select value={action.targetGroupKey || ''} onChange={(event) => {
                              const nextGroup = findGroup(optionGroups, event.target.value);
                              replaceRule(updateAction(rule, action.id, { targetGroupKey: event.target.value, targetValueId: firstValueId(nextGroup) }));
                            }} className="h-11 rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 text-[13px] text-text">
                              <option value="">No target group</option>
                              {optionGroups.map((group) => <option key={group.id} value={groupKey(group)}>{groupLabel(group)}</option>)}
                            </select>
                            <Button className="text-red-300" onClick={() => replaceRule({ ...rule, actions: rule.actions.filter((item) => item.id !== action.id) })}>Remove</Button>
                          </div>
                          <div className="mt-2 grid gap-2 md:grid-cols-4">
                            <select value={action.targetValueId || ''} onChange={(event) => replaceRule(updateAction(rule, action.id, { targetValueId: event.target.value }))} className="h-11 rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 text-[13px] text-text">
                              <option value="">No target value</option>
                              {valueOptions.map((value) => <option key={value.id} value={value.id}>{value.label || value.id}</option>)}
                            </select>
                            <Input type="number" value={String(action.amountMinor ?? '')} placeholder="Price pence" onChange={(event) => replaceRule(updateAction(rule, action.id, { amountMinor: Number(event.target.value) || undefined }))} />
                            <Input type="number" step="0.01" value={String(action.multiplier ?? '')} placeholder="Multiplier" onChange={(event) => replaceRule(updateAction(rule, action.id, { multiplier: Number(event.target.value) || undefined }))} />
                            <Input type="number" value={String(action.leadTimeDays ?? '')} placeholder="Lead days" onChange={(event) => replaceRule(updateAction(rule, action.id, { leadTimeDays: Number(event.target.value) || undefined }))} />
                          </div>
                          <Input value={action.message || ''} placeholder="Customer/admin message or production method" onChange={(event) => replaceRule(updateAction(rule, action.id, { message: event.target.value }))} className="mt-2" />
                          <p className="mt-2 text-xs text-textMuted">Preview: {summariseAction(action)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-xs leading-5 text-textMuted">
                Resolver order #{originalIndex + 1}: rule is checked after option selections are known. Matching actions should be returned to the hosted storefront as applied actions/messages, while checkout-blocking actions should stop cart submission.
              </div>
            </div>
          );
        })}
      </div>
    </ProductSectionCard>
  );
}
