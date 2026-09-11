'use client';

import { IconLabel, TrendingDownIcon, TrendingUpIcon, ArrowRightIcon, ClipboardListIcon, CheckIcon, AlertTriangleIcon, AlertOctagonIcon, InfoIcon } from './icons';
import { formatMoney } from '@/lib/actualize';

import { useState, useEffect } from 'react';
import type { BudgetAnalysis } from '@/lib/budget-advisor';
import { PeriodTrendWidget } from './PeriodTrendWidget';
import { useAccount } from '@/contexts/AccountContext';

interface BudgetAdvisorTabProps {
  year: number;
  month: number;
}

export default function BudgetAdvisorTab({
  year,
  month,
}: BudgetAdvisorTabProps) {
  const [analyses, setAnalyses] = useState<BudgetAnalysis[]>([]);
  const { account, loading: accountLoading } = useAccount();
  const accountId = account?.id ?? null;
  const [variableExpenses, setVariableExpenses] = useState<Array<{ id: number; name: string; billingCycleDay?: number | null }>>([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    try {
      setLoading(true);
      const accId = accountId;
      
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

  useEffect(() => {
    if (!accountLoading) {
      fetchData();
    }
  }, [year, month, accountId, accountLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || accountLoading) {
    return (
      <div className="stack">
        <div className="skeleton" style={{ height: '36px', width: '40%' }} />
        <div className="skeleton" style={{ height: '300px' }} />
        <div className="skeleton" style={{ height: '420px' }} />
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: '1.25rem' }}>
      <div className="section-head" style={{ marginBottom: 0 }}>
        <div>
          <h2 className="page-title">Budget</h2>
          <p>Variable expenses against the goals you set in Setup.</p>
        </div>
      </div>

      {analyses.length === 0 && (
        <div className="alert alert--info">
          <InfoIcon size={18} />
          <div>No budget goals yet. Edit a variable expense in Setup and give it a budget goal to start tracking it here.</div>
        </div>
      )}

      {analyses.map((analysis) => (
        <BudgetCard key={analysis.expense.id} analysis={analysis} />
      ))}

      {accountId && variableExpenses.length > 0 && (
        <PeriodTrendWidget accountId={accountId} variableExpenses={variableExpenses} />
      )}
    </div>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function BudgetCard({ analysis }: { analysis: BudgetAnalysis }) {
  const { expense, currentMonth, historical, impact, recommendations } = analysis;
  const [periodTrend, setPeriodTrend] = useState<any>(null);

  async function loadPeriodTrend() {
    try {
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
    }
  }

  useEffect(() => {
    if (expense.billingCycleDay) {
      loadPeriodTrend();
    }
  }, [expense.id, expense.billingCycleDay]); // eslint-disable-line react-hooks/exhaustive-deps

  const tone: 'safe' | 'warning' | 'danger' =
    currentMonth.status === 'on-track' ? 'safe' : currentMonth.status === 'warning' ? 'warning' : 'danger';
  const statusLabel = currentMonth.status === 'on-track' ? 'On track' : currentMonth.status === 'warning' ? 'Watch' : 'Over budget';
  const statusIcon = tone === 'safe' ? <CheckIcon size={11} strokeWidth={3} /> : tone === 'warning' ? <AlertTriangleIcon size={11} /> : <AlertOctagonIcon size={11} />;
  const spentPercent = Math.min((currentMonth.actualSpending / currentMonth.budgetGoal) * 100, 100);
  const timePercent = Math.min((currentMonth.daysElapsed / currentMonth.daysInMonth) * 100, 100);
  const remaining = currentMonth.budgetGoal - currentMonth.actualSpending;
  const trendTone = periodTrend ? (periodTrend.trendLabel === 'Trending Lower' ? 'safe' : periodTrend.trendLabel === 'Trending Higher' ? 'danger' : 'neutral') : 'neutral';

  return (
    <div className="card">
      <div className="section-head">
        <div>
          <h3 className="section-title">{expense.name}</h3>
          <p>Goal {formatMoney(currentMonth.budgetGoal)} a month · {currentMonth.daysElapsed} of {currentMonth.daysInMonth} days</p>
        </div>
        <span className={`pill pill--${tone}`}>{statusIcon} {statusLabel}</span>
      </div>

      {/* Spend so far */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div className="row row--between" style={{ alignItems: 'baseline', marginBottom: '0.5rem' }}>
          <span className="stat-value">{formatMoney(currentMonth.actualSpending)}</span>
          <span style={{ fontSize: 'var(--font-small)', color: 'var(--text-secondary)' }}>
            {remaining >= 0 ? `${formatMoney(remaining)} left` : `${formatMoney(Math.abs(remaining))} over`}
          </span>
        </div>
        <div className={`meter meter--${tone}`} style={{ position: 'relative', height: 10 }}>
          <div className="meter__fill" style={{ width: `${spentPercent}%` }} />
          <div
            title="Where the month is today"
            style={{ position: 'absolute', top: -3, bottom: -3, left: `${timePercent}%`, width: 2, background: 'var(--text-primary)', opacity: 0.6 }}
          />
        </div>
        <div className="row row--between" style={{ fontSize: 'var(--font-small)', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
          <span>{Math.round(spentPercent)}% of goal spent</span>
          <span>marker = {Math.round(timePercent)}% of the month gone</span>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: '1.25rem' }}>
        <div className="stat-tile">
          <div className="stat-tile__label">Projected month end</div>
          <div className="stat-tile__value">{formatMoney(currentMonth.projectedTotal)}</div>
          <div className={`stat-tile__sub ${currentMonth.projectedVariance <= 0 ? 'money-pos' : 'money-neg'}`}>
            {formatMoney(Math.abs(currentMonth.projectedVariance))} {currentMonth.projectedVariance <= 0 ? 'under' : 'over'} goal
          </div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile__label">3-month average</div>
          <div className="stat-tile__value">{formatMoney(historical.averageMonthly)}</div>
          <div className="stat-tile__sub">
            <IconLabel icon={historical.trend === 'improving' ? <TrendingDownIcon size={12} /> : historical.trend === 'worsening' ? <TrendingUpIcon size={12} /> : <ArrowRightIcon size={12} />}>
              {historical.trend === 'improving' ? 'Improving' : historical.trend === 'worsening' ? 'Worsening' : 'Stable'}
            </IconLabel>
          </div>
        </div>
        <div className="stat-tile stat-tile--accent">
          <div className="stat-tile__label">If you hit the goal</div>
          <div className="stat-tile__value">{formatMoney(Math.abs(impact.annualSavingsIfGoalMet))}</div>
          <div className="stat-tile__sub">saved a year · {impact.percentageReduction.toFixed(0)}% less</div>
        </div>
      </div>

      {periodTrend && (
        <div className="card--inset" style={{ marginBottom: '1.25rem' }}>
          <div className="section-head" style={{ marginBottom: '0.625rem' }}>
            <div>
              <div style={{ fontWeight: 700 }}>Current billing period</div>
              <p>Cycle starts on day {expense.billingCycleDay}</p>
            </div>
            <span className={`pill pill--${trendTone}`}>
              {trendTone === 'danger' ? <TrendingUpIcon size={11} /> : trendTone === 'safe' ? <TrendingDownIcon size={11} /> : <ArrowRightIcon size={11} />}
              {periodTrend.trendLabel}
            </span>
          </div>
          <div className="grid-2" style={{ gap: '0.5rem' }}>
            <div className="kv"><span className="kv__label">Spent so far</span><span className="kv__value">{formatMoney(periodTrend.actualToDate)}</span></div>
            <div className="kv"><span className="kv__label">Expected by now</span><span className="kv__value">{formatMoney(periodTrend.expectedToDate)}</span></div>
            <div className="kv"><span className="kv__label">Usual full period</span><span className="kv__value">{formatMoney(periodTrend.baselineFullPeriodSpend)}</span></div>
            <div className="kv"><span className="kv__label">Predicted end</span><span className="kv__value">{formatMoney(periodTrend.predictedFullPeriodSpend)}</span></div>
          </div>
        </div>
      )}

      <div className="grid-3" style={{ marginBottom: '1.25rem' }}>
        {historical.last3Months.map((monthData) => (
          <div key={`${monthData.year}-${monthData.month}`} className="kv" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '0.5rem 0.75rem', border: '1px solid var(--border-secondary)', borderRadius: 'var(--radius-sm)' }}>
            <span className="kv__label">{MONTHS[monthData.month - 1]} {monthData.year}</span>
            <span className="kv__value" style={{ fontSize: 'var(--font-body)' }}>{formatMoney(monthData.amount)}</span>
            <span className={`kv__label ${monthData.variance > 0 ? 'money-neg' : 'money-pos'}`}>{formatMoney(Math.abs(monthData.variance))} {monthData.variance > 0 ? 'over' : 'under'}</span>
          </div>
        ))}
      </div>

      {recommendations.length > 0 && (
        <div>
          <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>
            <IconLabel icon={<ClipboardListIcon size={16} />}>What to do</IconLabel>
          </div>
          <div className="step-list">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="step-list__item">
                <span className="step-list__num">{idx + 1}</span>
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
