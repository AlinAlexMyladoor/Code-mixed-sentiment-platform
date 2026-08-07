import { useCallback, useEffect, useRef, useState } from 'react';
import { WS_URL } from '../api/client';

export function useWebSocket(onMessage) {
  const [status, setStatus] = useState('connecting');
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);

  const connect = useCallback(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setStatus('live');
    ws.onclose = () => {
      setStatus('reconnecting');
      reconnectRef.current = setTimeout(connect, 3000);
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
      wsRef.current?.close();
    };
  }, [connect]);

  return status;
}
