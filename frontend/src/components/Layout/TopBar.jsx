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
            background: 'var(--negative-bg)', border: '1px solid rgba(239,68,68,0.3)',
            padding: '5px 10px', borderRadius: 20,
            fontSize: '0.72rem', fontWeight: 700, color: '#f87171',
          }}>
            <Bell size={13} />
            {urgentCount} urgent
          </div>
        )}

        {onRefresh && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={onRefresh}
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
