import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import './App.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL = (import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/dashboard');

const sentimentColor = (sentiment) => {
  switch (sentiment) {
    case 'positive':
      return '#22c55e';
    case 'negative':
      return '#ef4444';
    case 'sarcastic':
      return '#f59e0b';
    default:
      return '#94a3b8';
  }
};

function App() {
  const [metrics, setMetrics] = useState(null);
  const [liveFeed, setLiveFeed] = useState([]);
  const [wsStatus, setWsStatus] = useState('connecting');
  const wsRef = useRef(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/metrics`);
      const json = await response.json();
      if (json.status === 'success') {
        setMetrics(json);
        setLiveFeed(json.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard metrics:', error);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 15000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      ws.onopen = () => setWsStatus('live');
      ws.onclose = () => {
        setWsStatus('reconnecting');
        setTimeout(connect, 3000);
      };
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'comment_processed' && msg.data) {
            setLiveFeed((prev) => [msg.data, ...prev].slice(0, 40));
            fetchMetrics();
          }
        } catch {
          /* ignore */
        }
      };
    };
    connect();
    return () => wsRef.current?.close();
  }, [fetchMetrics]);

  const summary = metrics?.summary;
  const trend = metrics?.trend || [];

  const urgentItems = useMemo(
    () => liveFeed.filter((c) => c.sentiment === 'negative' || c.sentiment === 'sarcastic'),
    [liveFeed],
  );

  return (
    <div className="dashboard">
      <header className="hero">
        <div>
          <p className="eyebrow">Code-Mixed Sentiment Intelligence</p>
          <h1>Social Listening Command Center</h1>
          <p className="subtitle">
            Boundary-optimized extraction, sarcasm detection, and language-switch analytics for Romanized dialects.
          </p>
        </div>
        <div className={`status-pill status-${wsStatus}`}>Stream: {wsStatus}</div>
      </header>

      {summary && (
        <section className="cards">
          <article className="card">
            <span>Total comments</span>
            <strong>{summary.total_comments}</strong>
          </article>
          <article className="card positive">
            <span>Positive</span>
            <strong>{summary.positive}</strong>
          </article>
          <article className="card negative">
            <span>Negative</span>
            <strong>{summary.negative}</strong>
          </article>
          <article className="card sarcastic">
            <span>Sarcastic</span>
            <strong>{summary.sarcastic}</strong>
          </article>
          <article className="card">
            <span>Avg English ratio</span>
            <strong>{(summary.avg_english_ratio * 100).toFixed(1)}%</strong>
          </article>
          <article className="card alert">
            <span>Urgent alerts</span>
            <strong>{summary.urgent_alerts}</strong>
          </article>
        </section>
      )}

      <section className="panel">
        <h2>Sentiment trend (hourly)</h2>
        <div className="chart-wrap">
          {trend.length === 0 ? (
            <p className="muted">Trend data appears after comments are processed.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="hour" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                <YAxis tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="positive" stackId="a" fill="#22c55e" />
                <Bar dataKey="negative" stackId="a" fill="#ef4444" />
                <Bar dataKey="sarcastic" stackId="a" fill="#f59e0b" />
                <Bar dataKey="neutral" stackId="a" fill="#64748b" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="split">
        <div className="panel">
          <h2>Urgent negative / sarcastic alerts</h2>
          {urgentItems.length === 0 ? (
            <p className="muted">No urgent alerts yet.</p>
          ) : (
            <ul className="alert-list">
              {urgentItems.slice(0, 8).map((item) => (
                <li key={`${item.id}-${item.platform_id}`} style={{ borderColor: sentimentColor(item.sentiment) }}>
                  <div className="row">
                    <span className="badge" style={{ background: sentimentColor(item.sentiment) }}>
                      {item.sentiment}
                    </span>
                    <small>{item.platform_id}</small>
                  </div>
                  <p>{item.original_text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel">
          <h2>Live comment stream</h2>
          {liveFeed.length === 0 ? (
            <p className="muted">Waiting for Meta webhooks… run backend/test_webhook.py to demo.</p>
          ) : (
            <ul className="feed">
              {liveFeed.map((item) => (
                <li key={`${item.id}-${item.platform_id}`}>
                  <div className="row">
                    <span className="badge" style={{ background: sentimentColor(item.sentiment) }}>
                      {item.sentiment}
                    </span>
                    <small>EN {(item.english_ratio * 100).toFixed(0)}% · switches {item.language_switch_count ?? 0}</small>
                  </div>
                  <p>{item.original_text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

export default App;
