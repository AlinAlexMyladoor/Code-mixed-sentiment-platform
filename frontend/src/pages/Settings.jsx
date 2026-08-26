import { useState, useEffect } from 'react';
import { Bell, CheckCircle, Copy, ExternalLink, FileText, Shield, Zap, Lock, Users, Activity, RefreshCw } from 'lucide-react';
import TopBar from '../components/Layout/TopBar';
import { API_BASE, api } from '../api/client';
import { useAuth } from '../context/RBACContext';

export default function Settings() {
  const [copied, setCopied] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const { role } = useAuth();

  // Queue health state (auto-refreshes every 30s)
  const [queueHealth, setQueueHealth] = useState(null);
  useEffect(() => {
    const fetch = () => api.queueHealth().then(setQueueHealth).catch(() => {});
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, []);

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(`${API_BASE}/webhook`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const roleLabel = { admin: 'Administrator', manager: 'Manager', agent: 'Agent', demo: 'Demo Mode' }[role] || 'Demo Mode';

  return (
    <>
      <TopBar title="Settings" />
      <div className="page-body">

        {/* Webhook */}
        <div className="panel" style={{ marginBottom: 18 }}>
          <div className="panel-header">
            <span className="panel-title"><Shield size={16} strokeWidth={1.5} /> Webhook Callback URL</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="input-group" style={{ flex: 1 }}>
              <span className="input-group-icon"><Shield size={14} strokeWidth={1.5} /></span>
              <input className="input" readOnly value={`${API_BASE}/webhook`} />
            </div>
            <button className="btn btn-outline btn-sm" onClick={copyWebhookUrl}>
              {copied ? <CheckCircle size={13} color="var(--positive)" strokeWidth={1.5} /> : <Copy size={13} strokeWidth={1.5} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Telegram Alerting */}
        <div className="panel" style={{ marginBottom: 18 }}>
          <div className="panel-header">
            <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Bell size={16} color="#0284c7" strokeWidth={1.5} /> Telegram Alerting</span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: alertsEnabled ? 'rgba(13,148,136,0.05)' : 'var(--bg-hover)',
            border: `1px solid ${alertsEnabled ? 'rgba(13,148,136,0.18)' : 'var(--border-mid)'}`,
            borderRadius: 12, padding: '14px 18px',
            transition: 'all 0.25s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'linear-gradient(135deg, #229ed9, #0b84c1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, boxShadow: '0 4px 10px rgba(34,158,217,0.3)',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>Crisis Alerts</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>High-confidence negative + sarcastic at 80%+ confidence</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: alertsEnabled ? 'var(--positive-bg)' : 'var(--neutral-bg)',
                color: alertsEnabled ? 'var(--positive)' : 'var(--neutral)',
                border: `1px solid ${alertsEnabled ? 'var(--positive-border)' : 'var(--neutral-border)'}`,
                borderRadius: 20, padding: '4px 12px', fontSize: '0.7rem', fontWeight: 700,
              }}>
                <CheckCircle size={12} strokeWidth={1.5} />
                {alertsEnabled ? 'Connected' : 'Disabled'}
              </div>
              <button
                onClick={() => setAlertsEnabled(v => !v)}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none',
                  background: alertsEnabled ? 'var(--accent-1)' : 'var(--border-strong)',
                  cursor: 'pointer', position: 'relative', transition: 'background 0.25s ease',
                  flexShrink: 0,
                }}
                aria-label="Toggle Telegram Alerts"
              >
                <span style={{
                  position: 'absolute', top: 3,
                  left: alertsEnabled ? 23 : 3,
                  width: 18, height: 18, borderRadius: '50%',
                  background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                  display: 'block',
                }} />
              </button>
            </div>
          </div>
        </div>

        {/* Privacy & Compliance — Always-on PII Redaction Status */}
        <div className="panel" style={{ marginBottom: 18 }}>
          <div className="panel-header">
            <span className="panel-title"><Lock size={16} strokeWidth={1.5} color="#4f46e5" /> Privacy & Compliance</span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 18px', borderRadius: 12,
            background: 'rgba(79,70,229,0.04)',
            border: '1px solid rgba(79,70,229,0.12)',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'rgba(79,70,229,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Shield size={18} color="#4f46e5" strokeWidth={1.5} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.88rem' }}>PII Redaction Engine</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Phone numbers, emails, order IDs, UPI IDs, and government IDs are automatically masked before storage and display.
              </div>
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'var(--positive-bg)', color: 'var(--positive)',
              border: '1px solid var(--positive-border)',
              borderRadius: 20, padding: '4px 12px',
              fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.05em',
            }}>
              <CheckCircle size={11} strokeWidth={1.5} /> Always Active
            </div>
          </div>
        </div>

        {/* Team & Roles */}
        <div className="panel" style={{ marginBottom: 18 }}>
          <div className="panel-header">
            <span className="panel-title"><Users size={16} strokeWidth={1.5} color="#0d9488" /> Team & Roles</span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 18px', borderRadius: 12,
            background: 'rgba(13,148,136,0.04)',
            border: '1px solid rgba(13,148,136,0.12)',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                Your Role
              </div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                {roleLabel}
              </div>
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: role === 'admin' ? 'rgba(79,70,229,0.08)' : role === 'manager' ? 'rgba(13,148,136,0.08)' : 'rgba(100,116,139,0.08)',
              color: role === 'admin' ? '#4f46e5' : role === 'manager' ? '#0d9488' : '#64748b',
              border: `1px solid ${role === 'admin' ? 'rgba(79,70,229,0.18)' : role === 'manager' ? 'rgba(13,148,136,0.18)' : 'rgba(100,116,139,0.18)'}`,
              borderRadius: 20, padding: '4px 14px',
              fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {role === 'demo' ? 'Demo' : role}
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-mid)' }}>
                  <th style={{ textAlign: 'left', padding: '6px 0', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem' }}>Role</th>
                  <th style={{ textAlign: 'left', padding: '6px 0', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem' }}>Access</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Admin', 'Full platform access, settings, team management'],
                  ['Manager', 'Dashboard, Analytics, AI Insights, Alert Rules, Vocabulary'],
                  ['Agent', 'Tickets, Comment Explorer, Draft AI Replies'],
                ].map(([r, access]) => (
                  <tr key={r} style={{ borderBottom: '1px solid var(--border-mid)' }}>
                    <td style={{ padding: '7px 0', fontWeight: 600, color: 'var(--text-primary)' }}>{r}</td>
                    <td style={{ padding: '7px 0', color: 'var(--text-muted)' }}>{access}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Health — Simplified */}
        <div className="panel" style={{ marginBottom: 18 }}>
          <div className="panel-header">
            <span className="panel-title"><Activity size={16} strokeWidth={1.5} color="#0891b2" /> System Health</span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 18px', borderRadius: 12,
            background: 'rgba(16,185,129,0.04)',
            border: '1px solid rgba(16,185,129,0.12)',
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: 'var(--positive)', boxShadow: '0 0 8px rgba(16,185,129,0.6)'
            }} />
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
              System Status: 100% Operational (Webhooks listening)
            </div>
          </div>
        </div>

        {/* Platform Info */}
        <div className="panel" style={{ marginBottom: 18 }}>
          <div className="panel-header">
            <span className="panel-title"><Zap size={16} strokeWidth={1.5} /> Platform</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['Version',    '1.0.0'],
              ['AI Engine',  'Heuristic · RoBERTa · Llama 3 LoRA'],
              ['Languages',  'Tamil, Malayalam, Hindi, Bengali (Romanized code-mixed)'],
              ['Real-time',  'Instant Live-Sync'],
            ].map(([label, value]) => (
              <div key={label} style={{
                display: 'flex', gap: 16, padding: '10px 14px',
                background: 'var(--bg-hover)', borderRadius: 10,
                border: '1px solid var(--border-mid)', flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', minWidth: 130, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', flex: 1, fontWeight: 500 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Legal */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title"><FileText size={16} strokeWidth={1.5} /> Legal</span>
          </div>
          <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', margin: '0 0 14px', lineHeight: 1.7 }}>
            SwaraSense processes social media comment data solely for sentiment analysis on behalf of authorised page administrators. No data is sold or shared with third parties.
          </p>
          <a href="/privacy" target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
            <ExternalLink size={13} strokeWidth={1.5} /> Privacy Policy
          </a>
        </div>

      </div>
    </>
  );
}
