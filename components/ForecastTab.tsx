'use client';

import { useState, useEffect } from 'react';
import { useIsMobile } from '@/lib/useIsMobile';
import { CashEvent, ForecastResult } from '@/types';
import { formatDateShortUTC } from '@/lib/date-utils';
import AddTransactionDialog from './setup/AddTransactionDialog';
import ActualizeEventDialog from './forecast/ActualizeEventDialog';
import EditActualizedEventDialog from './forecast/EditActualizedEventDialog';

interface Props {
  currentMonth: { year: number; month: number };
  onMonthChange: (month: { year: number; month: number }) => void;
}

export default function ForecastTab({ currentMonth, onMonthChange }: Props) {
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();

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
    return <div style={{ padding: isMobile ? '1rem' : '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No account found. Please set up your account in the Setup tab first.</div>;
  }

  if (!forecast || forecast.startingBalance === undefined || !forecast.overallStatus) {
    return <div style={{ padding: isMobile ? '1rem' : '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No forecast data available. Please set up income and expenses in the Setup tab.</div>;
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

  const visibleDays = forecast.days.filter((day) => day.events.length > 0 || day.belowSafeMin);

  function renderEvent(event: CashEvent) {
    if (event.actualized && event.transactionId) {
      return (
        <EditActualizedEventDialog event={event} onUpdated={loadForecast}>
          <div
            role="button"
            tabIndex={0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              padding: isMobile ? '0.5rem' : '0.25rem',
              margin: isMobile ? 0 : '-0.25rem',
              minHeight: isMobile ? '44px' : undefined,
              borderRadius: '6px',
              border: isMobile ? '1px solid var(--border-primary)' : '1px solid transparent',
              background: isMobile ? 'var(--bg-secondary)' : 'transparent',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
            onMouseLeave={(e) => e.currentTarget.style.background = isMobile ? 'var(--bg-secondary)' : 'transparent'}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              {event.description}:{' '}
              <span style={{
                fontWeight: '600',
                whiteSpace: 'nowrap',
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
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                  }}>
                    {arrow} ${formatCurrency(Math.abs(variance))}
                  </span>
                );
              })()}
            </div>
            <div style={{
              flexShrink: 0,
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
        </EditActualizedEventDialog>
      );
    }

    if (!accountId) return null;
    return (
      <ActualizeEventDialog
        event={event}
        accountId={accountId}
        onActualized={loadForecast}
      />
    );
  }

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
        <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '600', margin: 0 }}>{monthName}</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <button 
            onClick={handlePreviousMonth} 
            disabled={loading || isAtStartDate} 
            aria-label="Previous month"
            style={{ 
              ...buttonStyle, 
              ...(isMobile ? navButtonMobileStyle : {}),
              opacity: (loading || isAtStartDate) ? 0.5 : 1, 
              cursor: (loading || isAtStartDate) ? 'not-allowed' : 'pointer' 
            }}
          >
            {isMobile ? '←' : '← Previous'}
          </button>
          <button
            onClick={handleNextMonth}
            disabled={loading}
            aria-label="Next month"
            style={{ 
              ...buttonStyle, 
              ...(isMobile ? navButtonMobileStyle : {}),
              opacity: loading ? 0.5 : 1, 
              cursor: loading ? 'wait' : 'pointer' 
            }}
          >
            {isMobile ? '→' : 'Next →'}
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <div style={{
        background: 'var(--bg-secondary)',
        padding: '1rem',
        borderRadius: '8px',
        border: '1px solid var(--border-primary)',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: isMobile ? '0.625rem' : '2rem' }}>
          {[
            {
              label: forecast.isStartMonth ? 'Starting Balance' : 'Opening Balance',
              value: forecast.startingBalance,
              color: 'inherit',
            },
            {
              label: 'Lowest Balance',
              value: forecast.overallStatus.minBalance,
              color:
                forecast.overallStatus.minBalance < 0 ? '#dc2626' : forecast.overallStatus.minBalance < forecast.safeMinBalance ? '#f97316' : '#16a34a',
            },
            {
              label: 'Safe Minimum',
              value: forecast.safeMinBalance,
              color: 'inherit',
            },
          ].map((item) => (
            <div
              key={item.label}
              style={isMobile ? { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' } : undefined}
            >
              <div style={{ color: 'var(--text-secondary)', marginBottom: isMobile ? 0 : '0.25rem', fontSize: 'var(--font-body)' }}>
                {item.label}
              </div>
              <div style={{ fontSize: isMobile ? '1.125rem' : '1.5rem', fontWeight: '600', color: item.color, whiteSpace: 'nowrap' }}>
                ${formatCurrency(item.value)}
              </div>
            </div>
          ))}
        </div>

        {forecast.overallStatus.daysBelowSafeMin > 0 && (
          <div
            style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: forecast.overallStatus.minBalance < 0 ? 'var(--danger-bg)' : 'var(--warning-bg)',
              border: forecast.overallStatus.minBalance < 0 ? '1px solid var(--danger-border)' : '1px solid var(--warning-border)',
              borderRadius: '6px',
              color: forecast.overallStatus.minBalance < 0 ? 'var(--danger-text)' : 'var(--warning-text)',
            }}
          >
            {forecast.overallStatus.minBalance < 0 ? '🚨' : '⚠️'} {forecast.overallStatus.minBalance < 0 ? 'Critical' : 'Warning'}: Your balance is projected to {forecast.overallStatus.minBalance < 0 ? 'go negative' : 'drop below your safe minimum'} on{' '}
            {forecast.overallStatus.daysBelowSafeMin} day(s) this month.
          </div>
        )}
      </div>

      {/* Daily Forecast */}
      <div style={{
        background: 'var(--bg-secondary)',
        padding: isMobile ? '0.75rem' : '1rem',
        borderRadius: '8px',
        border: '1px solid var(--border-primary)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>
            Daily Breakdown
          </h3>
          {accountId && <AddTransactionDialog accountId={accountId} onAdded={loadForecast} />}
        </div>

        {isMobile ? (
          /* Phone layout: one card per day, events stacked full width */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {visibleDays.map((day) => {
              const isNegative = day.closingBalance < 0;
              const isBelowSafe = day.closingBalance < forecast.safeMinBalance && day.closingBalance >= 0;
              return (
                <div
                  key={day.date}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: `1px solid ${isNegative ? 'var(--danger-border)' : isBelowSafe ? 'var(--warning-border)' : 'var(--border-primary)'}`,
                    background: isNegative ? 'var(--danger-bg)' : isBelowSafe ? 'var(--warning-bg)' : 'var(--bg-primary)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: '600' }}>{formatUTCDate(day.date)}</div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 'var(--font-label)', color: 'var(--text-secondary)' }}>Closing</div>
                      <div style={{
                        fontWeight: '700',
                        fontSize: '1rem',
                        whiteSpace: 'nowrap',
                        color: isNegative ? '#dc2626' : day.belowSafeMin ? '#f97316' : 'inherit',
                      }}>
                        ${formatCurrency(day.closingBalance)}
                        {isNegative ? ' 🚨' : day.belowSafeMin ? ' ⚠️' : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {day.events.map((event, i) => (
                      <div key={i}>{renderEvent(event)}</div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginTop: '0.5rem', fontSize: 'var(--font-small)', color: 'var(--text-secondary)' }}>
                    <span>Opening ${formatCurrency(day.openingBalance)}</span>
                    <span style={{ color: day.netChange > 0 ? '#16a34a' : '#dc2626', fontWeight: '600' }}>
                      {day.netChange > 0 ? '+' : '-'}${formatCurrency(Math.abs(day.netChange))}
                    </span>
                  </div>
                </div>
              );
            })}
            {visibleDays.length === 0 && (
              <p style={{ color: 'var(--text-secondary)' }}>No events this month.</p>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
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
                {visibleDays.map((day) => {
                  const isNegative = day.closingBalance < 0;
                  const isBelowSafe = day.closingBalance < forecast.safeMinBalance && day.closingBalance >= 0;
                  return (
                    <tr
                      key={day.date}
                      style={{
                        background: isNegative ? 'var(--danger-bg)' : isBelowSafe ? 'var(--warning-bg)' : 'transparent',
                      }}
                    >
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                        {formatUTCDate(day.date)}
                      </td>
                      <td style={tdStyle}>
                        {day.events.map((event, i) => (
                          <div key={i} style={{ marginBottom: i < day.events.length - 1 ? '0.5rem' : '0' }}>
                            {renderEvent(event)}
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
                          whiteSpace: 'nowrap',
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
        )}
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
  fontWeight: '500',
  cursor: 'pointer',
};

const navButtonMobileStyle: React.CSSProperties = {
  minWidth: '44px',
  minHeight: '44px',
  padding: '0 0.75rem',
  fontSize: '1.125rem',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.5rem',
  borderBottom: '2px solid var(--border-primary)',
  fontWeight: '600',
  color: 'var(--text-secondary)',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '0.5rem',
  borderBottom: '1px solid var(--border-primary)',
};
