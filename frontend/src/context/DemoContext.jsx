/**
 * DemoContext — global demo mode state shared across all pages.
 *
 * When demo mode is active, any page that calls useDemoData() will receive
 * the pre-built mock dataset instead of making real API calls. This lets the
 * entire platform (Dashboard, Analytics, Comments, AI Insights) look fully
 * populated for demos without a live Meta connection.
 */
import { createContext, useCallback, useContext, useState } from 'react';

// ── Mock comment records ────────────────────────────────────────────────────
export const DEMO_COMMENTS = [
  {
    id: 'demo-1', platform_id: 'd1', page_id: 'demo-page',
    original_text: 'Bhai yeh product ekdum bakwaas hai, paise waste ho gaye mere!',
    sentiment: 'negative', confidence: 0.91, english_ratio: 0.28,
    language_switch_count: 3, sarcasm_score: 0.05,
    inference_source: 'heuristic_mvp',
    created_at: new Date(Date.now() - 2 * 60000).toISOString(),
  },
  {
    id: 'demo-2', platform_id: 'd2', page_id: 'demo-page',
    original_text: 'Superb quality da! Romba nalla irukku, next time also buy pannuven.',
    sentiment: 'positive', confidence: 0.89, english_ratio: 0.22,
    language_switch_count: 4, sarcasm_score: 0.02,
    inference_source: 'heuristic_mvp',
    created_at: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: 'demo-3', platform_id: 'd3', page_id: 'demo-page',
    original_text: 'Oh wow, delivery in 10 days for a "same-day" order. Truly impressive service!',
    sentiment: 'sarcastic', confidence: 0.87, english_ratio: 0.88,
    language_switch_count: 0, sarcasm_score: 0.82,
    inference_source: 'heuristic_mvp',
    created_at: new Date(Date.now() - 8 * 60000).toISOString(),
  },
  {
    id: 'demo-4', platform_id: 'd4', page_id: 'demo-page',
    original_text: 'Order pandren, packaging okay okay aa irukku. Edho okay aagum.',
    sentiment: 'neutral', confidence: 0.75, english_ratio: 0.30,
    language_switch_count: 2, sarcasm_score: 0.08,
    inference_source: 'heuristic_mvp',
    created_at: new Date(Date.now() - 12 * 60000).toISOString(),
  },
  {
    id: 'demo-5', platform_id: 'd5', page_id: 'demo-page',
    original_text: 'Yaar yeh fraud company hai! Mera paisa wapas karo, bilkul cheating hai!',
    sentiment: 'negative', confidence: 0.95, english_ratio: 0.32,
    language_switch_count: 3, sarcasm_score: 0.10,
    inference_source: 'heuristic_mvp',
    created_at: new Date(Date.now() - 18 * 60000).toISOString(),
  },
  {
    id: 'demo-6', platform_id: 'd6', page_id: 'demo-page',
    original_text: 'Kollam da! Price um reasonable, quality um good. Full paisa vasool!',
    sentiment: 'positive', confidence: 0.88, english_ratio: 0.25,
    language_switch_count: 3, sarcasm_score: 0.03,
    inference_source: 'heuristic_mvp',
    created_at: new Date(Date.now() - 25 * 60000).toISOString(),
  },
  {
    id: 'demo-7', platform_id: 'd7', page_id: 'demo-page',
    original_text: 'Service too slow yaar, 3 ghante se wait kar raha hoon. Kab aayega?',
    sentiment: 'negative', confidence: 0.82, english_ratio: 0.35,
    language_switch_count: 2, sarcasm_score: 0.12,
    inference_source: 'heuristic_mvp',
    created_at: new Date(Date.now() - 35 * 60000).toISOString(),
  },
  {
    id: 'demo-8', platform_id: 'd8', page_id: 'demo-page',
    original_text: 'Amazing customer support! They resolved my issue within minutes. Highly recommended!',
    sentiment: 'positive', confidence: 0.93, english_ratio: 0.95,
    language_switch_count: 0, sarcasm_score: 0.04,
    inference_source: 'heuristic_mvp',
    created_at: new Date(Date.now() - 45 * 60000).toISOString(),
  },
  {
    id: 'demo-9', platform_id: 'd9', page_id: 'demo-page',
    original_text: 'Yeah right, "premium quality" they said. Box came crushed. So premium!',
    sentiment: 'sarcastic', confidence: 0.90, english_ratio: 0.92,
    language_switch_count: 0, sarcasm_score: 0.78,
    inference_source: 'heuristic_mvp',
    created_at: new Date(Date.now() - 60 * 60000).toISOString(),
  },
  {
    id: 'demo-10', platform_id: 'd10', page_id: 'demo-page',
    original_text: 'Enna da ithu, rate konjam jaasthi thaan but quality first class!',
    sentiment: 'positive', confidence: 0.80, english_ratio: 0.18,
    language_switch_count: 2, sarcasm_score: 0.06,
    inference_source: 'heuristic_mvp',
    created_at: new Date(Date.now() - 75 * 60000).toISOString(),
  },
];

