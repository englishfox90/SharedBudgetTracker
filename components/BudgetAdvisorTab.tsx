'use client';

import { useState, useEffect } from 'react';
import type { BudgetAnalysis } from '@/lib/budget-advisor';
import { PeriodTrendWidget } from './PeriodTrendWidget';

interface BudgetAdvisorTabProps {
  year: number;
  month: number;
}

export default function BudgetAdvisorTab({
  year,
  month,
}: BudgetAdvisorTabProps) {
  const [analyses, setAnalyses] = useState<BudgetAnalysis[]>([]);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [variableExpenses, setVariableExpenses] = useState<Array<{ id: number; name: string; billingCycleDay?: number | null }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [year, month]);

  async function fetchData() {
    try {
      setLoading(true);
      
      // Get account ID
      const accountsRes = await fetch('/api/accounts');
      const accounts = await accountsRes.json();
      const accId = accounts.length > 0 ? accounts[0].id : null;
      setAccountId(accId);
      
      // Get budget analysis
      const res = await fetch(`/api/budget-analysis?year=${year}&month=${month}`);
      const data = await res.json();
      setAnalyses(data);
      
      // Get variable expenses for period trend widget
      if (accId) {
        const expensesRes = await fetch(`/api/expenses?accountId=${accId}`);
        const allExpenses = await expensesRes.json();
        const variableOnly = allExpenses
          .filter((exp: any) => exp.isVariable)
          .map((exp: any) => ({ id: exp.id, name: exp.name, billingCycleDay: exp.billingCycleDay }));
        setVariableExpenses(variableOnly);
      }
    } catch (error) {
      console.error('Failed to fetch budget analysis:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading budget analysis...</div>;
  }

  if (analyses.length === 0) {
    return (
      <div style={{ padding: '0' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: '600' }}>Budget Advisor</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-body)' }}>
          No budget goals set yet. Set budget goals on variable expenses in the Setup tab to start tracking.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '0' }}>
      <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: '600' }}>Budget Advisor</h2>

      {/* Period Trend Forecast - for tracking current billing period */}
      {accountId && variableExpenses.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <PeriodTrendWidget accountId={accountId} variableExpenses={variableExpenses} />
        </div>
      )}

      {analyses.map((analysis) => (
        <BudgetCard key={analysis.expense.id} analysis={analysis} />
      ))}
    </div>
  );
}

