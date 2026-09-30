import type { CurrentStockRow } from "../../types/inventory";
import type { StockRiskRow } from "../../types/forecasting";
import { StatusBadge } from "../common/StatusBadge";

/**
 * The PHC inventory table — built as the template District (Phase 2) and
 * State (Phase 5) dashboards extend rather than reinvent (phase1.md).
 * `riskByMedicine` is optional so this stays usable before risk data has
 * loaded; Days of Cover/status just show "—" until it has.
 */
export function StockTable({
  rows,
  riskByMedicine,
}: {
  rows: CurrentStockRow[];
  riskByMedicine?: Map<number, StockRiskRow>;
}) {
  return (
    <div className="stitch-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "var(--space-3) var(--space-4)", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--color-surface-container)" }}>
        <h3 style={{ margin: 0, fontSize: "var(--font-size-base)", fontWeight: "var(--font-weight-bold)" }}>
          Clinical Stock Ledger & Inventory Matrix
        </h3>
        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }} className="tabular-nums">
          {rows.length} Active SKUs
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "var(--color-surface-container)", borderBottom: "2px solid var(--color-border-strong)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-bold)", color: "var(--color-text-primary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              <th style={{ padding: "10px var(--space-4)" }}>Medicine / SKU</th>
              <th style={{ padding: "10px var(--space-4)", textAlign: "right" }}>Current Stock</th>
              <th style={{ padding: "10px var(--space-4)", textAlign: "right" }}>Days of Cover (DOC)</th>
              <th style={{ padding: "10px var(--space-4)", textAlign: "center" }}>Clinical Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const risk = riskByMedicine?.get(row.medicine);
              const isEven = idx % 2 === 0;
              return (
                <tr
                  key={row.medicine}
                  style={{
                    backgroundColor: isEven ? "#ffffff" : "#faf9f7",
                    borderBottom: "1px solid var(--color-border-subtle)",
                    transition: "background-color 0.15s ease",
                  }}
                >
                  <td style={{ padding: "12px var(--space-4)" }}>
                    <div style={{ fontWeight: "var(--font-weight-medium)", fontSize: "var(--font-size-sm)" }}>
                      {row.medicine_name}
                    </div>
                  </td>
                  <td style={{ padding: "12px var(--space-4)", textAlign: "right" }} className="tabular-nums">
                    <span style={{ fontWeight: "var(--font-weight-bold)", fontSize: "var(--font-size-sm)" }}>
                      {row.current_stock.toLocaleString()}
                    </span>{" "}
                    <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>
                      {row.unit}
                    </span>
                  </td>
                  <td style={{ padding: "12px var(--space-4)", textAlign: "right" }} className="tabular-nums">
                    <span style={{ fontWeight: "var(--font-weight-semibold)", fontSize: "var(--font-size-sm)" }}>
                      {risk ? `${risk.days_of_cover} days` : "—"}
                    </span>
                  </td>
                  <td style={{ padding: "12px var(--space-4)", textAlign: "center" }}>
                    {risk ? <StatusBadge level={risk.risk_level} /> : <span style={{ color: "var(--color-text-muted)" }}>—</span>}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: "var(--space-4)", textAlign: "center", color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)" }}>
                  No medicines in the catalog yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
