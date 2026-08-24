import { useState } from 'react';
import { Bell, CheckCircle, Copy, ExternalLink, FileText, Shield, Zap } from 'lucide-react';
import TopBar from '../components/Layout/TopBar';
import { API_BASE } from '../api/client';

export default function Settings() {
  const [copied, setCopied] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(true);

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(`${API_BASE}/webhook`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <TopBar title="Settings" subtitle="Platform configuration" />
      <div className="page-body">

        {/* Webhook */}
        <div className="panel" style={{ marginBottom: 18 }}>
          <div className="panel-header">
            <span className="panel-title"><Shield size={16} /> Webhook Callback URL</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="input-group" style={{ flex: 1 }}>
              <span className="input-group-icon"><Shield size={14} /></span>
              <input className="input" readOnly value={`${API_BASE}/webhook`} />
            </div>
            <button className="btn btn-outline btn-sm" onClick={copyWebhookUrl}>
              {copied ? <CheckCircle size={13} color="var(--positive)" /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Telegram Alerting */}
        <div className="panel" style={{ marginBottom: 18 }}>
          <div className="panel-header">
            <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Bell size={16} color="#0284c7" /> Telegram Alerting</span>
          </div>
          {/* Status + Toggle row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: alertsEnabled ? 'rgba(13,148,136,0.05)' : 'var(--bg-hover)',
            border: `1px solid ${alertsEnabled ? 'rgba(13,148,136,0.18)' : 'var(--border-mid)'}`,
            borderRadius: 12, padding: '14px 18px',
            transition: 'all 0.25s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Telegram Icon */}
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
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>High-confidence negative · sarcastic ≥ 80%</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Status badge */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: alertsEnabled ? 'var(--positive-bg)' : 'var(--neutral-bg)',
                color: alertsEnabled ? 'var(--positive)' : 'var(--neutral)',
                border: `1px solid ${alertsEnabled ? 'var(--positive-border)' : 'var(--neutral-border)'}`,
                borderRadius: 20, padding: '4px 12px', fontSize: '0.7rem', fontWeight: 700,
              }}>
                <CheckCircle size={12} />
                {alertsEnabled ? 'Connected ✓' : 'Disabled'}
              </div>

              {/* Toggle switch */}
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

        {/* Platform Info */}
        <div className="panel" style={{ marginBottom: 18 }}>
          <div className="panel-header">
            <span className="panel-title"><Zap size={16} /> Platform</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['Version',    '1.0.0'],
              ['AI Engine',  'Heuristic · RoBERTa · Llama 3 LoRA'],
              ['Languages',  'Tamil, Malayalam, Hindi, Bengali (Romanized code-mixed)'],
              ['Real-time',  'WebSocket via Redis Pub/Sub'],
            ].map(([label, value]) => (
              <div key={label} style={{
                display: 'flex', gap: 16, padding: '10px 14px',
                background: 'var(--bg-hover)', borderRadius: 10,
                border: '1px solid var(--border-mid)', flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', minWidth: 130, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', flex: 1 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Legal */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title"><FileText size={16} /> Legal</span>
          </div>
          <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', margin: '0 0 14px', lineHeight: 1.7 }}>
            SwaraSense processes social media comment data solely for sentiment analysis on behalf of authorised page administrators. No data is sold or shared with third parties.
          </p>
          <a href="/privacy" target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
            <ExternalLink size={13} /> Privacy Policy
          </a>
        </div>

      </div>
    </>
  );
}
