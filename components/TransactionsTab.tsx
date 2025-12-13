'use client';

import { useState, useEffect } from 'react';
import { Transaction } from '@/types';
import AddTransactionDialog from './setup/AddTransactionDialog';
import TransactionCard from './setup/TransactionCard';

interface PaginationInfo {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export default function TransactionsTab() {
  const [account, setAccount] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 50,
    totalCount: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    setIsMobile(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    loadData();
  }, [pagination.page]);

  async function loadData() {
    try {
      const accountsRes = await fetch('/api/accounts');
      const accounts = await accountsRes.json();
      
      if (accounts.length > 0) {
        const acc = accounts[0];
        setAccount(acc);

        const transactionsRes = await fetch(
          `/api/transactions?accountId=${acc.id}&page=${pagination.page}&pageSize=${pagination.pageSize}`
        );
        const data = await transactionsRes.json();
        setTransactions(data.transactions);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div>
        <p>Loading...</p>
      </div>
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
                <p style={{ fontSize: 'var(--font-label)', color: '#999', marginTop: '0.25rem' }}>
                  Showing {((pagination.page - 1) * pagination.pageSize) + 1}-{Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of {pagination.totalCount}
                </p>
              )}
            </div>
            <AddTransactionDialog accountId={account.id} onAdded={handleReload} />
          </div>
          <p style={{ fontSize: 'var(--font-body)', color: '#666', marginBottom: '1rem' }}>
            One-time adjustments or historical transactions. Use this for unplanned expenses, deposits, or imported bank data.
            These appear in forecasts on their specific dates.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {transactions.map((transaction) => (
              <TransactionCard key={transaction.id} transaction={transaction} onUpdate={handleReload} onDelete={handleReload} />
            ))}
            {transactions.length === 0 && (
              <p style={{ fontSize: 'var(--font-body)', color: '#666' }}>No transactions yet. Add one if needed.</p>
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
              <span style={{ fontSize: 'var(--font-body)', color: '#666' }}>
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
  borderTop: '1px solid #e0e0e0',
};

const paginationButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  background: '#1a1a1a',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: 'var(--font-body)',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'background 0.2s',
};

const disabledButtonStyle: React.CSSProperties = {
  background: '#e0e0e0',
  color: '#999',
  cursor: 'not-allowed',
};
