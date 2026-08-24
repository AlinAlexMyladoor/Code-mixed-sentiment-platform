import { useCallback, useEffect, useState } from 'react';
import { Download, Filter, MessageSquare, Search, Cpu, Zap } from 'lucide-react';
import TopBar from '../components/Layout/TopBar';
import { EmptyState, SentimentBadge, Skeleton } from '../components/UI';
import { api } from '../api/client';
import { useDemo } from '../context/DemoContext';

const SENTIMENTS = ['all', 'positive', 'negative', 'neutral', 'sarcastic'];
const MODELS     = ['all', 'llama_lora', 'heuristic_mvp', 'roberta_cpu'];

const MODEL_META = {
  llama_lora:    { label: 'Llama LoRA', color: '#6366f1', bg: 'rgba(99,102,241,0.12)', icon: '🧠' },
  roberta_cpu:   { label: 'RoBERTa',   color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   icon: '⚡' },
  heuristic_mvp: { label: 'Heuristic', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: '🔧' },
};

/** Color-coded confidence bar: green ≥80%, yellow 50-80%, red <50% */
function ConfidenceBar({ value }) {
  if (value == null) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  const pct  = Math.round(value * 100);
  const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 80 }}>
      <div style={{
        flex: 1, height: 5, borderRadius: 3,
        background: 'var(--border)', overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: 3,
          background: color, transition: 'width 0.4s ease',
        }} />
      </div>
      <span style={{ fontSize: '0.72rem', fontWeight: 700, color, minWidth: 30 }}>
        {pct}%
      </span>
    </div>
  );
}

/** Model badge with color coding */
function ModelBadge({ source }) {
  const meta = MODEL_META[source] || MODEL_META.heuristic_mvp;
  return (
    <span style={{
      fontSize: '0.62rem', fontWeight: 600,
      background: meta.bg, color: meta.color,
      border: `1px solid ${meta.color}33`,
      padding: '2px 7px', borderRadius: 4,
      whiteSpace: 'nowrap',
    }}>
      {meta.icon} {meta.label}
    </span>
  );
}

function formatIST(ts) {
  if (!ts) return '—';
  return new Date(ts.endsWith('Z') ? ts : ts + 'Z').toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export default function CommentExplorer() {
  const { isDemoMode, demoComments } = useDemo();
  const [comments, setComments]     = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [sentiment, setSentiment]   = useState('all');
  const [modelFilter, setModelFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');

  const perPage = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (isDemoMode) {
        let filtered = demoComments;
        if (sentiment !== 'all') filtered = filtered.filter(c => c.sentiment === sentiment);
        if (modelFilter !== 'all') filtered = filtered.filter(c => (c.inference_source || 'heuristic_mvp') === modelFilter);
        if (search) filtered = filtered.filter(c => c.original_text.toLowerCase().includes(search.toLowerCase()));
        setComments(filtered);
        setTotal(filtered.length);
      } else {
        const data = await api.comments({
          page, per_page: perPage,
          sentiment:        sentiment === 'all'     ? null : sentiment,
          inference_source: modelFilter === 'all'   ? null : modelFilter,
          search:           search || null,
        });
        setComments(data.data || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, sentiment, modelFilter, search, isDemoMode, demoComments]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <>
      <TopBar title="Comment Explorer" subtitle={`${total.toLocaleString()} total comments`} />
      <div className="page-body">

        {/* ── Filters ──────────────────────────────────────────────── */}
        <div className="panel" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
            {/* Search */}
            <form onSubmit={handleSearch} style={{ flex: 1, minWidth: 240 }}>
              <div className="input-group">
                <span className="input-group-icon"><Search size={14} /></span>
                <input
                  className="input"
                  placeholder="Search comment text…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
            </form>

            {/* Export */}
            <button
              className="btn btn-outline btn-sm"
              onClick={() => api.exportComments({ sentiment: sentiment === 'all' ? null : sentiment })}
            >
              <Download size={13} /> Export CSV
            </button>
          </div>

          {/* Sentiment filter row */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Filter size={12} /> SENTIMENT
            </span>
            {SENTIMENTS.map((s) => (
              <button
                key={s}
                className={`btn btn-sm ${sentiment === s ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => { setSentiment(s); setPage(1); }}
                style={{ textTransform: 'capitalize' }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Model filter row */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Cpu size={12} /> MODEL
            </span>
            {MODELS.map((m) => {
              const meta = MODEL_META[m];
              const active = modelFilter === m;
              return (
                <button
                  key={m}
                  onClick={() => { setModelFilter(m); setPage(1); }}
                  style={{
                    fontSize: '0.7rem', fontWeight: 600,
                    padding: '3px 10px', borderRadius: 4, cursor: 'pointer',
                    border: `1px solid ${active && meta ? meta.color : 'var(--border)'}`,
                    background: active && meta ? meta.bg : 'transparent',
                    color: active && meta ? meta.color : 'var(--text-muted)',
                    transition: 'all 0.15s',
                  }}
                >
                  {m === 'all' ? 'All Models' : `${MODEL_META[m]?.icon} ${MODEL_META[m]?.label}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Table ──────────────────────────────────────────────────── */}
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 24 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ marginBottom: 12 }}><Skeleton height={48} /></div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No comments found"
              desc="Try adjusting your filters or send some test webhooks."
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sentiment</th>
                    <th>Comment</th>
                    <th>EN Ratio</th>
                    <th>Switches</th>
                    <th>Confidence</th>
                    <th>Model</th>
                    <th>Page ID</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {comments.map((c) => (
                    <tr key={c.id}>
                      <td><SentimentBadge sentiment={c.sentiment} /></td>
                      <td className="td-text" style={{ maxWidth: 320 }}>
                        <p title={c.original_text}>{c.original_text}</p>
                        {c.regional_tokens_found?.length > 0 && (
                          <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {c.regional_tokens_found.slice(0, 4).map((t) => (
                              <span key={t} style={{
                                fontSize: '0.62rem', background: 'rgba(99,102,241,0.12)',
                                color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)',
                                padding: '1px 5px', borderRadius: 4,
                              }}>{t}</span>
                            ))}
                          </div>
                        )}
                        {c.aspect_sentiments && Object.keys(c.aspect_sentiments).length > 0 && (
                          <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {Object.entries(c.aspect_sentiments).map(([aspect, sent]) => {
                              const color = sent === 'positive' ? '#22c55e' : sent === 'negative' ? '#ef4444' : '#64748b';
                              const dot = sent === 'positive' ? '🟢' : sent === 'negative' ? '🔴' : '⚪';
                              return (
                                <span key={aspect} style={{
                                  fontSize: '0.62rem', background: `${color}15`,
                                  color, border: `1px solid ${color}33`,
                                  padding: '2px 6px', borderRadius: 12, fontWeight: 600,
                                }}>{dot} {aspect}</span>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td>{c.english_ratio != null ? `${(c.english_ratio * 100).toFixed(0)}%` : '—'}</td>
                      <td>{c.language_switch_count ?? '—'}</td>
                      <td><ConfidenceBar value={c.confidence} /></td>
                      <td><ModelBadge source={c.inference_source} /></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {c.page_id ? c.page_id.slice(0, 10) + '…' : '—'}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                        {formatIST(c.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 20px', borderTop: '1px solid var(--border)',
              fontSize: '0.78rem', color: 'var(--text-muted)',
            }}>
              <span>Page {page} of {totalPages} · {total.toLocaleString()} total</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >← Prev</button>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
