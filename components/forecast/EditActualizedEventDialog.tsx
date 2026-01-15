'use client';

import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Label from '@radix-ui/react-label';
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

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setDate(formatDateUTC(event.date));
      setDescription(event.description);
      setAmount(Math.abs(event.amount).toString());
      setIsExpense(event.amount < 0);
      setShowDeleteConfirm(false);
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
      alert('Failed to update transaction');
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
      alert('Failed to delete transaction');
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
        <Dialog.Overlay style={overlayStyle} />
        <Dialog.Content style={contentStyle}>
          <Dialog.Title style={titleStyle}>Edit Actual Transaction</Dialog.Title>
          
          {isLinked && (
            <div style={{
              padding: '0.75rem',
              background: 'var(--info-bg, #eff6ff)',
              border: '1px solid var(--info-border, #bfdbfe)',
              borderRadius: '6px',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              color: 'var(--info-text, #1e40af)',
            }}>
              ℹ️ This transaction is linked to a recurring {event.incomeRuleId ? 'income' : 'expense'}.
              Editing here updates this occurrence only.
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
              <Label.Root style={labelStyle}>Amount ($)</Label.Root>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select
                  value={isExpense ? 'expense' : 'income'}
                  onChange={(e) => setIsExpense(e.target.value === 'expense')}
                  style={{ ...inputStyle, width: 'auto', minWidth: '100px' }}
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
                  style={{ ...inputStyle, flex: 1 }}
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

            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              gap: '0.75rem', 
              marginTop: '1.5rem' 
            }}>
              <div>
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    style={deleteButtonStyle}
                  >
                    Delete
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.875rem', color: '#dc2626' }}>Sure?</span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      style={{ ...deleteButtonStyle, background: '#dc2626', color: 'white' }}
                    >
                      {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      style={cancelButtonStyle}
                    >
                      No
                    </button>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Dialog.Close asChild>
                  <button type="button" style={cancelButtonStyle}>
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    ...submitButtonStyle,
                    opacity: isSubmitting ? 0.5 : 1,
                  }}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

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
  maxWidth: '450px',
  width: '90%',
  maxHeight: '90vh',
  overflow: 'auto',
  zIndex: 51,
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: '600',
  marginBottom: '1rem',
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

const cancelButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  background: 'var(--bg-tertiary)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-primary)',
  borderRadius: '4px',
  fontSize: '0.875rem',
  fontWeight: '500',
  cursor: 'pointer',
};

const submitButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  background: '#1a1a1a',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  fontSize: '0.875rem',
  fontWeight: '500',
  cursor: 'pointer',
};

const deleteButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  background: 'transparent',
  color: '#dc2626',
  border: '1px solid #dc2626',
  borderRadius: '4px',
  fontSize: '0.875rem',
  fontWeight: '500',
  cursor: 'pointer',
};
