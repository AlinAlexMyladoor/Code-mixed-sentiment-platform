import { NavLink } from 'react-router-dom';
import {
  BarChart2, Brain, Globe, Home, Link2, MessageSquare, Settings, Zap
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard',        icon: Home,           to: '/' },
  { label: 'Analytics',        icon: BarChart2,       to: '/analytics' },
  { label: 'Comments',         icon: MessageSquare,   to: '/comments' },
  { label: 'AI Insights',      icon: Brain,           to: '/ai-insights' },
  { label: 'Connect Pages',    icon: Link2,           to: '/connect' },
  { label: 'Settings',         icon: Settings,        to: '/settings' },
];

export default function Sidebar({ wsStatus }) {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Zap size={18} color="white" strokeWidth={2.5} />
        </div>
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-title">SentinelAI</div>
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

      {/* Footer — WebSocket status */}
      <div className="sidebar-footer">
        <div className="sidebar-status">
          <div className={`status-dot ${wsStatus}`} />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              {wsStatus === 'live' ? 'Stream Live' : wsStatus === 'connecting' ? 'Connecting…' : 'Reconnecting…'}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>WebSocket</div>
          </div>
          <Globe size={14} color="var(--text-muted)" />
        </div>
      </div>
    </aside>
  );
}
