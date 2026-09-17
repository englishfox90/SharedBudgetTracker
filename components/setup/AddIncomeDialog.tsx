'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Label from '@radix-ui/react-label';
import { PlusIcon } from '../icons';
import { preventAutoFocusOnTouch } from '@/lib/useIsMobile';
import {
  PaycheckFields,
  PaycheckFormState,
  emptyPaycheckForm,
  paycheckFormToPayload,
} from './PaycheckFields';

interface Props {
  accountId: number;
  onAdded: () => void;
}

export function AddIncomeDialog({ accountId, onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [annualSalary, setAnnualSalary] = useState('');
  const [payFrequency, setPayFrequency] = useState('semi_monthly');
  const [payDay1, setPayDay1] = useState('1');
  const [payDay2, setPayDay2] = useState('15');
  const [paycheck, setPaycheck] = useState<PaycheckFormState>(emptyPaycheckForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSalaryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    // Allow numbers with optional decimal point and up to 2 decimal places
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setAnnualSalary(value);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const payDays = payFrequency === 'monthly' ? [parseInt(payDay1)] : [parseInt(payDay1), parseInt(payDay2)];
    const salaryValue = parseFloat(annualSalary.replace(/,/g, ''));

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/income-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          name,
          annualSalary: salaryValue,
          contributionAmount: 0,
          payFrequency,
          payDays,
          ...paycheckFormToPayload(paycheck),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Could not add this income source.');
        return;
      }

      setOpen(false);
      setName('');
      setAnnualSalary('');
      setPaycheck(emptyPaycheckForm);
      onAdded();
    } catch (error) {
      console.error('Error adding income rule:', error);
      setError('Could not add this income source.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="btn btn-primary btn-sm"><PlusIcon size={16} /> Add income</button>
      </Dialog.Trigger>
      <Dialog.Portal container={typeof document !== 'undefined' ? document.body : undefined}>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content dialog-content--wide" onOpenAutoFocus={preventAutoFocusOnTouch}>
          <Dialog.Title className="dialog-title">Add Income Source</Dialog.Title>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <Label.Root className="label">Name</Label.Root>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="input"
                placeholder="e.g., Person A Salary"
              />
            </div>
            <div>
              <Label.Root className="label">Annual Salary ($)</Label.Root>
              <input
                type="text"
                inputMode="decimal"
                value={annualSalary}
                onChange={handleSalaryChange}
                required
                className="input"
                placeholder="e.g., 65000.00"
              />
            </div>
            <div>
              <Label.Root className="label">Pay Frequency</Label.Root>
              <select
                value={payFrequency}
                onChange={(e) => setPayFrequency(e.target.value)}
                className="select"
              >
                <option value="monthly">Monthly</option>
                <option value="semi_monthly">Semi-Monthly (2x/month)</option>
                <option value="bi_weekly">Bi-Weekly (every 2 weeks)</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: payFrequency === 'monthly' ? '1fr' : '1fr 1fr', gap: '1rem' }}>
              <div>
                <Label.Root className="label">Pay Day {payFrequency === 'monthly' ? '' : '1'}</Label.Root>
                <input
                  type="number"
                  value={payDay1}
                  onChange={(e) => setPayDay1(e.target.value)}
                  required
                  className="input"
                  min="1"
                  max="31"
                />
              </div>
              {payFrequency !== 'monthly' && (
                <div>
                  <Label.Root className="label">Pay Day 2</Label.Root>
                  <input
                    type="number"
                    value={payDay2}
                    onChange={(e) => setPayDay2(e.target.value)}
                    required
                    className="input"
                    min="1"
                    max="31"
                  />
                </div>
              )}
            </div>
            <div style={{ borderTop: '1px solid var(--border-secondary)', paddingTop: '1rem' }}>
              <PaycheckFields
                annualSalary={parseFloat(annualSalary.replace(/,/g, '')) || 0}
                payFrequency={payFrequency}
                value={paycheck}
                onChange={setPaycheck}
              />
            </div>

            {error && (
              <p style={{ color: 'var(--color-danger)', fontSize: 'var(--font-small)', margin: 0 }}>
                {error}
              </p>
            )}

            <div className="dialog-actions" style={{ marginTop: '1rem' }}>
              <Dialog.Close asChild>
                <button type="button" className="btn btn-secondary">
                  Cancel
                </button>
              </Dialog.Close>
              <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ opacity: isSubmitting ? 0.5 : 1 }}>
                {isSubmitting ? 'Adding...' : 'Add'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

