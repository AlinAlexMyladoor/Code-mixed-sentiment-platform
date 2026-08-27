export const API_BASE = import.meta.env.VITE_API_URL || 
  (window.location.hostname.includes('localhost') ? 'http://localhost:8000' : 'https://swarasense-backend.onrender.com');

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
  analyze: (text) => request('POST', '/api/analyze', { text }),

  // ─── Comments & Tickets ────────────────────────────────────────────────
  comments: (params) => request('GET', '/api/comments', null, params),
  deleteComment: (id) => request('DELETE', `/api/comments/${id}`),
  purgeComments: (days = 30) => request('DELETE', `/api/comments/purge?days=${days}`),
  createTicket: (commentId) => request('POST', `/api/comments/${commentId}/ticket`),
  draftReply: (commentId) => request('POST', `/api/comments/${commentId}/draft-reply`),
  getTickets: () => request('GET', '/api/tickets'),
  updateTicketStatus: (ticketId, status) => request('PATCH', `/api/tickets/${ticketId}`, { status }),

  // ─── Alert Rules ───────────────────────────────────────────────────────
  getAlertRules: () => request('GET', '/api/alert-rules'),
  createAlertRule: (data) => request('POST', '/api/alert-rules', data),
  deleteAlertRule: (ruleId) => request('DELETE', `/api/alert-rules/${ruleId}`),

  // ─── Analytics ─────────────────────────────────────────────────────────
  languageSwitching: (hours = 48) => request('GET', '/api/analytics/language-switching', null, { hours }),
  heatmap: (days = 30) => request('GET', '/api/analytics/heatmap', null, { days }),
  brandMentions: (limit = 15) => request('GET', '/api/analytics/brand-mentions', null, { limit }),
  inferenceSources: () => request('GET', '/api/analytics/inference-sources'),
  englishRatioBands: () => request('GET', '/api/analytics/english-ratio-bands'),
  sentimentLangCorrelation: () => request('GET', '/api/analytics/sentiment-lang-correlation'),
  emotionalIntensity: () => request('GET', '/api/analytics/emotional-intensity'),
  insightsBriefing: () => request('GET', '/api/insights/briefing'),
  narrativeClusters: () => request('GET', '/api/insights/narrative-clusters'),
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

  // ─── Custom Vocabulary ─────────────────────────────────────────────────
  getVocabulary: () => request('GET', '/api/vocabulary'),
  createVocabularyTerm: (data) => request('POST', '/api/vocabulary', data),
  deleteVocabularyTerm: (termId) => request('DELETE', `/api/vocabulary/${termId}`),

  // ─── Queue & System Health ─────────────────────────────────────────────
  queueHealth: () => request('GET', '/api/health/queue'),

  // ─── Diagnostics ───────────────────────────────────────────────────────
  // Confirms PostgreSQL is healthy and returns live row_count of persisted comments.
  dbHealth: () => request('GET', '/api/health/db'),
  // Returns the active inference mode and (for llama mode) GPU server status.
  inferenceStatus: () => request('GET', '/api/inference/status'),
};

export const getWsUrl = () => {
  // Use Render backend URL dynamically in production
  const apiBase = import.meta.env.PROD 
    ? (import.meta.env.VITE_API_URL || 'https://swarasense.onrender.com')
    : (import.meta.env.VITE_API_URL || 'http://localhost:8000');
    
  const wsBase = apiBase.replace(/^http/, 'ws');
  return `${wsBase}/ws/dashboard`;
};
