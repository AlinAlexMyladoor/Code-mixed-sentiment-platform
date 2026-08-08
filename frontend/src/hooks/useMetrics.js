/**
 * useMetrics — composite hook that combines:
 *   1. Initial DB snapshot via REST poll (GET /api/metrics) — ensures dashboard
 *      populates immediately from historical/persisted data on page load.
 *   2. Live WebSocket stream — merges every `comment_processed` event
 *      (tagged `persisted: true` by the worker after DB commit) directly into
 *      local state, making the dashboard reactive without waiting for the poll cycle.
 *
 * This guarantees: data shown in real-time is ALSO already in PostgreSQL.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, getWsUrl } from '../api/client';

// Maximum number of recent comments to hold in memory for the dashboard feed.
const MAX_RECENT = 50;

/**
 * Merge a single newly-processed comment into an existing metrics snapshot.
 * Returns a new metrics object (immutable update).
 */
function mergeComment(metrics, comment) {
  if (!metrics) return metrics;

  const sentiment = comment.sentiment ?? 'neutral';
  const createdAt = comment.created_at ?? new Date().toISOString();

  // ── Update summary counters ─────────────────────────────────────────────
  const summary = {
    ...metrics.summary,
    total_comments: (metrics.summary.total_comments ?? 0) + 1,
    [sentiment]:    (metrics.summary[sentiment] ?? 0) + 1,
    urgent_alerts:
      sentiment === 'negative' || sentiment === 'sarcastic'
        ? (metrics.summary.urgent_alerts ?? 0) + 1
        : metrics.summary.urgent_alerts,
  };

  // Recalculate avg_english_ratio incrementally
  const n = summary.total_comments;
  const prevAvg = metrics.summary.avg_english_ratio ?? 0;
  const newRatio = comment.english_ratio ?? 0;
  summary.avg_english_ratio = parseFloat(
    ((prevAvg * (n - 1) + newRatio) / n).toFixed(3)
  );

  // ── Update hourly trend bucket ──────────────────────────────────────────
  const hourBucket = createdAt.slice(0, 13) + ':00:00';  // e.g. "2026-08-08T12:00:00"
  const trend = [...(metrics.trend ?? [])];
  const bucketIdx = trend.findIndex((b) => b.hour === hourBucket);
  if (bucketIdx >= 0) {
    const updated = { ...trend[bucketIdx] };
    updated[sentiment] = (updated[sentiment] ?? 0) + 1;
    trend[bucketIdx] = updated;
  } else {
    trend.push({
      hour:      hourBucket,
      positive:  0,
      negative:  0,
      neutral:   0,
      sarcastic: 0,
      [sentiment]: 1,
    });
  }

  // ── Prepend to recent comments list (cap at MAX_RECENT) ─────────────────
  const data = [comment, ...(metrics.data ?? [])].slice(0, MAX_RECENT);

  return { ...metrics, summary, trend, data };
}


export function useMetrics(pollingMs = 15000) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [wsStatus, setWsStatus] = useState('connecting');   // 'connecting' | 'live' | 'reconnecting' | 'disconnected'

  const intervalRef   = useRef(null);
  const wsRef         = useRef(null);
  const reconnectRef  = useRef(null);
  // Keep a ref to the latest metrics so the WS handler closure doesn't go stale.
  const metricsRef    = useRef(null);
  metricsRef.current  = metrics;

  // ── REST snapshot fetch ─────────────────────────────────────────────────
  const fetchSnapshot = useCallback(async () => {
    try {
      const data = await api.metrics();
      if (data.status === 'success') {
        setMetrics(data);
        setError(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── WebSocket live merge ────────────────────────────────────────────────
  const connectWs = useCallback(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setWsStatus('disconnected');
      return;
    }

    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => setWsStatus('live');

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        // Only merge events that are confirmed as persisted to PostgreSQL.
        if (msg.type === 'comment_processed' && msg.persisted === true && msg.data) {
          setMetrics((prev) => mergeComment(prev ?? metricsRef.current, msg.data));
        }
      } catch { /* ignore malformed frames */ }
    };

    ws.onclose = (e) => {
      setWsStatus('reconnecting');
      if (e.code === 1008) {
        // Auth error — stop reconnecting
        setWsStatus('disconnected');
      } else {
        reconnectRef.current = setTimeout(connectWs, 3000);
      }
    };

    ws.onerror = () => setWsStatus('reconnecting');
  }, []);

  // ── Mount / unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    // 1. Fetch DB snapshot immediately so the dashboard is never blank.
    fetchSnapshot();

    // 2. Start polling to keep the snapshot fresh (catches any missed WS events).
    intervalRef.current = setInterval(fetchSnapshot, pollingMs);

    // 3. Open the live WebSocket stream.
    connectWs();

    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(reconnectRef.current);
      const ws = wsRef.current;
      if (ws) {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.onopen = () => ws.close();
        } else {
          ws.close();
        }
      }
    };
  }, [fetchSnapshot, connectWs, pollingMs]);

  return { metrics, loading, error, refetch: fetchSnapshot, wsStatus };
}
