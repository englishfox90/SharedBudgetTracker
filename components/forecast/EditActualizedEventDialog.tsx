'use client';

import { InfoIcon } from '../icons';

import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Label from '@radix-ui/react-label';
import { preventAutoFocusOnTouch } from '@/lib/useIsMobile';
import { formatDateUTC } from '@/lib/date-utils';

interface CashEvent {
  date: Date;
  description: string;
  amount: number;
  type: 'income' | 'fixed_expense' | 'variable_expense';
  actualized?: boolean;
  transactionId?: number;
  incomeRuleId?: number;
  recurringExpenseId?: number;
  forecastedAmount?: number;
}

interface Props {
  event: CashEvent;
  onUpdated: () => void;
  children: React.ReactNode;
}

export default function EditActualizedEventDialog({ event, onUpdated, children }: Props) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(formatDateUTC(event.date));
  const [description, setDescription] = useState(event.description);
  const [amount, setAmount] = useState(Math.abs(event.amount).toString());
  const [isExpense, setIsExpense] = useState(event.amount < 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setDate(formatDateUTC(event.date));
      setDescription(event.description);
      setAmount(Math.abs(event.amount).toString());
      setIsExpense(event.amount < 0);
      setShowDeleteConfirm(false);
      setError(null);
    }
  }, [open, event]);

  const isLinked = event.incomeRuleId !== null || event.recurringExpenseId !== null;

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!event.transactionId) return;

    setIsSubmitting(true);
    try {
      const finalAmount = isExpense ? -Math.abs(parseFloat(amount)) : Math.abs(parseFloat(amount));
      
      const res = await fetch(`/api/transactions/${event.transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          description,
          amount: finalAmount,
        }),
      });

      if (!res.ok) throw new Error('Failed to update transaction');

      setOpen(false);
      onUpdated();
    } catch (error) {
      console.error('Error updating transaction:', error);
      setError('Could not save the transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!event.transactionId) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/transactions/${event.transactionId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete transaction');

      setOpen(false);
      onUpdated();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      setError('Could not delete the transaction. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {children}
      </Dialog.Trigger>

      <Dialog.Portal container={typeof document !== 'undefined' ? document.body : undefined}>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content" onOpenAutoFocus={preventAutoFocusOnTouch}>
          <Dialog.Title className="dialog-title">Edit Actual Transaction</Dialog.Title>
          
          {isLinked && (
            <div style={{
              padding: '0.75rem',
              background: 'var(--info-bg)',
              border: '1px solid var(--info-border)',
              borderRadius: '6px',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              color: 'var(--info-text)',
            }}>
              <InfoIcon size={14} style={{ marginRight: '0.375rem' }} />This transaction is linked to a recurring {event.incomeRuleId ? 'income' : 'expense'}.
              Editing here updates this occurrence only.
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
                  className="input" style={{ width: 'auto', minWidth: '0', flex: '0 0 auto' }}
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
                  placeholder="0.00"
                />
              </div>
            </div>

            {event.forecastedAmount !== undefined && (
              <div style={{
                padding: '0.75rem',
                background: 'var(--bg-tertiary)',
                borderRadius: '6px',
                marginBottom: '1rem',
                fontSize: '0.875rem',
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>Forecasted amount: </span>
                <span style={{ fontWeight: '600' }}>
                  ${Math.abs(event.forecastedAmount).toFixed(2)}
                </span>
              </div>
            )}

            {error && <div className="alert alert--danger">{error}</div>}

            <div className="dialog-actions">
              <Dialog.Close asChild>
                <button type="button" className="btn btn-secondary">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary" style={{ opacity: isSubmitting ? 0.5 : 1, }}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            <div style={{
              marginTop: '1rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-primary)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="btn btn-danger-soft"
                >
                  Delete this transaction
                </button>
              ) : (
                <>
                  <span style={{ fontSize: 'var(--font-body)', color: 'var(--color-danger)', fontWeight: 500 }}>Delete this transaction?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="btn btn-danger-soft" style={{ background: '#dc2626', color: 'white' }}
                  >
                    {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="btn btn-secondary"
                  >
                    No
                  </button>
                </>
              )}
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

