'use client';

import { Suggestion } from '@/lib/recommendation-engine';

interface Props {
  suggestions: Suggestion[];
}

export default function SuggestionCards({ suggestions }: Props) {
  if (suggestions.length === 0) {
    return (
      <div style={cardStyle}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#16a34a' }}>
          ✅ All Clear!
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Your finances are looking good. No immediate recommendations at this time.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>
        Recommendations & Insights
      </h3>

      {suggestions.map((suggestion, idx) => {
        const severityStyles = {
          critical: {
            bg: 'var(--danger-bg)',
            border: 'var(--danger-border)',
            icon: '🚨',
            textColor: 'var(--danger-text)',
          },
          warning: {
            bg: 'var(--warning-bg)',
            border: 'var(--warning-border)',
            icon: '⚠️',
            textColor: 'var(--warning-text)',
          },
          info: {
            bg: 'var(--info-bg)',
            border: 'var(--info-border)',
            icon: 'ℹ️',
            textColor: 'var(--info-text)',
          },
        };

        const style = severityStyles[suggestion.severity];

        return (
          <div
            key={idx}
            style={{
              ...cardStyle,
              background: style.bg,
              border: `2px solid ${style.border}`,
            }}
          >
            <div style={{ display: 'flex', gap: '1rem' }}>
              {/* Icon */}
              <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>{style.icon}</div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '600', color: style.textColor, marginBottom: '0.5rem' }}>
                  {suggestion.title}
                </h4>
                <p style={{ fontSize: '0.875rem', color: style.textColor, opacity: 0.9, lineHeight: '1.5', marginBottom: suggestion.actionable ? '0.75rem' : 0 }}>
                  {suggestion.description}
                </p>

                {suggestion.actionable && suggestion.recommendedAction && (
                  <div
                    style={{
                      padding: '0.75rem',
                      background: 'var(--bg-primary)',
                      borderRadius: '4px',
                      border: '1px solid var(--border-primary)',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: '600' }}>
                      RECOMMENDED ACTION
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                      {suggestion.recommendedAction}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  padding: '1.5rem',
  borderRadius: '8px',
  border: '1px solid var(--border-primary)',
};
