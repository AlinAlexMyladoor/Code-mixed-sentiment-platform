import { useCallback, useEffect, useState } from 'react';
import { Download, Filter, MessageSquare, Search, Cpu, CheckCircle, Trash2 } from 'lucide-react';
import TopBar from '../components/Layout/TopBar';
import { EmptyState, SentimentBadge, Skeleton } from '../components/UI';
import { api } from '../api/client';
import { useDemo } from '../context/DemoContext';

const SENTIMENTS = ['all', 'positive', 'negative', 'neutral', 'sarcastic'];
const MODELS     = ['all', 'llama_lora', 'heuristic_mvp', 'roberta_cpu'];

/* Clean model metadata — no emojis, professional muted indigo/slate */
const MODEL_META = {
  llama_lora:    { label: 'Llama LoRA',  color: '#6366f1', bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.2)' },
  roberta_cpu:   { label: 'RoBERTa',    color: '#0891b2', bg: 'rgba(8,145,178,0.08)',    border: 'rgba(8,145,178,0.2)' },
  heuristic_mvp: { label: 'Heuristic',  color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)' },
};

/* Sentiment badge styles — low-saturation, professional */
const SENTIMENT_BADGE_STYLE = {
  positive:  { bg: '#f0fdf4', color: '#15803d', border: '1px solid rgba(22,163,74,0.2)' },
  negative:  { bg: '#fff1f2', color: '#be123c', border: '1px solid rgba(244,63,94,0.2)' },
  sarcastic: { bg: '#fffbeb', color: '#b45309', border: '1px solid rgba(245,158,11,0.2)' },
  neutral:   { bg: '#f8fafc', color: '#475569', border: '1px solid rgba(100,116,139,0.2)' },
};

function ConfidenceBar({ value }) {
  if (value == null) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  const pct  = Math.round(value * 100);
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#f43f5e';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 80 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 3, background: '#f1f5f9', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: color, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: '0.72rem', fontWeight: 700, color, minWidth: 30 }}>{pct}%</span>
    </div>
  );
}

function ModelBadge({ source }) {
  const meta = MODEL_META[source] || MODEL_META.heuristic_mvp;
  return (
    <span style={{
      fontSize: '0.62rem', fontWeight: 600,
      background: meta.bg, color: meta.color,
      border: `1px solid ${meta.border}`,
      padding: '2px 7px', borderRadius: 5,
      whiteSpace: 'nowrap', letterSpacing: '0.02em',
    }}>
      {meta.label}
    </span>
  );
}

function ProfessionalSentimentBadge({ sentiment }) {
  const s = SENTIMENT_BADGE_STYLE[sentiment] || SENTIMENT_BADGE_STYLE.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: s.bg, color: s.color, border: s.border,
      fontSize: '0.68rem', fontWeight: 700,
      padding: '3px 9px', borderRadius: 6,
      textTransform: 'capitalize', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, display: 'inline-block', flexShrink: 0 }} />
      {sentiment}
    </span>
  );
}

const INTENT_META = {
  complaint:     { color: '#be123c', bg: '#fff1f2', border: 'rgba(244,63,94,0.2)',  label: 'Complaint' },
  buying_intent: { color: '#1d4ed8', bg: '#eff6ff', border: 'rgba(59,130,246,0.2)', label: 'Buying Intent' },
  inquiry:       { color: '#b45309', bg: '#fffbeb', border: 'rgba(245,158,11,0.2)', label: 'Inquiry' },
  praise:        { color: '#15803d', bg: '#f0fdf4', border: 'rgba(34,197,94,0.2)',  label: 'Praise' },
  general:       { color: '#64748b', bg: '#f8fafc', border: 'rgba(100,116,139,0.2)',label: 'General' },
};

