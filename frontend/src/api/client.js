const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const getToken = () => localStorage.getItem('access_token');

const headers = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const request = async (method, path, body = null, params = null) => {
  let url = `${API_BASE}${path}`;
  if (params) {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
    ).toString();
    if (query) url += `?${query}`;
  }

  const resp = await fetch(url, {
    method,
    headers: headers(),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(err.detail || 'Request failed');
  }

  return resp.json();
};

export const api = {
  // ─── Auth ──────────────────────────────────────────────────────────────
  register: (data) => request('POST', '/auth/register', data),
  login: (data) => request('POST', '/auth/login', data),
  refresh: (token) => request('POST', `/auth/refresh?refresh_tok=${token}`),
  me: () => request('GET', '/auth/me'),

  // ─── Dashboard ─────────────────────────────────────────────────────────
  metrics: () => request('GET', '/api/metrics'),

  // ─── Comments ──────────────────────────────────────────────────────────
  comments: (params) => request('GET', '/api/comments', null, params),

  // ─── Analytics ─────────────────────────────────────────────────────────
  languageSwitching: (hours = 48) => request('GET', '/api/analytics/language-switching', null, { hours }),
  heatmap: (days = 30) => request('GET', '/api/analytics/heatmap', null, { days }),
  brandMentions: (limit = 15) => request('GET', '/api/analytics/brand-mentions', null, { limit }),
  inferenceSources: () => request('GET', '/api/analytics/inference-sources'),
  englishRatioBands: () => request('GET', '/api/analytics/english-ratio-bands'),
  sentimentLangCorrelation: () => request('GET', '/api/analytics/sentiment-lang-correlation'),
  exportComments: (params) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v != null))
    ).toString();
    window.location.href = `${API_BASE}/api/analytics/export${query ? `?${query}` : ''}`;
  },

  // ─── Meta / Pages ──────────────────────────────────────────────────────
  connectedPages: () => request('GET', '/auth/meta/pages'),
  disconnectPage: (pageId) => request('DELETE', `/auth/meta/pages/${pageId}`),
  refreshPageToken: (pageId) => request('POST', `/auth/meta/pages/${pageId}/refresh-token`),
};

export const getWsUrl = () => {
  const base = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/dashboard';
  const token = getToken();
  return token ? `${base}?token=${token}` : base;
};