// ── Mock analytics datasets ─────────────────────────────────────────────────
export const DEMO_METRICS = {
  summary: {
    total_comments: 10,
    positive: 4,
    negative: 3,
    neutral: 1,
    sarcastic: 2,
    avg_english_ratio: 0.465,
    urgent_alerts: 5,
  },
  trend: [
    { hour: '2024-01-01T08:00', positive: 8,  negative: 3, sarcastic: 1, neutral: 5 },
    { hour: '2024-01-01T09:00', positive: 14, negative: 5, sarcastic: 2, neutral: 8 },
    { hour: '2024-01-01T10:00', positive: 10, negative: 9, sarcastic: 4, neutral: 6 },
    { hour: '2024-01-01T11:00', positive: 20, negative: 3, sarcastic: 1, neutral: 11 },
    { hour: '2024-01-01T12:00', positive: 18, negative: 6, sarcastic: 3, neutral: 9 },
    { hour: '2024-01-01T13:00', positive: 25, negative: 4, sarcastic: 5, neutral: 12 },
    { hour: '2024-01-01T14:00', positive: 30, negative: 7, sarcastic: 2, neutral: 14 },
    { hour: '2024-01-01T15:00', positive: 22, negative: 11, sarcastic: 6, neutral: 10 },
  ],
  data: DEMO_COMMENTS,
};

export const DEMO_LANG_SWITCH = [
  { hour: '2024-01-01T08:00', avg_switch_count: 1.2, comment_count: 8 },
  { hour: '2024-01-01T09:00', avg_switch_count: 2.1, comment_count: 14 },
  { hour: '2024-01-01T10:00', avg_switch_count: 1.8, comment_count: 12 },
  { hour: '2024-01-01T11:00', avg_switch_count: 2.5, comment_count: 20 },
  { hour: '2024-01-01T12:00', avg_switch_count: 3.0, comment_count: 18 },
  { hour: '2024-01-01T13:00', avg_switch_count: 2.3, comment_count: 16 },
  { hour: '2024-01-01T14:00', avg_switch_count: 1.5, comment_count: 22 },
];

export const DEMO_BRANDS = [
  { entity: 'product', count: 6 },
  { entity: 'delivery', count: 4 },
  { entity: 'quality', count: 4 },
  { entity: 'service', count: 3 },
  { entity: 'price', count: 3 },
  { entity: 'support', count: 2 },
  { entity: 'packaging', count: 2 },
];

export const DEMO_SOURCES = {
  heuristic_mvp: 10,
};

export const DEMO_RATIO_BANDS = {
  '0-25%': 4,
  '25-50%': 3,
  '50-75%': 1,
  '75-100%': 2,
};

export const DEMO_SENT_LANG_CORR = [
  { sentiment: 'positive', avg_english_ratio: 0.54, count: 4 },
  { sentiment: 'negative', avg_english_ratio: 0.32, count: 3 },
  { sentiment: 'sarcastic', avg_english_ratio: 0.85, count: 2 },
  { sentiment: 'neutral',   avg_english_ratio: 0.30, count: 1 },
];

export const DEMO_HEATMAP = Array.from({ length: 7 }, (_, day) =>
  Array.from({ length: 24 }, (_, hour) => ({
    day, hour, count: Math.floor(Math.random() * 12),
  }))
).flat();

// ── Context ────────────────────────────────────────────────────────────────
const DemoContext = createContext(null);

export function DemoProvider({ children }) {
  const [isDemoMode, setIsDemoMode] = useState(false);

  const activateDemo = useCallback(() => setIsDemoMode(true), []);
  const clearDemo    = useCallback(() => setIsDemoMode(false), []);

  return (
    <DemoContext.Provider value={{ isDemoMode, activateDemo, clearDemo }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used inside <DemoProvider>');
  return ctx;
}
