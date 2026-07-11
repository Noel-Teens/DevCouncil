import type { AgentEvent } from "../lib/types";
import { AGENT_INFO } from "../lib/types";

interface AgentMessageProps {
  event: AgentEvent;
  index?: number;
}

// Fix 4 — Severity badge styles
const SEVERITY_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  CRITICAL: { bg: "#3d0f0f", color: "#f87171", border: "#7f1d1d" },
  HIGH: { bg: "#2d1a0a", color: "#fb923c", border: "#7c2d12" },
  MEDIUM: { bg: "#2d2508", color: "#fbbf24", border: "#78350f" },
  LOW: { bg: "#0a1f2d", color: "#60a5fa", border: "#1e3a5f" },
};

// Debate type styles
const DEBATE_BORDERS: Record<string, string> = {
  CHALLENGE: "#ef4444",
  ESCALATING: "#f97316",
  CONFIRMING: "#22c55e",
  CONCEDING: "#3b82f6",
};

const DEBATE_LABELS: Record<string, { text: string; bg: string; color: string }> = {
  CHALLENGE: { text: "challenge", bg: "rgba(239,68,68,0.15)", color: "#f87171" },
  ESCALATING: { text: "escalation", bg: "rgba(249,115,22,0.15)", color: "#fb923c" },
  CONFIRMING: { text: "agreement", bg: "rgba(34,197,94,0.15)", color: "#86efac" },
  CONCEDING: { text: "concession", bg: "rgba(59,130,246,0.15)", color: "#93c5fd" },
};

/**
 * Format message content with severity badges, debate type borders,
 * and finding ID highlighting.
 */
