'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Label from '@radix-ui/react-label';
import { preventAutoFocusOnTouch } from '@/lib/useIsMobile';
import { EXPENSE_CATEGORIES } from '@/lib/categories';

interface Props {
  accountId: number;
  onAdded: () => void;
}

export function AddExpenseDialog({ accountId, onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [category, setCategory] = useState('rent');
  const [frequency, setFrequency] = useState('monthly');
  const [isVariable, setIsVariable] = useState(false);
  const [budgetGoal, setBudgetGoal] = useState('');
  const [billingCycleDay, setBillingCycleDay] = useState('');
  const [anchorDate, setAnchorDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isWeeklyBased = frequency === 'weekly' || frequency === 'bi_weekly';
  const isBiWeekly = frequency === 'bi_weekly';
  const dayLabel = isWeeklyBased ? 'Day of Week' : 'Day of Month';
  const dayMax = isWeeklyBased ? 6 : 31;
  const dayPlaceholder = isWeeklyBased ? '0 = Sunday, 6 = Saturday' : '1-31 (adjusted if month is shorter)';

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    // Allow numbers with optional decimal point and up to 2 decimal places
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
    }
  }

  function handleBudgetGoalChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setBudgetGoal(value);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const amountValue = parseFloat(amount.replace(/,/g, ''));
    const budgetGoalValue = budgetGoal ? parseFloat(budgetGoal.replace(/,/g, '')) : null;
    const billingCycleDayValue = billingCycleDay ? parseInt(billingCycleDay) : null;

    setIsSubmitting(true);
    try {
      await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
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

      setOpen(false);
      setName('');
      setAmount('');
      setDayOfMonth('1');
      setCategory('rent');
      setFrequency('monthly');
      setIsVariable(false);
      setBudgetGoal('');
      setBillingCycleDay('');
      setAnchorDate('');
      onAdded();
    } catch (error) {
      console.error('Error adding expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button style={buttonStyle}>+ Add Expense</button>
      </Dialog.Trigger>
      <Dialog.Portal container={typeof document !== 'undefined' ? document.body : undefined}>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content" onOpenAutoFocus={preventAutoFocusOnTouch}>
          <Dialog.Title style={titleStyle}>Add Recurring Expense</Dialog.Title>
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
                inputMode="decimal"
                value={amount}
                onChange={handleAmountChange}
                required
                style={inputStyle}
                placeholder="e.g., 1200.00"
              />
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
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="add-expense-isVariable"
                checked={isVariable}
                onChange={(e) => setIsVariable(e.target.checked)}
              />
              <Label.Root htmlFor="add-expense-isVariable" style={{ fontSize: 'var(--font-body)', cursor: 'pointer' }}>
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
                    inputMode="decimal"
                    value={budgetGoal}
                    onChange={handleBudgetGoalChange}
                    style={inputStyle}
                    placeholder="e.g., 2500"
                  />
                </div>
                <div>
                  <Label.Root style={labelStyle}>
                    Billing Cycle Day (optional)
                    <span style={hintStyle}>For credit cards: day of month the billing cycle starts (e.g., 16)</span>
                  </Label.Root>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={billingCycleDay}
                    onChange={(e) => setBillingCycleDay(e.target.value)}
                    style={inputStyle}
                    min="1"
                    max="31"
                    placeholder="e.g., 16"
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
                {isSubmitting ? 'Adding...' : 'Add'}
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
