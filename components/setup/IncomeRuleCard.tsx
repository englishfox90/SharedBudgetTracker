'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Label from '@radix-ui/react-label';
import { preventAutoFocusOnTouch } from '@/lib/useIsMobile';
import { IncomeRule } from '@/types';
import { ConfirmDialog } from '../dialogs';
import { formatMoney } from '@/lib/actualize';
import { AlertTriangleIcon, TrashIcon } from '../icons';
import {
  PaycheckFields,
  PaycheckFormState,
  paycheckFormFromRule,
  paycheckFormToPayload,
} from './PaycheckFields';

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
  const [paycheck, setPaycheck] = useState<PaycheckFormState>(paycheckFormFromRule(rule));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setPaycheck(paycheckFormFromRule(rule));
    setError(null);
    setShowEditDialog(true);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    const salaryValue = parseFloat(annualSalary.replace(/,/g, ''));
    const payDays = rule.payFrequency === 'monthly' ? [parseInt(payDay1)] : [parseInt(payDay1), parseInt(payDay2)];

    setIsUpdating(true);
    setError(null);
    try {
      const res = await fetch(`/api/income-rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          annualSalary: salaryValue,
          payDays,
          ...paycheckFormToPayload(paycheck),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Could not save this income source.');
        return;
      }

      setShowEditDialog(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating income rule:', error);
      setError('Could not save this income source.');
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

  // Attached by the income-rules API. Absent only if a caller fetched the rule
  // some other way, in which case the card just omits the take-home line.
  const capacity = rule.capacity;
  const utilization = capacity?.utilizationOfNet ?? null;
  const utilizationTone = !capacity
    ? 'safe'
    : capacity.utilizationOfNet > capacity.maxContributionPct
      ? 'danger'
      : capacity.utilizationOfNet > capacity.maxContributionPct * 0.85
        ? 'warning'
        : 'safe';

  return (
    <>
      <div className="list-item">
        <div className="list-item__body">
          <div className="list-item__title">
            {rule.name}
            <span className="pill pill--accent">{percentage}% of contributions</span>
            {capacity?.overCapacity && (
              <span className="pill pill--danger">
                <AlertTriangleIcon size={12} /> over capacity
              </span>
            )}
            {capacity && capacity.sharedBenefitPerPaycheck > 0 && (
              <span className="pill pill--info">
                +{formatMoney(capacity.sharedBenefitPerPaycheck)} shared benefits
              </span>
            )}
          </div>
          <div className="list-item__meta">
            {formatMoney(rule.annualSalary)} a year · {payFrequencyLabel} · {payDaysText}
          </div>
          {capacity && (
            <div className="list-item__meta">
              Takes home {formatMoney(capacity.netPerPaycheck)} a check
              {capacity.paycheck.isEstimate ? ' (estimated)' : ''} · ceiling{' '}
              {formatMoney(capacity.capacityPerPaycheck)} ·{' '}
              {capacity.headroomPerPaycheck >= 0
                ? `${formatMoney(capacity.headroomPerPaycheck)} of room left`
                : `${formatMoney(Math.abs(capacity.headroomPerPaycheck))} over the ceiling`}
            </div>
          )}
          {capacity && capacity.netPerPaycheck > 0 && (
            <div
              className={`meter meter--${utilizationTone}`}
              style={{ marginTop: '0.4rem', maxWidth: '320px' }}
              role="img"
              aria-label={`Contribution uses ${Math.round((utilization ?? 0) * 100)}% of take-home pay`}
            >
              <div
                className="meter__fill"
                style={{ width: `${Math.min(100, Math.max(0, (utilization ?? 0) * 100))}%` }}
              />
            </div>
          )}
        </div>
        <div className="list-item__amount">
          {formatMoney(rule.contributionAmount)}
          <small>
            per paycheck
            {capacity ? ` · ${Math.round(capacity.utilizationOfNet * 100)}% of net` : ''}
          </small>
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
          <Dialog.Content className="dialog-content dialog-content--wide" onOpenAutoFocus={preventAutoFocusOnTouch}>
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
              <div style={{ borderTop: '1px solid var(--border-secondary)', paddingTop: '1rem' }}>
                <PaycheckFields
                  annualSalary={parseFloat(annualSalary.replace(/,/g, '')) || 0}
                  payFrequency={rule.payFrequency}
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

