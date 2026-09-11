'use client';

import { useState, useEffect, useRef } from 'react';
import { useIsMobile } from '@/lib/useIsMobile';
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
import { AccountProvider } from '@/contexts/AccountContext';
import {
  LayoutGridIcon, CalendarIcon, LightbulbIcon, ReceiptIcon, TargetIcon, SettingsIcon,
  UserIcon, MoonIcon, SunIcon, LogOutIcon,
} from '@/components/icons';

const TABS = [
  { value: 'dashboard', label: 'Dashboard', shortLabel: 'Dashboard', Icon: LayoutGridIcon },
  { value: 'forecast', label: 'Forecast', shortLabel: 'Forecast', Icon: CalendarIcon },
  { value: 'recommendation', label: 'Recommendation', shortLabel: 'Insights', Icon: LightbulbIcon },
  { value: 'transactions', label: 'Transactions', shortLabel: 'Transactions', Icon: ReceiptIcon },
  { value: 'budget', label: 'Budget', shortLabel: 'Budget', Icon: TargetIcon },
  { value: 'setup', label: 'Setup', shortLabel: 'Setup', Icon: SettingsIcon },
];

export default function Home() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [currentMonth, setCurrentMonth] = useState<{ year: number; month: number }>(getCurrentMonthUTC());
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'forecast');
  const isMobile = useIsMobile();
  const tabsListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Keep the active tab visible when the tab row scrolls horizontally (desktop only;
    // on phones the tabs live in a fixed bottom bar and are always visible)
    if (isMobile) return;
    const active = tabsListRef.current?.querySelector<HTMLElement>('[data-state="active"]');
    active?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [activeTab, isMobile]);

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
    <div
      style={{
        minHeight: '100vh',
        padding: isMobile ? '1rem' : '2rem',
        paddingBottom: isMobile ? 'calc(5rem + env(safe-area-inset-bottom, 0px))' : '2rem',
        maxWidth: '1400px',
        margin: '0 auto',
      }}
    >
      <header style={{ 
        marginBottom: isMobile ? '0.75rem' : '2rem', 
      }}> 
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '0.5rem',
        }}>
          <h1 style={{ fontSize: isMobile ? '1.25rem' : '2rem', fontWeight: '700', margin: 0 }}>
            Shared Balance Planner
          </h1>
          
          {/* Profile Menu */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                style={{
                  padding: isMobile ? '0.375rem 0.625rem' : '0.5rem 0.75rem',
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
                <UserIcon size={20} />
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
                  {theme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
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
                  <LogOutIcon size={18} />
                  <span>Sign Out</span>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
        
        {!isMobile && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
            Manage your shared checking account and forecast balances
          </p>
        )}
      </header>

      <AccountProvider>
      <Tabs.Root value={activeTab} onValueChange={handleTabChange} style={{ width: '100%' }}>
        <Tabs.List
          ref={tabsListRef}
          className={isMobile ? 'tabs-list tabs-list--bottom' : 'tabs-list tabs-list--top'}
          aria-label="Sections"
        >
          {TABS.map((tab) => (
            <Tabs.Trigger key={tab.value} value={tab.value} className="tab-trigger">
              {isMobile ? (
                <>
                  <tab.Icon size={22} strokeWidth={1.75} className="tab-trigger__icon" />
                  <span className="tab-trigger__label">{tab.shortLabel}</span>
                </>
              ) : (
                tab.label
              )}
            </Tabs.Trigger>
          ))}
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
      </AccountProvider>
    </div>
  );
}
