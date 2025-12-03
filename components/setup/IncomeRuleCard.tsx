'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Label from '@radix-ui/react-label';
import { IncomeRule } from '@/types';
import { ConfirmDialog } from '../dialogs';

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
      <div style={cardStyle}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '600', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {rule.name}
            <span style={percentageBadgeStyle}>{percentage}%</span>
          </div>
          <div style={{ fontSize: '0.875rem', color: '#666' }}>
            ${rule.annualSalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/year • {payFrequencyLabel} • {payDaysText}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontWeight: '600' }}>${rule.contributionAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/{payFrequencyLabel}</span>
          <button onClick={openEditDialog} style={buttonSecondaryStyle}>
            Edit
          </button>
          <button onClick={() => setShowDeleteConfirm(true)} style={buttonDangerStyle}>
            Delete
          </button>
        </div>
      </div>

      <Dialog.Root open={showEditDialog} onOpenChange={setShowEditDialog}>
        <Dialog.Portal container={typeof document !== 'undefined' ? document.body : undefined}>
          <Dialog.Overlay style={overlayStyle} />
          <Dialog.Content style={contentStyle}>
            <Dialog.Title style={titleStyle}>Edit Income Source</Dialog.Title>
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <Label.Root style={labelStyle}>Name</Label.Root>
                <input
                  type="text"
                  value={rule.name}
                  disabled
                  style={{ ...inputStyle, background: '#f5f5f5', cursor: 'not-allowed' }}
                />
              </div>
              <div>
                <Label.Root style={labelStyle}>Annual Salary ($)</Label.Root>
                <input
                  type="text"
                  value={annualSalary}
                  onChange={(e) => handleSalaryChange(e.target.value)}
                  required
                  style={inputStyle}
                  placeholder="e.g., 72,000"
                />
              </div>
              <div>
                <Label.Root style={labelStyle}>Pay Frequency</Label.Root>
                <input
                  type="text"
                  value={payFrequencyLabel}
                  disabled
                  style={{ ...inputStyle, background: '#f5f5f5', cursor: 'not-allowed' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: rule.payFrequency === 'monthly' ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                <div>
                  <Label.Root style={labelStyle}>Pay Day {rule.payFrequency === 'monthly' ? '' : '1'}</Label.Root>
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
                {rule.payFrequency !== 'monthly' && (
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
                <button type="submit" disabled={isUpdating} style={{ ...buttonStyle, opacity: isUpdating ? 0.5 : 1 }}>
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

const cardStyle: React.CSSProperties = {
  background: 'white',
  padding: '1rem',
  borderRadius: '6px',
  border: '1px solid #e0e0e0',
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem',
  border: '1px solid #e0e0e0',
  borderRadius: '4px',
  fontSize: '0.875rem',
};

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
  padding: '0.375rem 0.75rem',
  background: '#f5f5f5',
  border: '1px solid #e0e0e0',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '0.75rem',
  fontWeight: '500',
};

const buttonDangerStyle: React.CSSProperties = {
  padding: '0.375rem 0.75rem',
  background: '#fee2e2',
  color: '#dc2626',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '0.75rem',
  fontWeight: '500',
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
  background: 'white',
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

const percentageBadgeStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: '600',
  padding: '0.125rem 0.5rem',
  background: '#e0f2fe',
  color: '#0369a1',
  borderRadius: '12px',
};
