'use client';

import { MonthSummary } from '@/lib/six-month-forecast';
import { formatMoney } from '@/lib/actualize';

interface Props {
  months: MonthSummary[];
}

export default function VarianceSummary({ months }: Props) {
  const totals = months.reduce(
    (acc, month) => ({
      income: acc.income + month.totalIncome,
      fixed: acc.fixed + month.totalFixedExpenses,
      variable: acc.variable + month.totalVariableExpenses,
      total: acc.total + month.totalExpenses,
    }),
    { income: 0, fixed: 0, variable: 0, total: 0 }
  );

  const netChange = totals.income - totals.total;
  const fixedShare = totals.total > 0 ? (totals.fixed / totals.total) * 100 : 0;

  return (
    <div className="card">
      <div className="section-head">
        <div>
          <h3 className="section-title">Six-month totals</h3>
          <p>Income against expenses across the outlook.</p>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: '1.25rem' }}>
        <div className="stat-tile">
          <div className="stat-tile__label">Income</div>
          <div className="stat-tile__value money-pos">{formatMoney(totals.income)}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile__label">Expenses</div>
          <div className="stat-tile__value money-neg">{formatMoney(totals.total)}</div>
        </div>
        <div className={`stat-tile ${netChange >= 0 ? 'stat-tile--accent' : ''}`} style={netChange < 0 ? { background: 'var(--danger-bg)', borderColor: 'transparent' } : undefined}>
          <div className="stat-tile__label">Net change</div>
          <div className={`stat-tile__value ${netChange >= 0 ? 'money-pos' : 'money-neg'}`}>{formatMoney(netChange, true)}</div>
        </div>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <div className="row row--between" style={{ fontSize: 'var(--font-small)', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
          <span>Fixed {formatMoney(totals.fixed)} · {Math.round(fixedShare)}%</span>
          <span>Variable {formatMoney(totals.variable)} · {Math.round(100 - fixedShare)}%</span>
        </div>
        <div className="meter" style={{ height: 10 }}>
          <div className="meter__fill" style={{ width: `${fixedShare}%`, background: 'var(--chart-balance)', borderRadius: '999px 0 0 999px' }} />
        </div>
        <div style={{ fontSize: 'var(--font-small)', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
          Share of expenses that are fixed (blue) versus variable.
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Month</th>
              <th className="num">Income</th>
              <th className="num">Expenses</th>
              <th className="num">Net</th>
            </tr>
          </thead>
          <tbody>
            {months.map((month, idx) => {
              const monthNet = month.totalIncome - month.totalExpenses;
              return (
                <tr key={idx}>
                  <td style={{ fontWeight: 600 }}>{month.monthName.split(' ')[0]}</td>
                  <td className="num">{formatMoney(month.totalIncome)}</td>
                  <td className="num">{formatMoney(month.totalExpenses)}</td>
                  <td className={`num ${monthNet >= 0 ? 'money-pos' : 'money-neg'}`} style={{ fontWeight: 700 }}>{formatMoney(monthNet, true)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
