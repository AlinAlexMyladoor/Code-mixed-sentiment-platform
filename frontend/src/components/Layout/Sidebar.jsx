import { NavLink } from 'react-router-dom';
import { BarChart2, Brain, Globe, Home, Link2, MessageSquare, Settings, X } from 'lucide-react';
import { useDemo } from '../../context/DemoContext';

const NAV = [
  { label: 'Dashboard',     icon: Home,         to: '/' },
  { label: 'Analytics',     icon: BarChart2,     to: '/analytics' },
  { label: 'Comments',      icon: MessageSquare, to: '/comments' },
  { label: 'AI Insights',   icon: Brain,         to: '/ai-insights' },
  { label: 'Connect Pages', icon: Link2,         to: '/connect' },
  { label: 'Settings',      icon: Settings,      to: '/settings' },
];

export default function Sidebar({ wsStatus }) {
  const { isDemoMode, clearDemo } = useDemo();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <img src="/logo.png" alt="SwaraSense" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        </div>
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-title">SwaraSense</div>
          <div className="sidebar-logo-subtitle">Sentiment Intelligence</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={16} className="nav-icon" strokeWidth={1.8} />
            <span className="nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Demo mode banner */}
      {isDemoMode && (
        <div className="demo-banner">
          <div>
            <div className="demo-banner-label">Demo Active</div>
            <div className="demo-banner-sub">Sample data loaded</div>
          </div>
          <button
            onClick={clearDemo}
            title="Exit demo mode"
            style={{
              background: 'rgba(245,158,11,0.15)',
              border: '1px solid rgba(245,158,11,0.25)',
              borderRadius: 6, cursor: 'pointer',
              padding: '4px 6px', display: 'flex',
            }}
          >
            <X size={11} color="#f59e0b" />
          </button>
        </div>
      )}

      {/* Footer — connection status */}
      <div className="sidebar-footer">
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px', borderRadius: 8,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border)',
        }}>
          <div className={`status-dot ${wsStatus || 'connecting'}`} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {wsStatus === 'live' ? 'Live Stream' : wsStatus === 'connecting' ? 'Connecting…' : 'Reconnecting…'}
            </div>
          </div>
          <Globe size={13} color="var(--text-muted)" />
        </div>
      </div>
    </aside>
  );
}
