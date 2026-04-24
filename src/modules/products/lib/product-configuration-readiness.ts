import type { Product, ProductOptionGroup } from '@/modules/products/types';

export type ProductConfigurationIssueLevel = 'error' | 'warning' | 'info';

export type ProductConfigurationIssue = {
  id: string;
  level: ProductConfigurationIssueLevel;
  title: string;
  message: string;
};

const REQUIRED_PRICING_KEYS = ['size', 'material', 'quantity'];

function hasGroup(groups: ProductOptionGroup[], key: string) {
  return groups.some((group) => group.key === key || group.pricingKey === key || group.source === key);
}

function valueLabel(group: ProductOptionGroup) {
  return group.name || group.key || group.source;
}

export function validateProductConfiguration(product: Pick<Product, 'optionGroups' | 'templateRules'>): ProductConfigurationIssue[] {
  const groups = product.optionGroups || [];
  const issues: ProductConfigurationIssue[] = [];

  if (!groups.length) {
    issues.push({
      id: 'no-option-groups',
      level: 'warning',
      title: 'No customer options configured',
      message: 'Add size, material, quantity and turnaround option groups before publishing this product to a storefront.',
    });
    return issues;
  }

  for (const key of REQUIRED_PRICING_KEYS) {
    if (!hasGroup(groups, key)) {
      issues.push({
        id: `missing-${key}`,
        level: 'warning',
        title: `Missing ${key} option`,
        message: `Pricing later needs a stable ${key} option or pricing key. Add one or set a group pricing key to "${key}".`,
      });
    }
  }

  groups.forEach((group) => {
    if (!group.key?.trim()) {
      issues.push({ id: `${group.id}-missing-key`, level: 'error', title: `${valueLabel(group)} has no key`, message: 'Every group needs a stable key so storefront selections and pricing can reference it.' });
    }
    if (!group.values?.length && group.displayType !== 'custom-size') {
      issues.push({ id: `${group.id}-no-values`, level: 'warning', title: `${valueLabel(group)} has no values`, message: 'Add values or link values from a library.' });
    }
    if ((group.source === 'material' || group.source === 'finish') && group.values.some((value) => !value.sourceId)) {
      issues.push({ id: `${group.id}-manual-library-values`, level: 'warning', title: `${valueLabel(group)} has manual values`, message: 'Material and finish options should be linked from their libraries so pricing can find the correct material/finish later.' });
    }
    if (group.source === 'size') {
      group.values.forEach((value) => {
        if (!value.width || !value.height) {
          issues.push({ id: `${group.id}-${value.id}-missing-dimensions`, level: 'warning', title: `${value.label} needs dimensions`, message: 'Preset size values should include width and height for sheet-fit pricing later.' });
        }
      });
      if (group.allowCustomSize && (!group.maxWidth || !group.maxHeight)) {
        issues.push({ id: `${group.id}-custom-size-limits`, level: 'warning', title: 'Custom size needs limits', message: 'Set maximum printable width and length/height so users cannot order sizes beyond material or printer limits.' });
      }
    }
    if (group.required && group.allowMultiple && group.displayType === 'dropdown') {
      issues.push({ id: `${group.id}-dropdown-multiple`, level: 'info', title: `${valueLabel(group)} display mismatch`, message: 'Dropdown is usually single-choice. Use checkboxes if customers can pick multiple values.' });
    }
  });

  const artworkRules = product.templateRules?.artworkRules;
  if (artworkRules) {
    if (!artworkRules.allowedFileTypes?.length) {
      issues.push({ id: 'artwork-file-types', level: 'warning', title: 'Artwork file types missing', message: 'Add allowed file types such as pdf, ai, eps or jpg.' });
    }
    if (artworkRules.minFiles > artworkRules.maxFiles) {
      issues.push({ id: 'artwork-file-count', level: 'error', title: 'Artwork file count is invalid', message: 'Minimum files cannot be greater than maximum files.' });
    }
  }

  return issues;
}

export function productConfigurationReadinessLabel(issues: ProductConfigurationIssue[]) {
  if (issues.some((issue) => issue.level === 'error')) return 'Needs fixing';
  if (issues.some((issue) => issue.level === 'warning')) return 'Needs review';
  return 'Ready for pricing setup';
}