function formatMessageContent(text: string): {
  formattedParts: React.ReactNode[];
  debateType: string | null;
  borderColor: string | null;
  debateLabel: { text: string; bg: string; color: string } | null;
} {
  // Detect debate type from first word
  const firstWord = text.split(/\s/)[0]?.replace(":", "").toUpperCase();
  const debateType = Object.keys(DEBATE_BORDERS).includes(firstWord) ? firstWord : null;
  const borderColor = debateType ? DEBATE_BORDERS[debateType] : null;
  const debateLabel = debateType ? DEBATE_LABELS[debateType] : null;

  // Process text into parts
  // 1. Replace [SEVERITY] with badges
  // 2. Highlight finding IDs
  const parts: React.ReactNode[] = [];

  // Split by severity tags and finding IDs
  const regex = /(\[(?:CRITICAL|HIGH|MEDIUM|LOW|INFO)\])|(\b(?:architect|security|code_reviewer|pm|qa|doc)_\d+\b)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const tempText = text;
  regex.lastIndex = 0;

  while ((match = regex.exec(tempText)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(tempText.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // Severity badge
      const level = match[1].replace(/[\[\]]/g, "");
      if (level === "INFO") {
        // Suppress INFO entirely
        lastIndex = regex.lastIndex;
        continue;
      }
      const style = SEVERITY_STYLES[level];
      if (style) {
        parts.push(
          <span
            key={`sev-${match.index}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              fontSize: "10px",
              fontWeight: 700,
              padding: "1px 6px",
              borderRadius: "4px",
              background: style.bg,
              color: style.color,
              border: `1px solid ${style.border}`,
              letterSpacing: "0.5px",
              verticalAlign: "middle",
            }}
          >
            {level}
          </span>
        );
      } else {
        parts.push(match[0]);
      }
    } else if (match[2]) {
      // Finding ID
      parts.push(
        <code
          key={`fid-${match.index}`}
          style={{
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: "11px",
            background: "rgba(255,255,255,0.08)",
            padding: "1px 5px",
            borderRadius: "3px",
            color: "#a5b4fc",
          }}
        >
          {match[2]}
        </code>
      );
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < tempText.length) {
    parts.push(tempText.slice(lastIndex));
  }

  return { formattedParts: parts.length > 0 ? parts : [text], debateType, borderColor, debateLabel };
}

export default function AgentMessage({ event, index = 0 }: AgentMessageProps) {
  const agentKey = event.agent_name || "consensus_director";
  const agentInfo = AGENT_INFO[agentKey] || {
    icon: "🤖",
    title: "System",
    color: "#8b5cf6",
    gradient: "linear-gradient(135deg, #8b5cf6, #6366f1)",
  };

  const data = event.data || {};
  const eventType = event.event_type;

  // Determine message content and style
  let messageContent: string;
  let messageStyle: "info" | "finding" | "challenge" | "success" | "error";

  switch (eventType) {
    case "agent_start":
      messageContent = data.message as string || `${agentInfo.title} is analyzing...`;
      messageStyle = "info";
      break;
    case "agent_complete":
      messageContent = `Analysis complete. Found ${data.finding_count || 0} issues.\n\n${data.summary || ""}`;
      messageStyle = "success";
      break;
    case "agent_failed":
      messageContent = data.message as string || "Agent failed.";
      messageStyle = "error";
      break;
    case "finding":
      messageContent = `[${data.severity}] ${data.category}: ${data.description}`;
      messageStyle = "finding";
      break;
    case "discussion_message": {
      const turn = data;
      const turnType = turn.turn_type as string;
      const prefix =
        turnType === "challenge"
          ? `⚔️ Challenges ${turn.target_agent || "another agent"}:`
          : turnType === "agree"
          ? "✅ Agrees:"
          : turnType === "concede"
          ? "🤝 Concedes:"
          : "💡 New finding:";
      messageContent = `${prefix} ${turn.message || ""}`;
      messageStyle = turnType === "challenge" ? "challenge" : "info";
      break;
    }
    case "status_update":
      messageContent = data.message as string || "Processing...";
      messageStyle = "info";
      break;
    case "consensus_start":
      messageContent = data.message as string || "Synthesizing final report...";
      messageStyle = "info";
      break;
    case "consensus_complete":
      messageContent = "⚖️ Consensus reached — see the Consensus Report tab.";
      messageStyle = "success";
      break;
    case "analysis_complete":
      messageContent = data.message as string || "Analysis complete.";
      messageStyle = "success";
      break;
    case "analysis_failed":
      messageContent = data.message as string || "Analysis failed.";
      messageStyle = "error";
      break;
    default:
      // Never dump a raw object into a chat bubble.
      messageContent = typeof data.message === "string" ? data.message : "";
      messageStyle = "info";
  }

  // Nothing meaningful to show (e.g. an unexpected structured event) — skip it.
  if (!messageContent) {
    return null;
  }

  const borderColorMap: Record<string, string> = {
    info: "var(--border)",
    finding: "rgba(234, 179, 8, 0.2)",
    challenge: "rgba(239, 68, 68, 0.2)",
    success: "rgba(34, 197, 94, 0.2)",
    error: "rgba(239, 68, 68, 0.3)",
  };

  const turnTypeStr = typeof data.turn_type === "string" ? data.turn_type : "";
  const confidenceVal = typeof data.confidence === "number" ? data.confidence : null;

  // Format the message with badges and highlights
  const { formattedParts, borderColor: debateBorder, debateLabel } =
    formatMessageContent(messageContent);

  return (
    <div
      className="animate-slide-in-right flex gap-3 p-3"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Avatar */}
      <div
        className="agent-avatar"
        style={{ background: agentInfo.gradient }}
      >
        {agentInfo.icon}
      </div>

      {/* Message */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold" style={{ color: agentInfo.color }}>
            {agentInfo.title}
          </span>
          {eventType === "discussion_message" && turnTypeStr && (
            <span className={`turn-badge turn-${turnTypeStr}`}>
              {turnTypeStr.replace("_", " ")}
            </span>
          )}
          {confidenceVal != null && (
            <span className="text-[10px] text-[var(--text-muted)] bg-[var(--surface)] px-1.5 py-0.5 rounded">
              {confidenceVal}% conf
            </span>
          )}
        </div>

        {/* Debate label pill */}
        {debateLabel && (
          <span
            style={{
              display: "inline-block",
              fontSize: "10px",
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: "10px",
              background: debateLabel.bg,
              color: debateLabel.color,
              marginBottom: "4px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {debateLabel.text}
          </span>
        )}

        <div
          className="text-sm text-[var(--text-secondary)] leading-relaxed rounded-lg p-3 border"
          style={{
            background: "var(--surface)",
            borderColor: debateBorder || borderColorMap[messageStyle],
            borderLeftWidth: debateBorder ? "3px" : undefined,
            borderLeftColor: debateBorder || undefined,
          }}
        >
          {formattedParts.map((part, i) => {
            if (typeof part === "string") {
              // Split string parts by newlines
              return part.split("\n").map((line, j) => (
                <span key={`${i}-${j}`}>
                  {line}
                  {j < part.split("\n").length - 1 && <br />}
                </span>
              ));
            }
            return part;
          })}
        </div>
      </div>
    </div>
  );
}
