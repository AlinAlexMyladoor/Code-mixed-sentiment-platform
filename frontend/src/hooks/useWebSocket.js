import { useCallback, useEffect, useRef, useState } from 'react';
import { getWsUrl } from '../api/client';

export function useWebSocket(onMessage) {
  const [status, setStatus] = useState('connecting');
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);

  const connect = useCallback(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setStatus('disconnected');
      return;
    }

    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => setStatus('live');
    ws.onclose = (event) => {
      setStatus('reconnecting');
      if (event.code === 1008) {
        // Auth failed, stop trying
        setStatus('disconnected');
      } else {
        reconnectRef.current = setTimeout(connect, 3000);
      }
    };
    ws.onerror = () => {
      setStatus('reconnecting');
    };
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        onMessage(msg);
      } catch { /* ignore */ }
    };
  }, [onMessage]);

  useEffect(() => {
    connect();
    return () => {
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
  }, [connect]);

  return status;
}
