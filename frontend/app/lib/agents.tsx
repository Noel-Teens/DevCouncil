import {
  Building2,
  ShieldAlert,
  ScanSearch,
  Scale,
  Bot,
  type LucideIcon,
} from "lucide-react";

export interface AgentMeta {
  name: string;
  title: string;
  role: string;
  color: string;
  Icon: LucideIcon;
}

export const AGENTS: Record<string, AgentMeta> = {
  architect: { name: "architect", title: "Architect", role: "structure / scale", color: "#5eb1ef", Icon: Building2 },
  security: { name: "security", title: "Security", role: "vulnerabilities", color: "#ff6b6b", Icon: ShieldAlert },
  code_reviewer: { name: "code_reviewer", title: "Code Reviewer", role: "quality / bugs", color: "#ffb454", Icon: ScanSearch },
  consensus_director: { name: "consensus_director", title: "Consensus Director", role: "the verdict", color: "#c6f24e", Icon: Scale },
};

export const AGENT_ORDER = ["architect", "security", "code_reviewer", "consensus_director"];

export function agentMeta(name?: string | null): AgentMeta {
  if (name && AGENTS[name]) return AGENTS[name];
  return { name: name || "system", title: name || "System", role: "", color: "#94a3b8", Icon: Bot };
}

/** Colored, icon-based agent avatar tile. Works in server or client components. */
export function AgentBadge({
  agent,
  size = 36,
  radius = 10,
  className = "",
  style = {},
}: {
  agent: string;
  size?: number;
  radius?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const m = agentMeta(agent);
  const Icon = m.Icon;
  return (
    <span
      className={`inline-flex items-center justify-center flex-shrink-0 border ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `${m.color}16`,
        color: m.color,
        borderColor: `${m.color}3d`,
        ...style,
      }}
    >
      <Icon size={Math.round(size * 0.5)} strokeWidth={2} />
    </span>
  );
}
