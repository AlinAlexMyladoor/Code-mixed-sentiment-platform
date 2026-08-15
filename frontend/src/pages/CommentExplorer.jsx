import { useCallback, useEffect, useState } from 'react';
import { Download, Filter, MessageSquare, Search } from 'lucide-react';
import TopBar from '../components/Layout/TopBar';
import { EmptyState, SentimentBadge, Skeleton } from '../components/UI';
import { api } from '../api/client';
import { useDemo } from '../context/DemoContext';

const SENTIMENTS = ['all', 'positive', 'negative', 'neutral', 'sarcastic'];

export default function CommentExplorer() {
  const { isDemoMode, demoComments } = useDemo();
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sentiment, setSentiment] = useState('all');
  const [searchInput, setSearchInput] = useState('');

  const perPage = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (isDemoMode) {
        // Filter mock data locally
        let filtered = demoComments;
        if (sentiment !== 'all') filtered = filtered.filter(c => c.sentiment === sentiment);
        if (search) filtered = filtered.filter(c => c.original_text.toLowerCase().includes(search.toLowerCase()));
        setComments(filtered);
        setTotal(filtered.length);
      } else {
        const data = await api.comments({
          page, per_page: perPage,
          sentiment: sentiment === 'all' ? null : sentiment,
          search: search || null,
        });
        setComments(data.data || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, sentiment, search, isDemoMode, demoComments]);

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
        {/* Filters */}
        <div className="panel" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
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

            {/* Sentiment filter */}
            <div style={{ display: 'flex', gap: 6 }}>
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

            {/* Export */}
            <button
              className="btn btn-outline btn-sm"
              onClick={() => api.exportComments({ sentiment: sentiment === 'all' ? null : sentiment })}
            >
              <Download size={13} /> Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
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
                      </td>
                      <td>{c.english_ratio != null ? `${(c.english_ratio * 100).toFixed(0)}%` : '—'}</td>
                      <td>{c.language_switch_count ?? '—'}</td>
                      <td>{c.confidence != null ? `${(c.confidence * 100).toFixed(0)}%` : '—'}</td>
                      <td>
                        <span style={{
                          fontSize: '0.65rem', background: 'var(--bg-glass)',
                          border: '1px solid var(--border)', padding: '2px 6px',
                          borderRadius: 4, color: 'var(--text-muted)',
                        }}>
                          {c.inference_source || 'heuristic_mvp'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {c.page_id ? c.page_id.slice(0, 10) + '…' : '—'}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                        {c.created_at ? new Date(c.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
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
