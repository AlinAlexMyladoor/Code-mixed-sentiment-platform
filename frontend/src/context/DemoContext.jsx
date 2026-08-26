/**
 * DemoContext — global, persistent demo mode state shared across all pages.
 *
 * State is persisted to localStorage so that demo data, custom comments,
 * and the demo-mode flag all survive page refreshes and navigation.
 */
import { createContext, useCallback, useContext, useState, useMemo, useEffect } from 'react';

const STORAGE_KEY = 'swarasense_demo';

// ── Initial Mock Data ───────────────────────────────────────────────────────
export const INITIAL_DEMO_COMMENTS = [
  {
    id: 'demo-1', platform_id: 'd1', page_id: 'demo-page',
    original_text: 'Bhai yeh product ekdum broken hai, mera refund karo!',
    translation: 'Brother, this product is absolutely broken, refund me!',
    sentiment: 'negative', confidence: 0.91, english_ratio: 0.28,
    language_switch_count: 3, sarcasm_score: 0.05,
    inference_source: 'heuristic_mvp',
    created_at: new Date(Date.now() - 2 * 60000).toISOString(),
  },
  {
    id: 'demo-2', platform_id: 'd2', page_id: 'demo-page',
    original_text: 'Superb quality da! Romba nalla irukku, next time also buy pannuven.',
    translation: 'Superb quality man! It is very good, I will buy it next time also.',
    sentiment: 'positive', confidence: 0.89, english_ratio: 0.22,
    language_switch_count: 4, sarcasm_score: 0.02,
    inference_source: 'heuristic_mvp',
    created_at: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: 'demo-3', platform_id: 'd3', page_id: 'demo-page',
    original_text: 'Oh wow, delivery in 10 days for a "same-day" order. Truly impressive service!',
    translation: 'Oh wow, delivery in 10 days for a "same-day" order. Truly impressive service!',
    sentiment: 'sarcastic', confidence: 0.87, english_ratio: 0.88,
    language_switch_count: 0, sarcasm_score: 0.82,
    inference_source: 'heuristic_mvp',
    created_at: new Date(Date.now() - 8 * 60000).toISOString(),
  },
  {
    id: 'demo-4', platform_id: 'd4', page_id: 'demo-page',
    original_text: 'Order pandren, packaging okay okay aa irukku. Edho okay aagum.',
    translation: 'I am ordering, packaging looks okay-okay. Something will be okay.',
    sentiment: 'neutral', confidence: 0.75, english_ratio: 0.30,
    language_switch_count: 2, sarcasm_score: 0.08,
    inference_source: 'heuristic_mvp',
    created_at: new Date(Date.now() - 12 * 60000).toISOString(),
  },
  {
    id: 'demo-5', platform_id: 'd5', page_id: 'demo-page',
    original_text: 'Yaar yeh scam hai! Worst support ever, bilkul cheating hai!',
    translation: 'Man, this is a scam! Worst support ever, absolute cheating!',
    sentiment: 'negative', confidence: 0.95, english_ratio: 0.32,
    language_switch_count: 3, sarcasm_score: 0.10,
    inference_source: 'heuristic_mvp',
    created_at: new Date(Date.now() - 18 * 60000).toISOString(),
  },
  {
    id: 'demo-6', platform_id: 'd6', page_id: 'demo-page',
    original_text: 'Kollam da! Price um reasonable, quality um good. Full paisa vasool!',
    translation: 'Great man! Price is reasonable, quality is good. Full value for money!',
    sentiment: 'positive', confidence: 0.88, english_ratio: 0.25,
    language_switch_count: 3, sarcasm_score: 0.03,
    inference_source: 'heuristic_mvp',
    created_at: new Date(Date.now() - 25 * 60000).toISOString(),
  },
  {
    id: 'demo-7', platform_id: 'd7', page_id: 'demo-page',
    original_text: 'Service too slow yaar, 3 ghante se wait kar raha hoon. Kab aayega?',
    translation: 'Service is too slow man, I have been waiting for 3 hours. When will it come?',
    sentiment: 'negative', confidence: 0.82, english_ratio: 0.35,
    language_switch_count: 2, sarcasm_score: 0.12,
    inference_source: 'heuristic_mvp',
    created_at: new Date(Date.now() - 35 * 60000).toISOString(),
  },
  {
    id: 'demo-8', platform_id: 'd8', page_id: 'demo-page',
    original_text: 'Amazing customer support! They resolved my issue within minutes. Highly recommended!',
    translation: 'Amazing customer support! They resolved my issue within minutes. Highly recommended!',
    sentiment: 'positive', confidence: 0.93, english_ratio: 0.95,
    language_switch_count: 0, sarcasm_score: 0.04,
    inference_source: 'heuristic_mvp',
    created_at: new Date(Date.now() - 45 * 60000).toISOString(),
  },
  {
    id: 'demo-9', platform_id: 'd9', page_id: 'demo-page',
    original_text: 'Yeah right, "premium quality" they said. Box came crushed. So premium!',
    translation: 'Yeah right, "premium quality" they said. Box came crushed. So premium!',
    sentiment: 'sarcastic', confidence: 0.90, english_ratio: 0.92,
    language_switch_count: 0, sarcasm_score: 0.78,
    inference_source: 'heuristic_mvp',
    created_at: new Date(Date.now() - 60 * 60000).toISOString(),
  },
  {
    id: 'demo-10', platform_id: 'd10', page_id: 'demo-page',
    original_text: 'Enna da ithu, rate konjam jaasthi thaan but quality first class!',
    translation: 'What is this man, the price is a bit high but quality is first class!',
    sentiment: 'positive', confidence: 0.80, english_ratio: 0.18,
    language_switch_count: 2, sarcasm_score: 0.06,
    inference_source: 'heuristic_mvp',
    created_at: new Date(Date.now() - 75 * 60000).toISOString(),
  },
];

