import { useState } from 'react';
import { CheckCircle, Copy, Key, Save, Settings2, Shield, User } from 'lucide-react';
import TopBar from '../components/Layout/TopBar';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Settings() {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inferenceMode, setInferenceMode] = useState(
    localStorage.getItem('inference_mode_display') || 'heuristic'
  );

  const handleSave = () => {
    localStorage.setItem('inference_mode_display', inferenceMode);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(`${API_BASE}/webhook`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <TopBar title="Settings" subtitle="Platform configuration and environment reference" />
      <div className="page-body">

        {/* Webhook config */}
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-header">
            <span className="panel-title"><Shield size={16} /> Webhook Configuration</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Webhook Callback URL
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
                Set this URL as the callback in your Meta Developer App → Webhooks.
              </p>
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Verify Token
              </label>
              <div className="input-group">
                <span className="input-group-icon"><Key size={14} /></span>
                <input className="input" readOnly value="Set in backend/.env as META_VERIFY_TOKEN" placeholder="META_VERIFY_TOKEN" />
              </div>
            </div>
          </div>
        </div>

        {/* Environment variables reference */}
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-header">
            <span className="panel-title"><Settings2 size={16} /> Environment Variables Reference</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Variable</th>
                  <th>Description</th>
                  <th>Default</th>
                  <th>Required</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['META_VERIFY_TOKEN', 'Meta webhook verification token', 'your_secure_verify_token_here', 'Yes'],
                  ['META_APP_ID', 'Meta App ID for OAuth', '—', 'For OAuth'],
                  ['META_APP_SECRET', 'Meta App Secret for OAuth', '—', 'For OAuth'],
                  ['DATABASE_URL', 'PostgreSQL connection string', 'postgresql://postgres:postgres@localhost:5432/sentiment_db', 'Yes'],
                  ['REDIS_URL', 'Redis connection URL', 'redis://localhost:6380/0', 'Yes'],
                  ['MONGODB_URL', 'MongoDB connection URL', 'mongodb://localhost:27017', 'Yes'],
                  ['INFERENCE_MODE', 'AI mode: heuristic | roberta | llama', 'heuristic', 'No'],
                  ['INFERENCE_URL', 'URL for Llama/RoBERTa inference server', 'http://localhost:8001/analyze', 'If llama mode'],
                  ['JWT_SECRET_KEY', 'Secret for JWT token signing', 'change-me-in-production', 'Yes'],
                  ['CORS_ORIGINS', 'Allowed frontend origins', 'http://localhost:5173', 'Yes'],
                ].map(([key, desc, def, req]) => (
                  <tr key={key}>
                    <td><code style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem' }}>{key}</code></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{desc}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: 200 }}>{def}</td>
                    <td>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 5,
                        background: req === 'Yes' ? 'var(--negative-bg)' : 'var(--neutral-bg)',
                        color: req === 'Yes' ? 'var(--negative)' : 'var(--neutral)',
                        border: `1px solid ${req === 'Yes' ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
                      }}>{req}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* API Reference */}
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-header">
            <span className="panel-title"><Key size={16} /> API Reference</span>
            <a href={`${API_BASE}/docs`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
              Open Swagger UI ↗
            </a>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr><th>Method</th><th>Path</th><th>Description</th></tr>
              </thead>
              <tbody>
                {[
                  ['GET',    '/webhook',                      'Meta webhook verification'],
                  ['POST',   '/webhook',                      'Receive Meta comment events'],
                  ['GET',    '/api/metrics',                  'Dashboard summary + trend + recent comments'],
                  ['GET',    '/api/comments',                 'Searchable, filterable comment list'],
                  ['WS',     '/ws/dashboard',                 'Live WebSocket comment stream'],
                  ['GET',    '/auth/meta/login',              'Start Meta OAuth flow'],
                  ['GET',    '/auth/meta/pages',              'List connected pages'],
                  ['POST',   '/auth/register',                'Register new user'],
                  ['POST',   '/auth/login',                   'Login, get JWT tokens'],
                  ['GET',    '/auth/me',                      'Get current user'],
                  ['GET',    '/api/analytics/language-switching', 'Language switch ratio over time'],
                  ['GET',    '/api/analytics/heatmap',        'Comment activity heatmap'],
                  ['GET',    '/api/analytics/brand-mentions', 'Top entity/brand mentions'],
                  ['GET',    '/api/analytics/export',         'Export comments as CSV'],
                  ['GET',    '/health',                       'Service health check'],
                  ['GET',    '/docs',                         'Swagger UI (interactive API)'],
                ].map(([method, path, desc]) => (
                  <tr key={path}>
                    <td>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 5,
                        background: method === 'GET' ? 'rgba(34,197,94,0.1)' : method === 'POST' ? 'rgba(99,102,241,0.1)' : method === 'WS' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                        color: method === 'GET' ? '#4ade80' : method === 'POST' ? '#a5b4fc' : method === 'WS' ? '#fbbf24' : '#f87171',
                      }}>{method}</span>
                    </td>
                    <td><code style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{path}</code></td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Display preferences */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title"><User size={16} /> Display Preferences</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Active Inference Mode (display only)
              </label>
              <select
                className="select"
                value={inferenceMode}
                onChange={(e) => setInferenceMode(e.target.value)}
              >
                <option value="heuristic">Heuristic Engine (default, fast, no deps)</option>
                <option value="roberta">RoBERTa CPU (real ML, ~400MB download)</option>
                <option value="llama">Llama 3 8B LoRA (GPU, highest accuracy)</option>
              </select>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
                This is a display setting only. Set INFERENCE_MODE in backend/.env to actually change inference.
              </p>
            </div>
            <div>
              <button className="btn btn-primary btn-sm" onClick={handleSave}>
                {saved ? <CheckCircle size={14} /> : <Save size={14} />}
                {saved ? 'Saved!' : 'Save Preferences'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
