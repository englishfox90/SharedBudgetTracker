'use client';

import { ExpenseTrend } from '@/lib/trend-detection';
import { formatMoney } from '@/lib/actualize';
import { TrendingUpIcon, TrendingDownIcon, ArrowRightIcon, AlertTriangleIcon } from '../icons';

interface Props {
  trends: ExpenseTrend[];
}

export default function TrendChart({ trends }: Props) {
  const increasing = trends.filter((t) => t.trend === 'increasing').length;
  const decreasing = trends.filter((t) => t.trend === 'decreasing').length;

  return (
    <div className="card">
      <div className="section-head">
        <div>
          <h3 className="section-title">Variable expense trends</h3>
          <p>
            {trends.length === 0
              ? 'Add variable expenses in Setup to see trends.'
              : `${increasing} rising · ${trends.length - increasing - decreasing} stable · ${decreasing} falling`}
          </p>
        </div>
      </div>

      {trends.length > 0 && (
        <div className="list">
          {trends.map((trend) => {
            const tone = trend.trend === 'increasing' ? 'danger' : trend.trend === 'decreasing' ? 'safe' : 'neutral';
            const icon = trend.trend === 'increasing' ? <TrendingUpIcon size={12} /> : trend.trend === 'decreasing' ? <TrendingDownIcon size={12} /> : <ArrowRightIcon size={12} />;
            return (
              <div key={trend.recurringExpenseId} className="list-item" style={{ flexWrap: 'wrap', background: trend.alert ? 'var(--warning-bg)' : undefined, borderColor: trend.alert ? 'var(--warning-border)' : undefined }}>
                <div className="list-item__body">
                  <div className="list-item__title">
                    {trend.expenseName}
                    <span className={`pill pill--${tone}`}>{icon} {Math.abs(trend.trendPercentage)}%</span>
                    {trend.alert && <span className="pill pill--warning"><AlertTriangleIcon size={11} /> 15%+ above average</span>}
                  </div>
                  <div className="list-item__meta">
                    This month {formatMoney(trend.currentMonthActual)} · 3-mo avg {formatMoney(trend.threeMonthAverage)} · 6-mo avg {formatMoney(trend.sixMonthAverage)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
