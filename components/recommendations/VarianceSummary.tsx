'use client';

import { MonthSummary } from '@/lib/six-month-forecast';

interface Props {
  months: MonthSummary[];
}

export default function VarianceSummary({ months }: Props) {
  // Calculate overall totals
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
  const isPositive = netChange >= 0;

  return (
    <div className="card">
      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>
        6-Month Financial Summary
      </h3>

      {/* Overview Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '600' }}>
            Total Income
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--color-success)' }}>
            ${totals.income.toLocaleString()}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '600' }}>
            Total Expenses
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--color-danger)' }}>
            ${totals.total.toLocaleString()}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '600' }}>
            Net Change
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: isPositive ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {isPositive ? '+' : ''}${netChange.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Expense Breakdown */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
          Expense Breakdown
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Fixed Expenses</span>
            <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>${totals.fixed.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Variable Expenses</span>
            <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>${totals.variable.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Month-by-Month Table */}
      <div>
        <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
          Month-by-Month Details
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-primary)' }}>
                <th style={tableHeaderStyle}>Month</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Income</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Expenses</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Net</th>
              </tr>
            </thead>
            <tbody>
              {months.map((month, idx) => {
                const monthNet = month.totalIncome - month.totalExpenses;
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                    <td style={tableCellStyle}>{month.monthName.split(' ')[0]}</td>
                    <td style={{ ...tableCellStyle, textAlign: 'right', color: 'var(--color-success)' }}>
                      ${month.totalIncome.toLocaleString()}
                    </td>
                    <td style={{ ...tableCellStyle, textAlign: 'right', color: 'var(--color-danger)' }}>
                      ${month.totalExpenses.toLocaleString()}
                    </td>
                    <td style={{ ...tableCellStyle, textAlign: 'right', fontWeight: '600', color: monthNet >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {monthNet >= 0 ? '+' : ''}${monthNet.toLocaleString()}
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

const tableHeaderStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.75rem 0.5rem',
  fontWeight: '600',
  color: 'var(--text-secondary)',
};

const tableCellStyle: React.CSSProperties = {
  padding: '0.75rem 0.5rem',
};
