'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Label from '@radix-ui/react-label';
import { preventAutoFocusOnTouch } from '@/lib/useIsMobile';
import { RecurringExpense } from '@/types';
import { EXPENSE_CATEGORIES, withCurrentOption } from '@/lib/categories';

interface Props {
  expense: RecurringExpense;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function EditExpenseDialog({ expense, open, onOpenChange, onUpdate }: Props) {
  const [name, setName] = useState(expense.name);
  const [amount, setAmount] = useState(expense.amount.toLocaleString());
  const [dayOfMonth, setDayOfMonth] = useState(expense.dayOfMonth.toString());
  const [category, setCategory] = useState(expense.category);
  const [frequency, setFrequency] = useState(expense.frequency || 'monthly');
  const [isVariable, setIsVariable] = useState(expense.isVariable);
  const [budgetGoal, setBudgetGoal] = useState(
    expense.budgetGoal ? expense.budgetGoal.toLocaleString() : ''
  );
  const [billingCycleDay, setBillingCycleDay] = useState(
    expense.billingCycleDay ? expense.billingCycleDay.toString() : ''
  );
  const [anchorDate, setAnchorDate] = useState(
    expense.anchorDate ? new Date(expense.anchorDate).toISOString().split('T')[0] : ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isWeeklyBased = frequency === 'weekly' || frequency === 'bi_weekly';
  const isBiWeekly = frequency === 'bi_weekly';
  const dayLabel = isWeeklyBased ? 'Day of Week' : 'Day of Month';
  const dayMax = isWeeklyBased ? 6 : 31;
  const dayPlaceholder = isWeeklyBased ? '0 = Sunday, 6 = Saturday' : '1-31 (adjusted if month is shorter)';

  function formatCurrency(value: string): string {
    const num = value.replace(/[^0-9]/g, '');
    if (!num) return '';
    return parseInt(num).toLocaleString();
  }

  function handleAmountChange(value: string) {
    const formatted = formatCurrency(value);
    setAmount(formatted);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const amountValue = parseFloat(amount.replace(/,/g, ''));
    const budgetGoalValue = budgetGoal ? parseFloat(budgetGoal.replace(/,/g, '')) : null;
    const billingCycleDayValue = billingCycleDay ? parseInt(billingCycleDay) : null;

    setIsSubmitting(true);
    try {
      await fetch(`/api/expenses/${expense.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          amount: amountValue,
          dayOfMonth: parseInt(dayOfMonth),
          category,
          frequency,
          isVariable,
          budgetGoal: budgetGoalValue,
          billingCycleDay: billingCycleDayValue,
          anchorDate: anchorDate || null,
        }),
      });

      onOpenChange(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={typeof document !== 'undefined' ? document.body : undefined}>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content" onOpenAutoFocus={preventAutoFocusOnTouch}>
          <Dialog.Title style={titleStyle}>Edit Recurring Expense</Dialog.Title>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <Label.Root style={labelStyle}>Name</Label.Root>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={inputStyle}
                placeholder="e.g., Rent"
              />
            </div>
            <div>
              <Label.Root style={labelStyle}>Amount ($)</Label.Root>
              <input
                type="text"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                required
                style={inputStyle}
                placeholder="e.g., 1,200"
              />
            </div>
            <div>
              <Label.Root style={labelStyle}>Frequency</Label.Root>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                style={selectStyle}
              >
                <option value="weekly">Weekly</option>
                <option value="bi_weekly">Bi-Weekly (Every 2 weeks)</option>
                <option value="semi_monthly">Semi-Monthly (2x/month)</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            {isBiWeekly && (
              <div>
                <Label.Root style={labelStyle}>
                  Anchor Date (Starting Reference)
                  <span style={hintStyle}>When did/will the first payment occur?</span>
                </Label.Root>
                <input
                  type="date"
                  value={anchorDate}
                  onChange={(e) => setAnchorDate(e.target.value)}
                  required
                  style={inputStyle}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Expense will recur every 14 days from this date
                </div>
              </div>
            )}
            <div>
              <Label.Root style={labelStyle}>{dayLabel}</Label.Root>
              {isWeeklyBased ? (
                <select
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(e.target.value)}
                  required
                  style={selectStyle}
                >
                  <option value="0">Sunday</option>
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                  <option value="6">Saturday</option>
                </select>
              ) : (
                <>
                  <input
                    type="number"
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(e.target.value)}
                    required
                    style={inputStyle}
                    min="1"
                    max="31"
                    placeholder={dayPlaceholder}
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    If day exceeds month length, uses last day of month
                  </div>
                </>
              )}
            </div>
            <div>
              <Label.Root style={labelStyle}>Category</Label.Root>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={selectStyle}
              >
                {withCurrentOption(EXPENSE_CATEGORIES, expense.category).map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="edit-expense-isVariable"
                checked={isVariable}
                onChange={(e) => setIsVariable(e.target.checked)}
              />
              <Label.Root htmlFor="edit-expense-isVariable" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
                Variable amount (estimated from history)
              </Label.Root>
            </div>
            {isVariable && (
              <>
                <div>
                  <Label.Root style={labelStyle}>
                    Budget Goal (optional)
                    <span style={hintStyle}>Track spending vs goal in Budget tab</span>
                  </Label.Root>
                  <input
                    type="text"
                    value={budgetGoal}
                    onChange={(e) => setBudgetGoal(formatCurrency(e.target.value))}
                    style={inputStyle}
                    placeholder="e.g., 2,500"
                  />
                </div>
                <div>
                  <Label.Root style={labelStyle}>
                    Billing Cycle Day (optional)
                    <span style={hintStyle}>For credit cards: day of month billing cycle starts (e.g., 16)</span>
                  </Label.Root>
                  <input
                    type="number"
                    value={billingCycleDay}
                    onChange={(e) => setBillingCycleDay(e.target.value)}
                    style={inputStyle}
                    min="1"
                    max="31"
                    placeholder="e.g., 16 (analyzes 16th to 16th)"
                  />
                </div>
              </>
            )}
            <div className="dialog-actions" style={{ marginTop: '1rem' }}>
              <Dialog.Close asChild>
                <button type="button" style={buttonSecondaryStyle}>
                  Cancel
                </button>
              </Dialog.Close>
              <button type="submit" disabled={isSubmitting} style={{ ...buttonStyle, opacity: isSubmitting ? 0.5 : 1 }}>
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  background: 'var(--button-bg)',
  color: 'var(--button-text)',
  border: 'none',
  borderRadius: '4px',
  fontSize: '0.875rem',
  fontWeight: '500',
  cursor: 'pointer',
};

const buttonSecondaryStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  background: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-primary)',
  borderRadius: '4px',
  fontSize: '0.875rem',
  fontWeight: '500',
  cursor: 'pointer',
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: '600',
  marginBottom: '1.5rem',
};

const hintStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 'var(--font-small)',
  fontWeight: '400',
  color: 'var(--text-secondary)',
  marginTop: '0.125rem',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  fontWeight: '500',
  marginBottom: '0.25rem',
  display: 'block',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem',
  border: '1px solid var(--border-primary)',
  borderRadius: '4px',
  fontSize: '0.875rem',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem',
  border: '1px solid var(--border-primary)',
  borderRadius: '4px',
  fontSize: '0.875rem',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
};
