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
                className={`btn btn-sm ${filter === s ? 'filter-active' : 'filter-inactive'}`}
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
                      <tr key={t.id}>
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
                            style={{
                              fontSize: '0.75rem', fontWeight: 700,
                              background: statusMeta.bg,
                              color: statusMeta.color,
                              border: `1px solid ${statusMeta.border}`,
                              padding: '5px 10px', borderRadius: 8,
                              outline: 'none', cursor: 'pointer',
                            }}
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
                            <div style={{ marginTop: 8, padding: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 8, position: 'relative' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Draft Reply</div>
                                <button 
                                  onClick={() => handleDraftReply(t.id)}
                                  disabled={draftingId === t.id}
                                  title="Regenerate reply"
                                  style={{
                                    background: 'none', border: 'none', cursor: draftingId === t.id ? 'not-allowed' : 'pointer', 
                                    color: draftingId === t.id ? '#94a3b8' : '#6366f1', padding: 2, display: 'flex', alignItems: 'center'
                                  }}
                                >
                                  <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>⟳</span>
                                </button>
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{draftingId === t.id ? 'Regenerating...' : t.draft_reply}</div>
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
