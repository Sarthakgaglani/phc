import type { RiskLevel } from "../../types";

const LABELS: Record<RiskLevel, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  safe: "Safe",
};

/**
 * The one place risk-level colors are applied. Every dashboard, alert list,
 * and (later) recommendation card renders risk through this component so
 * the color coding stays identical everywhere (CLAUDE.md UI/UX requirement).
 */
export function StatusBadge({ level, label }: { level: RiskLevel; label?: string }) {
  return (
    <span className={`risk-pill risk-pill-${level}`}>
      <span className="risk-pill-dot" />
      <span>{label ?? LABELS[level]}</span>
    </span>
  );
}
