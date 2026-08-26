import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Area, AreaChart, CartesianGrid,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from 'recharts';
import {
  AlertTriangle, MessageSquare, TrendingUp, Zap, BarChart2,
} from 'lucide-react';
import TopBar from '../components/Layout/TopBar';
import { EmptyState, MetricCard, Skeleton } from '../components/UI';
import { useWebSocket } from '../hooks/useWebSocket';
import { useMetrics } from '../hooks/useMetrics';
import { useDemo } from '../context/DemoContext';
import { api } from '../api/client';
import Onboarding from './Onboarding';

const CHART_COLORS = {
  positive: '#10b981',
  negative: '#f43f5e',
  sarcastic: '#d97706',
  neutral:   '#64748b',
};

/* Framer Motion stagger variants */
const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.40, ease: [0.4, 0, 0.2, 1] } },
};

/* Format an ISO timestamp into readable time like "4:00 AM" */
function formatHourLabel(raw) {
  if (!raw) return raw;
  try {
    const d = new Date(raw.includes('T') ? raw : raw + 'T00:00:00');
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return raw;
  }
}

export default function Dashboard() {
  const { metrics, loading, refetch } = useMetrics(15000);
  const [wsComments, setWsComments] = useState([]);
  const { isDemoMode, demoComments, demoMetrics } = useDemo();
  const [pagesCount, setPagesCount] = useState(null);

  useEffect(() => {
    if (!isDemoMode) {
      api.connectedPages().then(pages => setPagesCount(pages.length)).catch(() => setPagesCount(0));
    }
  }, [isDemoMode]);

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

  /* Urgent = Negative OR Sarcastic AND confidence >= 0.80 */
  const urgentItems = useMemo(
    () => displayFeed.filter(
      (c) => (c.sentiment === 'negative' || c.sentiment === 'sarcastic') &&
             (c.confidence == null || c.confidence >= 0.8)
    ),
    [displayFeed],
  );

  const s = isDemoMode ? demoMetrics?.metricsData?.summary : metrics?.summary;
  const rawTrend = isDemoMode ? (demoMetrics?.metricsData?.trend || []) : (metrics?.trend || []);

  /* Format x-axis timestamps */
  const trend = useMemo(() =>
    rawTrend.map(pt => ({ ...pt, hour: formatHourLabel(pt.hour) })),
  [rawTrend]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: '#fff', border: '1px solid #e2e8f0',
        borderRadius: 12, padding: '10px 14px', fontSize: '0.76rem',
        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
      }}>
        <div style={{ color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>{label}</div>
        {payload.map((entry) => (
          <div key={entry.dataKey} style={{
            color: entry.stroke, display: 'flex',
            justifyContent: 'space-between', gap: 16, marginBottom: 2,
          }}>
            <span style={{ textTransform: 'capitalize', color: '#475569' }}>{entry.dataKey}</span>
            <span style={{ fontWeight: 700 }}>{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const totalComments = s?.total_comments || 0;

  if (!isDemoMode && !loading && pagesCount === 0 && totalComments === 0) {
    return <Onboarding />;
  }

  return (
    <>
      <TopBar
        title="Dashboard"
        subtitle="Real-time comment intelligence"
        urgentCount={s?.urgent_alerts || 0}
        onRefresh={refetch}
      />

      <div className="page-body">
        {/* Ambient radial glow — decorative lighting effect */}
        <div className="dashboard-glow" aria-hidden="true" />

        {/* ── Metric Cards ──────────────────────────────────────────────── */}
        <motion.div
          className="metrics-grid"
          variants={gridVariants}
          initial="hidden"
          animate="show"
          style={{ animation: 'none' }} /* Override CSS stagger since framer handles it */
        >
          {loading && !isDemoMode ? (
            Array.from({ length: 6 }).map((_, i) => (
              <motion.div key={i} variants={itemVariants}><Skeleton height={110} /></motion.div>
            ))
          ) : (
            <>
              <motion.div variants={itemVariants}>
                <MetricCard label="Total Comments" value={s?.total_comments?.toLocaleString() ?? 0}
                  icon={MessageSquare} iconColor="#2dd4bf" iconBg="rgba(13,148,136,0.1)" sub="All time" />
              </motion.div>
              <motion.div variants={itemVariants}>
                <MetricCard label="Positive" value={s?.positive?.toLocaleString() ?? 0}
                  icon={TrendingUp} iconColor="var(--positive)" iconBg="var(--positive-bg)"
                  sub={s?.total_comments ? `${((s.positive / s.total_comments) * 100).toFixed(1)}%` : '—'}
                  cardClass="positive-card" />
              </motion.div>
              <motion.div variants={itemVariants}>
                <MetricCard label="Negative" value={s?.negative?.toLocaleString() ?? 0}
                  icon={AlertTriangle} iconColor="var(--negative)" iconBg="var(--negative-bg)"
                  sub={s?.total_comments ? `${((s.negative / s.total_comments) * 100).toFixed(1)}%` : '—'}
                  cardClass="negative-card" />
              </motion.div>
              <motion.div variants={itemVariants}>
                <MetricCard label="Sarcastic" value={s?.sarcastic?.toLocaleString() ?? 0}
                  icon={Zap} iconColor="var(--sarcastic)" iconBg="var(--sarcastic-bg)"
                  sub={s?.total_comments ? `${((s.sarcastic / s.total_comments) * 100).toFixed(1)}%` : '—'}
                  cardClass="sarcastic-card" />
              </motion.div>
              <motion.div variants={itemVariants}>
                <MetricCard label="Avg English"
                  value={`${((s?.avg_english_ratio || 0) * 100).toFixed(1)}%`}
                  icon={BarChart2} iconColor="#38bdf8" iconBg="rgba(56,189,248,0.1)"
                  sub="Code-mix ratio" cardClass="accent-card" />
              </motion.div>
              <motion.div variants={itemVariants}>
                <MetricCard label="Urgent Alerts" value={urgentItems.length.toString()}
                  icon={AlertTriangle} iconColor="#fb7185" iconBg="rgba(251,113,133,0.08)"
                  sub="High-intensity complaints" cardClass="alert-card" />
              </motion.div>
            </>
          )}
        </motion.div>

        {/* ── Sentiment Trend ────────────────────────────────────────── */}
        <div className="panel" style={{ marginTop: 6 }}>
          <div className="panel-header">
            <span className="panel-title"><BarChart2 size={15} /> Sentiment Trend</span>
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
                        <stop offset="5%" stopColor={color} stopOpacity={0.22} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="hour" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '0.73rem', color: '#64748b', paddingTop: 8 }} />
                  {Object.entries(CHART_COLORS).map(([key, color]) => (
                    <Area key={key} type="monotone" dataKey={key}
                      stroke={color} fill={`url(#grad-${key})`} strokeWidth={2}
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
                  fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8',
                  background: '#f8fafc', padding: '1px 7px',
                  borderRadius: 4, border: '1px solid #e2e8f0',
                }}>
                  High Confidence
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
                desc="High-confidence negative and sarcastic comments appear here."
              />
            ) : (
              <div className="comment-feed">
                {urgentItems.slice(0, 10).map((item) => (
                  <FeedItem key={`${item.id}-urgent`} item={item} />
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
                  <FeedItem key={`${item.id}-feed`} item={item} />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}

/* ─── Feed Item: replaces tech pills with aspect tags + Create Ticket hover ── */
const SENTIMENT_COLORS = {
  positive:  '#10b981',
  negative:  '#f43f5e',
  sarcastic: '#d97706',
  neutral:   '#64748b',
};

function FeedItem({ item }) {
  const [hovered, setHovered] = useState(false);
  const [creating, setCreating] = useState(false);
  const [ticketCreated, setTicketCreated] = useState(!!item.ticket_id);

  if (!item) return null;

  const time = item.created_at
    ? new Date(item.created_at.endsWith('Z') ? item.created_at : item.created_at + 'Z')
        .toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })
    : '';

  const sentColor = SENTIMENT_COLORS[item.sentiment] || '#64748b';
  const isNegative = item.sentiment === 'negative' || item.sentiment === 'sarcastic';

  const handleCreateTicket = async () => {
    if (ticketCreated || creating) return;
    setCreating(true);
    try {
      const res = await api.createTicket(item.id);
      if (res.status === 'success') setTicketCreated(true);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="comment-item"
      style={{ borderLeft: `3px solid ${sentColor}`, position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Meta row */}
      <div className="comment-meta">
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: '0.65rem', fontWeight: 700,
          color: sentColor,
          background: `${sentColor}12`,
          border: `1px solid ${sentColor}30`,
          padding: '2px 7px', borderRadius: 5, textTransform: 'capitalize',
        }}>
          {item.sentiment}
        </span>
        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{time}</span>
      </div>

      {/* Text */}
      <p className="comment-text">{item.original_text}</p>

      {/* Aspect tags — neutral pills, no emojis */}
      {item.aspect_sentiments && Object.keys(item.aspect_sentiments).length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
          {Object.entries(item.aspect_sentiments).map(([aspect]) => (
            <span key={aspect} style={{
              fontSize: '0.6rem',
              background: '#f1f5f9', color: '#64748b',
              border: '1px solid #e2e8f0',
              padding: '1px 6px', borderRadius: 4, fontWeight: 500,
            }}>{aspect}</span>
          ))}
        </div>
      )}

      {/* → Create Ticket hover CTA on negative comments */}
      {isNegative && hovered && (
        <div style={{ marginTop: 6 }}>
          {ticketCreated ? (
            <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Ticket Created
            </span>
          ) : (
            <button
              onClick={handleCreateTicket}
              disabled={creating}
              style={{
                fontSize: '0.68rem', fontWeight: 600,
                color: creating ? '#94a3b8' : '#2563eb',
                background: 'none', border: 'none',
                cursor: creating ? 'default' : 'pointer',
                padding: 0, display: 'flex', alignItems: 'center', gap: 4,
                transition: 'opacity 0.15s',
                opacity: creating ? 0.6 : 1,
              }}
            >
              → {creating ? 'Creating…' : 'Create Ticket'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
