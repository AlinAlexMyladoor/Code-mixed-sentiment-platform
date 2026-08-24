import { useEffect, useState } from 'react';
import { Ticket, CheckCircle, Clock, Circle, Filter } from 'lucide-react';
import TopBar from '../components/Layout/TopBar';
import { EmptyState, SentimentBadge, Skeleton } from '../components/UI';
import { api } from '../api/client';

const STATUS_OPTIONS = [
  { value: 'Open',        icon: Circle,       color: '#ef4444' },
  { value: 'In Progress', icon: Clock,        color: '#f59e0b' },
  { value: 'Resolved',    icon: CheckCircle,  color: '#22c55e' },
];

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

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
    try {
      await api.updateTicketStatus(ticketId, newStatus);
      setTickets(tickets.map(t => t.ticket_id === ticketId ? { ...t, ticket_status: newStatus } : t));
    } catch (err) {
      alert("Failed to update status: " + err.message);
    }
  };

  const filteredTickets = filter === 'All' ? tickets : tickets.filter(t => t.ticket_status === filter);

  return (
    <>
      <TopBar title="Support Tickets" subtitle={`${tickets.length} total escalated tickets`} />
      <div className="page-body">
        
        {/* Filters */}
        <div className="panel" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Filter size={12} /> STATUS FILTER
            </span>
            {['All', 'Open', 'In Progress', 'Resolved'].map(s => (
              <button
                key={s}
                className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline'}`}
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
                <div key={i} style={{ marginBottom: 12 }}><Skeleton height={48} /></div>
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
                    <th>Ticket ID</th>
                    <th>Status</th>
                    <th>Sentiment</th>
                    <th>Comment Details</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((t) => {
                    const statusMeta = STATUS_OPTIONS.find(opt => opt.value === t.ticket_status) || STATUS_OPTIONS[0];
                    return (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 700, color: '#8b5cf6' }}>
                          🎟️ {t.ticket_id}
                        </td>
                        <td>
                          <select
                            value={t.ticket_status}
                            onChange={(e) => handleStatusChange(t.ticket_id, e.target.value)}
                            style={{
                              fontSize: '0.75rem', fontWeight: 600,
                              background: 'var(--bg-glass)', color: statusMeta.color,
                              border: `1px solid ${statusMeta.color}40`,
                              padding: '4px 8px', borderRadius: 6,
                              outline: 'none', cursor: 'pointer'
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
