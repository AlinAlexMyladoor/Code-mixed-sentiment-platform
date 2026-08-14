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
      <TopBar title="Settings" subtitle="Platform integration and compliance settings" />
      <div className="page-body">

        {/* Webhook Integration */}
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-header">
            <span className="panel-title"><Shield size={16} /> Webhook Integration</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Callback URL
              </label>
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
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
                Register this URL as the callback endpoint in your Meta Developer App under Webhooks. SwaraSense will verify and receive all comment events at this address.
              </p>
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Verify Token
              </label>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 0 }}>
                The verify token is configured securely on the server. It must match the value set in your Meta Developer App → Webhooks → Edit → Verify Token field exactly.
              </p>
            </div>
          </div>
        </div>

        {/* Platform Information */}
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-header">
            <span className="panel-title"><Zap size={16} /> Platform Information</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Platform', value: 'SwaraSense — Code-Mixed Sentiment Intelligence' },
              { label: 'Version', value: '1.0.0' },
              { label: 'AI Engine', value: 'Multi-layer heuristic + optional ML inference (RoBERTa / Llama 3)' },
              { label: 'Supported Languages', value: 'Tamil-English, Malayalam-English, Hindi-English, Bengali-English (Romanized)' },
              { label: 'Data Residency', value: 'PostgreSQL (structured), MongoDB (raw archive)' },
              { label: 'Real-time Delivery', value: 'WebSocket push via Redis Pub/Sub' },
            ].map(({ label, value }) => (
              <div key={label} style={{
                display: 'flex', gap: 16, padding: '10px 14px',
                background: 'var(--bg-glass)', borderRadius: 10, border: '1px solid var(--border)',
                flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', minWidth: 160 }}>{label}</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', flex: 1 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Legal & Compliance */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title"><FileText size={16} /> Legal &amp; Compliance</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              SwaraSense processes social media comment data solely for the purpose of sentiment analysis on behalf of authorised page administrators. No data is sold, shared with third parties, or used for advertising purposes.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a
                href="/privacy"
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline btn-sm"
              >
                <ExternalLink size={13} /> Privacy Policy
              </a>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
