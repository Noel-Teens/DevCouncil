/**
 * EventSource wrapper with typed event parsing and auto-reconnection.
 */

import type { AgentEvent, EventType } from "./types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export type EventCallback = (event: AgentEvent) => void;
export type ErrorCallback = (error: Event) => void;

export function connectToAnalysis(
  analysisId: string,
  onEvent: EventCallback,
  onError?: ErrorCallback,
  onDone?: () => void
): () => void {
  const url = `${BACKEND_URL}/api/analysis/${analysisId}/stream`;
  const eventSource = new EventSource(url);

  // Listen for all named events
  const eventTypes: EventType[] = [
    "status_update",
    "agent_start",
    "agent_complete",
    "agent_failed",
    "finding",
    "discussion_message",
    "consensus_start",
    "consensus_complete",
    "analysis_complete",
    "analysis_failed",
    "error",
  ];

  for (const eventType of eventTypes) {
    eventSource.addEventListener(eventType, (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        onEvent(data as AgentEvent);
      } catch (err) {
        console.error(`Failed to parse SSE event: ${eventType}`, err);
      }
    });
  }

  // Listen for the done event
  eventSource.addEventListener("done", () => {
    eventSource.close();
    onDone?.();
  });

  // Handle keepalive silently
  eventSource.addEventListener("keepalive", () => {
    // No-op, just keeps connection alive
  });

  // Fallback for untyped messages
  eventSource.onmessage = (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data);
      onEvent(data as AgentEvent);
    } catch {
      // Ignore unparseable messages
    }
  };

  eventSource.onerror = (e: Event) => {
    if (eventSource.readyState === EventSource.CLOSED) {
      onDone?.();
    } else {
      onError?.(e);
    }
  };

  // Return cleanup function
  return () => {
    eventSource.close();
  };
}
