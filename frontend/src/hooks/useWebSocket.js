import { useCallback, useEffect, useRef, useState } from 'react';
import { getWsUrl } from '../api/client';

export function useWebSocket(onMessage) {
  const [status, setStatus] = useState('connecting');
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);

  const connect = useCallback(() => {
    const wsUrl = getWsUrl();
    console.log('[WebSocket] Attempting to connect to:', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WebSocket] Connection established successfully');
      setStatus('live');
    };
    ws.onclose = (event) => {
      console.log(`[WebSocket] Connection closed. Code: ${event.code}, Reason: ${event.reason}`);
      setStatus('reconnecting');
      if (event.code === 1008) {
        // Auth failed, stop trying
        console.error('[WebSocket] Authentication failed (1008). Stopping reconnection attempts.');
        setStatus('disconnected');
      } else {
        console.log('[WebSocket] Scheduling reconnect in 3s...');
        reconnectRef.current = setTimeout(connect, 3000);
      }
    };
    ws.onerror = (error) => {
      console.error('[WebSocket] Error occurred:', error);
      setStatus('reconnecting');
    };
    ws.onmessage = (event) => {
      console.log('[WebSocket] Message received:', event.data);
      try {
        const msg = JSON.parse(event.data);
        onMessage(msg);
      } catch (err) {
        console.error('[WebSocket] Failed to parse message:', err);
      }
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
