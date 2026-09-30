import { useEffect, useRef } from "react";
import { getStoredToken } from "../api/client";

export interface RealtimeEvent {
  event_type: string;
  payload: Record<string, unknown>;
}

const WS_BASE = import.meta.env.VITE_WS_BASE_URL ??
  `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`;

const POLL_INTERVAL_MS = 15000;
const RECONNECT_DELAY_MS = 3000;

/**
 * Live updates (new alert/recommendation, transfer status change) over the
 * Channels WebSocket, with a polling fallback for clients that can't hold a
 * WebSocket connection (CLAUDE.md: "degrade gracefully to polling"). Callers
 * pass one `onEvent` handler for pushed events and one `poll` function that
 * re-fetches the same data some other way — `poll` also runs once up front
 * so the UI has data before the socket connects.
 */
export function useRealtime(onEvent: (event: RealtimeEvent) => void, poll: () => void) {
  const onEventRef = useRef(onEvent);
  const pollRef = useRef(poll);
  useEffect(() => {
    onEventRef.current = onEvent;
    pollRef.current = poll;
  });

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;

    let socket: WebSocket | null = null;
    let pollTimer: number | null = null;
    let reconnectTimer: number | null = null;
    let stopped = false;

    function startPolling() {
      if (pollTimer !== null) return;
      pollRef.current();
      pollTimer = window.setInterval(() => pollRef.current(), POLL_INTERVAL_MS);
    }

    function stopPolling() {
      if (pollTimer !== null) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
    }

    function connect() {
      if (stopped) return;
      try {
        socket = new WebSocket(`${WS_BASE}/ws/notifications/?token=${token}`);
      } catch {
        startPolling();
        return;
      }

      socket.onopen = () => stopPolling();
      socket.onmessage = (message) => {
        try {
          onEventRef.current(JSON.parse(message.data));
        } catch {
          // Malformed payload — ignore rather than crash the UI.
        }
      };
      socket.onerror = () => socket?.close();
      socket.onclose = () => {
        if (stopped) return;
        startPolling(); // keep the UI live while a reconnect is attempted
        reconnectTimer = window.setTimeout(connect, RECONNECT_DELAY_MS);
      };
    }

    connect();

    return () => {
      stopped = true;
      stopPolling();
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, []);
}
