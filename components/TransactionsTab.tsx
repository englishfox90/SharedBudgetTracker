'use client';

import { useState, useEffect } from 'react';
import { useIsMobile } from '@/lib/useIsMobile';
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
  const isMobile = useIsMobile();

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
      <section style={sectionStyle}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <section style={sectionStyle}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '0.75rem' : '0', marginBottom: '1rem' }}>
            <div>
              <h2 style={headingStyle}>Transactions & Adjustments</h2>
              {pagination.totalCount > 0 && (
                <p style={{ fontSize: 'var(--font-label)', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Showing {((pagination.page - 1) * pagination.pageSize) + 1}-{Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of {pagination.totalCount}
                </p>
              )}
            </div>
            <AddTransactionDialog accountId={account.id} onAdded={handleReload} />
          </div>
          <p style={{ fontSize: 'var(--font-body)', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            One-time adjustments or historical transactions. Use this for unplanned expenses, deposits, or imported bank data.
            These appear in forecasts on their specific dates.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {transactions.map((transaction) => (
              <TransactionCard key={transaction.id} transaction={transaction} onUpdate={handleReload} onDelete={handleReload} />
            ))}
            {transactions.length === 0 && (
              <p style={{ fontSize: 'var(--font-body)', color: 'var(--text-secondary)' }}>No transactions yet. Add one if needed.</p>
            )}
          </div>
          {pagination.totalPages > 1 && (
            <div style={paginationStyle}>
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                style={{
                  ...paginationButtonStyle,
                  ...(pagination.page === 1 ? disabledButtonStyle : {}),
                }}
              >
                ← Previous
              </button>
              <span style={{ fontSize: 'var(--font-body)', color: 'var(--text-secondary)' }}>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                style={{
                  ...paginationButtonStyle,
                  ...(pagination.page === pagination.totalPages ? disabledButtonStyle : {}),
                }}
              >
                Next →
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  padding: '1rem',
  borderRadius: '8px',
  border: '1px solid var(--border-primary)',
};

const headingStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: '600',
  marginBottom: '0rem',
};

const paginationStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '1rem',
  marginTop: '1.5rem',
  paddingTop: '1.5rem',
  borderTop: '1px solid var(--border-primary)',
};

const paginationButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  background: 'var(--button-bg)',
  color: 'var(--button-text)',
  border: 'none',
  borderRadius: '6px',
  fontSize: 'var(--font-body)',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'background 0.2s',
};

const disabledButtonStyle: React.CSSProperties = {
  background: 'var(--bg-tertiary)',
  color: 'var(--text-secondary)',
  cursor: 'not-allowed',
};
