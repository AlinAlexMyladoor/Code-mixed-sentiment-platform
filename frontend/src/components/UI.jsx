import { useState } from 'react';
import { Languages } from 'lucide-react';

export const sentimentColor = (s) => {
  switch (s) {
    case 'positive':  return 'var(--positive)';
    case 'negative':  return 'var(--negative)';
    case 'sarcastic': return 'var(--sarcastic)';
    default:          return 'var(--neutral)';
  }
};

export const sentimentBadgeClass = (s) => {
  switch (s) {
    case 'positive':  return 'badge badge-positive';
    case 'negative':  return 'badge badge-negative';
    case 'sarcastic': return 'badge badge-sarcastic';
    default:          return 'badge badge-neutral';
  }
};

export function SentimentBadge({ sentiment }) {
  return (
    <span className={sentimentBadgeClass(sentiment)} style={{ textTransform: 'capitalize' }}>
      {sentiment}
    </span>
  );
}

export function MetricCard({ label, value, sub, icon: Icon, iconColor, iconBg, cardClass = '' }) {
  return (
    <div className={`card hover-3d card-pad ${cardClass}`} style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="metric-header">
        <span className="metric-label">{label}</span>
        {Icon && (
          <div className="metric-icon" style={{ background: iconBg || 'var(--bg-glass)', color: iconColor }}>
            <Icon size={16} strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className="metric-value">{value ?? '—'}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  );
}

export function CommentItem({ item, showStats = true }) {
  const [showTranslation, setShowTranslation] = useState(false);

  if (!item) return null;
  const time = item.created_at
    ? new Date(item.created_at.endsWith('Z') ? item.created_at : item.created_at + 'Z').toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
    : '';

  const sentColor = sentimentColor(item.sentiment);

  return (
    <div
      className="comment-item"
      style={{ borderLeft: `3px solid ${sentColor}` }}
    >
      <div className="comment-meta">
        <SentimentBadge sentiment={item.sentiment} />
        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{time}</span>
      </div>
      <p className="comment-text">{item.original_text}</p>
      
      {showTranslation && item.translation && (
        <div style={{
          marginTop: 8, padding: '8px 12px', background: 'var(--bg-elevated)',
          borderRadius: 8, fontSize: '0.8rem', color: 'var(--text-secondary)',
          borderLeft: '2px solid var(--border)',
        }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2 }}>ENGLISH TRANSLATION</div>
          {item.translation}
        </div>
      )}

      {showStats && (
        <div className="comment-stats" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Aspect tags — business-relevant, no tech jargon */}
            {item.aspect_sentiments && Object.keys(item.aspect_sentiments).length > 0
              ? Object.entries(item.aspect_sentiments).map(([aspect]) => (
                  <span key={aspect} style={{
                    fontSize: '0.6rem',
                    background: '#f1f5f9', color: '#64748b',
                    border: '1px solid #e2e8f0',
                    padding: '1px 6px', borderRadius: 4, fontWeight: 500,
                  }}>{aspect}</span>
                ))
              : item.inference_source && (
                  <span style={{
                    fontSize: '0.62rem', fontWeight: 600,
                    background: 'rgba(99,102,241,0.07)', color: '#818cf8',
                    border: '1px solid rgba(99,102,241,0.15)',
                    padding: '1px 6px', borderRadius: 4,
                  }}>{item.inference_source === 'llama_lora' ? 'Llama LoRA' : item.inference_source === 'roberta_cpu' ? 'RoBERTa' : 'Heuristic'}</span>
                )
            }
          </div>
          {item.translation && (
            <button
              onClick={() => setShowTranslation(!showTranslation)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontSize: '0.7rem', color: showTranslation ? 'var(--accent)' : 'var(--text-muted)',
                padding: '4px 8px', borderRadius: 6,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Languages size={12} />
              {showTranslation ? 'Hide translation' : 'Translate'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, desc }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '48px 24px', color: 'var(--text-muted)',
      gap: 12,
    }}>
      {Icon && <Icon size={40} strokeWidth={1} style={{ opacity: 0.4 }} />}
      <div style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{title}</div>
      {desc && <div style={{ fontSize: '0.78rem', textAlign: 'center' }}>{desc}</div>}
    </div>
  );
}

export function Skeleton({ height = 20, width = '100%', borderRadius = 8 }) {
  return (
    <div className="skeleton" style={{ height, width, borderRadius }} />
  );
}
