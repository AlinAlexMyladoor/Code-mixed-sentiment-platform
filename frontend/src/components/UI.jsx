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
    <span className={sentimentBadgeClass(sentiment)}>
      {sentiment}
    </span>
  );
}

export function MetricCard({ label, value, sub, icon: Icon, iconColor, iconBg, cardClass = '' }) {
  return (
    <div className={`card card-pad ${cardClass}`} style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="metric-header">
        <span className="metric-label">{label}</span>
        {Icon && (
          <div className="metric-icon" style={{ background: iconBg || 'var(--bg-glass)', color: iconColor }}>
            <Icon size={16} strokeWidth={2} />
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

  return (
    <div
      className="comment-item"
      style={{ borderLeft: `3px solid ${sentimentColor(item.sentiment)}` }}
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
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className="stat-chip">EN {((item.english_ratio || 0) * 100).toFixed(0)}%</span>
            <span className="stat-chip">switches {item.language_switch_count ?? 0}</span>
            {item.confidence && (
              <span className="stat-chip">conf {(item.confidence * 100).toFixed(0)}%</span>
            )}
            {item.inference_source && (
              <span className="stat-chip">{item.inference_source}</span>
            )}
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
