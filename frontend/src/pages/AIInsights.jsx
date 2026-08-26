import { useEffect, useState } from 'react';
import { Activity, Brain, Cpu, Sparkles, TrendingUp, AlertTriangle, Zap } from 'lucide-react';
import TopBar from '../components/Layout/TopBar';
import { EmptyState, Skeleton } from '../components/UI';
import { api } from '../api/client';
import { useDemo } from '../context/DemoContext';

const INFERENCE_MODES = [
  {
    id: 'heuristic_mvp',
    name: 'Heuristic Engine',
    icon: Zap,
    color: '#f59e0b',
    desc: 'Rule-based lexicon matching with dialect-specific token libraries.',
    accuracy: '~68%',
    latency: '<1ms',
    bestFor: 'High-volume, low-latency triage',
  },
  {
    id: 'roberta_cpu',
    name: 'RoBERTa ML Model',
    icon: Cpu,
    color: '#6366f1',
    desc: 'Transformer-based sentiment model fine-tuned on social media text.',
    accuracy: '~78%',
    latency: '200–600ms',
    bestFor: 'Balanced accuracy & speed',
  },
  {
    id: 'llama_lora',
    name: 'Llama 3 8B LoRA',
    icon: Brain,
    color: '#ec4899',
    desc: 'Fine-tuned Llama 3 8B with LoRA adapters trained on synthetic code-mixed corpora.',
    accuracy: '~82–87%',
    latency: '500–2000ms',
    bestFor: 'Deep code-mixed understanding',
  },
];

export default function AIInsights() {
  const { isDemoMode, demoMetrics, demoComments } = useDemo();
  const [sources, setSources] = useState({});
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
          setActiveMode('heuristic_mvp');
          setLoading(false);
          return;
        }
        const [src, brief, clust] = await Promise.all([
          api.inferenceSources(),
          api.insightsBriefing().catch(() => null),
          api.narrativeClusters().catch(() => ({ clusters: [] })),
        ]);
        setSources(src);
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
      <TopBar title="AI Insights" />
      <div className="page-body">

        {/* ── AI Business Briefing ─────────────────────────────────────── */}
        {!loading && briefing && (
          <div className="panel" style={{ marginBottom: 20 }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>Weekly Briefing</h2>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Generated from {briefing.total_comments} comments over the last 7 days
                </div>
              </div>
              
              {briefing.sentiment_delta !== null && (
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: briefing.sentiment_delta > 0 ? 'var(--positive-bg)' : 'var(--negative-bg)', padding: '6px 12px', borderRadius: 20 }}>
                  <TrendingUp size={14} color={briefing.sentiment_delta > 0 ? 'var(--positive)' : 'var(--negative)'} style={{ transform: briefing.sentiment_delta < 0 ? 'rotate(180deg)' : 'none' }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: briefing.sentiment_delta > 0 ? 'var(--positive)' : 'var(--negative)' }}>
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
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {briefing.briefing_bullets.map((bullet, i) => {
                  // Strip conversational prefixes for cleaner bullets
                  const clean = bullet
                    .replace(/^(this week,?\s*)?(\d+\.?\d*%)\s+of\s+(this week's\s+)?comments?\s+are\s+/i, '$2 ')
                    .replace(/^there (is|are)\s+/i, '')
                    .trim();
                  // Capitalize first letter
                  const display = clean.charAt(0).toUpperCase() + clean.slice(1);
                  return <li key={i} style={{ marginBottom: 4 }}>{display}</li>;
                })}
              </ul>
            </div>
          </div>
        )}

        {/* ── Trending Friction Points ──────────────────────────────────── */}
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



      </div>
    </>
  );
}
