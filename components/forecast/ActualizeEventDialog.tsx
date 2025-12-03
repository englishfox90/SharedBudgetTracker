'use client';

import { useState, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Label from '@radix-ui/react-label';
import { formatDateUTC, formatDateLongUTC } from '@/lib/date-utils';

interface CashEvent {
  date: Date;
  description: string;
  amount: number;
  type: string;
  incomeRuleId?: number;
  recurringExpenseId?: number;
}

interface Props {
  event: CashEvent;
  accountId: number;
  onActualized: () => void;
}

export default function ActualizeEventDialog({ event, accountId, onActualized }: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(Math.abs(event.amount).toString());
  const [description, setDescription] = useState(event.description.replace(/ \(estimated\)$/i, ''));
  const [date, setDate] = useState(formatDateUTC(event.date));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Reset form and focus amount when dialog opens
  useEffect(() => {
    if (open) {
      setAmount(Math.abs(event.amount).toString());
      setDescription(event.description.replace(/ \(estimated\)$/i, ''));
      setDate(formatDateUTC(event.date));
      
      // Focus and select amount input
      setTimeout(() => {
        amountInputRef.current?.focus();
        amountInputRef.current?.select();
      }, 0);
    }
  }, [open, event]);

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/,/g, ''); // Remove existing commas
    // Allow numbers with optional decimal point and up to 2 decimal places
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
    }
  }

  function formatAmountDisplay(value: string): string {
    if (value === '' || value === '.') return value;
    const parts = value.split('.');
    // Add thousand separators to whole number part
    parts[0] = parseFloat(parts[0] || '0').toLocaleString('en-US');
    return parts.join('.');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Determine category based on event type and description
      let category = 'other';
      const desc = event.description.toLowerCase();
      
      if (event.type === 'income') {
        category = 'income';
      } else if (desc.includes('credit card')) {
        category = 'credit_card_payment';
      } else if (desc.includes('rent') || desc.includes('mortgage')) {
        category = 'rent';
      } else if (desc.includes('loan')) {
        category = 'loan_payment';
      } else if (desc.includes('insurance')) {
        category = 'insurance';
      } else if (desc.includes('utility') || desc.includes('utilities') || desc.includes('electric') || desc.includes('water') || desc.includes('gas')) {
        category = 'utilities';
      } else if (desc.includes('auto') || desc.includes('car')) {
        category = 'auto';
      } else if (desc.includes('subscription')) {
        category = 'subscription';
      } else if (desc.includes('bill')) {
        category = 'bills';
      }

      // Preserve the original sign from the event type
      const finalAmount = event.amount < 0 ? -Math.abs(parseFloat(amount)) : Math.abs(parseFloat(amount));

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          date,
          description,
          amount: finalAmount,
          category,
          incomeRuleId: event.incomeRuleId || null,
          recurringExpenseId: event.recurringExpenseId || null,
        }),
      });

      if (!res.ok) throw new Error('Failed to actualize transaction');

      setOpen(false);
      onActualized();
    } catch (error) {
      console.error('Error actualizing transaction:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem',
            background: '#fefce8',
            border: '1px solid #fde047',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#fef9c3';
            e.currentTarget.style.borderColor = '#facc15';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#fefce8';
            e.currentTarget.style.borderColor = '#fde047';
          }}
        >
          <div style={{ flex: 1 }}>
            {event.description}:{' '}
            <span style={{
              fontWeight: '600',
              color: event.amount > 0 ? '#16a34a' : '#dc2626',
            }}>
              {event.amount > 0 ? '+' : ''}${Math.abs(event.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div style={{
            padding: '0.25rem 0.5rem',
            background: '#eab308',
            color: 'white',
            borderRadius: '4px',
            fontSize: '0.625rem',
            fontWeight: '700',
            letterSpacing: '0.05em'
          }}>
            FORECAST
          </div>
        </div>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay style={overlayStyle} />
        <Dialog.Content style={contentStyle}>
          <Dialog.Title style={titleStyle}>Confirm Transaction</Dialog.Title>
          <Dialog.Description style={descriptionStyle}>
            Verify this transaction actually occurred. You can adjust the amount if it differs from the forecast.
          </Dialog.Description>

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
                Actual Amount ($)
              </Label.Root>
              <input
                ref={amountInputRef}
                type="text"
                inputMode="decimal"
                value={formatAmountDisplay(amount)}
                onChange={handleAmountChange}
                placeholder="0.00"
                required
                style={inputStyle}
              />
              <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                Forecasted: ${Math.abs(event.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <Dialog.Close asChild>
                <button type="button" style={cancelButtonStyle} disabled={isSubmitting}>
                  Cancel
                </button>
              </Dialog.Close>
              <button type="submit" style={submitButtonStyle} disabled={isSubmitting}>
                {isSubmitting ? 'Confirming...' : 'Confirm Transaction'}
              </button>
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
  background: 'white',
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
  marginBottom: '0.5rem',
};

const descriptionStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: '#666',
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
  border: '1px solid #e0e0e0',
  borderRadius: '4px',
  fontSize: '0.875rem',
};

const cancelButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  background: '#f5f5f5',
  border: '1px solid #e0e0e0',
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
