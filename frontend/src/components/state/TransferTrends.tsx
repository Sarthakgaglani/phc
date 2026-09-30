import type { TransferRequest, TransferRequestStatus } from "../../types/transferRequests";

const STATUS_ORDER: TransferRequestStatus[] = [
  "PENDING_REVIEW",
  "APPROVED",
  "DISPATCHED",
  "RECEIVED",
  "REJECTED",
];

const STATUS_LABEL: Record<TransferRequestStatus, string> = {
  PENDING_REVIEW: "Pending Review",
  APPROVED: "Approved",
  DISPATCHED: "In Transit",
  RECEIVED: "Completed",
  REJECTED: "Rejected",
};

export function TransferTrends({ transferRequests }: { transferRequests: TransferRequest[] }) {
  const counts = new Map<TransferRequestStatus, number>();
  for (const tr of transferRequests) {
    counts.set(tr.status, (counts.get(tr.status) ?? 0) + 1);
  }

  return (
    <div className="stitch-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span className="material-symbols-outlined" style={{ color: "var(--color-primary)" }}>
            analytics
          </span>
          <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: "var(--font-weight-bold)", margin: 0 }}>
            State Redistribution Activity & Pipeline
          </h2>
        </div>
        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }} className="tabular-nums">
          {transferRequests.length} Total Requests
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "var(--space-3)" }}>
        {STATUS_ORDER.map((status) => {
          const count = counts.get(status) ?? 0;
          return (
            <div
              key={status}
              style={{
                padding: "var(--space-3)",
                backgroundColor: "var(--color-surface-low)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <div style={{ fontSize: "var(--font-size-2xl)", fontWeight: "var(--font-weight-bold)", color: "var(--color-primary)" }} className="tabular-nums">
                {count}
              </div>
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", marginTop: 2 }}>
                {STATUS_LABEL[status]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
