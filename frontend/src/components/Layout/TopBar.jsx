import { Bell, RefreshCw, Menu } from 'lucide-react';
import { useMobileMenu } from '../../App';

export default function TopBar({ title, subtitle, urgentCount = 0, onRefresh }) {
  const { setMobileMenuOpen } = useMobileMenu();

  return (
    <div className="topbar">
      <div className="topbar-left" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
        <button 
          className="mobile-menu-btn" 
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu size={20} strokeWidth={1.5} />
        </button>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="topbar-title">{title}</span>
          {subtitle && <span className="topbar-sub">{subtitle}</span>}
        </div>
      </div>

      <div className="topbar-right">
        {urgentCount > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(225,29,72,0.08)',
            border: '1px solid rgba(225,29,72,0.22)',
            padding: '4px 10px', borderRadius: 20,
            fontSize: '0.68rem', fontWeight: 700, color: '#e11d48',
          }}>
            <Bell size={12} strokeWidth={1.5} />
            {urgentCount} urgent
          </div>
        )}

        {onRefresh && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={onRefresh}
            title="Refresh data"
            style={{ color: 'var(--text-muted)' }}
          >
            <RefreshCw size={14} strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  );
}
