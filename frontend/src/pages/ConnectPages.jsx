import { useEffect, useState } from 'react';
import { CheckCircle, ExternalLink, Facebook, Link2, RefreshCw, Trash2, Wifi } from 'lucide-react';
import TopBar from '../components/Layout/TopBar';
import { EmptyState, Skeleton } from '../components/UI';
import { api } from '../api/client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function ConnectPages() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState(null);
  const [disconnectingId, setDisconnectingId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadPages = async () => {
    setLoading(true);
    try {
      const data = await api.connectedPages();
      setPages(data);
    } catch {
      setPages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPages(); }, []);

  const handleConnect = () => {
    window.location.href = `${API_BASE}/auth/meta/login`;
  };

  const handleRefresh = async (pageId) => {
    setRefreshingId(pageId);
    try {
      await api.refreshPageToken(pageId);
      showToast('Token refreshed successfully');
    } catch (err) {
      showToast(err.message || 'Failed to refresh token', 'error');
    } finally {
      setRefreshingId(null);
    }
  };

  const handleDisconnect = async (pageId, pageName) => {
    if (!confirm(`Disconnect "${pageName}"? This will stop receiving webhooks for this page.`)) return;
    setDisconnectingId(pageId);
    try {
      await api.disconnectPage(pageId);
      showToast(`"${pageName}" disconnected`);
      setPages((prev) => prev.filter((p) => p.page_id !== pageId));
    } catch (err) {
      showToast(err.message || 'Failed to disconnect', 'error');
    } finally {
      setDisconnectingId(null);
    }
  };

  return (
    <>
      <TopBar title="Connect Pages" subtitle="Manage your Meta Facebook & Instagram integrations" />
      <div className="page-body">

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'fixed', top: 80, right: 24, zIndex: 200,
            background: toast.type === 'error' ? 'var(--negative-bg)' : 'rgba(34,197,94,0.15)',
            border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.4)'}`,
            color: toast.type === 'error' ? '#f87171' : '#4ade80',
            padding: '12px 20px', borderRadius: 12, fontSize: '0.85rem',
            fontWeight: 600, boxShadow: 'var(--shadow-md)',
            animation: 'slideIn 0.3s ease',
          }}>
            {toast.msg}
          </div>
        )}

        {/* Connect hero */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(24,119,242,0.1) 0%, rgba(99,102,241,0.1) 100%)',
          border: '1px solid rgba(24,119,242,0.25)',
          borderRadius: 'var(--r-xl)',
          padding: '28px 32px',
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(24,119,242,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Facebook size={20} color="#60a5fa" />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Meta Graph API Integration
              </h2>
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem', maxWidth: 520 }}>
              Connect your Facebook Pages and Instagram Business accounts to start receiving real-time webhook events.
              Requires <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 5px', borderRadius: 4, fontSize: '0.78rem' }}>META_APP_ID</code> and <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 5px', borderRadius: 4, fontSize: '0.78rem' }}>META_APP_SECRET</code> in your .env file.
            </p>
          </div>
          <button className="btn btn-primary" onClick={handleConnect}>
            <Link2 size={15} /> Connect with Facebook
          </button>
        </div>

        {/* Setup checklist */}
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-header">
            <span className="panel-title"><CheckCircle size={16} /> Setup Checklist</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Create a Meta Developer App', link: 'https://developers.facebook.com/apps', done: false },
              { label: 'Set META_APP_ID and META_APP_SECRET in .env', done: false },
              { label: 'Add Webhooks product and subscribe to feed/comments', done: false },
              { label: 'Set Callback URL to https://your-domain.com/webhook', done: false },
              { label: 'Request pages_manage_metadata and instagram_manage_comments permissions', done: false },
              { label: 'Click "Connect with Facebook" above to run OAuth', done: false },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', background: 'var(--bg-glass)', borderRadius: 10,
                border: '1px solid var(--border)',
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: item.done ? 'var(--positive)' : 'rgba(255,255,255,0.06)',
                  border: `2px solid ${item.done ? 'var(--positive)' : 'var(--border-strong)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {item.done && <CheckCircle size={12} color="white" />}
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', flex: 1 }}>{item.label}</span>
                {item.link && (
                  <a href={item.link} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-1)', display: 'flex' }}>
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Connected Pages */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title"><Wifi size={16} /> Connected Pages ({pages.length})</span>
            <button className="btn btn-ghost btn-sm" onClick={loadPages}><RefreshCw size={13} /> Refresh</button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2].map((i) => <Skeleton key={i} height={80} />)}
            </div>
          ) : pages.length === 0 ? (
            <EmptyState
              icon={Link2}
              title="No pages connected"
              desc="Click 'Connect with Facebook' above to link your pages."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pages.map((p) => (
                <div key={p.page_id} style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-strong)',
                  borderRadius: 12, padding: '14px 18px',
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: 'rgba(24,119,242,0.15)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Facebook size={22} color="#60a5fa" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>{p.page_name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      ID: {p.page_id}
                      {p.category && ` · ${p.category}`}
                      {p.follower_count != null && ` · ${p.follower_count.toLocaleString()} followers`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 700,
                      background: p.is_active ? 'var(--positive-bg)' : 'var(--neutral-bg)',
                      color: p.is_active ? 'var(--positive)' : 'var(--neutral)',
                      border: `1px solid ${p.is_active ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                      padding: '3px 8px', borderRadius: 6,
                    }}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleRefresh(p.page_id)}
                      disabled={refreshingId === p.page_id}
                      title="Refresh token"
                    >
                      <RefreshCw size={13} className={refreshingId === p.page_id ? 'spin' : ''} />
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDisconnect(p.page_id, p.page_name)}
                      disabled={disconnectingId === p.page_id}
                    >
                      <Trash2 size={13} /> Disconnect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
