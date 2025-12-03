'use client';

import { useState, useEffect } from 'react';
import { PeriodTrendWidget } from './PeriodTrendWidget';
import { DashboardSummaryWidgets } from './DashboardSummaryWidgets';

interface DashboardTabProps {
  onNavigate: (tab: string) => void;
}

export default function DashboardTab({ onNavigate }: DashboardTabProps) {
  const [account, setAccount] = useState<any>(null);
  const [variableExpenses, setVariableExpenses] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const accountsRes = await fetch('/api/accounts');
      const accounts = await accountsRes.json();
      
      if (accounts.length > 0) {
        const acc = accounts[0];
        setAccount(acc);

        const expensesRes = await fetch(`/api/expenses?accountId=${acc.id}`);
        const allExpenses = await expensesRes.json();
        
        // Filter to only variable expenses
        const variableOnly = allExpenses
          .filter((exp: any) => exp.isVariable)
          .map((exp: any) => ({ id: exp.id, name: exp.name }));
        
        setVariableExpenses(variableOnly);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!account) {
    return (
      <div style={{ padding: '2rem' }}>
        <p>No account found. Please set up an account in the Setup tab.</p>
      </div>
    );
  }

  if (variableExpenses.length === 0) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <p style={{ fontSize: '0.875rem', color: '#666' }}>
          No variable expenses found. Add a variable expense in the Setup tab to use the Period Trend Forecast widget.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <DashboardSummaryWidgets accountId={account.id} onNavigate={onNavigate} />
      <PeriodTrendWidget accountId={account.id} variableExpenses={variableExpenses} />
    </div>
  );
}