function IntentBadge({ intent }) {
  if (!intent || intent === 'general') return null;
  const meta = INTENT_META[intent] || INTENT_META.general;
  return (
    <span style={{
      fontSize: '0.60rem', fontWeight: 700,
      background: meta.bg, color: meta.color,
      border: `1px solid ${meta.border}`,
      padding: '1px 6px', borderRadius: 4,
      textTransform: 'uppercase', marginRight: 5,
      display: 'inline-block', marginBottom: 3,
      letterSpacing: '0.04em',
    }}>
      {meta.label}
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

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      await api.deleteComment(id);
      setComments(comments.filter(c => c.id !== id));
      setTotal(t => Math.max(0, t - 1));
    } catch (err) {
      alert("Failed to delete comment: " + err.message);
    }
  };

  const handlePurge = async (days) => {
    try {
      const res = await api.purgeComments(days);
      alert(`Purged ${res.deleted_count || 0} old comments.`);
      load();
    } catch (err) {
      alert("Failed to purge comments: " + err.message);
    }
  };

  const handleCreateTicket = async (commentId) => {
    try {
      const res = await api.createTicket(commentId);
      if (res.status === 'success') {
        setComments(comments.map(c => c.id === commentId ? { ...c, ticket_id: res.ticket_id } : c));
      }
    } catch (err) {
      alert("Failed to create ticket: " + err.message);
    }
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <>
      <TopBar title="Comment Explorer" />
      <div className="page-body">

        {/* ── Filters ──────────────────────────────────────────────── */}
        <div className="panel" style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 12 }}>
              <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
                <Search size={16} color="#9ca3af" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  className="live-search-input"
                  placeholder="Search comment text…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  style={{ height: '40px', boxSizing: 'border-box', margin: 0 }}
                />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'row', gap: 24, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Trash2 size={14} color="#ef4444" />
                  <select
                    value=""
                    onChange={(e) => {
                      const days = parseInt(e.target.value, 10);
                      if (!isNaN(days)) {
                        if (window.confirm("Are you sure you want to permanently delete these comments? This action cannot be undone.")) {
                          handlePurge(days);
                        }
                      }
                      e.target.value = "";
                    }}
                    style={{
                      color: '#ef4444',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      outline: 'none',
                      padding: 0
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#b91c1c'}
                    onMouseLeave={e => e.currentTarget.style.color = '#ef4444'}
                  >
                    <option value="" disabled>Purge Old Data</option>
                    <option value="7">Delete &gt; 1 Week Old</option>
                    <option value="30">Delete &gt; 1 Month Old</option>
                    <option value="90">Delete &gt; 3 Months Old</option>
                  </select>
                </div>
                <button
                  className="btn btn-outline"
                  onClick={() => api.exportComments({ sentiment: sentiment === 'all' ? null : sentiment })}
                  style={{ height: '40px', width: 145, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxSizing: 'border-box', margin: 0, padding: '0 16px' }}
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* Sentiment filter */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, marginRight: 4, display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Filter size={12} /> Sentiment
            </span>
            {SENTIMENTS.map((s) => (
              <button
                key={s}
                className={`btn btn-sm ${sentiment === s ? 'filter-active' : 'filter-inactive'}`}
                onClick={() => { setSentiment(s); setPage(1); }}
                style={{ textTransform: 'capitalize', borderRadius: '9999px', padding: '4px 12px' }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Model filter */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, marginRight: 4, display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Cpu size={12} /> Model
            </span>
            {MODELS.map((m) => {
              const active = modelFilter === m;
              return (
                <button
                  key={m}
                  onClick={() => { setModelFilter(m); setPage(1); }}
                  className={`btn btn-sm ${active ? 'filter-active' : 'filter-inactive'}`}
                  style={{
                    borderRadius: '9999px', padding: '4px 12px',
                  }}
                >
                  {m === 'all' ? 'All Models' : MODEL_META[m]?.label}
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
                <div key={i} style={{ marginBottom: 12 }}><Skeleton height={52} /></div>
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
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    {['Sentiment', 'Comment', 'Confidence', 'Model', 'Page', 'Time', 'Actions'].map(h => (
                      <th key={h} style={{
                        padding: '12px 20px', textAlign: 'left',
                        fontSize: '0.75rem', fontWeight: 600,
                        color: '#64748b', textTransform: 'uppercase',
                        letterSpacing: '0.05em', background: '#f8fafc',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comments.map((c) => (
                    <tr
                      key={c.id}
                      style={{ borderBottom: '1px solid #f1f5f9', background: '#fff', transition: 'background 0.12s ease' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                    >
                      {/* Sentiment */}
                      <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                        <ProfessionalSentimentBadge sentiment={c.sentiment} />
                      </td>

                      {/* Comment text with intent + aspects */}
                      <td style={{ padding: '16px 20px', maxWidth: 360 }}>
                        <div style={{ marginBottom: 6 }}>
                          <IntentBadge intent={c.intent_signal} />
                        </div>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: '#1e293b', lineHeight: 1.6, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }} title={c.original_text}>
                          {c.original_text}
                        </p>
                        {/* Regional tokens */}
                        {c.regional_tokens_found?.length > 0 && (
                          <div style={{ marginTop: 5, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                            {c.regional_tokens_found.slice(0, 4).map((t) => (
                              <span key={t} style={{
                                fontSize: '0.6rem', background: 'rgba(99,102,241,0.07)',
                                color: '#818cf8', border: '1px solid rgba(99,102,241,0.15)',
                                padding: '1px 5px', borderRadius: 4,
                              }}>{t}</span>
                            ))}
                          </div>
                        )}
                        {/* Aspect tags — neutral pills, NO emojis */}
                        {c.aspect_sentiments && Object.keys(c.aspect_sentiments).length > 0 && (
                          <div style={{ marginTop: 5, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {Object.entries(c.aspect_sentiments).map(([aspect]) => (
                              <span key={aspect} style={{
                                fontSize: '0.6rem',
                                background: '#f1f5f9',
                                color: '#64748b',
                                border: '1px solid #e2e8f0',
                                padding: '1px 6px', borderRadius: 4,
                                fontWeight: 500,
                              }}>{aspect}</span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Confidence */}
                      <td style={{ padding: '16px 20px' }}>
                        <ConfidenceBar value={c.confidence} />
                      </td>

                      {/* Model */}
                      <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                        <ModelBadge source={c.inference_source} />
                      </td>

                      {/* Page */}
                      <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '0.75rem' }}>
                        {c.page_id ? c.page_id.slice(0, 10) + '…' : '—'}
                      </td>

                      {/* Time */}
                      <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                        {formatIST(c.created_at)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: 140, gap: 12 }}>
                          <div>
                            {c.ticket_id ? (
                              /* Clean ghost badge — no chunky bg */
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                fontSize: '0.75rem', fontWeight: 600,
                                color: '#059669',
                              }}>
                                <CheckCircle size={14} strokeWidth={2} /> Ticket Created
                              </span>
                            ) : (c.sentiment === 'negative' || c.sentiment === 'sarcastic') ? (
                              <button
                                style={{
                                  fontSize: '0.75rem', fontWeight: 600,
                                  color: '#2563eb', background: 'transparent',
                                  border: '1px solid rgba(37,99,235,0.2)',
                                  padding: '4px 12px', borderRadius: 6,
                                  cursor: 'pointer', transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = 'rgba(37,99,235,0.4)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(37,99,235,0.2)'; }}
                                onClick={() => handleCreateTicket(c.id)}
                              >
                                Create Ticket
                              </button>
                            ) : (
                              <span style={{ color: '#cbd5e1' }}>—</span>
                            )}
                          </div>
                          <button
                            className="action-icon-btn"
                            title="Delete Comment"
                            onClick={() => handleDelete(c.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
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
              padding: '14px 20px', borderTop: '1px solid #f1f5f9',
              fontSize: '0.78rem', color: '#94a3b8',
            }}>
              <span>Page {page} of {totalPages} · {total.toLocaleString()} total</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>← Prev</button>
                <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
