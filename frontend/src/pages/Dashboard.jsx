import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Area, AreaChart, CartesianGrid,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from 'recharts';
import {
  AlertTriangle, FlaskConical, MessageSquare, Send, Sparkles, TrendingUp, Zap, BarChart2,
} from 'lucide-react';
import TopBar from '../components/Layout/TopBar';
import { CommentItem, EmptyState, MetricCard, Skeleton } from '../components/UI';
import { useWebSocket } from '../hooks/useWebSocket';
import { useMetrics } from '../hooks/useMetrics';
import { api } from '../api/client';

const CHART_COLORS = {
  positive: '#22c55e',
  negative: '#ef4444',
  sarcastic: '#f59e0b',
  neutral: '#64748b',
};

// ── Hardcoded demo mock comments ─────────────────────────────────────────────
const MOCK_COMMENTS = [
  {
    id: 'mock-1', platform_id: 'demo-1', page_id: 'demo',
    original_text: 'Bhai yeh product ekdum bakwaas hai, paise waste ho gaye mere!',
    sentiment: 'negative', confidence: 0.91, english_ratio: 0.28,
    language_switch_count: 3, sarcasm_score: 0.05,
    inference_source: 'heuristic_mvp',
    created_at: new Date(Date.now() - 60000).toISOString(),
  },
  {
    id: 'mock-2', platform_id: 'demo-2', page_id: 'demo',
    original_text: 'Superb quality da! Romba nalla irukku, next time also buy pannuven.',
    sentiment: 'positive', confidence: 0.89, english_ratio: 0.22,
    language_switch_count: 4, sarcasm_score: 0.02,
    inference_source: 'heuristic_mvp',
    created_at: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: 'mock-3', platform_id: 'demo-3', page_id: 'demo',
    original_text: 'Oh wow, delivery in 10 days for a "same-day" order. Truly impressive service!',
    sentiment: 'sarcastic', confidence: 0.87, english_ratio: 0.88,
    language_switch_count: 0, sarcasm_score: 0.82,
    inference_source: 'heuristic_mvp',
    created_at: new Date(Date.now() - 180000).toISOString(),
  },
  {
    id: 'mock-4', platform_id: 'demo-4', page_id: 'demo',
    original_text: 'Ithellam괜찮아 order pandren, packaging okay okay aa irukku.',
    sentiment: 'neutral', confidence: 0.75, english_ratio: 0.30,
    language_switch_count: 2, sarcasm_score: 0.08,
    inference_source: 'heuristic_mvp',
    created_at: new Date(Date.now() - 240000).toISOString(),
  },
  {
    id: 'mock-5', platform_id: 'demo-5', page_id: 'demo',
    original_text: 'Yaar yeh fraud company hai! Mera paisa wapas karo, bilkul cheating hai!',
    sentiment: 'negative', confidence: 0.95, english_ratio: 0.32,
    language_switch_count: 3, sarcasm_score: 0.10,
    inference_source: 'heuristic_mvp',
    created_at: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: 'mock-6', platform_id: 'demo-6', page_id: 'demo',
    original_text: 'Kollam da! Price um reasonable, quality um good. Full paisa vasool!',
    sentiment: 'positive', confidence: 0.88, english_ratio: 0.25,
    language_switch_count: 3, sarcasm_score: 0.03,
    inference_source: 'heuristic_mvp',
    created_at: new Date(Date.now() - 360000).toISOString(),
  },
];

const MOCK_TREND = [
  { hour: '2024-01-01T10:00', positive: 12, negative: 4, sarcastic: 2, neutral: 8 },
  { hour: '2024-01-01T11:00', positive: 18, negative: 6, sarcastic: 3, neutral: 10 },
  { hour: '2024-01-01T12:00', positive: 9,  negative: 11, sarcastic: 5, neutral: 7 },
  { hour: '2024-01-01T13:00', positive: 22, negative: 3, sarcastic: 1, neutral: 14 },
  { hour: '2024-01-01T14:00', positive: 15, negative: 8, sarcastic: 4, neutral: 9 },
  { hour: '2024-01-01T15:00', positive: 28, negative: 5, sarcastic: 6, neutral: 11 },
];