function BudgetCard({ analysis }: { analysis: BudgetAnalysis }) {
  const { expense, currentMonth, historical, impact, recommendations } = analysis;
  const [periodTrend, setPeriodTrend] = useState<any>(null);
  const [loadingTrend, setLoadingTrend] = useState(false);
  
  // Load period trend forecast if billing cycle is set
  useEffect(() => {
    if (expense.billingCycleDay) {
      loadPeriodTrend();
    }
  }, [expense.id, expense.billingCycleDay]);

  async function loadPeriodTrend() {
    try {
      setLoadingTrend(true);
      
      // Calculate billing period dates
      const now = new Date();
      const today = now.getDate();
      const currentMonthNum = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const cycleDay = expense.billingCycleDay!;

      let startMonth, startYear, endMonth, endYear;
      
      if (today >= cycleDay) {
        startMonth = currentMonthNum;
        startYear = currentYear;
        endMonth = currentMonthNum === 12 ? 1 : currentMonthNum + 1;
        endYear = currentMonthNum === 12 ? currentYear + 1 : currentYear;
      } else {
        startMonth = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
        startYear = currentMonthNum === 1 ? currentYear - 1 : currentYear;
        endMonth = currentMonthNum;
        endYear = currentYear;
      }

      const periodStart = `${startYear}-${String(startMonth).padStart(2, '0')}-${String(cycleDay).padStart(2, '0')}`;
      const periodEnd = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(cycleDay).padStart(2, '0')}`;

      const res = await fetch('/api/period-trend-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recurringExpenseId: expense.id,
          periodStart,
          periodEnd,
          currentBalance: currentMonth.actualSpending,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPeriodTrend(data);
      }
    } catch (error) {
      console.error('Failed to load period trend:', error);
    } finally {
      setLoadingTrend(false);
    }
  }
  
  const statusColor = 
    currentMonth.status === 'on-track' ? 'var(--color-success)' :
    currentMonth.status === 'warning' ? 'var(--color-warning)' :
    'var(--color-danger)';

  const progressPercent = Math.min(
    (currentMonth.actualSpending / currentMonth.budgetGoal) * 100,
    100
  );

  return (
    <div
      style={{
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        background: 'var(--bg-secondary)',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', margin: 0 }}>{expense.name}</h3>
          <span
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '12px',
              background: statusColor,
              color: 'white',
              fontSize: 'var(--font-small)',
              fontWeight: '600',
            }}
          >
            {currentMonth.status.replace('-', ' ').toUpperCase()}
          </span>
        </div>
        <div style={{ fontSize: 'var(--font-label)', color: 'var(--text-secondary)' }}>
          Budget Goal: ${currentMonth.budgetGoal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: 'var(--font-body)', fontWeight: '600' }}>
            ${currentMonth.actualSpending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span style={{ fontSize: 'var(--font-label)', color: 'var(--text-secondary)' }}>
            {currentMonth.daysElapsed} of {currentMonth.daysInMonth} days
          </span>
        </div>
        <div
          style={{
            height: '8px',
            background: 'var(--bg-primary)',
            borderRadius: '4px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPercent}%`,
              background: statusColor,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <div style={{ marginTop: '0.5rem', fontSize: 'var(--font-small)', color: 'var(--text-secondary)' }}>
          {currentMonth.variance >= 0 ? '+$' : '-$'}{Math.abs(currentMonth.variance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (
          {currentMonth.variancePercent >= 0 ? '+' : ''}
          {currentMonth.variancePercent.toFixed(1)}%)
        </div>
      </div>

      {/* Billing Period Tracking */}
      {periodTrend && (
        <div
          style={{
            padding: '1rem',
            background: 'var(--bg-primary)',
            borderRadius: '6px',
            marginBottom: '1.5rem',
            border: `1px solid ${periodTrend.trendLabel === 'Trending Lower' ? 'var(--color-success)' : periodTrend.trendLabel === 'Trending Higher' ? 'var(--color-danger)' : 'var(--border-color)'}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h4 style={{ fontSize: 'var(--font-body)', fontWeight: '600', margin: 0 }}>
              Current Billing Period
            </h4>
            <span
              style={{
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: 'var(--font-small)',
                fontWeight: '600',
                background: periodTrend.trendLabel === 'Trending Lower' ? '#dcfce7' : periodTrend.trendLabel === 'Trending Higher' ? '#fee2e2' : '#f3f4f6',
                color: periodTrend.trendLabel === 'Trending Lower' ? '#166534' : periodTrend.trendLabel === 'Trending Higher' ? '#991b1b' : '#374151',
              }}
            >
              {periodTrend.trendLabel}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', fontSize: 'var(--font-small)' }}>
            <div>
              <div style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Actual Spending</div>
              <div style={{ fontWeight: '600' }}>
                ${periodTrend.actualToDate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Expected</div>
              <div style={{ fontWeight: '600' }}>
                ${periodTrend.expectedToDate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Baseline Full Period</div>
              <div style={{ fontWeight: '600' }}>
                ${periodTrend.baselineFullPeriodSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Predicted End</div>
              <div style={{ fontWeight: '600' }}>
                ${periodTrend.predictedFullPeriodSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Projection */}
      <div
        style={{
          padding: '1rem',
          background: 'var(--bg-primary)',
          borderRadius: '6px',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ fontSize: 'var(--font-label)', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
          Projected Month-End Total
        </div>
        <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>
          ${currentMonth.projectedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div style={{ fontSize: 'var(--font-small)', color: statusColor, marginTop: '0.25rem' }}>
          {currentMonth.projectedVariance >= 0 ? '+$' : '-$'}
          {Math.abs(currentMonth.projectedVariance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} vs budget
        </div>
      </div>

      {/* Historical Trend */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ fontSize: 'var(--font-body)', marginBottom: '0.75rem' }}>
          Last 3 Months
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
          {historical.last3Months.map((monthData) => (
            <div
              key={`${monthData.year}-${monthData.month}`}
              style={{
                padding: '0.75rem',
                background: 'var(--bg-primary)',
                borderRadius: '4px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 'var(--font-label)', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                {new Date(monthData.year, monthData.month - 1).toLocaleDateString('en-US', {
                  month: 'short',
                })}
              </div>
              <div style={{ fontSize: 'var(--font-body)', fontWeight: '600' }}>
                ${monthData.amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <div
                style={{
                  fontSize: 'var(--font-small)',
                  color: monthData.variance > 0 ? 'var(--color-danger)' : 'var(--color-success)',
                }}
              >
                {monthData.variance >= 0 ? '+$' : '-$'}{Math.abs(monthData.variance).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '0.75rem', fontSize: 'var(--font-small)', color: 'var(--text-secondary)' }}>
          Avg: ${historical.averageMonthly.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month
          {' • '}
          Trend: {historical.trend === 'improving' ? '📉 Improving' : historical.trend === 'worsening' ? '📈 Worsening' : '➡️ Stable'}
        </div>
      </div>

      {/* Impact Analysis */}
      <div
        style={{
          padding: '1.25rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '8px',
          color: 'white',
          marginBottom: '1.5rem',
        }}
      >
        <h4 style={{ fontSize: '1rem', marginBottom: '1rem', fontWeight: '600', margin: '0 0 1rem 0' }}>
          💰 Impact of Meeting Your Goal
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
          <div>
            <div style={{ fontSize: 'var(--font-label)', opacity: 0.9, marginBottom: '0.25rem' }}>Annual Savings</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
              ${Math.abs(impact.annualSavingsIfGoalMet).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-label)', opacity: 0.9, marginBottom: '0.25rem' }}>Monthly Reduction</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
              {impact.percentageReduction.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div>
        <h4 style={{ fontSize: 'var(--font-body)', marginBottom: '0.75rem' }}>
          📋 Action Items
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {recommendations.map((rec, idx) => (
            <div
              key={idx}
              style={{
                padding: '0.75rem',
                background: 'var(--bg-primary)',
                borderRadius: '4px',
                fontSize: 'var(--font-small)',
                lineHeight: '1.5',
              }}
            >
              {rec}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
