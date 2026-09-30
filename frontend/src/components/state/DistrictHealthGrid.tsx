import { StatusBadge } from "../common/StatusBadge";
import type { DistrictHealth } from "../../utils/districtHealth";

export function DistrictHealthGrid({ districts }: { districts: DistrictHealth[] }) {
  return (
    <div className="stitch-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span className="material-symbols-outlined" style={{ color: "var(--color-primary)" }}>
            domain
          </span>
          <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: "var(--font-weight-bold)", margin: 0 }}>
            District Health Surveillance Grid
          </h2>
        </div>
        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }} className="tabular-nums">
          {districts.length} Districts Monitored
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "var(--space-3)",
        }}
      >
        {districts.map(({ district, level, activeAlertCount, phcCount }) => (
          <div
            key={district.id}
            style={{
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-3)",
              backgroundColor: "#ffffff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div>
              <div style={{ fontWeight: "var(--font-weight-bold)", fontSize: "var(--font-size-sm)" }}>
                {district.name}
              </div>
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", marginTop: 2 }} className="tabular-nums">
                {phcCount} PHCs · {activeAlertCount} active alert{activeAlertCount === 1 ? "" : "s"}
              </div>
            </div>
            <StatusBadge level={level} />
          </div>
        ))}
        {districts.length === 0 && (
          <p style={{ color: "var(--color-text-secondary)", margin: 0, fontSize: "var(--font-size-sm)" }}>
            No districts in this state yet.
          </p>
        )}
      </div>
    </div>
  );
}
