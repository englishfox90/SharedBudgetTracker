'use client';

import { useState, useEffect } from 'react';
import { ForecastResult } from '@/types';
import { formatDateShortUTC } from '@/lib/date-utils';
import AddTransactionDialog from './setup/AddTransactionDialog';
import ActualizeEventDialog from './forecast/ActualizeEventDialog';

interface Props {
  currentMonth: { year: number; month: number };
  onMonthChange: (month: { year: number; month: number }) => void;
}

export default function ForecastTab({ currentMonth, onMonthChange }: Props) {
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  function formatCurrency(value: number): string {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  useEffect(() => {
    loadAccountId();
  }, []);

  useEffect(() => {
    if (accountId) {
      loadForecast();
    }
  }, [currentMonth, accountId]);

  async function loadAccountId() {
    try {
      const res = await fetch('/api/accounts');
      const accounts = await res.json();
      if (accounts.length > 0) {
        setAccountId(accounts[0].id);
        setAccount(accounts[0]);
      }
    } catch (error) {
      console.error('Error loading account:', error);
    }
  }

  async function loadForecast() {
    if (!accountId) return;
    
    setLoading(true);
    try {
      const res = await fetch(
        `/api/forecast?accountId=${accountId}&year=${currentMonth.year}&month=${currentMonth.month}`
      );
      const data = await res.json();
      setForecast(data);
    } catch (error) {
      console.error('Error loading forecast:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatUTCDate(dateString: string): string {
    // dateString is in format YYYY-MM-DD
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return formatDateShortUTC(date);
  }

  function handlePreviousMonth() {
    const newMonth = currentMonth.month === 1 ? 12 : currentMonth.month - 1;
    const newYear = currentMonth.month === 1 ? currentMonth.year - 1 : currentMonth.year;
    
    // Check if new month is before start date (use UTC)
    if (account?.startDate) {
      const startDate = new Date(account.startDate);
      const startYear = startDate.getUTCFullYear();
      const startMonth = startDate.getUTCMonth() + 1; // 0-indexed, so add 1
      
      // Compare year and month
      if (newYear < startYear || (newYear === startYear && newMonth < startMonth)) {
        return; // Don't navigate before start date
      }
    }
    
    setLoading(true);
    onMonthChange({ year: newYear, month: newMonth });
  }

  function handleNextMonth() {
    const newMonth = currentMonth.month === 12 ? 1 : currentMonth.month + 1;
    const newYear = currentMonth.month === 12 ? currentMonth.year + 1 : currentMonth.year;
    setLoading(true);
    onMonthChange({ year: newYear, month: newMonth });
  }

  if (loading && !forecast) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ height: '40px', background: 'var(--bg-tertiary)', borderRadius: '4px', animation: 'pulse 2s infinite' }} />
        <div style={{ height: '150px', background: 'var(--bg-tertiary)', borderRadius: '8px', animation: 'pulse 2s infinite' }} />
        <div style={{ height: '400px', background: 'var(--bg-tertiary)', borderRadius: '8px', animation: 'pulse 2s infinite' }} />
      </div>
    );
  }

  if (!accountId) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No account found. Please set up your account in the Setup tab first.</div>;
  }

  if (!forecast || forecast.startingBalance === undefined || !forecast.overallStatus) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No forecast data available. Please set up income and expenses in the Setup tab.</div>;
  }

  const monthName = new Date(currentMonth.year, currentMonth.month - 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  // Check if we're at the start date
  const isAtStartDate = account?.startDate ? (() => {
    const startDate = new Date(account.startDate);
    const currentDate = new Date(currentMonth.year, currentMonth.month - 1, 1);
    return currentDate <= new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  })() : false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative' }}>
      {loading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--bg-primary)',
          opacity: 0.7,
          zIndex: 10,
          borderRadius: '8px',
        }} />
      )}
      {/* Month Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600' }}>{monthName}</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={handlePreviousMonth} 
            disabled={loading || isAtStartDate} 
            style={{ ...buttonStyle, opacity: (loading || isAtStartDate) ? 0.5 : 1, cursor: (loading || isAtStartDate) ? 'not-allowed' : 'pointer' }}
          >
            ← Previous
          </button>
          <button onClick={handleNextMonth} disabled={loading} style={{ ...buttonStyle, opacity: loading ? 0.5 : 1, cursor: loading ? 'wait' : 'pointer' }}>
            Next →
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <div style={summaryCardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem' }}>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              {forecast.isStartMonth ? 'Starting Balance' : 'Opening Balance'}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>
              ${formatCurrency(forecast.startingBalance)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Lowest Balance
            </div>
            <div
              style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color:
                  forecast.overallStatus.minBalance < 0 ? '#dc2626' : forecast.overallStatus.minBalance < forecast.safeMinBalance ? '#f97316' : '#16a34a',
              }}
            >
              ${formatCurrency(forecast.overallStatus.minBalance)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Safe Minimum
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>
              ${formatCurrency(forecast.safeMinBalance)}
            </div>
          </div>
        </div>

        {forecast.overallStatus.daysBelowSafeMin > 0 && (
          <div
            style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: forecast.overallStatus.minBalance < 0 ? '#fee' : 'var(--warning-bg)',
              border: forecast.overallStatus.minBalance < 0 ? '1px solid #fcc' : '1px solid var(--warning-border)',
              borderRadius: '6px',
              color: forecast.overallStatus.minBalance < 0 ? '#dc2626' : 'var(--warning-text)',
            }}
          >
            {forecast.overallStatus.minBalance < 0 ? '🚨' : '⚠️'} {forecast.overallStatus.minBalance < 0 ? 'Critical' : 'Warning'}: Your balance is projected to {forecast.overallStatus.minBalance < 0 ? 'go negative' : 'drop below your safe minimum'} on{' '}
            {forecast.overallStatus.daysBelowSafeMin} day(s) this month.
          </div>
        )}
      </div>

      {/* Daily Forecast Table */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>
            Daily Breakdown
          </h3>
          {accountId && <AddTransactionDialog accountId={accountId} onAdded={loadForecast} />}
        </div>
        <div style={{ overflow: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Events</th>
                <th style={thStyle}>Opening</th>
                <th style={thStyle}>Change</th>
                <th style={thStyle}>Closing</th>
              </tr>
            </thead>
            <tbody>
              {forecast.days
                .filter((day) => day.events.length > 0 || day.belowSafeMin)
                .map((day) => {
                  const isNegative = day.closingBalance < 0;
                  const isBelowSafe = day.closingBalance < forecast.safeMinBalance && day.closingBalance >= 0;
                  return (
                    <tr
                      key={day.date}
                      style={{
                        background: isNegative ? '#fee' : isBelowSafe ? 'var(--warning-bg)' : 'transparent',
                      }}
                    >
                      <td style={tdStyle}>
                        {formatUTCDate(day.date)}
                      </td>
                    <td style={tdStyle}>
                      {day.events.map((event, i) => (
                        <div key={i} style={{ marginBottom: i < day.events.length - 1 ? '0.5rem' : '0' }}>
                          {event.actualized ? (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              fontSize: '0.875rem'
                            }}>
                              <div style={{ flex: 1 }}>
                                {event.description}:{' '}
                                <span style={{
                                  fontWeight: '600',
                                  color: event.amount > 0 ? '#16a34a' : '#dc2626',
                                }}>
                                  {event.amount > 0 ? '+' : ''}${formatCurrency(Math.abs(event.amount))}
                                </span>
                                {event.forecastedAmount !== undefined && Math.abs(event.amount - event.forecastedAmount) >= 1 && (() => {
                                  const variance = event.amount - event.forecastedAmount;
                                  // For expenses (negative amounts): worse = more negative (higher spending) = ↑
                                  // For income (positive amounts): worse = less positive (lower income) = ↓
                                  const isWorse = variance < 0;
                                  const arrow = event.amount < 0 
                                    ? (variance < 0 ? '↑' : '↓')  // Expense: up = overspent, down = saved
                                    : (variance < 0 ? '↓' : '↑'); // Income: down = less income, up = more income
                                  
                                  return (
                                    <span style={{
                                      marginLeft: '0.5rem',
                                      padding: '0.125rem 0.375rem',
                                      background: isWorse ? '#fee2e2' : '#dcfce7',
                                      color: isWorse ? '#991b1b' : '#166534',
                                      borderRadius: '4px',
                                      fontSize: '0.75rem',
                                      fontWeight: '600',
                                    }}>
                                      {arrow} ${formatCurrency(Math.abs(variance))}
                                    </span>
                                  );
                                })()}
                              </div>
                              <div style={{
                                padding: '0.25rem 0.5rem',
                                background: '#16a34a',
                                color: 'white',
                                borderRadius: '4px',
                                fontSize: '0.625rem',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                letterSpacing: '0.05em'
                              }}>
                                <span>✓</span>
                                <span>ACTUAL</span>
                              </div>
                            </div>
                          ) : (
                            accountId && (
                              <ActualizeEventDialog
                                event={event}
                                accountId={accountId}
                                onActualized={loadForecast}
                              />
                            )
                          )}
                        </div>
                      ))}
                    </td>
                    <td style={tdStyle}>${formatCurrency(day.openingBalance)}</td>
                    <td
                      style={{
                        ...tdStyle,
                        color: day.netChange > 0 ? '#16a34a' : '#dc2626',
                        fontWeight: '600',
                      }}
                    >
                      {day.netChange > 0 ? '+' : ''}${formatCurrency(Math.abs(day.netChange))}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: '600',
                        color: day.closingBalance < 0 ? '#dc2626' : day.belowSafeMin ? '#f97316' : 'inherit',
                      }}
                    >
                      ${formatCurrency(day.closingBalance)}
                      {day.closingBalance < 0 ? ' 🚨' : day.belowSafeMin ? ' ⚠️' : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Styles
const buttonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  background: '#1a1a1a',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  fontSize: '0.875rem',
  fontWeight: '500',
  cursor: 'pointer',
};

const summaryCardStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  padding: '1.5rem',
  borderRadius: '8px',
  border: '1px solid var(--border-primary)',
};

const sectionStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  padding: '1.5rem',
  borderRadius: '8px',
  border: '1px solid var(--border-primary)',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  padding: '1.5rem',
  borderRadius: '8px',
  border: '1px solid var(--border-primary)',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.875rem',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.75rem',
  borderBottom: '2px solid var(--border-primary)',
  fontWeight: '600',
  color: 'var(--text-secondary)',
};

const tdStyle: React.CSSProperties = {
  padding: '0.75rem',
  borderBottom: '1px solid var(--border-primary)',
};
