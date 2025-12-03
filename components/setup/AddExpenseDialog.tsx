'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Label from '@radix-ui/react-label';

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isWeeklyBased = frequency === 'weekly' || frequency === 'bi_weekly';
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const amountValue = parseFloat(amount.replace(/,/g, ''));

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
        }),
      });

      setOpen(false);
      setName('');
      setAmount('');
      setDayOfMonth('1');
      setCategory('rent');
      setFrequency('monthly');
      setIsVariable(false);
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
        <Dialog.Overlay style={overlayStyle} />
        <Dialog.Content style={contentStyle}>
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
                  style={inputStyle}
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
                style={inputStyle}
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
            <div>
              <Label.Root style={labelStyle}>Frequency</Label.Root>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                style={inputStyle}
              >
                <option value="weekly">Weekly</option>
                <option value="bi_weekly">Bi-Weekly (Every 2 weeks)</option>
                <option value="semi_monthly">Semi-Monthly (2x/month)</option>
                <option value="monthly">Monthly</option>
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
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
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
  background: 'white',
  color: '#1a1a1a',
  border: '1px solid #e0e0e0',
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
  background: 'white',
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
  border: '1px solid #e0e0e0',
  borderRadius: '4px',
  fontSize: '0.875rem',
};
