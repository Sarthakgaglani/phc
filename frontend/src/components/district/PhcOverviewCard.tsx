import { StatusBadge } from "../common/StatusBadge";
import type { BedCapacityRow, FootfallRow, StaffRow } from "../../types/operational";

interface Props {
  phcName: string;
  beds?: BedCapacityRow;
  footfall?: FootfallRow;
  staff?: StaffRow;
}

/**
 * One PHC's operational-signal summary — reuses the same Card/StatusBadge
 * components and risk color tokens as the PHC dashboard's StockTable
 * (phase2.md: "reusing the PHC dashboard's card components and risk color
 * tokens"), just laid out as a grid cell instead of a table row.
 */
export function PhcOverviewCard({ phcName, beds, footfall, staff }: Props) {
  const bedOccupancyPct = beds && beds.total_beds > 0 ? Math.round((beds.occupied_beds / beds.total_beds) * 100) : 0;

  return (
    <div className="stitch-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "var(--space-3)",
            paddingBottom: "var(--space-2)",
            borderBottom: "1px solid var(--color-border-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "var(--color-primary)" }}>
              local_hospital
            </span>
            <strong style={{ fontSize: "var(--font-size-sm)", color: "var(--color-primary)" }}>{phcName}</strong>
          </div>
          {beds && <StatusBadge level={beds.pressure_level} />}
        </div>

        {beds && (
          <div style={{ marginBottom: "var(--space-3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", marginBottom: 4 }} className="tabular-nums">
              <span>Bed Capacity Load</span>
              <span style={{ fontWeight: "var(--font-weight-semibold)" }}>{bedOccupancyPct}%</span>
            </div>
            <div style={{ height: 6, width: "100%", backgroundColor: "var(--color-surface-container)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, bedOccupancyPct)}%`,
                  backgroundColor: bedOccupancyPct > 85 ? "var(--risk-critical-text)" : bedOccupancyPct > 70 ? "var(--risk-high-text)" : "var(--color-secondary)",
                  borderRadius: "var(--radius-full)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        )}

        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-2)" }}>
          <div style={{ padding: "6px 8px", backgroundColor: "var(--color-surface-low)", borderRadius: "var(--radius-sm)" }}>
            <dt style={{ color: "var(--color-text-secondary)", fontSize: "0.6875rem", textTransform: "uppercase" }}>
              Beds
            </dt>
            <dd style={{ margin: "2px 0 0 0", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-bold)" }} className="tabular-nums">
              {beds ? `${beds.occupied_beds}/${beds.total_beds}` : "—"}
            </dd>
          </div>
          <div style={{ padding: "6px 8px", backgroundColor: "var(--color-surface-low)", borderRadius: "var(--radius-sm)" }}>
            <dt style={{ color: "var(--color-text-secondary)", fontSize: "0.6875rem", textTransform: "uppercase" }}>
              Staff
            </dt>
            <dd style={{ margin: "2px 0 0 0", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-bold)" }} className="tabular-nums">
              {staff ? `${staff.staff_present}/${staff.staff_total}` : "—"}
            </dd>
          </div>
          <div style={{ padding: "6px 8px", backgroundColor: "var(--color-surface-low)", borderRadius: "var(--radius-sm)" }}>
            <dt style={{ color: "var(--color-text-secondary)", fontSize: "0.6875rem", textTransform: "uppercase" }}>
              Footfall
            </dt>
            <dd style={{ margin: "2px 0 0 0", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-bold)" }} className="tabular-nums">
              {footfall ? footfall.visit_count : "—"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
