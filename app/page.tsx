'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import * as Tabs from '@radix-ui/react-tabs';
import SetupTab from '@/components/SetupTab';
import ForecastTab from '@/components/ForecastTab';
import RecommendationTab from '@/components/RecommendationTab';
import TransactionsTab from '@/components/TransactionsTab';
import DashboardTab from '@/components/DashboardTab';
import { getCurrentMonthUTC } from '@/lib/date-utils';
import { useTheme } from '@/contexts/ThemeContext';

export default function Home() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [currentMonth, setCurrentMonth] = useState<{ year: number; month: number }>(getCurrentMonthUTC());
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'forecast');

  useEffect(() => {
    // Update URL when tab changes
    const currentTab = searchParams.get('tab') || 'forecast';
    if (currentTab !== activeTab) {
      router.push(`/?tab=${activeTab}`, { scroll: false });
    }
  }, [activeTab, router, searchParams]);

  function handleTabChange(value: string) {
    setActiveTab(value);
  }

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            Shared Balance Planner
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
            Manage your shared checking account and forecast balances
          </p>
        </div>
        
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          style={{
            padding: '0.5rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '1.125rem',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
          }}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </header>

      <Tabs.Root value={activeTab} onValueChange={handleTabChange} style={{ width: '100%' }}>
        <Tabs.List
          style={{
            display: 'flex',
            gap: '1rem',
            borderBottom: '1px solid var(--border-primary)',
            marginBottom: '2rem',
          }}
        >
          <Tabs.Trigger
            value="dashboard"
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              borderBottom: '2px solid transparent',
              transition: 'all 0.2s',
            }}
            data-state-active-style={{
              color: '#1a1a1a',
              borderBottomColor: '#1a1a1a',
            }}
          >
            Dashboard
          </Tabs.Trigger>
          <Tabs.Trigger
            value="forecast"
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              borderBottom: '2px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            Forecast
          </Tabs.Trigger>
          <Tabs.Trigger
            value="recommendation"
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              borderBottom: '2px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            Recommendation
          </Tabs.Trigger>
          <Tabs.Trigger
            value="transactions"
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              borderBottom: '2px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            Transactions
          </Tabs.Trigger>
          <Tabs.Trigger
            value="setup"
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              borderBottom: '2px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            Setup
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="dashboard">
          <DashboardTab onNavigate={(tab) => setActiveTab(tab)} />
        </Tabs.Content>

        <Tabs.Content value="forecast">
          <ForecastTab currentMonth={currentMonth} onMonthChange={setCurrentMonth} />
        </Tabs.Content>

        <Tabs.Content value="recommendation">
          <RecommendationTab currentMonth={currentMonth} onMonthChange={setCurrentMonth} />
        </Tabs.Content>

        <Tabs.Content value="transactions">
          <TransactionsTab />
        </Tabs.Content>

        <Tabs.Content value="setup">
          <SetupTab />
        </Tabs.Content>
      </Tabs.Root>

      <style jsx>{`
        :global([data-state='active']) {
          color: var(--text-primary) !important;
          border-bottom-color: var(--text-primary) !important;
        }
      `}</style>
    </div>
  );
}
