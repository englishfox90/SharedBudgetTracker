'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Label from '@radix-ui/react-label';
import { preventAutoFocusOnTouch } from '@/lib/useIsMobile';
import { INCOME_CATEGORIES, TRANSACTION_EXPENSE_CATEGORIES, withCurrentOption } from '@/lib/categories';

interface Props {
  accountId: number;
  onAdded: () => void;
}

export default function AddTransactionDialog({ accountId, onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [isExpense, setIsExpense] = useState(true);
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setDate('');
    setDescription('');
    setAmount('');
    setIsExpense(true);
    setCategory('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const finalAmount = isExpense ? -Math.abs(parseFloat(amount)) : Math.abs(parseFloat(amount));
      
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          date,
          description,
          amount: finalAmount,
          category: category || null,
        }),
      });

      if (!res.ok) throw new Error('Failed to add transaction');

      resetForm();
      setOpen(false);
      onAdded();
    } catch (error) {
      console.error('Error adding transaction:', error);
      setError('Could not add the transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    // Allow numbers and optional decimal point with up to 2 decimal places (no negative sign needed)
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="btn btn-primary btn-sm">+ Add Transaction</button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content" onOpenAutoFocus={preventAutoFocusOnTouch}>
          <Dialog.Title className="dialog-title">Add One-Time Transaction</Dialog.Title>
          <Dialog.Description className="dialog-description">
            Add an unplanned expense or transfer to adjust the account balance for a specific date.
          </Dialog.Description>

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
                placeholder="e.g., Emergency car repair"
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
                  placeholder="0.00"
                  required
                  className="input" style={{ flex: 1, minWidth: 0 }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <Label.Root className="label">Category (Optional)</Label.Root>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="select">
                <option value="">-- Select Category --</option>
                <optgroup label="Income & Transfers">
                  {INCOME_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Expenses">
                  {withCurrentOption(TRANSACTION_EXPENSE_CATEGORIES, null).map((c) => (
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
                {isSubmitting ? 'Adding...' : 'Add Transaction'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

