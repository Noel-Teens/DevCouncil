import type { Severity } from "../lib/types";
import { SEVERITY_CONFIG } from "../lib/types";

interface SeverityBadgeProps {
  severity: Severity;
  size?: "sm" | "md";
}

export default function SeverityBadge({ severity, size = "md" }: SeverityBadgeProps) {
  const config = SEVERITY_CONFIG[severity];
  const className = `severity-badge severity-${severity.toLowerCase()}`;

  return (
    <span
      className={className}
      style={{
        fontSize: size === "sm" ? "10px" : "11px",
        padding: size === "sm" ? "2px 6px" : "4px 10px",
      }}
    >
      <span
        style={{
          width: size === "sm" ? 5 : 6,
          height: size === "sm" ? 5 : 6,
          borderRadius: "50%",
          backgroundColor: config.color,
          display: "inline-block",
          boxShadow: `0 0 6px ${config.color}`,
        }}
      />
      {config.label}
    </span>
  );
}
