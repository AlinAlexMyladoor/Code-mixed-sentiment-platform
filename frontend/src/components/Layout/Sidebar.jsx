import { NavLink } from 'react-router-dom';
import {
  BarChart2, Brain, Globe, Home, MessageSquare,
  Settings, Ticket, Bell, BookOpen,
} from 'lucide-react';
import { useDemo } from '../../context/DemoContext';
import { useAuth } from '../../context/RBACContext';
import { useMobileMenu } from '../../App';

/* Grouped nav definition with required permission per item */
const NAV_GROUPS = [
  {
    title: 'Core',
    items: [
      { label: 'Dashboard',      icon: Home,          to: '/',            perm: 'view_dashboard' },
      { label: 'Analytics',      icon: BarChart2,     to: '/analytics',   perm: 'view_analytics' },
      { label: 'Comments',       icon: MessageSquare, to: '/comments',    perm: 'view_comments' },
      { label: 'Tickets',        icon: Ticket,        to: '/tickets',     perm: 'view_tickets' },
    ]
  },
  {
    title: 'Intelligence',
    items: [
      { label: 'AI Insights',    icon: Brain,         to: '/ai-insights', perm: 'view_ai_insights' },
      { label: 'Vocabulary',     icon: BookOpen,      to: '/vocabulary',  perm: 'view_vocabulary' },
      { label: 'Alert Rules',    icon: Bell,          to: '/alert-rules', perm: 'view_alerts' },
    ]
  },
  {
    title: 'System',
    items: [
      { label: 'Settings',       icon: Settings,      to: '/settings',    perm: 'view_settings' },
    ]
  }
];

export default function Sidebar({ wsStatus }) {
  const { isDemoMode, clearDemo } = useDemo();
  const { can, role } = useAuth();
  const { isMobileMenuOpen, setMobileMenuOpen } = useMobileMenu();

  /* Role badge styling */
  const roleMeta = {
    admin:   { label: 'Admin',   color: '#4f46e5', bg: 'rgba(79,70,229,0.08)',   border: 'rgba(79,70,229,0.18)' },
    manager: { label: 'Manager', color: '#0d9488', bg: 'rgba(13,148,136,0.08)',  border: 'rgba(13,148,136,0.18)' },
    agent:   { label: 'Agent',   color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.18)' },
    demo:    { label: 'Demo',    color: '#d97706', bg: 'rgba(217,119,6,0.08)',   border: 'rgba(217,119,6,0.18)' },
  }[role] || { label: 'Demo', color: '#d97706', bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.18)' };

  return (
    <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '24px', borderBottom: '1px solid #f1f5f9',
        marginBottom: '12px'
      }}>
        <div style={{ width: 28, height: 28, flexShrink: 0 }}>
          <img src="/logo.png" alt="SwaraSense" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        </div>
        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
          SwaraSense
        </div>
      </div>

      {/* Navigation — RBAC-filtered, Grouped */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '28px', padding: '0 16px', flex: 1, overflowY: 'auto' }}>
        {NAV_GROUPS.map((group, gIdx) => {
          const visibleItems = group.items.filter(item => can(item.perm));
          if (visibleItems.length === 0) return null;
          return (
            <div key={gIdx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 12px', marginBottom: '6px' }}>
                {group.title}
              </div>
              {visibleItems.map(({ label, icon: Icon, to }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px',
                    borderRadius: '0.75rem', fontSize: '0.875rem', transition: 'all 0.2s ease',
                    textDecoration: 'none', cursor: 'pointer',
                    ...(isActive 
                      ? { background: '#f0fdfa', color: '#0f766e', fontWeight: 600 }
                      : { background: 'transparent', color: '#475569', fontWeight: 500 })
                  })}
                  onMouseEnter={e => {
                    if (!e.currentTarget.className.includes('active')) {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.color = '#0f172a';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!e.currentTarget.className.includes('active')) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#475569';
                    }
                  }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon size={18} strokeWidth={1.5} style={{ opacity: 0.9 }} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          );
        })}
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
