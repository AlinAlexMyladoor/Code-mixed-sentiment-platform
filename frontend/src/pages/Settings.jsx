import { useState } from 'react';
import { CheckCircle, Copy, ExternalLink, FileText, Shield, Zap } from 'lucide-react';
import TopBar from '../components/Layout/TopBar';
import { API_BASE } from '../api/client';

export default function Settings() {
  const [copied, setCopied] = useState(false);

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(`${API_BASE}/webhook`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <TopBar title="Settings" subtitle="Integration and compliance" />
      <div className="page-body">

        {/* Webhook */}
        <div className="panel" style={{ marginBottom: 18 }}>
          <div className="panel-header">
            <span className="panel-title"><Shield size={16} /> Webhook Callback URL</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div className="input-group" style={{ flex: 1 }}>
              <span className="input-group-icon"><Shield size={14} /></span>
              <input className="input" readOnly value={`${API_BASE}/webhook`} />
            </div>
            <button className="btn btn-outline btn-sm" onClick={copyWebhookUrl}>
              {copied ? <CheckCircle size={13} color="var(--positive)" /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
            Register this as the callback endpoint in your Meta Developer App → Webhooks.
            The verify token is configured server-side and must match the value in your Meta app settings.
          </p>
        </div>

        {/* Telegram Alerting */}
        <div className="panel" style={{ marginBottom: 18 }}>
          <div className="panel-header">
            <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Zap size={16} color="#0284c7" /> Telegram Alerting</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: 1.5 }}>
            SwaraSense can instantly notify you of high-intensity complaints (≥ 80% confidence negative/sarcastic).
          </p>
          <div style={{ background: 'var(--bg-hover)', padding: '14px 18px', borderRadius: 10, border: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
              <li>Message <strong>@BotFather</strong> on Telegram and send <code>/newbot</code>.</li>
              <li>Copy the generated HTTP API Token and set it as <code>TELEGRAM_BOT_TOKEN</code> in your Render environment variables.</li>
              <li>Add your new bot to a Telegram group (or message it directly).</li>
              <li>Get the Chat ID (e.g., using @userinfobot) and set it as <code>TELEGRAM_CHAT_ID</code> in Render.</li>
            </ol>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
              <CheckCircle size={14} color="var(--positive)" /> Alerts trigger automatically via background worker
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
                border: '1px solid var(--border)', flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', minWidth: 130 }}>{label}</span>
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
