'use client';

import { MonthSummary } from '@/lib/six-month-forecast';
import { formatMoney } from '@/lib/actualize';
import { CheckIcon, AlertTriangleIcon, AlertOctagonIcon } from '../icons';

interface Props {
  months: MonthSummary[];
  safeMinBalance: number;
}

const STATUS = {
  safe: { label: 'Safe', icon: <CheckIcon size={11} strokeWidth={3} /> },
  warning: { label: 'Tight', icon: <AlertTriangleIcon size={11} /> },
  danger: { label: 'Critical', icon: <AlertOctagonIcon size={11} /> },
} as const;

export default function SixMonthOverview({ months, safeMinBalance }: Props) {
  const issues = months.filter((m) => m.status !== 'safe').length;
  return (
    <div className="card">
      <div className="section-head">
        <div>
          <h3 className="section-title">Month by month</h3>
          <p>
            {issues === 0
              ? `Every month stays above your ${formatMoney(safeMinBalance)} safe minimum.`
              : `${issues} month${issues === 1 ? '' : 's'} dip${issues === 1 ? 's' : ''} below your ${formatMoney(safeMinBalance)} safe minimum.`}
          </p>
        </div>
      </div>

      <div className="grid-3">
        {months.map((month, idx) => {
          const net = month.closingBalance - month.openingBalance;
          const st = STATUS[month.status];
          return (
            <div key={idx} className={`month-tile month-tile--${month.status}`}>
              <div className="month-tile__head">
                <span>{month.monthName.split(' ')[0]}</span>
                <span className={`pill pill--${month.status}`}>{st.icon} {st.label}</span>
              </div>
              <div className="kv"><span className="kv__label">Opening</span><span className="kv__value">{formatMoney(month.openingBalance)}</span></div>
              <div className="kv"><span className="kv__label">Net</span><span className={`kv__value ${net >= 0 ? 'money-pos' : 'money-neg'}`}>{formatMoney(net, true)}</span></div>
              <div className="kv"><span className="kv__label">Lowest</span><span className="kv__value">{formatMoney(month.lowestBalance)}</span></div>
              {month.status !== 'safe' && (
                <div style={{ fontSize: 'var(--font-small)', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Lowest on day {month.lowestBalanceDay} · {month.daysBelowSafeMin} day{month.daysBelowSafeMin === 1 ? '' : 's'} under
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
