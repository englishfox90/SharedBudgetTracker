'use client';

import { useState, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Label from '@radix-ui/react-label';
import { formatDateUTC } from '@/lib/date-utils';
import { isTouchDevice } from '@/lib/useIsMobile';

interface CashEvent {
  date: Date;
  description: string;
  amount: number;
  type: string;
  incomeRuleId?: number;
  recurringExpenseId?: number;
  category?: string;
}

interface Props {
  event: CashEvent;
  accountId: number;
  onActualized: () => void;
}

/** Fallback for events that don't carry a category (older forecasts). */
function guessCategory(event: CashEvent): string {
  if (event.type === 'income') return 'income';
  const desc = event.description.toLowerCase();
  if (desc.includes('credit card')) return 'credit_card_payment';
  if (desc.includes('rent') || desc.includes('mortgage')) return 'rent';
  if (desc.includes('loan')) return 'loan_payment';
  if (desc.includes('insurance')) return 'insurance';
  if (desc.includes('utilit') || desc.includes('electric') || desc.includes('water') || desc.includes('gas')) return 'utilities';
  if (desc.includes('auto') || desc.includes('car')) return 'auto';
  if (desc.includes('subscription')) return 'subscription';
  if (desc.includes('bill')) return 'bills';
  return 'other';
}

export default function ActualizeEventDialog({ event, accountId, onActualized }: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(Math.abs(event.amount).toString());
  const [description, setDescription] = useState(event.description.replace(/ \(estimated\)$/i, ''));
  const [date, setDate] = useState(formatDateUTC(event.date));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setAmount(Math.abs(event.amount).toString());
      setDescription(event.description.replace(/ \(estimated\)$/i, ''));
      setDate(formatDateUTC(event.date));
    }
  }, [open, event]);

  /**
   * Radix focuses the first field on open. That used to be the date input,
   * which on phones pops the calendar picker before the user has done
   * anything. Instead: on desktop, focus and select the amount so it can be
   * overtyped; on touch devices, focus nothing so the user can simply tap
   * "Confirm" (the amount is already pre-filled).
   */
  function handleOpenAutoFocus(e: Event) {
    e.preventDefault();
    if (!isTouchDevice()) {
      amountInputRef.current?.focus();
      amountInputRef.current?.select();
    }
  }

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
      const category = event.category || guessCategory(event);

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

  const forecastedDisplay = Math.abs(event.amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <div
          role="button"
          tabIndex={0}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem',
            minHeight: '44px',
            background: 'var(--forecast-bg)',
            border: '1px solid var(--forecast-border)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: 'var(--font-body)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {event.description}:{' '}
            <span style={{
              fontWeight: '600',
              whiteSpace: 'nowrap',
              color: event.amount > 0 ? 'var(--color-success)' : 'var(--color-danger)',
            }}>
              {event.amount > 0 ? '+' : ''}${forecastedDisplay}
            </span>
          </div>
          <div style={{
            flexShrink: 0,
            padding: '0.25rem 0.5rem',
            background: 'var(--forecast-badge)',
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
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content" onOpenAutoFocus={handleOpenAutoFocus}>
          <Dialog.Title style={titleStyle}>Confirm Transaction</Dialog.Title>
          <Dialog.Description style={descriptionStyle}>
            Confirm this transaction happened. Adjust the amount if it differs from the forecast.
          </Dialog.Description>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <Label.Root htmlFor="actualize-amount" style={labelStyle}>
                Actual Amount ($)
              </Label.Root>
              <input
                id="actualize-amount"
                ref={amountInputRef}
                type="text"
                inputMode="decimal"
                value={formatAmountDisplay(amount)}
                onChange={handleAmountChange}
                placeholder="0.00"
                required
                style={{ ...inputStyle, fontSize: '1.125rem', fontWeight: 600 }}
              />
              <div style={{ fontSize: 'var(--font-small)', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Forecasted: ${forecastedDisplay}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <Label.Root htmlFor="actualize-description" style={labelStyle}>Description</Label.Root>
              <input
                id="actualize-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <Label.Root htmlFor="actualize-date" style={labelStyle}>Date</Label.Root>
              <input
                id="actualize-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            <div className="dialog-actions">
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

const titleStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: '600',
  marginBottom: '0.5rem',
};

const descriptionStyle: React.CSSProperties = {
  fontSize: 'var(--font-body)',
  color: 'var(--text-secondary)',
  marginBottom: '1.5rem',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 'var(--font-body)',
  fontWeight: '500',
  marginBottom: '0.25rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: '1px solid var(--border-primary)',
  borderRadius: '6px',
  fontSize: '0.875rem',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
};

const cancelButtonStyle: React.CSSProperties = {
  padding: '0.625rem 1rem',
  background: 'var(--bg-tertiary)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-primary)',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: 'var(--font-body)',
  fontWeight: '500',
};

const submitButtonStyle: React.CSSProperties = {
  padding: '0.625rem 1.25rem',
  background: 'var(--button-bg)',
  color: 'var(--button-text)',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: 'var(--font-body)',
  fontWeight: '600',
};
