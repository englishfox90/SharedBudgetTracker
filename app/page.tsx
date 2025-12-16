'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import * as Tabs from '@radix-ui/react-tabs';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import SetupTab from '@/components/SetupTab';
import ForecastTab from '@/components/ForecastTab';
import RecommendationTab from '@/components/RecommendationTab';
import TransactionsTab from '@/components/TransactionsTab';
import DashboardTab from '@/components/DashboardTab';
import BudgetAdvisorTab from '@/components/BudgetAdvisorTab';
import { getCurrentMonthUTC } from '@/lib/date-utils';
import { useTheme } from '@/contexts/ThemeContext';

export default function Home() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [currentMonth, setCurrentMonth] = useState<{ year: number; month: number }>(getCurrentMonthUTC());
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'forecast');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile viewport
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    setIsMobile(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

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
    <div style={{ minHeight: '100vh', padding: isMobile ? '1rem' : '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ 
        marginBottom: isMobile ? '1rem' : '2rem', 
      }}> 
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '0.5rem',
        }}>
          <h1 style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: '700', margin: 0 }}>
            Shared Balance Planner
          </h1>
          
          {/* Profile Menu */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                style={{
                  padding: '0.5rem 0.75rem',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: isMobile ? '1rem' : '1.125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: 'var(--text-primary)',
                  fontWeight: 500,
                }}
              >
                <span style={{ fontSize: '1.25rem' }}>👤</span>
                {!isMobile && <span style={{ fontSize: 'var(--font-body)' }}>Menu</span>}
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={5}
                style={{
                  minWidth: '200px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '8px',
                  padding: '0.5rem',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  zIndex: 1000,
                }}
              >
                <DropdownMenu.Item
                  onClick={toggleTheme}
                  style={{
                    padding: '0.75rem 1rem',
                    fontSize: 'var(--font-body)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    outline: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span style={{ fontSize: '1.125rem' }}>{theme === 'light' ? '🌙' : '☀️'}</span>
                  <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                </DropdownMenu.Item>

                <DropdownMenu.Separator style={{
                  height: '1px',
                  background: 'var(--border-primary)',
                  margin: '0.5rem 0',
                }} />

                <DropdownMenu.Item
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  style={{
                    padding: '0.75rem 1rem',
                    fontSize: 'var(--font-body)',
                    color: 'var(--color-danger)',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    outline: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span style={{ fontSize: '1.125rem' }}>🚪</span>
                  <span>Sign Out</span>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
        
        <p style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '0.875rem' : '1rem' }}>
          Manage your shared checking account and forecast balances
        </p>
      </header>

      <Tabs.Root value={activeTab} onValueChange={handleTabChange} style={{ width: '100%' }}>
        <Tabs.List
          style={{
            display: 'flex',
            gap: isMobile ? '0.5rem' : '1rem',
            borderBottom: '1px solid var(--border-primary)',
            marginBottom: isMobile ? '1.5rem' : '2rem',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <Tabs.Trigger
            value="dashboard"
            style={{
              padding: isMobile ? '0.625rem 1rem' : '0.75rem 1.5rem',
              fontSize: isMobile ? '0.875rem' : '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              borderBottom: '2px solid transparent',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
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
              padding: isMobile ? '0.625rem 1rem' : '0.75rem 1.5rem',
              fontSize: isMobile ? '0.875rem' : '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              borderBottom: '2px solid transparent',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            Forecast
          </Tabs.Trigger>
          <Tabs.Trigger
            value="recommendation"
            style={{
              padding: isMobile ? '0.625rem 1rem' : '0.75rem 1.5rem',
              fontSize: isMobile ? '0.875rem' : '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              borderBottom: '2px solid transparent',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            Recommendation
          </Tabs.Trigger>
          <Tabs.Trigger
            value="transactions"
            style={{
              padding: isMobile ? '0.625rem 1rem' : '0.75rem 1.5rem',
              fontSize: isMobile ? '0.875rem' : '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              borderBottom: '2px solid transparent',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            Transactions
          </Tabs.Trigger>
          <Tabs.Trigger
            value="budget"
            style={{
              padding: isMobile ? '0.625rem 1rem' : '0.75rem 1.5rem',
              fontSize: isMobile ? '0.875rem' : '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              borderBottom: '2px solid transparent',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            Budget
          </Tabs.Trigger>
          <Tabs.Trigger
            value="setup"
            style={{
              padding: isMobile ? '0.625rem 1rem' : '0.75rem 1.5rem',
              fontSize: isMobile ? '0.875rem' : '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              borderBottom: '2px solid transparent',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
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

        <Tabs.Content value="budget">
          <BudgetAdvisorTab 
            year={currentMonth.year} 
            month={currentMonth.month} 
          />
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
