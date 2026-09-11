'use client';

import { useState, useEffect } from 'react';
import { useIsMobile } from '@/lib/useIsMobile';
import { addMonths } from 'date-fns';
import { formatDateUTC, parseDateUTC, formatDateLongUTC } from '@/lib/date-utils';

interface DashboardSummaryProps {
  accountId: number;
  recommendations: RecommendationData | null;
  onNavigate: (tab: string) => void;
}

interface ForecastData {
  days: Array<{ 
    date: string; 
    closingBalance: number;
    events?: Array<{ actualized?: boolean; amount: number }>;
  }>;
  overallStatus: {
    minBalance: number;
    daysBelowSafeMin: number;
  };
  safeMinBalance: number;
}

export interface RecommendationData {
  insights: Array<{
    type: string;
    message: string;
    impact: number;
  }>;
  suggestedContribution: number;
  adjustmentNeeded: boolean;
}

export function DashboardSummaryWidgets({ accountId, recommendations, onNavigate }: DashboardSummaryProps) {
  const [todayBalance, setTodayBalance] = useState<number | null>(null);
  const [monthEndBalance, setMonthEndBalance] = useState<number | null>(null);
  const [minBalanceAlert, setMinBalanceAlert] = useState<{ amount: number; date: string; severity: 'warning' | 'danger' } | null>(null);
  const [missingTransactions, setMissingTransactions] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  async function loadDashboardData() {
    try {
      // The forecast API works in UTC calendar days (YYYY-MM-DD strings), so
      // compare those strings directly instead of converting through local
      // Date objects, which drifts by a day in the evening in western zones.
      const todayStr = formatDateUTC(new Date());
      const { year: currentYear, month: currentMonth } = (() => {
        const now = new Date();
        return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
      })();

      // Get current month forecast
      const currentForecastRes = await fetch(
        `/api/forecast?accountId=${accountId}&year=${currentYear}&month=${currentMonth}`
      );
      const currentForecast: ForecastData = await currentForecastRes.json();

      // Find today's balance
      const todayData = currentForecast.days.find((d) => d.date === todayStr);
      if (todayData) {
        setTodayBalance(todayData.closingBalance);
      }

      // Get month-end balance (last day of current forecast)
      if (currentForecast.days.length > 0) {
        const lastDay = currentForecast.days[currentForecast.days.length - 1];
        setMonthEndBalance(lastDay.closingBalance);
      }

      // Count past days (before today) that still have unconfirmed forecast expenses
      const daysWithMissingTransactions = currentForecast.days.filter(
        (d) => d.date < todayStr && d.events?.some((e) => !e.actualized && e.amount < 0)
      );
      setMissingTransactions(daysWithMissingTransactions.length);

      // Get next month forecast for lookahead
      const nextMonth = addMonths(parseDateUTC(todayStr), 1);
      const nextYear = nextMonth.getUTCFullYear();
      const nextMonthNum = nextMonth.getUTCMonth() + 1;

      const nextForecastRes = await fetch(
        `/api/forecast?accountId=${accountId}&year=${nextYear}&month=${nextMonthNum}`
      );
      const nextForecast: ForecastData = await nextForecastRes.json();

      // Combine forecasts to check for minimum balance violations from today onwards
      const allDays = [...currentForecast.days, ...nextForecast.days];
      const minimumBalance = currentForecast.safeMinBalance;
      const futureDays = allDays.filter((d) => d.date >= todayStr);

      // Find the EARLIEST/SOONEST violation (not the worst)
      const belowMinimum = futureDays
        .filter((d) => d.closingBalance < minimumBalance)
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      if (belowMinimum.length > 0) {
        const earliest = belowMinimum[0];
        setMinBalanceAlert({
          amount: minimumBalance - earliest.closingBalance,
          date: earliest.date,
          severity: earliest.closingBalance < 0 ? 'danger' : 'warning', // Red if negative, orange if below minimum
        });
      } else {
        setMinBalanceAlert(null);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, [accountId]);

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={widgetsGridStyle}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: '110px' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Missing Transactions Banner */}
      {missingTransactions > 0 && (
        <div style={bannerStyle}>
          <div style={bannerContentStyle}>
            <div style={bannerIconStyle}>⚠️</div>
            <div style={bannerTextStyle}>
              <strong>{missingTransactions}</strong> past transaction{missingTransactions > 1 ? 's' : ''} need to be updated with actual amounts
            </div>
          </div>
          <button
            onClick={() => onNavigate('forecast')}
            style={bannerButtonStyle}
          >
            Update Transactions
          </button>
        </div>
      )}

      <div style={widgetsGridStyle}>
        {/* Predicted Balance Today */}
        <button
          onClick={() => onNavigate('forecast')}
          style={widgetButtonStyle}
        >
          <div style={widgetTitleStyle}>Predicted Balance Today</div>
          <div style={widgetValueStyle}>
            {todayBalance !== null ? formatMoney(todayBalance) : '$--'}
          </div>
          <div style={widgetSubtitleStyle}>{formatDateLongUTC(new Date())}</div>
        </button>

        {/* Estimated Month End Balance */}
        <button
          onClick={() => onNavigate('forecast')}
          style={widgetButtonStyle}
        >
          <div style={widgetTitleStyle}>Estimated Month End Balance</div>
          <div style={widgetValueStyle}>
            {monthEndBalance !== null ? formatMoney(monthEndBalance) : '$--'}
          </div>
          <div style={widgetSubtitleStyle}>
            {formatDateLongUTC(new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 0)))}
          </div>
        </button>

        {/* Minimum Balance Alert */}
        <button
          onClick={() => onNavigate('forecast')}
          style={{
            ...widgetButtonStyle,
            background: minBalanceAlert 
              ? (minBalanceAlert.severity === 'danger' ? 'var(--danger-bg)' : 'var(--warning-bg)')
              : 'var(--bg-tertiary)',
            border: minBalanceAlert 
              ? (minBalanceAlert.severity === 'danger' ? '1px solid var(--danger-border)' : '1px solid var(--warning-border)')
              : '1px solid var(--border-primary)',
          }}
        >
          <div style={widgetTitleStyle}>
            {minBalanceAlert ? '⚠️ Transfer Needed' : '✓ Safe Balance'}
          </div>
          {minBalanceAlert ? (
            <>
              <div style={{ 
                ...widgetValueStyle, 
                color: minBalanceAlert.severity === 'danger' ? 'var(--color-danger)' : 'var(--color-warning)'
              }}>
                {formatMoney(minBalanceAlert.amount)}
              </div>
              <div style={widgetSubtitleStyle}>
                By {formatDateLongUTC(parseDateUTC(minBalanceAlert.date))}
              </div>
            </>
          ) : (
            <>
              <div style={{ ...widgetValueStyle, color: 'var(--color-success)' }}>$0.00</div>
              <div style={widgetSubtitleStyle}>No shortfall expected</div>
            </>
          )}
        </button>

        {/* Recommendations Summary */}
        <button
          onClick={() => onNavigate('recommendation')}
          style={widgetButtonStyle}
        >
          <div style={widgetTitleStyle}>Contribution Insights</div>
          {recommendations && recommendations.adjustmentNeeded ? (
            <>
              <div style={widgetValueStyle}>
                Action Required
              </div>
              <div style={widgetSubtitleStyle}>
                Review recommendations
              </div>
            </>
          ) : (
            <>
              <div style={{ ...widgetValueStyle, color: 'var(--color-success)' }}>On Track</div>
              <div style={widgetSubtitleStyle}>No adjustments needed</div>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function formatMoney(value: number): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Styles
const containerStyle: React.CSSProperties = {
  marginBottom: '2rem',
};

const bannerStyle: React.CSSProperties = {
  background: 'var(--warning-bg)',
  border: '1px solid var(--warning-border)',
  borderRadius: '8px',
  padding: '1rem',
  marginBottom: '1.5rem',
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '1rem',
  flexWrap: 'wrap',
};

const bannerContentStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
};

const bannerIconStyle: React.CSSProperties = {
  fontSize: '1.5rem',
};

const bannerTextStyle: React.CSSProperties = {
  color: 'var(--warning-text)',
};

const bannerButtonStyle: React.CSSProperties = {
  background: 'var(--button-bg)',
  color: 'var(--button-text)',
  border: 'none',
  borderRadius: '6px',
  padding: '0.5rem 1rem',
  fontWeight: 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const widgetsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: '1rem',
};

const widgetButtonStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  padding: '1rem',
  borderRadius: '8px',
  border: '1px solid var(--border-primary)',
  cursor: 'pointer',
  textAlign: 'left',
  width: '100%',
  transition: 'all 0.2s',
  fontFamily: 'inherit',
  fontSize: 'inherit',
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  boxSizing: 'border-box',
};

const headingStyle: React.CSSProperties = {
  fontWeight: '500',
  color: 'var(--text-secondary)',
  marginBottom: '0.5rem',
  display: 'block',
};

const widgetTitleStyle: React.CSSProperties = {
  fontSize: 'var(--font-label)',
  fontWeight: '500',
  color: 'var(--text-secondary)',
  marginBottom: '0.5rem',
  display: 'block',
};

const widgetValueStyle: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: '600',
  color: 'var(--text-primary)',
  marginBottom: '0.25rem',
};

const widgetSubtitleStyle: React.CSSProperties = {
  fontSize: 'var(--font-label)',
  color: 'var(--text-secondary)',
};
