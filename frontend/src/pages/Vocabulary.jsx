import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Plus, Trash2, Search, Tag, AlertCircle } from 'lucide-react';
import TopBar from '../components/Layout/TopBar';
import { EmptyState, Skeleton } from '../components/UI';
import { api } from '../api/client';

const SENTIMENTS = ['negative', 'positive', 'sarcastic', 'neutral'];

const sentimentStyle = {
  positive:  { bg: 'var(--positive-bg)',  color: 'var(--positive)',  border: 'var(--positive-border)' },
  negative:  { bg: 'var(--negative-bg)',  color: 'var(--negative)',  border: 'var(--negative-border)' },
  sarcastic: { bg: 'var(--sarcastic-bg)', color: 'var(--sarcastic)', border: 'var(--sarcastic-border)' },
  neutral:   { bg: 'var(--neutral-bg)',   color: 'var(--neutral)',   border: 'var(--neutral-border)' },
};

const gridVariants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } },
};

export default function Vocabulary() {
  const [terms, setTerms]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [adding, setAdding]   = useState(false);
  const [form, setForm]       = useState({ term: '', forced_sentiment: '', forced_aspect: '', description: '' });
  const [error, setError]     = useState('');

  const load = () => {
    setLoading(true);
    api.getVocabulary()
      .then(data => setTerms(Array.isArray(data) ? data : []))
      .catch(() => setTerms([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.term.trim()) { setError('Term is required'); return; }
    setError('');
    try {
      await api.createVocabularyTerm({
        term: form.term.trim().toLowerCase(),
        forced_sentiment: form.forced_sentiment || null,
        forced_aspect:    form.forced_aspect || null,
        description:      form.description || null,
      });
      setForm({ term: '', forced_sentiment: '', forced_aspect: '', description: '' });
      setAdding(false);
      load();
    } catch (err) {
      setError(err.message || 'Failed to add term');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteVocabularyTerm(id);
      load();
    } catch { /* silent */ }
  };

  const filtered = terms.filter(t =>
    !search || t.term.includes(search.toLowerCase()) ||
    (t.description || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <TopBar title="Custom Vocabulary" />
      <div className="page-body">

        {/* Header row */}
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
            Teach SwaraSense your brand's unique slang and keywords.
          </p>
        </div>

        {/* Add Term Form */}
        {adding && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAdd}
            className="panel"
            style={{ marginBottom: 18 }}
          >
            <div className="panel-header">
              <span className="panel-title"><Tag size={15} strokeWidth={1.5} /> New Vocabulary Term</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display: 'block' }}>
                  Term *
                </label>
                <input
                  className="input"
                  placeholder='e.g. "thokke" or "romba mosam"'
                  value={form.term}
                  onChange={e => setForm({ ...form, term: e.target.value })}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display: 'block' }}>
                  Force Sentiment
                </label>
                <select
                  className="input"
                  value={form.forced_sentiment}
                  onChange={e => setForm({ ...form, forced_sentiment: e.target.value })}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">Auto-detect</option>
                  {SENTIMENTS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display: 'block' }}>
                  Force Aspect
                </label>
                <input
                  className="input"
                  placeholder='e.g. "delivery", "product"'
                  value={form.forced_aspect}
                  onChange={e => setForm({ ...form, forced_aspect: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display: 'block' }}>
                  Description
                </label>
                <input
                  className="input"
                  placeholder="Optional human-readable note"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, color: 'var(--negative)', fontSize: '0.78rem' }}>
                <AlertCircle size={13} strokeWidth={1.5} /> {error}
              </div>
            )}

            <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
              <button 
                type="submit" 
                style={{ 
                  padding: '8px 16px', background: 'linear-gradient(to right, #0d9488, #059669)', 
                  color: '#fff', fontWeight: 500, borderRadius: '8px', border: 'none', 
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  cursor: 'pointer', transition: 'all 0.3s'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(20, 184, 166, 0.3), 0 4px 6px -2px rgba(20, 184, 166, 0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'; }}
              >Save Term</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
            </div>
          </motion.form>
        )}

        <div style={{ background: '#ffffff', borderRadius: '1rem', boxShadow: '0 2px 10px -3px rgba(6,81,237,0.1)', border: 'none', padding: '32px', marginTop: '16px' }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <div style={{ flex: '1', maxWidth: '448px', position: 'relative' }}>
              <Search size={16} strokeWidth={1.5} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                placeholder="Search terms…" 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                style={{ 
                  width: '100%', boxSizing: 'border-box', padding: '10px 14px 10px 40px', 
                  borderRadius: '10px', border: '1px solid #e2e8f0', background: '#ffffff', 
                  color: '#334155', outline: 'none', transition: 'all 0.2s', fontSize: '0.9rem' 
                }}
                onFocus={e => { e.target.style.borderColor = '#0d9488'; e.target.style.boxShadow = '0 0 0 3px rgba(13, 148, 136, 0.1)'; }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            
            <button 
              onClick={() => setAdding(v => !v)}
              style={{ 
                padding: '10px 20px', background: 'linear-gradient(to right, #0d9488, #059669)', 
                color: '#fff', fontWeight: 500, borderRadius: '12px', border: 'none', 
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.3s'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(20, 184, 166, 0.3), 0 4px 6px -2px rgba(20, 184, 166, 0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'; }}
            >
              <Plus size={16} strokeWidth={1.5} />
              {adding ? 'Cancel' : 'Add Term'}
            </button>
          </div>

          {/* Table / Empty State */}
          {loading ? (
            <Skeleton height={220} />
          ) : filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 20px 40px 20px' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '50%', color: '#94a3b8', marginBottom: '16px' }}>
                <BookOpen size={32} strokeWidth={1.5} />
              </div>
              <h3 style={{ margin: 0, color: '#1e293b', fontWeight: 600, fontSize: '1.125rem' }}>
                {terms.length === 0 ? 'No vocabulary terms yet' : 'No matching terms'}
              </h3>
              <p style={{ marginTop: '8px', color: '#64748b', fontSize: '0.9rem' }}>
                {terms.length === 0
                  ? 'Add brand-specific slang to override AI model sentiment detection.'
                  : 'Try a different search query.'}
              </p>
            </div>
          ) : (
            <div className="panel table-responsive" style={{ padding: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <motion.table className="data-table" variants={gridVariants} initial="hidden" animate="show">
              <thead>
                <tr>
                  <th>Term</th>
                  <th>Forced Sentiment</th>
                  <th>Forced Aspect</th>
                  <th>Description</th>
                  <th style={{ width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <motion.tr key={t.id} variants={itemVariants}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                      {t.term}
                    </td>
                    <td>
                      {t.forced_sentiment ? (
                        <span style={{
                          display: 'inline-flex', padding: '2px 9px', borderRadius: 5,
                          fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase',
                          letterSpacing: '0.07em',
                          background: (sentimentStyle[t.forced_sentiment] || sentimentStyle.neutral).bg,
                          color: (sentimentStyle[t.forced_sentiment] || sentimentStyle.neutral).color,
                          border: `1px solid ${(sentimentStyle[t.forced_sentiment] || sentimentStyle.neutral).border}`,
                        }}>
                          {t.forced_sentiment}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Auto</span>
                      )}
                    </td>
                    <td>
                      {t.forced_aspect ? (
                        <span style={{
                          display: 'inline-flex', padding: '2px 8px', borderRadius: 5,
                          fontSize: '0.65rem', fontWeight: 600,
                          background: '#F1F5F9', color: '#475569',
                          border: '1px solid #E2E8F0',
                        }}>
                          {t.forced_aspect}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {t.description || '—'}
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleDelete(t.id)}
                        title="Remove term"
                        style={{ color: 'var(--text-muted)', padding: 6 }}
                      >
                        <Trash2 size={14} strokeWidth={1.5} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </motion.table>
          </div>
        )}
        </div>

      </div>
    </>
  );
}
