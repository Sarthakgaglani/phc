import type { TransferOutcomeRow } from "../../api/analytics";

export function OutcomesSummary({ outcomes }: { outcomes: TransferOutcomeRow[] }) {
  const averted = outcomes.filter((o) => o.shortage_averted === true).length;
  const recurred = outcomes.filter((o) => o.shortage_averted === false).length;
  const pending = outcomes.filter((o) => o.shortage_averted === null).length;

  return (
    <div className="stitch-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span className="material-symbols-outlined" style={{ color: "var(--color-primary)" }}>
            verified
          </span>
          <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: "var(--font-weight-bold)", margin: 0 }}>
            Clinical Outcomes & Shortage Prevention Tracking
          </h2>
        </div>
      </div>
      <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-xs)", margin: "0 0 var(--space-3) 0" }}>
        Did completed stock transfers successfully avert predicted clinical stockouts?
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-3)" }}>
        <div style={{ padding: "var(--space-3)", backgroundColor: "var(--risk-safe-bg)", border: "1px solid var(--risk-safe-border)", borderRadius: "var(--radius-sm)" }}>
          <div style={{ fontSize: "var(--font-size-2xl)", fontWeight: "var(--font-weight-bold)", color: "var(--risk-safe-text)" }} className="tabular-nums">
            {averted}
          </div>
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--risk-safe-text)", fontWeight: "var(--font-weight-medium)", marginTop: 2 }}>
            Shortages Averted
          </div>
        </div>

        <div style={{ padding: "var(--space-3)", backgroundColor: "var(--risk-critical-bg)", border: "1px solid var(--risk-critical-border)", borderRadius: "var(--radius-sm)" }}>
          <div style={{ fontSize: "var(--font-size-2xl)", fontWeight: "var(--font-weight-bold)", color: "var(--risk-critical-text)" }} className="tabular-nums">
            {recurred}
          </div>
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--risk-critical-text)", fontWeight: "var(--font-weight-medium)", marginTop: 2 }}>
            Shortages Recurred
          </div>
        </div>

        <div style={{ padding: "var(--space-3)", backgroundColor: "var(--color-surface-low)", border: "1px solid var(--color-border-subtle)", borderRadius: "var(--radius-sm)" }}>
          <div style={{ fontSize: "var(--font-size-2xl)", fontWeight: "var(--font-weight-bold)", color: "var(--color-primary)" }} className="tabular-nums">
            {pending}
          </div>
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", marginTop: 2 }}>
            Awaiting Follow-up
          </div>
        </div>
      </div>
    </div>
  );
}
