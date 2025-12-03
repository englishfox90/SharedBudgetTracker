'use client';

import { ExpenseTrend } from '@/lib/trend-detection';

interface Props {
  trends: ExpenseTrend[];
}

export default function TrendChart({ trends }: Props) {
  if (trends.length === 0) {
    return (
      <div style={cardStyle}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
          Variable Expense Trends
        </h3>
        <p style={{ color: '#666', fontSize: '0.875rem' }}>
          No variable expense data available. Add variable expenses in the Setup tab to see trends.
        </p>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>
        Variable Expense Trends
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {trends.map((trend) => {
          const trendIcon = trend.trend === 'increasing' ? '↑' : trend.trend === 'decreasing' ? '↓' : '→';
          const trendColor = trend.trend === 'increasing' ? '#dc2626' : trend.trend === 'decreasing' ? '#16a34a' : '#666';

          return (
            <div
              key={trend.recurringExpenseId}
              style={{
                padding: '1rem',
                borderRadius: '6px',
                background: trend.alert ? '#fef3c7' : '#fafafa',
                border: trend.alert ? '1px solid #fcd34d' : '1px solid #e0e0e0',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                {/* Category Name */}
                <div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: '600', color: '#1a1a1a' }}>
                    {trend.expenseName}
                  </div>
                  {trend.alert && (
                    <div style={{ fontSize: '0.75rem', color: '#92400e', marginTop: '0.25rem' }}>
                      ⚠️ 15%+ above average
                    </div>
                  )}
                </div>

                {/* Trend Indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem', color: trendColor }}>{trendIcon}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: trendColor }}>
                    {Math.abs(trend.trendPercentage)}%
                  </span>
                </div>
              </div>

              {/* Values */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', fontSize: '0.8125rem' }}>
                <div>
                  <div style={{ color: '#666', marginBottom: '0.25rem' }}>Current Month</div>
                  <div style={{ fontWeight: '600', color: '#1a1a1a' }}>
                    ${trend.currentMonthActual.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#666', marginBottom: '0.25rem' }}>3-Mo Avg</div>
                  <div style={{ fontWeight: '500' }}>
                    ${trend.threeMonthAverage.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#666', marginBottom: '0.25rem' }}>6-Mo Avg</div>
                  <div style={{ fontWeight: '500' }}>
                    ${trend.sixMonthAverage.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f9f9f9', borderRadius: '4px', fontSize: '0.8125rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <span style={{ color: '#666' }}>Increasing: </span>
            <span style={{ fontWeight: '600', color: '#dc2626' }}>
              {trends.filter(t => t.trend === 'increasing').length}
            </span>
          </div>
          <div>
            <span style={{ color: '#666' }}>Stable: </span>
            <span style={{ fontWeight: '600' }}>
              {trends.filter(t => t.trend === 'stable').length}
            </span>
          </div>
          <div>
            <span style={{ color: '#666' }}>Decreasing: </span>
            <span style={{ fontWeight: '600', color: '#16a34a' }}>
              {trends.filter(t => t.trend === 'decreasing').length}
            </span>
          </div>
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
