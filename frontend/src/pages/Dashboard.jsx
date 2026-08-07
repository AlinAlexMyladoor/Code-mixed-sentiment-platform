import { useCallback, useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from 'recharts';
import {
  AlertTriangle, MessageSquare, TrendingUp, Users, Zap, BarChart2,
} from 'lucide-react';
import TopBar from '../components/Layout/TopBar';
import { CommentItem, EmptyState, MetricCard, SentimentBadge, Skeleton } from '../components/UI';
import { useWebSocket } from '../hooks/useWebSocket';
import { useMetrics } from '../hooks/useMetrics';

const CHART_COLORS = {
  positive: '#22c55e',
  negative: '#ef4444',
  sarcastic: '#f59e0b',
  neutral: '#64748b',
};

export default function Dashboard() {
  const { metrics, loading, refetch } = useMetrics(15000);
  const [liveFeed, setLiveFeed] = useState([]);

  const onWsMessage = useCallback((msg) => {
    if (msg.type === 'comment_processed' && msg.data) {
      setLiveFeed((prev) => [msg.data, ...prev].slice(0, 60));
      refetch();
    }
  }, [refetch]);

  const wsStatus = useWebSocket(onWsMessage);

  const displayFeed = useMemo(() => {
    const base = metrics?.data || [];
    const ids = new Set(liveFeed.map((c) => c.id));
    const combined = [...liveFeed, ...base.filter((c) => !ids.has(c.id))];
    return combined.slice(0, 40);
  }, [liveFeed, metrics]);

  const urgentItems = useMemo(
    () => displayFeed.filter((c) => c.sentiment === 'negative' || c.sentiment === 'sarcastic'),
    [displayFeed],
  );

  const s = metrics?.summary;
  const trend = metrics?.trend || [];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
        borderRadius: 10, padding: '10px 14px', fontSize: '0.78rem',
      }}>
        <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
        {payload.map((entry) => (
          <div key={entry.dataKey} style={{ color: entry.fill, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
            <span>{entry.dataKey}</span><span style={{ fontWeight: 700 }}>{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <TopBar
        title="Dashboard"
        subtitle="Real-time social listening command center"
        urgentCount={s?.urgent_alerts || 0}
        onRefresh={refetch}
      />

      <div className="page-body">
        {/* Hero gradient bar */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 50%, rgba(236,72,153,0.08) 100%)',
          border: '1px solid var(--border-accent)',
          borderRadius: 'var(--r-xl)',
          padding: '20px 28px',
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Social Listening{' '}
              <span className="gradient-text">Command Center</span>
            </h1>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Boundary-optimized extraction · Sarcasm detection · Language-switch analytics
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className={`live-indicator`}>
              <span className={`status-dot ${wsStatus}`} />
              {wsStatus === 'live' ? 'Stream Live' : wsStatus}
            </div>
          </div>
        </div>

        {/* Metric cards */}
        <div className="metrics-grid">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={120} />)
          ) : (
            <>
              <MetricCard
                label="Total Comments"
                value={s?.total_comments?.toLocaleString() ?? 0}
                icon={MessageSquare}
                iconColor="#a5b4fc"
                iconBg="rgba(99,102,241,0.15)"
                sub="All time"
              />
              <MetricCard
                label="Positive"
                value={s?.positive?.toLocaleString() ?? 0}
                icon={TrendingUp}
                iconColor="var(--positive)"
                iconBg="var(--positive-bg)"
                sub={s?.total_comments ? `${((s.positive / s.total_comments) * 100).toFixed(1)}%` : ''}
                cardClass="positive-card"
              />
              <MetricCard
                label="Negative"
                value={s?.negative?.toLocaleString() ?? 0}
                icon={AlertTriangle}
                iconColor="var(--negative)"
                iconBg="var(--negative-bg)"
                sub={s?.total_comments ? `${((s.negative / s.total_comments) * 100).toFixed(1)}%` : ''}
                cardClass="negative-card"
              />
              <MetricCard
                label="Sarcastic"
                value={s?.sarcastic?.toLocaleString() ?? 0}
                icon={Zap}
                iconColor="var(--sarcastic)"
                iconBg="var(--sarcastic-bg)"
                sub={s?.total_comments ? `${((s.sarcastic / s.total_comments) * 100).toFixed(1)}%` : ''}
                cardClass="sarcastic-card"
              />
              <MetricCard
                label="Avg English Ratio"
                value={`${((s?.avg_english_ratio || 0) * 100).toFixed(1)}%`}
                icon={BarChart2}
                iconColor="#38bdf8"
                iconBg="rgba(56,189,248,0.1)"
                sub="Sociolinguistic metric"
                cardClass="accent-card"
              />
              <MetricCard
                label="Urgent Alerts"
                value={s?.urgent_alerts?.toLocaleString() ?? 0}
                icon={AlertTriangle}
                iconColor="#fb7185"
                iconBg="rgba(251,113,133,0.1)"
                sub="Neg + Sarcastic"
                cardClass="alert-card"
              />
            </>
          )}
        </div>

        {/* Sentiment Trend Chart */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title"><BarChart2 size={16} /> Sentiment Trend (Hourly)</span>
          </div>
          <div style={{ minHeight: 280 }}>
            {trend.length === 0 ? (
              <EmptyState
                icon={BarChart2}
                title="No trend data yet"
                desc="Send webhooks to see hourly sentiment trends appear here."
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
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stackId="1"
                      stroke={color}
                      fill={`url(#grad-${key})`}
                      strokeWidth={1.5}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Two column: Alerts + Live Feed */}
        <div className="two-col">
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
                desc="Negative and sarcastic comments will appear here."
              />
            ) : (
              <div className="comment-feed">
                {urgentItems.slice(0, 10).map((item) => (
                  <CommentItem key={`${item.id}-${item.platform_id}`} item={item} />
                ))}
              </div>
            )}
          </div>

          {/* Live Feed */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">
                <MessageSquare size={16} /> Live Comment Stream
              </span>
              <div className="live-indicator">
                <span className={`status-dot ${wsStatus}`} />
                {wsStatus}
              </div>
            </div>
            {displayFeed.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No comments yet"
                desc="Run backend/tests/test_webhook.py to simulate webhook events."
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
