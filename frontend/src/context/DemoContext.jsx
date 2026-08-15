/**
 * DemoContext — global demo mode state shared across all pages.
 *
 * Provides a dynamic demo state. Analyzed custom comments are injected
 * into the mock datasets so they appear across all views.
 */
import { createContext, useCallback, useContext, useState, useMemo } from 'react';

// ── Initial Mock Data ───────────────────────────────────────────────────────
const INITIAL_COMMENTS = [
  {
    id: 'demo-1', platform_id: 'd1', page_id: 'demo-page',
    original_text: 'Bhai yeh product ekdum bakwaas hai, paise waste ho gaye mere!',
    translation: 'Brother, this product is absolute nonsense, my money got wasted!',
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
    original_text: 'Yaar yeh fraud company hai! Mera paisa wapas karo, bilkul cheating hai!',
    translation: 'Man, this is a fraud company! Return my money, this is absolute cheating!',
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

export const DEMO_HEATMAP = Array.from({ length: 7 }, (_, day) =>
  Array.from({ length: 24 }, (_, hour) => ({
    day, hour, count: Math.floor(Math.random() * 12),
  }))
).flat();

// ── Context ────────────────────────────────────────────────────────────────
const DemoContext = createContext(null);

export function DemoProvider({ children }) {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoComments, setDemoComments] = useState(INITIAL_COMMENTS);

  const activateDemo = useCallback(() => {
    setIsDemoMode(true);
    setDemoComments(INITIAL_COMMENTS);
  }, []);
  
  const clearDemo = useCallback(() => {
    setIsDemoMode(false);
  }, []);

  const injectCustomComment = useCallback((newComment) => {
    if (!isDemoMode) return;
    setDemoComments((prev) => {
      // Create a mock record extending the analysis result
      const mockRecord = {
        ...newComment,
        id: `demo-${Date.now()}`,
        platform_id: 'custom-demo',
        page_id: 'demo-page',
        translation: `[Simulated Translation] ${newComment.original_text}`,
        created_at: new Date().toISOString(),
      };
      return [mockRecord, ...prev];
    });
  }, [isDemoMode]);

  // Dynamically compute metrics from current demoComments
  const demoMetrics = useMemo(() => {
    const summary = {
      total_comments: demoComments.length,
      positive: 0,
      negative: 0,
      neutral: 0,
      sarcastic: 0,
      avg_english_ratio: 0,
      urgent_alerts: 0,
    };

    const ratioBands = { '0-25%': 0, '25-50%': 0, '50-75%': 0, '75-100%': 0 };
    const sentLangMap = {
      positive: { sum: 0, count: 0 },
      negative: { sum: 0, count: 0 },
      sarcastic: { sum: 0, count: 0 },
      neutral: { sum: 0, count: 0 },
    };
    const sources = { heuristic_mvp: 0, roberta: 0, llama: 0 };

    let totalEngRatio = 0;

    demoComments.forEach((c) => {
      // Summary
      if (summary[c.sentiment] !== undefined) summary[c.sentiment]++;
      if (c.sentiment === 'negative' || c.sentiment === 'sarcastic') {
        summary.urgent_alerts++;
      }
      
      // Ratios
      totalEngRatio += (c.english_ratio || 0);
      const ratio = c.english_ratio || 0;
      if (ratio <= 0.25) ratioBands['0-25%']++;
      else if (ratio <= 0.5) ratioBands['25-50%']++;
      else if (ratio <= 0.75) ratioBands['50-75%']++;
      else ratioBands['75-100%']++;

      // Correlation
      if (sentLangMap[c.sentiment]) {
        sentLangMap[c.sentiment].sum += ratio;
        sentLangMap[c.sentiment].count++;
      }

      // Sources
      if (c.inference_source) {
        sources[c.inference_source] = (sources[c.inference_source] || 0) + 1;
      } else {
        sources.heuristic_mvp++;
      }
    });

    summary.avg_english_ratio = demoComments.length > 0 ? (totalEngRatio / demoComments.length) : 0;

    const sentLangCorr = Object.entries(sentLangMap)
      .filter(([_, data]) => data.count > 0)
      .map(([sentiment, data]) => ({
        sentiment,
        avg_english_ratio: data.sum / data.count,
        count: data.count,
      }));

    // Trend (just a static mock shape since it's hard to make time-series dynamic instantly without history)
    const trend = [
      { hour: '2024-01-01T08:00', positive: 8, negative: 3, sarcastic: 1, neutral: 5 },
      { hour: '2024-01-01T09:00', positive: 14, negative: 5, sarcastic: 2, neutral: 8 },
      { hour: '2024-01-01T10:00', positive: 10, negative: 9, sarcastic: 4, neutral: 6 },
      { hour: '2024-01-01T11:00', positive: 20, negative: 3, sarcastic: 1, neutral: 11 },
      { hour: '2024-01-01T12:00', positive: 18, negative: 6, sarcastic: 3, neutral: 9 },
      { hour: '2024-01-01T13:00', positive: 25, negative: 4, sarcastic: 5, neutral: 12 },
      { hour: '2024-01-01T14:00', positive: 30, negative: 7, sarcastic: 2, neutral: 14 },
      // The last node includes the live sums
      { hour: 'Now', positive: summary.positive, negative: summary.negative, sarcastic: summary.sarcastic, neutral: summary.neutral },
    ];

    return {
      metricsData: { summary, trend, data: demoComments },
      ratioBands,
      sentLangCorr,
      sources,
    };
  }, [demoComments]);

  return (
    <DemoContext.Provider value={{ 
      isDemoMode, 
      activateDemo, 
      clearDemo, 
      injectCustomComment,
      demoComments,
      demoMetrics,
      // Pass-through static datasets
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
