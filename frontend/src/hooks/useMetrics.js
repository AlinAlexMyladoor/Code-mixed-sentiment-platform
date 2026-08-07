import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

export function useMetrics(pollingMs = 15000) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetch = useCallback(async () => {
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

  useEffect(() => {
    fetch();
    intervalRef.current = setInterval(fetch, pollingMs);
    return () => clearInterval(intervalRef.current);
  }, [fetch, pollingMs]);

  return { metrics, loading, error, refetch: fetch };
}
