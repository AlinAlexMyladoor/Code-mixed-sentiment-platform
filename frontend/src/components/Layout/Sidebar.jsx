import { NavLink } from 'react-router-dom';
import {
  BarChart2, Brain, Globe, Home, Link2, MessageSquare,
  Settings, X, Ticket, Bell, BookOpen,
} from 'lucide-react';
import { useDemo } from '../../context/DemoContext';
import { useAuth } from '../../context/RBACContext';

/* Full nav definition with required permission per item */
const NAV_FULL = [
  { label: 'Dashboard',      icon: Home,          to: '/',            perm: 'view_dashboard' },
  { label: 'Analytics',      icon: BarChart2,     to: '/analytics',   perm: 'view_analytics' },
  { label: 'Comments',       icon: MessageSquare, to: '/comments',    perm: 'view_comments' },
  { label: 'Tickets',        icon: Ticket,        to: '/tickets',     perm: 'view_tickets' },
  { label: 'AI Insights',    icon: Brain,         to: '/ai-insights', perm: 'view_ai_insights' },
  { label: 'Connect Pages',  icon: Link2,         to: '/connect',     perm: 'view_connect' },
  { label: 'Alert Rules',    icon: Bell,          to: '/alert-rules', perm: 'view_alerts' },
  { label: 'Vocabulary',     icon: BookOpen,      to: '/vocabulary',  perm: 'view_vocabulary' },
  { label: 'Settings',       icon: Settings,      to: '/settings',    perm: 'view_settings' },
];

export default function Sidebar({ wsStatus }) {
  const { isDemoMode, clearDemo } = useDemo();
  const { can, role } = useAuth();

  /* Filter nav items by role permissions */
  const visibleNav = NAV_FULL.filter(item => can(item.perm));

  /* Role badge styling */
  const roleMeta = {
    admin:   { label: 'Admin',   color: '#4f46e5', bg: 'rgba(79,70,229,0.08)',   border: 'rgba(79,70,229,0.18)' },
    manager: { label: 'Manager', color: '#0d9488', bg: 'rgba(13,148,136,0.08)',  border: 'rgba(13,148,136,0.18)' },
    agent:   { label: 'Agent',   color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.18)' },
    demo:    { label: 'Demo',    color: '#d97706', bg: 'rgba(217,119,6,0.08)',   border: 'rgba(217,119,6,0.18)' },
  }[role] || { label: 'Demo', color: '#d97706', bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.18)' };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <img src="/logo.png" alt="SwaraSense" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        </div>
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-title">SwaraSense</div>
        </div>
      </div>



      {/* Navigation — RBAC-filtered, consistent 1.5px strokes */}
      <nav className="sidebar-nav">
        {visibleNav.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={16} className="nav-icon" strokeWidth={1.5} />
            <span className="nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>



      {/* Footer — WebSocket status with concentric pulse when live */}
      <div className="sidebar-footer">
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px', borderRadius: 10,
          background: 'rgba(255,255,255,0.55)',
          border: '1px solid rgba(229,231,235,0.7)',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ position: 'relative', flexShrink: 0, width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className={`status-dot ${wsStatus || 'connecting'}`} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '-0.01em' }}>
              {wsStatus === 'live' ? 'Active Data Feed' : wsStatus === 'connecting' ? 'Connecting…' : 'Reconnecting…'}
            </div>
          </div>
          <Globe size={13} color="var(--text-muted)" strokeWidth={1.5} />
        </div>
      </div>
    </aside>
  );
}
