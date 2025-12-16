'use client';

import { useState, useEffect } from 'react';
import { PeriodTrendForecast } from '@/lib/period-trend-forecast';

interface Props {
  accountId: number;
  variableExpenses: Array<{ id: number; name: string; billingCycleDay?: number | null }>;
}

export function PeriodTrendWidget({ accountId, variableExpenses }: Props) {
  const [selectedExpenseId, setSelectedExpenseId] = useState<number | null>(
    variableExpenses.length > 0 ? variableExpenses[0].id : null
  );
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [forecast, setForecast] = useState<PeriodTrendForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-populate dates when expense changes or expenses load
  useEffect(() => {
    if (selectedExpenseId && variableExpenses.length > 0) {
      const expense = variableExpenses.find(e => e.id === selectedExpenseId);
      
      if (expense?.billingCycleDay) {
        // Auto-populate billing period based on today
        const now = new Date();
        const today = now.getDate();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const cycleDay = expense.billingCycleDay;

        let startMonth, startYear, endMonth, endYear;
        
        if (today >= cycleDay) {
          // Current period: this month's cycle day to next month's cycle day
          startMonth = currentMonth;
          startYear = currentYear;
          endMonth = currentMonth === 12 ? 1 : currentMonth + 1;
          endYear = currentMonth === 12 ? currentYear + 1 : currentYear;
        } else {
          // Still in previous period: last month's cycle day to this month's cycle day
          startMonth = currentMonth === 1 ? 12 : currentMonth - 1;
          startYear = currentMonth === 1 ? currentYear - 1 : currentYear;
          endMonth = currentMonth;
          endYear = currentYear;
        }

        const start = `${startYear}-${String(startMonth).padStart(2, '0')}-${String(cycleDay).padStart(2, '0')}`;
        const end = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(cycleDay).padStart(2, '0')}`;
        
        setPeriodStart(start);
        setPeriodEnd(end);
      } else {
        // Clear dates if no billing cycle
        setPeriodStart('');
        setPeriodEnd('');
      }
    }
  }, [selectedExpenseId, variableExpenses]);

  async function handleCalculate() {
    if (!selectedExpenseId || !periodStart || !periodEnd || !currentBalance) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/period-trend-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recurringExpenseId: selectedExpenseId,
          periodStart,
          periodEnd,
          currentBalance: parseFloat(currentBalance),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to calculate forecast');
      }

      const data = await res.json();
      setForecast(data);
    } catch (err: any) {
      setError(err.message);
      setForecast(null);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (value: number) => {
    return Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getTrendColor = (label: string) => {
    switch (label) {
      case 'Trending Higher':
        return '#dc2626';
      case 'Trending Lower':
        return '#16a34a';
      default:
        return '#666';
    }
  };

  const getTrendBadgeStyle = (label: string): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      padding: '0.5rem 1rem',
      borderRadius: '6px',
      fontSize: '0.875rem',
      fontWeight: '600',
      display: 'inline-block',
    };

    switch (label) {
      case 'Trending Higher':
        return { ...baseStyle, background: '#fee2e2', color: '#991b1b' };
      case 'Trending Lower':
        return { ...baseStyle, background: '#dcfce7', color: '#166534' };
      default:
        return { ...baseStyle, background: '#f3f4f6', color: '#374151' };
    }
  };

  return (
    <div style={widgetStyle}>
      <h3 style={headingStyle}>Period Trend Forecast</h3>
      <p style={descriptionStyle}>
        Track your spending cycle and predict where you'll end up based on current trends.
      </p>

      {/* Input Section */}
      <div style={inputSectionStyle}>
        <div style={inputGroupStyle}>
          <label style={labelStyle}>Variable Expense</label>
          <select
            value={selectedExpenseId || ''}
            onChange={(e) => setSelectedExpenseId(Number(e.target.value))}
            style={selectStyle}
          >
            {variableExpenses.map((exp) => (
              <option key={exp.id} value={exp.id}>
                {exp.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Period Start</label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Period End</label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={inputGroupStyle}>
          <label style={labelStyle}>Current Balance ($)</label>
          <input
            type="number"
            step="0.01"
            value={currentBalance}
            onChange={(e) => setCurrentBalance(e.target.value)}
            placeholder="e.g., 2453.67"
            style={inputStyle}
          />
        </div>

        <button onClick={handleCalculate} disabled={loading} style={buttonStyle}>
          {loading ? 'Calculating...' : 'Calculate Forecast'}
        </button>

        {error && (
          <div style={errorStyle}>{error}</div>
        )}
      </div>

      {/* Results Section */}
      {forecast && (
        <div style={resultsStyle}>
          {/* Trend Badge */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={getTrendBadgeStyle(forecast.trendLabel)}>
              {forecast.trendLabel}
            </div>
            <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              You are currently{' '}
              <strong style={{ color: getTrendColor(forecast.trendLabel) }}>
                {forecast.trendPercentage >= 0 ? '+' : ''}
                {forecast.trendPercentage.toFixed(1)}%
              </strong>{' '}
              {forecast.trendPercentage >= 0 ? 'above' : 'below'} expected for this point in the period.
            </p>
          </div>

          {/* Progress Bar */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
              <span>Period Progress</span>
              <span>{forecast.daysElapsed} of {forecast.totalDays} days</span>
            </div>
            <div style={progressBarContainerStyle}>
              <div
                style={{
                  ...progressBarFillStyle,
                  width: `${(forecast.fractionElapsed * 100).toFixed(1)}%`,
                }}
              />
            </div>
          </div>

          {/* Key Metrics */}
          <div style={metricsGridStyle}>
            <div style={metricCardStyle}>
              <div style={metricLabelStyle}>Actual To-Date</div>
              <div style={metricValueStyle}>${formatCurrency(forecast.actualToDate)}</div>
            </div>

            <div style={metricCardStyle}>
              <div style={metricLabelStyle}>Expected To-Date</div>
              <div style={metricValueStyle}>${formatCurrency(forecast.expectedToDate)}</div>
            </div>

            <div style={metricCardStyle}>
              <div style={metricLabelStyle}>Baseline Full Period</div>
              <div style={metricValueStyle}>${formatCurrency(forecast.baselineFullPeriodSpend)}</div>
            </div>

            <div style={{ ...metricCardStyle, gridColumn: '1 / -1', background: 'var(--bg-tertiary)' }}>
              <div style={metricLabelStyle}>Predicted End Balance</div>
              <div style={{ ...metricValueStyle, fontSize: '1.5rem', color: 'var(--text-primary)' }}>
                ${formatCurrency(forecast.predictedFullPeriodSpend)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                vs baseline ${formatCurrency(forecast.baselineFullPeriodSpend)} (
                {forecast.predictedFullPeriodSpend >= forecast.baselineFullPeriodSpend ? '+' : ''}
                {((forecast.predictedFullPeriodSpend - forecast.baselineFullPeriodSpend) / forecast.baselineFullPeriodSpend * 100).toFixed(1)}%)
              </div>
            </div>
          </div>

          {/* Visual Comparison Bar */}
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
              Spend Comparison
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Predicted Total: ${formatCurrency(forecast.predictedFullPeriodSpend)}
                </div>
                <div style={comparisonBarContainerStyle}>
                  <div
                    style={{
                      ...comparisonBarFillStyle,
                      width: '100%',
                      background: getTrendColor(forecast.trendLabel),
                    }}
                  />
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>
                  Baseline Total: ${formatCurrency(forecast.baselineFullPeriodSpend)}
                </div>
                <div style={comparisonBarContainerStyle}>
                  <div
                    style={{
                      ...comparisonBarFillStyle,
                      width: `${(forecast.baselineFullPeriodSpend / forecast.predictedFullPeriodSpend * 100).toFixed(1)}%`,
                      background: '#9ca3af',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Daily Forecast Breakdown */}
          {forecast.dailyForecasts && forecast.dailyForecasts.length > 0 && (
            <details style={{ marginTop: '1.5rem' }}>
              <summary style={{ 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                cursor: 'pointer',
                padding: '0.5rem',
                background: '#f9fafb',
                borderRadius: '4px',
                userSelect: 'none',
              }}>
                Daily Forecast Breakdown ({forecast.dailyForecasts.length} remaining days)
              </summary>
              <div style={{ 
                marginTop: '0.75rem', 
                maxHeight: '300px', 
                overflowY: 'auto',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
              }}>
                <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-primary)' }}>
                    <tr>
                      <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '500' }}>Date</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '500' }}>Predicted Spend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.dailyForecasts.map((day, idx) => (
                      <tr key={day.date} style={{ 
                        borderBottom: idx < forecast.dailyForecasts.length - 1 ? '1px solid #f3f4f6' : 'none' 
                      }}>
                        <td style={{ padding: '0.5rem' }}>
                          {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'monospace' }}>
                          ${day.predictedSpend.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

// Styles
const widgetStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  padding: '1rem',
  borderRadius: '8px',
  border: '1px solid var(--border-primary)',
  marginBottom: '1.5rem',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  padding: '1rem',
  borderRadius: '8px',
  border: '1px solid var(--border-primary)',
};

const headingStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: '600',
  marginBottom: '0.5rem',
};

const descriptionStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: 'var(--text-secondary)',
  marginBottom: '1.5rem',
};

const inputSectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  paddingBottom: '1.5rem',
  borderBottom: '1px solid #e0e0e0',
  marginBottom: '1.5rem',
};

const inputGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  fontWeight: '500',
  color: 'var(--text-primary)',
};

const inputStyle: React.CSSProperties = {
  padding: '0.5rem',
  border: '1px solid var(--border-primary)',
  borderRadius: '6px',
  fontSize: '0.875rem',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  background: 'var(--bg-primary)',
};

const buttonStyle: React.CSSProperties = {
  padding: '0.75rem 1.5rem',
  background: '#1a1a1a',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '0.875rem',
  fontWeight: '600',
  cursor: 'pointer',
};

const errorStyle: React.CSSProperties = {
  padding: '0.75rem',
  background: '#fee2e2',
  color: '#991b1b',
  borderRadius: '6px',
  fontSize: '0.875rem',
};

const resultsStyle: React.CSSProperties = {
  marginTop: '1.5rem',
};

const progressBarContainerStyle: React.CSSProperties = {
  height: '8px',
  background: '#e5e7eb',
  borderRadius: '4px',
  overflow: 'hidden',
};

const progressBarFillStyle: React.CSSProperties = {
  height: '100%',
  background: '#1a1a1a',
  transition: 'width 0.3s ease',
};

const metricsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1rem',
};

const metricCardStyle: React.CSSProperties = {
  padding: '1rem',
  background: 'var(--bg-tertiary)',
  borderRadius: '6px',
  border: '1px solid var(--border-primary)',
};

const metricLabelStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '0.25rem',
};

const metricValueStyle: React.CSSProperties = {
  fontSize: '1.125rem',
  fontWeight: '600',
  color: 'var(--text-primary)',
};

const comparisonBarContainerStyle: React.CSSProperties = {
  height: '24px',
  background: 'var(--bg-tertiary)',
  borderRadius: '4px',
  overflow: 'hidden',
};

const comparisonBarFillStyle: React.CSSProperties = {
  height: '100%',
  transition: 'width 0.3s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  paddingRight: '0.5rem',
  color: 'white',
  fontSize: '0.75rem',
  fontWeight: '600',
};
