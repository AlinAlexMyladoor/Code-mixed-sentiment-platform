import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';

/**
 * RBAC Context — provides role-aware access control throughout the frontend.
 *
 * Roles hierarchy:
 *   admin   → full access
 *   manager → analytics, alert rules, vocabulary, dashboard, ai insights
 *   agent   → tickets, comment explorer only
 *
 * In demo / open-access mode (no token), defaults to "admin" so all features
 * remain accessible without authentication friction.
 */

const ROLE_PERMISSIONS = {
  admin:   ['view_dashboard', 'view_analytics', 'view_comments', 'view_tickets',
             'view_ai_insights', 'view_connect', 'view_alerts', 'view_settings',
             'view_vocabulary', 'manage_alerts', 'manage_vocabulary', 'draft_replies',
             'create_tickets', 'manage_settings'],
  manager: ['view_dashboard', 'view_analytics', 'view_comments', 'view_tickets',
             'view_ai_insights', 'view_connect', 'view_alerts', 'view_settings',
             'view_vocabulary', 'manage_alerts', 'manage_vocabulary', 'draft_replies',
             'create_tickets'],
  agent:   ['view_comments', 'view_tickets', 'draft_replies', 'create_tickets'],
  // Fallback for unauthenticated / demo mode
  demo:    ['view_dashboard', 'view_analytics', 'view_comments', 'view_tickets',
             'view_ai_insights', 'view_connect', 'view_alerts', 'view_settings',
             'view_vocabulary', 'manage_alerts', 'manage_vocabulary', 'draft_replies',
             'create_tickets', 'manage_settings'],
};

const RBACContext = createContext(null);

export function RBACProvider({ children }) {
  const [role, setRole]       = useState('demo');
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading]  = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setRole('demo');
      setLoading(false);
      return;
    }
    api.me()
      .then(user => {
        setUserInfo(user);
        // Map legacy "user" role to "agent"
        const r = user.role === 'user' ? 'agent' : (user.role || 'agent');
        setRole(r);
      })
      .catch(() => {
        // Token invalid / expired — fall back to demo mode
        setRole('demo');
      })
      .finally(() => setLoading(false));
  }, []);

  const can = (permission) => {
    const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.demo;
    return perms.includes(permission);
  };

  const isAdmin   = role === 'admin';
  const isManager = role === 'admin' || role === 'manager';
  const isAgent   = role === 'agent';
  const isDemoMode = role === 'demo';

  return (
    <RBACContext.Provider value={{ role, userInfo, loading, can, isAdmin, isManager, isAgent, isDemoMode }}>
      {children}
    </RBACContext.Provider>
  );
}

/** Hook for consuming RBAC context in any component. */
export function useAuth() {
  const ctx = useContext(RBACContext);
  if (!ctx) {
    // Graceful fallback when used outside provider (e.g., during SSR / tests)
    return {
      role: 'demo', userInfo: null, loading: false,
      can: () => true, isAdmin: true, isManager: true, isAgent: false, isDemoMode: true,
    };
  }
  return ctx;
}
