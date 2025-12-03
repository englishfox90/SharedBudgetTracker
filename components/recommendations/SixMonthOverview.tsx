'use client';

import { MonthSummary } from '@/lib/six-month-forecast';

interface Props {
  months: MonthSummary[];
  safeMinBalance: number;
}

export default function SixMonthOverview({ months, safeMinBalance }: Props) {
  return (
    <div style={cardStyle}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>
        6-Month Forecast Overview
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        {months.map((month, idx) => {
          const statusColors = {
            safe: { bg: '#d1fae5', border: '#6ee7b7', text: '#065f46' },
            warning: { bg: '#fef3c7', border: '#fcd34d', text: '#92400e' },
            danger: { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' },
          };
          const colors = statusColors[month.status];

          return (
            <div
              key={idx}
              style={{
                padding: '1rem',
                borderRadius: '8px',
                background: colors.bg,
                border: `2px solid ${colors.border}`,
              }}
            >
              {/* Month Name */}
              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1a1a1a', marginBottom: '0.75rem' }}>
                {month.monthName.split(' ')[0]} {/* Just the month name */}
              </div>

              {/* Opening Balance */}
              <div style={{ marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>Opening</div>
                <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                  ${month.openingBalance.toLocaleString()}
                </div>
              </div>

              {/* Net Change */}
              <div style={{ marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>Net Change</div>
                <div
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: month.closingBalance >= month.openingBalance ? '#16a34a' : '#dc2626',
                  }}
                >
                  {month.closingBalance >= month.openingBalance ? '+' : ''}
                  ${(month.closingBalance - month.openingBalance).toLocaleString()}
                </div>
              </div>

              {/* Lowest Balance */}
              <div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>Lowest</div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: colors.text }}>
                  ${month.lowestBalance.toLocaleString()}
                </div>
                {month.status !== 'safe' && (
                  <div style={{ fontSize: '0.7rem', color: colors.text, marginTop: '0.25rem' }}>
                    Day {month.lowestBalanceDay} • {month.daysBelowSafeMin}d below min
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem', fontSize: '0.75rem', color: '#666' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#d1fae5', border: '1px solid #6ee7b7' }} />
          <span>Safe</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#fef3c7', border: '1px solid #fcd34d' }} />
          <span>Warning (&lt;7 days)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#fee2e2', border: '1px solid #fca5a5' }} />
          <span>Critical (7+ days)</span>
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
