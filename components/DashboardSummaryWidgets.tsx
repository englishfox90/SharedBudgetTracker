'use client';

import { useState, useEffect } from 'react';
import { format, addMonths } from 'date-fns';

interface DashboardSummaryProps {
  accountId: number;
  onNavigate: (tab: string) => void;
}

interface ForecastData {
  days: Array<{ 
    date: string; 
    closingBalance: number;
  }>;
  overallStatus: {
    minBalance: number;
    daysBelowSafeMin: number;
  };
  safeMinBalance: number;
}

interface RecommendationData {
  insights: Array<{
    type: string;
    message: string;
    impact: number;
  }>;
  suggestedContribution: number;
  adjustmentNeeded: boolean;
}

export function DashboardSummaryWidgets({ accountId, onNavigate }: DashboardSummaryProps) {
  const [todayBalance, setTodayBalance] = useState<number | null>(null);
  const [monthEndBalance, setMonthEndBalance] = useState<number | null>(null);
  const [minBalanceAlert, setMinBalanceAlert] = useState<{ amount: number; date: string; severity: 'warning' | 'danger' } | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationData | null>(null);
  const [missingTransactions, setMissingTransactions] = useState<number>(0);
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
    loadDashboardData();
  }, [accountId]);

  async function loadDashboardData() {
    try {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;

      // Get current month forecast
      const currentForecastRes = await fetch(
        `/api/forecast?accountId=${accountId}&year=${currentYear}&month=${currentMonth}`
      );
      const currentForecast: ForecastData = await currentForecastRes.json();

      // Find today's balance
      const todayStr = format(today, 'yyyy-MM-dd');
      const todayData = currentForecast.days.find((d: any) => d.date === todayStr);
      if (todayData) {
        setTodayBalance(todayData.closingBalance);
      }

      // Get month-end balance (last day of current forecast)
      if (currentForecast.days.length > 0) {
        const lastDay = currentForecast.days[currentForecast.days.length - 1];
        setMonthEndBalance(lastDay.closingBalance);
      }

      // Check for missing transactions (past days with estimated events)
      const pastDays = currentForecast.days.filter((d: any) => {
        const dayDate = new Date(d.date);
        dayDate.setHours(0, 0, 0, 0);
        const compareDate = new Date(today);
        compareDate.setHours(0, 0, 0, 0);
        // Only include days BEFORE today (not today itself)
        return dayDate < compareDate;
      });

      // Count DAYS with forecast EXPENSE events (exclude income contributions)
      const daysWithMissingTransactions = pastDays.filter((d: any) => {
        return d.events?.some((e: any) => 
          !e.actualized && e.amount < 0 // Only count expenses (negative amounts) that aren't actualized
        );
      });

      setMissingTransactions(daysWithMissingTransactions.length);

      // Get next month forecast for lookahead
      const nextMonth = addMonths(today, 1);
      const nextYear = nextMonth.getFullYear();
      const nextMonthNum = nextMonth.getMonth() + 1;

      const nextForecastRes = await fetch(
        `/api/forecast?accountId=${accountId}&year=${nextYear}&month=${nextMonthNum}`
      );
      const nextForecast: ForecastData = await nextForecastRes.json();

      // Combine forecasts to check for minimum balance violations
      const allDays = [...currentForecast.days, ...nextForecast.days];
      
      // Get safe minimum balance from forecast
      const minimumBalance = currentForecast.safeMinBalance;

      // Check all days including future days in current month
      const futureDays = allDays.filter((d: any) => {
        const dayDate = new Date(d.date);
        dayDate.setHours(0, 0, 0, 0);
        const compareDate = new Date(today);
        compareDate.setHours(0, 0, 0, 0);
        // Include today and future days
        return dayDate >= compareDate;
      });

      // Find lowest point below minimum in future days
      const belowMinimum = futureDays.filter((d: any) => d.closingBalance < minimumBalance);
      if (belowMinimum.length > 0) {
        // Sort by date to find the EARLIEST/SOONEST violation (not the worst)
        belowMinimum.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const earliest = belowMinimum[0];
        
        setMinBalanceAlert({
          amount: minimumBalance - earliest.closingBalance,
          date: earliest.date,
          severity: earliest.closingBalance < 0 ? 'danger' : 'warning', // Red if negative, orange if below minimum
        });
      } else {
        setMinBalanceAlert(null);
      }

      // Get recommendations
      const recsRes = await fetch(`/api/recommendations?accountId=${accountId}&year=${currentYear}&month=${currentMonth}`);
      const recsData = await recsRes.json();
      
      if (recsData) {
        setRecommendations({
          insights: recsData.suggestions || [],
          suggestedContribution: recsData.contributionAnalysis?.recommendedAnnualContribution || 0,
          adjustmentNeeded: recsData.contributionAnalysis?.adjustmentNeeded || false,
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={containerStyle}>
        <p>Loading summary...</p>
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
            ${todayBalance !== null ? todayBalance.toFixed(2) : '--'}
          </div>
          <div style={widgetSubtitleStyle}>{format(new Date(), 'MMM d, yyyy')}</div>
        </button>

        {/* Estimated Month End Balance */}
        <button
          onClick={() => onNavigate('forecast')}
          style={widgetButtonStyle}
        >
          <div style={widgetTitleStyle}>Estimated Month End Balance</div>
          <div style={widgetValueStyle}>
            ${monthEndBalance !== null ? monthEndBalance.toFixed(2) : '--'}
          </div>
          <div style={widgetSubtitleStyle}>
            {format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), 'MMM d, yyyy')}
          </div>
        </button>

        {/* Minimum Balance Alert */}
        <button
          onClick={() => onNavigate('forecast')}
          style={{
            ...widgetButtonStyle,
            background: minBalanceAlert 
              ? (minBalanceAlert.severity === 'danger' ? '#fef2f2' : 'var(--warning-bg)')
              : 'var(--bg-tertiary)',
            border: minBalanceAlert 
              ? (minBalanceAlert.severity === 'danger' ? '1px solid #fca5a5' : '1px solid var(--warning-border)')
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
                color: minBalanceAlert.severity === 'danger' ? '#dc2626' : '#d97706'
              }}>
                ${minBalanceAlert.amount.toFixed(2)}
              </div>
              <div style={widgetSubtitleStyle}>
                By {format(new Date(minBalanceAlert.date), 'MMM d, yyyy')}
              </div>
            </>
          ) : (
            <>
              <div style={{ ...widgetValueStyle, color: '#16a34a' }}>$0.00</div>
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
              <div style={{ ...widgetValueStyle, color: '#16a34a' }}>On Track</div>
              <div style={widgetSubtitleStyle}>No adjustments needed</div>
            </>
          )}
        </button>
      </div>
    </div>
  );
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
  color: '#78350f',
};

const bannerButtonStyle: React.CSSProperties = {
  background: '#1a1a1a',
  color: 'white',
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
