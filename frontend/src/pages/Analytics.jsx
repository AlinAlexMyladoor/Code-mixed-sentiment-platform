import { useEffect, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  PieChart, Pie, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, RadialBar, RadialBarChart,
} from 'recharts';
import { BarChart2, Globe, Hash, Layers, Activity, TrendingUp } from 'lucide-react';
import TopBar from '../components/Layout/TopBar';
import { EmptyState, Skeleton } from '../components/UI';
import { api } from '../api/client';
import { useDemo } from '../context/DemoContext';

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#22c55e', '#f59e0b', '#ef4444', '#38bdf8'];

const SENTIMENT_COLORS = {
  positive:  '#22c55e',
  negative:  '#ef4444',
  sarcastic: '#f59e0b',
  neutral:   '#64748b',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
      borderRadius: 10, padding: '10px 14px', fontSize: '0.78rem',
    }}>
      {label && <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>}
      {payload.map((entry, i) => (
        <div key={i} style={{ color: entry.color || entry.fill, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span>{entry.name || entry.dataKey}</span>
          <span style={{ fontWeight: 700 }}>{typeof entry.value === 'number' ? entry.value.toFixed(3) : entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function Analytics() {
  const { isDemoMode, demoMetrics, demoLangSwitch, demoBrands } = useDemo();
  const [langSwitch, setLangSwitch]     = useState([]);
  const [brands, setBrands]             = useState([]);
  const [sources, setSources]           = useState({});
  const [ratioBands, setRatioBands]     = useState({});
  const [sentLangCorr, setSentLangCorr] = useState([]);
  const [loading, setLoading]           = useState(true);

  // In demo mode: read directly from context (always up-to-date)
  const activeLangSwitch  = isDemoMode ? demoLangSwitch : langSwitch;
  const activeBrands      = isDemoMode ? demoBrands     : brands;
  const activeSources     = isDemoMode ? demoMetrics.sources     : sources;
  const activeRatioBands  = isDemoMode ? demoMetrics.ratioBands  : ratioBands;
  const activeSentLangCorr = isDemoMode ? demoMetrics.sentLangCorr : sentLangCorr;

  useEffect(() => {
    if (isDemoMode) {
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const [ls, bm, src, rb, slc] = await Promise.all([
          api.languageSwitching(48),
          api.brandMentions(10),
          api.inferenceSources(),
          api.englishRatioBands(),
          api.sentimentLangCorrelation(),
        ]);
        setLangSwitch(ls);
        setBrands(bm);
        setSources(src);
        setRatioBands(rb);
        setSentLangCorr(slc);
      } catch (err) {
        console.error('Analytics load failed:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isDemoMode]);

  const sourcePieData = Object.entries(activeSources).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
  const bandData = Object.entries(activeRatioBands).map(([band, counts]) => ({ band, ...counts }));

  // Compute overall avg English ratio for the intensity meter
  const overallAvgEn = activeSentLangCorr.length > 0
    ? activeSentLangCorr.reduce((sum, d) => sum + d.avg_en_ratio * d.count, 0) /
      Math.max(1, activeSentLangCorr.reduce((sum, d) => sum + d.count, 0))
    : null;

  return (
    <>
      <TopBar title="Analytics" subtitle="Sociolinguistic and sentiment insights" />

      <div className="page-body">

        {/* ── Sociolinguistic Insight Cards ─────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
          {/* English Intensity Meter */}
          <div className="metric-card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>
                  English Intensity
                </div>
                {loading || overallAvgEn === null ? (
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>—</div>
                ) : (
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#6366f1' }}>
                    {(overallAvgEn * 100).toFixed(1)}%
                  </div>
                )}
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Avg English ratio across all comments
                </div>
              </div>
              <div style={{ background: 'rgba(99,102,241,0.12)', borderRadius: 12, padding: 10 }}>
                <Globe size={20} color="#6366f1" />
              </div>
            </div>
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${(overallAvgEn || 0) * 100}%`,
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                borderRadius: 4, transition: 'width 0.8s ease',
              }} />
            </div>
          </div>

          {/* Positive ↔ Sarcastic English contrast */}
          {!loading && activeSentLangCorr.length > 0 && (() => {
            const pos  = activeSentLangCorr.find(d => d.sentiment === 'positive');
            const sarc = activeSentLangCorr.find(d => d.sentiment === 'sarcastic');
            if (!pos || !sarc) return null;
            const diff = ((pos.avg_en_ratio - sarc.avg_en_ratio) * 100).toFixed(1);
            return (
              <div className="metric-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>
                      Positive vs Sarcastic
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#22c55e' }}>
                      +{diff}%
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      More English in positive comments
                    </div>
                  </div>
                  <div style={{ background: 'rgba(34,197,94,0.12)', borderRadius: 12, padding: 10 }}>
                    <TrendingUp size={20} color="#22c55e" />
                  </div>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.6, padding: '8px 0 0', borderTop: '1px solid var(--border)' }}>
                  Research baseline: 34.3% more English in positive utterances
                </div>
              </div>
            );
          })()}
        </div>

        {/* ── Sentiment–Language Correlation Chart ──────────────────────── */}
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-header">
            <span className="panel-title"><Activity size={16} /> Sentiment ↔ Language Correlation</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Avg English ratio per sentiment class</span>
          </div>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '0 0 16px' }}>
            Positive utterances exhibit significantly greater English proportions (~34.3%), while negative
            and sarcastic comments rely more on regional Romanized language to carry heavier emotional weight.
          </p>
          <div style={{ minHeight: 220 }}>
            {loading ? <Skeleton height={220} /> : activeSentLangCorr.length === 0 ? (
              <EmptyState icon={Activity} title="No correlation data yet" desc="Process code-mixed comments to reveal language-sentiment patterns." />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={activeSentLangCorr} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="sentiment"
                    tick={{ fill: 'var(--text-muted)', fontSize: 11, textTransform: 'capitalize' }}
                  />
                  <YAxis
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    tickFormatter={v => `${(v * 100).toFixed(0)}%`}
                    domain={[0, 1]}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    formatter={(v, name) => [
                      name === 'avg_en_ratio' ? `${(v * 100).toFixed(1)}%` : v.toFixed(2),
                      name === 'avg_en_ratio' ? 'Avg English Ratio' : 'Avg Lang Switches',
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                  <Bar dataKey="avg_en_ratio" name="Avg English Ratio" radius={[6, 6, 0, 0]}>
                    {activeSentLangCorr.map((entry, i) => (
                      <Cell key={i} fill={SENTIMENT_COLORS[entry.sentiment] || '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Language switching over time ───────────────────────────────── */}
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-header">
            <span className="panel-title"><Globe size={16} /> Language-Switching Over Time</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Last 48 hours · hourly buckets</span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 16, margin: '0 0 16px' }}>
            Studies show bilingual users use more English for positive sentiments (34%+) and switch to regional language for heavier emotional expression.
          </p>
          <div style={{ minHeight: 260 }}>
            {loading ? <Skeleton height={260} /> : activeLangSwitch.length === 0 ? (
              <EmptyState icon={Globe} title="No language data yet" desc="Process some code-mixed comments to see switching patterns." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={activeLangSwitch}>
                  <defs>
                    <linearGradient id="enGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="swGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ec4899" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="hour" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickFormatter={(v) => v.slice(11, 16)} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
                  <Area type="monotone" dataKey="avg_en_ratio"  name="Avg English Ratio"    stroke="#6366f1" fill="url(#enGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="avg_switches"  name="Avg Lang Switches"    stroke="#ec4899" fill="url(#swGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="two-col">
          {/* English Ratio by Sentiment Band */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title"><BarChart2 size={16} /> Sentiment by English Ratio Band</span>
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Shows how sentiment shifts as English proportion increases in code-mixed comments.
            </p>
            {loading ? <Skeleton height={240} /> : bandData.length === 0 ? (
              <EmptyState icon={BarChart2} title="No data" desc="Process comments to see band analysis." />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={bandData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="band" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
                  <Bar dataKey="positive"  fill="#22c55e" radius={[4,4,0,0]} />
                  <Bar dataKey="negative"  fill="#ef4444" radius={[4,4,0,0]} />
                  <Bar dataKey="sarcastic" fill="#f59e0b" radius={[4,4,0,0]} />
                  <Bar dataKey="neutral"   fill="#64748b" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Inference Sources Pie */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title"><Layers size={16} /> Inference Source Distribution</span>
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Which AI model processed each comment: heuristic / RoBERTa CPU / Llama LoRA.
            </p>
            {loading ? <Skeleton height={240} /> : sourcePieData.length === 0 ? (
              <EmptyState icon={Layers} title="No source data" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={sourcePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {sourcePieData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
                  {sourcePieData.map((d, i) => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      {d.name} ({d.value})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Brand Mentions */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title"><Hash size={16} /> Top Brand / Entity Mentions</span>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => api.exportComments({})}
            >
              Export CSV
            </button>
          </div>
          {loading ? <Skeleton height={200} /> : activeBrands.length === 0 ? (
            <EmptyState icon={Hash} title="No brands detected yet" desc="Brand names in comments will appear here." />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Brand / Entity</th>
                    <th>Total Mentions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeBrands.map((b, i) => (
                    <tr key={b.brand || b.entity}>
                      <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.brand || b.entity}</td>
                      <td style={{ fontWeight: 700, color: 'var(--accent-1)' }}>{b.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
