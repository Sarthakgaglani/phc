import { useRef, useState } from "react";
import { ExplainabilityPanel } from "../common/ExplainabilityPanel";
import { approveTransferRequest, rejectTransferRequest } from "../../api/transferRequests";
import type { TransferRequest } from "../../types/transferRequests";
import type { TransferRecommendation } from "../../types/transfers";

interface CardProps {
  transferRequest: TransferRequest;
  recommendation?: TransferRecommendation;
  onDecided: (updated: TransferRequest) => void;
}

function ApprovalCard({ transferRequest, recommendation, onDecided }: CardProps) {
  const [isSubmitting, setIsSubmitting] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  async function decide(action: "approve" | "reject") {
    setIsSubmitting(action);
    setError(null);
    const optimistic: TransferRequest = {
      ...transferRequest,
      status: action === "approve" ? "APPROVED" : "REJECTED",
    };
    onDecided(optimistic);

    try {
      const call = action === "approve" ? approveTransferRequest : rejectTransferRequest;
      const updated = await call(transferRequest.id, {
        version: transferRequest.version,
        idempotencyKey: idempotencyKeyRef.current,
      });
      onDecided(updated);
    } catch {
      onDecided(transferRequest); // roll back
      setError(
        "Could not record this decision — it may have been acted on already. Refresh and retry.",
      );
    } finally {
      setIsSubmitting(null);
    }
  }

  return (
    <div
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-4)",
        backgroundColor: "#ffffff",
        boxShadow: "var(--shadow-card)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-2)" }}>
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            fontWeight: "var(--font-weight-semibold)",
            padding: "2px 8px",
            borderRadius: "var(--radius-full)",
            backgroundColor: "var(--color-surface-container)",
            color: "var(--color-text-secondary)",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "14px", color: "var(--color-secondary)" }}>
            auto_awesome
          </span>
          Algorithmic Transfer Request #{transferRequest.id}
        </span>
        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }} className="tabular-nums">
          Version {transferRequest.version}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220, display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <div style={{ flex: 1, padding: "8px 12px", backgroundColor: "var(--color-surface-low)", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border-subtle)" }}>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Donor Facility</div>
            <div style={{ fontWeight: "var(--font-weight-bold)", fontSize: "var(--font-size-sm)" }}>{transferRequest.donor_phc_name}</div>
          </div>
          <span className="material-symbols-outlined" style={{ color: "var(--color-primary)" }}>
            east
          </span>
          <div style={{ flex: 1, padding: "8px 12px", backgroundColor: "var(--color-surface-low)", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border-subtle)" }}>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Recipient Facility</div>
            <div style={{ fontWeight: "var(--font-weight-bold)", fontSize: "var(--font-size-sm)" }}>{transferRequest.recipient_phc_name}</div>
          </div>
        </div>

        <div style={{ padding: "8px 16px", backgroundColor: "var(--color-primary-contrast)", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", textAlign: "right" }} className="tabular-nums">
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>Transfer Quantity</div>
          <div style={{ fontSize: "var(--font-size-base)", fontWeight: "var(--font-weight-bold)", color: "var(--color-primary)" }}>
            {transferRequest.quantity.toLocaleString()} {transferRequest.unit}
          </div>
          <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)" }}>{transferRequest.medicine_name}</div>
        </div>
      </div>

      {recommendation && <ExplainabilityPanel recommendation={recommendation} />}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)", marginTop: "var(--space-1)" }}>
        <button
          type="button"
          disabled={isSubmitting !== null}
          onClick={() => decide("reject")}
          style={{
            height: 36,
            padding: "0 16px",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "#ffffff",
            color: "var(--risk-critical-text)",
            border: "1px solid var(--risk-critical-border)",
            fontWeight: "var(--font-weight-semibold)",
            fontSize: "var(--font-size-sm)",
            cursor: "pointer",
          }}
        >
          {isSubmitting === "reject" ? "Rejecting…" : "Reject Transfer"}
        </button>
        <button
          type="button"
          disabled={isSubmitting !== null}
          onClick={() => decide("approve")}
          style={{
            height: 36,
            padding: "0 20px",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "var(--color-secondary)",
            color: "#ffffff",
            border: "none",
            fontWeight: "var(--font-weight-bold)",
            fontSize: "var(--font-size-sm)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
            check_circle
          </span>
          <span>{isSubmitting === "approve" ? "Approving…" : "Approve Redistribution"}</span>
        </button>
      </div>

      {error && (
        <p style={{ color: "var(--risk-critical-text)", fontSize: "var(--font-size-xs)", margin: 0 }}>{error}</p>
      )}
    </div>
  );
}

export function ApprovalQueue({
  transferRequests,
  recommendationsById,
  onDecided,
}: {
  transferRequests: TransferRequest[];
  recommendationsById: Map<number, TransferRecommendation>;
  onDecided: (updated: TransferRequest) => void;
}) {
  const pending = transferRequests.filter((tr) => tr.status === "PENDING_REVIEW");

  return (
    <div className="stitch-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span className="material-symbols-outlined" style={{ color: "var(--color-primary)" }}>
            fact_check
          </span>
          <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: "var(--font-weight-bold)", margin: 0 }}>
            District Approval Queue & Redistribution Actions
          </h2>
        </div>
        <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", padding: "2px 10px", borderRadius: "var(--radius-full)", backgroundColor: pending.length > 0 ? "var(--risk-high-bg)" : "var(--color-surface-container)", color: pending.length > 0 ? "var(--risk-high-text)" : "var(--color-text-secondary)" }}>
          {pending.length} Pending Review
        </span>
      </div>

      {pending.length === 0 ? (
        <p style={{ color: "var(--color-text-secondary)", margin: 0, fontSize: "var(--font-size-sm)" }}>
          No transfer requests currently awaiting district officer approval.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {pending.map((tr) => (
            <ApprovalCard
              key={tr.id}
              transferRequest={tr}
              recommendation={recommendationsById.get(tr.recommendation_id)}
              onDecided={onDecided}
            />
          ))}
        </div>
      )}
    </div>
  );
}
