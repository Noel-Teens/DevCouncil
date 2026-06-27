import type { ConflictResolution } from "../lib/types";
import { AGENT_INFO } from "../lib/types";

interface ConflictResolutionCardProps {
  conflict: ConflictResolution;
  index?: number;
}

export default function ConflictResolutionCard({
  conflict,
  index = 0,
}: ConflictResolutionCardProps) {
  const agentA = AGENT_INFO[conflict.agent_a] || { icon: "🤖", title: conflict.agent_a, color: "#8b5cf6" };
  const agentB = AGENT_INFO[conflict.agent_b] || { icon: "🤖", title: conflict.agent_b, color: "#8b5cf6" };
  const winner = AGENT_INFO[conflict.winner] || { icon: "🤖", title: conflict.winner, color: "#22c55e" };

  return (
    <div
      className="glass-card p-5 animate-fade-in-up"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Agents involved */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{agentA.icon}</span>
          <span
            className="text-sm font-semibold"
            style={{
              color: agentA.color,
              textDecoration: conflict.winner !== conflict.agent_a ? "line-through" : "none",
              opacity: conflict.winner !== conflict.agent_a ? 0.5 : 1,
            }}
          >
            {agentA.title}
          </span>
        </div>

        <span className="text-[var(--text-muted)] text-xs">vs</span>

        <div className="flex items-center gap-2">
          <span className="text-lg">{agentB.icon}</span>
          <span
            className="text-sm font-semibold"
            style={{
              color: agentB.color,
              textDecoration: conflict.winner !== conflict.agent_b ? "line-through" : "none",
              opacity: conflict.winner !== conflict.agent_b ? 0.5 : 1,
            }}
          >
            {agentB.title}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20">
            🏆 {winner.title} wins
          </span>
        </div>
      </div>

      {/* Resolution reason */}
      <div className="bg-[var(--surface)] rounded-lg p-4 border border-[var(--border)]">
        <div className="text-xs font-semibold text-[var(--accent)] mb-2 uppercase tracking-wide">
          ⚖️ Resolution
        </div>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          {conflict.reason}
        </p>
      </div>

      {/* Related findings */}
      {conflict.finding_ids.length > 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span>Related findings:</span>
          {conflict.finding_ids.map((id) => (
            <span key={id} className="bg-[var(--surface)] px-2 py-0.5 rounded font-mono">
              {id}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
