'use client';

import { useState } from 'react';
import { formatDateLongUTC } from '@/lib/date-utils';
import EditTransactionDialog from './EditTransactionDialog';
import { ConfirmDialog } from '../dialogs';
import { formatCategory } from '@/lib/categories';

interface Transaction {
  id: number;
  date: Date;
  description: string;
  amount: number;
  category: string | null;
  incomeRuleId: number | null;
  recurringExpenseId: number | null;
}

interface Props {
  transaction: Transaction;
  onUpdate: () => void;
  onDelete: () => void;
}

export default function TransactionCard({ transaction, onUpdate, onDelete }: Props) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isActualized = transaction.incomeRuleId !== null || transaction.recurringExpenseId !== null;

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete');
      onDelete();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      setIsDeleting(false);
    }
  }

  const isDeposit = transaction.amount >= 0;

  return (
    <>
      <div style={cardStyle}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={dateStyle}>{formatDateLongUTC(new Date(transaction.date))}</span>
            <span style={categoryBadgeStyle}>{formatCategory(transaction.category)}</span>
          </div>
          <div style={nameStyle}>{transaction.description}</div>
          <div style={{ ...amountStyle, color: isDeposit ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {isDeposit ? '+' : ''}${Math.abs(transaction.amount).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <EditTransactionDialog transaction={transaction} onUpdated={onUpdate} />
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
            style={{ ...deleteButtonStyle, opacity: isDeleting ? 0.5 : 1 }}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Transaction"
        description="Are you sure you want to delete this transaction? This action cannot be undone."
        onConfirm={handleDelete}
      />
    </>
  );
}

const cardStyle: React.CSSProperties = {
  padding: '1rem',
  border: '1px solid var(--border-primary)',
  borderRadius: '6px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '1rem',
  marginBottom: '0.75rem',
};

const dateStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--text-secondary)',
  fontWeight: '500',
};

const categoryBadgeStyle: React.CSSProperties = {
  fontSize: '0.625rem',
  padding: '0.125rem 0.5rem',
  background: 'var(--bg-tertiary)',
  borderRadius: '4px',
  color: 'var(--text-secondary)',
};

const nameStyle: React.CSSProperties = {
  fontSize: '0.9375rem',
  fontWeight: '500',
  marginBottom: '0.25rem',
};

const amountStyle: React.CSSProperties = {
  fontSize: '1.125rem',
  fontWeight: '600',
};

const deleteButtonStyle: React.CSSProperties = {
  padding: '0.375rem 0.75rem',
  background: 'var(--danger-bg)',
  color: 'var(--color-danger)',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '0.75rem',
  fontWeight: '500',
};
