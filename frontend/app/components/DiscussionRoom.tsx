"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentEvent } from "../lib/types";
import { connectToAnalysis } from "../lib/sse";
import AgentMessage from "./AgentMessage";

interface DiscussionRoomProps {
  analysisId: string;
  onComplete?: () => void;
}

export default function DiscussionRoom({ analysisId, onComplete }: DiscussionRoomProps) {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "done" | "error">("connecting");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setConnectionStatus("connected");

    const cleanup = connectToAnalysis(
      analysisId,
      (event) => {
        setEvents((prev) => [...prev, event]);

        // Check for completion events
        if (
          event.event_type === "analysis_complete" ||
          event.event_type === "analysis_failed" ||
          event.event_type === "consensus_complete"
        ) {
          if (event.event_type !== "consensus_complete") {
            setIsStreaming(false);
            setConnectionStatus("done");
          }
          onComplete?.();
        }
      },
      () => {
        setConnectionStatus("error");
      },
      () => {
        setIsStreaming(false);
        setConnectionStatus("done");
      }
    );

    return cleanup;
  }, [analysisId, onComplete]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  // Filter out keepalive and show meaningful events
  const visibleEvents = events.filter(
    (e) => e.event_type !== "keepalive" && e.event_type !== "done"
  );

  return (
    <div className="glass-card flex flex-col h-full" id="discussion-room">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Discussion Room
          </h2>
          <span className="text-xs text-[var(--text-muted)] bg-[var(--surface)] px-2 py-0.5 rounded-full">
            {visibleEvents.length} events
          </span>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor:
                connectionStatus === "connected"
                  ? "#22c55e"
                  : connectionStatus === "done"
                  ? "#3b82f6"
                  : connectionStatus === "error"
                  ? "#ef4444"
                  : "#eab308",
              boxShadow:
                connectionStatus === "connected"
                  ? "0 0 8px rgba(34, 197, 94, 0.5)"
                  : "none",
              animation: isStreaming ? "pulse-glow 2s infinite" : "none",
            }}
          />
          <span className="text-xs text-[var(--text-muted)]">
            {connectionStatus === "connected"
              ? "Live"
              : connectionStatus === "done"
              ? "Complete"
              : connectionStatus === "error"
              ? "Disconnected"
              : "Connecting..."}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-1"
        style={{ maxHeight: "calc(100vh - 250px)" }}
      >
        {visibleEvents.length === 0 && isStreaming && (
          <div className="flex items-center justify-center h-32 text-[var(--text-muted)]">
            <div className="flex flex-col items-center gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
              <span className="text-sm">Waiting for agents...</span>
            </div>
          </div>
        )}

        {visibleEvents.map((event, idx) => (
          <AgentMessage key={idx} event={event} index={idx} />
        ))}
      </div>
    </div>
  );
}
