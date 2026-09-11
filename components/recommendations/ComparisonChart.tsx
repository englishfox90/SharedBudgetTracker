'use client';

import { BarChartIcon } from '../icons';
import LineChart from '../charts/LineChart';

interface ComparisonChartProps {
  currentAnnual: number;
  recommendedAnnual: number;
  months: Array<{
    monthName: string;
    totalIncome: number;
    closingBalance: number;
  }>;
}

export default function ComparisonChart({ currentAnnual, recommendedAnnual, months }: ComparisonChartProps) {
  if (months.length === 0) return null;

  const adjustmentRatio = currentAnnual > 0 ? recommendedAnnual / currentAnnual : 1;

  // Recommended scenario: balances with the extra contributions accumulating month over month
  const recommendedBalances = months.reduce<number[]>((acc, month, idx) => {
    const previousIncrease = idx === 0 ? 0 : acc[idx - 1] - months[idx - 1].closingBalance;
    const cumulativeIncrease = previousIncrease + month.totalIncome * (adjustmentRatio - 1);
    acc.push(month.closingBalance + cumulativeIncrease);
    return acc;
  }, []);

  return (
    <div className="card">
      <div className="row" style={{ gap: '0.5rem', marginBottom: '0.25rem' }}>
        <BarChartIcon size={18} style={{ color: 'var(--accent)' }} />
        <h4 className="section-title">6-month impact</h4>
      </div>
      <p style={{ fontSize: 'var(--font-small)', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Closing balance with today&apos;s contributions versus the recommended amount.
      </p>
      <LineChart
        ariaLabel="Projected balance with current versus recommended contributions"
        labels={months.map((m) => m.monthName.split(' ')[0].slice(0, 3))}
        height={220}
        series={[
          { key: 'current', label: 'Current contributions', color: 'var(--chart-balance)', values: months.map((m) => m.closingBalance) },
          { key: 'recommended', label: 'Recommended contributions', color: 'var(--chart-balance-alt)', values: recommendedBalances, emphasis: true },
        ]}
      />
    </div>
  );
}
