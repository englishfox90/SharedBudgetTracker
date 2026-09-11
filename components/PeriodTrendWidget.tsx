'use client';

import { useState, useEffect } from 'react';
import { PeriodTrendForecast } from '@/lib/period-trend-forecast';
import { formatDateShortUTC, parseDateUTC } from '@/lib/date-utils';
import { formatMoney } from '@/lib/actualize';

interface Props {
  accountId: number;
  variableExpenses: Array<{ id: number; name: string; billingCycleDay?: number | null }>;
}

export function PeriodTrendWidget({ variableExpenses }: Props) {
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

  const trendTone = (label: string): 'safe' | 'danger' | 'neutral' =>
    label === 'Trending Higher' ? 'danger' : label === 'Trending Lower' ? 'safe' : 'neutral';

  return (
    <div className="card">
      <div className="section-head">
        <div>
          <h3 className="section-title">Check a billing period</h3>
          <p>Enter today&apos;s balance on a card to see where the cycle is likely to end.</p>
        </div>
      </div>

      <div className="stack" style={{ gap: '0.875rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-secondary)', marginBottom: '1.25rem' }}>
        <div>
          <label className="label" htmlFor="ptw-expense">Variable expense</label>
          <select id="ptw-expense" value={selectedExpenseId || ''} onChange={(e) => setSelectedExpenseId(Number(e.target.value))} className="select">
            {variableExpenses.map((exp) => (
              <option key={exp.id} value={exp.id}>{exp.name}</option>
            ))}
          </select>
        </div>

        <div className="grid-2">
          <div>
            <label className="label" htmlFor="ptw-start">Period start</label>
            <input id="ptw-start" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="ptw-end">Period end</label>
            <input id="ptw-end" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="input" />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="ptw-balance">Current balance ($)</label>
          <input
            id="ptw-balance"
            type="text"
            inputMode="decimal"
            value={currentBalance}
            onChange={(e) => setCurrentBalance(e.target.value)}
            placeholder="e.g. 2453.67"
            className="input"
          />
        </div>

        <div>
          <button onClick={handleCalculate} disabled={loading} className="btn btn-primary">
            {loading ? 'Calculating…' : 'Calculate forecast'}
          </button>
        </div>

        {error && (
          <div className="alert alert--danger"><div>{error}</div></div>
        )}
      </div>

      {forecast && (
        <div className="stack" style={{ gap: '1rem' }}>
          <div className={`alert alert--${trendTone(forecast.trendLabel) === 'neutral' ? 'info' : trendTone(forecast.trendLabel)}`}>
            <div>
              <strong>{forecast.trendLabel}.</strong> You are {Math.abs(forecast.trendPercentage).toFixed(1)}%{' '}
              {forecast.trendPercentage >= 0 ? 'above' : 'below'} the usual pace for this point in the period
              ({forecast.daysElapsed} of {forecast.totalDays} days).
            </div>
          </div>

          <div>
            <div className="meter" style={{ height: 8 }}>
              <div className="meter__fill" style={{ width: `${(forecast.fractionElapsed * 100).toFixed(1)}%` }} />
            </div>
            <div style={{ fontSize: 'var(--font-small)', color: 'var(--text-muted)', marginTop: '0.375rem' }}>Period progress</div>
          </div>

          <div className="grid-3">
            <div className="stat-tile">
              <div className="stat-tile__label">Spent so far</div>
              <div className="stat-tile__value">{formatMoney(forecast.actualToDate)}</div>
            </div>
            <div className="stat-tile">
              <div className="stat-tile__label">Expected by now</div>
              <div className="stat-tile__value">{formatMoney(forecast.expectedToDate)}</div>
            </div>
            <div className="stat-tile stat-tile--accent">
              <div className="stat-tile__label">Predicted period total</div>
              <div className="stat-tile__value">{formatMoney(forecast.predictedFullPeriodSpend)}</div>
              <div className="stat-tile__sub">
                usual {formatMoney(forecast.baselineFullPeriodSpend)} ·{' '}
                {forecast.baselineFullPeriodSpend > 0
                  ? `${forecast.predictedFullPeriodSpend >= forecast.baselineFullPeriodSpend ? '+' : ''}${(((forecast.predictedFullPeriodSpend - forecast.baselineFullPeriodSpend) / forecast.baselineFullPeriodSpend) * 100).toFixed(1)}%`
                  : '—'}
              </div>
            </div>
          </div>

          {forecast.dailyForecasts && forecast.dailyForecasts.length > 0 && (
            <details>
              <summary className="btn btn-ghost btn-sm" style={{ listStyle: 'none' }}>
                Daily forecast · {forecast.dailyForecasts.length} remaining days
              </summary>
              <div className="table-wrap" style={{ marginTop: '0.75rem', maxHeight: 300, overflowY: 'auto', border: '1px solid var(--border-secondary)', borderRadius: 'var(--radius-sm)' }}>
                <table className="table">
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)' }}>
                    <tr>
                      <th>Date</th>
                      <th className="num">Predicted spend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.dailyForecasts.map((day) => (
                      <tr key={day.date}>
                        <td>{formatDateShortUTC(parseDateUTC(day.date))}</td>
                        <td className="num">{formatMoney(day.predictedSpend)}</td>
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
