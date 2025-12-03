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
    <div style={cardStyle}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>
        6-Month Financial Summary
      </h3>

      {/* Overview Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '600' }}>
            Total Income
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#16a34a' }}>
            ${totals.income.toLocaleString()}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '600' }}>
            Total Expenses
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#dc2626' }}>
            ${totals.total.toLocaleString()}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '600' }}>
            Net Change
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: isPositive ? '#16a34a' : '#dc2626' }}>
            {isPositive ? '+' : ''}${netChange.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Expense Breakdown */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem', color: '#1a1a1a' }}>
          Expense Breakdown
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: '#fafafa', borderRadius: '4px' }}>
            <span style={{ fontSize: '0.875rem', color: '#666' }}>Fixed Expenses</span>
            <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>${totals.fixed.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: '#fafafa', borderRadius: '4px' }}>
            <span style={{ fontSize: '0.875rem', color: '#666' }}>Variable Expenses</span>
            <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>${totals.variable.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Month-by-Month Table */}
      <div>
        <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem', color: '#1a1a1a' }}>
          Month-by-Month Details
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
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
                  <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={tableCellStyle}>{month.monthName.split(' ')[0]}</td>
                    <td style={{ ...tableCellStyle, textAlign: 'right', color: '#16a34a' }}>
                      ${month.totalIncome.toLocaleString()}
                    </td>
                    <td style={{ ...tableCellStyle, textAlign: 'right', color: '#dc2626' }}>
                      ${month.totalExpenses.toLocaleString()}
                    </td>
                    <td style={{ ...tableCellStyle, textAlign: 'right', fontWeight: '600', color: monthNet >= 0 ? '#16a34a' : '#dc2626' }}>
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

const cardStyle: React.CSSProperties = {
  background: 'white',
  padding: '1.5rem',
  borderRadius: '8px',
  border: '1px solid #e0e0e0',
};

const tableHeaderStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.75rem 0.5rem',
  fontWeight: '600',
  color: '#666',
};

const tableCellStyle: React.CSSProperties = {
  padding: '0.75rem 0.5rem',
};
