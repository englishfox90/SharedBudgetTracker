'use client';

import { useState, useEffect } from 'react';
import { addMonths } from 'date-fns';
import { formatDateUTC, parseDateUTC, formatDateLongUTC } from '@/lib/date-utils';
import { formatMoney } from '@/lib/actualize';
import Sparkline from './charts/Sparkline';
import { IconLabel, AlertTriangleIcon, AlertOctagonIcon, CheckCircleIcon, CheckIcon, LightbulbIcon, ArrowRightIcon } from './icons';

interface DashboardSummaryProps {
  accountId: number;
  recommendations: RecommendationData | null;
  onNavigate: (tab: string) => void;
}

interface ForecastDay {
  date: string;
  closingBalance: number;
  events?: Array<{ actualized?: boolean; amount: number }>;
}

interface ForecastData {
  days: ForecastDay[];
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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function shortDate(dateStr: string) {
  const d = parseDateUTC(dateStr);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function DashboardSummaryWidgets({ accountId, recommendations, onNavigate }: DashboardSummaryProps) {
  const [todayBalance, setTodayBalance] = useState<number | null>(null);
  const [monthEnd, setMonthEnd] = useState<{ balance: number; date: string } | null>(null);
  const [monthDays, setMonthDays] = useState<ForecastDay[]>([]);
  const [safeMin, setSafeMin] = useState<number>(0);
  const [minBalanceAlert, setMinBalanceAlert] = useState<{ amount: number; date: string; balance: number; severity: 'warning' | 'danger' } | null>(null);
  const [missingTransactions, setMissingTransactions] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  async function loadDashboardData() {
    try {
      // The forecast API works in UTC calendar days (YYYY-MM-DD strings), so
      // compare those strings directly rather than through local Date objects.
      const todayStr = formatDateUTC(new Date());
      const now = new Date();
      const currentYear = now.getUTCFullYear();
      const currentMonth = now.getUTCMonth() + 1;

      const currentForecastRes = await fetch(
        `/api/forecast?accountId=${accountId}&year=${currentYear}&month=${currentMonth}`
      );
      const currentForecast: ForecastData = await currentForecastRes.json();
      setMonthDays(currentForecast.days);
      setSafeMin(currentForecast.safeMinBalance);

      const todayData = currentForecast.days.find((d) => d.date === todayStr);
      if (todayData) setTodayBalance(todayData.closingBalance);

      if (currentForecast.days.length > 0) {
        const lastDay = currentForecast.days[currentForecast.days.length - 1];
        setMonthEnd({ balance: lastDay.closingBalance, date: lastDay.date });
      }

      // Past days that still have unconfirmed forecast expenses
      const daysWithMissing = currentForecast.days.filter(
        (d) => d.date < todayStr && d.events?.some((e) => !e.actualized && e.amount < 0)
      );
      setMissingTransactions(daysWithMissing.length);

      const nextMonth = addMonths(parseDateUTC(todayStr), 1);
      const nextForecastRes = await fetch(
        `/api/forecast?accountId=${accountId}&year=${nextMonth.getUTCFullYear()}&month=${nextMonth.getUTCMonth() + 1}`
      );
      const nextForecast: ForecastData = await nextForecastRes.json();

      const minimumBalance = currentForecast.safeMinBalance;
      const futureDays = [...currentForecast.days, ...nextForecast.days].filter((d) => d.date >= todayStr);
      const belowMinimum = futureDays
        .filter((d) => d.closingBalance < minimumBalance)
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      if (belowMinimum.length > 0) {
        const earliest = belowMinimum[0];
        setMinBalanceAlert({
          amount: minimumBalance - earliest.closingBalance,
          balance: earliest.closingBalance,
          date: earliest.date,
          severity: earliest.closingBalance < 0 ? 'danger' : 'warning',
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
  }, [accountId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="stack">
        <div className="skeleton" style={{ height: '230px' }} />
        <div className="tile-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: '110px' }} />
          ))}
        </div>
      </div>
    );
  }

  const todayStr = formatDateUTC(new Date());
  const todayIndex = monthDays.findIndex((d) => d.date === todayStr);
  const closingSeries = monthDays.map((d) => d.closingBalance);
  const heroStatus: 'danger' | 'warning' | 'safe' = minBalanceAlert ? minBalanceAlert.severity : 'safe';
  const heroColor = heroStatus === 'danger' ? 'var(--color-danger)' : heroStatus === 'warning' ? 'var(--color-warning)' : 'var(--accent)';

  return (
    <div className="stack">
      {missingTransactions > 0 && (
        <div className="alert alert--warning" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <AlertTriangleIcon size={18} />
          <div style={{ flex: '1 1 200px' }}>
            <strong>{missingTransactions}</strong> past day{missingTransactions > 1 ? 's have' : ' has'} transactions waiting to be confirmed.
          </div>
          <button onClick={() => onNavigate('forecast')} className="btn btn-primary btn-sm">
            Review <ArrowRightIcon size={14} />
          </button>
        </div>
      )}

      {/* Hero: balance today */}
      <div className="card card--interactive" role="button" tabIndex={0} onClick={() => onNavigate('forecast')} onKeyDown={(e) => e.key === 'Enter' && onNavigate('forecast')}>
        <div className="row row--between" style={{ marginBottom: '0.5rem' }}>
          <span className="stat-label">Balance today</span>
          <span className={`pill pill--${heroStatus}`}>
            {heroStatus === 'safe' ? <CheckIcon size={11} strokeWidth={3} /> : heroStatus === 'warning' ? <AlertTriangleIcon size={11} /> : <AlertOctagonIcon size={11} />}
            {heroStatus === 'safe' ? 'On track' : heroStatus === 'warning' ? 'Dips below minimum' : 'Goes negative'}
          </span>
        </div>
        <div className={`hero-figure ${todayBalance !== null && todayBalance < 0 ? 'money-neg' : ''}`}>
          {todayBalance !== null ? formatMoney(todayBalance) : '—'}
        </div>
        <div style={{ fontSize: 'var(--font-small)', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
          Predicted for {formatDateLongUTC(new Date())}
        </div>
        {closingSeries.length > 1 && (
          <div style={{ marginTop: '1rem' }}>
            <Sparkline values={closingSeries} reference={safeMin} markerIndex={todayIndex >= 0 ? todayIndex : null} height={56} color={heroColor} />
            <div className="row row--between" style={{ fontSize: 'var(--font-small)', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              <span>{shortDate(monthDays[0].date)}</span>
              <span>dashed = safe minimum</span>
              <span>{shortDate(monthDays[monthDays.length - 1].date)}</span>
            </div>
          </div>
        )}
        <div className="stat-row" style={{ marginTop: '0.875rem', paddingTop: '0.875rem', borderTop: '1px solid var(--border-secondary)', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          <div>
            <div className="stat-row__label">Month end{monthEnd ? ` · ${shortDate(monthEnd.date)}` : ''}</div>
            <div className={`stat-row__value ${monthEnd && monthEnd.balance < 0 ? 'money-neg' : ''}`}>{monthEnd ? formatMoney(monthEnd.balance) : '—'}</div>
          </div>
          <div>
            <div className="stat-row__label">Safe minimum</div>
            <div className="stat-row__value">{formatMoney(safeMin)}</div>
          </div>
        </div>
      </div>

      {/* Tiles */}
      <div className="tile-grid">
        <button
          onClick={() => onNavigate('forecast')}
          className="card card--interactive tile"
          style={minBalanceAlert ? { borderColor: minBalanceAlert.severity === 'danger' ? 'var(--danger-border)' : 'var(--warning-border)' } : undefined}
        >
          <span className="stat-label">
            {minBalanceAlert ? (
              <IconLabel icon={<AlertTriangleIcon size={14} />}>Transfer needed</IconLabel>
            ) : (
              <IconLabel icon={<CheckCircleIcon size={14} />}>No shortfall</IconLabel>
            )}
          </span>
          {minBalanceAlert ? (
            <>
              <span className="tile__value" style={{ color: minBalanceAlert.severity === 'danger' ? 'var(--color-danger)' : 'var(--color-warning)' }}>
                {formatMoney(minBalanceAlert.amount)}
              </span>
              <span className="tile__sub">to stay above minimum by {formatDateLongUTC(parseDateUTC(minBalanceAlert.date))}</span>
            </>
          ) : (
            <>
              <span className="tile__value money-pos">{formatMoney(0)}</span>
              <span className="tile__sub">Next two months stay above your minimum</span>
            </>
          )}
        </button>

        <button onClick={() => onNavigate('recommendation')} className="card card--interactive tile">
          <span className="stat-label"><IconLabel icon={<LightbulbIcon size={14} />}>Contributions</IconLabel></span>
          {recommendations && recommendations.adjustmentNeeded ? (
            <>
              <span className="tile__value" style={{ color: 'var(--color-warning)' }}>Action needed</span>
              <span className="tile__sub">Review the recommended increase</span>
            </>
          ) : (
            <>
              <span className="tile__value money-pos">On track</span>
              <span className="tile__sub">No adjustments needed</span>
            </>
          )}
        </button>

        <button onClick={() => onNavigate('budget')} className="card card--interactive tile">
          <span className="stat-label"><IconLabel icon={<CheckIcon size={14} />}>Insights</IconLabel></span>
          <span className="tile__value">{recommendations ? recommendations.insights.length : 0}</span>
          <span className="tile__sub">{recommendations && recommendations.insights.length === 1 ? 'suggestion to review' : 'suggestions to review'}</span>
        </button>
      </div>
    </div>
  );
}
