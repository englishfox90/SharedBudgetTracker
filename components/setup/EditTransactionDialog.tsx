'use client';

import { IconLabel, CheckIcon } from '../icons';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Label from '@radix-ui/react-label';
import { preventAutoFocusOnTouch } from '@/lib/useIsMobile';
import { INCOME_CATEGORIES, TRANSACTION_EXPENSE_CATEGORIES, withCurrentOption } from '@/lib/categories';
import { formatDateUTC } from '@/lib/date-utils';

interface Transaction {
  id: number;
  date: Date;
  description: string;
  amount: number;
  category: string | null;
  incomeRuleId: number | null;
  recurringExpenseId: number | null;
}

interface Props {
  transaction: Transaction;
  onUpdated: () => void;
}

export default function EditTransactionDialog({ transaction, onUpdated }: Props) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(formatDateUTC(transaction.date));
  const [description, setDescription] = useState(transaction.description);
  const [amount, setAmount] = useState(Math.abs(transaction.amount).toString());
  const [isExpense, setIsExpense] = useState(transaction.amount < 0);
  const [category, setCategory] = useState(transaction.category || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isActualized = transaction.incomeRuleId !== null || transaction.recurringExpenseId !== null;

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    // Allow numbers and optional decimal point with up to 2 decimal places (no negative sign needed)
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const finalAmount = isExpense ? -Math.abs(parseFloat(amount)) : Math.abs(parseFloat(amount));
      
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          description,
          amount: finalAmount,
          category: category || null,
        }),
      });

      if (!res.ok) throw new Error('Failed to update transaction');

      setOpen(false);
      onUpdated();
    } catch (error) {
      console.error('Error updating transaction:', error);
      setError('Could not update the transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="btn btn-secondary btn-sm">Edit</button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content" onOpenAutoFocus={preventAutoFocusOnTouch}>
          <Dialog.Title className="dialog-title">Edit Transaction</Dialog.Title>
          
          {isActualized && (
            <div style={{
              padding: '0.75rem',
              background: 'var(--safe-bg)',
              border: '1px solid var(--safe-border)',
              borderRadius: '6px',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              color: 'var(--safe-text)'
            }}>
              <strong><IconLabel icon={<CheckIcon size={14} />}>Actualized Transaction</IconLabel></strong>
              <div style={{ marginTop: '0.25rem', fontSize: '0.8125rem' }}>
                This transaction is linked to a forecasted event. You can edit the description or category, but the amount and date should match the actual transaction.
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <Label.Root className="label">Date</Label.Root>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="input"
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <Label.Root className="label">Description</Label.Root>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="input"
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <Label.Root className="label">Amount ($)</Label.Root>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select
                  value={isExpense ? 'expense' : 'income'}
                  onChange={(e) => setIsExpense(e.target.value === 'expense')}
                  className="select" style={{ width: 'auto', minWidth: 0, flex: '0 0 auto' }}
                >
                  <option value="expense">Expense (−)</option>
                  <option value="income">Income (+)</option>
                </select>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={handleAmountChange}
                  required
                  className="input" style={{ flex: 1, minWidth: 0 }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <Label.Root className="label">Category</Label.Root>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="select">
                <option value="">-- Select Category --</option>
                <optgroup label="Income & Transfers">
                  {INCOME_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Expenses">
                  {withCurrentOption(TRANSACTION_EXPENSE_CATEGORIES, transaction.category).map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {error && <div className="alert alert--danger">{error}</div>}

            <div className="dialog-actions">
              <Dialog.Close asChild>
                <button type="button" className="btn btn-secondary" disabled={isSubmitting}>
                  Cancel
                </button>
              </Dialog.Close>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

