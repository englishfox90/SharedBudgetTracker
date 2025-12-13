'use client';

import { useState, useEffect } from 'react';
import { PeriodTrendWidget } from './PeriodTrendWidget';
import { DashboardSummaryWidgets } from './DashboardSummaryWidgets';
import SixMonthTrendChart from './dashboard/SixMonthTrendChart';
import { getCurrentMonthUTC } from '@/lib/date-utils';

interface DashboardTabProps {
  onNavigate: (tab: string) => void;
}

export default function DashboardTab({ onNavigate }: DashboardTabProps) {
  const [account, setAccount] = useState<any>(null);
  const [variableExpenses, setVariableExpenses] = useState<Array<{ id: number; name: string }>>([]);
  const [sixMonthData, setSixMonthData] = useState<any>(null);
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

        // Fetch 6-month forecast from recommendations API
        const currentMonth = getCurrentMonthUTC();
        const recommendationsRes = await fetch(
          `/api/recommendations?accountId=${acc.id}&year=${currentMonth.year}&month=${currentMonth.month}`
        );
        const recommendations = await recommendationsRes.json();
        
        if (recommendations.sixMonthForecast) {
          setSixMonthData(recommendations.sixMonthForecast);
        }
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

  if (variableExpenses.length === 0) {
    return (
      <div>
        <p style={{ color: '#666' }}>
          No variable expenses found. Add a variable expense in the Setup tab to use the Period Trend Forecast widget.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <DashboardSummaryWidgets accountId={account.id} onNavigate={onNavigate} />
      
      {/* 6-Month Trend Chart */}
      {sixMonthData && sixMonthData.months && sixMonthData.months.length > 0 && (
        <SixMonthTrendChart months={sixMonthData.months} />
      )}
      
      <PeriodTrendWidget accountId={account.id} variableExpenses={variableExpenses} />
    </div>
  );
}


