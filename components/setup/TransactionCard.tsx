'use client';

import { useState } from 'react';
import { formatDateLongUTC } from '@/lib/date-utils';
import EditTransactionDialog from './EditTransactionDialog';
import { ConfirmDialog } from '../dialogs';
import { formatCategory } from '@/lib/categories';
import { formatMoney } from '@/lib/actualize';
import { TrashIcon, CheckIcon } from '../icons';

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
      <div className="list-item">
        <div className="list-item__body">
          <div className="list-item__title">
            {transaction.description}
            {isActualized && <span className="pill pill--safe"><CheckIcon size={10} strokeWidth={3} /> Confirmed</span>}
          </div>
          <div className="list-item__meta">
            {formatDateLongUTC(new Date(transaction.date))} · {formatCategory(transaction.category)}
          </div>
        </div>
        <div className={`list-item__amount ${isDeposit ? 'money-pos' : 'money-neg'}`}>
          {formatMoney(transaction.amount, true)}
        </div>
        <div className="list-item__actions">
          <EditTransactionDialog transaction={transaction} onUpdated={onUpdate} />
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
            className="btn btn-ghost btn-sm"
            aria-label="Delete transaction"
            style={{ color: 'var(--color-danger)' }}
          >
            <TrashIcon size={16} />
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





