import { useEffect, useState } from 'react';
import { ExternalLink, Facebook, Link2, RefreshCw, Trash2, Wifi } from 'lucide-react';
import TopBar from '../components/Layout/TopBar';
import { EmptyState, Skeleton } from '../components/UI';
import { api, API_BASE } from '../api/client';

export default function ConnectPages() {
  const [pages, setPages]                   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [refreshingId, setRefreshingId]     = useState(null);
  const [disconnectingId, setDisconnectingId] = useState(null);
  const [toast, setToast]                   = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadPages = async () => {
    setLoading(true);
    try {
      setPages(await api.connectedPages());
    } catch {
      setPages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPages();
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      showToast('Successfully connected to Meta!');
      window.history.replaceState({}, '', '/connect');
    }
  }, []);

  const handleConnect = () => { window.location.href = `${API_BASE}/auth/meta/login`; };

  const handleRefresh = async (pageId) => {
    setRefreshingId(pageId);
    try {
      await api.refreshPageToken(pageId);
      showToast('Token refreshed');
    } catch (err) {
      showToast(err.message || 'Failed to refresh token', 'error');
    } finally {
      setRefreshingId(null);
    }
  };

  const handleDisconnect = async (pageId, pageName) => {
    if (!confirm(`Disconnect "${pageName}"?`)) return;
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
      <TopBar title="Connect Integrations" subtitle="Manage Omni-channel webhook integrations" />
      <div className="page-body">

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'fixed', top: 76, right: 24, zIndex: 200,
            background: toast.type === 'error' ? 'var(--negative-bg)' : 'var(--positive-bg)',
            border: `1px solid ${toast.type === 'error' ? 'var(--negative-border)' : 'var(--positive-border)'}`,
            color: toast.type === 'error' ? 'var(--negative)' : 'var(--positive)',
            padding: '11px 20px', borderRadius: 12, fontSize: '0.84rem',
            fontWeight: 600, boxShadow: 'var(--shadow-md)',
            animation: 'commentSlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            {toast.msg}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 20 }}>
          {/* Facebook */}
          <div style={{
            background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(24,119,242,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Facebook size={22} color="#1877f2" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Facebook Pages</h2>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.75rem' }}>Real-time webhooks</p>
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleConnect}><Link2 size={15} /> Connect</button>
          </div>
          
          {/* Instagram */}
          <div style={{
            background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(225,48,108,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#e1306c' }}>IG</div>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Instagram</h2>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.75rem' }}>Comments & DMs</p>
              </div>
            </div>
            <button className="btn btn-outline" onClick={() => showToast("Instagram connection coming soon in v2.1")}><Link2 size={15} /> Connect</button>
          </div>

          {/* YouTube */}
          <div style={{
            background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#ff0000' }}>YT</div>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>YouTube</h2>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.75rem' }}>Video Comments</p>
              </div>
            </div>
            <button className="btn btn-outline" onClick={() => showToast("YouTube connection coming soon in v2.1")}><Link2 size={15} /> Connect</button>
          </div>

          {/* Twitter / X */}
          <div style={{
            background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#000000' }}>𝕏</div>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>X (Twitter)</h2>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.75rem' }}>Mentions & Replies</p>
              </div>
            </div>
            <button className="btn btn-outline" onClick={() => showToast("X/Twitter connection coming soon in v2.1")}><Link2 size={15} /> Connect</button>
          </div>
        </div>

        {/* Connected Pages */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">
              <Wifi size={16} /> Connected Pages
              <span style={{
                fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)',
                background: 'var(--accent-soft)', border: '1px solid rgba(79,70,229,0.12)',
                padding: '1px 8px', borderRadius: 20, marginLeft: 4,
              }}>{pages.length}</span>
            </span>
            <button className="btn btn-ghost btn-sm" onClick={loadPages}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2].map((i) => <Skeleton key={i} height={76} />)}
            </div>
          ) : pages.length === 0 ? (
            <EmptyState
              icon={Link2}
              title="No pages connected"
              desc="Click 'Connect with Facebook' to link your pages."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pages.map((p) => (
                <div key={p.page_id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: 'var(--bg-hover)', border: '1px solid var(--border-mid)',
                  borderRadius: 'var(--r-md)', padding: '14px 16px',
                  transition: 'box-shadow 0.2s ease',
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                    background: 'rgba(24,119,242,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Facebook size={20} color="#1877f2" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{p.page_name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {p.page_id}{p.category && ` · ${p.category}`}{p.follower_count != null && ` · ${p.follower_count.toLocaleString()} followers`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 700,
                      background: p.is_active ? 'var(--positive-bg)' : 'var(--neutral-bg)',
                      color: p.is_active ? 'var(--positive)' : 'var(--neutral)',
                      border: `1px solid ${p.is_active ? 'var(--positive-border)' : 'var(--neutral-border)'}`,
                      padding: '3px 9px', borderRadius: 20,
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
