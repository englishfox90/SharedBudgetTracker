'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Label from '@radix-ui/react-label';
import { preventAutoFocusOnTouch } from '@/lib/useIsMobile';
import { IncomeRule } from '@/types';
import { ConfirmDialog } from '../dialogs';
import { formatMoney } from '@/lib/actualize';
import { TrashIcon } from '../icons';

interface Props {
  rule: IncomeRule;
  totalContribution: number;
  onUpdate: () => void;
  onDelete: () => void;
}

export function IncomeRuleCard({ rule, totalContribution, onUpdate, onDelete }: Props) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [annualSalary, setAnnualSalary] = useState(rule.annualSalary.toLocaleString());
  const [payDay1, setPayDay1] = useState('');
  const [payDay2, setPayDay2] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  function formatCurrency(value: string): string {
    const num = value.replace(/[^0-9]/g, '');
    if (!num) return '';
    return parseInt(num).toLocaleString();
  }

  function handleSalaryChange(value: string) {
    const formatted = formatCurrency(value);
    setAnnualSalary(formatted);
  }

  function openEditDialog() {
    const payDays = JSON.parse(rule.payDays) as number[];
    setAnnualSalary(rule.annualSalary.toLocaleString());
    setPayDay1(payDays[0]?.toString() || '1');
    setPayDay2(payDays[1]?.toString() || '15');
    setShowEditDialog(true);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    const salaryValue = parseFloat(annualSalary.replace(/,/g, ''));
    const payDays = rule.payFrequency === 'monthly' ? [parseInt(payDay1)] : [parseInt(payDay1), parseInt(payDay2)];

    setIsUpdating(true);
    try {
      await fetch(`/api/income-rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ annualSalary: salaryValue, payDays }),
      });
      setShowEditDialog(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating income rule:', error);
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await fetch(`/api/income-rules/${rule.id}`, { method: 'DELETE' });
      setShowDeleteConfirm(false);
      onDelete();
    } catch (error) {
      console.error('Error deleting income rule:', error);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  }

  const payDays = JSON.parse(rule.payDays) as number[];
  const payFrequencyLabel = {
    monthly: 'Monthly',
    semi_monthly: 'Semi-Monthly',
    bi_weekly: 'Bi-Weekly',
    weekly: 'Weekly',
  }[rule.payFrequency] || rule.payFrequency;

  const payDaysText = payDays.length === 1 
    ? `Day ${payDays[0]}`
    : `Days ${payDays.join(' & ')}`;

  const percentage = totalContribution > 0 
    ? Math.round((rule.contributionAmount / totalContribution) * 100) 
    : 0;

  return (
    <>
      <div className="list-item">
        <div className="list-item__body">
          <div className="list-item__title">
            {rule.name}
            <span className="pill pill--accent">{percentage}% of contributions</span>
          </div>
          <div className="list-item__meta">
            {formatMoney(rule.annualSalary)} a year · {payFrequencyLabel} · {payDaysText}
          </div>
        </div>
        <div className="list-item__amount">
          {formatMoney(rule.contributionAmount)}<small>per paycheck</small>
        </div>
        <div className="list-item__actions">
          <button onClick={openEditDialog} className="btn btn-secondary btn-sm">Edit</button>
          <button onClick={() => setShowDeleteConfirm(true)} className="btn btn-ghost btn-sm" aria-label={`Delete ${rule.name}`} style={{ color: 'var(--color-danger)' }}>
            <TrashIcon size={16} />
          </button>
        </div>
      </div>

      <Dialog.Root open={showEditDialog} onOpenChange={setShowEditDialog}>
        <Dialog.Portal container={typeof document !== 'undefined' ? document.body : undefined}>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content" onOpenAutoFocus={preventAutoFocusOnTouch}>
            <Dialog.Title className="dialog-title">Edit income source</Dialog.Title>
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <Label.Root className="label">Name</Label.Root>
                <input
                  type="text"
                  value={rule.name}
                  disabled
                  className="input"
                />
              </div>
              <div>
                <Label.Root className="label">Annual Salary ($)</Label.Root>
                <input
                  type="text"
                  value={annualSalary}
                  onChange={(e) => handleSalaryChange(e.target.value)}
                  required
                  className="input"
                  placeholder="e.g., 72,000"
                />
              </div>
              <div>
                <Label.Root className="label">Pay Frequency</Label.Root>
                <input
                  type="text"
                  value={payFrequencyLabel}
                  disabled
                  className="input"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: rule.payFrequency === 'monthly' ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                <div>
                  <Label.Root className="label">Pay Day {rule.payFrequency === 'monthly' ? '' : '1'}</Label.Root>
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
                {rule.payFrequency !== 'monthly' && (
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
              <div className="dialog-actions" style={{ marginTop: '1rem' }}>
                <Dialog.Close asChild>
                  <button type="button" className="btn btn-secondary btn-sm">
                    Cancel
                  </button>
                </Dialog.Close>
                <button type="submit" disabled={isUpdating} className="btn btn-primary" style={{ opacity: isUpdating ? 0.5 : 1 }}>
                  {isUpdating ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDelete}
        title="Delete Income Source"
        description={`Are you sure you want to delete ${rule.name}? This action cannot be undone.`}
        confirmText="Delete"
      />
    </>
  );
}

