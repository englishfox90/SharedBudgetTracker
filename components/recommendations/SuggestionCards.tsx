'use client';

import { Suggestion } from '@/lib/recommendation-engine';
import { CheckCircleIcon, AlertOctagonIcon, AlertTriangleIcon, InfoIcon, ArrowRightIcon } from '../icons';

interface Props {
  suggestions: Suggestion[];
}

const SEVERITY = {
  critical: { cls: 'alert--danger', icon: <AlertOctagonIcon size={20} /> },
  warning: { cls: 'alert--warning', icon: <AlertTriangleIcon size={20} /> },
  info: { cls: 'alert--info', icon: <InfoIcon size={20} /> },
} as const;

export default function SuggestionCards({ suggestions }: Props) {
  return (
    <div className="card">
      <div className="section-head">
        <div>
          <h3 className="section-title">Suggestions</h3>
          <p>{suggestions.length === 0 ? 'Nothing needs your attention right now.' : `${suggestions.length} item${suggestions.length === 1 ? '' : 's'} to review`}</p>
        </div>
      </div>

      {suggestions.length === 0 ? (
        <div className="alert alert--safe">
          <CheckCircleIcon size={20} />
          <div><strong>All clear.</strong> Your balance stays above the safe minimum for the next six months.</div>
        </div>
      ) : (
        <div className="stack" style={{ gap: '0.75rem' }}>
          {suggestions.map((suggestion, idx) => {
            const sev = SEVERITY[suggestion.severity];
            return (
              <div key={idx} className={`alert ${sev.cls}`} style={{ flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  {sev.icon}
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: '0.125rem' }}>{suggestion.title}</div>
                    <div style={{ fontSize: 'var(--font-label)', opacity: 0.9 }}>{suggestion.description}</div>
                  </div>
                </div>
                {suggestion.actionable && suggestion.recommendedAction && (
                  <div style={{ marginLeft: 'calc(20px + 0.75rem)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: 'var(--font-label)', fontWeight: 600 }}>
                    <ArrowRightIcon size={14} style={{ marginTop: '0.2rem' }} />
                    <span>{suggestion.recommendedAction}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