export const DEMO_LANG_SWITCH = [
  { hour: '2024-01-01T08:00', avg_switches: 1.2, avg_en_ratio: 0.35, comment_count: 8 },
  { hour: '2024-01-01T09:00', avg_switches: 2.1, avg_en_ratio: 0.42, comment_count: 14 },
  { hour: '2024-01-01T10:00', avg_switches: 1.8, avg_en_ratio: 0.38, comment_count: 12 },
  { hour: '2024-01-01T11:00', avg_switches: 2.5, avg_en_ratio: 0.48, comment_count: 20 },
  { hour: '2024-01-01T12:00', avg_switches: 3.0, avg_en_ratio: 0.55, comment_count: 18 },
  { hour: '2024-01-01T13:00', avg_switches: 2.3, avg_en_ratio: 0.45, comment_count: 16 },
  { hour: '2024-01-01T14:00', avg_switches: 1.5, avg_en_ratio: 0.39, comment_count: 22 },
];

export const DEMO_BRANDS = [
  { brand: 'Swara Brand', count: 6, sentiment_breakdown: { positive: 3, neutral: 1, sarcastic: 1, negative: 1 } },
  { brand: 'Competitor A', count: 4, sentiment_breakdown: { positive: 1, neutral: 1, sarcastic: 1, negative: 1 } },
  { brand: 'Local Brand X', count: 4, sentiment_breakdown: { positive: 2, neutral: 0, sarcastic: 1, negative: 1 } },
  { brand: 'Competitor B', count: 3, sentiment_breakdown: { positive: 0, neutral: 1, sarcastic: 0, negative: 2 } },
  { brand: 'Brand Y', count: 3, sentiment_breakdown: { positive: 1, neutral: 1, sarcastic: 1, negative: 0 } },
];

// ── Helper: load from / save to localStorage ────────────────────────────────
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { isDemoMode: false, demoComments: [] };
    return JSON.parse(raw);
  } catch {
    return { isDemoMode: false, demoComments: [] };
  }
}

function saveToStorage(isDemoMode, demoComments) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ isDemoMode, demoComments }));
  } catch { /* ignore */ }
}

