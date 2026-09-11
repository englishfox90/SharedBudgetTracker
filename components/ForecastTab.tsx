'use client';

import { useState, useEffect } from 'react';
import { useIsMobile } from '@/lib/useIsMobile';
import { CashEvent, DayForecast, ForecastResult } from '@/types';
import { formatDateUTC, parseDateUTC } from '@/lib/date-utils';
import { actualizeEvent, cleanDescription, formatMoney } from '@/lib/actualize';
import AddTransactionDialog from './setup/AddTransactionDialog';
import ActualizeEventDialog from './forecast/ActualizeEventDialog';
import EditActualizedEventDialog from './forecast/EditActualizedEventDialog';
import Sparkline from './charts/Sparkline';
import { useAccount } from '@/contexts/AccountContext';
import {
  ChevronLeftIcon, ChevronRightIcon, CheckIcon, AlertTriangleIcon, AlertOctagonIcon,
  ArrowUpIcon, ArrowDownIcon, IconLabel,
} from './icons';

interface Props {
  currentMonth: { year: number; month: number };
  onMonthChange: (month: { year: number; month: number }) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function eventKey(event: CashEvent): string {
  return `${formatDateUTC(event.date)}|${event.incomeRuleId ?? ''}|${event.recurringExpenseId ?? ''}|${event.description}`;
}

export default function ForecastTab({ currentMonth, onMonthChange }: Props) {
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const { account, loading: accountLoading } = useAccount();
  const accountId = account?.id ?? null;
  const [loading, setLoading] = useState(false);
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null);
  const [justConfirmed, setJustConfirmed] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (accountId) {
      loadForecast();
    }
  }, [currentMonth, accountId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadForecast() {
    if (!accountId) return;
    
    setLoading(true);
    try {
      const res = await fetch(
        `/api/forecast?accountId=${accountId}&year=${currentMonth.year}&month=${currentMonth.month}`
      );
      const data = await res.json();
      setForecast(data);
    } catch (error) {
      console.error('Error loading forecast:', error);
    } finally {
      setLoading(false);
    }
  }

  async function quickConfirm(event: CashEvent) {
    if (!accountId) return;
    const key = eventKey(event);
    setConfirmingKey(key);
    setError(null);
    try {
      await actualizeEvent(event, accountId);
      setJustConfirmed((prev) => new Set(prev).add(key));
      await loadForecast();
    } catch (err) {
      console.error('Error confirming transaction:', err);
      setError('Could not confirm that transaction. Please try again.');
    } finally {
      setConfirmingKey(null);
    }
  }

  function handlePreviousMonth() {
    const newMonth = currentMonth.month === 1 ? 12 : currentMonth.month - 1;
    const newYear = currentMonth.month === 1 ? currentMonth.year - 1 : currentMonth.year;
    
    // Don't navigate before the account start month (UTC)
    if (account?.startDate) {
      const startDate = new Date(account.startDate);
      const startYear = startDate.getUTCFullYear();
      const startMonth = startDate.getUTCMonth() + 1;
      if (newYear < startYear || (newYear === startYear && newMonth < startMonth)) {
        return;
      }
    }
    
    setLoading(true);
    onMonthChange({ year: newYear, month: newMonth });
  }

  function handleNextMonth() {
    const newMonth = currentMonth.month === 12 ? 1 : currentMonth.month + 1;
    const newYear = currentMonth.month === 12 ? currentMonth.year + 1 : currentMonth.year;
    setLoading(true);
    onMonthChange({ year: newYear, month: newMonth });
  }

  if ((loading || accountLoading) && !forecast) {
    return (
      <div className="forecast-layout">
        <div className="stack">
          <div className="skeleton" style={{ height: '40px' }} />
          <div className="skeleton" style={{ height: '260px' }} />
        </div>
        <div className="skeleton" style={{ height: '420px' }} />
      </div>
    );
  }

  if (!accountId) {
    return <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No account found. Please set up your account in the Setup tab first.</div>;
  }

  if (!forecast || forecast.startingBalance === undefined || !forecast.overallStatus) {
    return <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No forecast data available. Please set up income and expenses in the Setup tab.</div>;
  }

  const monthName = new Date(Date.UTC(currentMonth.year, currentMonth.month - 1, 1)).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  const isAtStartDate = account?.startDate ? (() => {
    const startDate = new Date(account.startDate);
    const startYear = startDate.getUTCFullYear();
    const startMonth = startDate.getUTCMonth() + 1;
    return currentMonth.year < startYear || (currentMonth.year === startYear && currentMonth.month <= startMonth);
  })() : false;

  const todayStr = formatDateUTC(new Date());
  const days = forecast.days;
  const closingSeries = days.map((d) => d.closingBalance);
  const todayIndex = days.findIndex((d) => d.date === todayStr);
  const endBalance = days.length ? days[days.length - 1].closingBalance : forecast.startingBalance;
  const lowest = days.reduce<DayForecast | null>((min, d) => (min === null || d.closingBalance < min.closingBalance ? d : min), null);
  const minBalance = forecast.overallStatus.minBalance;
  const status: 'danger' | 'warning' | 'safe' = minBalance < 0 ? 'danger' : minBalance < forecast.safeMinBalance ? 'warning' : 'safe';
  const visibleDays = days.filter((day) => day.events.length > 0 || day.belowSafeMin);
  const pendingPast = days
    .filter((d) => d.date < todayStr)
    .reduce((n, d) => n + d.events.filter((e) => !e.actualized).length, 0);

  function shortDate(dateStr: string) {
    const d = parseDateUTC(dateStr);
    return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
  }

  function renderEvent(event: CashEvent, day: DayForecast) {
    const key = eventKey(event);
    const isPast = day.date < todayStr;
    const amountClass = event.amount > 0 ? 'money-pos' : 'money-neg';

    if (event.actualized && event.transactionId) {
      const variance = event.forecastedAmount !== undefined ? event.amount - event.forecastedAmount : 0;
      const showVariance = event.forecastedAmount !== undefined && Math.abs(variance) >= 1;
      const isWorse = variance < 0;
      const up = event.amount < 0 ? variance < 0 : variance >= 0;
      return (
        <div className="event-row event-row--actual">
          <EditActualizedEventDialog event={event} onUpdated={loadForecast}>
            <button type="button" className="event-row__main" aria-label={`Edit ${event.description}`}>
              <div className="event-row__text">
                <span className="event-row__title">{event.description}</span>
                <span className="event-row__sub">
                  <span className={`event-row__amount ${amountClass}`}>{formatMoney(event.amount, true)}</span>
                  {showVariance && (
                    <span className={`pill ${isWorse ? 'pill--danger' : 'pill--safe'}`} style={{ textTransform: 'none', letterSpacing: 0 }}>
                      {up ? <ArrowUpIcon size={11} /> : <ArrowDownIcon size={11} />}
                      {formatMoney(Math.abs(variance))} vs forecast
                    </span>
                  )}
                </span>
              </div>
              <span className={`pill pill--actual ${justConfirmed.has(key) ? 'pop-in' : ''}`}>
                <CheckIcon size={11} strokeWidth={3} /> Actual
              </span>
            </button>
          </EditActualizedEventDialog>
        </div>
      );
    }

    if (!accountId) return null;
    const busy = confirmingKey === key;
    return (
      <div className={`event-row ${isPast ? 'event-row--pending' : ''}`}>
        <ActualizeEventDialog event={event} accountId={accountId} onActualized={loadForecast}>
          <button type="button" className="event-row__main" aria-label={`Edit and confirm ${event.description}`}>
            <div className="event-row__text">
              <span className="event-row__title">{cleanDescription(event.description)}</span>
              <span className="event-row__sub">
                <span className={`event-row__amount ${amountClass}`}>{formatMoney(event.amount, true)}</span>
                {isPast ? (
                  <span className="pill pill--warning">Confirm</span>
                ) : (
                  <span className="pill pill--neutral">Forecast</span>
                )}
                {event.type === 'variable_expense' && <span style={{ color: 'var(--text-muted)' }}>estimated</span>}
              </span>
            </div>
          </button>
        </ActualizeEventDialog>
        <button
          type="button"
          className={`btn btn-sm event-row__confirm ${isPast ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => quickConfirm(event)}
          disabled={busy || confirmingKey !== null}
          aria-label={`Confirm ${cleanDescription(event.description)} for ${formatMoney(Math.abs(event.amount))}`}
          title="Confirm at the forecast amount"
        >
          <CheckIcon size={16} strokeWidth={2.5} />
          {!isMobile && (busy ? 'Confirming…' : 'Confirm')}
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {loading && (
        <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-primary)', opacity: 0.6, zIndex: 10, borderRadius: 'var(--radius)' }} />
      )}

      {/* Month selector */}
      <div className="row row--between" style={{ marginBottom: '1rem' }}>
        <h2 className="page-title" style={{ fontSize: isMobile ? '1.25rem' : '1.5rem' }}>{monthName}</h2>
        <div className="row" style={{ gap: '0.5rem', flexShrink: 0 }}>
          <button
            onClick={handlePreviousMonth}
            disabled={loading || isAtStartDate}
            aria-label="Previous month"
            className="btn btn-secondary btn-icon"
          >
            <ChevronLeftIcon size={20} />
          </button>
          <button
            onClick={handleNextMonth}
            disabled={loading}
            aria-label="Next month"
            className="btn btn-secondary btn-icon"
          >
            <ChevronRightIcon size={20} />
          </button>
        </div>
      </div>

      <div className="forecast-layout">
        {/* Summary */}
        <div className="forecast-layout__side stack">
          <div className="card">
            <div className="row row--between" style={{ marginBottom: '0.5rem' }}>
              <span className="stat-label">Projected month-end balance</span>
              <span className={`pill pill--${status}`}>
                {status === 'safe' ? <CheckIcon size={11} strokeWidth={3} /> : status === 'warning' ? <AlertTriangleIcon size={11} /> : <AlertOctagonIcon size={11} />}
                {status === 'safe' ? 'Safe' : status === 'warning' ? 'Below minimum' : 'Goes negative'}
              </span>
            </div>
            <div className={`hero-figure ${endBalance < 0 ? 'money-neg' : ''}`}>{formatMoney(endBalance)}</div>

            {closingSeries.length > 1 && (
              <div style={{ margin: '1rem 0 0.75rem' }}>
                <Sparkline
                  values={closingSeries}
                  reference={forecast.safeMinBalance}
                  markerIndex={todayIndex >= 0 ? todayIndex : null}
                  height={56}
                  color={status === 'danger' ? 'var(--color-danger)' : status === 'warning' ? 'var(--color-warning)' : 'var(--accent)'}
                />
                <div className="row row--between" style={{ fontSize: 'var(--font-small)', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  <span>{shortDate(days[0].date)}</span>
                  <span>dashed line = safe minimum</span>
                  <span>{shortDate(days[days.length - 1].date)}</span>
                </div>
              </div>
            )}

            <div className="stat-row" style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-secondary)' }}>
              <div>
                <div className="stat-row__label">{forecast.isStartMonth ? 'Starting' : 'Opening'}</div>
                <div className="stat-row__value">{formatMoney(forecast.startingBalance)}</div>
              </div>
              <div>
                <div className="stat-row__label">Lowest{lowest ? ` · ${shortDate(lowest.date)}` : ''}</div>
                <div className={`stat-row__value ${status === 'safe' ? 'money-pos' : status === 'warning' ? '' : 'money-neg'}`} style={status === 'warning' ? { color: 'var(--color-warning)' } : undefined}>
                  {formatMoney(minBalance)}
                </div>
              </div>
              <div>
                <div className="stat-row__label">Safe minimum</div>
                <div className="stat-row__value">{formatMoney(forecast.safeMinBalance)}</div>
              </div>
            </div>

            {forecast.overallStatus.daysBelowSafeMin > 0 && (
              <div className={`alert alert--${status === 'danger' ? 'danger' : 'warning'}`} style={{ marginTop: '1rem' }}>
                {status === 'danger' ? <AlertOctagonIcon size={18} /> : <AlertTriangleIcon size={18} />}
                <div>
                  Balance is projected to {status === 'danger' ? 'go negative' : 'drop below your safe minimum'} on{' '}
                  <strong>{forecast.overallStatus.daysBelowSafeMin} day{forecast.overallStatus.daysBelowSafeMin === 1 ? '' : 's'}</strong> this month.
                </div>
              </div>
            )}
          </div>

          {pendingPast > 0 && (
            <div className="alert alert--warning">
              <AlertTriangleIcon size={18} />
              <div>
                <strong>{pendingPast}</strong> past transaction{pendingPast === 1 ? '' : 's'} still need{pendingPast === 1 ? 's' : ''} confirming. Tap the check on each row to confirm at the forecast amount, or tap the row to adjust it.
              </div>
            </div>
          )}
        </div>

        {/* Daily breakdown */}
        <div className="card" style={{ padding: isMobile ? '1rem' : '1.25rem' }}>
          <div className="row row--between" style={{ flexWrap: 'wrap', marginBottom: '1rem' }}>
            <h3 className="section-title">Daily breakdown</h3>
            {accountId && <AddTransactionDialog accountId={accountId} onAdded={loadForecast} />}
          </div>

          {error && (
            <div className="alert alert--danger" style={{ marginBottom: '0.75rem' }}>
              <AlertOctagonIcon size={18} />
              <div>{error}</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {visibleDays.map((day) => {
              const isNegative = day.closingBalance < 0;
              const isBelowSafe = day.closingBalance < forecast.safeMinBalance && day.closingBalance >= 0;
              const d = parseDateUTC(day.date);
              const isToday = day.date === todayStr;
              const cls = ['day-card', isNegative ? 'day-card--danger' : isBelowSafe ? 'day-card--warning' : '', isToday ? 'day-card--today' : ''].join(' ');
              return (
                <div key={day.date} className={cls}>
                  <div className="day-card__head">
                    <div>
                      <div className="day-card__date">
                        {shortDate(day.date)}
                        <span className="day-card__weekday">{WEEKDAYS[d.getUTCDay()]}</span>
                        {isToday && <span className="pill pill--accent">Today</span>}
                      </div>
                      <div className="day-card__meta">
                        Opening {formatMoney(day.openingBalance)} · <span className={day.netChange >= 0 ? 'money-pos' : 'money-neg'}>{formatMoney(day.netChange, true)}</span>
                      </div>
                    </div>
                    <div className="day-card__closing">
                      <div className="stat-row__label">Closing</div>
                      <div className={`day-card__closing-value ${isNegative ? 'money-neg' : ''}`} style={isBelowSafe ? { color: 'var(--color-warning)' } : undefined}>
                        {isNegative ? <AlertOctagonIcon size={14} /> : isBelowSafe ? <AlertTriangleIcon size={14} /> : null}
                        {formatMoney(day.closingBalance)}
                      </div>
                    </div>
                  </div>
                  <div className="day-card__events">
                    {day.events.map((event, i) => (
                      <div key={i}>{renderEvent(event, day)}</div>
                    ))}
                  </div>
                </div>
              );
            })}
            {visibleDays.length === 0 && (
              <p style={{ color: 'var(--text-secondary)' }}>
                <IconLabel icon={<CheckIcon size={14} />}>No events this month.</IconLabel>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
