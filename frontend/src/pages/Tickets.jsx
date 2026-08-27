import { useEffect, useState } from 'react';
import { Ticket, CheckCircle, Clock, Minus, Filter, PenLine, Sparkles } from 'lucide-react';
import TopBar from '../components/Layout/TopBar';
import { EmptyState, SentimentBadge, Skeleton } from '../components/UI';
import { api } from '../api/client';

const STATUS_OPTIONS = [
  { value: 'Open',        icon: Minus,       color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)' },
  { value: 'In Progress', icon: Clock,        color: '#d97706', bg: 'rgba(217,119,6,0.08)',   border: 'rgba(217,119,6,0.2)' },
  { value: 'Resolved',    icon: CheckCircle,  color: '#059669', bg: 'rgba(5,150,105,0.08)',   border: 'rgba(5,150,105,0.2)' },
];

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [draftingId, setDraftingId] = useState(null);
  const [draftError, setDraftError] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getTickets();
      setTickets(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleStatusChange = async (ticketId, newStatus) => {
    // Optimistic UI update
    const previousTickets = [...tickets];
    setTickets(tickets.map(t => t.ticket_id === ticketId ? { ...t, ticket_status: newStatus } : t));
    
    try {
      await api.updateTicketStatus(ticketId, newStatus);
    } catch (err) {
      // Revert if API fails
      setTickets(previousTickets);
      alert("Failed to update status: " + err.message);
    }
  };

  const handleDraftReply = async (commentId) => {
    setDraftingId(commentId);
    setDraftError(prev => ({ ...prev, [commentId]: null }));
    try {
      const res = await api.draftReply(commentId);
      if (res.status === 'success') {
        setTickets(tickets.map(t => t.id === commentId ? { ...t, draft_reply: res.draft_reply } : t));
      }
    } catch (err) {
      setDraftError(prev => ({ ...prev, [commentId]: "Network error: Unable to reach AI engine." }));
    } finally {
      setDraftingId(null);
    }
  };

  const handleClearDraft = async (commentId) => {
    const previousTickets = [...tickets];
    setTickets(tickets.map(t => t.id === commentId ? { ...t, draft_reply: null } : t));
    try {
      await api.clearDraftReply(commentId);
    } catch (err) {
      setTickets(previousTickets);
      alert("Failed to clear draft: " + err.message);
    }
  };

  const filteredTickets = filter === 'All' ? tickets : tickets.filter(t => t.ticket_status === filter);

  return (
    <>
      <TopBar title="Support Tickets" />
      <div className="page-body">
        
        {/* Filters */}
        <div className="panel" style={{ marginBottom: 20, padding: '12px 20px' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, marginRight: 4, display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Filter size={12} /> Status
            </span>
            {['All', 'Open', 'In Progress', 'Resolved'].map(s => (
              <button
                key={s}
                className={`btn btn-sm ${filter === s ? 'bg-teal-50 text-teal-700 border border-teal-300 font-semibold shadow-sm' : 'filter-inactive'}`}
                style={{ borderRadius: '9999px', padding: '4px 12px' }}
                onClick={() => setFilter(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 24 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ marginBottom: 12 }}><Skeleton height={56} /></div>
              ))}
            </div>
          ) : filteredTickets.length === 0 ? (
            <EmptyState
              icon={Ticket}
              title="No tickets found"
              desc={filter === 'All' ? "You haven't escalated any comments into support tickets yet." : `No tickets match the '${filter}' filter.`}
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', color: '#64748b', fontWeight: 600 }}>Ticket ID</th>
                    <th style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', color: '#64748b', fontWeight: 600 }}>Status</th>
                    <th style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', color: '#64748b', fontWeight: 600 }}>Sentiment</th>
                    <th style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', color: '#64748b', fontWeight: 600 }}>Comment Details</th>
                    <th style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', color: '#64748b', fontWeight: 600 }}>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((t) => {
                    const statusMeta = STATUS_OPTIONS.find(opt => opt.value === t.ticket_status) || STATUS_OPTIONS[0];
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/50 transition-colors duration-150">
                        {/* Ticket ID — deep slate blue, no emoji */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Ticket size={13} color="#94a3b8" strokeWidth={1.5} />
                            <span 
                              style={{ fontWeight: 600, color: '#0d9488', fontSize: '0.82rem', fontFamily: 'monospace', cursor: 'pointer', transition: 'color 0.2s' }}
                              onMouseEnter={e => e.currentTarget.style.color = '#0f766e'}
                              onMouseLeave={e => e.currentTarget.style.color = '#0d9488'}
                            >
                              {t.ticket_id}
                            </span>
                          </div>
                        </td>

                        {/* Status — semantic colors */}
                        <td>
                          <select
                            value={t.ticket_status}
                            onChange={(e) => handleStatusChange(t.ticket_id, e.target.value)}
                            className="bg-white border border-gray-300 text-slate-700 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            {STATUS_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.value}</option>
                            ))}
                          </select>
                        </td>

                        <td><SentimentBadge sentiment={t.sentiment} /></td>

                        <td className="td-text" style={{ maxWidth: 320 }}>
                          <p title={t.original_text}>{t.original_text}</p>
                          {t.draft_reply ? (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-3 shadow-sm relative">
                              <div className="text-teal-700 font-bold text-xs tracking-wide uppercase flex justify-between items-center mb-2">
                                <div>AI Draft Reply</div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <button 
                                    onClick={() => handleDraftReply(t.id)}
                                    disabled={draftingId === t.id}
                                    title="Regenerate reply"
                                    className="text-slate-400 hover:text-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-transparent border-none p-0 cursor-pointer"
                                  >
                                    <span style={{ fontSize: '1rem', lineHeight: 1 }}>⟳</span>
                                  </button>
                                  <button 
                                    onClick={() => handleClearDraft(t.id)}
                                    title="Hide reply"
                                    className="text-slate-400 hover:text-teal-600 transition-colors bg-transparent border-none p-0 cursor-pointer flex items-center"
                                  >
                                    <span style={{ fontSize: '1.4rem', lineHeight: 0.8 }}>×</span>
                                  </button>
                                </div>
                              </div>
                              <div className="text-slate-700 text-sm leading-relaxed">{draftingId === t.id ? 'Regenerating...' : t.draft_reply}</div>
                              {draftError[t.id] && <div style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: 4 }}>{draftError[t.id]}</div>}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                              <button
                                onClick={() => handleDraftReply(t.id)}
                                disabled={draftingId === t.id}
                                style={{
                                  marginTop: 8,
                                  display: 'inline-flex', alignItems: 'center', gap: 6,
                                  fontSize: '0.875rem', fontWeight: 500,
                                  color: draftingId === t.id ? '#94a3b8' : '#047857',
                                  background: draftingId === t.id ? '#f1f5f9' : '#ecfdf5',
                                  border: `1px solid ${draftingId === t.id ? '#e2e8f0' : '#d1fae5'}`,
                                  padding: '6px 12px', borderRadius: '0.5rem',
                                  cursor: draftingId === t.id ? 'not-allowed' : 'pointer',
                                  transition: 'all 0.15s ease',
                                }}
                                onMouseEnter={e => {
                                  if (draftingId !== t.id) {
                                    e.currentTarget.style.background = '#d1fae5';
                                  }
                                }}
                                onMouseLeave={e => {
                                  if (draftingId !== t.id) {
                                    e.currentTarget.style.background = '#ecfdf5';
                                  }
                                }}
                              >
                                <Sparkles size={12} />
                                {draftingId === t.id ? 'Drafting…' : 'Draft AI Reply'}
                              </button>
                              {draftError[t.id] && (
                                <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '6px', fontWeight: 500 }}>
                                  {draftError[t.id]}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                          {new Date(t.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