// ── Derived metrics from a list of comments ─────────────────────────────────
export function computeMetrics(comments) {
  const summary = {
    total_comments: comments.length,
    positive: 0, negative: 0, neutral: 0, sarcastic: 0,
    avg_english_ratio: 0, urgent_alerts: 0,
  };
  const ratioBands = {
    '0-25%':   { positive: 0, negative: 0, neutral: 0, sarcastic: 0 },
    '25-50%':  { positive: 0, negative: 0, neutral: 0, sarcastic: 0 },
    '50-75%':  { positive: 0, negative: 0, neutral: 0, sarcastic: 0 },
    '75-100%': { positive: 0, negative: 0, neutral: 0, sarcastic: 0 },
  };
  const sentLangMap = {
    positive:  { sumEng: 0, sumSw: 0, count: 0 },
    negative:  { sumEng: 0, sumSw: 0, count: 0 },
    sarcastic: { sumEng: 0, sumSw: 0, count: 0 },
    neutral:   { sumEng: 0, sumSw: 0, count: 0 },
  };
  const sources = {};
  let totalEngRatio = 0;

  comments.forEach((c) => {
    if (summary[c.sentiment] !== undefined) summary[c.sentiment]++;
    if (c.sentiment === 'negative' || c.sentiment === 'sarcastic') summary.urgent_alerts++;

    const ratio = c.english_ratio || 0;
    totalEngRatio += ratio;

    let bandKey = '75-100%';
    if (ratio <= 0.25) bandKey = '0-25%';
    else if (ratio <= 0.5) bandKey = '25-50%';
    else if (ratio <= 0.75) bandKey = '50-75%';
    if (ratioBands[bandKey]?.[c.sentiment] !== undefined) ratioBands[bandKey][c.sentiment]++;

    if (sentLangMap[c.sentiment]) {
      sentLangMap[c.sentiment].sumEng += ratio;
      sentLangMap[c.sentiment].sumSw += (c.language_switch_count || 0);
      sentLangMap[c.sentiment].count++;
    }

    const src = c.inference_source || 'heuristic_mvp';
    sources[src] = (sources[src] || 0) + 1;
  });

  summary.avg_english_ratio = comments.length > 0 ? totalEngRatio / comments.length : 0;

  const sentLangCorr = Object.entries(sentLangMap)
    .filter(([, d]) => d.count > 0)
    .map(([sentiment, d]) => ({
      sentiment,
      avg_en_ratio: d.sumEng / d.count,
      avg_switches: d.sumSw / d.count,
      count: d.count,
    }));

  const trend = [
    { hour: '08:00', positive: 8,  negative: 3, sarcastic: 1, neutral: 5 },
    { hour: '09:00', positive: 14, negative: 5, sarcastic: 2, neutral: 8 },
    { hour: '10:00', positive: 10, negative: 9, sarcastic: 4, neutral: 6 },
    { hour: '11:00', positive: 20, negative: 3, sarcastic: 1, neutral: 11 },
    { hour: '12:00', positive: 18, negative: 6, sarcastic: 3, neutral: 9 },
    { hour: '13:00', positive: 25, negative: 4, sarcastic: 5, neutral: 12 },
    { hour: '14:00', positive: 30, negative: 7, sarcastic: 2, neutral: 14 },
    { hour: 'Live',  positive: summary.positive, negative: summary.negative, sarcastic: summary.sarcastic, neutral: summary.neutral },
  ];

  return {
    metricsData: { summary, trend, data: comments },
    ratioBands,
    sentLangCorr,
    sources,
  };
}

// ── Context ────────────────────────────────────────────────────────────────
const DemoContext = createContext(null);

export function DemoProvider({ children }) {
  const stored = loadFromStorage();
  const [isDemoMode, setIsDemoMode] = useState(stored.isDemoMode);
  const [demoComments, setDemoComments] = useState(
    stored.isDemoMode && stored.demoComments.length > 0
      ? stored.demoComments
      : []
  );

  // Persist to storage whenever state changes
  useEffect(() => {
    saveToStorage(isDemoMode, demoComments);
  }, [isDemoMode, demoComments]);

  const activateDemo = useCallback(() => {
    setIsDemoMode(true);
    setDemoComments(INITIAL_DEMO_COMMENTS);
  }, []);

  const clearDemo = useCallback(() => {
    setIsDemoMode(false);
    setDemoComments([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  /**
   * Add a custom analyzed comment to the pool.
   * Works in both demo mode and standalone (non-demo) mode.
   * The `rawResult` is the object returned from api.analyze().
   */
  const injectCustomComment = useCallback((rawResult) => {
    const newComment = {
      // Normalize: api returns `text`, db stores as `original_text`
      original_text: rawResult.original_text || rawResult.text || '',
      translation: `[Simulated Translation] ${rawResult.original_text || rawResult.text || ''}`,
      sentiment: rawResult.sentiment,
      confidence: rawResult.confidence,
      english_ratio: rawResult.english_ratio,
      language_switch_count: rawResult.language_switch_count,
      sarcasm_score: rawResult.sarcasm_score,
      inference_source: rawResult.inference_source,
      extracted_entities: rawResult.extracted_entities || [],
      regional_tokens_found: rawResult.regional_tokens_found || [],
      id: `custom-${Date.now()}`,
      platform_id: 'custom',
      page_id: 'custom-analysis',
      created_at: new Date().toISOString(),
    };
    setDemoComments((prev) => [newComment, ...prev]);
    if (!isDemoMode) setIsDemoMode(true);
  }, [isDemoMode]);

  // Dynamically compute all analytics metrics from the current comment set
  const demoMetrics = useMemo(() => computeMetrics(demoComments), [demoComments]);

  return (
    <DemoContext.Provider value={{
      isDemoMode,
      activateDemo,
      clearDemo,
      injectCustomComment,
      demoComments,
      demoMetrics,
      demoLangSwitch: DEMO_LANG_SWITCH,
      demoBrands: DEMO_BRANDS,
    }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used inside <DemoProvider>');
  return ctx;
}
