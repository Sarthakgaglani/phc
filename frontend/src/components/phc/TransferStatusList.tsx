import { useRef, useState } from "react";
import { StatusBadge } from "../common/StatusBadge";
import { dispatchTransferRequest, receiveTransferRequest } from "../../api/transferRequests";
import { TRANSFER_STATUS_DISPLAY } from "../../utils/transferStatus";
import type { TransferRequest } from "../../types/transferRequests";

function TransferRow({
  transferRequest,
  direction,
  onActed,
}: {
  transferRequest: TransferRequest;
  direction: "incoming" | "outgoing";
  onActed: (updated: TransferRequest) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  const canDispatch = direction === "outgoing" && transferRequest.status === "APPROVED";
  const canReceive = direction === "incoming" && transferRequest.status === "DISPATCHED";

  async function act(action: "dispatch" | "receive") {
    setIsSubmitting(true);
    setError(null);
    const optimistic: TransferRequest = {
      ...transferRequest,
      status: action === "dispatch" ? "DISPATCHED" : "RECEIVED",
    };
    onActed(optimistic);

    try {
      const call = action === "dispatch" ? dispatchTransferRequest : receiveTransferRequest;
      const updated = await call(transferRequest.id, {
        version: transferRequest.version,
        idempotencyKey: idempotencyKeyRef.current,
      });
      onActed(updated);
    } catch {
      onActed(transferRequest);
      setError("Could not record this — refresh and retry.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const display = TRANSFER_STATUS_DISPLAY[transferRequest.status];
  const otherPhcName =
    direction === "incoming" ? transferRequest.donor_phc_name : transferRequest.recipient_phc_name;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "var(--space-3)",
        padding: "var(--space-3) 0",
        borderTop: "1px solid var(--color-border-subtle)",
      }}
    >
      <div>
        <div style={{ fontWeight: "var(--font-weight-medium)", fontSize: "var(--font-size-sm)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "16px", color: direction === "incoming" ? "var(--color-secondary)" : "var(--risk-medium-text)" }}>
            {direction === "incoming" ? "download_for_offline" : "upload_file"}
          </span>
          <span>
            {direction === "incoming" ? "From" : "To"} <strong>{otherPhcName}</strong>
          </span>
        </div>
        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", marginTop: 2 }} className="tabular-nums">
          Quantity: <strong>{transferRequest.quantity.toLocaleString()} {transferRequest.unit}</strong> {transferRequest.medicine_name}
        </div>
        {error && (
          <div style={{ color: "var(--risk-critical-text)", fontSize: "var(--font-size-xs)", marginTop: 2 }}>
            {error}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <StatusBadge level={display.level} label={display.label} />
        {canDispatch && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => act("dispatch")}
            style={{
              height: 32,
              padding: "0 12px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--color-primary)",
              color: "var(--color-primary-contrast)",
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-semibold)",
              border: "none",
              cursor: "pointer",
            }}
          >
            {isSubmitting ? "Dispatching…" : "Mark Dispatched"}
          </button>
        )}
        {canReceive && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => act("receive")}
            style={{
              height: 32,
              padding: "0 12px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--color-secondary)",
              color: "#ffffff",
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-semibold)",
              border: "none",
              cursor: "pointer",
            }}
          >
            {isSubmitting ? "Recording…" : "Mark Received"}
          </button>
        )}
      </div>
    </div>
  );
}

export function TransferStatusList({
  phcId,
  transferRequests,
  onActed,
}: {
  phcId: number;
  transferRequests: TransferRequest[];
  onActed: (updated: TransferRequest) => void;
}) {
  const incoming = transferRequests.filter((tr) => tr.recipient_phc === phcId);
  const outgoing = transferRequests.filter((tr) => tr.donor_phc === phcId);
  const totalTransfers = incoming.length + outgoing.length;

  return (
    <div className="stitch-card" id="transfer-tracker">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span className="material-symbols-outlined" style={{ color: "var(--color-primary)" }}>
            local_shipping
          </span>
          <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: "var(--font-weight-bold)", margin: 0 }}>
            Active Stock Transfers & Movement Tracking
          </h2>
        </div>
        <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", padding: "2px 8px", borderRadius: "var(--radius-full)", backgroundColor: "var(--color-surface-container)", color: "var(--color-text-secondary)" }}>
          {totalTransfers} Active
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "var(--space-4)" }}>
        <div>
          <h3 style={{ fontSize: "var(--font-size-xs)", textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-text-secondary)", marginTop: 0, marginBottom: "var(--space-2)", fontWeight: "var(--font-weight-bold)" }}>
            Incoming Stock Transfers ({incoming.length})
          </h3>
          {incoming.length === 0 ? (
            <p style={{ color: "var(--color-text-secondary)", margin: 0, fontSize: "var(--font-size-xs)" }}>
              No incoming transfers scheduled.
            </p>
          ) : (
            incoming.map((tr) => (
              <TransferRow key={tr.id} transferRequest={tr} direction="incoming" onActed={onActed} />
            ))
          )}
        </div>

        <div>
          <h3 style={{ fontSize: "var(--font-size-xs)", textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-text-secondary)", marginTop: 0, marginBottom: "var(--space-2)", fontWeight: "var(--font-weight-bold)" }}>
            Outgoing Stock Transfers ({outgoing.length})
          </h3>
          {outgoing.length === 0 ? (
            <p style={{ color: "var(--color-text-secondary)", margin: 0, fontSize: "var(--font-size-xs)" }}>
              No outgoing transfers scheduled.
            </p>
          ) : (
            outgoing.map((tr) => (
              <TransferRow key={tr.id} transferRequest={tr} direction="outgoing" onActed={onActed} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
