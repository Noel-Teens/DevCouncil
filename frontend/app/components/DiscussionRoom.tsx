"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { AgentEvent } from "../lib/types";
import { AgentBadge, AGENT_ORDER } from "../lib/agents";
import { connectToAnalysis } from "../lib/sse";
import AgentMessage from "./AgentMessage";

interface DiscussionRoomProps {
  analysisId: string;
  onComplete?: () => void;
  // When the analysis is already finished, the parent passes the stored
  // transcript so we render it statically instead of reconnecting to a dead
  // SSE stream (which would just hang on "Waiting for agents...").
  staticEvents?: AgentEvent[] | null;
}

export default function DiscussionRoom({ analysisId, onComplete, staticEvents }: DiscussionRoomProps) {
  const isStatic = staticEvents != null;
  const [events, setEvents] = useState<AgentEvent[]>(staticEvents ?? []);
  const [isStreaming, setIsStreaming] = useState(!isStatic);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "done" | "error">(
    isStatic ? "done" : "connecting"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const onCompleteRef = useRef(onComplete);

  // Keep the ref in sync without causing re-connections
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // If the transcript is supplied (completed analysis), render it and skip SSE.
  useEffect(() => {
    if (staticEvents != null) {
      setEvents(staticEvents);
      setIsStreaming(false);
      setConnectionStatus("done");
    }
  }, [staticEvents]);

  const connect = useCallback(() => {
    // Clean up previous connection if any
    cleanupRef.current?.();
    setConnectionStatus("connecting");
    setErrorMessage(null);

    const cleanup = connectToAnalysis(
      analysisId,
      (event) => {
        setEvents((prev) => [...prev, event]);
        setConnectionStatus("connected");

        // Handle terminal events
        if (event.event_type === "analysis_failed") {
          setIsStreaming(false);
          setConnectionStatus("done");
          setErrorMessage(
            (event.data?.message as string) || "Analysis failed"
          );
          onCompleteRef.current?.();
        } else if (event.event_type === "analysis_complete") {
          setIsStreaming(false);
          setConnectionStatus("done");
          onCompleteRef.current?.();
        } else if (event.event_type === "consensus_complete") {
          // Consensus is ready — also mark streaming as done
          setIsStreaming(false);
          setConnectionStatus("done");
          onCompleteRef.current?.();
        }
      },
      () => {
        setConnectionStatus("error");
        setErrorMessage("Lost connection to the analysis stream.");
      },
      () => {
        setIsStreaming(false);
        setConnectionStatus("done");
      }
    );

    cleanupRef.current = cleanup;
  }, [analysisId]);

  useEffect(() => {
    if (isStatic) return; // completed analysis — nothing to stream
    connect();
    return () => {
      cleanupRef.current?.();
    };
  }, [connect, isStatic]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  // Filter out non-message events. consensus_complete / analysis_complete carry
  // report/terminal payloads (handled by the report tab + terminal logic above),
  // not chat content — rendering them here would dump raw JSON into a bubble.
  const HIDDEN_EVENTS = new Set([
    "keepalive",
    "done",
    "consensus_complete",
    "analysis_complete",
  ]);
  const visibleEvents = events.filter((e) => !HIDDEN_EVENTS.has(e.event_type));

  return (
    <div className="glass-card flex flex-col h-full" id="discussion-room">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]">
        <div className="flex items-center gap-3.5">
          {/* Participant stack */}
          <div className="flex -space-x-2">
            {AGENT_ORDER.map((p) => (
              <AgentBadge
                key={p}
                agent={p}
                size={28}
                radius={8}
                style={{ boxShadow: "0 0 0 2px var(--surface)" }}
              />
            ))}
          </div>
          <div>
            <h2 className="font-display text-[15px] font-semibold text-[var(--text-primary)] leading-none">
              Discussion Room
            </h2>
            <span className="mono text-[10px] text-[var(--text-muted)]">
              {visibleEvents.length} events · 4 participants
            </span>
          </div>
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

      {/* Error banner */}
      {connectionStatus === "error" && (
        <div className="flex items-center justify-between gap-3 px-5 py-3 bg-red-500/8 border-b border-red-500/15 animate-fade-in">
          <div className="flex items-center gap-2 text-sm text-red-400">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span>{errorMessage || "Connection lost. Events may have been missed."}</span>
          </div>
          <button
            onClick={connect}
            className="text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] bg-[var(--accent)]/10 px-3 py-1 rounded-full transition-colors"
          >
            Reconnect
          </button>
        </div>
      )}

      {/* Failure banner (analysis itself failed) */}
      {errorMessage && connectionStatus === "done" && (
        <div className="flex items-center gap-2 px-5 py-3 bg-red-500/8 border-b border-red-500/15 animate-fade-in">
          <svg className="w-4 h-4 flex-shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
          </svg>
          <span className="text-sm text-red-400">{errorMessage}</span>
        </div>
      )}

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

        {visibleEvents.length === 0 && !isStreaming && (
          <div className="flex items-center justify-center h-32 text-[var(--text-muted)] text-sm">
            No discussion was recorded for this analysis.
          </div>
        )}

        {visibleEvents.map((event, idx) => (
          <AgentMessage key={idx} event={event} index={idx} />
        ))}
      </div>
    </div>
  );
}
