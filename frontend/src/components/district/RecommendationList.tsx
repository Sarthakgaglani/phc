import { StatusBadge } from "../common/StatusBadge";
import { ExplainabilityPanel } from "../common/ExplainabilityPanel";
import type { TransferRecommendation } from "../../types/transfers";

/** Fully resolved (unresolved_shortage === 0) reads as safer than a partial match. */
function coverageLevel(recommendation: TransferRecommendation) {
  if (recommendation.allocations.length === 0) return "critical" as const;
  if (recommendation.unresolved_shortage > 0) return "high" as const;
  return "medium" as const;
}

/**
 * District dashboard's recommendation list (phase4.md) — each card's
 * ExplainabilityPanel is embedded inline/expandable, not a separate report
 * page, per CLAUDE.md's explainability requirement.
 */
export function RecommendationList({
  recommendations,
}: {
  recommendations: TransferRecommendation[];
}) {
  return (
    <div className="stitch-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span className="material-symbols-outlined" style={{ color: "var(--color-primary)" }}>
            swap_calls
          </span>
          <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: "var(--font-weight-bold)", margin: 0 }}>
            Algorithmic Redistribution Recommendations
          </h2>
        </div>
        <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", padding: "2px 10px", borderRadius: "var(--radius-full)", backgroundColor: "var(--color-surface-container)", color: "var(--color-text-secondary)" }}>
          {recommendations.length} Recommendations Computed
        </span>
      </div>

      {recommendations.length === 0 ? (
        <p style={{ color: "var(--color-text-secondary)", margin: 0, fontSize: "var(--font-size-sm)" }}>
          No open shortages have a matching recommendation right now.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {recommendations.map((recommendation) => (
            <div
              key={recommendation.id}
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-3)",
                backgroundColor: "#ffffff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontWeight: "var(--font-weight-bold)", fontSize: "var(--font-size-sm)" }}>
                    {recommendation.recipient_phc_name} requires {recommendation.recipient_shortage.toLocaleString()}{" "}
                    {recommendation.unit} {recommendation.medicine_name}
                  </div>
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", marginTop: 2 }} className="tabular-nums">
                    {recommendation.allocations.length} donor
                    {recommendation.allocations.length === 1 ? "" : "s"} matched
                    {recommendation.unresolved_shortage > 0 &&
                      ` — ${recommendation.unresolved_shortage} ${recommendation.unit} unresolved`}
                  </div>
                </div>
                <StatusBadge level={coverageLevel(recommendation)} />
              </div>
              <ExplainabilityPanel recommendation={recommendation} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
