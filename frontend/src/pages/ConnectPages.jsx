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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
          {/* Facebook */}
          <div style={{
            background: '#fff', border: '1px solid var(--border-mid)', borderRadius: 'var(--r-xl)', 
            padding: '24px', display: 'flex', flexDirection: 'column', gap: 16,
            boxShadow: 'var(--shadow-sm)', transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'none'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#1877f2,#0b5fcc)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(24,119,242,0.3)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>Facebook Pages</h2>
                <p style={{ margin: '3px 0 0', color: 'var(--text-muted)', fontSize: '0.72rem' }}>Real-time comment webhooks · Live</p>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: '0.6rem', fontWeight: 700, background: 'var(--positive-bg)', color: 'var(--positive)', border: '1px solid var(--positive-border)', padding: '2px 8px', borderRadius: 20 }}>ACTIVE</span>
            </div>
            <button className="btn btn-primary" onClick={handleConnect}><Link2 size={15} /> Connect with Meta</button>
          </div>
          
          {/* Instagram */}
          <div style={{
            background: '#fff', border: '1px solid var(--border-mid)', borderRadius: 'var(--r-xl)', 
            padding: '24px', display: 'flex', flexDirection: 'column', gap: 16,
            boxShadow: 'var(--shadow-sm)', transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'none'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(225,48,108,0.3)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>Instagram</h2>
                <p style={{ margin: '3px 0 0', color: 'var(--text-muted)', fontSize: '0.72rem' }}>Comments & Mentions · v2.1</p>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: '0.6rem', fontWeight: 700, background: 'rgba(249,115,22,0.08)', color: '#f97316', border: '1px solid rgba(249,115,22,0.2)', padding: '2px 8px', borderRadius: 20 }}>COMING SOON</span>
            </div>
            <button className="btn btn-outline" onClick={() => showToast("Instagram connection coming soon in v2.1")}><Link2 size={15} /> Connect</button>
          </div>

          {/* YouTube */}
          <div style={{
            background: '#fff', border: '1px solid var(--border-mid)', borderRadius: 'var(--r-xl)', 
            padding: '24px', display: 'flex', flexDirection: 'column', gap: 16,
            boxShadow: 'var(--shadow-sm)', transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'none'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#ff0000,#cc0000)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(255,0,0,0.28)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>YouTube</h2>
                <p style={{ margin: '3px 0 0', color: 'var(--text-muted)', fontSize: '0.72rem' }}>Video Comments · v2.1</p>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: '0.6rem', fontWeight: 700, background: 'rgba(249,115,22,0.08)', color: '#f97316', border: '1px solid rgba(249,115,22,0.2)', padding: '2px 8px', borderRadius: 20 }}>COMING SOON</span>
            </div>
            <button className="btn btn-outline" onClick={() => showToast("YouTube connection coming soon in v2.1")}><Link2 size={15} /> Connect</button>
          </div>

          {/* Twitter / X */}
          <div style={{
            background: '#fff', border: '1px solid var(--border-mid)', borderRadius: 'var(--r-xl)', 
            padding: '24px', display: 'flex', flexDirection: 'column', gap: 16,
            boxShadow: 'var(--shadow-sm)', transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'none'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>X (Twitter)</h2>
                <p style={{ margin: '3px 0 0', color: 'var(--text-muted)', fontSize: '0.72rem' }}>Mentions & Replies · v2.1</p>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: '0.6rem', fontWeight: 700, background: 'rgba(249,115,22,0.08)', color: '#f97316', border: '1px solid rgba(249,115,22,0.2)', padding: '2px 8px', borderRadius: 20 }}>COMING SOON</span>
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
