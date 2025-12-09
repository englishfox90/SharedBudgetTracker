'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Label from '@radix-ui/react-label';

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
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    try {
      await fetch('/api/income-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          name,
          annualSalary: salaryValue,
          contributionAmount: 0,
          payFrequency,
          payDays,
        }),
      });

      setOpen(false);
      setName('');
      setAnnualSalary('');
      onAdded();
    } catch (error) {
      console.error('Error adding income rule:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button style={buttonStyle}>+ Add Income Source</button>
      </Dialog.Trigger>
      <Dialog.Portal container={typeof document !== 'undefined' ? document.body : undefined}>
        <Dialog.Overlay style={overlayStyle} />
        <Dialog.Content style={contentStyle}>
          <Dialog.Title style={titleStyle}>Add Income Source</Dialog.Title>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <Label.Root style={labelStyle}>Name</Label.Root>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={inputStyle}
                placeholder="e.g., John's Salary"
              />
            </div>
            <div>
              <Label.Root style={labelStyle}>Annual Salary ($)</Label.Root>
              <input
                type="text"
                inputMode="decimal"
                value={annualSalary}
                onChange={handleSalaryChange}
                required
                style={inputStyle}
                placeholder="e.g., 72000.00"
              />
            </div>
            <div>
              <Label.Root style={labelStyle}>Pay Frequency</Label.Root>
              <select
                value={payFrequency}
                onChange={(e) => setPayFrequency(e.target.value)}
                style={selectStyle}
              >
                <option value="monthly">Monthly</option>
                <option value="semi_monthly">Semi-Monthly (2x/month)</option>
                <option value="bi_weekly">Bi-Weekly (every 2 weeks)</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: payFrequency === 'monthly' ? '1fr' : '1fr 1fr', gap: '1rem' }}>
              <div>
                <Label.Root style={labelStyle}>Pay Day {payFrequency === 'monthly' ? '' : '1'}</Label.Root>
                <input
                  type="number"
                  value={payDay1}
                  onChange={(e) => setPayDay1(e.target.value)}
                  required
                  style={inputStyle}
                  min="1"
                  max="31"
                />
              </div>
              {payFrequency !== 'monthly' && (
                <div>
                  <Label.Root style={labelStyle}>Pay Day 2</Label.Root>
                  <input
                    type="number"
                    value={payDay2}
                    onChange={(e) => setPayDay2(e.target.value)}
                    required
                    style={inputStyle}
                    min="1"
                    max="31"
                  />
                </div>
              )}
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
  background: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-primary)',
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
  background: 'var(--bg-secondary)',
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
