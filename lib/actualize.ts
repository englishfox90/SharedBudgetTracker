import type { CashEvent } from '@/types';
import { formatDateUTC } from '@/lib/date-utils';

/** Fallback for events that don't carry a category (older forecasts). */
export function guessCategory(event: Pick<CashEvent, 'type' | 'description'>): string {
  if (event.type === 'income') return 'income';
  const desc = event.description.toLowerCase();
  if (desc.includes('credit card')) return 'credit_card_payment';
  if (desc.includes('rent') || desc.includes('mortgage')) return 'rent';
  if (desc.includes('loan')) return 'loan_payment';
  if (desc.includes('insurance')) return 'insurance';
  if (desc.includes('utilit') || desc.includes('electric') || desc.includes('water') || desc.includes('gas')) return 'utilities';
  if (desc.includes('auto') || desc.includes('car')) return 'auto';
  if (desc.includes('subscription')) return 'subscription';
  if (desc.includes('bill')) return 'bills';
  return 'other';
}

/** Strip the "(estimated)" suffix the forecast adds to variable expenses. */
export function cleanDescription(description: string): string {
  return description.replace(/ \(estimated\)$/i, '');
}

interface ActualizeInput {
  amount?: number;      // absolute value; defaults to the forecast amount
  description?: string;
  date?: string;        // YYYY-MM-DD; defaults to the event date
}

/**
 * Record a forecast event as an actual transaction. Used by both the
 * one-tap confirm button and the confirm dialog.
 */
export async function actualizeEvent(event: CashEvent, accountId: number, input: ActualizeInput = {}): Promise<void> {
  const absAmount = input.amount ?? Math.abs(event.amount);
  const finalAmount = event.amount < 0 ? -Math.abs(absAmount) : Math.abs(absAmount);

  const res = await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accountId,
      date: input.date ?? formatDateUTC(event.date),
      description: input.description ?? cleanDescription(event.description),
      amount: finalAmount,
      category: event.category || guessCategory(event),
      incomeRuleId: event.incomeRuleId || null,
      recurringExpenseId: event.recurringExpenseId || null,
    }),
  });

  if (!res.ok) throw new Error('Failed to record transaction');
}

export function formatMoney(value: number, withSign = false): string {
  const abs = Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (withSign) return `${value < 0 ? '-' : '+'}$${abs}`;
  return `${value < 0 ? '-' : ''}$${abs}`;
}
