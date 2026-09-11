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

const DEFAULT_TAB = 'dashboard';
const VALID_TABS = new Set(TABS.map((t) => t.value));

export default function Home() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [currentMonth, setCurrentMonth] = useState<{ year: number; month: number }>(getCurrentMonthUTC());
  const requestedTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(requestedTab && VALID_TABS.has(requestedTab) ? requestedTab : DEFAULT_TAB);
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
    // Keep the URL in sync with the tab, but leave it bare on the default
    // tab so bookmarks and home-screen shortcuts open on the Dashboard.
    const currentTab = searchParams.get('tab') || DEFAULT_TAB;
    if (currentTab !== activeTab) {
      router.push(activeTab === DEFAULT_TAB ? '/' : `/?tab=${activeTab}`, { scroll: false });
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
        marginBottom: isMobile ? '1rem' : '1.75rem', 
      }}> 
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '0.5rem',
        }}>
          <h1 className="page-title" style={{ fontSize: isMobile ? '1.25rem' : '1.75rem' }}>
            Shared Balance Planner
          </h1>
          
          {/* Profile Menu */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className={isMobile ? 'btn btn-secondary btn-icon' : 'btn btn-secondary'} aria-label="Account menu">
                <UserIcon size={18} />
                {!isMobile && <span>Menu</span>}
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content align="end" sideOffset={6} className="menu-content">
                <DropdownMenu.Item onClick={toggleTheme} className="menu-item">
                  {theme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
                  <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
                </DropdownMenu.Item>

                <DropdownMenu.Separator className="menu-separator" />

                <DropdownMenu.Item onClick={() => signOut({ callbackUrl: '/login' })} className="menu-item menu-item--danger">
                  <LogOutIcon size={18} />
                  <span>Sign out</span>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
        
        {!isMobile && (
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
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
