'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Label from '@radix-ui/react-label';
import { format } from 'date-fns';

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
  const [date, setDate] = useState(format(new Date(transaction.date), 'yyyy-MM-dd'));
  const [description, setDescription] = useState(transaction.description);
  const [amount, setAmount] = useState(transaction.amount.toString());
  const [category, setCategory] = useState(transaction.category || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isActualized = transaction.incomeRuleId !== null || transaction.recurringExpenseId !== null;

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    // Allow negative sign, numbers, and optional decimal point with up to 2 decimal places
    if (value === '' || value === '-' || /^-?\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          description,
          amount: parseFloat(amount),
          category: category || null,
        }),
      });

      if (!res.ok) throw new Error('Failed to update transaction');

      setOpen(false);
      onUpdated();
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert('Failed to update transaction');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button style={triggerButtonStyle}>Edit</button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay style={overlayStyle} />
        <Dialog.Content style={contentStyle}>
          <Dialog.Title style={titleStyle}>Edit Transaction</Dialog.Title>
          
          {isActualized && (
            <div style={{
              padding: '0.75rem',
              background: '#dcfce7',
              border: '1px solid #bbf7d0',
              borderRadius: '6px',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              color: '#166534'
            }}>
              <strong>✓ Actualized Transaction</strong>
              <div style={{ marginTop: '0.25rem', fontSize: '0.8125rem' }}>
                This transaction is linked to a forecasted event. You can edit the description or category, but the amount and date should match the actual transaction.
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <Label.Root style={labelStyle}>Date</Label.Root>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <Label.Root style={labelStyle}>Description</Label.Root>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <Label.Root style={labelStyle}>
                Amount ($) - Negative for expenses, positive for deposits
              </Label.Root>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={handleAmountChange}
                required
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <Label.Root style={labelStyle}>Category</Label.Root>
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={selectStyle}>
                <option value="">-- Select Category --</option>
                <optgroup label="Income & Transfers">
                  <option value="income">Income</option>
                  <option value="transfer_in">Transfer In</option>
                </optgroup>
                <optgroup label="Expenses">
                  <option value="auto">Auto</option>
                  <option value="bills">Bills</option>
                  <option value="credit_card_payment">Credit Card Payment</option>
                  <option value="insurance">Insurance</option>
                  <option value="loan_payment">Loan Payment</option>
                  <option value="other">Other</option>
                  <option value="rent">Rent/Mortgage</option>
                  <option value="subscription">Subscription</option>
                  <option value="transfer_out">Transfer Out</option>
                  <option value="utilities">Utilities</option>
                </optgroup>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <Dialog.Close asChild>
                <button type="button" style={cancelButtonStyle} disabled={isSubmitting}>
                  Cancel
                </button>
              </Dialog.Close>
              <button type="submit" style={submitButtonStyle} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const triggerButtonStyle: React.CSSProperties = {
  padding: '0.375rem 0.75rem',
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border-primary)',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '0.75rem',
  fontWeight: '500',
  color: 'var(--text-primary)',
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
  width: '90%',
  maxWidth: '500px',
  maxHeight: '85vh',
  overflow: 'auto',
  zIndex: 51,
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: '600',
  marginBottom: '1.5rem',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: '500',
  marginBottom: '0.25rem',
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

const cancelButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  background: 'var(--bg-tertiary)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-primary)',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.875rem',
};

const submitButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  background: '#1a1a1a',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.875rem',
};
