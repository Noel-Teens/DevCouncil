import type { ConflictResolution } from "../lib/types";
import { AgentBadge, agentMeta } from "../lib/agents";
import { Gavel, Trophy } from "lucide-react";

interface ConflictResolutionCardProps {
  conflict: ConflictResolution;
  index?: number;
}

export default function ConflictResolutionCard({
  conflict,
  index = 0,
}: ConflictResolutionCardProps) {
  const agentA = agentMeta(conflict.agent_a);
  const agentB = agentMeta(conflict.agent_b);
  const winner = agentMeta(conflict.winner);

  const nameStyle = (isWinner: boolean, color: string) => ({
    color,
    textDecoration: isWinner ? "none" : ("line-through" as const),
    opacity: isWinner ? 1 : 0.45,
  });

  return (
    <div className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
      {/* Agents involved */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <AgentBadge agent={conflict.agent_a} size={26} radius={7} />
          <span className="text-sm font-semibold" style={nameStyle(conflict.winner === conflict.agent_a, agentA.color)}>
            {agentA.title}
          </span>
        </div>

        <span className="mono text-[10px] uppercase tracking-widest text-[var(--text-faint)]">vs</span>

        <div className="flex items-center gap-2">
          <AgentBadge agent={conflict.agent_b} size={26} radius={7} />
          <span className="text-sm font-semibold" style={nameStyle(conflict.winner === conflict.agent_b, agentB.color)}>
            {agentB.title}
          </span>
        </div>

        <span
          className="ml-auto flex items-center gap-1.5 mono text-[11px] font-semibold px-2.5 py-1 rounded-md"
          style={{ color: "var(--accent)", background: "var(--accent-quiet)", border: "1px solid var(--accent-line)" }}
        >
          <Trophy size={12} /> {winner.title} wins
        </span>
      </div>

      {/* Resolution reason */}
      <div className="rounded-xl p-4 border border-[var(--border)]" style={{ background: "rgba(255,255,255,0.015)", borderLeft: "2px solid var(--accent-line)" }}>
        <div className="eyebrow mb-2 flex items-center gap-1.5" style={{ color: "var(--accent)" }}>
          <Gavel size={12} /> Resolution
        </div>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{conflict.reason}</p>
      </div>

      {/* Related findings */}
      {conflict.finding_ids.length > 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-muted)] flex-wrap">
          <span className="mono text-[10px] uppercase tracking-wider text-[var(--text-faint)]">related</span>
          {conflict.finding_ids.map((id) => (
            <span key={id} className="mono text-[11px] border border-[var(--border)] px-2 py-0.5 rounded" style={{ color: "#a5b4fc" }}>
              {id}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
