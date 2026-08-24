import { useEffect, useState } from 'react';
import { Bell, Trash2, Plus, Slack, Send, Mail } from 'lucide-react';
import TopBar from '../components/Layout/TopBar';
import { EmptyState, Skeleton } from '../components/UI';
import { api } from '../api/client';

export default function AlertRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [name, setName] = useState('');
  const [keyword, setKeyword] = useState('');
  const [intent, setIntent] = useState('');
  const [sentiment, setSentiment] = useState('');
  const [channel, setChannel] = useState('Telegram');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getAlertRules();
      setRules(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name) return alert("Rule name is required");
    try {
      const newRule = await api.createAlertRule({
        name,
        keyword: keyword || null,
        intent: intent || null,
        sentiment: sentiment || null,
        channel
      });
      setRules([newRule, ...rules]);
      setName(''); setKeyword(''); setIntent(''); setSentiment('');
    } catch (err) {
      alert("Failed to create rule: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteAlertRule(id);
      setRules(rules.filter(r => r.id !== id));
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  };

  const ChannelIcon = ({ c }) => {
    if (c === 'Slack') return <Slack size={14} />;
    if (c === 'Email') return <Mail size={14} />;
    return <Send size={14} />;
  };

  return (
    <>
      <TopBar title="Alert Routing Rules" subtitle="Custom triggers for multi-channel alerts" />
      <div className="page-body">
        
        {/* Create Rule Form */}
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-header"><span className="panel-title">Create New Rule</span></div>
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Rule Name</label>
              <input 
                type="text" className="input" placeholder="e.g. Logistics Issues" 
                value={name} onChange={e => setName(e.target.value)} required 
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', background: 'var(--bg-glass)', color: 'var(--text-primary)' }}
              />
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Keyword (Optional)</label>
              <input 
                type="text" className="input" placeholder="e.g. delivery" 
                value={keyword} onChange={e => setKeyword(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', background: 'var(--bg-glass)', color: 'var(--text-primary)' }}
              />
            </div>
            <div style={{ flex: '1 1 120px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Intent</label>
              <select 
                className="input" value={intent} onChange={e => setIntent(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', background: 'var(--bg-glass)', color: 'var(--text-primary)' }}
              >
                <option value="">Any Intent</option>
                <option value="complaint">Complaint</option>
                <option value="inquiry">Inquiry</option>
                <option value="buying_intent">Buying Intent</option>
              </select>
            </div>
            <div style={{ flex: '1 1 120px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Sentiment</label>
              <select 
                className="input" value={sentiment} onChange={e => setSentiment(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', background: 'var(--bg-glass)', color: 'var(--text-primary)' }}
              >
                <option value="">Any Sentiment</option>
                <option value="negative">Negative</option>
                <option value="sarcastic">Sarcastic</option>
                <option value="positive">Positive</option>
              </select>
            </div>
            <div style={{ flex: '1 1 120px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Route To</label>
              <select 
                className="input" value={channel} onChange={e => setChannel(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', background: 'var(--bg-glass)', color: 'var(--text-primary)' }}
              >
                <option value="Telegram">Telegram</option>
                <option value="Slack">Slack</option>
                <option value="Email">Email</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '9px 16px' }}><Plus size={16} /> Add</button>
          </form>
        </div>

        {/* Rules Table */}
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 24 }}><Skeleton height={48} /><Skeleton height={48} style={{ marginTop: 12 }}/></div>
          ) : rules.length === 0 ? (
            <EmptyState icon={Bell} title="No Alert Rules" desc="Create custom triggers to route comments to Slack or Telegram." />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rule Name</th>
                    <th>Conditions</th>
                    <th>Action</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {r.keyword && <span style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-mid)', padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem' }}>Keyword: {r.keyword}</span>}
                          {r.intent && <span style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem' }}>Intent: {r.intent}</span>}
                          {r.sentiment && <span style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem' }}>Sentiment: {r.sentiment}</span>}
                          {!r.keyword && !r.intent && !r.sentiment && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>All Comments</span>}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 600 }}>
                          <ChannelIcon c={r.channel} /> {r.channel}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(r.id)} style={{ color: 'var(--negative)' }}>
                          <Trash2 size={14} />
                        </button>
                      </td>
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
