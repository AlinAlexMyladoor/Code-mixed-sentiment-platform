import { useCallback, useMemo, useState } from 'react';
import {
  Area, AreaChart, CartesianGrid,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from 'recharts';
import {
  AlertTriangle, MessageSquare, TrendingUp, Zap, BarChart2,
} from 'lucide-react';
import TopBar from '../components/Layout/TopBar';
import { CommentItem, EmptyState, MetricCard, Skeleton } from '../components/UI';
import { useWebSocket } from '../hooks/useWebSocket';
import { useMetrics } from '../hooks/useMetrics';
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
  const { isDemoMode, demoComments, demoMetrics } = useDemo();

  const onWsMessage = useCallback((msg) => {
    if (msg.type === 'comment_processed' && msg.data) {
      setWsComments((prev) => [msg.data, ...prev].slice(0, 60));
      refetch();
    }
  }, [refetch]);

  const wsStatus = useWebSocket(onWsMessage);

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
        subtitle="Real-time comment intelligence"
        urgentCount={s?.urgent_alerts || 0}
        onRefresh={refetch}
      />

      <div className="page-body">

        {/* ── Metric Cards at top ─────────────────────────────────────────── */}
        <div className="metrics-grid">
          {loading && !isDemoMode ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={110} />)
          ) : (
            <>
              <MetricCard label="Total Comments" value={s?.total_comments?.toLocaleString() ?? 0}
                icon={MessageSquare} iconColor="#2dd4bf" iconBg="rgba(13,148,136,0.1)" sub="All time" />
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
                desc="Connect a Facebook Page to see hourly sentiment trends."
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
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,148,136,0.07)" />
                  <XAxis dataKey="hour" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
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
                desc="Connect a Facebook Page to begin receiving real-time comments."
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
