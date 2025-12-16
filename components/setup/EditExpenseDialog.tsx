'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Label from '@radix-ui/react-label';
import { RecurringExpense } from '@/types';

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isWeeklyBased = frequency === 'weekly' || frequency === 'bi_weekly';
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
        <Dialog.Overlay style={overlayStyle} />
        <Dialog.Content style={contentStyle}>
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
                  <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
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
                <option value="auto">Auto</option>
                <option value="bills">Bills</option>
                <option value="credit_card_payment">Credit Card Payment</option>
                <option value="insurance">Insurance</option>
                <option value="loan_payment">Loan Payment</option>
                <option value="other">Other</option>
                <option value="rent">Rent/Mortgage</option>
                <option value="subscription">Subscription</option>
                <option value="utilities">Utilities</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="isVariable"
                checked={isVariable}
                onChange={(e) => setIsVariable(e.target.checked)}
              />
              <Label.Root htmlFor="isVariable" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
                Variable amount (estimated from history)
              </Label.Root>
            </div>
            {isVariable && (
              <>
                <div>
                  <Label.Root style={labelStyle}>
                    Budget Goal (optional)
                    <span style={{ fontSize: '0.75rem', fontWeight: '400', color: '#666', marginLeft: '0.5rem' }}>
                      Track spending vs goal in Budget tab
                    </span>
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
                    <span style={{ fontSize: '0.75rem', fontWeight: '400', color: '#666', marginLeft: '0.5rem' }}>
                      For credit cards: day of month billing cycle starts (e.g., 16)
                    </span>
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
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
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
  background: '#1a1a1a',
  color: 'white',
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

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  zIndex: 50,
};

const contentStyle: React.CSSProperties = {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  background: 'var(--bg-secondary)',
  padding: '1.5rem',
  borderRadius: '8px',
  maxWidth: '500px',
  width: '90%',
  maxHeight: '90vh',
  overflow: 'auto',
  zIndex: 51,
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: '600',
  marginBottom: '1.5rem',
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
