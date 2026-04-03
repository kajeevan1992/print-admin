import type { SelectOption } from '@/types/common';

export const toSelectOptions = <T>(items: T[], getValue: (item: T) => string, getLabel: (item: T) => string): SelectOption[] =>
  items.map((item) => ({ value: getValue(item), label: getLabel(item) }));
