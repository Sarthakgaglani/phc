import { useCallback, useState, type CSSProperties } from "react";
import { getRecommendationSummary } from "../../api/transfers";
import { AiSummary } from "./AiSummary";
import type { TransferRecommendation } from "../../types/transfers";

interface Props {
  recommendation: TransferRecommendation;
  defaultExpanded?: boolean;
}

const rowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "var(--font-size-sm)",
  padding: "var(--space-1) 0",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={rowStyle}>
      <span style={{ color: "var(--color-text-secondary)" }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

/**
 * The single reusable explainability component (phase4.md: "the most
 * important reuse decision in the whole project"). Renders inline/expandable
 * on a recommendation itself — never a separate report page — so this same
 * component drives the District dashboard's recommendation card (Phase 4)
 * and the approval screen (Phase 5) without duplication. Takes a full
 * TransferRecommendation and derives everything from its snapshotted
 * fields; it never re-fetches or recomputes anything itself.
 */
export function ExplainabilityPanel({ recommendation: r, defaultExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const fetchSummary = useCallback(() => getRecommendationSummary(r.id), [r.id]);

  return (
    <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-3)" }}>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          color: "var(--color-primary)",
          cursor: "pointer",
          fontSize: "var(--font-size-sm)",
          fontWeight: "var(--font-weight-medium)",
        }}
      >
        {expanded ? "Hide reasoning ▲" : "Why this recommendation? ▼"}
      </button>

      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", marginTop: "var(--space-3)" }}>
          <div>
            <h4 style={{ margin: "0 0 var(--space-1) 0", fontSize: "var(--font-size-sm)" }}>
              {r.recipient_phc_name}'s shortfall
            </h4>
            <Row label="Current stock" value={`${r.recipient_current_stock} ${r.unit}`} />
            <Row
              label="Predicted demand"
              value={`${r.recipient_predicted_demand} ${r.unit} (${r.recipient_predicted_daily_consumption}/day)`}
            />
            <Row label="Safety stock" value={`${r.recipient_safety_stock} ${r.unit}`} />
            <Row label="Required stock" value={`${r.recipient_required_stock} ${r.unit}`} />
            <Row label="Shortage" value={`${r.recipient_shortage} ${r.unit}`} />
            {r.unresolved_shortage > 0 && (
              <Row
                label="Not coverable by any safe donor"
                value={`${r.unresolved_shortage} ${r.unit}`}
              />
            )}
          </div>

          <div>
            <h4 style={{ margin: "0 0 var(--space-1) 0", fontSize: "var(--font-size-sm)" }}>
              Donors selected
            </h4>
            {r.allocations.length === 0 ? (
              <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)" }}>
                No PHC currently has enough safe surplus to donate.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                {r.allocations.map((allocation) => (
                  <div
                    key={allocation.id}
                    style={{
                      background: "var(--color-bg)",
                      borderRadius: "var(--radius-sm)",
                      padding: "var(--space-2) var(--space-3)",
                    }}
                  >
                    <div style={{ fontWeight: "var(--font-weight-medium)", marginBottom: "var(--space-1)" }}>
                      #{allocation.rank} {allocation.donor_phc_name} ({allocation.donor_district_name})
                    </div>
                    <Row label="Sending" value={`${allocation.quantity} ${r.unit}`} />
                    <Row
                      label="Safe surplus before"
                      value={`${allocation.donor_safe_surplus_before} ${r.unit}`}
                    />
                    <Row
                      label="Days of Cover after transfer"
                      value={
                        allocation.donor_days_of_cover_after === null
                          ? "—"
                          : `${allocation.donor_days_of_cover_after}d (was ${allocation.donor_days_of_cover_before ?? "—"}d)`
                      }
                    />
                    <Row
                      label="Distance"
                      value={allocation.distance_km === null ? "unknown" : `${allocation.distance_km} km`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <AiSummary fetchSummary={fetchSummary} textKey="summary" />
        </div>
      )}
    </div>
  );
}
