import type { AgentEvent } from "../lib/types";
import { AGENT_INFO } from "../lib/types";

interface AgentMessageProps {
  event: AgentEvent;
  index?: number;
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
    default:
      messageContent = data.message as string || JSON.stringify(data);
      messageStyle = "info";
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
        <div
          className="text-sm text-[var(--text-secondary)] leading-relaxed rounded-lg p-3 border"
          style={{
            background: "var(--surface)",
            borderColor: borderColorMap[messageStyle],
          }}
        >
          {messageContent.split("\n").map((line, i) => (
            <span key={i}>
              {line}
              {i < messageContent.split("\n").length - 1 && <br />}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
