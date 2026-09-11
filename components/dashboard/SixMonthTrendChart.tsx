'use client';

import { TrendingUpIcon } from '../icons';
import LineChart from '../charts/LineChart';

interface SixMonthTrendChartProps {
  months: Array<{
    monthName: string;
    totalIncome: number;
    totalExpenses: number;
    closingBalance: number;
  }>;
}

export default function SixMonthTrendChart({ months }: SixMonthTrendChartProps) {
  if (months.length === 0) return null;

  return (
    <div className="card">
      <div className="row" style={{ gap: '0.5rem', marginBottom: '0.25rem' }}>
        <TrendingUpIcon size={18} style={{ color: 'var(--accent)' }} />
        <h3 className="section-title">Next 6 months</h3>
      </div>
      <p style={{ fontSize: 'var(--font-small)', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Projected closing balance alongside monthly income and expenses. Hover or touch for values.
      </p>
      <LineChart
        ariaLabel="Six month balance, income and expense trend"
        labels={months.map((m) => m.monthName.split(' ')[0].slice(0, 3))}
        height={240}
        series={[
          { key: 'balance', label: 'Closing balance', color: 'var(--chart-balance)', values: months.map((m) => m.closingBalance), emphasis: true },
          { key: 'income', label: 'Income', color: 'var(--chart-income)', values: months.map((m) => m.totalIncome), dashed: true },
          { key: 'expenses', label: 'Expenses', color: 'var(--chart-expenses)', values: months.map((m) => m.totalExpenses), dashed: true },
        ]}
      />
    </div>
  );
}
