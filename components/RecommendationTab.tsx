'use client';

import { useState, useEffect } from 'react';
import SixMonthOverview from './recommendations/SixMonthOverview';
import VarianceSummary from './recommendations/VarianceSummary';
import TrendChart from './recommendations/TrendChart';
import SuggestionCards from './recommendations/SuggestionCards';
import { RecommendationOverview } from '@/lib/recommendation-engine';

interface Props {
  currentMonth: { year: number; month: number };
  onMonthChange: (month: { year: number; month: number }) => void;
}

export default function RecommendationTab({ currentMonth }: Props) {
  const [data, setData] = useState<RecommendationOverview | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [implementing, setImplementing] = useState(false);
  const [implementSuccess, setImplementSuccess] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [incomeRules, setIncomeRules] = useState<any[]>([]);

  useEffect(() => {
    loadAccountId();
  }, []);

  useEffect(() => {
    if (accountId) {
      loadRecommendations();
    }
  }, [currentMonth, accountId]);

  async function loadAccountId() {
    try {
      const res = await fetch('/api/accounts');
      const accounts = await res.json();
      if (accounts.length > 0) {
        setAccountId(accounts[0].id);
      }
    } catch (error) {
      console.error('Error loading account:', error);
    }
  }

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
    
    try {
      // Load income rules to show in modal
      const rulesRes = await fetch(`/api/income-rules?accountId=${accountId}`);
      const rules = await rulesRes.json();
      
      if (rules.length === 0) {
        alert('No income rules found. Please set up income rules in the Setup tab first.');
        return;
      }
      
      setIncomeRules(rules);
      setShowConfirmModal(true);
    } catch (error) {
      console.error('Error loading income rules:', error);
      alert('Failed to load income rules.');
    }
  }

  async function confirmImplementation() {
    if (!accountId || !data?.contributionAnalysis.recommendedAnnualContribution) return;
    
    setShowConfirmModal(false);
    setImplementing(true);
    setImplementSuccess(false);
    
    try {
      // Calculate adjustment ratio
      const currentTotal = data.contributionAnalysis.currentAnnualContribution;
      const recommendedTotal = data.contributionAnalysis.recommendedAnnualContribution;
      const adjustmentRatio = recommendedTotal / currentTotal;
      
      // Update each income rule proportionally
      const updatePromises = incomeRules.map((rule: any) => {
        const newContribution = rule.contributionAmount * adjustmentRatio;
        return fetch(`/api/income-rules/${rule.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contributionAmount: Math.round(newContribution * 100) / 100,
          }),
        });
      });
      
      await Promise.all(updatePromises);
      
      setImplementSuccess(true);
      
      // Reload recommendations immediately to show updated values
      await loadRecommendations();
      
      // Reset success message after showing it briefly
      setTimeout(() => {
        setImplementSuccess(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error implementing recommendation:', error);
      alert('Failed to update income rules. Please try manually in the Setup tab.');
    } finally {
      setImplementing(false);
    }
  }

  if (loading && !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ height: '200px', background: '#f0f0f0', borderRadius: '8px', animation: 'pulse 2s infinite' }} />
        <div style={{ height: '300px', background: '#f0f0f0', borderRadius: '8px', animation: 'pulse 2s infinite' }} />
        <div style={{ height: '250px', background: '#f0f0f0', borderRadius: '8px', animation: 'pulse 2s infinite' }} />
      </div>
    );
  }

  if (!accountId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
        No account found. Please set up your account in the Setup tab first.
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
        No recommendation data available. Please set up income and expenses in the Setup tab.
      </div>
    );
  }

  const monthName = new Date(Date.UTC(currentMonth.year, currentMonth.month - 1, 1))
    .toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative' }}>
      {loading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(255, 255, 255, 0.7)',
          zIndex: 10,
          borderRadius: '8px',
        }} />
      )}

      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          Financial Recommendations
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#666' }}>
          6-month outlook starting {monthName}
        </p>
      </div>

      {/* How This Works - Moved to top */}
      <details open style={{ ...cardStyle, background: '#f9f9f9' }}>
        <summary style={{ 
          fontSize: '1rem', 
          fontWeight: '600', 
          marginBottom: '0.5rem',
          cursor: 'pointer',
          listStyle: 'none',
        }}>
          ℹ️ How This Works
        </summary>
        <ul style={{ paddingLeft: '1.5rem', fontSize: '0.875rem', lineHeight: '1.6', color: '#666', marginTop: '0.5rem' }}>
          <li>Analyzes your forecasted income and expenses for the next 6 months</li>
          <li>Compares actual variable spending to estimates based on historical data</li>
          <li>Identifies spending trends and potential issues before they impact your balance</li>
          <li>Provides actionable recommendations to maintain financial stability</li>
        </ul>
      </details>

      {/* Quick Action Button */}
      {data.contributionAnalysis.adjustmentNeeded && (
        <div style={{
          ...cardStyle,
          background: '#fef3c7',
          border: '2px solid #fcd34d',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                ⚡ Action Required
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#92400e' }}>
                Increase contributions by {Math.round(data.contributionAnalysis.adjustmentPercentage)}% to maintain safe balance
              </p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '600' }}>
                Current Annual
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                ${data.contributionAnalysis.currentAnnualContribution.toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '600' }}>
                Recommended Annual
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#dc2626' }}>
                ${data.contributionAnalysis.recommendedAnnualContribution?.toLocaleString() || 'N/A'}
              </div>
            </div>
          </div>
          <div style={{
            padding: '1rem',
            background: 'white',
            borderRadius: '6px',
            border: '1px solid #fcd34d',
            marginTop: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}>
            <div style={{ fontSize: '0.875rem', color: '#92400e', lineHeight: '1.6' }}>
              Click below to automatically update your income rules to the recommended contribution amounts.
              This will increase your contributions proportionally across all income sources.
            </div>
            <button
              onClick={showImplementationModal}
              disabled={implementing || implementSuccess}
              style={{
                padding: '0.75rem 1.5rem',
                background: implementSuccess ? '#16a34a' : (implementing ? '#9ca3af' : '#1a1a1a'),
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: (implementing || implementSuccess) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {implementSuccess ? '✓ Implemented Successfully!' : (implementing ? 'Updating...' : '⚡ Implement Recommendation')}
            </button>
          </div>
        </div>
      )}

      {/* Suggestions */}
      <SuggestionCards suggestions={data.suggestions} />

      {/* 6-Month Overview */}
      <SixMonthOverview 
        months={data.sixMonthForecast.months} 
        safeMinBalance={data.sixMonthForecast.safeMinBalance}
      />

      {/* Financial Summary */}
      <VarianceSummary months={data.sixMonthForecast.months} />

      {/* Trend Analysis */}
      <TrendChart trends={data.trendAnalysis.expenses} />

      {/* Confirmation Modal */}
      {showConfirmModal && data && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
              Confirm Contribution Increase
            </h3>
            
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9f9f9', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>Total Annual Increase</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1a1a1a' }}>
                ${(data.contributionAnalysis.recommendedAnnualContribution! - data.contributionAnalysis.currentAnnualContribution).toLocaleString()}/year
              </div>
              <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>
                (~${Math.round((data.contributionAnalysis.recommendedAnnualContribution! - data.contributionAnalysis.currentAnnualContribution) / 12).toLocaleString()}/month)
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem' }}>Per-Person Breakdown:</div>
              {incomeRules.map((rule: any) => {
                const currentTotal = data.contributionAnalysis.currentAnnualContribution;
                const recommendedTotal = data.contributionAnalysis.recommendedAnnualContribution!;
                const adjustmentRatio = recommendedTotal / currentTotal;
                const newContribution = rule.contributionAmount * adjustmentRatio;
                const increase = newContribution - rule.contributionAmount;
                const payPeriodsPerYear = getPayPeriodsPerYear(rule.payFrequency);
                
                return (
                  <div key={rule.id} style={{
                    padding: '0.75rem',
                    background: 'white',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    marginBottom: '0.5rem',
                  }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>{rule.name}</div>
                    <div style={{ fontSize: '0.875rem', color: '#666', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Current: ${rule.contributionAmount.toFixed(2)} per paycheck</span>
                      <span style={{ color: '#dc2626', fontWeight: '600' }}>→ ${newContribution.toFixed(2)}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                      +${increase.toFixed(2)} per paycheck × {payPeriodsPerYear} = +${(increase * payPeriodsPerYear).toFixed(2)}/year
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{
              padding: '1rem',
              background: '#e0f2fe',
              border: '1px solid #0ea5e9',
              borderRadius: '6px',
              marginBottom: '1.5rem',
            }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#0c4a6e' }}>
                💡 Long-Term Impact
              </div>
              <div style={{ fontSize: '0.875rem', color: '#0c4a6e', lineHeight: '1.6' }}>
                This increase will keep your balance above the safe minimum and maintain positive monthly growth,
                preventing future cash flow issues and building a healthier financial cushion.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowConfirmModal(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'white',
                  color: '#1a1a1a',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmImplementation}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#1a1a1a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                ✓ Approve & Implement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function
function getPayPeriodsPerYear(payFrequency: string): number {
  switch (payFrequency) {
    case 'weekly':
      return 52;
    case 'bi_weekly':
      return 26;
    case 'semi_monthly':
      return 24;
    case 'monthly':
      return 12;
    default:
      return 24;
  }
}

// Modal Styles
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalContentStyle: React.CSSProperties = {
  background: 'white',
  padding: '2rem',
  borderRadius: '12px',
  maxWidth: '600px',
  width: '90%',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
};

const cardStyle: React.CSSProperties = {
  background: 'white',
  padding: '1.5rem',
  borderRadius: '8px',
  border: '1px solid #e0e0e0',
};
