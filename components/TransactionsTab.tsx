'use client';

import { ChevronLeftIcon, ChevronRightIcon } from './icons';

import { useState, useEffect } from 'react';
import { Transaction } from '@/types';
import AddTransactionDialog from './setup/AddTransactionDialog';
import TransactionCard from './setup/TransactionCard';
import { useAccount } from '@/contexts/AccountContext';

interface PaginationInfo {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export default function TransactionsTab() {
  const { account, loading: accountLoading } = useAccount();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 50,
    totalCount: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (account) {
      loadData();
    } else if (!accountLoading) {
      setLoading(false);
    }
  }, [pagination.page, account?.id, accountLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    if (!account) return;
    try {
      const transactionsRes = await fetch(
        `/api/transactions?accountId=${account.id}&page=${pagination.page}&pageSize=${pagination.pageSize}`
      );
      const data = await transactionsRes.json();
      setTransactions(data.transactions);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading || accountLoading) {
    return (
      <section className="card">
        <div className="skeleton" style={{ height: '28px', width: '60%', marginBottom: '1.5rem' }} />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton" style={{ height: '96px', marginBottom: '0.75rem' }} />
        ))}
      </section>
    );
  }

  if (!account) {
    return (
      <div>
        <p>No account found. Please set up an account in the Setup tab.</p>
      </div>
    );
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleReload = () => {
    // Reset to page 1 when adding/updating/deleting
    setPagination(prev => ({ ...prev, page: 1 }));
    loadData();
  };

  return (
    <div className="stack" style={{ gap: '1.25rem' }}>
      <div className="section-head" style={{ marginBottom: 0 }}>
        <div>
          <h2 className="page-title">Transactions</h2>
          <p>
            {pagination.totalCount > 0
              ? `Showing ${((pagination.page - 1) * pagination.pageSize) + 1}–${Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of ${pagination.totalCount}`
              : 'One-off adjustments, imported history and confirmed forecast events.'}
          </p>
        </div>
        <AddTransactionDialog accountId={account.id} onAdded={handleReload} />
      </div>

      <div className="card">
        <div className="list">
          {transactions.map((transaction) => (
            <TransactionCard key={transaction.id} transaction={transaction} onUpdate={handleReload} onDelete={handleReload} />
          ))}
          {transactions.length === 0 && (
            <p style={{ color: 'var(--text-secondary)' }}>No transactions yet. Confirm forecast events on the Forecast tab or add one here.</p>
          )}
        </div>
        {pagination.totalPages > 1 && (
          <div style={paginationStyle}>
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="btn btn-secondary btn-sm"
            >
              <ChevronLeftIcon size={16} /> Previous
            </button>
            <span style={{ fontSize: 'var(--font-small)', color: 'var(--text-secondary)' }}>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="btn btn-secondary btn-sm"
            >
              Next <ChevronRightIcon size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const paginationStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '1rem',
  marginTop: '1.5rem',
  paddingTop: '1.25rem',
  borderTop: '1px solid var(--border-primary)',
};

