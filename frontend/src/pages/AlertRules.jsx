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
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>Rule Name</label>
              <input 
                type="text" className="input" placeholder="e.g. Logistics Issues" 
                value={name} onChange={e => setName(e.target.value)} required 
                style={{ height: '42px', boxSizing: 'border-box', width: '100%', padding: '0 14px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#1e293b', outline: 'none' }}
                onFocus={e => { e.target.style.borderColor = '#0d9488'; e.target.style.boxShadow = '0 0 0 3px rgba(13, 148, 136, 0.1)'; }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>Keyword <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
              <input 
                type="text" className="input" placeholder="e.g. delivery" 
                value={keyword} onChange={e => setKeyword(e.target.value)}
                style={{ height: '42px', boxSizing: 'border-box', width: '100%', padding: '0 14px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#1e293b', outline: 'none' }}
                onFocus={e => { e.target.style.borderColor = '#0d9488'; e.target.style.boxShadow = '0 0 0 3px rgba(13, 148, 136, 0.1)'; }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>Intent</label>
              <select 
                className="input" value={intent} onChange={e => setIntent(e.target.value)}
                style={{ height: '42px', boxSizing: 'border-box', width: '100%', padding: '0 14px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#1e293b', outline: 'none' }}
                onFocus={e => { e.target.style.borderColor = '#0d9488'; e.target.style.boxShadow = '0 0 0 3px rgba(13, 148, 136, 0.1)'; }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
              >
                <option value="">Any Intent</option>
                <option value="complaint">Complaint</option>
                <option value="inquiry">Inquiry</option>
                <option value="buying_intent">Buying Intent</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>Sentiment</label>
              <select 
                className="input" value={sentiment} onChange={e => setSentiment(e.target.value)}
                style={{ height: '42px', boxSizing: 'border-box', width: '100%', padding: '0 14px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#1e293b', outline: 'none' }}
                onFocus={e => { e.target.style.borderColor = '#0d9488'; e.target.style.boxShadow = '0 0 0 3px rgba(13, 148, 136, 0.1)'; }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
              >
                <option value="">Any Sentiment</option>
                <option value="negative">Negative</option>
                <option value="sarcastic">Sarcastic</option>
                <option value="positive">Positive</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>Route To</label>
              <select 
                className="input" value={channel} onChange={e => setChannel(e.target.value)}
                style={{ height: '42px', boxSizing: 'border-box', width: '100%', padding: '0 14px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#1e293b', outline: 'none' }}
                onFocus={e => { e.target.style.borderColor = '#0d9488'; e.target.style.boxShadow = '0 0 0 3px rgba(13, 148, 136, 0.1)'; }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
              >
                <option value="Telegram">Telegram</option>
                <option value="Slack">Slack</option>
                <option value="Email">Email</option>
              </select>
            </div>
            <button 
              type="submit" 
              style={{ 
                height: '42px', boxSizing: 'border-box', padding: '0 16px', background: 'linear-gradient(to right, #0d9488, #059669)', 
                color: '#fff', fontWeight: 500, borderRadius: '12px', border: 'none', 
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.3s'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(20, 184, 166, 0.3), 0 4px 6px -2px rgba(20, 184, 166, 0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'; }}
            >
              <Plus size={16} /> Add Rule
            </button>
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
            <div className="table-responsive">
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: '700px' }}>
              {/* Header row */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 2fr 140px 44px',
                padding: '16px 20px', borderBottom: '1px solid #f1f5f9',
                gap: 12, alignItems: 'center'
              }}>
                {['Rule Name', 'Conditions', 'Route To', ''].map((h) => (
                  <div key={h} style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
                ))}
              </div>
              {rules.map((r, idx) => (
                <div
                  key={r.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 2fr 140px 44px',
                    padding: '16px 20px', gap: 12, alignItems: 'center',
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
                        background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0',
                        padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 500,
                      }}>Keyword: {r.keyword}</span>
                    )}
                    {r.intent && (
                      <span style={{
                        background: '#faf5ff', color: '#7e22ce', border: '1px solid #f3e8ff',
                        padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 500,
                      }}>Intent: {r.intent}</span>
                    )}
                    {r.sentiment && (
                      <span style={{
                        background: '#fef2f2', color: '#b91c1c', border: '1px solid #fee2e2',
                        padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 500,
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
                    fontSize: '0.85rem', fontWeight: 600, color: channelColor(r.channel),
                    background: `${channelColor(r.channel)}0D`, // Very soft background
                    border: `1px solid ${channelColor(r.channel)}1A`, // Very soft border
                    padding: '4px 12px', borderRadius: '8px', width: 'fit-content',
                  }}>
                    <ChannelIcon c={r.channel} /> {r.channel}
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(r.id)}
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      border: 'none', // Removed harsh border
                      background: 'transparent', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#94a3b8', transition: 'all 0.15s ease', // Soft slate color initially
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
                    title="Delete rule"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>
      </div>
    </>
  );
}
