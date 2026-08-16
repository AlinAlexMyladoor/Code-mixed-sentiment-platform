import { useEffect, useState } from 'react';
import { Activity, Brain, CheckCircle, Cpu, Server, Zap } from 'lucide-react';
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
        const [src, metrics] = await Promise.all([
          api.inferenceSources(),
          api.metrics(),
        ]);
        setSources(src);
        setRecentComments(metrics.data || []);
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
      <TopBar title="AI Insights" subtitle="Inference engine usage and classified comments" />
      <div className="page-body">

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
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.6 }}>{mode.desc}</div>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  {[
                    ['Accuracy', mode.accuracy],
                    ['Latency', mode.latency],
                  ].map(([label, val]) => (
                    <div key={label} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '8px 10px' }}>
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
                  <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: mode.color, borderRadius: 4, transition: 'width 1s ease' }} />
                  </div>
                </div>

                {/* Setup */}
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', padding: '8px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 3 }}>Performance Tier</div>
                  <div>{mode.accuracy} accuracy · {mode.latency} avg latency</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Llama LoRA architecture note */}
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-header">
            <span className="panel-title"><Server size={16} /> AI Pipeline</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {[
              { step: '1', title: 'Synthetic Data', desc: '50+ seed phrases × 15 variations = 750+ rows covering Tamil, Malayalam, Hindi, Bengali Romanized dialects.' },
              { step: '2', title: 'LoRA Training', desc: 'Llama 3 8B + 4-bit quantization + LoRA adapters. Runs on T4/A100 GPU. ~200-500 steps for MVP.' },
              { step: '3', title: 'Inference Server', desc: 'FastAPI server at port 8001. Parses model output for 4 classes: positive, negative, neutral, sarcastic.' },
              { step: '4', title: 'Boundary Extraction', desc: 'Normalize spans before entity detection. Prevents LLM boundary corruption on messy Romanized input.' },
            ].map((item) => (
              <div key={item.step} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: '16px', border: '1px solid var(--border)' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, background: 'var(--accent-grad)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.78rem', fontWeight: 800, color: 'white', marginBottom: 10,
                }}>{item.step}</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.88rem', marginBottom: 6 }}>{item.title}</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            ))}
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
