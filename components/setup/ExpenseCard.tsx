'use client';

import { useState, useEffect } from 'react';
import { RecurringExpense } from '@/types';
import { ConfirmDialog } from '../dialogs';
import { EditExpenseDialog } from './EditExpenseDialog';

interface Props {
  expense: RecurringExpense;
  onUpdate: () => void;
  onDelete: () => void;
}

export function ExpenseCard({ expense, onUpdate, onDelete }: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [nextMonthEstimate, setNextMonthEstimate] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    setIsMobile(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (expense.isVariable) {
      fetchNextMonthEstimate();
    }
  }, [expense.id, expense.isVariable]);

  async function fetchNextMonthEstimate() {
    try {
      const now = new Date();
      const nextMonth = now.getMonth() === 11 ? 1 : now.getMonth() + 2;
      const nextYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
      
      const res = await fetch(
        `/api/variable-estimate?accountId=${expense.accountId}&expenseId=${expense.id}&year=${nextYear}&month=${nextMonth}`
      );
      if (res.ok) {
        const data = await res.json();
        setNextMonthEstimate(data.estimate);
      }
    } catch (error) {
      console.error('Error fetching estimate:', error);
    }
  }

  const frequencyLabel = {
    weekly: 'Week',
    bi_weekly: 'Bi-Weekly',
    semi_monthly: 'Semi-Monthly',
    monthly: 'Month',
  }[expense.frequency || 'monthly'] || 'Month';

  const categoryLabel = {
    auto: 'Auto',
    bills: 'Bills',
    credit_card_payment: 'Credit Card Payment',
    insurance: 'Insurance',
    loan_payment: 'Loan Payment',
    other: 'Other',
    rent: 'Rent/Mortgage',
    subscription: 'Subscription',
    utilities: 'Utilities',
  }[expense.category] || expense.category;

  const isWeeklyBased = expense.frequency === 'weekly' || expense.frequency === 'bi_weekly';
  const dayLabel = isWeeklyBased 
    ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][expense.dayOfMonth] || `Day ${expense.dayOfMonth}`
    : `Day ${expense.dayOfMonth}`;

  const recurringText = expense.frequency === 'weekly' 
    ? 'Every week'
    : expense.frequency === 'bi_weekly'
    ? 'Every 2 weeks'
    : expense.frequency === 'semi_monthly'
    ? '2x per month'
    : 'Monthly';

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await fetch(`/api/expenses/${expense.id}`, { method: 'DELETE' });
      setShowDeleteConfirm(false);
      onDelete();
    } catch (error) {
      console.error('Error deleting expense:', error);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div style={{
        background: 'var(--bg-secondary)',
        padding: '1rem',
        borderRadius: '6px',
        border: '1px solid var(--border-primary)',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: '1rem',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{expense.name}</div>
          <div style={{ fontSize: 'var(--font-body)', color: '#666' }}>
            {recurringText} on {dayLabel} • {categoryLabel}
            {expense.isVariable && ' • Variable'}
          </div>
        </div>
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'row' : 'row',
          gap: '0.5rem', 
          alignItems: 'center',
          justifyContent: isMobile ? 'space-between' : 'flex-end',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'flex-start' : 'flex-end', gap: '0.25rem' }}>
            <span style={{ fontWeight: '600', fontSize: isMobile ? 'var(--font-body)' : '1rem' }}>
              ${expense.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/{frequencyLabel}
            </span>
            {expense.isVariable && nextMonthEstimate !== null && (
              <span style={{ fontSize: 'var(--font-label)', color: '#666' }}>
                Next month: ${nextMonthEstimate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => setShowEditDialog(true)} style={buttonSecondaryStyle}>
              Edit
            </button>
            <button onClick={() => setShowDeleteConfirm(true)} style={buttonDangerStyle}>
              Delete
            </button>
          </div>
        </div>
      </div>

      <EditExpenseDialog
        expense={expense}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onUpdate={onUpdate}
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDelete}
        title="Delete Expense"
        description={`Are you sure you want to delete ${expense.name}? This action cannot be undone.`}
        confirmText="Delete"
      />
    </>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  padding: '1rem',
  borderRadius: '6px',
  border: '1px solid var(--border-primary)',
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
};

const buttonSecondaryStyle: React.CSSProperties = {
  padding: '0.375rem 0.75rem',
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border-primary)',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: 'var(--font-label)',
  fontWeight: '500',
  color: 'var(--text-primary)',
};

const buttonDangerStyle: React.CSSProperties = {
  padding: '0.375rem 0.75rem',
  background: '#fee2e2',
  color: '#dc2626',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: 'var(--font-label)',
  fontWeight: '500',
};
