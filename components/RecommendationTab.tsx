'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { IconLabel, InfoIcon, ZapIcon, CheckIcon, LightbulbIcon, AlertTriangleIcon } from './icons';
import { formatMoney } from '@/lib/actualize';

import { useState, useEffect } from 'react';
import { useIsMobile, preventAutoFocusOnTouch } from '@/lib/useIsMobile';
import SixMonthOverview from './recommendations/SixMonthOverview';
import VarianceSummary from './recommendations/VarianceSummary';
import TrendChart from './recommendations/TrendChart';
import SuggestionCards from './recommendations/SuggestionCards';
import ComparisonChart from './recommendations/ComparisonChart';
import { RecommendationOverview } from '@/lib/recommendation-engine';
import { useAccount } from '@/contexts/AccountContext';
import { MessageDialog } from './dialogs';
import { AllocationResult, allocateContributions } from '@/lib/contribution-capacity';

interface Props {
  currentMonth: { year: number; month: number };
  onMonthChange: (month: { year: number; month: number }) => void;
}

export default function RecommendationTab({ currentMonth }: Props) {
  const [data, setData] = useState<RecommendationOverview | null>(null);
  const { account, loading: accountLoading } = useAccount();
  const accountId = account?.id ?? null;
  const [message, setMessage] = useState<{ title: string; text: string; type: 'error' | 'info' } | null>(null);
  const [loading, setLoading] = useState(false);
  const [implementing, setImplementing] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [implementSuccess, setImplementSuccess] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showHow, setShowHow] = useState(false);
  // How the recommended total would actually land on each paycheck. Computed
  // with the same allocator the server uses, so the preview and the saved
  // result cannot disagree.
  const [allocation, setAllocation] = useState<AllocationResult | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (accountId) {
      loadRecommendations();
    }
  }, [currentMonth, accountId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadRecommendations() {
    if (!accountId) return;
    
    setLoading(true);
    try {
      const res = await fetch(
        `/api/recommendations?accountId=${accountId}&year=${currentMonth.year}&month=${currentMonth.month}`
      );
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function showImplementationModal() {
    if (!accountId || !data?.contributionAnalysis.recommendedAnnualContribution) return;

    setPreparing(true);
    try {
      // Load income rules to show in modal
      const rulesRes = await fetch(`/api/income-rules?accountId=${accountId}`);
      const rules = await rulesRes.json();

      if (rules.length === 0) {
        setMessage({ title: 'No income sources', text: 'Set up income sources in the Setup tab first.', type: 'info' });
        return;
      }

      // Split the recommended total across the paychecks that have to fund it.
      // This replaces scaling everyone by the same percentage, which had no
      // idea what any of them took home.
      const split = allocateContributions(
        rules,
        data.contributionAnalysis.recommendedAnnualContribution
      );

      if (split.totalNetAnnual <= 0) {
        setMessage({
          title: 'No take-home pay to work with',
          text: 'Add a salary and pay frequency to each income source in Setup so the app can work out what each paycheck can carry.',
          type: 'info',
        });
        return;
      }

      setAllocation(split);
      setShowConfirmModal(true);
    } catch (error) {
      console.error('Error loading income rules:', error);
      setMessage({ title: 'Something went wrong', text: 'Could not load income sources.', type: 'error' });
    } finally {
      setPreparing(false);
    }
  }

  async function confirmImplementation() {
    if (!accountId || !allocation) return;

    setShowConfirmModal(false);
    setImplementing(true);
    setImplementSuccess(false);

    try {
      const responses = await Promise.all(
        allocation.contributors.map((contributor) =>
          fetch(`/api/income-rules/${contributor.incomeRuleId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contributionAmount: contributor.allocatedPerPaycheck }),
          })
        )
      );

      // The server runs the same capacity check. If it turns anything down, say
      // so rather than reporting a success that did not happen.
      const rejected = responses.filter((res) => !res.ok);
      if (rejected.length > 0) {
        const body = await rejected[0].json().catch(() => ({}));
        setMessage({
          title: 'Some contributions were not saved',
          text:
            body.error ||
            'One or more contributions were above what that paycheck can carry. Nothing above the ceiling was saved.',
          type: 'error',
        });
        await loadRecommendations();
        return;
      }

      setImplementSuccess(true);

      // Reload recommendations immediately to show updated values
      await loadRecommendations();

      // Reset success message after showing it briefly
      setTimeout(() => {
        setImplementSuccess(false);
      }, 3000);

    } catch (error) {
      console.error('Error implementing recommendation:', error);
      setMessage({ title: 'Something went wrong', text: 'Could not update income sources. Please try manually in the Setup tab.', type: 'error' });
    } finally {
      setImplementing(false);
    }
  }

  if ((loading || accountLoading) && !data) {
    return (
      <div className="stack">
        <div className="skeleton" style={{ height: '36px', width: '50%' }} />
        <div className="skeleton" style={{ height: '140px' }} />
        <div className="skeleton" style={{ height: '320px' }} />
        <div className="skeleton" style={{ height: '260px' }} />
      </div>
    );
  }

  if (!accountId) {
    return (
      <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
        No account found. Please set up your account in the Setup tab first.
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
        No recommendation data available. Please set up income and expenses in the Setup tab.
      </div>
    );
  }

  const monthName = new Date(Date.UTC(currentMonth.year, currentMonth.month - 1, 1))
    .toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  const analysis = data.contributionAnalysis;
  const recommended = analysis.recommendedAnnualContribution ?? analysis.currentAnnualContribution;
  const annualIncrease = recommended - analysis.currentAnnualContribution;
  // What the confirm dialog will actually write. When the ceilings cannot cover
  // the recommendation, the allocator delivers less than `recommended`, and a
  // headline larger than the rows beneath it would be a lie.
  const appliedAnnualChange = allocation
    ? allocation.contributors.reduce(
        (sum, c) => sum + c.changePerPaycheck * c.payPeriodsPerYear,
        0
      )
    : annualIncrease;

  return (
    <div className="stack" style={{ gap: '1.25rem', position: 'relative' }}>
      {loading && (
        <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-primary)', opacity: 0.6, zIndex: 10, borderRadius: 'var(--radius)' }} />
      )}

      {/* Header */}
      <div className="section-head" style={{ marginBottom: 0 }}>
        <div>
          <h2 className="page-title" style={{ fontSize: isMobile ? '1.25rem' : '1.5rem' }}>Insights</h2>
          <p>6-month outlook from {monthName}</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowHow((v) => !v)} aria-expanded={showHow}>
          <InfoIcon size={16} /> How this works
        </button>
      </div>

      {showHow && (
        <div className="alert alert--info">
          <InfoIcon size={18} />
          <div>
            The next six months of income and expenses are projected from your Setup. Variable expenses use your
            history, spending trends are compared against three- and six-month averages, and suggestions are
            raised when your balance is heading towards the safe minimum.
          </div>
        </div>
      )}

      {/* Action required */}
      {analysis.adjustmentNeeded && (
        <div className="card" style={{ borderColor: 'var(--warning-border)', borderWidth: 1 }}>
          <div className="section-head">
            <div>
              <h3 className="section-title">
                <IconLabel icon={<ZapIcon size={18} style={{ color: 'var(--color-warning)' }} />}>Action required</IconLabel>
              </h3>
              <p>Increase contributions by {Math.round(analysis.adjustmentPercentage)}% to stay above your safe minimum.</p>
            </div>
            <span className="pill pill--warning"><AlertTriangleIcon size={11} /> Shortfall ahead</span>
          </div>

          <div className="grid-3" style={{ marginBottom: '1rem' }}>
            <div className="stat-tile">
              <div className="stat-tile__label">Current per year</div>
              <div className="stat-tile__value">{formatMoney(analysis.currentAnnualContribution)}</div>
            </div>
            <div className="stat-tile stat-tile--accent">
              <div className="stat-tile__label">Recommended per year</div>
              <div className="stat-tile__value">{formatMoney(recommended)}</div>
            </div>
            <div className="stat-tile">
              <div className="stat-tile__label">Extra per month</div>
              <div className="stat-tile__value">{formatMoney(annualIncrease / 12)}</div>
              <div className="stat-tile__sub">{formatMoney(annualIncrease, true)} per year</div>
            </div>
          </div>

          {data.capacityAnalysis.totalNetAnnual > 0 && (
            <p style={{ fontSize: 'var(--font-small)', color: 'var(--text-secondary)', marginTop: '-0.5rem', marginBottom: '1rem' }}>
              That is {Math.round((recommended / data.capacityAnalysis.totalNetAnnual) * 100)}% of your
              combined take-home pay of {formatMoney(data.capacityAnalysis.totalNetAnnual / 12)} a month
              {data.capacityAnalysis.totalSharedBenefitAnnual > 0 && (
                <>
                  , on top of {formatMoney(data.capacityAnalysis.totalSharedBenefitAnnual / 12)} a month
                  of shared benefits already paid from paychecks
                </>
              )}
              .
            </p>
          )}

          {analysis.limitedByCapacity && (
            <div className="alert alert--danger" style={{ marginBottom: '1rem' }}>
              <AlertTriangleIcon size={18} />
              <div>
                Closing the gap outright would take{' '}
                <strong>{formatMoney(analysis.uncappedAnnualContribution ?? 0)}</strong> a year. The
                paychecks top out at{' '}
                <strong>{formatMoney(data.capacityAnalysis.totalCapacityAnnual)}</strong>, so the
                recommendation above has been trimmed to fit. That leaves{' '}
                <strong>{formatMoney(analysis.unfundedAnnualGap / 12)}</strong> a month that no
                contribution can cover — it has to come out of expenses, or from raising a
                contribution ceiling in Setup.
              </div>
            </div>
          )}

          <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <p style={{ fontSize: 'var(--font-label)', color: 'var(--text-secondary)', flex: '1 1 260px' }}>
              Split across income sources by take-home pay, and never above what a paycheck can carry.
              You can review the split before it is saved.
            </p>
            <button
              onClick={showImplementationModal}
              disabled={implementing || implementSuccess || preparing}
              className={`btn ${implementSuccess ? 'btn-success' : 'btn-primary'}`}
            >
              {implementSuccess ? (
                <><CheckIcon size={16} /> Applied</>
              ) : implementing ? (
                'Updating…'
              ) : preparing ? (
                'Working out the split…'
              ) : (
                <><ZapIcon size={16} /> Apply recommendation</>
              )}
            </button>
          </div>

          <ComparisonChart
            currentAnnual={analysis.currentAnnualContribution}
            recommendedAnnual={recommended}
            months={data.sixMonthForecast.months}
          />
        </div>
      )}

      <SuggestionCards suggestions={data.suggestions} />

      <SixMonthOverview 
        months={data.sixMonthForecast.months} 
        safeMinBalance={data.sixMonthForecast.safeMinBalance}
      />

      <VarianceSummary months={data.sixMonthForecast.months} />

      <TrendChart trends={data.trendAnalysis.expenses} />

      <MessageDialog
        open={!!message}
        onOpenChange={(open) => !open && setMessage(null)}
        title={message?.title || ''}
        message={message?.text || ''}
        type={message?.type || 'info'}
      />

      {/* Confirmation dialog. Radix, like every other dialog in the app: this is
          the last step before contributions are written, so it has to trap
          focus, close on Escape and restore focus afterwards. */}
      <Dialog.Root open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <Dialog.Portal container={typeof document !== 'undefined' ? document.body : undefined}>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content dialog-content--wide" onOpenAutoFocus={preventAutoFocusOnTouch}>
            <Dialog.Title className="dialog-title">Confirm contribution change</Dialog.Title>
            <Dialog.Description className="dialog-description">
              Split by take-home pay. Anyone already carrying shared costs from their paycheck is
              credited for them, and nobody is taken past their ceiling.
            </Dialog.Description>

            <div className="grid-2" style={{ marginBottom: '1rem' }}>
              <div className="stat-tile stat-tile--accent">
                <div className="stat-tile__label">Change per year</div>
                <div className="stat-tile__value">{formatMoney(appliedAnnualChange, true)}</div>
              </div>
              <div className="stat-tile">
                <div className="stat-tile__label">About per month</div>
                <div className="stat-tile__value">{formatMoney(appliedAnnualChange / 12, true)}</div>
              </div>
            </div>

            <div className="list" style={{ marginBottom: '1rem' }}>
              {(allocation?.contributors ?? []).map((contributor) => {
                const increase = contributor.changePerPaycheck;
                const shareOfNet =
                  contributor.netPerPaycheck > 0
                    ? contributor.allocatedPerPaycheck / contributor.netPerPaycheck
                    : 0;
                return (
                  <div
                    key={contributor.incomeRuleId}
                    className="list-item"
                    style={{ background: 'var(--bg-tertiary)' }}
                  >
                    <div className="list-item__body">
                      <div className="list-item__title">
                        {contributor.name}
                        {contributor.cappedByCeiling && (
                          <span className="pill pill--warning">at ceiling</span>
                        )}
                      </div>
                      <div className="list-item__meta">
                        {formatMoney(contributor.currentPerPaycheck)} →{' '}
                        <strong>{formatMoney(contributor.allocatedPerPaycheck)}</strong> per paycheck ·{' '}
                        {contributor.payPeriodsPerYear} paychecks a year
                      </div>
                      <div className="list-item__meta">
                        {Math.round(shareOfNet * 100)}% of {formatMoney(contributor.netPerPaycheck)}{' '}
                        take-home
                        {contributor.paycheck.isEstimate ? ' (estimated)' : ''} · ceiling{' '}
                        {formatMoney(contributor.capacityPerPaycheck)}
                        {contributor.sharedBenefitPerPaycheck > 0 && (
                          <> · plus {formatMoney(contributor.sharedBenefitPerPaycheck)} in shared benefits</>
                        )}
                      </div>
                    </div>
                    <div
                      className={`list-item__amount ${increase >= 0 ? 'money-pos' : 'money-neg'}`}
                    >
                      {formatMoney(increase * contributor.payPeriodsPerYear, true)}
                      <small>per year</small>
                    </div>
                  </div>
                );
              })}
            </div>

            {allocation && !allocation.feasible ? (
              <div className="alert alert--danger">
                <AlertTriangleIcon size={18} />
                <div>
                  Even at everyone&apos;s ceiling this leaves{' '}
                  <strong>{formatMoney(allocation.shortfallAnnual / 12)}</strong> a month unfunded.
                  Applying this sets each paycheck to the most it can carry, but the balance will
                  still come up short until expenses come down.
                </div>
              </div>
            ) : (
              <div className="alert alert--info">
                <LightbulbIcon size={18} />
                <div>Keeps the balance above the safe minimum and builds a cushion month over month.</div>
              </div>
            )}

            <div className="dialog-actions">
              <Dialog.Close asChild>
                <button className="btn btn-secondary" disabled={implementing}>
                  Cancel
                </button>
              </Dialog.Close>
              <button
                onClick={confirmImplementation}
                className="btn btn-primary"
                disabled={implementing}
                style={{ opacity: implementing ? 0.5 : 1 }}
              >
                <CheckIcon size={16} /> {implementing ? 'Applying…' : 'Apply change'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
