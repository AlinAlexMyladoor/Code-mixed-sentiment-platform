import { useEffect, useState } from 'react';
import { Bell, Trash2, Plus, Slack, Send, Mail } from 'lucide-react';
import TopBar from '../components/Layout/TopBar';
import { Skeleton } from '../components/UI';
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
      setRules([]);
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

  const channelColor = (c) => {
    if (c === 'Slack') return '#4A154B';
    if (c === 'Email') return '#2563eb';
    return '#229ed9';
  };

  return (
    <>
      <TopBar title="Alert Routing Rules" />
      <div className="page-body">
        
        {/* Create Rule Form */}
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-header"><span className="panel-title">Create New Rule</span></div>
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Rule Name</label>
              <input 
                type="text" className="input" placeholder="e.g. Logistics Issues" 
                value={name} onChange={e => setName(e.target.value)} required 
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', background: 'var(--bg-glass)', color: 'var(--text-primary)' }}
              />
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Keyword <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
              <input 
                type="text" className="input" placeholder="e.g. delivery" 
                value={keyword} onChange={e => setKeyword(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', background: 'var(--bg-glass)', color: 'var(--text-primary)' }}
              />
            </div>
            <div style={{ flex: '1 1 120px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Intent</label>
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
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Sentiment</label>
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
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Route To</label>
              <select 
                className="input" value={channel} onChange={e => setChannel(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', background: 'var(--bg-glass)', color: 'var(--text-primary)' }}
              >
                <option value="Telegram">Telegram</option>
                <option value="Slack">Slack</option>
                <option value="Email">Email</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '9px 16px' }}><Plus size={16} /> Add Rule</button>
          </form>
        </div>

        {/* Rules List */}
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Skeleton height={64} />
              <Skeleton height={64} />
              <Skeleton height={64} />
            </div>
          ) : rules.length === 0 ? (
            /* Beautiful Empty State */
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '60px 32px', gap: 16,
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: 18,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.08))',
                border: '1px solid rgba(99,102,241,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Bell size={28} strokeWidth={1.5} color="#a5b4fc" />
              </div>
              <div style={{ textAlign: 'center', maxWidth: 340 }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem', marginBottom: 6 }}>
                  No alert rules configured yet.
                </div>
                <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.6 }}>
                  Create custom triggers above to route high-priority comments directly to Telegram, Slack, or Email.
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Header row */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 2fr 140px 44px',
                padding: '10px 20px', borderBottom: '1px solid var(--border-mid)',
                gap: 12,
              }}>
                {['Rule Name', 'Conditions', 'Route To', ''].map((h) => (
                  <div key={h} style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
                ))}
              </div>
              {rules.map((r, idx) => (
                <div
                  key={r.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 2fr 140px 44px',
                    padding: '14px 20px', gap: 12, alignItems: 'center',
                    borderBottom: idx < rules.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                    background: '#fff',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  {/* Name */}
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.88rem' }}>{r.name}</div>

                  {/* Conditions */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {r.keyword && (
                      <span style={{
                        background: '#f1f5f9', color: '#475569',
                        border: '1px solid #e2e8f0',
                        padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600,
                      }}>Keyword: {r.keyword}</span>
                    )}
                    {r.intent && (
                      <span style={{
                        background: 'rgba(99,102,241,0.08)', color: '#6366f1',
                        border: '1px solid rgba(99,102,241,0.2)',
                        padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600,
                      }}>Intent: {r.intent}</span>
                    )}
                    {r.sentiment && (
                      <span style={{
                        background: 'rgba(244,63,94,0.08)', color: '#e11d48',
                        border: '1px solid rgba(244,63,94,0.2)',
                        padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600,
                        textTransform: 'capitalize',
                      }}>Sentiment: {r.sentiment}</span>
                    )}
                    {!r.keyword && !r.intent && !r.sentiment && (
                      <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>All comments</span>
                    )}
                  </div>

                  {/* Channel */}
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: '0.8rem', fontWeight: 700, color: channelColor(r.channel),
                    background: `${channelColor(r.channel)}10`,
                    border: `1px solid ${channelColor(r.channel)}25`,
                    padding: '4px 10px', borderRadius: 8, width: 'fit-content',
                  }}>
                    <ChannelIcon c={r.channel} /> {r.channel}
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(r.id)}
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      border: '1px solid #fee2e2',
                      background: 'transparent', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#f87171', transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fca5a5'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#fee2e2'; }}
                    title="Delete rule"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
