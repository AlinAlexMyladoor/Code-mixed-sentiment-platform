import { NavLink } from 'react-router-dom';
import {
  BarChart2, Brain, Globe, Home, Link2, MessageSquare, Settings, X,
} from 'lucide-react';
import { useDemo } from '../../context/DemoContext';

const NAV_ITEMS = [
  { label: 'Dashboard',     icon: Home,          to: '/' },
  { label: 'Analytics',     icon: BarChart2,      to: '/analytics' },
  { label: 'Comments',      icon: MessageSquare,  to: '/comments' },
  { label: 'AI Insights',   icon: Brain,          to: '/ai-insights' },
  { label: 'Connect Pages', icon: Link2,          to: '/connect' },
  { label: 'Settings',      icon: Settings,       to: '/settings' },
];

export default function Sidebar({ wsStatus }) {
  const { isDemoMode, clearDemo } = useDemo();
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <img
            src="/logo.png"
            alt="SwaraSense"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-title">SwaraSense</div>
          <div className="sidebar-logo-subtitle">Sentiment Intelligence</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Platform</div>
        {NAV_ITEMS.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={17} className="nav-icon" strokeWidth={1.8} />
            <span className="nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Demo mode banner */}
      {isDemoMode && (
        <div style={{
          margin: '0 12px 8px',
          padding: '8px 12px',
          borderRadius: 10,
          background: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#f59e0b', letterSpacing: '0.08em' }}>DEMO MODE</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Sample data active</div>
          </div>
          <button
            onClick={clearDemo}
            style={{
              background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 6, cursor: 'pointer', padding: '3px 6px', display: 'flex',
            }}
            title="Exit demo mode"
          >
            <X size={12} color="#f59e0b" />
          </button>
        </div>
      )}

      {/* Footer — WebSocket status */}
      <div className="sidebar-footer">
        <div className="sidebar-status">
          <div className={`status-dot ${wsStatus}`} />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              {wsStatus === 'live' ? 'Stream Live' : wsStatus === 'connecting' ? 'Connecting…' : 'Reconnecting…'}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Live Stream</div>
          </div>
          <Globe size={14} color="var(--text-muted)" />
        </div>
      </div>
    </aside>
  );
}
