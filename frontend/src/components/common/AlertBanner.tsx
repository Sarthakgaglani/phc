import type { AlertBannerItem } from "../../types";
import { RISK_SEVERITY_ORDER } from "../../types";
import { StatusBadge } from "./StatusBadge";

interface Props {
  title: string;
  items: AlertBannerItem[];
  emptyMessage?: string;
}

/**
 * Generic risk-leveled list, driven entirely by AlertBannerItem so it never
 * needs to know about Alert vs. (Phase 4) Recommendation — callers map their
 * own data into AlertBannerItem and this only handles sorting-by-severity
 * and the shared visual language (phase3.md: "build it generically now").
 */
export function AlertBanner({ title, items, emptyMessage = "Nothing needs attention." }: Props) {
  const sorted = [...items].sort(
    (a, b) => RISK_SEVERITY_ORDER.indexOf(a.level) - RISK_SEVERITY_ORDER.indexOf(b.level),
  );

  return (
    <div className="stitch-card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <span className="material-symbols-outlined" style={{ color: "var(--risk-critical-text)" }}>
          warning
        </span>
        <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: "var(--font-weight-bold)", margin: 0 }}>
          {title}
        </h2>
      </div>

      {sorted.length === 0 ? (
        <p style={{ color: "var(--color-text-secondary)", margin: 0, fontSize: "var(--font-size-sm)" }}>
          {emptyMessage}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {sorted.map((item, idx) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "var(--space-3)",
                padding: "var(--space-3) 0",
                borderTop: idx > 0 ? "1px solid var(--color-border-subtle)" : "none",
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "var(--font-weight-medium)", fontSize: "var(--font-size-sm)" }}>
                  {item.title}
                </div>
                {item.description && (
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", marginTop: "2px" }}>
                    {item.description}
                  </div>
                )}
              </div>
              <StatusBadge level={item.level} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
