'use client';

import { useState, useEffect } from 'react';
import { RecurringExpense } from '@/types';
import { ConfirmDialog } from '../dialogs';
import { EditExpenseDialog } from './EditExpenseDialog';
import { formatDateLongUTC } from '@/lib/date-utils';
import { formatCategory } from '@/lib/categories';
import { formatMoney } from '@/lib/actualize';
import { TrashIcon } from '../icons';

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

  useEffect(() => {
    if (expense.isVariable) {
      fetchNextMonthEstimate();
    }
  }, [expense.id, expense.isVariable]);

  const frequencyLabel = {
    weekly: 'Week',
    bi_weekly: 'Two weeks',
    semi_monthly: 'Half month',
    monthly: 'Month',
  }[expense.frequency || 'monthly'] || 'Month';

  const categoryLabel = formatCategory(expense.category);

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

  // Format anchor date for bi-weekly display
  const anchorDateText = expense.frequency === 'bi_weekly' && expense.anchorDate
    ? ` (from ${formatDateLongUTC(expense.anchorDate)})`
    : expense.frequency === 'bi_weekly'
    ? ' (no anchor set)'
    : '';

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
      <div className="list-item">
        <div className="list-item__body">
          <div className="list-item__title">
            {expense.name}
            {expense.isVariable && <span className="pill pill--info">Variable</span>}
          </div>
          <div className="list-item__meta">
            {recurringText}{anchorDateText} on {dayLabel} · {categoryLabel}
            {expense.budgetGoal ? ` · goal ${formatMoney(expense.budgetGoal)}` : ''}
          </div>
        </div>
        <div className="list-item__amount">
          {formatMoney(expense.amount)}<small>per {frequencyLabel.toLowerCase()}{expense.isVariable && nextMonthEstimate !== null ? ` · next ${formatMoney(nextMonthEstimate)}` : ''}</small>
        </div>
        <div className="list-item__actions">
          <button onClick={() => setShowEditDialog(true)} className="btn btn-secondary btn-sm">Edit</button>
          <button onClick={() => setShowDeleteConfirm(true)} className="btn btn-ghost btn-sm" aria-label={`Delete ${expense.name}`} style={{ color: 'var(--color-danger)' }}>
            <TrashIcon size={16} />
          </button>
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

