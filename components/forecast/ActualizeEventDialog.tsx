'use client';

import { useState, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Label from '@radix-ui/react-label';
import { formatDateUTC } from '@/lib/date-utils';
import { isTouchDevice } from '@/lib/useIsMobile';
import { actualizeEvent, cleanDescription, formatMoney } from '@/lib/actualize';
import type { CashEvent } from '@/types';
import { AlertOctagonIcon } from '../icons';

interface Props {
  event: CashEvent;
  accountId: number;
  onActualized: () => void;
  /** The element that opens the dialog */
  children: React.ReactNode;
}

export default function ActualizeEventDialog({ event, accountId, onActualized, children }: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(Math.abs(event.amount).toString());
  const [description, setDescription] = useState(cleanDescription(event.description));
  const [date, setDate] = useState(formatDateUTC(event.date));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setAmount(Math.abs(event.amount).toString());
      setDescription(cleanDescription(event.description));
      setDate(formatDateUTC(event.date));
      setError(null);
    }
  }, [open, event]);

  /**
   * On desktop, focus and select the amount so it can be overtyped. On touch
   * devices focus nothing, so no keyboard or date picker pops up on open.
   */
  function handleOpenAutoFocus(e: Event) {
    e.preventDefault();
    if (!isTouchDevice()) {
      amountInputRef.current?.focus();
      amountInputRef.current?.select();
    }
  }

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/,/g, '');
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
    }
  }

  function formatAmountDisplay(value: string): string {
    if (value === '' || value === '.') return value;
    const parts = value.split('.');
    parts[0] = parseFloat(parts[0] || '0').toLocaleString('en-US');
    return parts.join('.');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await actualizeEvent(event, accountId, { amount: parseFloat(amount), description, date });
      setOpen(false);
      onActualized();
    } catch (err) {
      console.error('Error actualizing transaction:', err);
      setError('Could not record the transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const forecastedDisplay = formatMoney(Math.abs(event.amount));

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content" onOpenAutoFocus={handleOpenAutoFocus}>
          <Dialog.Title className="dialog-title">Confirm transaction</Dialog.Title>
          <Dialog.Description className="dialog-description">
            Adjust the amount if it differs from the forecast, then confirm.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="stack">
            <div>
              <Label.Root htmlFor="actualize-amount" className="label">Actual amount ($)</Label.Root>
              <input
                id="actualize-amount"
                ref={amountInputRef}
                type="text"
                inputMode="decimal"
                value={formatAmountDisplay(amount)}
                onChange={handleAmountChange}
                placeholder="0.00"
                required
                className="input input--lg"
              />
              <span className="hint">Forecast: {forecastedDisplay}</span>
            </div>

            <div>
              <Label.Root htmlFor="actualize-description" className="label">Description</Label.Root>
              <input
                id="actualize-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="input"
              />
            </div>

            <div>
              <Label.Root htmlFor="actualize-date" className="label">Date</Label.Root>
              <input
                id="actualize-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="input"
              />
            </div>

            {error && (
              <div className="alert alert--danger">
                <AlertOctagonIcon size={18} />
                <div>{error}</div>
              </div>
            )}

            <div className="dialog-actions" style={{ marginTop: '0.5rem' }}>
              <Dialog.Close asChild>
                <button type="button" className="btn btn-secondary" disabled={isSubmitting}>
                  Cancel
                </button>
              </Dialog.Close>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Confirming…' : 'Confirm transaction'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
