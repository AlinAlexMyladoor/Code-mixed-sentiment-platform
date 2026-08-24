import { useEffect, useState } from 'react';
import { Activity, Brain, CheckCircle, Cpu, Server, Zap, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
import TopBar from '../components/Layout/TopBar';
import { EmptyState, Skeleton } from '../components/UI';
import { api } from '../api/client';
import { CommentItem } from '../components/UI';
import { useDemo } from '../context/DemoContext';

const INFERENCE_MODES = [
  {
    id: 'heuristic_mvp',
    name: 'Heuristic Engine',
    icon: Zap,
    color: '#f59e0b',
    desc: 'Rule-based lexicon matching with dialect-specific token libraries. Covers Tamil, Malayalam, Hindi, and Bengali Romanized code-mixed inputs with sarcasm detection via contextual cues and emoji patterns.',
    accuracy: '~68%',
    latency: '<1ms',
  },
  {
    id: 'roberta_cpu',
    name: 'RoBERTa ML Model',
    icon: Cpu,
    color: '#6366f1',
    desc: 'Transformer-based sentiment model fine-tuned on social media text. Provides true machine learning inference with a sarcasm overlay layer applied on top of base model scores for higher precision.',
    accuracy: '~78%',
    latency: '200–600ms',
  },
  {
    id: 'llama_lora',
    name: 'Llama 3 8B LoRA',
    icon: Brain,
    color: '#ec4899',
    desc: 'Fine-tuned Llama 3 8B with LoRA adapters trained on synthetic code-mixed corpora. Achieves 66.87% benchmark accuracy on code-mixed data — 10–12% above zero-shot baselines.',
    accuracy: '~82–87%',
    latency: '500–2000ms',
  },
];

export default function AIInsights() {
  const { isDemoMode, demoMetrics, demoComments } = useDemo();
  const [sources, setSources] = useState({});
  const [recentComments, setRecentComments] = useState([]);
  const [briefing, setBriefing] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMode, setActiveMode] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (isDemoMode) {
          setSources(demoMetrics.sources);
          setRecentComments(demoComments);
          setActiveMode('heuristic_mvp');
          setLoading(false);
          return;
        }
        const [src, metrics, brief, clust] = await Promise.all([
          api.inferenceSources(),
          api.metrics(),
          api.insightsBriefing().catch(() => null),
          api.narrativeClusters().catch(() => ({ clusters: [] })),
        ]);
        setSources(src);
        setRecentComments(metrics.data || []);
        setBriefing(brief);
        setClusters(clust.clusters || []);
        const dominant = Object.entries(src).sort((a, b) => b[1] - a[1])[0];
        if (dominant) setActiveMode(dominant[0]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isDemoMode, demoMetrics, demoComments]);

  const total = Object.values(sources).reduce((a, b) => a + b, 0);

  return (
    <>
      <TopBar title="AI Insights" subtitle="Model performance &amp; classified comments" />
      <div className="page-body">

        {/* ── AI Business Briefing ────────────────────────────────────────── */}
        {!loading && briefing && (
          <div className="panel" style={{ marginBottom: 20, border: '1px solid #8b5cf633', background: 'var(--bg-glass)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 4, background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899)' }} />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ background: 'rgba(139,92,246,0.15)', padding: 8, borderRadius: 10 }}>
                <Sparkles size={20} color="#8b5cf6" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>AI Weekly Briefing</h2>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Generated from {briefing.total_comments} comments over the last 7 days
                </div>
              </div>
              
              {briefing.sentiment_delta !== null && (
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: briefing.sentiment_delta > 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', padding: '6px 12px', borderRadius: 20 }}>
                  <TrendingUp size={14} color={briefing.sentiment_delta > 0 ? '#22c55e' : '#ef4444'} style={{ transform: briefing.sentiment_delta < 0 ? 'rotate(180deg)' : 'none' }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: briefing.sentiment_delta > 0 ? '#22c55e' : '#ef4444' }}>
                    {briefing.sentiment_delta > 0 ? '+' : ''}{briefing.sentiment_delta}% Sentiment
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
              <div style={{ background: 'var(--bg-hover)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>
                  <AlertTriangle size={14} color="#f59e0b" /> Top Complaint Signal
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {briefing.top_complaint || "No major complaints detected"}
                </div>
              </div>
              <div style={{ background: 'var(--bg-hover)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>
                  <Activity size={14} color="#ef4444" /> High Risk Comments
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ef4444' }}>
                  {briefing.high_risk_pct}%
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Require immediate attention</div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-hover)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
                Key Insights
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {briefing.briefing_bullets.map((bullet, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>{bullet}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ── Trending Friction Points ──────────────────────────────────────── */}
        {!loading && clusters.length > 0 && (
          <div className="panel" style={{ marginBottom: 20 }}>
            <div className="panel-header">
              <span className="panel-title"><AlertTriangle size={16} color="#f59e0b" /> Trending Friction Points</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Top clustered negative aspects</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
              {clusters.map((cluster, idx) => (
                <div key={idx} style={{ background: 'var(--bg-hover)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                      {cluster.topic.replace('_', ' ')}
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: 12 }}>
                      {cluster.count} Complaints
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>Recent Examples:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {cluster.examples.map((ex, i) => (
                      <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-glass)', padding: '8px 12px', borderRadius: 8, borderLeft: '2px solid #f59e0b' }}>
                        "{ex}"
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active inference mode banner */}
        {!loading && activeMode && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%)',
            border: '1px solid var(--border-accent)',
            borderRadius: 'var(--r-xl)',
            padding: '18px 24px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={22} color="#a5b4fc" />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Currently Active Mode</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-primary)', fontWeight: 700, marginTop: 2 }}>
                {INFERENCE_MODES.find(m => m.id === activeMode)?.name || activeMode}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {total.toLocaleString()} comments processed
            </div>
          </div>
        )}

        {/* Inference mode cards */}
        <div className="three-col" style={{ marginBottom: 20 }}>
          {INFERENCE_MODES.map((mode) => {
            const Icon = mode.icon;
            const count = sources[mode.id] || 0;
            const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
            const isActive = mode.id === activeMode;
            return (
              <div
                key={mode.id}
                className="card card-pad"
                style={{
                  borderColor: isActive ? mode.color : 'var(--border)',
                  boxShadow: isActive ? `0 0 20px ${mode.color}22` : 'none',
                  transition: 'all 0.3s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${mode.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={20} color={mode.color} />
                  </div>
                  {isActive && (
                    <span style={{
                      fontSize: '0.62rem', fontWeight: 700, color: mode.color,
                      background: `${mode.color}18`, border: `1px solid ${mode.color}40`,
                      padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase',
                    }}>Active</span>
                  )}
                </div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem', marginBottom: 6 }}>{mode.name}</div>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  {[
                    ['Accuracy', mode.accuracy],
                    ['Latency', mode.latency],
                  ].map(([label, val]) => (
                    <div key={label} style={{ background: 'var(--bg-hover)', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.88rem', marginTop: 2 }}>{val}</div>
                    </div>
                  ))}
                </div>

                {/* Usage bar */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                    <span>Comments processed</span>
                    <span>{count.toLocaleString()} ({pct}%)</span>
                  </div>
                  <div style={{ background: 'var(--border-mid)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: mode.color, borderRadius: 4, transition: 'width 1s ease' }} />
                  </div>
                </div>

                {/* Setup */}
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', padding: '8px 10px', background: 'var(--bg-hover)', borderRadius: 8 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 3 }}>Performance Tier</div>
                  <div>{mode.accuracy} accuracy · {mode.latency} avg latency</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Model Performance Summary Table ──────────────────────────────── */}
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-header">
            <span className="panel-title"><Activity size={16} /> Model Performance Summary</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Accuracy</th>
                  <th>Latency</th>
                  <th>Best For</th>
                </tr>
              </thead>
              <tbody>
                {INFERENCE_MODES.map(m => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 7, background: `${m.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <m.icon size={14} color={m.color} />
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: m.color }}>{m.accuracy}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{m.latency}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {m.id === 'heuristic_mvp' && 'High-volume, low-latency triage'}
                      {m.id === 'roberta_cpu' && 'Balanced accuracy & speed'}
                      {m.id === 'llama_lora' && 'Deep code-mixed understanding'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent classified comments */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title"><CheckCircle size={16} /> Recently Classified Comments</span>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3].map((i) => <Skeleton key={i} height={80} />)}
            </div>
          ) : recentComments.length === 0 ? (
            <EmptyState icon={Brain} title="No classified comments yet" desc="Connect a Facebook Page to begin receiving real-time data, or use the Demo panel on the Dashboard." />
          ) : (
            <div className="comment-feed" style={{ maxHeight: 400 }}>
              {recentComments.slice(0, 15).map((c) => (
                <CommentItem key={`${c.id}-${c.platform_id}`} item={c} showStats={true} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
