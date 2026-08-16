import { Bell, RefreshCw } from 'lucide-react';

export default function TopBar({ title, subtitle, urgentCount = 0, onRefresh }) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <span className="topbar-title">{title}</span>
        {subtitle && <span className="topbar-sub">{subtitle}</span>}
      </div>

      <div className="topbar-right">
        {urgentCount > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(244,63,94,0.1)',
            border: '1px solid rgba(244,63,94,0.25)',
            padding: '4px 10px', borderRadius: 20,
            fontSize: '0.68rem', fontWeight: 700, color: '#f87171',
          }}>
            <Bell size={12} />
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
            <RefreshCw size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