export default function Dashboard() {
  const { metrics, loading, refetch } = useMetrics(15000);
  const [liveFeed, setLiveFeed] = useState([]);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Custom comment analyzer state
  const [analyzeText, setAnalyzeText] = useState('');
  const [analyzeResult, setAnalyzeResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');
  const textareaRef = useRef(null);

  const onWsMessage = useCallback((msg) => {
    if (msg.type === 'comment_processed' && msg.data) {
      setLiveFeed((prev) => [msg.data, ...prev].slice(0, 60));
      refetch();
    }
  }, [refetch]);

  const wsStatus = useWebSocket(onWsMessage);

  // Activate demo mode — inject mock data locally
  const loadDemo = useCallback(() => {
    setIsDemoMode(true);
    setLiveFeed(MOCK_COMMENTS);
  }, []);

  const clearDemo = useCallback(() => {
    setIsDemoMode(false);
    setLiveFeed([]);
  }, []);

  // Analyze a custom comment via the backend
  const handleAnalyze = useCallback(async () => {
    const text = analyzeText.trim();
    if (!text) return;
    setAnalyzing(true);
    setAnalyzeError('');
    setAnalyzeResult(null);
    try {
      const result = await api.analyze(text);
      setAnalyzeResult(result);
    } catch (err) {
      setAnalyzeError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  }, [analyzeText]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAnalyze();
  };

  // Merge live feed with persisted data
  const displayFeed = useMemo(() => {
    const base = isDemoMode ? [] : (metrics?.data || []);
    const ids = new Set(liveFeed.map((c) => c.id));
    const combined = [...liveFeed, ...base.filter((c) => !ids.has(c.id))];
    return combined.slice(0, 40);
  }, [liveFeed, metrics, isDemoMode]);

  const urgentItems = useMemo(
    () => displayFeed.filter((c) => c.sentiment === 'negative' || c.sentiment === 'sarcastic'),
    [displayFeed],
  );

  // Use real data for metrics; demo summary if in demo mode
  const s = isDemoMode
    ? { total_comments: 6, positive: 2, negative: 2, neutral: 1, sarcastic: 1, avg_english_ratio: 0.37, urgent_alerts: 3 }
    : metrics?.summary;
  const trend = isDemoMode ? MOCK_TREND : (metrics?.trend || []);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
        borderRadius: 10, padding: '10px 14px', fontSize: '0.78rem',
      }}>
        <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label?.slice(11, 16)}</div>
        {payload.map((entry) => (
          <div key={entry.dataKey} style={{ color: entry.fill, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
            <span>{entry.dataKey}</span><span style={{ fontWeight: 700 }}>{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const sentimentColor = (s) => {
    switch (s) {
      case 'positive': return '#22c55e';
      case 'negative': return '#ef4444';
      case 'sarcastic': return '#f59e0b';
      default: return '#64748b';
    }
  };

  return (
    <>
      <TopBar
        title="Dashboard"
        subtitle="Real-time social listening and sentiment intelligence"
        urgentCount={s?.urgent_alerts || 0}
        onRefresh={refetch}
      />

      <div className="page-body">

        {/* ── Hero bar ───────────────────────────────────────────────── */}
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)',
          padding: '20px 28px', marginBottom: 24,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 16,
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Real-Time{' '}
              <span className="gradient-text">Social Listening Command Center</span>
            </h1>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              AI-powered sentiment analysis · Sarcasm detection · Multilingual code-mixed intelligence
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isDemoMode && (
              <span style={{
                fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                border: '1px solid rgba(245,158,11,0.3)',
              }}>
                DEMO MODE
              </span>
            )}
            <div className="live-indicator">
              <span className={`status-dot ${wsStatus}`} />
              {wsStatus === 'live' ? 'Live Stream' : wsStatus === 'connecting' ? 'Connecting…' : wsStatus}
            </div>
          </div>
        </div>

        {/* ── Demo & Analyzer Panel ──────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.06) 100%)',
          border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: 'var(--r-xl)', padding: '22px 28px', marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <FlaskConical size={18} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                Try SwaraSense Live
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Analyze any code-mixed comment instantly, or load sample data to explore the dashboard.
              </div>
            </div>
          </div>

          {/* Two sub-sections: mock loader + custom input */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* Left: Load demo data */}
            <div style={{
              background: 'rgba(0,0,0,0.2)', borderRadius: 12,
              padding: '16px 18px', border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                <Sparkles size={13} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                Sample Dataset
              </div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: 1.6 }}>
                Load 6 pre-classified Tamil-English, Hindi-English, and English comments representing positive, negative, neutral, and sarcastic sentiments.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {!isDemoMode ? (
                  <button className="btn btn-primary btn-sm" onClick={loadDemo}>
                    <Sparkles size={13} /> Load Demo Data
                  </button>
                ) : (
                  <button className="btn btn-outline btn-sm" onClick={clearDemo}>
                    Clear Demo Data
                  </button>
                )}
              </div>
            </div>

            {/* Right: Analyze custom comment */}
            <div style={{
              background: 'rgba(0,0,0,0.2)', borderRadius: 12,
              padding: '16px 18px', border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                <Send size={13} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                Analyze Your Comment
              </div>
              <textarea
                ref={textareaRef}
                value={analyzeText}
                onChange={(e) => setAnalyzeText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a code-mixed comment, e.g. 'Bhai yeh product ekdum bakwaas hai!'"
                rows={3}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-strong)',
                  borderRadius: 8, color: 'var(--text-primary)',
                  fontSize: '0.83rem', padding: '10px 12px', resize: 'vertical',
                  fontFamily: 'inherit', outline: 'none', lineHeight: 1.6,
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Ctrl+Enter to analyze</span>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleAnalyze}
                  disabled={analyzing || !analyzeText.trim()}
                >
                  {analyzing ? 'Analyzing…' : <><Send size={12} /> Analyze</>}
                </button>
              </div>

              {/* Result */}
              {analyzeError && (
                <div style={{
                  marginTop: 10, padding: '8px 12px', borderRadius: 8, fontSize: '0.78rem',
                  background: 'var(--negative-bg)', color: 'var(--negative)',
                  border: '1px solid rgba(239,68,68,0.3)',
                }}>
                  {analyzeError}
                </div>
              )}
              {analyzeResult && (
                <div style={{
                  marginTop: 10, padding: '12px 14px', borderRadius: 10,
                  background: 'rgba(0,0,0,0.25)', border: `1px solid ${sentimentColor(analyzeResult.sentiment)}44`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span className={`badge badge-${analyzeResult.sentiment}`} style={{ fontSize: '0.72rem' }}>
                      {analyzeResult.sentiment.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {(analyzeResult.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[
                      ['EN ratio', `${(analyzeResult.english_ratio * 100).toFixed(0)}%`],
                      ['Lang switches', analyzeResult.language_switch_count],
                      ['Sarcasm score', analyzeResult.sarcasm_score.toFixed(2)],
                      ['Engine', analyzeResult.inference_source],
                    ].map(([label, val]) => (
                      <span key={label} className="stat-chip">{label}: {val}</span>
                    ))}
                  </div>
                  {analyzeResult.extracted_entities?.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Entities: {analyzeResult.extracted_entities.join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Metric cards ───────────────────────────────────────────── */}
        <div className="metrics-grid">
          {loading && !isDemoMode ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={120} />)
          ) : (
            <>
              <MetricCard label="Total Comments" value={s?.total_comments?.toLocaleString() ?? 0}
                icon={MessageSquare} iconColor="#a5b4fc" iconBg="rgba(99,102,241,0.15)" sub="All time" />
              <MetricCard label="Positive" value={s?.positive?.toLocaleString() ?? 0}
                icon={TrendingUp} iconColor="var(--positive)" iconBg="var(--positive-bg)"
                sub={s?.total_comments ? `${((s.positive / s.total_comments) * 100).toFixed(1)}%` : '—'}
                cardClass="positive-card" />
              <MetricCard label="Negative" value={s?.negative?.toLocaleString() ?? 0}
                icon={AlertTriangle} iconColor="var(--negative)" iconBg="var(--negative-bg)"
                sub={s?.total_comments ? `${((s.negative / s.total_comments) * 100).toFixed(1)}%` : '—'}
                cardClass="negative-card" />
              <MetricCard label="Sarcastic" value={s?.sarcastic?.toLocaleString() ?? 0}
                icon={Zap} iconColor="var(--sarcastic)" iconBg="var(--sarcastic-bg)"
                sub={s?.total_comments ? `${((s.sarcastic / s.total_comments) * 100).toFixed(1)}%` : '—'}
                cardClass="sarcastic-card" />
              <MetricCard label="Avg English Ratio"
                value={`${((s?.avg_english_ratio || 0) * 100).toFixed(1)}%`}
                icon={BarChart2} iconColor="#38bdf8" iconBg="rgba(56,189,248,0.1)"
                sub="Code-mix metric" cardClass="accent-card" />
              <MetricCard label="Urgent Alerts" value={s?.urgent_alerts?.toLocaleString() ?? 0}
                icon={AlertTriangle} iconColor="#fb7185" iconBg="rgba(251,113,133,0.1)"
                sub="Negative + Sarcastic" cardClass="alert-card" />
            </>
          )}
        </div>

        {/* ── Sentiment Trend Chart ──────────────────────────────────── */}
        <div className="panel" style={{ marginTop: 24 }}>
          <div className="panel-header">
            <span className="panel-title"><BarChart2 size={16} /> Sentiment Trend (Hourly)</span>
          </div>
          <div style={{ minHeight: 280 }}>
            {trend.length === 0 ? (
              <EmptyState
                icon={BarChart2}
                title="No trend data yet"
                desc="Connect a Facebook Page or load demo data above to see hourly sentiment trends."
              />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={trend}>
                  <defs>
                    {Object.entries(CHART_COLORS).map(([key, color]) => (
                      <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="hour" tick={{ fill: '#475569', fontSize: 10 }} tickFormatter={(v) => v.slice(11, 16)} />
                  <YAxis tick={{ fill: '#475569', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
                  {Object.entries(CHART_COLORS).map(([key, color]) => (
                    <Area key={key} type="monotone" dataKey={key} stackId="1"
                      stroke={color} fill={`url(#grad-${key})`} strokeWidth={1.5} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Two column: Urgent Alerts + Live Feed ─────────────────── */}
        <div className="two-col" style={{ marginTop: 24 }}>
          {/* Urgent Alerts */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">
                <AlertTriangle size={16} color="var(--negative)" /> Urgent Alerts
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {urgentItems.length} items
              </span>
            </div>
            {urgentItems.length === 0 ? (
              <EmptyState
                icon={AlertTriangle}
                title="No urgent alerts"
                desc="Negative and sarcastic comments will surface here automatically."
              />
            ) : (
              <div className="comment-feed">
                {urgentItems.slice(0, 10).map((item) => (
                  <CommentItem key={`${item.id}-${item.platform_id}`} item={item} />
                ))}
              </div>
            )}
          </div>

          {/* Live Comment Stream */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">
                <MessageSquare size={16} /> Comment Stream
              </span>
              <div className="live-indicator">
                <span className={`status-dot ${isDemoMode ? 'live' : wsStatus}`} />
                {isDemoMode ? 'Demo' : wsStatus === 'live' ? 'Live' : wsStatus}
              </div>
            </div>
            {displayFeed.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No comments yet"
                desc="Load the sample dataset above or connect a Facebook Page to start receiving real-time comments."
              />
            ) : (
              <div className="comment-feed">
                {displayFeed.slice(0, 20).map((item) => (
                  <CommentItem key={`${item.id}-${item.platform_id}`} item={item} />
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </>
  );
}
