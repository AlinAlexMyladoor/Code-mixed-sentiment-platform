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
import { useDemo } from '../context/DemoContext';

const CHART_COLORS = {
  positive: '#059669',
  negative: '#dc2626',
  sarcastic: '#d97706',
  neutral:   '#64748b',
};

export default function Dashboard() {
  const { metrics, loading, refetch } = useMetrics(15000);
  const [wsComments, setWsComments] = useState([]);
  const {
    isDemoMode, activateDemo, clearDemo: clearDemoCtx,
    injectCustomComment, demoComments, demoMetrics,
  } = useDemo();

  const [analyzeText, setAnalyzeText] = useState('');
  const [analyzeResult, setAnalyzeResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');
  const textareaRef = useRef(null);

  const onWsMessage = useCallback((msg) => {
    if (msg.type === 'comment_processed' && msg.data) {
      setWsComments((prev) => [msg.data, ...prev].slice(0, 60));
      refetch();
    }
  }, [refetch]);

  const wsStatus = useWebSocket(onWsMessage);

  const loadDemo = useCallback(() => activateDemo(), [activateDemo]);

  const clearDemo = useCallback(() => {
    clearDemoCtx();
    setWsComments([]);
  }, [clearDemoCtx]);

  const handleAnalyze = useCallback(async () => {
    const text = analyzeText.trim();
    if (!text) return;
    setAnalyzing(true);
    setAnalyzeError('');
    setAnalyzeResult(null);
    try {
      const result = await api.analyze(text);
      setAnalyzeResult(result);
      injectCustomComment(result);
    } catch (err) {
      setAnalyzeError(err.message || 'Analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  }, [analyzeText, injectCustomComment]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAnalyze();
  };

  const displayFeed = useMemo(() => {
    if (isDemoMode) return demoComments.slice(0, 40);
    const base = metrics?.data || [];
    const ids = new Set(wsComments.map((c) => c.id));
    return [...wsComments, ...base.filter((c) => !ids.has(c.id))].slice(0, 40);
  }, [isDemoMode, demoComments, wsComments, metrics]);

  const urgentItems = useMemo(
    () => displayFeed.filter((c) => c.sentiment === 'negative' || c.sentiment === 'sarcastic'),
    [displayFeed],
  );

  const s = isDemoMode ? demoMetrics?.metricsData?.summary : metrics?.summary;
  const trend = isDemoMode ? (demoMetrics?.metricsData?.trend || []) : (metrics?.trend || []);

  const sentimentHex = (sent) => {
    const map = { positive: '#10b981', negative: '#f43f5e', sarcastic: '#f59e0b' };
    return map[sent] || '#64748b';
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: '#fff', border: '1px solid var(--border-mid)',
        borderRadius: 12, padding: '10px 14px', fontSize: '0.76rem',
        boxShadow: 'var(--shadow-md)',
      }}>
        <div style={{ color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>{label}</div>
        {payload.map((entry) => (
          <div key={entry.dataKey} style={{
            color: entry.stroke, display: 'flex',
            justifyContent: 'space-between', gap: 16, marginBottom: 2,
          }}>
            <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{entry.dataKey}</span>
            <span style={{ fontWeight: 700 }}>{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <TopBar
        title="Dashboard"
        subtitle="Real-time comment analysis"
        urgentCount={s?.urgent_alerts || 0}
        onRefresh={refetch}
      />

      <div className="page-body">

        {/* ── Analyzer Panel ─────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.04) 100%)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 'var(--r-xl)', padding: '20px 24px', marginBottom: 22,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <FlaskConical size={16} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem', fontFamily: 'var(--font-display)' }}>
                Try SwaraSense
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>
                Analyze code-mixed comments instantly or load sample data.
              </div>
            </div>
            {isDemoMode && (
              <span style={{
                marginLeft: 'auto', fontSize: '0.65rem', fontWeight: 700,
                padding: '3px 10px', borderRadius: 20,
                background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
                border: '1px solid rgba(245,158,11,0.25)',
              }}>
                DEMO ACTIVE
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

            {/* Left: Load demo */}
            <div style={{
              background: 'var(--bg-hover)', borderRadius: 10,
              padding: '14px 16px', border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                <Sparkles size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                Sample Dataset
              </div>
              <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.6 }}>
                10 pre-classified Tamil-English, Hindi-English and English comments across all sentiment classes.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {!isDemoMode ? (
                  <button className="btn btn-primary btn-sm" onClick={loadDemo}>
                    <Sparkles size={12} /> Load Demo Data
                  </button>
                ) : (
                  <button className="btn btn-outline btn-sm" onClick={clearDemo}>
                    Clear Demo Data
                  </button>
                )}
              </div>
            </div>

            {/* Right: Analyze comment */}
            <div style={{
              background: 'rgba(255,255,255,0.03)', borderRadius: 10,
              padding: '14px 16px', border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                <Send size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                Analyze a Comment
              </div>
              <textarea
                ref={textareaRef}
                value={analyzeText}
                onChange={(e) => setAnalyzeText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Paste any comment — e.g. 'Bhai yeh product ekdum bakwaas hai!'"
                rows={3}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--bg-hover)', border: '1px solid var(--border-strong)',
                  borderRadius: 8, color: 'var(--text-primary)',
                  fontSize: '0.82rem', padding: '9px 11px', resize: 'vertical',
                  fontFamily: 'var(--font)', outline: 'none', lineHeight: 1.55,
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--accent-1)'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.12)'; e.target.style.background = '#fff'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'var(--bg-hover)'; }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleAnalyze}
                  disabled={analyzing || !analyzeText.trim()}
                >
                  {analyzing ? 'Analyzing…' : <><Send size={11} /> Analyze</>}
                </button>
              </div>

              {analyzeError && (
                <div style={{
                  marginTop: 8, padding: '7px 11px', borderRadius: 7, fontSize: '0.76rem',
                  background: 'var(--negative-bg)', color: 'var(--negative)',
                  border: '1px solid var(--negative-border)',
                }}>
                  {analyzeError}
                </div>
              )}

              {analyzeResult && (
                <div style={{
                  marginTop: 8, padding: '11px 13px', borderRadius: 9,
                  background: `${sentimentHex(analyzeResult.sentiment)}10`,
                  border: `1px solid ${sentimentHex(analyzeResult.sentiment)}30`,
                }}>
                  <p style={{ margin: '0 0 7px', fontSize: '0.83rem', color: 'var(--text-primary)', lineHeight: 1.5, fontStyle: 'italic' }}>
                    "{analyzeResult.original_text || analyzeResult.text}"
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span className={`badge badge-${analyzeResult.sentiment}`}>{analyzeResult.sentiment}</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {(analyzeResult.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[
                      ['EN ratio', `${(analyzeResult.english_ratio * 100).toFixed(0)}%`],
                      ['Switches', analyzeResult.language_switch_count],
                      ['Sarcasm', analyzeResult.sarcasm_score?.toFixed(2)],
                    ].map(([l, v]) => <span key={l} className="stat-chip">{l}: {v}</span>)}
                  </div>
                  <div style={{ marginTop: 6, fontSize: '0.67rem', color: 'var(--positive)' }}>
                    ✓ Added to all views
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Metric Cards ───────────────────────────────────────────── */}
        <div className="metrics-grid">
          {loading && !isDemoMode ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={110} />)
          ) : (
            <>
              <MetricCard label="Total Comments" value={s?.total_comments?.toLocaleString() ?? 0}
                icon={MessageSquare} iconColor="#a5b4fc" iconBg="rgba(99,102,241,0.12)" sub="All time" />
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
              <MetricCard label="Avg English"
                value={`${((s?.avg_english_ratio || 0) * 100).toFixed(1)}%`}
                icon={BarChart2} iconColor="#38bdf8" iconBg="rgba(56,189,248,0.1)"
                sub="Code-mix ratio" cardClass="accent-card" />
              <MetricCard label="Urgent Alerts" value={s?.urgent_alerts?.toLocaleString() ?? 0}
                icon={AlertTriangle} iconColor="#fb7185" iconBg="rgba(251,113,133,0.08)"
                sub="Negative + Sarcastic" cardClass="alert-card" />
            </>
          )}
        </div>

        {/* ── Sentiment Trend ────────────────────────────────────────── */}
        <div className="panel" style={{ marginTop: 6 }}>
          <div className="panel-header">
            <span className="panel-title"><BarChart2 size={15} /> Sentiment Trend</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Hourly breakdown</span>
          </div>
          <div style={{ minHeight: 260 }}>
            {trend.length === 0 ? (
              <EmptyState
                icon={BarChart2}
                title="No trend data"
                desc="Load demo data or connect a Facebook Page to see hourly trends."
              />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    {Object.entries(CHART_COLORS).map(([key, color]) => (
                      <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" />
                  <XAxis dataKey="hour" tick={{ fill: '#4b5563', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#4b5563', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '0.73rem', color: '#64748b', paddingTop: 8 }} />
                  {Object.entries(CHART_COLORS).map(([key, color]) => (
                    <Area key={key} type="monotone" dataKey={key}
                      stroke={color} fill={`url(#grad-${key})`} strokeWidth={1.5}
                      dot={false} activeDot={{ r: 4, fill: color }} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Urgent Alerts + Comment Stream ─────────────────────────── */}
        <div className="two-col" style={{ marginTop: 6 }}>

          {/* Urgent Alerts */}
          <div className="panel" style={{ marginBottom: 0 }}>
            <div className="panel-header">
              <div className="panel-title">
                <AlertTriangle size={15} color="var(--negative)" />
                Urgent Alerts
                <span style={{
                  fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-muted)',
                  background: 'var(--accent-soft)', padding: '1px 6px',
                  borderRadius: 4, border: '1px solid var(--border)',
                }}>
                  Negative · Sarcastic
                </span>
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {urgentItems.length} items
              </span>
            </div>
            {urgentItems.length === 0 ? (
              <EmptyState
                icon={AlertTriangle}
                title="No urgent alerts"
                desc="Negative and sarcastic comments appear here."
              />
            ) : (
              <div className="comment-feed">
                {urgentItems.slice(0, 10).map((item) => (
                  <CommentItem key={`${item.id}-urgent`} item={item} />
                ))}
              </div>
            )}
          </div>

          {/* Comment Stream */}
          <div className="panel" style={{ marginBottom: 0 }}>
            <div className="panel-header">
              <span className="panel-title">
                <MessageSquare size={15} /> Comment Stream
              </span>
              <div className="live-indicator">
                <span className={`status-dot ${isDemoMode ? 'live' : wsStatus}`} />
                {isDemoMode ? 'Demo' : wsStatus === 'live' ? 'Live' : 'Offline'}
              </div>
            </div>
            {displayFeed.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No comments yet"
                desc="Load sample data or analyze a comment above."
              />
            ) : (
              <div className="comment-feed">
                {displayFeed.slice(0, 20).map((item) => (
                  <CommentItem key={`${item.id}-feed`} item={item} />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
