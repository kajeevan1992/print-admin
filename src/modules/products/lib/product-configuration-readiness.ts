import type { Product, ProductOptionGroup } from '@/modules/products/types';

export type ProductConfigurationIssueLevel = 'error' | 'warning' | 'info';

export type ProductConfigurationIssue = {
  id: string;
  level: ProductConfigurationIssueLevel;
  title: string;
  message: string;
};

const REQUIRED_PRICING_KEYS = ['size', 'material', 'quantity'];

function groupKey(group: ProductOptionGroup) {
  return (group.key || group.pricingKey || group.source || '').trim();
}

function hasGroup(groups: ProductOptionGroup[], key: string) {
  return groups.some((group) => groupKey(group) === key || group.source === key);
}

function valueLabel(group: ProductOptionGroup) {
  return group.name || group.key || group.source;
}

function valueStableId(value: any) {
  return String(value?.id || value?.sourceId || value?.pricingKey || value?.label || '').trim();
}

export function validateProductConfiguration(product: Pick<Product, 'optionGroups' | 'templateRules'>): ProductConfigurationIssue[] {
  const groups = product.optionGroups || [];
  const issues: ProductConfigurationIssue[] = [];
  const groupKeys = new Set<string>();
  const valuesByGroup = new Map<string, Set<string>>();

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
    const key = groupKey(group);
    const valueIds = new Set<string>();
    if (!key) {
      issues.push({ id: `${group.id}-missing-key`, level: 'error', title: `${valueLabel(group)} has no key`, message: 'Every group needs a stable key so storefront selections and pricing can reference it.' });
    } else if (groupKeys.has(key)) {
      issues.push({ id: `${group.id}-duplicate-key`, level: 'error', title: `Duplicate key: ${key}`, message: 'Each option group needs a unique key. Duplicate keys break storefront selections and pricing lookups.' });
    } else {
      groupKeys.add(key);
    }

    if (!group.values?.length && group.displayType !== 'custom-size' && !group.allowCustomSize) {
    if (!(group.pricingInputRole || group.pricingKey || group.key || group.source)) issues.push({ id: `${group.id}-pricing-input-role`, level: 'warning', title: `${valueLabel(group)} needs pricing role`, message: 'Choose the pricing input role this group should send to the pricing engine later.' });
    if (!group.pricingBasis) issues.push({ id: `${group.id}-pricing-basis`, level: 'info', title: `${valueLabel(group)} pricing basis not set`, message: 'Set a pricing basis such as per-item, per-sheet, per-sqm or fixed before pricing rules are built.' });
      issues.push({ id: `${group.id}-no-values`, level: 'warning', title: `${valueLabel(group)} has no values`, message: 'Add values or link values from a library.' });
    }

    group.values?.forEach((value) => {
      const id = valueStableId(value);
      if (!id) issues.push({ id: `${group.id}-${value.id}-missing-stable-value`, level: 'warning', title: `${value.label || 'Option value'} needs a stable ID`, message: 'Every option value needs a stable ID/pricing key so selections can be saved and priced later.' });
      if (id && valueIds.has(id)) issues.push({ id: `${group.id}-${value.id}-duplicate-value`, level: 'error', title: `${value.label || id} is duplicated`, message: `The value key "${id}" is used more than once in ${valueLabel(group)}.` });
      if (id) valueIds.add(id);
    });
    if (key) valuesByGroup.set(key, valueIds);

    if ((group.source === 'material' || group.source === 'finish') && group.values.some((value) => !value.sourceId)) {
      issues.push({ id: `${group.id}-manual-library-values`, level: 'warning', title: `${valueLabel(group)} has manual values`, message: 'Material and finish options should be linked from their libraries so pricing can find the correct material/finish later.' });
    }
    if (group.source === 'size') {
      group.values.forEach((value) => {
        if (!value.width || !value.height) issues.push({ id: `${group.id}-${value.id}-missing-dimensions`, level: 'warning', title: `${value.label} needs dimensions`, message: 'Preset size values should include width and height for sheet-fit pricing later.' });
      });
      if (group.allowCustomSize && (!group.maxWidth || !group.maxHeight)) issues.push({ id: `${group.id}-custom-size-limits`, level: 'warning', title: 'Custom size needs limits', message: 'Set maximum printable width and length/height so users cannot order sizes beyond material or printer limits.' });
    }
    if (group.required && group.allowMultiple && group.displayType === 'dropdown') {
      issues.push({ id: `${group.id}-dropdown-multiple`, level: 'info', title: `${valueLabel(group)} display mismatch`, message: 'Dropdown is usually single-choice. Use checkboxes if customers can pick multiple values.' });
    }
    if (group.source === 'size') {
      if ((group.dimensionMode === 'custom-only' || group.dimensionMode === 'preset-and-custom' || group.allowCustomSize) && (!group.maxWidth || !group.maxHeight)) {
        issues.push({ id: `${group.id}-custom-print-limits`, level: 'warning', title: 'Custom size limits missing', message: 'Custom-size products need maximum width and length/height limits before they can be safely shown to customers.' });
      }
      if ((group.sheetFitMode === 'sra3' || group.sheetFitMode === 'custom-sheet' || group.sheetFitMode === 'board') && (!group.sourceSheetWidth || !group.sourceSheetHeight)) {
        issues.push({ id: `${group.id}-sheet-source-size`, level: 'warning', title: 'Source sheet size missing', message: 'Sheet-fit products should store source sheet/board width and height, for example SRA3 or 1220 × 2440 board.' });
      }
      if (group.sheetFitMode === 'roll' && (!group.sourceSheetWidth || !group.maxWidth)) {
        issues.push({ id: `${group.id}-roll-width-limit`, level: 'warning', title: 'Roll width limit missing', message: 'Roll products such as banners need a material/printer width limit so customers cannot order too wide.' });
      }
      if (group.minWidth && group.maxWidth && group.minWidth > group.maxWidth) {
        issues.push({ id: `${group.id}-width-range`, level: 'error', title: 'Width limits are invalid', message: 'Minimum width cannot be greater than maximum width.' });
      }
      if (group.minHeight && group.maxHeight && group.minHeight > group.maxHeight) {
        issues.push({ id: `${group.id}-height-range`, level: 'error', title: 'Height/length limits are invalid', message: 'Minimum height/length cannot be greater than maximum height/length.' });
      }
      if (group.increment !== undefined && group.increment <= 0) {
        issues.push({ id: `${group.id}-size-increment`, level: 'warning', title: 'Size increment is invalid', message: 'Use a positive custom-size increment such as 1 mm, 5 mm or 10 mm.' });
      }
    }


    if (group.compatibilityMode && group.compatibilityMode !== 'none') {
      const valuesWithCompatibility = (group.values || []).filter((value) =>
        value.compatibleMaterialIds?.length ||
        value.incompatibleMaterialIds?.length ||
        value.compatibleFinishIds?.length ||
        value.incompatibleFinishIds?.length ||
        value.compatiblePrinterIds?.length
      );
      if (!group.compatibilityNotes) {
        issues.push({ id: `${group.id}-compatibility-notes`, level: 'warning', title: `${valueLabel(group)} compatibility note missing`, message: 'Add a short note explaining why this material/finish/size is limited so future admins understand the setup.' });
      }
      if ((group.values || []).length && valuesWithCompatibility.length === 0) {
        issues.push({ id: `${group.id}-compatibility-values`, level: 'warning', title: `${valueLabel(group)} compatibility not mapped`, message: 'Compatibility mode is enabled, but no option value has linked compatible materials, finishes or printers yet.' });
      }
    }

    if (group.source === 'quantity') {
      if (group.quantityMode === 'range-with-step') {
        if (!group.minQuantity || !group.maxQuantity || !group.quantityStep) {
          issues.push({ id: `${group.id}-quantity-range`, level: 'warning', title: 'Quantity range incomplete', message: 'Range quantity mode needs minimum quantity, maximum quantity and step.' });
        }
        if (group.minQuantity && group.maxQuantity && group.minQuantity > group.maxQuantity) {
          issues.push({ id: `${group.id}-quantity-range-invalid`, level: 'error', title: 'Quantity range is invalid', message: 'Minimum quantity cannot be greater than maximum quantity.' });
        }
      }
    }

  });

  groups.forEach((group) => {
    (group.dependencyRules || []).forEach((rule) => {
      if (!rule.whenGroupKey || !rule.whenValueId) {
        issues.push({ id: `${group.id}-${rule.id}-incomplete-rule`, level: 'warning', title: 'Incomplete dependency rule', message: 'Choose both the source group and source value for each show/hide/require rule.' });
      }
      if (rule.whenGroupKey && !groupKeys.has(rule.whenGroupKey)) {
        issues.push({ id: `${group.id}-${rule.id}-missing-source-group`, level: 'error', title: `Unknown source group ${rule.whenGroupKey}`, message: 'The dependency rule points to an option group that does not exist.' });
      }
      if (rule.whenGroupKey && rule.whenValueId && valuesByGroup.has(rule.whenGroupKey) && !valuesByGroup.get(rule.whenGroupKey)?.has(rule.whenValueId)) {
        issues.push({ id: `${group.id}-${rule.id}-missing-source-value`, level: 'warning', title: `Unknown source value ${rule.whenValueId}`, message: 'The dependency rule points to a value that is not available in the selected source group.' });
      }
      const target = rule.targetGroupKey || groupKey(group);
      if (target && !groupKeys.has(target)) {
        issues.push({ id: `${group.id}-${rule.id}-missing-target-group`, level: 'error', title: `Unknown target group ${target}`, message: 'The dependency rule target group does not exist.' });
      }
    });
  });

  const artworkRules = product.templateRules?.artworkRules;
  if (artworkRules) {
    if (!artworkRules.allowedFileTypes?.length) issues.push({ id: 'artwork-file-types', level: 'warning', title: 'Artwork file types missing', message: 'Add allowed file types such as pdf, ai, eps or jpg.' });
    if (artworkRules.requirePdf && !(artworkRules.allowedFileTypes || []).includes('pdf')) issues.push({ id: 'artwork-require-pdf', level: 'error', title: 'PDF is required but not allowed', message: 'Add pdf to allowed file types or turn off Require PDF.' });
    if (artworkRules.minFiles > artworkRules.maxFiles) issues.push({ id: 'artwork-file-count', level: 'error', title: 'Artwork file count is invalid', message: 'Minimum files cannot be greater than maximum files.' });
    if (artworkRules.uploadChoiceMode === 'template-only' && !artworkRules.allowDesignFromTemplate) issues.push({ id: 'artwork-template-mode', level: 'error', title: 'Template-only mode is incomplete', message: 'Template-only upload mode needs design-from-template enabled.' });
    if (artworkRules.uploadChoiceMode === 'upload-only' && artworkRules.allowUploadArtwork === false) issues.push({ id: 'artwork-upload-disabled', level: 'error', title: 'Artwork upload is disabled', message: 'Upload-only mode cannot disable artwork uploads.' });
    if (artworkRules.requireCutline && !artworkRules.cutlineLayerName) issues.push({ id: 'artwork-cutline-layer', level: 'warning', title: 'Cutline layer name missing', message: 'Cutline-required products need a layer name such as CutContour.' });
    if (artworkRules.sizeMatchingMode === 'match-selected-size' && !hasGroup(groups, 'size')) issues.push({ id: 'artwork-size-match-no-size', level: 'warning', title: 'Artwork must match selected size', message: 'Add a size option group so the upload checker can compare artwork to the customer selection later.' });
  }

  return issues;
}

export function productConfigurationReadinessLabel(issues: ProductConfigurationIssue[]) {
  if (issues.some((issue) => issue.level === 'error')) return 'Needs fixing';
  if (issues.some((issue) => issue.level === 'warning')) return 'Needs review';
  return 'Ready for pricing setup';
}
