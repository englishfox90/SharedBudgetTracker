/** Shared category definitions so every dropdown and label agrees. */

export const EXPENSE_CATEGORIES: Array<{ value: string; label: string }> = [
  { value: 'auto', label: 'Auto' },
  { value: 'bills', label: 'Bills' },
  { value: 'credit_card_payment', label: 'Credit Card Payment' },
  { value: 'housing', label: 'Housing' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'loan_payment', label: 'Loan Payment' },
  { value: 'rent', label: 'Rent/Mortgage' },
  { value: 'services', label: 'Services' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'other', label: 'Other' },
];

export const INCOME_CATEGORIES: Array<{ value: string; label: string }> = [
  { value: 'income', label: 'Income' },
  { value: 'transfer_in', label: 'Transfer In' },
];

export const TRANSACTION_EXPENSE_CATEGORIES: Array<{ value: string; label: string }> = [
  ...EXPENSE_CATEGORIES.filter((c) => c.value !== 'other'),
  { value: 'transfer_out', label: 'Transfer Out' },
  { value: 'other', label: 'Other' },
];

const ALL_LABELS: Record<string, string> = Object.fromEntries(
  [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES, ...TRANSACTION_EXPENSE_CATEGORIES].map((c) => [c.value, c.label])
);

/** Human-readable label for a stored category value. */
export function formatCategory(category: string | null | undefined): string {
  if (!category) return 'Uncategorized';
  return (
    ALL_LABELS[category] ||
    category
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
}

/**
 * Options for a select, guaranteeing the current value is present even if it
 * is not one of the standard categories (e.g. imported data).
 */
export function withCurrentOption(
  options: Array<{ value: string; label: string }>,
  current: string | null | undefined
): Array<{ value: string; label: string }> {
  if (!current || options.some((o) => o.value === current)) return options;
  return [...options, { value: current, label: formatCategory(current) }];
}
