import { useEffect, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  PieChart, Pie, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from 'recharts';
import { BarChart2, Globe, Hash, Layers } from 'lucide-react';
import TopBar from '../components/Layout/TopBar';
import { EmptyState, Skeleton } from '../components/UI';
import { api } from '../api/client';

const SENTINEL_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#22c55e', '#f59e0b', '#ef4444', '#38bdf8'];

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
  const [langSwitch, setLangSwitch] = useState([]);
  const [brands, setBrands] = useState([]);
  const [sources, setSources] = useState({});
  const [ratioBands, setRatioBands] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [ls, bm, src, rb] = await Promise.all([
          api.languageSwitching(48),
          api.brandMentions(10),
          api.inferenceSources(),
          api.englishRatioBands(),
        ]);
        setLangSwitch(ls);
        setBrands(bm);
        setSources(src);
        setRatioBands(rb);
      } catch (err) {
        console.error('Analytics load failed:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const sourcePieData = Object.entries(sources).map(([name, value]) => ({ name, value }));
  const bandData = Object.entries(ratioBands).map(([band, counts]) => ({ band, ...counts }));

  return (
    <>
      <TopBar title="Analytics" subtitle="Deep sociolinguistic and sentiment insights" />

      <div className="page-body">
        {/* Language switching over time */}
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-header">
            <span className="panel-title"><Globe size={16} /> Language-Switching Over Time</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Last 48 hours · hourly buckets</span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 16, margin: '0 0 16px' }}>
            Studies show bilingual users use more English for positive sentiments (34%+) and switch to regional language for heavier emotional expression.
          </p>
          <div style={{ minHeight: 260 }}>
            {loading ? <Skeleton height={260} /> : langSwitch.length === 0 ? (
              <EmptyState icon={Globe} title="No language data yet" desc="Process some code-mixed comments to see switching patterns." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={langSwitch}>
                  <defs>
                    <linearGradient id="enGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="swGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="hour" tick={{ fill: '#475569', fontSize: 10 }} tickFormatter={(v) => v.slice(11, 16)} />
                  <YAxis tick={{ fill: '#475569', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
                  <Area type="monotone" dataKey="avg_en_ratio" name="Avg English Ratio" stroke="#6366f1" fill="url(#enGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="avg_switches" name="Avg Lang Switches" stroke="#ec4899" fill="url(#swGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="two-col">
          {/* English Ratio by Sentiment */}
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
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="band" tick={{ fill: '#475569', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#475569', fontSize: 10 }} />
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
                        <Cell key={i} fill={SENTINEL_COLORS[i % SENTINEL_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
                  {sourcePieData.map((d, i) => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: SENTINEL_COLORS[i % SENTINEL_COLORS.length] }} />
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
          {loading ? <Skeleton height={200} /> : brands.length === 0 ? (
            <EmptyState icon={Hash} title="No brands detected yet" desc="Brand names (title-cased) in comments will appear here." />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Brand / Entity</th>
                    <th>Total Mentions</th>
                    <th>Positive</th>
                    <th>Negative</th>
                    <th>Sarcastic</th>
                    <th>Neutral</th>
                  </tr>
                </thead>
                <tbody>
                  {brands.map((b, i) => (
                    <tr key={b.brand}>
                      <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.brand}</td>
                      <td style={{ fontWeight: 700, color: 'var(--accent-1)' }}>{b.count}</td>
                      <td style={{ color: 'var(--positive)' }}>{b.sentiment_breakdown?.positive ?? 0}</td>
                      <td style={{ color: 'var(--negative)' }}>{b.sentiment_breakdown?.negative ?? 0}</td>
                      <td style={{ color: 'var(--sarcastic)' }}>{b.sentiment_breakdown?.sarcastic ?? 0}</td>
                      <td style={{ color: 'var(--neutral)' }}>{b.sentiment_breakdown?.neutral ?? 0}</td>
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
